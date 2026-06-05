/**
 * trie.js
 * High-performance, memory-optimized Radix Tree (Trie) and Standard Trie in JavaScript.
 */

// =====================================================================
// STANDARD TRIE (For comparative benchmarks)
// =====================================================================

class StandardTrieNode {
  constructor() {
    this.children = {}; // char -> StandardTrieNode
    this.isEnd = false;
  }
}

class StandardTrie {
  constructor() {
    this.root = new StandardTrieNode();
  }

  insert(word) {
    if (!word) return;
    let node = this.root;
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      if (!node.children[char]) {
        node.children[char] = new StandardTrieNode();
      }
      node = node.children[char];
    }
    node.isEnd = true;
  }

  getNodeCount() {
    let count = 0;
    function dfs(node) {
      count++;
      for (const char in node.children) {
        dfs(node.children[char]);
      }
    }
    dfs(this.root);
    return count;
  }
}

// =====================================================================
// RADIX TREE TRIE (Memory-optimized edge compression)
// =====================================================================

class RadixNode {
  constructor() {
    this.children = {}; // Maps starting character of edge -> [edge_string, child_node]
    this.isEnd = false;
  }
}

class RadixTrie {
  constructor() {
    this.root = new RadixNode();
  }

  /**
   * Inserts a word into the Radix Tree.
   * Compresses edges by splitting nodes when partial matches occur.
   */
  insert(word) {
    if (!word) return;

    let node = this.root;
    let i = 0;
    while (i < word.length) {
      const char = word[i];
      
      // Case 1: No edge exists starting with char. Create leaf node.
      if (!(char in node.children)) {
        const newLeaf = new RadixNode();
        newLeaf.isEnd = true;
        node.children[char] = [word.slice(i), newLeaf];
        return;
      }

      // Case 2: Edge exists. Determine prefix overlap.
      const [edge, child] = node.children[char];
      let j = 0;
      while (j < edge.length && i + j < word.length && edge[j] === word[i + j]) {
        j++;
      }

      // If full edge matched, traverse down the tree
      if (j === edge.length) {
        node = child;
        i += j;
      } else {
        // Partial match. We need to split the edge.
        const splitNode = new RadixNode();
        const oldSuffix = edge.slice(j);
        
        // Move original child under the new split node
        splitNode.children[oldSuffix[0]] = [oldSuffix, child];

        // Insert new suffix if present
        const newSuffix = word.slice(i + j);
        if (newSuffix) {
          const leafNode = new RadixNode();
          leafNode.isEnd = true;
          splitNode.children[newSuffix[0]] = [newSuffix, leafNode];
        } else {
          splitNode.isEnd = true;
        }

        // Connect the current node to the new split node
        node.children[char] = [edge.slice(0, j), splitNode];
        return;
      }
    }
    node.isEnd = true;
  }

  /**
   * Search for an exact word match.
   */
  search(word) {
    if (!word) return false;

    let node = this.root;
    let i = 0;
    while (i < word.length) {
      const char = word[i];
      if (!(char in node.children)) {
        return false;
      }

      const [edge, child] = node.children[char];
      let j = 0;
      while (j < edge.length && i + j < word.length) {
        if (edge[j] !== word[i + j]) {
          return false;
        }
        j++;
      }

      if (j < edge.length) {
        return false;
      }

      i += j;
      node = child;
    }
    return node.isEnd;
  }

  /**
   * Search for a prefix match in the tree.
   */
  searchPrefix(prefix) {
    if (!prefix) return true;

    let node = this.root;
    let i = 0;
    while (i < prefix.length) {
      const char = prefix[i];
      if (!(char in node.children)) {
        return false;
      }

      const [edge, child] = node.children[char];
      let j = 0;
      while (j < edge.length && i + j < prefix.length) {
        if (edge[j] !== prefix[i + j]) {
          return false;
        }
        j++;
      }

      i += j;
      node = child;
    }
    return true;
  }

