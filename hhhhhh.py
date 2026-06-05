"""
complete_project.py

Unified, self-contained implementation combining all four project stages:
1. GeoNames India dataset downloading, extraction, cleaning, and deduplication.
2. Highly memory-optimized Radix Tree Trie structure.
3. DFS-based top 10 suggestions autocomplete (early exit optimized).
4. Interactive console CLI with instant suggestion profiling and edge-case handling.
"""

import os
import re
import sys
import gc
import io
import time
import zipfile
import urllib.request
import tracemalloc

# --- CONFIGURATION ---
GEONAMES_URL = "http://download.geonames.org/export/dump/IN.zip"
ZIP_PATH = "IN.zip"
TXT_FILENAME = "IN.txt"
OUTPUT_FILENAME = "cities.txt"

# =====================================================================
# STAGE 1: GEONAMES DATASET DOWNLOADER & CLEANER (PROMPT 1)
# =====================================================================

def download_geonames_data():
    if os.path.exists(ZIP_PATH):
        print(f"Using cached GeoNames India database from {ZIP_PATH}...")
        with open(ZIP_PATH, "rb") as f:
            return f.read()
            
    print(f"Downloading GeoNames India database from {GEONAMES_URL}...")
    try:
        req = urllib.request.Request(
            GEONAMES_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req) as response:
            data = response.read()
        
        # Cache the file locally
        with open(ZIP_PATH, "wb") as f:
            f.write(data)
            
        print("Download complete and cached.")
        return data
    except Exception as e:
        print(f"Error downloading data: {e}")
        raise

def extract_and_parse_cities(zip_data):
    print("Extracting and parsing ZIP archive...")
    cities = []
    
    # Feature code priority dictionary
    feature_priorities = {
        'PPLC': 0,  # capital of a country
        'PPLA': 1,  # seat of a first-order admin division (state capitals)
        'PPLA2': 2, # district headquarters
        'PPLA3': 3, # seat of a third-order admin division
        'PPLA4': 4, # seat of a fourth-order admin division
        'PPL': 5,   # populated place
    }
    
    with zipfile.ZipFile(io.BytesIO(zip_data)) as z:
        if TXT_FILENAME not in z.namelist():
            raise FileNotFoundError(f"Could not find {TXT_FILENAME} in the downloaded ZIP archive.")
            
        with z.open(TXT_FILENAME) as f:
            for line_bytes in f:
                try:
                    line = line_bytes.decode('utf-8')
                except UnicodeDecodeError:
                    line = line_bytes.decode('latin-1', errors='ignore')
                
                parts = line.strip('\n').split('\t')
                if len(parts) < 15:
                    continue
                
                feature_class = parts[6]
                feature_code = parts[7]
                
                # Filter for populated places (feature class 'P')
                if feature_class != 'P':
                    continue
                
                # asciiname (col 2), fallback to name (col 1)
                name = parts[2].strip() if parts[2].strip() else parts[1].strip()
                if not name:
                    continue
                
                # Population
                try:
                    population = int(parts[14])
                except ValueError:
                    population = 0
                
                priority = feature_priorities.get(feature_code, 6)
                
                cities.append({
                    'raw_name': name,
                    'population': population,
                    'priority': priority
                })
                
    print(f"Parsed {len(cities):,} populated places from GeoNames database.")
    return cities

def clean_city_name(name):
    # Convert to lowercase
    name = name.lower()
    # Replace common separators with spaces
    name = re.sub(r'[-_\/\\]', ' ', name)
    # Remove any character that is not a lowercase letter or space
    name = re.sub(r'[^a-z ]', '', name)
    # Collapse multiple spaces to a single space
    name = re.sub(r'\s+', ' ', name)
    return name.strip()

