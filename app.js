/**
 * app.js
 * App controller, interactive particle system, sound synthesizer, SVG visualizers, 
 * database seed exporter tool, and Geoguess spelling game.
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- STATE VARIABLES ---
  let radixTrie = new RadixTrie();
  let standardTrie = new StandardTrie();
  let playgroundTrie = new RadixTrie();

  // Active view states
  let activeTab = 'engine'; // 'engine', 'routes', 'game'
  let visualizerMode = 'playground'; // 'playground', 'search'
  
  // Drag and zoom variables for SVG canvas
  let isDragging = false;
  let startX = 0, startY = 0;
  let translateX = 60, translateY = 80;
  let scale = 0.95;

  // Sound settings
  let soundEnabled = true;
  let audioCtx = null;

  // Game Arena States
  let gameScore = 0;
  let gameStreak = 0;
  let gameBestStreak = 0;
  let gameCurrentCity = "";
  let gameCluesRevealed = 0;

  // Manual Basket for Seed Exporter
  const selectedBasket = [];

  // Cache DOM elements
  const searchInput = document.getElementById("city-search");
  const clearSearch = document.getElementById("clear-search");
  const dropdown = document.getElementById("suggestions-dropdown");
  const suggestionsList = document.getElementById("suggestions-list");
  const suggestionsMetrics = document.getElementById("suggestions-metrics");
  
  const statCitiesCount = document.getElementById("stat-cities-count");
  const statBuildTime = document.getElementById("stat-build-time");
  const statNodeReduction = document.getElementById("stat-node-reduction");
  const statLookupTime = document.getElementById("stat-lookup-time");

  const benchmarkStatus = document.getElementById("benchmark-status");
  const benchmarkBar = document.getElementById("benchmark-bar");
  const benchmarkExactTime = document.getElementById("benchmark-exact-time");

  const treeSvg = document.getElementById("tree-svg");
  const playgroundFormContainer = document.getElementById("playground-form-container");
  const playgroundInput = document.getElementById("playground-input");
  const btnInsertPlayground = document.getElementById("playground-btn-insert");
  const btnResetPlayground = document.getElementById("playground-btn-reset");
  
  const btnModePlayground = document.getElementById("btn-mode-playground");
  const btnModeSearch = document.getElementById("btn-mode-search");
  const visualizerDescription = document.getElementById("visualizer-description");
  const fileUpload = document.getElementById("file-upload");
  const audioToggleBtn = document.getElementById("audio-toggle-btn");

  const btnStressTest = document.getElementById("btn-stress-test");
  const stressTestStatus = document.getElementById("stress-test-status");
  const stressStatsDisplay = document.getElementById("stress-stats-display");
  const stressAvgSpeed = document.getElementById("stress-avg-speed");
  const stressThroughput = document.getElementById("stress-throughput");

  // Tab buttons and containers
  const tabBtnEngine = document.getElementById("tab-btn-engine");
  const tabBtnRoutes = document.getElementById("tab-btn-routes");
  const tabBtnGame = document.getElementById("tab-btn-game");
  const tabBtnPattern = document.getElementById("tab-btn-pattern");
  const tabBtnAnalytics = document.getElementById("tab-btn-analytics");
  const tabBtnScanner = document.getElementById("tab-btn-scanner");
  const tabBtnTravel = document.getElementById("tab-btn-travel");
  const tabBtnTourism = document.getElementById("tab-btn-tourism");
  const tabBtnTrip = document.getElementById("tab-btn-trip");
  const tabBtnDiscovery = document.getElementById("tab-btn-discovery");
  const tabBtnFestivals = document.getElementById("tab-btn-festivals");
  const tabBtnCompare = document.getElementById("tab-btn-compare");
  const tabBtnBudget = document.getElementById("tab-btn-budget");
  const tabContentEngine = document.getElementById("tab-content-engine");
  const tabContentRoutes = document.getElementById("tab-content-routes");
  const tabContentGame = document.getElementById("tab-content-game");
  const tabContentPattern = document.getElementById("tab-content-pattern");
  const tabContentAnalytics = document.getElementById("tab-content-analytics");
  const tabContentScanner = document.getElementById("tab-content-scanner");
  const tabContentTravel = document.getElementById("tab-content-travel");
  const tabContentTourism = document.getElementById("tab-content-tourism");
  const tabContentTrip = document.getElementById("tab-content-trip");
  const tabContentDiscovery = document.getElementById("tab-content-discovery");
  const tabContentFestivals = document.getElementById("tab-content-festivals");
  const tabContentCompare = document.getElementById("tab-content-compare");
  const tabContentBudget = document.getElementById("tab-content-budget");
  const themeToggleBtn = document.getElementById("theme-toggle-btn");

  // Exporter DOM elements
  const routeDestination = document.getElementById("route-destination");
  const dropdownDestination = document.getElementById("dropdown-destination");
  const listDestination = document.getElementById("list-destination");
  const logisticsSuggestionsMetrics = document.getElementById("logistics-suggestions-metrics");
  const selectStateFilter = document.getElementById("export-state-filter");
  const selectFormat = document.getElementById("export-format");
  const inputNamePattern = document.getElementById("export-name-pattern");
  const inputExportLimit = document.getElementById("package-weight");
  
  const btnCalcRoute = document.getElementById("btn-calc-route"); // triggers seed schema gen
  const routeResultsCard = document.getElementById("route-results-card");
  const exportCodeBlock = document.getElementById("export-code-block");
  const btnCopySeed = document.getElementById("btn-copy-seed");
  const btnDownloadSeed = document.getElementById("btn-download-seed");

  // Game DOM elements
  const gameScrambledWord = document.getElementById("game-scrambled-word");
  const gameClueText = document.getElementById("game-clue-text");
  const gameGuessInput = document.getElementById("game-guess-input");
  const dropdownGame = document.getElementById("dropdown-game");
  const listGame = document.getElementById("list-game");
  const gameSuggestionsMetrics = document.getElementById("game-suggestions-metrics");
  const gameBtnSubmit = document.getElementById("game-btn-submit");
  const gameBtnSkip = document.getElementById("game-btn-skip");
  const gameBtnRevealClue = document.getElementById("game-btn-reveal-clue");
  const domGameScore = document.getElementById("game-score");
  const domGameStreak = document.getElementById("game-streak");
  const domGameBestStreak = document.getElementById("game-best-streak");
  const gameLog = document.getElementById("game-log");

  // SVG viewport group
  let svgViewport;
  
  // =====================================================================
  // AUDIO ENGINE (Web Audio API Synthesizer)
  // =====================================================================
  
  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type, duration, volume, slideToFreq = 0) {
    if (!soundEnabled) return;
    try {
      initAudio();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      
      if (slideToFreq > 0) {
        osc.frequency.exponentialRampToValueAtTime(slideToFreq, audioCtx.currentTime + duration);
      }
      
      gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("AudioContext failed to initialize or execute", e);
    }
  }

  function playHoverSound() {
    playTone(800, "sine", 0.04, 0.04);
  }

  function playSelectSound() {
    playTone(523.25, "triangle", 0.15, 0.15); // C5
    setTimeout(() => playTone(659.25, "triangle", 0.15, 0.15), 50); // E5
    setTimeout(() => playTone(783.99, "triangle", 0.3, 0.15), 100); // G5
  }

  function playSuccessSound() {
    playTone(600, "sine", 0.1, 0.15);
    setTimeout(() => playTone(900, "sine", 0.2, 0.15), 80);
  }

  function playErrorSound() {
    playTone(220, "sawtooth", 0.25, 0.1, 110);
  }

  function playStressTick(progress) {
    const baseFreq = 300 + progress * 600;
    playTone(baseFreq, "sine", 0.03, 0.03);
  }

  // =====================================================================
  // INTERACTIVE PARTICLE SYSTEM
  // =====================================================================
  
  const canvas = document.getElementById("particle-canvas");
  const ctx = canvas.getContext("2d");
  let particles = [];
  
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  class Particle {
    constructor(x, y, color = null, isAmbient = false) {
      this.x = x;
      this.y = y;
      this.isAmbient = isAmbient;
      
      if (isAmbient) {
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.radius = Math.random() * 2 + 0.5;
        this.color = color || `rgba(6, 182, 212, ${Math.random() * 0.3 + 0.1})`;
        this.alpha = Math.random() * 0.5 + 0.2;
      } else {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.radius = Math.random() * 4 + 1.5;
        this.color = color || (Math.random() > 0.5 ? "rgba(6, 182, 212, 0.8)" : "rgba(168, 85, 247, 0.8)");
        this.alpha = 1.0;
        this.decay = Math.random() * 0.02 + 0.015;
      }
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      
      if (this.isAmbient) {
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
      } else {
        this.alpha -= this.decay;
      }
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      
      if (!this.isAmbient && this.radius > 3) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function initAmbientParticles() {
    particles = [];
    const count = Math.floor((canvas.width * canvas.height) / 18000);
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        null,
        true
      ));
    }
  }
  initAmbientParticles();

  function spawnParticleBurst(x, y, count = 25, color = null) {
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(x, y, color, false));
    }
  }

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => {
      p.update();
      p.draw();
      return p.isAmbient || p.alpha > 0;
    });
    requestAnimationFrame(animateParticles);
  }
  requestAnimationFrame(animateParticles);

  document.addEventListener("click", (e) => {
    if (e.target.closest("button") || e.target.closest(".suggestion-item") || e.target.closest(".tab-btn")) {
      spawnParticleBurst(e.clientX, e.clientY, 15);
    }
  });

  // =====================================================================
  // INITIALIZATION
  // =====================================================================
  
  function initializeApp() {
    setupSvg();
    buildTries(CITIES_DATA);
    setupPlaygroundDefault();
    setupEventListeners();
    updateVisualizer();
    setupGameScoreboard();
    loadNewGameWord();
    
    // Generate initial schema query immediately
    setTimeout(generateDatabaseSeed, 20);
  }

  function setupSvg() {
    treeSvg.innerHTML = "";
    svgViewport = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svgViewport.setAttribute("id", "viewport");
    treeSvg.appendChild(svgViewport);
    updateTransform();
  }

  function updateTransform() {
    svgViewport.setAttribute("transform", `translate(${translateX}, ${translateY}) scale(${scale})`);
  }

  function buildTries(citiesArray) {
    const t0 = performance.now();
    
    radixTrie = new RadixTrie();
    standardTrie = new StandardTrie();
    
    for (let i = 0; i < citiesArray.length; i++) {
      radixTrie.insert(citiesArray[i]);
      standardTrie.insert(citiesArray[i]);
    }
    
    const t1 = performance.now();
    const buildDurationMs = t1 - t0;

    const rtNodes = radixTrie.getNodeCount();
    const stNodes = standardTrie.getNodeCount();
    const rtChars = radixTrie.getEdgeCharacterCount();
    
    const stChars = Math.max(0, stNodes - 1);
    const nodeReductionPct = ((stNodes - rtNodes) / stNodes) * 100;

    statCitiesCount.textContent = citiesArray.length.toLocaleString();
    statBuildTime.textContent = `${buildDurationMs.toFixed(2)} ms`;
    statNodeReduction.textContent = `${nodeReductionPct.toFixed(1)}%`;
    
    document.getElementById("table-st-nodes").textContent = stNodes.toLocaleString();
    document.getElementById("table-rt-nodes").textContent = rtNodes.toLocaleString();
    document.getElementById("table-node-savings").textContent = `-${nodeReductionPct.toFixed(1)}%`;
    
    document.getElementById("table-st-chars").textContent = stChars.toLocaleString();
    document.getElementById("table-rt-chars").textContent = rtChars.toLocaleString();
    
    const charSavingsPct = ((stChars - rtChars) / stChars) * 100;
    document.getElementById("table-char-savings").textContent = `-${charSavingsPct.toFixed(1)}%`;
  }

  function setupPlaygroundDefault() {
    playgroundTrie = new RadixTrie();
    const defaultPlaygroundWords = ["car", "cart", "cat", "dog", "dodge", "do", "dark", "dart"];
    defaultPlaygroundWords.forEach(word => playgroundTrie.insert(word));
  }

  // =====================================================================
  // EVENT LISTENERS & TAB CONTROLS
  // =====================================================================
  
  function setupEventListeners() {
    // Sound FX enable toggler
    audioToggleBtn.addEventListener("click", () => {
      soundEnabled = !soundEnabled;
      if (soundEnabled) {
        initAudio();
        audioToggleBtn.innerHTML = "<span>🔊</span> Sounds: On";
        audioToggleBtn.style.color = "var(--color-primary)";
        audioToggleBtn.style.background = "rgba(59, 130, 246, 0.15)";
        playSuccessSound();
      } else {
        audioToggleBtn.innerHTML = "<span>🔇</span> Sounds: Off";
        audioToggleBtn.style.color = "var(--text-muted)";
        audioToggleBtn.style.background = "rgba(255, 255, 255, 0.03)";
      }
    });

    // --- Tab Navigation Handlers ---
    if (tabBtnEngine) tabBtnEngine.addEventListener("click", () => switchTab('engine'));
    if (tabBtnRoutes) tabBtnRoutes.addEventListener("click", () => switchTab('routes'));
    if (tabBtnGame) tabBtnGame.addEventListener("click", () => switchTab('game'));
    if (tabBtnPattern) tabBtnPattern.addEventListener("click", () => switchTab('pattern'));
    if (tabBtnAnalytics) tabBtnAnalytics.addEventListener("click", () => switchTab('analytics'));
    if (tabBtnScanner) tabBtnScanner.addEventListener("click", () => switchTab('scanner'));
    if (tabBtnTravel) tabBtnTravel.addEventListener("click", () => switchTab('travel'));
    if (tabBtnTourism) tabBtnTourism.addEventListener("click", () => switchTab('tourism'));
    if (tabBtnTrip) tabBtnTrip.addEventListener("click", () => switchTab('trip'));
    if (tabBtnDiscovery) tabBtnDiscovery.addEventListener("click", () => switchTab('discovery'));
    if (tabBtnFestivals) tabBtnFestivals.addEventListener("click", () => switchTab('festivals'));
    if (tabBtnCompare) tabBtnCompare.addEventListener("click", () => switchTab('compare'));
    if (tabBtnBudget) tabBtnBudget.addEventListener("click", () => switchTab('budget'));

    // --- Theme Switcher Event Listener ---
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener("click", cycleTheme);
    }

    // --- Tab 1: Engine search input autocomplete handler ---
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (query.length > 0) {
        clearSearch.style.display = "inline";
        handleAutocompleteInput(searchInput, dropdown, suggestionsList, suggestionsMetrics, query, 10, (selected) => {
          handleAutocomplete(selected);
        });
      } else {
        clearSearch.style.display = "none";
        hideSuggestions();
      }
    });

    clearSearch.addEventListener("click", () => {
      searchInput.value = "";
      clearSearch.style.display = "none";
      hideSuggestions();
      if (visualizerMode === 'search') {
        updateVisualizer();
      }
    });

    // Close all suggestions dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) hideSuggestions();
      if (!routeDestination.contains(e.target) && !dropdownDestination.contains(e.target)) dropdownDestination.classList.remove("active");
      if (!gameGuessInput.contains(e.target) && !dropdownGame.contains(e.target)) dropdownGame.classList.remove("active");
    });

    // Custom File Uploader logic (only if element exists)
    if (fileUpload) fileUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {
        const text = evt.target.result;
        const parsedCities = text.split(/\r?\n/)
          .map(line => line.trim().toLowerCase().replace(/[^a-z ]/g, ''))
          .filter(line => line.length >= 3);
        
        if (parsedCities.length === 0) {
          playErrorSound();
          alert("Error: No valid words found in file.");
          return;
        }

        buildTries(parsedCities);
        searchInput.value = "";
        clearSearch.style.display = "none";
        hideSuggestions();
        if (visualizerMode === 'search') {
          updateVisualizer();
        }
        playSuccessSound();
        const rect = document.querySelector(".upload-area").getBoundingClientRect();
        spawnParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 40, "var(--color-success)");
        alert(`Successfully loaded ${parsedCities.length.toLocaleString()} cities from custom file!`);
      };
      reader.readAsText(file);
    });

    // Mode toggles
    btnModePlayground.addEventListener("click", () => {
      visualizerMode = 'playground';
      btnModePlayground.classList.add("active");
      btnModeSearch.classList.remove("active");
      playgroundFormContainer.style.display = "flex";
      visualizerDescription.textContent = "Playground Mode: Insert custom strings to see how the Radix Tree splits and compresses edge labels.";
      resetPanZoomPlayground();
      updateVisualizer();
    });

    btnModeSearch.addEventListener("click", () => {
      visualizerMode = 'search';
      btnModePlayground.classList.remove("active");
      btnModeSearch.classList.add("active");
      playgroundFormContainer.style.display = "none";
      visualizerDescription.textContent = "Search Mode: Type in the search box to visualize the traversal path and nearest branch splits.";
      resetPanZoomSearch();
      updateVisualizer();
    });

    // Custom playground insert
    btnInsertPlayground.addEventListener("click", handlePlaygroundInsert);
    playgroundInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handlePlaygroundInsert();
    });

    btnResetPlayground.addEventListener("click", () => {
      setupPlaygroundDefault();
      playgroundInput.value = "";
      updateVisualizer();
      playSuccessSound();
    });

    btnStressTest.addEventListener("click", runStressTest);

    // SVG Dragging & Panning Tree Canvas
    treeSvg.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX - translateX;
      startY = e.clientY - translateY;
      treeSvg.style.cursor = "grabbing";
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      translateX = e.clientX - startX;
      translateY = e.clientY - startY;
      updateTransform();
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
      treeSvg.style.cursor = "grab";
    });

    treeSvg.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = 1.1;
      if (e.deltaY < 0) {
        scale = Math.min(scale * zoomFactor, 3.0);
      } else {
        scale = Math.max(scale / zoomFactor, 0.2);
      }
      updateTransform();
    });

    // --- Tab 2: Route Planner / Exporter Event Listeners ---
    setupRoutePlannerListeners();

    // --- Tab 3: Spelling Game Event Listeners ---
    setupGameListeners();
  }

  function switchTab(tabId) {
    if (activeTab === tabId) return;
    activeTab = tabId;
    initAudio();

    const allTabBtns = [tabBtnEngine, tabBtnRoutes, tabBtnGame, tabBtnPattern, tabBtnAnalytics, tabBtnScanner, tabBtnTravel, tabBtnTourism, tabBtnTrip, tabBtnDiscovery, tabBtnFestivals, tabBtnCompare, tabBtnBudget];
    const allTabContents = [tabContentEngine, tabContentRoutes, tabContentGame, tabContentPattern, tabContentAnalytics, tabContentScanner, tabContentTravel, tabContentTourism, tabContentTrip, tabContentDiscovery, tabContentFestivals, tabContentCompare, tabContentBudget];
    const tabIds = ['engine', 'routes', 'game', 'pattern', 'analytics', 'scanner', 'travel', 'tourism', 'trip', 'discovery', 'festivals', 'compare', 'budget'];
    const idx = tabIds.indexOf(tabId);

    allTabBtns.forEach((btn, i) => {
      if (btn) btn.classList.toggle("active", i === idx);
    });
    allTabContents.forEach((content, i) => {
      if (content) {
        content.classList.toggle("active", i === idx);
        content.style.display = (i === idx) ? '' : 'none';
      }
    });

    playSelectSound();
    
    // Generate schema on tab switch
    if (tabId === 'routes') {
      setTimeout(generateDatabaseSeed, 20);
    }
    // Render analytics lazily on first visit
    if (tabId === 'analytics') {
      renderAnalytics();
    }
    // Initialize or load first quiz question on travel tab visit
    if (tabId === 'travel') {
      initQuiz();
    }
    // Initialize state showcase on visit
    if (tabId === 'tourism') {
      initTourism();
    }
    // Initialize trip planner on visit
    if (tabId === 'trip') {
      initTripPlanner();
    }
    // Initialize city discovery on visit
    if (tabId === 'discovery') {
      initDiscovery();
    }
    // Initialize festivals calendar on visit
    if (tabId === 'festivals') {
      initFestivals();
    }
    // Initialize city comparison on visit
    if (tabId === 'compare') {
      initCompare();
    }
    // Initialize budget calculator on visit
    if (tabId === 'budget') {
      initBudget();
    }
  }

  // =====================================================================
  // UNIFIED AUTOCOMPLETE HANDLER FOR ALL INPUT FIELDS
  // =====================================================================
  
  function handleAutocompleteInput(inputElem, dropdownElem, listElem, metricsElem, query, limit, onSelectCallback) {
    const t0 = performance.now();
    const suggestions = radixTrie.autocomplete(query, limit);
    const t1 = performance.now();
    const durationMs = t1 - t0;

    // Update the main lookup speed metrics in the top dashboard
    statLookupTime.textContent = `${durationMs.toFixed(3)} ms`;

    // If it's Tab 1 (Main search input), update its custom benchmarking stats cards
    if (inputElem === searchInput) {
      benchmarkExactTime.textContent = `${(durationMs * 1000).toFixed(1)} μs (${durationMs.toFixed(4)} ms)`;
      const pct = Math.min((durationMs / 5.0) * 100, 100);
      benchmarkBar.style.width = `${pct}%`;
      if (durationMs < 5.0) {
        benchmarkStatus.textContent = "PASSED";
        benchmarkStatus.style.color = "var(--color-success)";
        benchmarkBar.style.background = "linear-gradient(90deg, var(--color-primary), var(--color-accent))";
      } else {
        benchmarkStatus.textContent = "FAILED";
        benchmarkStatus.style.color = "var(--color-purple)";
        benchmarkBar.style.background = "var(--color-purple)";
      }
    }

    // Populate drop-down list
    listElem.innerHTML = "";
    if (metricsElem) {
      metricsElem.textContent = `${suggestions.length} match${suggestions.length === 1 ? '' : 'es'}`;
    }

    if (suggestions.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.className = "suggestion-item";
      emptyLi.style.cursor = "default";
      emptyLi.innerHTML = `<span style="color: var(--text-muted)">No matches found</span>`;
      listElem.appendChild(emptyLi);
    } else {
      suggestions.forEach(item => {
        const li = document.createElement("li");
        li.className = "suggestion-item";
        
        let displayedHTML = item.startsWith(query) 
          ? `<span class="match">${query}</span>${item.slice(query.length)}`
          : item;

        li.innerHTML = `
          <span class="suggestion-text">${displayedHTML}</span>
          <span class="suggestion-arrow">➔</span>
        `;

        li.addEventListener("mouseenter", playHoverSound);
        li.addEventListener("click", () => {
          playSelectSound();
          inputElem.value = capitalizeWord(item); // Capitalize selected autocomplete result
          dropdownElem.classList.remove("active");
          onSelectCallback(item);
        });

        listElem.appendChild(li);
      });
    }
    dropdownElem.classList.add("active");
  }

  // Backwards compatible wrapper for search input handle autocomplete
  function handleAutocomplete(query) {
    if (visualizerMode === 'search') {
      updateVisualizer();
    }
  }

  // Hide the main search suggestions dropdown
  function hideSuggestions() {
    dropdown.classList.remove("active");
    suggestionsList.innerHTML = "";
    if (suggestionsMetrics) suggestionsMetrics.textContent = "0 matches";
  }

  // =====================================================================
  // PLAYGROUND ACTION
  // =====================================================================
  
  function handlePlaygroundInsert() {
    const input = playgroundInput.value.trim().toLowerCase().replace(/[^a-z]/g, '');
    if (!input || input.length < 2) {
      playErrorSound();
      alert("Please enter a valid alphabetic word of length 2 or more.");
      return;
    }
    
    playgroundTrie.insert(input);
    playgroundInput.value = "";
    updateVisualizer();
    playSuccessSound();
  }

  // =====================================================================
  // ENGINE PERFORMANCE STRESS TEST CHALLENGE
  // =====================================================================

  function runStressTest() {
    initAudio();
    btnStressTest.disabled = true;
    btnStressTest.textContent = "Benchmarking Engine...";
    stressTestStatus.textContent = "Running...";
    stressStatsDisplay.style.display = "none";

    const testSeeds = [];
    for (let i = 0; i < 500; i++) {
      const city = CITIES_DATA[Math.floor(Math.random() * CITIES_DATA.length)];
      if (city.length > 3) testSeeds.push(city.slice(0, 3));
    }
    if (testSeeds.length === 0) testSeeds.push("del", "mum", "ban", "che", "kol");

    const totalQueries = 10000;
    const chunkSize = 1000;
    let queriesCompleted = 0;
    let totalDurationMs = 0;

    function runChunk() {
      const start = performance.now();
      for (let i = 0; i < chunkSize; i++) {
        const seed = testSeeds[Math.floor(Math.random() * testSeeds.length)];
        radixTrie.autocomplete(seed, 10);
      }
      const end = performance.now();
      totalDurationMs += (end - start);
      queriesCompleted += chunkSize;

      const progress = queriesCompleted / totalQueries;
      playStressTick(progress);
      
      const buttonRect = btnStressTest.getBoundingClientRect();
      spawnParticleBurst(
        buttonRect.left + Math.random() * buttonRect.width, 
        buttonRect.top + buttonRect.height / 2, 
        5, 
        "var(--color-purple)"
      );

      if (queriesCompleted < totalQueries) {
        setTimeout(runChunk, 30);
      } else {
        finalizeStressTest(totalDurationMs, totalQueries);
      }
    }
    setTimeout(runChunk, 100);
  }

  function finalizeStressTest(totalDurationMs, count) {
    const avgLatencyMs = totalDurationMs / count;
    const opsPerSec = Math.round(count / (totalDurationMs / 1000));
    
    stressTestStatus.textContent = "COMPLETE!";
    stressTestStatus.style.color = "var(--color-success)";
    
    stressStatsDisplay.style.display = "flex";
    stressAvgSpeed.textContent = `${avgLatencyMs.toFixed(4)} ms`;
    stressThroughput.textContent = `${opsPerSec.toLocaleString()} ops/sec`;
    
    btnStressTest.disabled = false;
    btnStressTest.textContent = "Re-run Lookup Stress Test";
    
    playSelectSound();
    const buttonRect = btnStressTest.getBoundingClientRect();
    spawnParticleBurst(buttonRect.left + buttonRect.width / 2, buttonRect.top + buttonRect.height / 2, 45, "var(--color-success)");

    const latencyCard = document.getElementById("card-latency");
    latencyCard.style.boxShadow = "0 0 30px var(--color-purple-glow)";
    setTimeout(() => latencyCard.style.boxShadow = "none", 1200);
  }

  // =====================================================================
  // DYNAMIC SVG TREE VISUALIZER LAYOUT RENDERER
  // =====================================================================

  function updateVisualizer() {
    let treeData = null;
    
    if (visualizerMode === 'playground') {
      treeData = playgroundTrie.exportToJSON();
    } else {
      const query = searchInput.value.trim().toLowerCase();
      if (!query) {
        treeData = { label: "root", isEnd: false, children: [] };
      } else {
        treeData = radixTrie.exportSubtreeToJSON(query);
        if (!treeData) {
          treeData = { label: "root (no matches)", isEnd: false, children: [] };
        }
      }
    }
    
    drawTree(treeData);
  }

  function drawTree(treeData) {
    svgViewport.innerHTML = "";
    if (!treeData) return;

    let nextX = 0;
    function calculateGrid(node, depth = 0) {
      node.depth = depth;
      if (!node.children || node.children.length === 0) {
        node.xIndex = nextX;
        nextX++;
        return;
      }
      node.children.forEach(child => calculateGrid(child, depth + 1));
      
      const firstChildX = node.children[0].xIndex;
      const lastChildX = node.children[node.children.length - 1].xIndex;
      node.xIndex = (firstChildX + lastChildX) / 2;
    }
    
    calculateGrid(treeData);

    const spacingX = 140;
    const spacingY = 130;
    
    function mapCoords(node) {
      node.cx = node.xIndex * spacingX;
      node.cy = node.depth * spacingY;
      if (node.children) {
        node.children.forEach(mapCoords);
      }
    }
    mapCoords(treeData);

    const linksGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    
    svgViewport.appendChild(linksGroup);
    svgViewport.appendChild(nodesGroup);

    function drawLinks(node) {
      if (!node.children) return;
      
      node.children.forEach(child => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const pathData = `M ${node.cx} ${node.cy} C ${node.cx} ${(node.cy + child.cy)/2}, ${child.cx} ${(node.cy + child.cy)/2}, ${child.cx} ${child.cy}`;
        
        path.setAttribute("d", pathData);
        path.setAttribute("class", "link");
        
        if (visualizerMode === 'search' && child.label !== "") {
          path.classList.add("highlighted");
        }
        
        linksGroup.appendChild(path);

        if (child.label) {
          const midX = (node.cx + child.cx) / 2;
          const midY = (node.cy + child.cy) / 2;
          
          const labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
          const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          
          text.setAttribute("x", midX);
          text.setAttribute("y", midY);
          text.setAttribute("class", "edge-text");
          text.textContent = child.label;
          
          labelGroup.appendChild(rect);
          labelGroup.appendChild(text);
          linksGroup.appendChild(labelGroup);
          
          const textBBox = text.getBBox ? text.getBBox() : { width: child.label.length * 7, height: 14 };
          rect.setAttribute("x", midX - textBBox.width / 2 - 4);
          rect.setAttribute("y", midY - 8);
          rect.setAttribute("width", textBBox.width + 8);
          rect.setAttribute("height", 16);
          rect.setAttribute("class", "edge-text-bg");
        }
        
        drawLinks(child);
      });
    }

    function drawNodes(node) {
      const nodeG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      nodeG.setAttribute("class", `node ${node.isEnd ? 'is-end' : ''}`);
      
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", node.cx);
      circle.setAttribute("cy", node.cy);
      circle.setAttribute("r", "14");
      
      if (visualizerMode === 'search' && node.label !== "root") {
        circle.classList.add("highlighted");
      }
      
      nodeG.appendChild(circle);

      if (node.label === "root" || !node.label) {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", node.cx);
        text.setAttribute("y", node.cy + 30);
        text.setAttribute("text-anchor", "middle");
        text.textContent = node.label || "root";
        nodeG.appendChild(text);
      } else if (node.isEnd) {
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", node.cx);
        dot.setAttribute("cy", node.cy);
        dot.setAttribute("r", "4");
        dot.setAttribute("fill", "var(--color-success)");
        nodeG.appendChild(dot);
      }
      
      circle.addEventListener("mouseenter", () => {
        circle.setAttribute("r", "17");
        playHoverSound();
      });
      circle.addEventListener("mouseleave", () => {
        circle.setAttribute("r", "14");
      });

      nodesGroup.appendChild(nodeG);
      
      if (node.children) {
        node.children.forEach(drawNodes);
      }
    }

    drawLinks(treeData);
    drawNodes(treeData);
  }

  // =====================================================================
  // TAB 2: DATABASE SEED EXPORTER TOOL (Useful Tool)
  // =====================================================================
  
  function setupRoutePlannerListeners() {
    // Autocomplete for Destination City (using unified autocomplete input logic!)
    routeDestination.addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (query.length > 0) {
        handleAutocompleteInput(
          routeDestination, 
          dropdownDestination, 
          listDestination, 
          logisticsSuggestionsMetrics, 
          query, 
          5, 
          (selected) => {
            // Callback: Add selected city manually to selected basket
            if (!selectedBasket.includes(selected)) {
              selectedBasket.push(selected);
            }
            routeDestination.value = ""; // Clear input immediately for quick multiple adds
            dropdownDestination.classList.remove("active");
            
            generateDatabaseSeed();
            playSuccessSound();
          }
        );
      } else {
        dropdownDestination.classList.remove("active");
      }
    });

    // Enter key triggers adding the city if it's a valid prefix
    routeDestination.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = routeDestination.value.trim().toLowerCase();
        const resolved = resolveCityInput(val);
        if (resolved) {
          if (!selectedBasket.includes(resolved)) selectedBasket.push(resolved);
          routeDestination.value = "";
          dropdownDestination.classList.remove("active");
          generateDatabaseSeed();
          playSuccessSound();
        } else {
          playErrorSound();
        }
      }
    });

    // Form inputs change triggers database schema rebuild instantly
    selectStateFilter.addEventListener("change", generateDatabaseSeed);
    selectFormat.addEventListener("change", generateDatabaseSeed);
    inputNamePattern.addEventListener("input", generateDatabaseSeed);
    inputExportLimit.addEventListener("input", generateDatabaseSeed);

    // Schema button action
    btnCalcRoute.addEventListener("click", () => {
      generateDatabaseSeed();
      playSuccessSound();
    });

    // Copy to clipboard action
    btnCopySeed.addEventListener("click", () => {
      const codeText = exportCodeBlock.textContent;
      if (!codeText) return;

      navigator.clipboard.writeText(codeText).then(() => {
        playSelectSound();
        
        // Temporarily change button style to show success
        const prevText = btnCopySeed.textContent;
        btnCopySeed.textContent = "Copied!";
        btnCopySeed.style.background = "var(--color-success)";
        btnCopySeed.style.color = "var(--bg-primary)";
        btnCopySeed.style.borderColor = "var(--color-success)";
        
        setTimeout(() => {
          btnCopySeed.textContent = prevText;
          btnCopySeed.style.background = "var(--color-primary)";
          btnCopySeed.style.color = "";
          btnCopySeed.style.borderColor = "";
        }, 1200);

        // Spawn particles
        const rect = btnCopySeed.getBoundingClientRect();
        spawnParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 25, "var(--color-success)");
      }).catch(err => {
        playErrorSound();
        console.error("Clipboard write failed", err);
      });
    });

    // Download file action
    btnDownloadSeed.addEventListener("click", () => {
      const codeText = exportCodeBlock.textContent;
      if (!codeText) return;

      const format = selectFormat.value;
      let filename = "cities_seed.json";
      let mime = "application/json";

      if (format.startsWith("sql")) {
        filename = "cities_seed.sql";
        mime = "application/sql";
      } else if (format === "csv") {
        filename = "cities_seed.csv";
        mime = "text/csv";
      }

      const blob = new Blob([codeText], { type: mime + ";charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      playSuccessSound();
      const rect = btnDownloadSeed.getBoundingClientRect();
      spawnParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 25, "var(--color-success)");
    });
  }

  // Helper to resolve city inputs
  function resolveCityInput(inputVal) {
    const cleaned = inputVal.trim().toLowerCase();
    if (!cleaned) return null;
    
    if (radixTrie.search(cleaned)) {
      return cleaned;
    }
    
    const suggestions = radixTrie.autocomplete(cleaned, 1);
    if (suggestions.length > 0) {
      return suggestions[0];
    }
    return null;
  }

  // Coordinates hasher
  function getCityCoords(cityName) {
    let hash = 0;
    for (let i = 0; i < cityName.length; i++) {
      hash = cityName.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);
    
    const lat = 8.4 + (hash % 280) / 10;
    const lng = 68.7 + ((hash >> 4) % 270) / 10;
    return { lat, lng };
  }

  // Geo-jurisdiction builder (District, State, PIN)
  function computeLogisticsFacts(cityName, coords, weight) {
    let hash = 0;
    for (let i = 0; i < cityName.length; i++) {
      hash = cityName.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    const STATES_LIST = [
      "Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "West Bengal",
      "Uttar Pradesh", "Gujarat", "Rajasthan", "Kerala", "Telangana",
      "Haryana", "Punjab", "Bihar", "Madhya Pradesh", "Andhra Pradesh",
      "Odisha", "Assam", "Jammu & Kashmir", "Goa", "Himachal Pradesh"
    ];
    const DISTRICTS_SUFFIX = ["District", "West District", "East District", "Central District", "Rural District"];
    
    const state = STATES_LIST[hash % STATES_LIST.length];
    const district = capitalizeWord(cityName) + " " + DISTRICTS_SUFFIX[(hash >> 2) % DISTRICTS_SUFFIX.length];

    let firstDigit = 8;
    if (["Delhi", "Haryana", "Punjab", "Jammu & Kashmir", "Himachal Pradesh"].includes(state)) firstDigit = 1;
    else if (["Uttar Pradesh"].includes(state)) firstDigit = 2;
    else if (["Gujarat", "Rajasthan", "Goa"].includes(state)) firstDigit = 3;
    else if (["Maharashtra", "Madhya Pradesh"].includes(state)) firstDigit = 4;
    else if (["Andhra Pradesh", "Telangana", "Karnataka"].includes(state)) firstDigit = 5;
    else if (["Tamil Nadu", "Kerala"].includes(state)) firstDigit = 6;
    else if (["West Bengal", "Odisha", "Assam"].includes(state)) firstDigit = 7;
    
    const zipCode = firstDigit.toString() + (10000 + (hash % 89999)).toString().slice(1);

    return {
      zipCode,
      state,
      district
    };
  }

  // Main code-generating engine for Tab 2 Exporter
  function generateDatabaseSeed() {
    const stateFilter = selectStateFilter.value;
    const patternFilter = inputNamePattern.value.trim().toLowerCase();
    const limit = parseInt(inputExportLimit.value) || 25;
    const format = selectFormat.value;

    const records = [];

    // 1. Manually selected cities are injected first
    selectedBasket.forEach(city => {
      const coords = getCityCoords(city);
      const facts = computeLogisticsFacts(city, coords, 0.5);
      
      // Still apply state filters to manual list if not ALL
      if (stateFilter !== "ALL" && facts.state !== stateFilter) return;
      if (patternFilter && !city.endsWith(patternFilter)) return;

      records.push({
        city: capitalizeWord(city),
        zip: facts.zipCode,
        state: facts.state,
        district: facts.district
      });
    });

    // 2. Scan global index up to limit
    for (let i = 0; i < CITIES_DATA.length; i++) {
      if (records.length >= limit) break;
      const city = CITIES_DATA[i];
      if (selectedBasket.includes(city)) continue; // skip duplicates
      
      const coords = getCityCoords(city);
      const facts = computeLogisticsFacts(city, coords, 0.5);

      if (stateFilter !== "ALL" && facts.state !== stateFilter) continue;
      if (patternFilter && !city.endsWith(patternFilter)) continue;

      records.push({
        city: capitalizeWord(city),
        zip: facts.zipCode,
        state: facts.state,
        district: facts.district
      });
    }

    // 3. Render format code string
    let codeStr = "";
    const escapeSql = str => str.replace(/'/g, "''");

    if (format === "json") {
      codeStr = JSON.stringify(records, null, 2);
    } else if (format === "sql_postgres") {
      let sql = `-- SJA Postgres Seed File\n-- Created at: ${new Date().toISOString()}\n\n`;
      sql += `CREATE TABLE IF NOT EXISTS indian_cities_directory (\n`;
      sql += `  id SERIAL PRIMARY KEY,\n`;
      sql += `  city_name VARCHAR(100) NOT NULL,\n`;
      sql += `  zip_code VARCHAR(10) NOT NULL,\n`;
      sql += `  state_name VARCHAR(100) NOT NULL,\n`;
      sql += `  district_name VARCHAR(100) NOT NULL\n`;
      sql += `);\n\n`;
      sql += `INSERT INTO indian_cities_directory (city_name, zip_code, state_name, district_name) VALUES`;
      
      const inserts = records.map(r => `\n  ('${escapeSql(r.city)}', '${r.zip}', '${escapeSql(r.state)}', '${escapeSql(r.district)}')`).join(",");
      codeStr = sql + (records.length > 0 ? inserts + ";" : "\n  -- No matching records to seed;");
    } else if (format === "sql_mysql") {
      let sql = `-- SJA MySQL Seed File\n-- Created at: ${new Date().toISOString()}\n\n`;
      sql += `CREATE TABLE IF NOT EXISTS \`indian_cities_directory\` (\n`;
      sql += `  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n`;
      sql += `  \`city_name\` VARCHAR(100) NOT NULL,\n`;
      sql += `  \`zip_code\` VARCHAR(10) NOT NULL,\n`;
      sql += `  \`state_name\` VARCHAR(100) NOT NULL,\n`;
      sql += `  \`district_name\` VARCHAR(100) NOT NULL\n`;
      sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;
      sql += `INSERT INTO \`indian_cities_directory\` (\`city_name\`, \`zip_code\`, \`state_name\`, \`district_name\`) VALUES`;
      
      const inserts = records.map(r => `\n  ('${escapeSql(r.city)}', '${r.zip}', '${escapeSql(r.state)}', '${escapeSql(r.district)}')`).join(",");
      codeStr = sql + (records.length > 0 ? inserts + ";" : "\n  -- No matching records to seed;");
    } else if (format === "csv") {
      let csv = "id,city_name,zip_code,state_name,district_name";
      const rows = records.map((r, idx) => `\n${idx+1},"${r.city}",${r.zip},"${r.state}","${r.district}"`).join("");
      codeStr = csv + rows;
    }

    // 4. Update code viewer DOM
    exportCodeBlock.textContent = codeStr;

    // 5. Update Statistics elements
    document.getElementById("logistics-cost").textContent = `${records.length} city record${records.length === 1 ? '' : 's'}`;
    
    const sizeKb = (codeStr.length / 1024).toFixed(2);
    document.getElementById("logistics-zip").textContent = `${sizeKb} KB`;
  }

  function capitalizeWord(word) {
    return word.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  // =====================================================================
  // TAB 3: GEOGUESS SPELLING GAME LOGIC (Inbuilt Game)
  // =====================================================================
  
  function setupGameScoreboard() {
    const savedScore = localStorage.getItem("sja_game_score");
    const savedStreak = localStorage.getItem("sja_game_streak");
    const savedBestStreak = localStorage.getItem("sja_game_best_streak");

    if (savedScore) gameScore = parseInt(savedScore);
    if (savedStreak) gameStreak = parseInt(savedStreak);
    if (savedBestStreak) gameBestStreak = parseInt(savedBestStreak);

    domGameScore.textContent = gameScore.toLocaleString();
    domGameStreak.textContent = gameStreak.toLocaleString();
    domGameBestStreak.textContent = gameBestStreak.toLocaleString();
  }

  function setupGameListeners() {
    // Autocomplete for Game Guesses (using unified autocomplete input logic!)
    gameGuessInput.addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (query.length > 0) {
        handleAutocompleteInput(
          gameGuessInput, 
          dropdownGame, 
          listGame, 
          gameSuggestionsMetrics, 
          query, 
          5, 
          (selected) => {
            checkAnswer();
          }
        );
      } else {
        dropdownGame.classList.remove("active");
      }
    });

    gameBtnSubmit.addEventListener("click", checkAnswer);
    gameGuessInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") checkAnswer();
    });

    gameBtnSkip.addEventListener("click", () => {
      appendGameLog(`Skipped: The answer was <strong>${capitalizeWord(gameCurrentCity)}</strong>.`, "var(--text-muted)");
      gameStreak = 0;
      updateGameDashboard();
      loadNewGameWord();
      playErrorSound();
    });

    gameBtnRevealClue.addEventListener("click", revealClue);
  }

  function loadNewGameWord() {
    let chosenCity = "";
    
    for (let attempts = 0; attempts < 1000; attempts++) {
      const city = CITIES_DATA[Math.floor(Math.random() * CITIES_DATA.length)];
      if (city.length >= 5 && city.length <= 9 && !city.includes(" ") && !city.includes("-")) {
        chosenCity = city;
        break;
      }
    }
    
    if (!chosenCity) chosenCity = "mumbai";

    gameCurrentCity = chosenCity;
    gameCluesRevealed = 0;
    
    const scrambled = scrambleString(chosenCity);
    gameScrambledWord.textContent = scrambled.toUpperCase().split("").join(" ");
    gameGuessInput.value = "";
    dropdownGame.classList.remove("active");
    
    gameClueText.innerHTML = `<i>- Clue 1: Word length is <strong>${chosenCity.length}</strong> characters. Starts with <strong>"${chosenCity[0].toUpperCase()}"</strong>.</i>`;
  }

  function scrambleString(str) {
    const arr = str.split("");
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    const scrambled = arr.join("");
    if (scrambled === str) return scrambleString(str);
    return scrambled;
  }

  function revealClue() {
    if (gameCluesRevealed >= 2) {
      playErrorSound();
      alert("No more clues available for this word!");
      return;
    }
    
    gameCluesRevealed++;
    playHoverSound();

    if (gameCluesRevealed === 1) {
      const char3 = gameCurrentCity[2] ? gameCurrentCity[2].toUpperCase() : "_";
      gameClueText.innerHTML += `<br>- Clue 2: The third letter is <strong>"${char3}"</strong>.`;
    } else if (gameCluesRevealed === 2) {
      const lastChar = gameCurrentCity[gameCurrentCity.length - 1].toUpperCase();
      gameClueText.innerHTML += `<br>- Clue 3: The word ends with <strong>"${lastChar}"</strong>.`;
    }
  }

  function checkAnswer() {
    const guess = gameGuessInput.value.trim().toLowerCase();
    
    if (!guess) {
      playErrorSound();
      alert("Please enter a guess!");
      return;
    }

    if (guess === gameCurrentCity) {
      const points = 10 - gameCluesRevealed * 2;
      gameScore += points;
      gameStreak++;
      
      if (gameStreak > gameBestStreak) {
        gameBestStreak = gameStreak;
      }

      appendGameLog(`Correct! <strong>${capitalizeWord(gameCurrentCity)}</strong> (+${points} pts)`, "var(--color-success)");
      updateGameDashboard();
      playSuccessSound();
      
      const rect = gameScrambledWord.getBoundingClientRect();
      spawnParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 35, "var(--color-accent)");
      
      loadNewGameWord();
    } else {
      playErrorSound();
      appendGameLog(`Incorrect: <strong>"${guess}"</strong>. Try again!`, "var(--color-purple)");
      gameStreak = 0;
      updateGameDashboard();
      
      const board = gameScrambledWord.parentElement;
      board.style.borderColor = "var(--color-purple)";
      setTimeout(() => board.style.borderColor = "rgba(168, 85, 247, 0.35)", 300);
    }
  }

  function updateGameDashboard() {
    domGameScore.textContent = gameScore.toLocaleString();
    domGameStreak.textContent = gameStreak.toLocaleString();
    domGameBestStreak.textContent = gameBestStreak.toLocaleString();

    localStorage.setItem("sja_game_score", gameScore);
    localStorage.setItem("sja_game_streak", gameStreak);
    localStorage.setItem("sja_game_best_streak", gameBestStreak);
  }

  function appendGameLog(message, colorClass = "var(--text-secondary)") {
    const item = document.createElement("div");
    item.style.color = colorClass;
    item.style.marginBottom = "0.25rem";
    item.innerHTML = `• ${message}`;
    gameLog.appendChild(item);
    gameLog.scrollTop = gameLog.scrollHeight;
  }

  // Fire initialization
  initializeApp();

  // =====================================================================
  // TAB 4: PATTERN SEARCH
  // =====================================================================
  let ptnCurrentMode = 'contains';
  let ptnCurrentMatches = [];

  function setupPatternSearch() {
    const ptnInput = document.getElementById('ptn-input');
    const ptnMinLen = document.getElementById('ptn-min-len');
    const ptnMaxLen = document.getElementById('ptn-max-len');
    const btnPtnSearch = document.getElementById('btn-ptn-search');
    const ptnStats = document.getElementById('ptn-stats');
    const ptnMatchCount = document.getElementById('ptn-match-count');
    const ptnSearchTime = document.getElementById('ptn-search-time');
    const ptnResultsList = document.getElementById('ptn-results-list');
    const ptnShowingLabel = document.getElementById('ptn-showing-label');
    const btnPtnExport = document.getElementById('btn-ptn-export');
    const modeBtns = document.querySelectorAll('.ptn-mode-btn');

    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        ptnCurrentMode = btn.dataset.mode;
      });
    });

    function runPatternSearch() {
      const query = ptnInput.value.trim().toLowerCase();
      const minLen = parseInt(ptnMinLen.value) || 1;
      const maxLen = parseInt(ptnMaxLen.value) || 100;

      const t0 = performance.now();
      ptnCurrentMatches = CITIES_DATA.filter(city => {
        const c = city.toLowerCase();
        if (c.length < minLen || c.length > maxLen) return false;
        if (!query) return true;
        switch (ptnCurrentMode) {
          case 'contains': return c.includes(query);
          case 'starts':   return c.startsWith(query);
          case 'ends':     return c.endsWith(query);
          case 'exact':    return c === query;
          default:         return c.includes(query);
        }
      });
      const t1 = performance.now();

      ptnStats.style.display = 'block';
      ptnMatchCount.textContent = ptnCurrentMatches.length.toLocaleString();
      ptnSearchTime.textContent = `${(t1 - t0).toFixed(2)} ms`;
      ptnShowingLabel.textContent = `Showing ${Math.min(ptnCurrentMatches.length, 500)} of ${ptnCurrentMatches.length} results`;

      ptnResultsList.innerHTML = '';
      const toShow = ptnCurrentMatches.slice(0, 500);
      if (toShow.length === 0) {
        ptnResultsList.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem;">No cities matched this pattern.</span>';
      } else {
        toShow.forEach(city => {
          const tag = document.createElement('span');
          tag.textContent = city;
          tag.style.cssText = 'background:rgba(6,182,212,0.12); border:1px solid rgba(6,182,212,0.3); border-radius:999px; padding:0.2rem 0.65rem; font-size:0.8rem; color:var(--color-accent); cursor:default; white-space:nowrap;';
          ptnResultsList.appendChild(tag);
        });
      }
      btnPtnExport.style.display = ptnCurrentMatches.length > 0 ? 'block' : 'none';
    }

    btnPtnSearch.addEventListener('click', runPatternSearch);
    ptnInput.addEventListener('keydown', e => { if (e.key === 'Enter') runPatternSearch(); });

    btnPtnExport.addEventListener('click', () => {
      const blob = new Blob([ptnCurrentMatches.join('\n')], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `indian_cities_${ptnCurrentMode}_${Date.now()}.txt`;
      a.click();
    });
  }
  setupPatternSearch();

  // =====================================================================
  // TAB 5: CITY ANALYTICS
  // =====================================================================
  let analyticsRendered = false;

  function renderAnalytics() {
    if (analyticsRendered) return;
    analyticsRendered = true;

    const cities = CITIES_DATA.map(c => c.toLowerCase());

    // --- Length Distribution ---
    const lenMap = {};
    let totalLen = 0;
    cities.forEach(c => {
      lenMap[c.length] = (lenMap[c.length] || 0) + 1;
      totalLen += c.length;
    });
    const avgLen = (totalLen / cities.length).toFixed(1);
    document.getElementById('analytics-avg-len').textContent = avgLen;

    const lenChart = document.getElementById('analytics-length-chart');
    const lenLabels = document.getElementById('analytics-length-labels');
    const lenKeys = Object.keys(lenMap).map(Number).sort((a, b) => a - b);
    const lenMax = Math.max(...Object.values(lenMap));
    lenChart.innerHTML = '';
    lenLabels.innerHTML = '';
    lenKeys.forEach(k => {
      const h = Math.round((lenMap[k] / lenMax) * 130);
      const bar = document.createElement('div');
      bar.title = `Length ${k}: ${lenMap[k]} cities`;
      bar.style.cssText = `flex:1; min-width:4px; height:${h}px; background:linear-gradient(to top, var(--color-accent), var(--color-primary)); border-radius:2px 2px 0 0; opacity:0.85; transition:opacity 0.2s; cursor:default;`;
      bar.onmouseover = () => bar.style.opacity = '1';
      bar.onmouseout = () => bar.style.opacity = '0.85';
      lenChart.appendChild(bar);

      const lbl = document.createElement('span');
      lbl.textContent = k;
      lbl.style.cssText = 'flex:1; text-align:center; min-width:4px; font-size:0.55rem; color:var(--text-muted);';
      lenLabels.appendChild(lbl);
    });

    // --- Letter Frequency ---
    const letterMap = {};
    cities.forEach(c => {
      const ch = c[0];
      if (ch && /[a-z]/.test(ch)) {
        letterMap[ch] = (letterMap[ch] || 0) + 1;
      }
    });
    const letterKeys = Object.keys(letterMap).sort();
    const letterMax = Math.max(...Object.values(letterMap));
    const topLetter = letterKeys.reduce((a, b) => (letterMap[a] || 0) >= (letterMap[b] || 0) ? a : b, letterKeys[0]);
    document.getElementById('analytics-top-letter').textContent = `"${topLetter.toUpperCase()}" (${letterMap[topLetter].toLocaleString()} cities)`;

    const letterChart = document.getElementById('analytics-letter-chart');
    const letterLabels = document.getElementById('analytics-letter-labels');
    letterChart.innerHTML = '';
    letterLabels.innerHTML = '';
    letterKeys.forEach(ch => {
      const h = Math.round((letterMap[ch] / letterMax) * 130);
      const bar = document.createElement('div');
      bar.title = `"${ch.toUpperCase()}": ${letterMap[ch]} cities`;
      bar.style.cssText = `flex:1; min-width:5px; height:${h}px; background:linear-gradient(to top, var(--color-purple), rgba(168,85,247,0.5)); border-radius:2px 2px 0 0; opacity:0.85; transition:opacity 0.2s; cursor:default;`;
      bar.onmouseover = () => bar.style.opacity = '1';
      bar.onmouseout = () => bar.style.opacity = '0.85';
      letterChart.appendChild(bar);

      const lbl = document.createElement('span');
      lbl.textContent = ch.toUpperCase();
      lbl.style.cssText = 'flex:1; text-align:center; min-width:5px; font-size:0.55rem; color:var(--text-muted);';
      letterLabels.appendChild(lbl);
    });

    // --- Top Suffixes ---
    const suffixLen = 3;
    const suffixMap = {};
    cities.forEach(c => {
      if (c.length >= suffixLen + 1) {
        const sfx = c.slice(-suffixLen);
        suffixMap[sfx] = (suffixMap[sfx] || 0) + 1;
      }
    });
    const topSuffixes = Object.entries(suffixMap).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const sfxMax = topSuffixes[0]?.[1] || 1;
    const sfxContainer = document.getElementById('analytics-suffixes');
    sfxContainer.innerHTML = '';
    topSuffixes.forEach(([sfx, cnt]) => {
      const pct = Math.round((cnt / sfxMax) * 100);
      sfxContainer.innerHTML += `
        <div style="font-size:0.82rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <span style="color:var(--text-primary); font-family:monospace;">-${sfx}</span>
            <span style="color:var(--text-muted);">${cnt.toLocaleString()} cities</span>
          </div>
          <div style="height:4px; background:rgba(255,255,255,0.05); border-radius:2px;">
            <div style="height:100%; width:${pct}%; background:linear-gradient(90deg, var(--color-success), rgba(16,185,129,0.4)); border-radius:2px;"></div>
          </div>
        </div>`;
    });

    // --- Top Prefixes ---
    const prefixLen = 3;
    const prefixMap = {};
    cities.forEach(c => {
      if (c.length >= prefixLen + 1) {
        const pfx = c.slice(0, prefixLen);
        prefixMap[pfx] = (prefixMap[pfx] || 0) + 1;
      }
    });
    const topPrefixes = Object.entries(prefixMap).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const pfxMax = topPrefixes[0]?.[1] || 1;
    const pfxContainer = document.getElementById('analytics-prefixes');
    pfxContainer.innerHTML = '';
    topPrefixes.forEach(([pfx, cnt]) => {
      const pct = Math.round((cnt / pfxMax) * 100);
      pfxContainer.innerHTML += `
        <div style="font-size:0.82rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <span style="color:var(--text-primary); font-family:monospace;">${pfx}-</span>
            <span style="color:var(--text-muted);">${cnt.toLocaleString()} cities</span>
          </div>
          <div style="height:4px; background:rgba(255,255,255,0.05); border-radius:2px;">
            <div style="height:100%; width:${pct}%; background:linear-gradient(90deg, var(--color-primary), rgba(59,130,246,0.4)); border-radius:2px;"></div>
          </div>
        </div>`;
    });
  }

  // =====================================================================
  // TAB 6: TEXT SCANNER
  // =====================================================================
  function setupTextScanner() {
    const scannerInput = document.getElementById('scanner-input');
    const btnScan = document.getElementById('btn-scan');
    const btnScanClear = document.getElementById('btn-scan-clear');
    const scannerStats = document.getElementById('scanner-stats');
    const scanWordCount = document.getElementById('scan-word-count');
    const scanCityCount = document.getElementById('scan-city-count');
    const scanTime = document.getElementById('scan-time');
    const scannerOutput = document.getElementById('scanner-output');
    const scannerCitiesList = document.getElementById('scanner-cities-list');
    const btnScanCopy = document.getElementById('btn-scan-copy');

    // Build a fast lookup Set from CITIES_DATA
    const citySet = new Set(CITIES_DATA.map(c => c.toLowerCase()));

    btnScan.addEventListener('click', () => {
      const text = scannerInput.value;
      if (!text.trim()) {
        scannerOutput.innerHTML = '<span style="color:var(--text-muted);">Please paste some text first.</span>';
        return;
      }

      const t0 = performance.now();

      // Tokenize: split on non-alpha characters
      const tokens = text.split(/([^a-zA-Z]+)/);
      let wordCount = 0;
      const foundCities = new Set();

      // First pass: find cities (try 2-word combos too)
      const wordTokens = text.match(/[a-zA-Z]+/g) || [];
      wordCount = wordTokens.length;

      // Single word match
      wordTokens.forEach(w => {
        if (citySet.has(w.toLowerCase())) foundCities.add(w.toLowerCase());
      });
      // Two-word match (e.g. "New Delhi", "Port Blair")
      for (let i = 0; i < wordTokens.length - 1; i++) {
        const combo = (wordTokens[i] + ' ' + wordTokens[i + 1]).toLowerCase();
        if (citySet.has(combo)) foundCities.add(combo);
      }

      const t1 = performance.now();

      scannerStats.style.display = 'block';
      scanWordCount.textContent = wordCount.toLocaleString();
      scanCityCount.textContent = foundCities.size.toLocaleString();
      scanTime.textContent = `${(t1 - t0).toFixed(2)} ms`;

      // Highlighted output: wrap city matches in <mark>
      let highlighted = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const sortedCities = [...foundCities].sort((a, b) => b.length - a.length); // longest first
      sortedCities.forEach(city => {
        const escaped = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`\\b${escaped}\\b`, 'gi');
        highlighted = highlighted.replace(re, match =>
          `<mark style="background:rgba(6,182,212,0.3); color:var(--color-accent); border-radius:3px; padding:0 2px;">${match}</mark>`
        );
      });
      scannerOutput.innerHTML = highlighted || '<span style="color:var(--text-muted);">No text provided.</span>';

      // City list tags
      scannerCitiesList.innerHTML = '';
      if (foundCities.size === 0) {
        scannerCitiesList.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem;">No Indian cities detected in this text.</span>';
        btnScanCopy.style.display = 'none';
      } else {
        [...foundCities].sort().forEach(city => {
          const tag = document.createElement('span');
          tag.textContent = city.replace(/\b\w/g, c => c.toUpperCase());
          tag.style.cssText = 'background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.35); border-radius:999px; padding:0.2rem 0.65rem; font-size:0.8rem; color:var(--color-success); white-space:nowrap;';
          scannerCitiesList.appendChild(tag);
        });
        btnScanCopy.style.display = 'block';
      }
    });

    btnScanClear.addEventListener('click', () => {
      scannerInput.value = '';
      scannerOutput.innerHTML = '<span style="color:var(--text-muted);">Highlighted text will appear here after scanning...</span>';
      scannerCitiesList.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem;">No cities detected yet.</span>';
      scannerStats.style.display = 'none';
      btnScanCopy.style.display = 'none';
    });

    btnScanCopy.addEventListener('click', () => {
      const cityTags = scannerCitiesList.querySelectorAll('span');
      const cityText = [...cityTags].map(t => t.textContent).join(', ');
      navigator.clipboard.writeText(cityText).then(() => {
        btnScanCopy.textContent = '✅ Copied!';
        setTimeout(() => { btnScanCopy.textContent = '📋 Copy City List'; }, 2000);
      });
    });
  }
  setupTextScanner();

  // =====================================================================
  // TAB 7: GEOGRAPHY & TRAVEL HUB
  // =====================================================================
  let quizScore = 0;
  let quizStreak = 0;
  let quizCurrentAnswer = '';
  let quizInitialized = false;

  const STATES_LIST = [
    "Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "West Bengal",
    "Uttar Pradesh", "Gujarat", "Rajasthan", "Kerala", "Telangana",
    "Haryana", "Punjab", "Bihar", "Madhya Pradesh", "Andhra Pradesh",
    "Odisha", "Assam", "Jammu & Kashmir", "Goa", "Himachal Pradesh"
  ];

  function initQuiz() {
    if (quizInitialized) return;
    quizInitialized = true;
    
    const quizDiff = document.getElementById('quiz-diff');
    const btnQuizNext = document.getElementById('btn-quiz-next');
    
    quizDiff.addEventListener('change', () => {
      quizStreak = 0;
      document.getElementById('quiz-streak').textContent = '0';
      generateQuizQuestion();
    });

    btnQuizNext.addEventListener('click', () => {
      generateQuizQuestion();
      btnQuizNext.style.display = 'none';
      document.getElementById('quiz-feedback').textContent = '';
    });

    generateQuizQuestion();
    setupRoutePlanner();
  }

  function generateQuizQuestion() {
    const diff = document.getElementById('quiz-diff').value;
    const questionText = document.getElementById('quiz-question');
    const optionsContainer = document.getElementById('quiz-options');
    const feedback = document.getElementById('quiz-feedback');
    feedback.textContent = '';
    optionsContainer.innerHTML = '';

    // Pick a random city
    const randomCity = CITIES_DATA[Math.floor(Math.random() * CITIES_DATA.length)];
    const coords = getCityCoords(randomCity);
    const facts = computeLogisticsFacts(randomCity, coords, 0.5);

    let question = '';
    let options = [];
    let correct = '';

    if (diff === 'easy') {
      question = `Which state is the city <strong>"${capitalizeWord(randomCity)}"</strong> located in?`;
      correct = facts.state;
      options = [correct];
      while (options.length < 4) {
        const rState = STATES_LIST[Math.floor(Math.random() * STATES_LIST.length)];
        if (!options.includes(rState)) options.push(rState);
      }
    } else if (diff === 'medium') {
      question = `Which region/district code belongs to the city <strong>"${capitalizeWord(randomCity)}"</strong>?`;
      correct = facts.district;
      options = [correct];
      while (options.length < 4) {
        const dummyCity = CITIES_DATA[Math.floor(Math.random() * CITIES_DATA.length)];
        const dCoords = getCityCoords(dummyCity);
        const dummyDist = computeLogisticsFacts(dummyCity, dCoords, 0.5).district;
        if (!options.includes(dummyDist)) options.push(dummyDist);
      }
    } else {
      // Hard: pin code starting digit
      const pinStart = facts.zipCode[0];
      question = `What is the starting digit of the PIN Code for the city <strong>"${capitalizeWord(randomCity)}"</strong> (located in ${facts.state})?`;
      correct = pinStart;
      options = [correct];
      while (options.length < 4) {
        const digit = Math.floor(Math.random() * 8 + 1).toString();
        if (!options.includes(digit)) options.push(digit);
      }
    }

    // Shuffle options
    options.sort(() => Math.random() - 0.5);
    quizCurrentAnswer = correct;

    questionText.innerHTML = question;

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.innerHTML = opt;
      btn.style.cssText = 'width:100%; text-align:left; background:rgba(255,255,255,0.03); border:2px solid var(--card-border); color:var(--text-primary); border-radius:var(--radius-sm); padding:0.65rem 1rem; font-size:0.9rem; cursor:pointer; font-family:inherit; font-weight:500; transition:all 0.15s ease;';
      
      btn.addEventListener('mouseover', () => {
        if (!btn.disabled) btn.style.borderColor = 'var(--color-primary)';
      });
      btn.addEventListener('mouseout', () => {
        if (!btn.disabled) btn.style.borderColor = 'var(--card-border)';
      });

      btn.addEventListener('click', () => {
        // Disable all buttons after select
        const allBtns = optionsContainer.querySelectorAll('button');
        allBtns.forEach(b => b.disabled = true);

        if (opt === quizCurrentAnswer) {
          btn.style.borderColor = 'var(--color-success)';
          btn.style.background = 'rgba(16,185,129,0.1)';
          feedback.textContent = '🎉 Correct Answer! Well done.';
          feedback.style.color = 'var(--color-success)';
          quizScore += 10;
          quizStreak += 1;
          playSuccessSound();
        } else {
          btn.style.borderColor = 'var(--color-purple)';
          btn.style.background = 'rgba(168,85,247,0.1)';
          feedback.textContent = `❌ Incorrect. The correct answer was "${quizCurrentAnswer}".`;
          feedback.style.color = 'var(--color-purple)';
          quizStreak = 0;
          playErrorSound();

          // Highlight correct answer button
          allBtns.forEach(b => {
            if (b.innerHTML === quizCurrentAnswer) {
              b.style.borderColor = 'var(--color-success)';
            }
          });
        }

        document.getElementById('quiz-score').textContent = quizScore.toLocaleString();
        document.getElementById('quiz-streak').textContent = quizStreak.toLocaleString();
        document.getElementById('btn-quiz-next').style.display = 'block';
      });

      optionsContainer.appendChild(btn);
    });
  }

  // --- Route Planner ---
  function setupRoutePlanner() {
    const rStart = document.getElementById('route-start');
    const rEnd = document.getElementById('route-end');
    const listStart = document.getElementById('list-route-start');
    const listEnd = document.getElementById('list-route-end');
    const dropStart = document.getElementById('dropdown-route-start');
    const dropEnd = document.getElementById('dropdown-route-end');
    const btnGen = document.getElementById('btn-generate-route');

    rStart.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (q.length > 0) {
        dropStart.style.display = 'block';
        handleAutocompleteInput(rStart, dropStart, listStart, null, q, 5, (selected) => {
          rStart.value = capitalizeWord(selected);
          dropStart.style.display = 'none';
        });
      } else {
        dropStart.style.display = 'none';
      }
    });

    rEnd.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (q.length > 0) {
        dropEnd.style.display = 'block';
        handleAutocompleteInput(rEnd, dropEnd, listEnd, null, q, 5, (selected) => {
          rEnd.value = capitalizeWord(selected);
          dropEnd.style.display = 'none';
        });
      } else {
        dropEnd.style.display = 'none';
      }
    });

    btnGen.addEventListener('click', () => {
      const startCity = rStart.value.trim().toLowerCase();
      const endCity = rEnd.value.trim().toLowerCase();

      if (!startCity || !endCity) {
        alert("Please enter both a start city and a destination city.");
        return;
      }

      // Compute details
      const c1 = getCityCoords(startCity);
      const c2 = getCityCoords(endCity);
      const f1 = computeLogisticsFacts(startCity, c1, 0.5);
      const f2 = computeLogisticsFacts(endCity, c2, 0.5);

      // Distance
      const dist = haversineDistance(c1, c2);

      // Estimate timings
      const driveHrs = dist / 65;
      const trainHrs = dist / 75;
      const flightHrs = dist / 800 + 0.4; // constant overhead for take off

      document.getElementById('travel-dist').textContent = `${Math.round(dist).toLocaleString()} km`;
      document.getElementById('travel-drive').textContent = driveHrs < 1 ? `${Math.round(driveHrs * 60)} min` : `${Math.floor(driveHrs)}h ${Math.round((driveHrs % 1) * 60)}m`;
      document.getElementById('travel-flight').textContent = `${Math.floor(flightHrs)}h ${Math.round((flightHrs % 1) * 60)}m`;

      // Log text description
      const log = `🎒 <strong>Journey Outline:</strong> Depart from <strong>${capitalizeWord(startCity)}</strong> (${f1.state}, PIN: ${f1.zipCode}). Heading through <strong>${f1.district}</strong>. Traversing cross-country coordinates to reach <strong>${capitalizeWord(endCity)}</strong> (${f2.state}, PIN: ${f2.zipCode}, regional district: <strong>${f2.district}</strong>). Total air displacement is ${Math.round(dist)} km.`;
      document.getElementById('travel-diary').innerHTML = log;

      // Draw SVG Route
      drawRouteSvg(c1, c2, capitalizeWord(startCity), capitalizeWord(endCity));

      document.getElementById('travel-output').style.display = 'flex';
      playTone(587.33, "sine", 0.2, 0.15); // D5
    });
  }

  function haversineDistance(c1, c2) {
    const R = 6371; // Earth radius in km
    const dLat = (c2.lat - c1.lat) * Math.PI / 180;
    const dLon = (c2.lng - c1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(c1.lat * Math.PI / 180) * Math.cos(c2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  function drawRouteSvg(c1, c2, sName, eName) {
    const svg = document.getElementById('travel-svg');
    svg.innerHTML = '';

    const width = svg.clientWidth || 300;
    const height = 150;

    // Define coords inside SVG coordinate space with margins
    const margin = 35;
    const x1 = margin;
    const y1 = height - margin - 20;
    const x2 = width - margin;
    const y2 = margin + 15;

    // Control point for a smooth bezier curve
    const cx = (x1 + x2) / 2;
    const cy = Math.min(y1, y2) - 40;

    // Create Path
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "rgba(59, 130, 246, 0.4)");
    path.setAttribute("stroke-width", "3");
    path.setAttribute("stroke-dasharray", "5,5");
    svg.appendChild(path);

    // Glowing dot moving along path
    const animatedDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    animatedDot.setAttribute("r", "5");
    animatedDot.setAttribute("fill", "var(--color-accent)");
    animatedDot.setAttribute("filter", "drop-shadow(0 0 8px var(--color-accent))");
    
    const animateMotion = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
    animateMotion.setAttribute("path", d);
    animateMotion.setAttribute("dur", "3s");
    animateMotion.setAttribute("repeatCount", "indefinite");
    animatedDot.appendChild(animateMotion);
    svg.appendChild(animatedDot);

    // Node 1 (Start)
    const n1 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    n1.setAttribute("cx", x1);
    n1.setAttribute("cy", y1);
    n1.setAttribute("r", "6");
    n1.setAttribute("fill", "var(--color-primary)");
    svg.appendChild(n1);

    // Node 2 (End)
    const n2 = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    n2.setAttribute("cx", x2);
    n2.setAttribute("cy", y2);
    n2.setAttribute("r", "6");
    n2.setAttribute("fill", "var(--color-success)");
    svg.appendChild(n2);

    // Start text
    const t1 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t1.setAttribute("x", x1);
    t1.setAttribute("y", y1 + 18);
    t1.setAttribute("fill", "var(--text-secondary)");
    t1.setAttribute("font-size", "11px");
    t1.setAttribute("text-anchor", "middle");
    t1.textContent = sName;
    svg.appendChild(t1);

    // End text
    const t2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t2.setAttribute("x", x2);
    t2.setAttribute("y", y2 - 12);
    t2.setAttribute("fill", "var(--text-secondary)");
    t2.setAttribute("font-size", "11px");
    t2.setAttribute("text-anchor", "middle");
    t2.textContent = eName;
    svg.appendChild(t2);
  }

  // =====================================================================
  // THEME SWITCHER LOGIC
  // =====================================================================
  const THEMES = ["theme-indigo", "theme-saffron", "theme-forest", "theme-cyber"];
  const THEME_NAMES = ["Midnight Indigo", "Saffron Sunset", "Emerald Forest", "Cyberpunk Neon"];
  let currentTheme = localStorage.getItem("bharatpulse-theme") || "theme-indigo";

  function applyTheme(themeId) {
    THEMES.forEach(t => document.body.classList.remove(t));
    document.body.classList.add(themeId);
    currentTheme = themeId;
    localStorage.setItem("bharatpulse-theme", themeId);
    
    if (themeToggleBtn) {
      const nameIdx = THEMES.indexOf(themeId);
      themeToggleBtn.innerHTML = `<span>🎨</span> Theme: ${THEME_NAMES[nameIdx]}`;
    }
  }

  function cycleTheme() {
    initAudio();
    const currentIdx = THEMES.indexOf(currentTheme);
    const nextIdx = (currentIdx + 1) % THEMES.length;
    applyTheme(THEMES[nextIdx]);
    playTone(600, "sine", 0.08, 0.1);
  }

  // Apply default or saved theme on boot
  applyTheme(currentTheme);

  // =====================================================================
  // STATE TOURISM SHOWCASE & DIRECTORY DATABASE & LOGIC
  // =====================================================================
  let tourismInitialized = false;
  let activeState = "";

  const TOURISM_DATABASE = {
    "Maharashtra": {
      capital: "Mumbai",
      language: "Marathi",
      climate: "Tropical Monsoon (Best: Oct-Mar)",
      desc: "Land of historic caves, massive forts, beaches, and the bustling financial capital of India.",
      attractions: [
        { name: "Gateway of India", icon: "🏛️", desc: "A spectacular 20th-century arch monument overlooking the Arabian Sea in Mumbai." },
        { name: "Ajanta & Ellora Caves", icon: "🗿", desc: "UNESCO World Heritage site featuring rock-cut Buddhist, Hindu, and Jain cave monuments." },
        { name: "Western Ghats & Lonavala", icon: "⛰️", desc: "Lush green hill stations famous for deep valleys, gorgeous waterfalls, and historic forts." }
      ],
      foods: [
        { name: "Vada Pav", desc: "The iconic street food consisting of a spicy potato dumpling inside a bread bun." },
        { name: "Misal Pav", desc: "A spicy curry made from sprouted moth beans, topped with farsan and served with pav." },
        { name: "Puran Poli", desc: "A sweet flatbread stuffed with a sweet lentil filling made of chana dal and jaggery." }
      ]
    },
    "Delhi": {
      capital: "New Delhi",
      language: "Hindi, Punjabi, English",
      climate: "Semi-arid (Best: Oct-Mar)",
      desc: "India's capital territory, a rich historical hub blending Mughal monuments with modern avenues.",
      attractions: [
        { name: "Red Fort (Lal Qila)", icon: "🏰", desc: "The historic octagonal Mughal fort built in red sandstone by Emperor Shah Jahan." },
        { name: "Qutub Minar", icon: "🗼", desc: "A towering 73-meter victory tower and minaret constructed in the 12th century." },
        { name: "India Gate", icon: "🎖️", desc: "A majestic war memorial archway commemorating soldiers who fell in the World War." }
      ],
      foods: [
        { name: "Chole Bhature", desc: "Spicy chickpea curry paired with giant fluffy fried leavened bread." },
        { name: "Butter Chicken", desc: "Succulent tandoori chicken simmered in a rich, creamy, tomato-butter gravy." },
        { name: "Paranthas", desc: "Crispy, shallow-fried flatbreads stuffed with potatoes, paneer, or radishes." }
      ]
    },
    "Karnataka": {
      capital: "Bengaluru",
      language: "Kannada",
      climate: "Tropical Wet & Dry (Best: Oct-Mar)",
      desc: "India's high-tech hub, offering a stunning mix of royal palaces, ancient empires, and wild forests.",
      attractions: [
        { name: "Mysore Palace", icon: "🕌", desc: "A breathtaking royal palace famous for its Indo-Saracenic architecture and grand heritage." },
        { name: "Hampi Ruins", icon: "🏛️", desc: "The mesmerizing UNESCO World Heritage site showcasing the capital of the Vijayanagara Empire." },
        { name: "Coorg Hills", icon: "☕", desc: "A scenic coffee country known as the 'Scotland of India' with mist-covered hills." }
      ],
      foods: [
        { name: "Bisi Bele Bath", desc: "A delicious, spicy hot lentil rice dish cooked with vegetables and tamarind." },
        { name: "Mysore Pak", desc: "A rich, melt-in-the-mouth sweet made of generous amounts of ghee, sugar, and gram flour." },
        { name: "Idli & Vada", desc: "Steamed rice cakes and crispy lentil donuts served with coconut chutney and sambar." }
      ]
    },
    "Tamil Nadu": {
      capital: "Chennai",
      language: "Tamil",
      climate: "Tropical Wet & Dry (Best: Nov-Feb)",
      desc: "Famous for its ancient Dravidian temples, rich classical music/dance, and beautiful coastline.",
      attractions: [
        { name: "Brihadeeswarar Temple", icon: "🛕", desc: "A majestic Chola temple in Thanjavur, famous for its grand vimana tower made of granite." },
        { name: "Mahabalipuram Shore", icon: "🏖️", desc: "UNESCO-listed 7th-century rock-cut monuments and temples along the Coromandel Coast." },
        { name: "Ooty Gardens", icon: "🌲", desc: "A scenic hill station nestled in the Nilgiri Hills, famous for tea gardens and toy train." }
      ],
      foods: [
        { name: "Masala Dosa", desc: "A thin, crispy fermented rice crepe stuffed with spiced mashed potatoes." },
        { name: "Filter Coffee", desc: "A strong, frothy traditional chicory-blended brew served in a brass tumbler." },
        { name: "Idiyappam & Kurma", desc: "Steamed string hoppers served with a flavorful spiced vegetable coconut gravy." }
      ]
    },
    "West Bengal": {
      capital: "Kolkata",
      language: "Bengali",
      climate: "Sub-tropical Monsoon (Best: Oct-Mar)",
      desc: "The cultural heartland of India, famous for literature, colonial architecture, and sweet delicacies.",
      attractions: [
        { name: "Victoria Memorial", icon: "🏛️", desc: "A magnificent white marble palace built in memory of Queen Victoria, set in lush gardens." },
        { name: "Sundarbans Park", icon: "🐅", desc: "The world's largest mangrove forest, home to the elusive Royal Bengal Tiger." },
        { name: "Darjeeling Hills", icon: "⛰️", desc: "A beautiful Himalayan town famous for premium tea plantations and views of Mount Kanchenjunga." }
      ],
      foods: [
        { name: "Kosha Mangsho", desc: "A rich, slow-cooked spicy mutton curry full of deep caramelized onion flavors." },
        { name: "Roshogolla", desc: "Soft, spongy cottage-cheese balls soaked in sweet light sugar syrup." },
        { name: "Bengali Fish Curry", desc: "A light, aromatic mustard-oil based fish stew seasoned with panch phoron spices." }
      ]
    },
    "Uttar Pradesh": {
      capital: "Agra (Heritage) / Lucknow",
      language: "Hindi, Urdu",
      climate: "Humid Sub-tropical (Best: Oct-Mar)",
      desc: "The spiritual and historical heartland, housing the iconic Taj Mahal and sacred ancient towns.",
      attractions: [
        { name: "Taj Mahal", icon: "🕌", desc: "The ultimate monument to love, a stunning white marble mausoleum built by Shah Jahan in Agra." },
        { name: "Varanasi Ghats", icon: "🛕", desc: "One of the oldest continuously inhabited cities in the world, sacred for Ganga Aarti rituals." },
        { name: "Bara Imambara", icon: "🏛️", desc: "A grand historical shrine in Lucknow famous for its incredible pillarless arched hall." }
      ],
      foods: [
        { name: "Tunday Kababi", desc: "Melt-in-the-mouth minced buffalo meat kebabs flavored with over 150 spices." },
        { name: "Petha", desc: "A translucent soft candy made from ash gourd, originating from the city of Agra." },
        { name: "Kachori Sabzi", desc: "Flaky deep-fried breads stuffed with lentils, served with spicy potato curry." }
      ]
    },
    "Gujarat": {
      capital: "Gandhinagar",
      language: "Gujarati",
      climate: "Semi-arid (Best: Oct-Mar)",
      desc: "Land of vibrant festivals, historic stepwells, the Gir lions, and delicious vegetarian platters.",
      attractions: [
        { name: "Statue of Unity", icon: "🗽", desc: "The world's tallest statue (182 meters) depicting Sardar Vallabhbhai Patel by the Narmada River." },
        { name: "Rann of Kutch", icon: "⛺", desc: "A vast white salt desert that comes alive with music, crafts, and tents during Rann Utsav." },
        { name: "Gir National Park", icon: "🦁", desc: "The sole sanctuary in the world sheltering the majestic Asiatic Lion in the wild." }
      ],
      foods: [
        { name: "Dhokla", desc: "A soft, spongy, fermented savory cake made of chickpea flour, tempered with mustard seeds." },
        { name: "Theple", desc: "Thin, nutritious flatbreads spiced with fresh fenugreek leaves (methi) and yogurt." },
        { name: "Khandvi", desc: "Tempting yellow rolls made of gram flour and buttermilk, garnished with coconut." }
      ]
    },
    "Rajasthan": {
      capital: "Jaipur",
      language: "Hindi, Rajasthani",
      climate: "Arid Desert (Best: Oct-Mar)",
      desc: "The land of kings, royal forts, shimmering desert sands, and majestic palaces.",
      attractions: [
        { name: "Amber Fort", icon: "🏰", desc: "A grand hilltop fortress in Jaipur blending Hindu artistic elements with red sandstone architecture." },
        { name: "Hawa Mahal", icon: "🏛️", desc: "The iconic 'Palace of Winds' featuring a stunning honeycomb facade of 953 small windows." },
        { name: "Thar Desert Dunes", icon: "🐪", desc: "Golden sand dunes of Jaisalmer, famous for camel safaris and folk campfire nights." }
      ],
      foods: [
        { name: "Dal Baati Churma", desc: "Spiced baked wheat balls (baati) served with lentil curry (dal) and sweet crumbled wheat (churma)." },
        { name: "Laal Maas", desc: "A fiery-hot, garlic-infused Rajasthani mutton curry cooked in pure ghee and red chilies." },
        { name: "Gatte ki Sabzi", desc: "Spiced gram flour dumplings simmered in a rich, tangy yogurt-based gravy." }
      ]
    },
    "Kerala": {
      capital: "Thiruvananthapuram",
      language: "Malayalam",
      climate: "Tropical Wet (Best: Sep-Mar)",
      desc: "Known as 'God's Own Country', offering serene backwaters, palm-lined beaches, and Ayurveda.",
      attractions: [
        { name: "Alappuzha Backwaters", icon: "🛶", desc: "A labyrinth of canals and lakes dotted with traditional thatched houseboats." },
        { name: "Munnar Tea Gardens", icon: "⛰️", desc: "Lush green hills and tea plantations situated at the confluence of three mountain streams." },
        { name: "Athirappilly Falls", icon: "🌊", desc: "A spectacular 80-foot waterfall nicknamed the 'Niagara of India', surrounded by forests." }
      ],
      foods: [
        { name: "Appam with Stew", desc: "Lacy fermented rice pancakes with soft centers, served with aromatic coconut-milk veg stew." },
        { name: "Kerala Parotta & Beef", desc: "Layered, flaky flatbread paired with spiced, slow-roasted dry beef fry." },
        { name: "Karimeen Pollichathu", desc: "Pearl spot fish marinated in rich spices, wrapped in banana leaf and pan-fried." }
      ]
    },
    "Telangana": {
      capital: "Hyderabad",
      language: "Telugu, Urdu",
      climate: "Semi-arid (Best: Oct-Mar)",
      desc: "A rich mix of ancient Deccan sultanates, magnificent structures, and a thriving IT sector.",
      attractions: [
        { name: "Charminar", icon: "🕌", desc: "A historic 16th-century mosque and monument featuring four grand arches and minarets in Hyderabad." },
        { name: "Golconda Fort", icon: "🏰", desc: "A massive medieval fortress renowned for its acoustic engineering and diamond mines history." },
        { name: "Ramappa Temple", icon: "🛕", desc: "UNESCO World Heritage Kakatiya-era temple celebrated for its intricate carvings and floating bricks." }
      ],
      foods: [
        { name: "Hyderabadi Biryani", desc: "Fragrant basmati rice and marinated meat slow-cooked on 'dum' with spices and saffron." },
        { name: "Double ka Meetha", desc: "A luscious bread pudding dessert soaked in sugar syrup, milk, and cardamom." },
        { name: "Mirchi ka Salan", desc: "A tangy, spicy gravy made with green chilies, sesame seeds, and peanuts, served with biryani." }
      ]
    },
    "Haryana": {
      capital: "Chandigarh",
      language: "Haryanvi, Hindi",
      climate: "Semi-arid (Best: Oct-Mar)",
      desc: "A historic land hosting Mahabharata sites alongside cutting-edge smart cities like Gurugram.",
      attractions: [
        { name: "Kingdom of Dreams", icon: "🎭", desc: "India's first live entertainment, theatre, and leisure destination in Gurugram." },
        { name: "Sultanpur Sanctuary", icon: "🦆", desc: "A popular national park attracting hundreds of migratory bird species every winter." },
        { name: "Kurukshetra Tanks", icon: "🛕", desc: "The ancient holy land of the Mahabharata war, featuring large sacred water reservoirs." }
      ],
      foods: [
        { name: "Bajra Khichri", desc: "A warm, healthy porridge made of crushed pearl millet, served with ghee and lassi." },
        { name: "Singri ki Sabzi", desc: "A dry preparation of wild desert beans stir-fried with mustard oil and dry spices." },
        { name: "Besan Pinni", desc: "Nutritious sweet round balls made of roasted chickpea flour, ghee, and chopped nuts." }
      ]
    },
    "Punjab": {
      capital: "Amritsar (Spiritual) / Chandigarh",
      language: "Punjabi",
      climate: "Semi-arid (Best: Oct-Mar)",
      desc: "The land of five rivers, vibrant Bhangra beats, expansive wheat fields, and golden spirituality.",
      attractions: [
        { name: "The Golden Temple", icon: "🕌", desc: "The holiest Sikh shrine in Amritsar, a breathtaking gilded temple reflecting in a sacred pool." },
        { name: "Wagah Border Ceremony", icon: "🎖️", desc: "A thrilling daily military practice and beating retreat ceremony on the India-Pakistan border." },
        { name: "Rock Garden", icon: "🗿", desc: "A unique sculpture garden in Chandigarh created entirely from recycled industrial waste." }
      ],
      foods: [
        { name: "Sarson ka Saag & Makki di Roti", desc: "Spiced mustard greens curry served with golden, shallow-fried cornbread." },
        { name: "Amritsari Kulcha", desc: "Crispy, layered flatbread stuffed with spiced potatoes, baked in a clay tandoor." },
        { name: "Lassi", desc: "A tall glass of thick, sweet, yogurt-based drink topped with a thick dollop of cream." }
      ]
    },
    "Bihar": {
      capital: "Patna",
      language: "Hindi, Maithili, Bhojpuri",
      climate: "Humid Sub-tropical (Best: Oct-Mar)",
      desc: "The cradle of ancient empires, Buddhism, and home to Nalanda, the world's oldest university.",
      attractions: [
        { name: "Mahabodhi Temple", icon: "🛕", desc: "UNESCO site in Bodh Gaya housing the sacred Bodhi Tree where Lord Buddha attained enlightenment." },
        { name: "Nalanda Ruins", icon: "🏛️", desc: "The archaeological remains of the world-renowned 5th-century Buddhist monastic university." },
        { name: "Sher Shah Suri Tomb", icon: "🕌", desc: "A spectacular red sandstone mausoleum built in the middle of an artificial lake in Sasaram." }
      ],
      foods: [
        { name: "Litti Chokha", desc: "Baked wheat balls stuffed with spiced roasted gram flour (sattu), eaten with mashed eggplant." },
        { name: "Thekua", desc: "A crispy, deep-fried sweet cookie made of whole wheat flour, jaggery, and dry coconut." },
        { name: "Sattu Paratha", desc: "Nutritious flatbread stuffed with spiced roasted gram flour, onions, and lemon juice." }
      ]
    },
    "Madhya Pradesh": {
      capital: "Bhopal",
      language: "Hindi",
      climate: "Sub-tropical Dry (Best: Oct-Mar)",
      desc: "The heart of India, rich in national tiger reserves, medieval temples, and pre-historic rock shelters.",
      attractions: [
        { name: "Khajuraho Temples", icon: "🛕", desc: "UNESCO-listed temples celebrated for their intricate, expressive medieval carvings." },
        { name: "Sanchi Stupa", icon: "🕌", desc: "One of the oldest stone structures in India, a magnificent Buddhist dome built by Emperor Ashoka." },
        { name: "Kanha Tiger Reserve", icon: "🐅", desc: "A sprawling national park that inspired Rudyard Kipling's famous 'Jungle Book'." }
      ],
      foods: [
        { name: "Poha Jalebi", desc: "Spiced flattened rice topped with sev, paired with hot, crispy, syrup-filled pretzels." },
        { name: "Bhutte ka Kees", desc: "A savory street snack made of grated corn cooked with milk, ghee, and mustard seeds." },
        { name: "Mawa Bati", desc: "A rich sweet similar to gulab jamun, stuffed with dry fruits and mawa." }
      ]
    },
    "Andhra Pradesh": {
      capital: "Amaravati",
      language: "Telugu",
      climate: "Tropical Wet & Dry (Best: Oct-Mar)",
      desc: "Land of sacred hill temples, a long coastline, and rich Carnatic musical heritage.",
      attractions: [
        { name: "Tirumala Venkateswara Temple", icon: "🛕", desc: "A world-famous hilltop temple in Tirupati, attracting millions of spiritual pilgrims." },
        { name: "Araku Valley", icon: "⛰️", desc: "A scenic, misty hill station in the Eastern Ghats, famous for coffee plantations." },
        { name: "Belum Caves", icon: "🕳️", desc: "The second-longest cave system in the Indian subcontinent, renowned for stalactites." }
      ],
      foods: [
        { name: "Gongura Pachadi", desc: "A fiery-tangy traditional chutney made from fresh sorrel leaves and dry chilies." },
        { name: "Pootharekulu", desc: "A wafer-thin sweet 'paper sweet' roll made of rice starch, stuffed with sugar/jaggery." },
        { name: "Pesarattu Dosa", desc: "A nutritious, savory crepe made from whole green gram batter, served with ginger chutney." }
      ]
    },
    "Odisha": {
      capital: "Bhubaneswar",
      language: "Odia",
      climate: "Tropical Wet & Dry (Best: Oct-Mar)",
      desc: "Land of majestic temples, serene lakes, pristine beaches, and classical Odissi dance.",
      attractions: [
        { name: "Konark Sun Temple", icon: "🛕", desc: "A breathtaking Chariot-shaped Chola temple built in the 13th century, dedicated to the Sun God." },
        { name: "Jagannath Temple (Puri)", icon: "🕌", desc: "A world-famous sacred temple famous for its annual colorful Rath Yatra chariot festival." },
        { name: "Chilika Lake", icon: "🦆", desc: "Asia's largest brackish water lagoon, hosting migratory birds and rare Irrawaddy dolphins." }
      ],
      foods: [
        { name: "Chhena Poda", desc: "A mouth-watering baked cheese dessert made of fresh paneer, sugar, and cardamom." },
        { name: "Dahi Bara Aloo Dum", desc: "Lentil fritters soaked in yogurt (dahi), topped with a spicy, rich potato gravy." },
        { name: "Rasabali", desc: "Deep-fried cottage cheese patties soaked in thick, sweetened, cardamom-flavored milk." }
      ]
    },
    "Assam": {
      capital: "Dispur",
      language: "Assamese",
      climate: "Sub-tropical Humid (Best: Nov-Apr)",
      desc: "The gateway to the Northeast, famous for premium tea estates, the Brahmaputra River, and wildlife.",
      attractions: [
        { name: "Kaziranga National Park", icon: "🦏", desc: "UNESCO World Heritage reserve holding two-thirds of the world's great Indian one-horned rhinos." },
        { name: "Kamakhya Temple", icon: "🛕", desc: "A sacred hilltop temple in Guwahati dedicated to the mother goddess Kamakhya." },
        { name: "Majuli Island", icon: "🏝️", desc: "The world's largest river island, situated on the mighty Brahmaputra River." }
      ],
      foods: [
        { name: "Masor Tenga", desc: "A light, tangy fish curry flavored with tomatoes and outenga (elephant apple)." },
        { name: "Pitha", desc: "Steamed or roasted rice flour rolls stuffed with sweet sesame seeds or coconut." },
        { name: "Khar", desc: "A unique starter dish prepared by filtering water through the ashes of sun-dried banana peels." }
      ]
    },
    "Jammu & Kashmir": {
      capital: "Srinagar / Jammu",
      language: "Kashmiri, Urdu, Dogri",
      climate: "Alpine / Temperate (Best: Apr-Oct)",
      desc: "Often called 'Heaven on Earth', featuring snow-capped peaks, alpine lakes, and shikara rides.",
      attractions: [
        { name: "Dal Lake Shikaras", icon: "🛶", desc: "A scenic lake in Srinagar, famous for its floating markets and wooden houseboats." },
        { name: "Gulmarg Gondola", icon: "🚠", desc: "One of the highest cable cars in the world, offering views of snow-clad mountains." },
        { name: "Vaishno Devi Shrine", icon: "🛕", desc: "A highly revered holy cave temple nestled in the Trikuta Mountains in Jammu." }
      ],
      foods: [
        { name: "Rogan Josh", desc: "An aromatic lamb dish slow-cooked in a rich gravy of yogurt, saffron, and Kashmiri chilies." },
        { name: "Kahwa Tea", desc: "A traditional green tea brewed with saffron, cinnamon, cardamoms, and slivered almonds." },
        { name: "Yakhni Pulav", desc: "A highly fragrant rice and mutton dish cooked in a spiced yogurt-based broth." }
      ]
    },
    "Goa": {
      capital: "Panaji",
      language: "Konkani",
      climate: "Tropical Wet & Dry (Best: Nov-Feb)",
      desc: "A beautiful fusion of Portuguese heritage, golden beaches, vibrant nightlife, and seafood.",
      attractions: [
        { name: "Basilica of Bom Jesus", icon: "🏛️", desc: "UNESCO World Heritage church in Old Goa, housing the sacred remains of St. Francis Xavier." },
        { name: "Calangute Beach", icon: "🏖️", desc: "A popular, lively golden beach offering water sports, beach shacks, and shops." },
        { name: "Dudhsagar Falls", icon: "🌊", desc: "A majestic four-tiered waterfall on the Mandovi River, resembling a sea of milk." }
      ],
      foods: [
        { name: "Fish Curry Rice", desc: "A hot, comforting staple of rice served with a tangy, coconut-rich fish curry." },
        { name: "Bebinca", desc: "A rich, multi-layered traditional Goan dessert made of coconut milk, ghee, and egg yolks." },
        { name: "Chicken Xacuti", desc: "A highly spiced, aromatic curry prepared with toasted coconut and red chilies." }
      ]
    },
    "Himachal Pradesh": {
      capital: "Shimla",
      language: "Hindi, Pahari",
      climate: "Alpine / Cold (Best: Mar-Jun, Oct-Dec)",
      desc: "A majestic mountain state offering snow-capped panoramas, trekking paths, and apple orchards.",
      attractions: [
        { name: "Shimla Mall Road", icon: "🏔️", desc: "A popular pedestrian avenue in the capital city, boasting panoramic mountain views." },
        { name: "Manali Solang Valley", icon: "🏂", desc: "A hub for adventure sports like paragliding, skiing, and zorbing against a snowy backdrop." },
        { name: "McLeod Ganj Monasteries", icon: "☸️", desc: "The peaceful home of the Dalai Lama, famous for Tibetan monasteries and trekking." }
      ],
      foods: [
        { name: "Siddu", desc: "A steamed, stuffed wheat bread flavored with poppy seeds, walnuts, and ghee." },
        { name: "Madra", desc: "A rich Pahari chickpea slow-cooked in yogurt, spiced with cardamoms and cloves." },
        { name: "Dham", desc: "A traditional festive mid-day meal served on leaf plates, consisting of multiple lentil curries." }
      ]
    }
  };

  function initTourism() {
    if (tourismInitialized) return;
    tourismInitialized = true;

    const stateGrid = document.getElementById("tourism-state-grid");
    if (!stateGrid) return;

    stateGrid.innerHTML = "";
    
    // Sort states alphabetically for presentation
    const states = [...STATES_LIST].sort();
    
    states.forEach(state => {
      const btn = document.createElement("button");
      btn.className = "state-btn";
      btn.textContent = state;
      btn.addEventListener("click", () => {
        // Toggle active button
        document.querySelectorAll(".state-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        loadStateDetails(state);
        playTone(800, "sine", 0.04, 0.08);
      });
      stateGrid.appendChild(btn);
    });

    // Load first state by default (e.g. Maharashtra)
    const defaultState = "Maharashtra";
    const defaultBtn = Array.from(stateGrid.children).find(btn => btn.textContent === defaultState);
    if (defaultBtn) {
      defaultBtn.classList.add("active");
      loadStateDetails(defaultState);
    }
  }

  function loadStateDetails(stateName) {
    activeState = stateName;
    const attractionsContainer = document.getElementById("tourism-attractions");
    const foodsContainer = document.getElementById("tourism-foods");
    const cityCountLabel = document.getElementById("tourism-city-count");
    const citiesListContainer = document.getElementById("tourism-cities-list");
    const spotlightContainer = document.getElementById("tourism-city-spotlight");

    const data = TOURISM_DATABASE[stateName];
    if (!data) return;

    // Hide spotlight card initially
    if (spotlightContainer) spotlightContainer.style.display = "none";

    // RENDER SIGHTSEEING LANDMARKS
    if (attractionsContainer) {
      attractionsContainer.innerHTML = "";
      data.attractions.forEach(att => {
        const item = document.createElement("div");
        item.className = "attraction-item";
        item.innerHTML = `
          <div class="attraction-icon">${att.icon}</div>
          <div style="flex-grow: 1;">
            <h4 style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary); margin: 0 0 0.2rem 0;">${att.name}</h4>
            <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.45; margin: 0;">${att.desc}</p>
          </div>
        `;
        attractionsContainer.appendChild(item);
      });
    }

    // RENDER CULINARY DELIGHTS
    if (foodsContainer) {
      foodsContainer.innerHTML = "";
      data.foods.forEach(food => {
        const item = document.createElement("div");
        item.className = "food-item";
        item.innerHTML = `
          <div class="food-title">${food.name}</div>
          <div class="food-desc">${food.desc}</div>
        `;
        foodsContainer.appendChild(item);
      });
    }

    // FILTER CITIES THAT HASH TO THIS STATE
    const stateCities = [];
    for (let i = 0; i < CITIES_DATA.length; i++) {
      const city = CITIES_DATA[i];
      // Compute state dynamically via hash
      const coords = getCityCoords(city);
      const facts = computeLogisticsFacts(city, coords, 0.5);
      if (facts.state === stateName) {
        stateCities.push(city);
      }
    }

    // Render city count
    if (cityCountLabel) {
      cityCountLabel.textContent = `${stateCities.length.toLocaleString()} cities`;
    }

    // Render city pills
    if (citiesListContainer) {
      citiesListContainer.innerHTML = "";
      // Render first 200 cities to keep UI responsive and extremely fast
      const displayCities = stateCities.slice(0, 200);
      displayCities.forEach(city => {
        const pill = document.createElement("button");
        pill.className = "state-city-pill";
        pill.textContent = capitalizeWord(city);
        pill.addEventListener("click", () => {
          showCitySpotlight(city);
          playTone(900, "sine", 0.03, 0.05);
        });
        citiesListContainer.appendChild(pill);
      });

      if (stateCities.length > 200) {
        const moreIndicator = document.createElement("span");
        moreIndicator.style.cssText = "font-size: 0.75rem; color: var(--text-muted); align-self: center; padding: 0.5rem;";
        moreIndicator.textContent = `+ ${stateCities.length - 200} more cities`;
        citiesListContainer.appendChild(moreIndicator);
      }
    }
  }

  function showCitySpotlight(cityName) {
    const spotlightContainer = document.getElementById("tourism-city-spotlight");
    if (!spotlightContainer) return;

    const coords = getCityCoords(cityName);
    const facts = computeLogisticsFacts(cityName, coords, 0.5);

    spotlightContainer.style.display = "block";
    spotlightContainer.innerHTML = `
      <h4 style="font-weight: 700; font-size: 1.15rem; color: var(--color-accent); margin: 0 0 0.5rem 0; display: flex; align-items: center; gap: 0.4rem;">
        <span>📍</span> ${capitalizeWord(cityName)}
      </h4>
      <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6; display: flex; flex-direction: column; gap: 0.4rem;">
        <div style="display:flex; justify-content:space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 0.25rem;">
          <span>District:</span> <strong style="color:var(--text-primary);">${facts.district}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 0.25rem;">
          <span>State:</span> <strong style="color:var(--text-primary);">${facts.state}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 0.25rem;">
          <span>ZIP Code:</span> <strong style="color:var(--color-success); font-family:var(--font-mono);">${facts.zipCode}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 0.25rem;">
          <span>Latitude:</span> <strong style="color:var(--text-primary); font-family:var(--font-mono);">${coords.lat.toFixed(4)}° N</strong>
        </div>
        <div style="display:flex; justify-content:space-between; padding-bottom: 0.5rem;">
          <span>Longitude:</span> <strong style="color:var(--text-primary); font-family:var(--font-mono);">${coords.lng.toFixed(4)}° E</strong>
        </div>
      </div>
      <button id="btn-spotlight-route" class="visualizer-btn" style="width:100%; margin-top:0.75rem; background:var(--color-primary); border-color:var(--color-primary); color:white; font-weight:600;">
        Plan Route to ${capitalizeWord(cityName)} 🚗
      </button>
    `;

    // Hook up button to plan route
    const btnRoute = document.getElementById("btn-spotlight-route");
    if (btnRoute) {
      btnRoute.addEventListener("click", () => {
        // Pre-fill route destination
        const routeEnd = document.getElementById("route-end");
        if (routeEnd) {
          routeEnd.value = capitalizeWord(cityName);
          
          // Trigger custom autocomplete input handler if needed to bind values internally
          const event = new Event('input', { bubbles: true });
          routeEnd.dispatchEvent(event);
        }
        
        // Switch to Travel tab
        switchTab('travel');

        // Automatically trigger calculation if start city is filled
        const routeStart = document.getElementById("route-start");
        if (routeStart && routeStart.value.trim().length > 0) {
          const btnGenerate = document.getElementById("btn-generate-route");
          if (btnGenerate) {
            setTimeout(() => {
              btnGenerate.click();
            }, 100);
          }
        }
      });
    }
  }

  // =====================================================================
  // TRIP PLANNER & ITINERARY BUILDER
  // =====================================================================

  let tripInitialized = false;
  let tripStops = [];           // [{id, city, date, nights, notes, vibe}]
  let packingState = {};        // {category: [{label, checked}]}
  let activePackCat = 'clothes';
  let selectedTripCity = '';    // the city chosen from autocomplete

  const PACKING_PRESETS = {
    clothes:     ['T-Shirts (x5)', 'Jeans / Pants', 'Ethnic Wear', 'Undergarments (x7)', 'Socks (x5)', 'Sweater / Jacket', 'Comfortable Footwear', 'Sandals / Flip-Flops', 'Sleepwear'],
    docs:        ['Aadhar Card / ID', 'PAN Card', 'Passport (if needed)', 'Hotel Bookings Printout', 'Flight / Train Tickets', 'Travel Insurance', 'Emergency Contacts List', 'Wallet & Cash'],
    medical:     ['Prescribed Medicines', 'Pain Relievers (Crocin)', 'Band-Aids & Antiseptic', 'ORS Sachets', 'Anti-Nausea Tablets', 'Sunscreen (SPF 50)', 'Mosquito Repellent', 'Hand Sanitizer'],
    electronics: ['Phone + Charger', 'Power Bank', 'Earphones / AirPods', 'Laptop (if needed)', 'Universal Adapter', 'Camera + Memory Card', 'USB-C Hub'],
    toiletries:  ['Toothbrush & Paste', 'Shampoo & Conditioner', 'Face Wash', 'Razor / Trimmer', 'Deodorant', 'Hair Brush / Comb', 'Lip Balm', 'Moisturizer', 'Towel'],
    custom:      []
  };

  const BUDGET_RATES = { budget: 1500, mid: 4000, luxury: 12000 };
  const VIBE_OPTIONS = ['🏖️ Beach', '🏔️ Mountains', '🏛️ Heritage', '🌆 City', '🌿 Nature', '🎡 Fun'];

  function initTripPlanner() {
    if (tripInitialized) return;
    tripInitialized = true;

    // Load saved state
    loadTripFromStorage();
    initPackingList();

    // City autocomplete for trip input
    const tripCityInput = document.getElementById('trip-city-input');
    const tripCityDropdown = document.getElementById('trip-city-dropdown');
    const tripCityList = document.getElementById('trip-city-list');

    if (tripCityInput) {
      tripCityInput.addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        selectedTripCity = '';
        if (q.length < 1) { tripCityDropdown.style.display = 'none'; return; }
        const results = radixTrie.autocomplete(q, 8);
        if (!results.length) { tripCityDropdown.style.display = 'none'; return; }
        tripCityList.innerHTML = results.map(r =>
          `<div class="suggestion-item" data-city="${r}">${r.charAt(0).toUpperCase() + r.slice(1)}</div>`
        ).join('');
        tripCityDropdown.style.display = 'block';
        tripCityList.querySelectorAll('.suggestion-item').forEach(item => {
          item.addEventListener('click', () => {
            selectedTripCity = item.dataset.city;
            tripCityInput.value = selectedTripCity.charAt(0).toUpperCase() + selectedTripCity.slice(1);
            tripCityDropdown.style.display = 'none';
          });
        });
      });

      document.addEventListener('click', (e) => {
        if (!tripCityInput.contains(e.target) && !tripCityDropdown.contains(e.target)) {
          tripCityDropdown.style.display = 'none';
        }
      });
    }

    // Add city stop button
    const btnAddCity = document.getElementById('trip-btn-add-city');
    if (btnAddCity) {
      btnAddCity.addEventListener('click', () => {
        const errEl = document.getElementById('trip-city-error');
        if (!selectedTripCity) {
          errEl.style.display = 'block';
          setTimeout(() => errEl.style.display = 'none', 2500);
          return;
        }
        errEl.style.display = 'none';
        const stop = {
          id: Date.now(),
          city: selectedTripCity.charAt(0).toUpperCase() + selectedTripCity.slice(1),
          date: '',
          nights: 2,
          notes: '',
          vibe: ''
        };
        tripStops.push(stop);
        selectedTripCity = '';
        if (tripCityInput) { tripCityInput.value = ''; }
        renderStops();
        saveTripToStorage();
        playSuccessSound();
      });
    }

    // Export buttons
    const btnCopy = document.getElementById('trip-btn-copy');
    if (btnCopy) btnCopy.addEventListener('click', copyItinerary);

    const btnDownload = document.getElementById('trip-btn-download');
    if (btnDownload) btnDownload.addEventListener('click', downloadItinerary);

    const btnReset = document.getElementById('trip-btn-reset');
    if (btnReset) btnReset.addEventListener('click', () => {
      if (!confirm('Start a new trip? This will clear all stops.')) return;
      tripStops = [];
      const nameInput = document.getElementById('trip-name-input');
      if (nameInput) nameInput.value = '';
      renderStops();
      saveTripToStorage();
    });

    // Trip name + budget auto-save
    const nameInput = document.getElementById('trip-name-input');
    if (nameInput) nameInput.addEventListener('input', saveTripToStorage);
    const budgetSelect = document.getElementById('trip-budget-select');
    if (budgetSelect) budgetSelect.addEventListener('change', () => { updateSummary(); saveTripToStorage(); });

    renderStops();
    updateSummary();
  }

  function renderStops() {
    const list = document.getElementById('trip-stops-list');
    const emptyState = document.getElementById('trip-empty-state');
    const countLabel = document.getElementById('trip-stop-count');
    if (!list) return;

    if (tripStops.length === 0) {
      list.innerHTML = '';
      if (emptyState) { emptyState.style.display = 'block'; list.appendChild(emptyState); }
      document.getElementById('trip-itinerary-panel').style.display = 'none';
      if (countLabel) countLabel.textContent = '0 cities';
      updateSummary();
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (countLabel) countLabel.textContent = `${tripStops.length} ${tripStops.length === 1 ? 'city' : 'cities'}`;

    list.innerHTML = '';
    tripStops.forEach((stop, idx) => {
      // Connector
      if (idx > 0) {
        const connector = document.createElement('div');
        connector.className = 'trip-stop-connector';
        list.appendChild(connector);
      }

      const card = document.createElement('div');
      card.className = 'trip-stop-card';
      card.dataset.id = stop.id;

      card.innerHTML = `
        <div class="trip-stop-header">
          <div class="trip-stop-number">${idx + 1}</div>
          <div class="trip-stop-name">📍 ${stop.city}</div>
          <div class="trip-stop-controls">
            <button class="btn-up" title="Move Up" ${idx === 0 ? 'disabled style="opacity:0.3"' : ''}>▲</button>
            <button class="btn-down" title="Move Down" ${idx === tripStops.length - 1 ? 'disabled style="opacity:0.3"' : ''}>▼</button>
            <button class="btn-remove" title="Remove">✕</button>
          </div>
        </div>

        <div class="trip-stop-fields">
          <div>
            <label>Arrival Date</label>
            <input type="date" class="stop-date" value="${stop.date}">
          </div>
          <div>
            <label>Nights to Stay</label>
            <input type="number" class="stop-nights" min="1" max="30" value="${stop.nights}">
          </div>
          <div style="padding-bottom:0.15rem;">
            <label>&nbsp;</label>
          </div>
        </div>

        <div>
          <label style="font-size:0.75rem; color:var(--text-secondary); font-weight:500;">Notes / Places to Visit</label>
          <textarea class="trip-stop-notes" placeholder="e.g. Taj Mahal, Agra Fort, local street food...">${stop.notes}</textarea>
        </div>

        <div>
          <label style="font-size:0.75rem; color:var(--text-secondary); font-weight:500; display:block; margin-bottom:0.35rem;">Vibe</label>
          <div class="trip-vibe-tags">
            ${VIBE_OPTIONS.map(v => `<button class="trip-vibe-tag ${stop.vibe === v ? 'active' : ''}" data-vibe="${v}">${v}</button>`).join('')}
          </div>
        </div>
      `;

      // Wire up events
      card.querySelector('.btn-up').addEventListener('click', () => {
        if (idx > 0) { [tripStops[idx - 1], tripStops[idx]] = [tripStops[idx], tripStops[idx - 1]]; renderStops(); saveTripToStorage(); }
      });
      card.querySelector('.btn-down').addEventListener('click', () => {
        if (idx < tripStops.length - 1) { [tripStops[idx], tripStops[idx + 1]] = [tripStops[idx + 1], tripStops[idx]]; renderStops(); saveTripToStorage(); }
      });
      card.querySelector('.btn-remove').addEventListener('click', () => {
        tripStops.splice(idx, 1);
        renderStops();
        saveTripToStorage();
      });
      card.querySelector('.stop-date').addEventListener('change', (e) => {
        stop.date = e.target.value; saveTripToStorage(); generateItinerary();
      });
      card.querySelector('.stop-nights').addEventListener('input', (e) => {
        stop.nights = parseInt(e.target.value) || 1; updateSummary(); saveTripToStorage(); generateItinerary();
      });
      card.querySelector('.trip-stop-notes').addEventListener('input', (e) => {
        stop.notes = e.target.value; saveTripToStorage();
      });
      card.querySelectorAll('.trip-vibe-tag').forEach(btn => {
        btn.addEventListener('click', () => {
          stop.vibe = stop.vibe === btn.dataset.vibe ? '' : btn.dataset.vibe;
          card.querySelectorAll('.trip-vibe-tag').forEach(b => b.classList.toggle('active', b.dataset.vibe === stop.vibe));
          saveTripToStorage();
        });
      });

      list.appendChild(card);
    });

    updateSummary();
    generateItinerary();
  }

  function generateItinerary() {
    const panel = document.getElementById('trip-itinerary-panel');
    const view = document.getElementById('trip-itinerary-view');
    const totalLabel = document.getElementById('trip-total-days-label');
    if (!panel || !view) return;

    if (tripStops.length === 0) { panel.style.display = 'none'; return; }
    panel.style.display = 'block';

    const rows = [];
    let dayNum = 1;
    let currentDate = null;

    tripStops.forEach((stop, idx) => {
      // Travel day between stops
      if (idx > 0) {
        rows.push({ type: 'travel', day: dayNum, city: `✈️ Travel → ${stop.city}`, date: currentDate, note: 'Transit day — check trains/flights' });
        dayNum++;
        if (currentDate) {
          const d = new Date(currentDate); d.setDate(d.getDate() + 1);
          currentDate = d.toISOString().split('T')[0];
        }
      }

      // Parse start date for this stop
      if (stop.date) {
        currentDate = stop.date;
      }

      const nights = Math.max(1, stop.nights || 2);
      for (let n = 0; n < nights; n++) {
        const dateStr = currentDate ? formatDate(currentDate) : '';
        const note = n === 0 ? (stop.notes || `Arrive in ${stop.city}`) :
                     n === nights - 1 ? `Last day in ${stop.city} — pack up` :
                     stop.notes || `Explore ${stop.city}`;
        rows.push({ type: 'stay', day: dayNum, city: stop.city, vibe: stop.vibe, date: dateStr, note });
        dayNum++;
        if (currentDate) {
          const d = new Date(currentDate); d.setDate(d.getDate() + 1);
          currentDate = d.toISOString().split('T')[0];
        }
      }
    });

    const totalDays = rows.length;
    if (totalLabel) totalLabel.textContent = `${totalDays} total days`;

    view.innerHTML = rows.map(row => `
      <div class="itinerary-day">
        <div class="itinerary-day-number">Day ${row.day}${ row.date ? '<br><span style="font-weight:400; color:var(--text-muted);">' + row.date + '</span>' : '' }</div>
        <div class="itinerary-day-dot ${row.type === 'travel' ? 'travel' : ''}"></div>
        <div class="itinerary-day-content">
          <div class="itinerary-day-city">${row.city}${ row.vibe ? ' <span style="font-size:0.75rem; color:var(--text-muted);">' + row.vibe + '</span>' : '' }</div>
          <div class="itinerary-day-note">${row.note}</div>
        </div>
      </div>
    `).join('');
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso + 'T00:00:00');
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch { return iso; }
  }

  function updateSummary() {
    const cities = tripStops.length;
    const totalNights = tripStops.reduce((s, st) => s + (parseInt(st.nights) || 2), 0);
    const travels = Math.max(0, cities - 1);
    const totalDays = totalNights + travels;

    const budgetSelect = document.getElementById('trip-budget-select');
    const tier = budgetSelect ? budgetSelect.value : 'mid';
    const ratePerDay = BUDGET_RATES[tier] || 4000;
    const estBudget = totalDays * ratePerDay;

    const fmt = (n) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(1)}K` : `₹${n}`;

    document.getElementById('summary-cities').textContent = cities;
    document.getElementById('summary-days').textContent = totalDays;
    document.getElementById('summary-travels').textContent = travels;
    document.getElementById('summary-budget').textContent = cities > 0 ? fmt(estBudget) : '-';
  }

  function buildItineraryText() {
    const nameInput = document.getElementById('trip-name-input');
    const budgetSelect = document.getElementById('trip-budget-select');
    const name = nameInput ? (nameInput.value || 'My India Trip') : 'My India Trip';
    const tier = budgetSelect ? budgetSelect.value : 'mid';
    const tierLabel = { budget: 'Budget', mid: 'Mid-Range', luxury: 'Luxury' }[tier];

    let text = `🌏 ${name.toUpperCase()}\n`;
    text += `${'═'.repeat(name.length + 4)}\n`;
    text += `Budget Tier: ${tierLabel}\n\n`;
    text += `STOPS\n─────\n`;
    tripStops.forEach((s, i) => {
      text += `${i + 1}. ${s.city} — ${s.nights} night(s)${s.date ? ' (from ' + s.date + ')' : ''}${s.vibe ? ' ' + s.vibe : ''}\n`;
      if (s.notes) text += `   📝 ${s.notes}\n`;
    });
    text += `\nDAY-BY-DAY ITINERARY\n────────────────────\n`;

    let dayNum = 1;
    let currentDate = null;
    tripStops.forEach((stop, idx) => {
      if (idx > 0) {
        text += `Day ${dayNum}: ✈️ Travel to ${stop.city}\n`;
        dayNum++;
        if (currentDate) { const d = new Date(currentDate); d.setDate(d.getDate() + 1); currentDate = d.toISOString().split('T')[0]; }
      }
      if (stop.date) currentDate = stop.date;
      const nights = Math.max(1, stop.nights || 2);
      for (let n = 0; n < nights; n++) {
        const dateStr = currentDate ? ` (${formatDate(currentDate)})` : '';
        const note = n === 0 ? `Arrive in ${stop.city}` : n === nights - 1 ? `Last day — pack up` : `Explore ${stop.city}`;
        text += `Day ${dayNum}${dateStr}: ${stop.city} — ${note}\n`;
        dayNum++;
        if (currentDate) { const d = new Date(currentDate); d.setDate(d.getDate() + 1); currentDate = d.toISOString().split('T')[0]; }
      }
    });

    text += `\n─────────────────────\nGenerated by Arvora ✨ — India's City Universe`;
    return text;
  }

  function copyItinerary() {
    if (tripStops.length === 0) { alert('Add some city stops first!'); return; }
    navigator.clipboard.writeText(buildItineraryText()).then(() => {
      const btn = document.getElementById('trip-btn-copy');
      if (btn) { const orig = btn.textContent; btn.textContent = '✅ Copied!'; setTimeout(() => btn.textContent = orig, 2000); }
    });
  }

  function downloadItinerary() {
    if (tripStops.length === 0) { alert('Add some city stops first!'); return; }
    const text = buildItineraryText();
    const nameInput = document.getElementById('trip-name-input');
    const filename = (nameInput && nameInput.value ? nameInput.value.replace(/\s+/g, '_') : 'arvora_trip') + '.txt';
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function saveTripToStorage() {
    try {
      const nameInput = document.getElementById('trip-name-input');
      const budgetSelect = document.getElementById('trip-budget-select');
      localStorage.setItem('arvora_trip', JSON.stringify({
        name: nameInput ? nameInput.value : '',
        budget: budgetSelect ? budgetSelect.value : 'mid',
        stops: tripStops
      }));
    } catch(e) {}
  }

  function loadTripFromStorage() {
    try {
      const saved = localStorage.getItem('arvora_trip');
      if (!saved) return;
      const data = JSON.parse(saved);
      const nameInput = document.getElementById('trip-name-input');
      const budgetSelect = document.getElementById('trip-budget-select');
      if (nameInput && data.name) nameInput.value = data.name;
      if (budgetSelect && data.budget) budgetSelect.value = data.budget;
      if (data.stops) tripStops = data.stops;
    } catch(e) {}
  }

  // ---- PACKING CHECKLIST ----

  function initPackingList() {
    // Load from storage or use presets
    try {
      const saved = localStorage.getItem('arvora_packing');
      if (saved) {
        packingState = JSON.parse(saved);
        // Merge in any new preset items that aren't saved yet
        Object.keys(PACKING_PRESETS).forEach(cat => {
          if (!packingState[cat]) packingState[cat] = PACKING_PRESETS[cat].map(l => ({ label: l, checked: false }));
        });
      } else {
        Object.keys(PACKING_PRESETS).forEach(cat => {
          packingState[cat] = PACKING_PRESETS[cat].map(l => ({ label: l, checked: false }));
        });
      }
    } catch { Object.keys(PACKING_PRESETS).forEach(cat => { packingState[cat] = PACKING_PRESETS[cat].map(l => ({ label: l, checked: false })); }); }

    // Category tab buttons
    document.querySelectorAll('.pack-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pack-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activePackCat = btn.dataset.cat;
        const adder = document.getElementById('pack-custom-adder');
        if (adder) adder.style.display = activePackCat === 'custom' ? 'block' : 'none';
        renderPackingItems();
      });
    });

    // Custom add button
    const customAddBtn = document.getElementById('pack-custom-add-btn');
    const customInput = document.getElementById('pack-custom-input');
    if (customAddBtn && customInput) {
      customAddBtn.addEventListener('click', () => {
        const val = customInput.value.trim();
        if (!val) return;
        packingState['custom'].push({ label: val, checked: false });
        customInput.value = '';
        renderPackingItems();
        savePackingToStorage();
      });
      customInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') customAddBtn.click(); });
    }

    renderPackingItems();
  }

  function renderPackingItems() {
    const list = document.getElementById('pack-items-list');
    if (!list) return;
    const items = packingState[activePackCat] || [];
    if (items.length === 0) {
      list.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem; text-align:center; padding:1rem;">No items yet. Add one below!</p>`;
    } else {
      list.innerHTML = items.map((item, idx) => `
        <label class="pack-item ${item.checked ? 'checked' : ''}" data-idx="${idx}">
          <input type="checkbox" ${item.checked ? 'checked' : ''}>
          <span class="pack-item-label">${item.label}</span>
          <button class="pack-item-delete" data-idx="${idx}" title="Remove">✕</button>
        </label>
      `).join('');

      list.querySelectorAll('.pack-item input[type="checkbox"]').forEach((cb, idx) => {
        cb.addEventListener('change', () => {
          packingState[activePackCat][idx].checked = cb.checked;
          cb.closest('.pack-item').classList.toggle('checked', cb.checked);
          updatePackingProgress();
          savePackingToStorage();
        });
      });
      list.querySelectorAll('.pack-item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          const idx = parseInt(btn.dataset.idx);
          packingState[activePackCat].splice(idx, 1);
          renderPackingItems();
          savePackingToStorage();
        });
      });
    }
    updatePackingProgress();
  }

  function updatePackingProgress() {
    const allItems = Object.values(packingState).flat();
    const total = allItems.length;
    const checked = allItems.filter(i => i.checked).length;
    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
    const bar = document.getElementById('pack-progress-bar');
    const label = document.getElementById('pack-progress-label');
    if (bar) bar.style.width = pct + '%';
    if (label) label.textContent = `${checked}/${total} packed (${pct}%)`;
  }

  function savePackingToStorage() {
    try { localStorage.setItem('arvora_packing', JSON.stringify(packingState)); } catch(e) {}
  }

  // =====================================================================
  // EXPANSION TABS: DISCOVERY, FESTIVALS, COMPARE, BUDGET
  // =====================================================================

  const STATE_INFO = {
    "Maharashtra": { region: "West", climate: "Tropical Wet & Dry (Best: Oct-Mar)", languages: "Marathi, Hindi, English" },
    "Delhi": { region: "North", climate: "Semi-arid (Best: Oct-Mar)", languages: "Hindi, Punjabi, English" },
    "Karnataka": { region: "South", climate: "Tropical Wet & Dry (Best: Oct-Mar)", languages: "Kannada, English" },
    "Tamil Nadu": { region: "South", climate: "Tropical Wet & Dry (Best: Nov-Feb)", languages: "Tamil, English" },
    "West Bengal": { region: "East", climate: "Sub-tropical Monsoon (Best: Oct-Mar)", languages: "Bengali, English" },
    "Uttar Pradesh": { region: "North", climate: "Humid Sub-tropical (Best: Oct-Mar)", languages: "Hindi, Urdu" },
    "Gujarat": { region: "West", climate: "Semi-arid (Best: Oct-Mar)", languages: "Gujarati, Hindi" },
    "Rajasthan": { region: "West", climate: "Arid Desert (Best: Oct-Mar)", languages: "Hindi, Rajasthani" },
    "Kerala": { region: "South", climate: "Tropical Wet (Best: Sep-Mar)", languages: "Malayalam, English" },
    "Telangana": { region: "South", climate: "Semi-arid (Best: Oct-Mar)", languages: "Telugu, Urdu, English" },
    "Haryana": { region: "North", climate: "Semi-arid (Best: Oct-Mar)", languages: "Haryanvi, Hindi" },
    "Punjab": { region: "North", climate: "Semi-arid (Best: Oct-Mar)", languages: "Punjabi, Hindi" },
    "Bihar": { region: "East", climate: "Humid Sub-tropical (Best: Oct-Mar)", languages: "Hindi, Maithili, Bhojpuri" },
    "Madhya Pradesh": { region: "Central", climate: "Sub-tropical Dry (Best: Oct-Mar)", languages: "Hindi" },
    "Andhra Pradesh": { region: "South", climate: "Tropical Wet & Dry (Best: Oct-Mar)", languages: "Telugu, English" },
    "Odisha": { region: "East", climate: "Tropical Wet & Dry (Best: Oct-Mar)", languages: "Odia, English" },
    "Assam": { region: "Northeast", climate: "Sub-tropical Humid (Best: Nov-Apr)", languages: "Assamese, Bengali" },
    "Jammu & Kashmir": { region: "North", climate: "Alpine / Temperate (Best: Apr-Oct)", languages: "Kashmiri, Dogri, Urdu" },
    "Goa": { region: "West", climate: "Tropical Wet & Dry (Best: Nov-Feb)", languages: "Konkani, English" },
    "Himachal Pradesh": { region: "North", climate: "Alpine / Cold (Best: Mar-Jun, Oct-Dec)", languages: "Hindi, Pahari" }
  };

  const CURATED_CITIES = {
    "mumbai": { famous: "Bollywood, Gateway of India, Local Trains, Vada Pav, Marine Drive", popTier: "Metro", climate: "Tropical Monsoon", capital: true },
    "delhi": { famous: "Red Fort, Street Food, Qutub Minar, political hub, shopping bazaars", popTier: "Metro", climate: "Semi-arid", capital: true },
    "bengaluru": { famous: "Silicon Valley of India, pleasant weather, gardens, craft breweries", popTier: "Metro", climate: "Tropical Wet & Dry", capital: true },
    "chennai": { famous: "Marina Beach, filter coffee, classical music, automobile hub, ancient temples", popTier: "Metro", climate: "Tropical Wet & Dry", capital: true },
    "kolkata": { famous: "Victoria Memorial, sweets (Rasgulla), Durga Puja, literature & art", popTier: "Metro", climate: "Sub-tropical Monsoon", capital: true },
    "hyderabad": { famous: "Charminar, Hyderabadi Biryani, pearls, IT hub, Golconda Fort", popTier: "Metro", climate: "Semi-arid", capital: true },
    "ahmedabad": { famous: "Sabarmati Ashram, heritage architecture, Gujarati thali, textile hub", popTier: "Large", climate: "Semi-arid" },
    "pune": { famous: "Oxford of the East, Shaniwar Wada, IT parks, pleasant climate, cultural hub", popTier: "Large", climate: "Sub-tropical Dry" },
    "jaipur": { famous: "The Pink City, Hawa Mahal, Amer Fort, block printing, royal palaces", popTier: "Large", climate: "Arid Desert", capital: true },
    "lucknow": { famous: "City of Nawabs, Chikankari embroidery, Tunday kebabs, historical imambaras", popTier: "Large", climate: "Humid Sub-tropical", capital: true },
    "agra": { famous: "Taj Mahal, Agra Fort, Petha, Mughal history, marble crafts", popTier: "Large", climate: "Humid Sub-tropical" },
    "amritsar": { famous: "Golden Temple, Wagah Border, Kulcha, historic Jallianwala Bagh", popTier: "Large", climate: "Semi-arid" },
    "srinagar": { famous: "Dal Lake Shikaras, houseboats, Mughal gardens, Pashmina shawls", popTier: "Large", climate: "Alpine / Temperate", capital: true },
    "panaji": { famous: "Portuguese quarters, churches, casinos, Mandovi river cruises", popTier: "Mid", climate: "Tropical Wet & Dry", capital: true },
    "shimla": { famous: "Mall Road, toy train, colonial architecture, snow-capped peaks", popTier: "Mid", climate: "Alpine / Cold", capital: true },
    "patna": { famous: "Nalanda ruins nearby, ancient Pataliputra, Ganga riverfront, Litti Chokha", popTier: "Large", climate: "Humid Sub-tropical", capital: true },
    "bhopal": { famous: "City of Lakes, Upper Lake, Bhimbetka caves nearby, clean green environment", popTier: "Large", climate: "Sub-tropical Dry", capital: true },
    "kochi": { famous: "Chinese Fishing Nets, Fort Kochi history, spices, backwaters gateway", popTier: "Large", climate: "Tropical Monsoon" },
    "guwahati": { famous: "Kamakhya Temple, gateway to Northeast, Brahmaputra river cruise", popTier: "Large", climate: "Sub-tropical Humid" },
    "bhubaneswar": { famous: "Temple City of India, Odissi dance, ancient rock-cut caves, Lingaraj temple", popTier: "Large", climate: "Tropical Wet & Dry", capital: true },
    "coimbatore": { famous: "Manchester of South India, textile mills, Isha Yoga Center, western ghats", popTier: "Large", climate: "Tropical Wet & Dry" },
    "varanasi": { famous: "Kashi Vishwanath, Ganga Aarti, ancient ghats, Banarasi silk sarees", popTier: "Large", climate: "Humid Sub-tropical" },
    "jodhpur": { famous: "The Blue City, Mehrangarh Fort, Umaid Bhawan Palace, spicy street food", popTier: "Large", climate: "Arid Desert" },
    "udaipur": { famous: "City of Lakes, Lake Palace, romantic vibe, heritage hotels, Pichola lake", popTier: "Large", climate: "Arid Desert" },
    "surat": { famous: "Diamond polishing, textile markets, street food (Locho), clean city vibe", popTier: "Large", climate: "Semi-arid" },
    "indore": { famous: "Cleanest city in India, Sarafa night food market, poha-jalebi, Rajwada palace", popTier: "Large", climate: "Sub-tropical Dry" },
    "gwalior": { famous: "Gwalior Fort, music legend Tansen birthplace, grand palaces, history", popTier: "Large", climate: "Sub-tropical Dry" },
    "madurai": { famous: "Meenakshi Amman Temple, jasmine flowers, street food, ancient trading history", popTier: "Large", climate: "Tropical Wet & Dry" },
    "mysuru": { famous: "Mysore Palace, Sandalwood, Mysore Pak, Dussehra festival celebration", popTier: "Large", climate: "Tropical Wet & Dry" },
    "ooty": { famous: "Nilgiri tea gardens, scenic toy train, Botanical garden, lakes", popTier: "Small town", climate: "Highland" },
    "mumbai suburban": { famous: "Sanjay Gandhi National Park, suburban beaches, local train network", popTier: "Large", climate: "Tropical Monsoon" },
    "dehradun": { famous: "Robber's Cave, Forest Research Institute, gateway to Mussoorie and hills", popTier: "Large", climate: "Humid Sub-tropical" },
    "haridwar": { famous: "Ganga Aarti, Har ki Pauri, Kumbh Mela, spiritual pilgrimage gateway", popTier: "Mid", climate: "Humid Sub-tropical" },
    "rishikesh": { famous: "Yoga Capital of the World, Laxman Jhula, white water rafting, Beatles ashram", popTier: "Mid", climate: "Highland" },
    "darjeeling": { famous: "Darjeeling Himalayan Railway, premium tea, views of Kanchenjunga", popTier: "Small town", climate: "Highland" },
    "dharamshala": { famous: "McLeod Ganj, Dalai Lama residency, Tibetan culture, cricket stadium", popTier: "Small town", climate: "Alpine / Cold" },
    "manali": { famous: "Snowy valleys, Solang valley sports, Rohtang pass, wooden temples", popTier: "Small town", climate: "Alpine / Cold" },
    "coorg": { famous: "Coffee estates, Raja's Seat, misty mountains, abbey falls, trekking", popTier: "Small town", climate: "Highland" },
    "alleppey": { famous: "Houseboat cruise, backwaters, Vembanad lake, coir products, beach", popTier: "Mid", climate: "Tropical Monsoon" },
    "pondicherry": { famous: "French Quarter, Auroville, Promenade beach, spiritual vibe, cafes", popTier: "Mid", climate: "Tropical Wet & Dry" },
    "hampi": { famous: "Ruins of Vijayanagara Empire, Virupaksha temple, boulder-strewn landscapes", popTier: "Small town", climate: "Tropical Wet & Dry" },
    "tirupati": { famous: "Lord Venkateswara temple, Laddu prasad, Tirumala hills pilgrimage", popTier: "Large", climate: "Tropical Wet & Dry" },
    "visakhapatnam": { famous: "Vizag beaches, submarine museum, Araku valley gateway, major port", popTier: "Large", climate: "Tropical Wet & Dry" },
    "ranchi": { famous: "City of Waterfalls, Dhoni's hometown, tribal culture, lush hills", popTier: "Large", climate: "Sub-tropical Humid" },
    "jamshedpur": { famous: "Steel City of India, Jubilee Park, clean planned townships", popTier: "Large", climate: "Sub-tropical Humid" },
    "raipur": { famous: "Naya Raipur smart city, terracotta arts, steel and mining hub", popTier: "Large", climate: "Sub-tropical Dry" },
    "shillong": { famous: "Scotland of the East, waterfalls, living root bridges nearby, music culture", popTier: "Mid", climate: "Highland" },
    "imphal": { famous: "Kangla Fort, Loktak lake floating islands, Manipuri dance style", popTier: "Mid", climate: "Highland" },
    "itanagar": { famous: "Ganga Lake, Ita Fort, Buddhist monasteries, beautiful mountain valleys", popTier: "Small town", climate: "Highland" },
    "leh": { famous: "Magnetic hill, Pangong lake, Buddhist monasteries, extreme adventure trekking", popTier: "Small town", climate: "Alpine / Cold" }
  };

  const FESTIVALS_DATA = [
    { name: "Makar Sankranti / Pongal", month: 0, date: "Jan 14-15", state: "Tamil Nadu, Maharashtra, Karnataka, Gujarat", type: "Harvest", color: "#f59e0b", desc: "A harvest festival marked by kite flying, bonfires, sweet dishes made of sesame and jaggery, and thanksgiving to nature." },
    { name: "Republic Day", month: 0, date: "Jan 26", state: "All States", type: "National", color: "#3b82f6", desc: "Commemorates the date on which the Constitution of India came into effect in 1950. Marked by grand military and cultural parades." },
    { name: "Maha Shivratri", month: 1, date: "Feb/Mar", state: "All States", type: "Religious", color: "#8b5cf6", desc: "A major Hindu festival in honor of Lord Shiva. Celebrated with night-long prayers, fasting, and meditating." },
    { name: "Taj Mahotsav", month: 1, date: "Feb 18-27", state: "Uttar Pradesh", type: "Cultural", color: "#ec4899", desc: "A 10-day cultural festival held in Agra, showcasing India's rich arts, crafts, classical music, dance, and cuisine." },
    { name: "Holi", month: 2, date: "March", state: "All States (mainly North)", type: "Religious", color: "#ec4899", desc: "The famous festival of colors, celebrating the arrival of spring, victory of good over evil, and play of colored powder and water." },
    { name: "Shigmo", month: 2, date: "March", state: "Goa", type: "Cultural", color: "#f59e0b", desc: "A spring festival celebrated in Goa with vibrant street parades, traditional dances, and large floats depicting Hindu mythology." },
    { name: "Baisakhi", month: 3, date: "Apr 13/14", state: "Punjab, Haryana", type: "Harvest", color: "#f59e0b", desc: "Sikh New Year and harvest festival. Celebrated with energetic Bhangra and Gidda dances and community feasts (Langar)." },
    { name: "Bohu Bihu", month: 3, date: "Mid-April", state: "Assam", type: "Harvest", color: "#10b981", desc: "The biggest festival of Assam, celebrating the Assamese New Year and spring with traditional songs, dances, and feasting." },
    { name: "Buddha Purnima", month: 4, date: "May", state: "Bihar, Jammu & Kashmir", type: "Religious", color: "#8b5cf6", desc: "Celebrates the birth, enlightenment, and death of Gautama Buddha. Marked by prayer meets and acts of charity." },
    { name: "Rath Yatra", month: 5, date: "Jun/Jul", state: "Odisha", type: "Religious", color: "#8b5cf6", desc: "The grand chariot festival of Lord Jagannath in Puri. Millions gather to pull three massive decorated wooden chariots." },
    { name: "Hemis Festival", month: 5, date: "June/July", state: "Jammu & Kashmir (Ladakh)", type: "Cultural", color: "#ef4444", desc: "Celebrated in Hemis Monastery in Ladakh, featuring sacred masked dances (Cham) and colorful Tibetan Buddhist music." },
    { name: "Independence Day", month: 7, date: "Aug 15", state: "All States", type: "National", color: "#3b82f6", desc: "Marks the nation's independence from British rule in 1947. Celebrated with flag hoisting, parades, and patriotic events." },
    { name: "Onam", month: 7, date: "Aug/Sep", state: "Kerala", type: "Harvest", color: "#f59e0b", desc: "A spectacular harvest festival in Kerala. Features boat races (Vallam Kali), floral carpets (Pookalam), and the grand feast (Sadya)." },
    { name: "Ganesh Chaturthi", month: 8, date: "Aug/Sep", state: "Maharashtra, Karnataka, Telangana", type: "Religious", color: "#8b5cf6", desc: "A 10-day festival honoring Lord Ganesha. Features giant clay idols, community prayers, and dancing processions for immersion (Visarjan)." },
    { name: "Durga Puja", month: 9, date: "Oct", state: "West Bengal, Assam, Bihar", type: "Religious", color: "#ef4444", desc: "Celebration of Goddess Durga's victory over Mahishasura. Bengal is transformed with artistic pandals, street food, and music." },
    { name: "Gandhi Jayanti", month: 9, date: "Oct 2", state: "All States", type: "National", color: "#3b82f6", desc: "Birthday of Mahatma Gandhi, celebrated as the International Day of Non-Violence. Marked by prayer services and tributes." },
    { name: "Dussehra / Vijayadashami", month: 9, date: "Oct/Nov", state: "All States", type: "Religious", color: "#8b5cf6", desc: "Celebrates Lord Rama's victory over Ravana (marked by burning effigies of Ravana) and Durga's victory. Grand celebrations in Mysore and Kullu." },
    { name: "Diwali", month: 10, date: "Oct/Nov", state: "All States", type: "Religious", color: "#f59e0b", desc: "The festival of lights. Homes are lit with diyas, decorated with rangoli, and celebrated with sweets, family gatherings, and firecrackers." },
    { name: "Pushkar Camel Fair", month: 10, date: "November", state: "Rajasthan", type: "Cultural", color: "#ec4899", desc: "A massive multi-day livestock fair and cultural festival in Pushkar, featuring camel races, music, folk dance, and a holy dip in the lake." },
    { name: "Christmas", month: 11, date: "Dec 25", state: "All States (especially Goa, Kerala)", type: "Religious", color: "#ef4444", desc: "Celebrates the birth of Jesus Christ. Homes and churches are decorated with stars, lights, cribs, and cakes." },
    { name: "Hornbill Festival", month: 11, date: "Dec 1-10", state: "Nagaland", type: "Cultural", color: "#10b981", desc: "The 'Festival of Festivals' showcasing the rich heritage, dances, crafts, games, and music of Nagaland's indigenous tribes." }
  ];

  let discoveryInitialized = false;
  let discoveryHistory = [];
  let festivalsInitialized = false;
  let activeFestivalMonth = new Date().getMonth();
  let activeFestivalState = "all";
  let compareInitialized = false;
  let cityCompare1 = "";
  let cityCompare2 = "";
  let budgetInitialized = false;

  function initDiscovery() {
    if (discoveryInitialized) return;
    discoveryInitialized = true;

    const btnDiscover = document.getElementById("discover-btn-random");
    const discoverSearchInput = document.getElementById("discover-city-search");
    const discoverDropdown = document.getElementById("discover-suggestions-dropdown");
    const discoverSuggestionsList = document.getElementById("discover-suggestions-list");
    const btnAddDiscoveryToTrip = document.getElementById("discover-btn-add-trip");
    const btnExploreDiscoveryState = document.getElementById("discover-btn-explore-state");
    
    let currentDiscoveredCity = "mumbai";

    if (discoverSearchInput) {
      discoverSearchInput.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (query.length > 0) {
          handleAutocompleteInput(discoverSearchInput, discoverDropdown, discoverSuggestionsList, null, query, 6, (selected) => {
            discoverSearchInput.value = capitalizeWord(selected);
            discoverDropdown.classList.remove("active");
            showCityCard(selected);
          });
          discoverDropdown.classList.add("active");
        } else {
          discoverDropdown.classList.remove("active");
        }
      });
      document.addEventListener("click", (e) => {
        if (!discoverSearchInput.contains(e.target) && !discoverDropdown.contains(e.target)) {
          discoverDropdown.classList.remove("active");
        }
      });
    }

    if (btnDiscover) {
      btnDiscover.addEventListener("click", () => {
        const randomIndex = Math.floor(Math.random() * CITIES_DATA.length);
        const randomCity = CITIES_DATA[randomIndex];
        showCityCard(randomCity);
        playTone(600, "sine", 0.05, 0.1);
        const rect = btnDiscover.getBoundingClientRect();
        spawnParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 25, "var(--color-primary)");
      });
    }

    function showCityCard(cityName) {
      cityName = cityName.trim().toLowerCase();
      currentDiscoveredCity = cityName;
      
      const facts = computeLogisticsFacts(cityName, {lat: 0, lng: 0}, 1);
      const state = facts.state;
      const region = STATE_INFO[state]?.region || "India";
      
      let popTier = "Mid-sized Town";
      let climate = STATE_INFO[state]?.climate || "Tropical";
      let famous = "Known for local culture, local cuisine, and regional heritage.";
      let languages = STATE_INFO[state]?.languages || "Hindi, English";

      if (CURATED_CITIES[cityName]) {
        popTier = CURATED_CITIES[cityName].popTier + " City";
        climate = CURATED_CITIES[cityName].climate;
        famous = CURATED_CITIES[cityName].famous;
      } else {
        let hash = 0;
        for (let i = 0; i < cityName.length; i++) hash = cityName.charCodeAt(i) + ((hash << 5) - hash);
        hash = Math.abs(hash);
        const tiers = ["Small Town", "Mid-sized Town", "Large City", "Metropolitan"];
        popTier = tiers[hash % tiers.length];
        
        const descriptors = [
          "Famous for regional handicraft bazaars, traditional festivals, and historic landmarks.",
          "Renowned for its scenic natural beauty, peaceful vibes, and local food specialties.",
          "Known for its agriculture, warm hospitality, and historic temples/shrines.",
          "A bustling trade hub with vibrant weekly markets, authentic local culture, and historic architecture."
        ];
        famous = descriptors[hash % descriptors.length];
      }

      if (!discoveryHistory.includes(cityName)) {
        discoveryHistory.unshift(cityName);
        if (discoveryHistory.length > 5) discoveryHistory.pop();
        updateDiscoveryHistory();
      }

      const cardName = document.getElementById("discover-card-name");
      const cardState = document.getElementById("discover-card-state");
      const cardPop = document.getElementById("discover-card-pop");
      const cardClimate = document.getElementById("discover-card-climate");
      const cardFamous = document.getElementById("discover-card-famous");
      const cardLang = document.getElementById("discover-card-lang");

      if (cardName) cardName.textContent = capitalizeWord(cityName);
      if (cardState) cardState.textContent = `${state} (${region})`;
      if (cardPop) cardPop.textContent = popTier;
      if (cardClimate) cardClimate.textContent = climate;
      if (cardFamous) cardFamous.textContent = famous;
      if (cardLang) cardLang.textContent = languages;
      
      const card = document.getElementById("discover-city-card");
      if (card) {
        card.style.display = "block";
        card.classList.remove("flip-animation");
        void card.offsetWidth;
        card.classList.add("flip-animation");
      }
    }

    function updateDiscoveryHistory() {
      const strip = document.getElementById("discover-history-strip");
      if (!strip) return;
      if (discoveryHistory.length === 0) {
        strip.innerHTML = `<span style="color:var(--text-muted); font-size:0.85rem;">No history yet.</span>`;
        return;
      }
      strip.innerHTML = discoveryHistory.map(city => `
        <span class="state-city-pill" data-city="${city}">${capitalizeWord(city)}</span>
      `).join('');

      strip.querySelectorAll('.state-city-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          showCityCard(pill.dataset.city);
        });
      });
    }

    if (btnAddDiscoveryToTrip) {
      btnAddDiscoveryToTrip.addEventListener("click", () => {
        if (!currentDiscoveredCity) return;
        addTripStopExternal(currentDiscoveredCity);
      });
    }

    if (btnExploreDiscoveryState) {
      btnExploreDiscoveryState.addEventListener("click", () => {
        if (!currentDiscoveredCity) return;
        const facts = computeLogisticsFacts(currentDiscoveredCity, {lat: 0, lng: 0}, 1);
        switchTab('tourism');
        loadStateDetails(facts.state);
        const stateBtn = Array.from(document.querySelectorAll('.state-btn')).find(b => b.textContent === facts.state);
        if (stateBtn) {
          document.querySelectorAll(".state-btn").forEach(b => b.classList.remove("active"));
          stateBtn.classList.add("active");
        }
      });
    }

    showCityCard("mumbai");
  }

  function addTripStopExternal(cityName) {
    selectedTripCity = cityName.trim().toLowerCase();
    switchTab('trip');
    const tripInput = document.getElementById("trip-city-input");
    const addBtn = document.getElementById("trip-btn-add-city");
    if (tripInput && addBtn) {
      tripInput.value = capitalizeWord(cityName);
      addBtn.click();
    }
  }

  function initFestivals() {
    if (festivalsInitialized) return;
    festivalsInitialized = true;

    const monthTabsContainer = document.getElementById("festival-months-tabs");
    const stateFilter = document.getElementById("festival-state-filter");

    if (monthTabsContainer) {
      monthTabsContainer.innerHTML = "";
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      monthNames.forEach((monthName, idx) => {
        const btn = document.createElement("button");
        btn.className = `pack-cat-btn ${idx === activeFestivalMonth ? 'active' : ''}`;
        btn.textContent = monthName;
        btn.addEventListener("click", () => {
          monthTabsContainer.querySelectorAll('.pack-cat-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeFestivalMonth = idx;
          renderFestivals();
        });
        monthTabsContainer.appendChild(btn);
      });
    }

    if (stateFilter) {
      stateFilter.innerHTML = `<option value="all">🌐 All States</option>`;
      STATES_LIST.sort().forEach(state => {
        stateFilter.innerHTML += `<option value="${state}">${state}</option>`;
      });
      stateFilter.addEventListener("change", (e) => {
        activeFestivalState = e.target.value;
        renderFestivals();
      });
    }

    renderFestivals();
    renderUpcomingFestivals();
  }

  function renderFestivals() {
    const list = document.getElementById("festivals-grid-list");
    if (!list) return;

    const filtered = FESTIVALS_DATA.filter(fest => {
      const matchMonth = fest.month === activeFestivalMonth;
      const matchState = activeFestivalState === "all" || 
                         fest.state === "All States" || 
                         fest.state.toLowerCase().includes(activeFestivalState.toLowerCase());
      return matchMonth && matchState;
    });

    if (filtered.length === 0) {
      list.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:3rem; color:var(--text-muted);">
          <div style="font-size:3rem; margin-bottom:0.75rem;">🎭</div>
          <p>No major festivals found matching your filters for this month.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = filtered.map(fest => `
      <div class="panel spotlight-card" style="border-color:${fest.color}77; background:radial-gradient(circle at top right, ${fest.color}15 -20%, var(--card-bg) 80%); display:flex; flex-direction:column; gap:0.75rem;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem;">
          <h4 style="font-size:1.1rem; font-weight:700; color:var(--text-primary); margin:0;">${fest.name}</h4>
          <span style="font-size:0.75rem; font-weight:600; padding:0.2rem 0.5rem; border-radius:9999px; background:${fest.color}22; color:${fest.color}; border:1px solid ${fest.color}44;">
            ${fest.type}
          </span>
        </div>
        <div style="font-size:0.85rem; color:var(--text-secondary); display:flex; flex-direction:column; gap:0.25rem;">
          <div>📅 <strong>Dates:</strong> ${fest.date}</div>
          <div>📍 <strong>States:</strong> ${fest.state}</div>
        </div>
        <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.45; margin:0; flex-grow:1;">
          ${fest.desc}
        </p>
        <button class="visualizer-btn btn-plan-fest" data-name="${fest.name}" data-state="${fest.state}" style="margin-top:0.5rem; width:100%; border-color:${fest.color}55; background:rgba(255,255,255,0.02); color:var(--text-primary);">
          🧭 Plan Around This Festival
        </button>
      </div>
    `).join('');

    list.querySelectorAll('.btn-plan-fest').forEach(btn => {
      btn.addEventListener('click', () => {
        const festName = btn.dataset.name;
        const stateNameStr = btn.dataset.state;
        
        let targetCity = "mumbai";
        const firstState = stateNameStr.split(',')[0].trim();
        if (firstState && firstState !== "All States" && TOURISM_DATABASE[firstState]) {
          targetCity = TOURISM_DATABASE[firstState].capital;
        }

        const tripNameInput = document.getElementById("trip-name-input");
        if (tripNameInput) {
          tripNameInput.value = `${festName} Trip`;
        }

        addTripStopExternal(targetCity);
      });
    });
  }

  function renderUpcomingFestivals() {
    const list = document.getElementById("upcoming-festivals-list");
    if (!list) return;

    const currentMonth = new Date().getMonth();
    
    const sorted = [...FESTIVALS_DATA].sort((a, b) => {
      let diffA = a.month - currentMonth;
      if (diffA < 0) diffA += 12;
      let diffB = b.month - currentMonth;
      if (diffB < 0) diffB += 12;
      return diffA - diffB;
    });

    const nextThree = sorted.slice(0, 3);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    list.innerHTML = nextThree.map(fest => `
      <div style="padding:0.75rem; border-radius:8px; background:rgba(255,255,255,0.03); border:1px solid var(--card-border); display:flex; align-items:center; justify-content:space-between; gap:1rem;">
        <div>
          <div style="font-weight:600; font-size:0.9rem; color:var(--text-primary);">${fest.name}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.15rem;">
            📅 ${fest.date} (${monthNames[fest.month]})
          </div>
        </div>
        <span style="font-size:0.72rem; padding:0.15rem 0.45rem; border-radius:9999px; background:${fest.color}15; color:${fest.color}; border:1px solid ${fest.color}33;">
          ${fest.type}
        </span>
      </div>
    `).join('');
  }

  function initCompare() {
    if (compareInitialized) return;
    compareInitialized = true;

    const compInput1 = document.getElementById("compare-city-1");
    const compInput2 = document.getElementById("compare-city-2");
    const compDropdown1 = document.getElementById("compare-suggestions-dropdown-1");
    const compDropdown2 = document.getElementById("compare-suggestions-dropdown-2");
    const compList1 = document.getElementById("compare-suggestions-list-1");
    const compList2 = document.getElementById("compare-suggestions-list-2");

    const btnAddBoth = document.getElementById("compare-btn-add-both");

    if (compInput1) {
      compInput1.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (query.length > 0) {
          handleAutocompleteInput(compInput1, compDropdown1, compList1, null, query, 5, (selected) => {
            compInput1.value = capitalizeWord(selected);
            compDropdown1.classList.remove("active");
            cityCompare1 = selected;
            performCityComparison();
          });
          compDropdown1.classList.add("active");
        } else {
          compDropdown1.classList.remove("active");
        }
      });
    }

    if (compInput2) {
      compInput2.addEventListener("input", (e) => {
        const query = e.target.value.trim().toLowerCase();
        if (query.length > 0) {
          handleAutocompleteInput(compInput2, compDropdown2, compList2, null, query, 5, (selected) => {
            compInput2.value = capitalizeWord(selected);
            compDropdown2.classList.remove("active");
            cityCompare2 = selected;
            performCityComparison();
          });
          compDropdown2.classList.add("active");
        } else {
          compDropdown2.classList.remove("active");
        }
      });
    }

    document.addEventListener("click", (e) => {
      if (compInput1 && !compInput1.contains(e.target) && compDropdown1) compDropdown1.classList.remove("active");
      if (compInput2 && !compInput2.contains(e.target) && compDropdown2) compDropdown2.classList.remove("active");
    });

    if (btnAddBoth) {
      btnAddBoth.addEventListener("click", () => {
        if (!cityCompare1 || !cityCompare2) return;
        
        addTripStopExternal(cityCompare1);
        setTimeout(() => {
          addTripStopExternal(cityCompare2);
        }, 500);
      });
    }

    cityCompare1 = "mumbai";
    cityCompare2 = "delhi";
    if (compInput1) compInput1.value = "Mumbai";
    if (compInput2) compInput2.value = "Delhi";
    performCityComparison();
  }

  function getCityStatsForCompare(cityName) {
    cityName = cityName.trim().toLowerCase();
    const facts = computeLogisticsFacts(cityName, {lat: 0, lng: 0}, 1);
    const state = facts.state;
    const region = STATE_INFO[state]?.region || "India";
    const language = STATE_INFO[state]?.languages || "Hindi, English";
    
    let popTier = "Mid-sized Town";
    let climate = STATE_INFO[state]?.climate || "Tropical";
    let famous = "Known for local culture and regional landmarks.";
    let costRating = "Mid-Range";
    let costVal = 4000;
    let connectivity = "Standard (Road & Rail)";
    let bestTime = "Oct - Mar";

    if (CURATED_CITIES[cityName]) {
      popTier = CURATED_CITIES[cityName].popTier + " City";
      climate = CURATED_CITIES[cityName].climate;
      famous = CURATED_CITIES[cityName].famous;
      if (CURATED_CITIES[cityName].popTier === "Metro") {
        costRating = "Premium";
        costVal = 7000;
        connectivity = "Excellent (Airport, Rail & Expressways)";
      } else if (CURATED_CITIES[cityName].popTier === "Large") {
        costRating = "Mid-Range";
        costVal = 3500;
        connectivity = "High (Airport, Major Rail Junction)";
      } else {
        costRating = "Economy";
        costVal = 1800;
        connectivity = "Moderate (Rail & Highways)";
      }
    } else {
      let hash = 0;
      for (let i = 0; i < cityName.length; i++) hash = cityName.charCodeAt(i) + ((hash << 5) - hash);
      hash = Math.abs(hash);
      const popTiers = ["Small Town", "Mid-sized Town", "Large City", "Metropolitan"];
      popTier = popTiers[hash % popTiers.length];
      
      const connectivityTiers = ["Moderate (Roads/Buses)", "Standard (Rail & Highways)", "High (Rail & Domestic Flights)"];
      connectivity = connectivityTiers[hash % connectivityTiers.length];
      
      if (popTier === "Metropolitan") {
        costRating = "Premium";
        costVal = 6000;
      } else if (popTier === "Large City") {
        costRating = "Mid-Range";
        costVal = 3200;
      } else {
        costRating = "Economy";
        costVal = 1500;
      }
    }

    if (climate.toLowerCase().includes("alpine") || climate.toLowerCase().includes("cold")) {
      bestTime = "Mar - Jun, Sep - Nov";
    } else if (climate.toLowerCase().includes("monsoon") || climate.toLowerCase().includes("wet")) {
      bestTime = "Nov - Feb";
    }

    return {
      cityName: capitalizeWord(cityName),
      state,
      region,
      language,
      popTier,
      climate,
      famous,
      costRating,
      costVal,
      connectivity,
      bestTime
    };
  }

  function performCityComparison() {
    if (!cityCompare1 || !cityCompare2) return;
    
    const c1 = getCityStatsForCompare(cityCompare1);
    const c2 = getCityStatsForCompare(cityCompare2);

    const container = document.getElementById("compare-table-rows");
    if (!container) return;

    const rows = [
      { label: "📍 State & Region", v1: `${c1.state} (${c1.region})`, v2: `${c2.state} (${c2.region})` },
      { label: "🌡️ Climate & Weather", v1: c1.climate, v2: c2.climate },
      { label: "👥 Population Tier", v1: c1.popTier, v2: c2.popTier },
      { label: "🗣️ Primary Languages", v1: c1.language, v2: c2.language },
      { label: "✨ Famous For", v1: c1.famous, v2: c2.famous },
      { label: "💰 Est. Daily Cost", v1: `${c1.costRating} (approx. ₹${c1.costVal.toLocaleString()})`, v2: `${c2.costRating} (approx. ₹${c2.costVal.toLocaleString()})` },
      { label: "✈️ Travel Connectivity", v1: c1.connectivity, v2: c2.connectivity },
      { label: "📅 Best Season to Visit", v1: c1.bestTime, v2: c2.bestTime }
    ];

    container.innerHTML = rows.map(row => `
      <tr>
        <td style="font-weight:600; color:var(--color-primary); width:200px; padding:0.85rem; border-bottom:1px solid rgba(255,255,255,0.05);">${row.label}</td>
        <td style="color:var(--text-primary); padding:0.85rem; border-bottom:1px solid rgba(255,255,255,0.05); text-align:center; width:40%; border-right:1px solid rgba(255,255,255,0.05);">${row.v1}</td>
        <td style="color:var(--text-primary); padding:0.85rem; border-bottom:1px solid rgba(255,255,255,0.05); text-align:center; width:40%;">${row.v2}</td>
      </tr>
    `).join('');

    let budgetWinner = c1.costVal < c2.costVal ? c1.cityName : c2.cityName;
    if (c1.costVal === c2.costVal) budgetWinner = "Tie! (Both are equivalent)";

    let heritageWinner = c1.famous.toLowerCase().includes("temple") || c1.famous.toLowerCase().includes("fort") || c1.famous.toLowerCase().includes("palace") || c1.famous.toLowerCase().includes("heritage") ? c1.cityName : c2.cityName;
    if (c1.famous.toLowerCase().includes("historic") && !c2.famous.toLowerCase().includes("historic")) heritageWinner = c1.cityName;
    if (c2.famous.toLowerCase().includes("historic") && !c1.famous.toLowerCase().includes("historic")) heritageWinner = c2.cityName;
    if (heritageWinner === c1.cityName && heritageWinner === c2.cityName) heritageWinner = "Tie! (Both are highly historical)";

    let foodieWinner = c1.cityName;
    if (c2.state === "Maharashtra" || c2.state === "Delhi" || c2.state === "Uttar Pradesh" || c2.famous.toLowerCase().includes("food")) foodieWinner = c2.cityName;

    let adventureWinner = c1.climate.toLowerCase().includes("alpine") || c1.climate.toLowerCase().includes("highland") || c1.climate.toLowerCase().includes("coastal") ? c1.cityName : c2.cityName;
    if (c2.climate.toLowerCase().includes("alpine") || c2.climate.toLowerCase().includes("highland") || c2.climate.toLowerCase().includes("coastal")) adventureWinner = c2.cityName;

    const verdictBox = document.getElementById("compare-verdict-box");
    if (verdictBox) {
      verdictBox.innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:1rem;">
          <div style="padding:0.75rem; border-radius:6px; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.15);">
            <div style="font-size:0.8rem; color:var(--color-success); font-weight:700;">🪙 Budget Traveler</div>
            <div style="font-weight:600; font-size:1rem; color:var(--text-primary); margin-top:0.25rem;">${budgetWinner}</div>
          </div>
          <div style="padding:0.75rem; border-radius:6px; background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.15);">
            <div style="font-size:0.8rem; color:var(--color-accent); font-weight:700;">🏺 Heritage Lover</div>
            <div style="font-weight:600; font-size:1rem; color:var(--text-primary); margin-top:0.25rem;">${heritageWinner}</div>
          </div>
          <div style="padding:0.75rem; border-radius:6px; background:rgba(236,72,153,0.06); border:1px solid rgba(236,72,153,0.15);">
            <div style="font-size:0.8rem; color:#ec4899; font-weight:700;">😋 Foodie's Pick</div>
            <div style="font-weight:600; font-size:1rem; color:var(--text-primary); margin-top:0.25rem;">${foodieWinner}</div>
          </div>
          <div style="padding:0.75rem; border-radius:6px; background:rgba(139,92,246,0.06); border:1px solid rgba(139,92,246,0.15);">
            <div style="font-size:0.8rem; color:var(--color-purple); font-weight:700;">🏔️ Adventure Seeker</div>
            <div style="font-weight:600; font-size:1rem; color:var(--text-primary); margin-top:0.25rem;">${adventureWinner}</div>
          </div>
        </div>
      `;
    }
    
    document.getElementById("compare-btn-add-both").style.display = "inline-block";
  }

  function initBudget() {
    if (budgetInitialized) return;
    budgetInitialized = true;

    const inputs = ["budget-travelers", "budget-days", "budget-style", "budget-transport", "budget-stay", "budget-food"];
    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("change", calculateTravelBudget);
        el.addEventListener("input", calculateTravelBudget);
      }
    });

    const btnSync = document.getElementById("budget-btn-sync");
    if (btnSync) {
      btnSync.addEventListener("click", () => {
        syncFromTripPlanner();
        playTone(700, "sine", 0.05, 0.1);
        const rect = btnSync.getBoundingClientRect();
        spawnParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 15, "var(--color-success)");
      });
    }

    const btnCopyBudget = document.getElementById("budget-btn-copy");
    if (btnCopyBudget) {
      btnCopyBudget.addEventListener("click", () => {
        copyBudgetToClipboard();
      });
    }

    calculateTravelBudget();
  }

  function syncFromTripPlanner() {
    if (tripStops.length === 0) {
      alert("No stops found in your Trip Planner. Add some cities to your trip first!");
      return;
    }

    let totalDays = 0;
    tripStops.forEach(stop => {
      totalDays += parseInt(stop.nights) || 0;
    });
    totalDays = totalDays > 0 ? totalDays : 1;

    const tripBudgetSelect = document.getElementById("trip-budget-select");
    const selectedStyle = tripBudgetSelect ? tripBudgetSelect.value : "mid";

    const daysInput = document.getElementById("budget-days");
    if (daysInput) daysInput.value = totalDays;

    const styleSelect = document.getElementById("budget-style");
    if (styleSelect) styleSelect.value = selectedStyle;

    const staySelect = document.getElementById("budget-stay");
    const foodSelect = document.getElementById("budget-food");
    const transportSelect = document.getElementById("budget-transport");

    if (selectedStyle === "budget") {
      if (staySelect) staySelect.value = "hostel";
      if (foodSelect) foodSelect.value = "street";
      if (transportSelect) transportSelect.value = "train";
    } else if (selectedStyle === "mid") {
      if (staySelect) staySelect.value = "hotel";
      if (foodSelect) foodSelect.value = "restaurant";
      if (transportSelect) transportSelect.value = "bus";
    } else {
      if (staySelect) staySelect.value = "resort";
      if (foodSelect) foodSelect.value = "fine";
      if (transportSelect) transportSelect.value = "flight";
    }

    calculateTravelBudget();
    alert(`Synced! Loaded ${tripStops.length} cities and estimated ${totalDays} total days from your Trip Planner.`);
  }

  function calculateTravelBudget() {
    const travelersInput = document.getElementById("budget-travelers");
    const daysInput = document.getElementById("budget-days");
    const styleSelect = document.getElementById("budget-style");
    const transportSelect = document.getElementById("budget-transport");
    const staySelect = document.getElementById("budget-stay");
    const foodSelect = document.getElementById("budget-food");

    if (!travelersInput || !daysInput) return;

    const travelers = parseInt(travelersInput.value) || 1;
    const days = parseInt(daysInput.value) || 1;
    const style = styleSelect ? styleSelect.value : "mid";
    const transport = transportSelect ? transportSelect.value : "bus";
    const stay = staySelect ? staySelect.value : "hotel";
    const food = foodSelect ? foodSelect.value : "restaurant";

    let stayRate = 1200;
    if (stay === "hostel") stayRate = 450;
    if (stay === "resort") stayRate = 6000;

    let foodRate = 600;
    if (food === "street") foodRate = 250;
    if (food === "fine") foodRate = 2200;

    let transportRate = 500;
    if (transport === "train") transportRate = 300;
    if (transport === "flight") transportRate = 2500;
    if (transport === "drive") transportRate = 1200;

    let multiplier = 1.0;
    if (style === "budget") multiplier = 0.8;
    if (style === "luxury") multiplier = 2.5;

    const dailyStay = Math.round(stayRate * multiplier);
    const dailyFood = Math.round(foodRate * multiplier);
    
    const dailyTransport = Math.round(transportRate * (transport === "flight" ? 0.6 : 1.0));
    
    const dailyMisc = style === "budget" ? 200 : (style === "mid" ? 500 : 1500);

    const totalStay = dailyStay * days * Math.ceil(travelers / 2);
    const totalFood = dailyFood * days * travelers;
    const totalTransport = dailyTransport * days * travelers;
    const totalMisc = dailyMisc * days * travelers;

    const grandTotal = totalStay + totalFood + totalTransport + totalMisc;
    const perPersonTotal = Math.round(grandTotal / travelers);
    const perPersonDaily = Math.round(perPersonTotal / days);

    const calcStay = document.getElementById("calc-total-accommodation");
    const calcFood = document.getElementById("calc-total-food");
    const calcTrans = document.getElementById("calc-total-transport");
    const calcMisc = document.getElementById("calc-total-misc");
    const calcGrand = document.getElementById("calc-grand-total");
    const calcPP = document.getElementById("calc-per-person");

    if (calcStay) calcStay.textContent = `₹${totalStay.toLocaleString()}`;
    if (calcFood) calcFood.textContent = `₹${totalFood.toLocaleString()}`;
    if (calcTrans) calcTrans.textContent = `₹${totalTransport.toLocaleString()}`;
    if (calcMisc) calcMisc.textContent = `₹${totalMisc.toLocaleString()}`;
    if (calcGrand) calcGrand.textContent = `₹${grandTotal.toLocaleString()}`;
    if (calcPP) calcPP.textContent = `₹${perPersonTotal.toLocaleString()} total (₹${perPersonDaily.toLocaleString()}/day)`;

    const gauge = document.getElementById("budget-health-gauge");
    const gaugeLabel = document.getElementById("budget-health-label");
    if (gauge && gaugeLabel) {
      let pct = 0;
      let status = "On Track (Economy)";
      let color = "var(--color-success)";

      if (perPersonDaily < 2000) {
        pct = Math.round((perPersonDaily / 2000) * 100 * 0.4);
        status = "🌿 On Track (Economy Budget)";
        color = "var(--color-success)";
      } else if (perPersonDaily < 6000) {
        pct = 40 + Math.round(((perPersonDaily - 2000) / 4000) * 100 * 0.35);
        status = "🏨 Balanced (Mid-Range Comfort)";
        color = "var(--color-primary)";
      } else {
        pct = 75 + Math.min(Math.round(((perPersonDaily - 6000) / 10000) * 100 * 0.25), 25);
        status = "✨ Splurge Zone (Luxury Stay)";
        color = "var(--color-purple)";
      }

      gauge.style.width = `${pct}%`;
      gauge.style.background = color;
      gaugeLabel.textContent = status;
      gaugeLabel.style.color = color;
    }
  }

  function copyBudgetToClipboard() {
    const calcStay = document.getElementById("calc-total-accommodation");
    const calcFood = document.getElementById("calc-total-food");
    const calcTrans = document.getElementById("calc-total-transport");
    const calcMisc = document.getElementById("calc-total-misc");
    const calcGrand = document.getElementById("calc-grand-total");
    const calcPP = document.getElementById("calc-per-person");

    const accommodation = calcStay ? calcStay.textContent : "₹0";
    const food = calcFood ? calcFood.textContent : "₹0";
    const transport = calcTrans ? calcTrans.textContent : "₹0";
    const misc = calcMisc ? calcMisc.textContent : "₹0";
    const grandTotal = calcGrand ? calcGrand.textContent : "₹0";
    const perPerson = calcPP ? calcPP.textContent : "₹0";

    const travelersInput = document.getElementById("budget-travelers");
    const daysInput = document.getElementById("budget-days");
    const styleSelect = document.getElementById("budget-style");

    const travelers = travelersInput ? travelersInput.value : "1";
    const days = daysInput ? daysInput.value : "7";
    const style = styleSelect ? styleSelect.options[styleSelect.selectedIndex].text : "Standard";

    const text = `💰 ARVORA TRAVEL BUDGET ESTIMATE 💰
-----------------------------------------
Trip Duration: ${days} days
Total Travelers: ${travelers}
Travel Style: ${style}

Estimated Cost Breakdown:
🏨 Accommodation: ${accommodation}
🍲 Food & Meals: ${food}
✈️ Transport: ${transport}
🛍️ Miscellaneous & Shopping: ${misc}

-----------------------------------------
GRAND TOTAL: ${grandTotal}
Per Person: ${perPerson}
Generated by Arvora (India City Autocomplete & Planner) 🚀`;

    navigator.clipboard.writeText(text).then(() => {
      alert("Budget breakdown copied to clipboard!");
    }).catch(err => {
      console.error("Could not copy text: ", err);
    });
  }

});