  /**
   * Retrieves top `limit` autocomplete suggestions starting with `prefix`.
   * Uses DFS from the prefix node with early termination.
   */
  autocomplete(prefix, limit = 10) {
    if (limit <= 0) return [];

    let node = this.root;
    let i = 0;
    const currentPath = [];

    // Traverse to the node representing the prefix
    while (i < prefix.length) {
      const char = prefix[i];
      if (!(char in node.children)) {
        return [];
      }

      const [edge, child] = node.children[char];
      let j = 0;
      while (j < edge.length && i + j < prefix.length) {
        if (edge[j] !== prefix[i + j]) {
          return [];
        }
        j++;
      }

      i += j;
      node = child;
      currentPath.push(edge);
    }

    // Reconstruction of base word
    const baseWord = currentPath.join("");
    const results = [];

    // Helper for DFS traversal with early-exit
    function dfs(currNode, currentWord) {
      if (results.length >= limit) return;
      if (currNode.isEnd) {
        results.push(currentWord);
        if (results.length >= limit) return;
      }

      // Sort children alphabetically by edge string for deterministic outputs
      const keys = Object.keys(currNode.children).sort();
      for (const char of keys) {
        const [edgeStr, childNode] = currNode.children[char];
        dfs(childNode, currentWord + edgeStr);
        if (results.length >= limit) return;
      }
    }

    // Adjust baseWord if matching partially inside an edge
    let adjustedBase = baseWord;
    if (baseWord.length > prefix.length) {
      adjustedBase = prefix + baseWord.slice(prefix.length);
    }

    dfs(node, adjustedBase);
    return results;
  }

  /**
   * Counts the total number of nodes in the Radix Tree.
   */
  getNodeCount() {
    let count = 0;
    function dfs(node) {
      count++;
      for (const char in node.children) {
        dfs(node.children[char][1]);
      }
    }
    dfs(this.root);
    return count;
  }

  /**
   * Counts the sum of character lengths of all edge strings (to evaluate memory).
   */
  getEdgeCharacterCount() {
    let count = 0;
    function dfs(node) {
      for (const char in node.children) {
        const [edge, child] = node.children[char];
        count += edge.length;
        dfs(child);
      }
    }
    dfs(this.root);
    return count;
  }

  /**
   * Exports the tree as a JSON structure for SVG visualizers.
   */
  exportToJSON(node = this.root, edgeLabel = "") {
    const children = [];
    const keys = Object.keys(node.children).sort();
    for (const char of keys) {
      const [edge, childNode] = node.children[char];
      children.push(this.exportToJSON(childNode, edge));
    }
    return {
      label: edgeLabel,
      isEnd: node.isEnd,
      children: children
    };
  }

  /**
   * Exports a subset of the tree matching a prefix (to prevent visual overload).
   */
  exportSubtreeToJSON(prefix) {
    let node = this.root;
    let i = 0;
    const path = [];

    // Traverse to the prefix node
    while (i < prefix.length) {
      const char = prefix[i];
      if (!(char in node.children)) {
        return null;
      }
      const [edge, child] = node.children[char];
      let j = 0;
      while (j < edge.length && i + j < prefix.length) {
        if (edge[j] !== prefix[i + j]) {
          return null;
        }
        j++;
      }
      path.push({ label: edge, node: child });
      i += j;
      node = child;
    }

    // Build hierarchical tree showing search path and branches
    // To make it clear, we reconstruct from root to matching node,
    // then export child branches from that node up to a limited depth.
    function exportLimited(currNode, edgeLabel, depthLimit) {
      const children = [];
      if (depthLimit > 0) {
        const keys = Object.keys(currNode.children).slice(0, 8); // Limit node fan-out
        for (const char of keys) {
          const [edge, childNode] = currNode.children[char];
          children.push(exportLimited(childNode, edge, depthLimit - 1));
        }
      }
      return {
        label: edgeLabel,
        isEnd: currNode.isEnd,
        children: children
      };
    }

    // Build the visual chain for the matched path
    let treeRoot = { label: "root", isEnd: this.root.isEnd, children: [] };
    let currVisual = treeRoot;
    
    // Stitch path nodes
    for (let k = 0; k < path.length; k++) {
      const pathStep = path[k];
      const newNode = { label: pathStep.label, isEnd: pathStep.node.isEnd, children: [] };
      currVisual.children.push(newNode);
      currVisual = newNode;
    }
    
    // Append actual subtree children to the end of the path
    const keys = Object.keys(node.children).sort().slice(0, 10); // Limit fan-out at search match
    for (const char of keys) {
      const [edge, childNode] = node.children[char];
      currVisual.children.push(exportLimited(childNode, edge, 2)); // Traverse 2 levels deep
    }

    return treeRoot;
  }
}