def process_and_save_cities(cities):
    print("Cleaning, deduplicating, and sorting cities...")
    
    # Sort cities by:
    # 1. Feature code priority (lower first, state/national capitals prioritized)
    # 2. Population (higher first)
    cities.sort(key=lambda x: (x['priority'], -x['population']))
    
    unique_cleaned_names = []
    seen = set()
    
    for city in cities:
        cleaned = clean_city_name(city['raw_name'])
        if not cleaned or len(cleaned) < 3:
            continue
        
        if cleaned not in seen:
            seen.add(cleaned)
            unique_cleaned_names.append(cleaned)
            
    # Select the top 15,000 unique names and sort them alphabetically
    target_count = min(15000, len(unique_cleaned_names))
    selected_cities = unique_cleaned_names[:target_count]
    selected_cities.sort()
    
    # Write to local file
    with open(OUTPUT_FILENAME, "w", encoding="utf-8") as out:
        for city_name in selected_cities:
            out.write(city_name + "\n")
            
    print(f"Dataset finalized with {len(selected_cities):,} unique cities and saved to '{OUTPUT_FILENAME}'.")
    return selected_cities

def get_or_create_dataset():
    # If the database exists locally (either in the current directory or /Users/hardikarora/), use it
    possible_paths = [OUTPUT_FILENAME, f"/Users/hardikarora/{OUTPUT_FILENAME}"]
    for path in possible_paths:
        if os.path.exists(path):
            print(f"Loading existing city dataset from '{path}'...")
            with open(path, "r", encoding="utf-8") as f:
                return [line.strip() for line in f if line.strip()]
                
    # Fallback to downloading and generating it
    print("City dataset not found locally. Initiating generation...")
    zip_data = download_geonames_data()
    cities = extract_and_parse_cities(zip_data)
    return process_and_save_cities(cities)

# =====================================================================
# STAGES 2 & 3: MEMORY-OPTIMIZED RADIX TREE TRIE & AUTOCOMPLETE (PROMPTS 2 & 3)
# =====================================================================

class RadixNode:
    __slots__ = ('children', 'is_end')
    
    def __init__(self) -> None:
        # Maps the starting character of an edge to a tuple of: (edge_string, child_node)
        self.children: dict[str, tuple[str, 'RadixNode']] = {}
        self.is_end: bool = False

class Trie:
    """
    A memory-optimized Prefix Tree (Trie) utilizing a Radix Tree structure.
    """
    def __init__(self) -> None:
        self.root = RadixNode()

    def insert(self, word: str) -> None:
        if not word:
            return

        node = self.root
        i = 0
        while i < len(word):
            char = word[i]
            if char not in node.children:
                new_node = RadixNode()
                new_node.is_end = True
                node.children[char] = (word[i:], new_node)
                return
            
            edge, child = node.children[char]
            j = 0
            while j < len(edge) and i + j < len(word) and edge[j] == word[i + j]:
                j += 1
            
            if j == len(edge):
                node = child
                i += j
            else:
                # Split edge
                split_node = RadixNode()
                old_suffix = edge[j:]
                split_node.children[old_suffix[0]] = (old_suffix, child)
                
                new_suffix = word[i + j:]
                if new_suffix:
                    leaf_node = RadixNode()
                    leaf_node.is_end = True
                    split_node.children[new_suffix[0]] = (new_suffix, leaf_node)
                else:
                    split_node.is_end = True
                
                node.children[char] = (edge[:j], split_node)
                return
        node.is_end = True

    def search_prefix(self, prefix: str) -> bool:
        if not prefix:
            return True

        node = self.root
        i = 0
        while i < len(prefix):
            char = prefix[i]
            if char not in node.children:
                return False
            
            edge, child = node.children[char]
            j = 0
            while j < len(edge) and i + j < len(prefix):
                if edge[j] != prefix[i + j]:
                    return False
                j += 1
            
            i += j
            node = child
            
        return True

    def search(self, word: str) -> bool:
        if not word:
            return False

        node = self.root
        i = 0
        while i < len(word):
            char = word[i]
            if char not in node.children:
                return False
            
            edge, child = node.children[char]
            j = 0
            while j < len(edge) and i + j < len(word):
                if edge[j] != word[i + j]:
                    return False
                j += 1
            
            if j < len(edge):
                return False
                
            i += j
            node = child
            
        return node.is_end

    def autocomplete(self, prefix: str, limit: int = 10) -> list[str]:
        """
        Returns the top `limit` (default 10) suggestions starting with the prefix.
        Uses Depth-First Search (DFS) starting from the prefix node, with early exits.
        """
        if limit <= 0:
            return []

        node = self.root
        i = 0
        current_path = []
        
        # Traverse to the node representing the prefix
        while i < len(prefix):
            char = prefix[i]
            if char not in node.children:
                return []
            
            edge, child = node.children[char]
            j = 0
            while j < len(edge) and i + j < len(prefix):
                if edge[j] != prefix[i + j]:
                    return []
                j += 1
            
            i += j
            node = child
            current_path.append(edge)
            
        base_word = "".join(current_path)
        results = []
        
        # Early-exit optimized DFS helper
        def dfs(curr_node: RadixNode, current_word: str) -> None:
            if len(results) >= limit:
                return
            if curr_node.is_end:
                results.append(current_word)
                if len(results) >= limit:
                    return
            
            for edge_char, (edge_str, child_node) in curr_node.children.items():
                dfs(child_node, current_word + edge_str)
                if len(results) >= limit:
                    return
                
        dfs(node, base_word)
        return results

# =====================================================================
# STAGE 4: COMMAND-LINE INTERFACE & TIMING REPL (PROMPT 4)
# =====================================================================

def start_interactive_cli(trie, cities_count, build_time_ms, memory_mb):
    print("\n=======================================================")
    print("  Unified Indian Cities Autocomplete Project (Trie REPL)")
    print("=======================================================")
    print(f"Cities Loaded:   {cities_count:,}")
    print(f"Trie Build Time: {build_time_ms:.2f} ms")
    print(f"Memory Footprint: {memory_mb:.2f} MB")
    print("-------------------------------------------------------")
    print("Instructions:")
    print("  * Type a prefix and press Enter to see suggestions instantly.")
    print("  * Search timing (in milliseconds) is shown for each query.")
    print("  * Type 'exit' or 'quit' to terminate the CLI.")
    print("=======================================================\n")
    
    while True:
        try:
            user_input = input("Enter city prefix > ")
        except (KeyboardInterrupt, EOFError):
            print("\nExiting. Goodbye!")
            break
            
        cleaned_input = user_input.strip()
        if cleaned_input.lower() in ("exit", "quit"):
            print("Goodbye!")
            break
            
        # Edge Case: empty input
        if not cleaned_input:
            print("Error: Input cannot be empty. Please enter a search prefix.\n")
            continue
            
        query = cleaned_input.lower()
        
        # Benchmark lookup performance
        start_time = time.perf_counter()
        suggestions = trie.autocomplete(query, limit=10)
        end_time = time.perf_counter()
        
        duration_ms = (end_time - start_time) * 1000.0
        
        # Edge Case: prefix with no matches
        if not suggestions:
            print(f"Suggestions: [No matches found]")
        else:
            print(f"Suggestions: {', '.join(suggestions)}")
            
        print(f"Search Time: {duration_ms:.4f} ms (Constraint Check: {'PASSED' if duration_ms < 5.0 else 'FAILED'})\n")

def main():
    # Load or download GeoNames dataset
    cities = get_or_create_dataset()
    
    # Measure Trie build and memory profile
    gc.collect()
    tracemalloc.start()
    
    start_build = time.perf_counter()
    trie = Trie()
    for city in cities:
        trie.insert(city)
    end_build = time.perf_counter()
    
    current_mem, peak_mem = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    gc.collect()
    
    build_time_ms = (end_build - start_build) * 1000.0
    memory_mb = current_mem / (1024.0 * 1024.0)
    
    # Launch interactive CLI
    start_interactive_cli(trie, len(cities), build_time_ms, memory_mb)

if __name__ == "__main__":
    main()
