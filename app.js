/* ARVORA — Spatial Intelligence & Cultural Portal Core Engine */

document.addEventListener('DOMContentLoaded', () => {

  // ========================================================
  // 1. AMBIENT CANVAS PARTICLE & SPORE SYSTEM
  // ========================================================
  const particleCanvas = document.getElementById('ambient-canvas');
  if (particleCanvas) {
    const ctx = particleCanvas.getContext('2d');
    let width = (particleCanvas.width = window.innerWidth);
    let height = (particleCanvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = particleCanvas.width = window.innerWidth;
      height = particleCanvas.height = window.innerHeight;
    });

    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 0.8,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: -Math.random() * 0.5 - 0.1,
      alpha: Math.random() * 0.6 + 0.2,
      pulse: Math.random() * 0.02 + 0.005
    }));

    function animateParticles() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.alpha += Math.sin(Date.now() * p.pulse) * 0.008;

        if (p.y < 0) p.y = height;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168, 213, 181, ${Math.max(0.1, Math.min(0.8, p.alpha))})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(140, 210, 160, 0.6)';
        ctx.fill();
      });
      requestAnimationFrame(animateParticles);
    }
    animateParticles();
  }

  // ========================================================
  // 2. WEB AUDIO API SYNTHESIZER FOR SOUNDSCAPES
  // ========================================================
  let audioCtx = null;
  let isAudioPlaying = false;
  let activeSoundType = 'rain';
  let soundInterval = null;

  function initAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
  }

  function playSoundscape(type) {
    initAudioContext();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    stopSoundscape();
    isAudioPlaying = true;
    activeSoundType = type;
    updateAudioUI();

    if (type === 'chimes') {
      const frequencies = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // Pentatonic C major
      soundInterval = setInterval(() => {
        if (!isAudioPlaying) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const freq = frequencies[Math.floor(Math.random() * frequencies.length)];
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 3.5);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 3.5);
      }, 1200);
    } else if (type === 'rain') {
      // Pink Noise Rain Generator
      const bufferSize = 2 * audioCtx.sampleRate;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.05;
        b6 = white * 0.115926;
      }
      const whiteNoise = audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.12;

      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      whiteNoise.start();
      soundInterval = whiteNoise;
    } else if (type === 'crickets') {
      soundInterval = setInterval(() => {
        if (!isAudioPlaying) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 4500 + Math.random() * 300;
        gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      }, 400);
    } else if (type === 'waves') {
      const bufferSize = audioCtx.sampleRate * 3;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.02, audioCtx.currentTime);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start();
      soundInterval = noise;
    }
  }

  function stopSoundscape() {
    isAudioPlaying = false;
    if (soundInterval) {
      if (typeof soundInterval === 'number') clearInterval(soundInterval);
      else if (soundInterval.stop) {
        try { soundInterval.stop(); } catch (e) {}
      }
      soundInterval = null;
    }
    updateAudioUI();
  }

  function updateAudioUI() {
    const audioBtn = document.getElementById('audio-toggle-btn');
    const audioLabel = document.getElementById('audio-label');
    if (!audioBtn || !audioLabel) return;

    if (isAudioPlaying) {
      audioBtn.classList.add('playing');
      const soundNames = { rain: 'Canopy Rain', chimes: 'Temple Chimes', crickets: 'Night Grove', waves: 'Ghat Waves' };
      audioLabel.textContent = `Playing: ${soundNames[activeSoundType] || activeSoundType}`;
    } else {
      audioBtn.classList.remove('playing');
      audioLabel.textContent = 'Ambient Off';
    }

    document.querySelectorAll('.sound-option').forEach(opt => {
      if (opt.dataset.sound === activeSoundType && isAudioPlaying) opt.classList.add('active');
      else opt.classList.remove('active');
    });
  }

  const audioToggleBtn = document.getElementById('audio-toggle-btn');
  if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', () => {
      if (isAudioPlaying) stopSoundscape();
      else playSoundscape(activeSoundType);
    });
  }

  document.querySelectorAll('.sound-option').forEach(btn => {
    btn.addEventListener('click', () => {
      playSoundscape(btn.dataset.sound);
    });
  });

  // ========================================================
  // 3. FEATURE DATA DEFINITIONS
  // ========================================================
  const FEATURES_DATABASE = {
    marketplace: {
      id: 'marketplace',
      title: 'GI Craft & Artisan Marketplace',
      category: 'craft',
      desc: 'Discover verified local craft producers, master artisans, and authentic products with live craft provenance calculator and order simulation.',
      highlights: ['GI Certified Origin', 'Direct Artisan Fair Trade', 'Provenance Blockchain ID'],
      items: [
        {
          name: 'Bidriware Silver Inlay Vase',
          origin: 'Bidar, Karnataka',
          artisan: 'Master Artisan Ghulam Mir',
          price: '₹8,400',
          priceVal: 8400,
          tag: 'GI Tagged #28',
          img: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
          desc: 'Zinc and copper alloy blackened with soil from Bidar Fort, inlaid with pure 99.9% silver sheet leaf wire.'
        },
        {
          name: 'Kashmir Pashmina Hand-Embroidered Shawl',
          origin: 'Srinagar, Jammu & Kashmir',
          artisan: 'Begum Shabnam & Artisans',
          price: '₹24,500',
          priceVal: 24500,
          tag: 'GI Tagged #44',
          img: 'https://images.unsplash.com/photo-1606744888344-493238951221?auto=format&fit=crop&w=600&q=80',
          desc: '100% pure Changthangi goat cashmere hand-spun on wooden wheels and hand-embroidered with classic Sozni needlework.'
        },
        {
          name: 'Tanjore Gold Leaf Temple Painting',
          origin: 'Thanjavur, Tamil Nadu',
          artisan: 'Shri R. Swaminathan',
          price: '₹18,000',
          priceVal: 18000,
          tag: 'GI Tagged #12',
          img: 'https://images.unsplash.com/photo-1582562124811-c09040d0a901?auto=format&fit=crop&w=600&q=80',
          desc: 'Embedded with authentic 22-karat gold foil leaves and Jaipur semi-precious stones depicting Lord Krishna.'
        },
        {
          name: 'Madhubani Folk Canvas Painting',
          origin: 'Mithila, Bihar',
          artisan: 'Sita Devi Master Guild',
          price: '₹6,200',
          priceVal: 6200,
          tag: 'GI Tagged #65',
          img: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80',
          desc: 'Natural dyes extracted from indigo, turmeric, neem, and madder painted with bamboo twigs on hand-made paper.'
        },
        {
          name: 'Channapatna Wooden Eco Toys',
          origin: 'Ramanagara, Karnataka',
          artisan: 'Gowda Craft Cooperative',
          price: '₹1,850',
          priceVal: 1850,
          tag: 'GI Tagged #09',
          img: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=600&q=80',
          desc: 'Turned Wrightia tinctoria wood polished with non-toxic natural vegetable lac dyes. Safe for children.'
        },
        {
          name: 'Jaipur Blue Pottery Floral Urn',
          origin: 'Jaipur, Rajasthan',
          artisan: 'Kripal Kumbh Guild',
          price: '₹4,900',
          priceVal: 4900,
          tag: 'GI Tagged #51',
          img: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=600&q=80',
          desc: 'Turquoise quartz powder ceramic crafted without clay, hand-painted with cobalt oxide floral motifs.'
        }
      ]
    },
    heritage: {
      id: 'heritage',
      title: 'UNESCO Monuments 3D Scanner',
      category: 'heritage',
      desc: 'Interactive digital twin tours of ancient temple complexes and forts with point-cloud rendering, architectural hot-spots, and audio guide.',
      highlights: ['Point-Cloud & Mesh Render Modes', 'Cross-Section Elevation Slider', 'Voice Audio Guide Engine'],
      monuments: [
        {
          id: 'taj',
          name: 'Taj Mahal Complex',
          location: 'Agra, Uttar Pradesh',
          period: '1632–1653 CE (Mughal Dynasty)',
          points: 124000,
          desc: 'White marble mausoleum with symmetrical octagonal plan, inlaid Pietra Dura stonework, and four 40-meter minarets.',
          audio: 'Welcome to the Taj Mahal 3D scanner. Built by Emperor Shah Jahan in memory of Mumtaz Mahal, its octagonal structure utilizes perfect acoustic symmetry.'
        },
        {
          id: 'konark',
          name: 'Sun Temple Chariot',
          location: 'Konark, Odisha',
          period: '1250 CE (Eastern Ganga Dynasty)',
          points: 185000,
          desc: 'Conceived as a colossal 24-wheeled stone chariot of Lord Surya pulled by seven galloping horses with sundial accuracy.',
          audio: 'The Konark Sun Temple functions as an astronomical clock. Each of its 24 wheels features intricate carvings marking exact hours of daylight.'
        },
        {
          id: 'hampi',
          name: 'Vittala Temple Musical Pillars',
          location: 'Hampi, Karnataka',
          period: '15th Century (Vijayanagara Empire)',
          points: 156000,
          desc: 'Granite stone chariot pavilion surrounded by 56 sareshwara columns that emit musical notes when lightly tapped.',
          audio: 'You are viewing the Vittala Stone Chariot in Hampi. The surrounding monolithic granite pillars generate resonant musical notes corresponding to classic Indian ragas.'
        },
        {
          id: 'ellora',
          name: 'Kailasa Monolithic Temple (Cave 16)',
          location: 'Sambhaji Nagar, Maharashtra',
          period: '8th Century (Rashtrakuta Dynasty)',
          points: 220000,
          desc: 'World’s largest monolithic rock-cut monument carved top-down from a single basalt cliff face removing 200,000 tons of rock.',
          audio: 'Cave 16 Kailasa is a miracle of ancient engineering. Artisans carved downward from the top of the mountain peak without scaffolding or error.'
        }
      ]
    },
    'route-matrix': {
      id: 'route-matrix',
      title: 'Smart Intercity Route Matrix',
      category: 'transit',
      desc: 'Real-time multi-modal connectivity routing across Vande Bharat trains, air express, highways, and EV cabs with eco carbon scores.',
      highlights: ['Vande Bharat Rail Integration', 'Multi-Modal Price Aggregator', 'Eco Carbon Score Index'],
      routes: [
        {
          pair: 'Delhi → Varanasi',
          dist: '790 km',
          modes: [
            { mode: 'Vande Bharat Express (Train)', time: '8h 00m', price: '₹1,750', carbon: '14 kg CO₂', score: '98/100 (Recommended)' },
            { mode: 'IndiGo / Air India (Flight)', time: '1h 25m', price: '₹4,200', carbon: '88 kg CO₂', score: '82/100' },
            { mode: 'Purvanchal Expressway (EV Cab)', time: '10h 30m', price: '₹7,500', carbon: '0 kg CO₂ (Green Grid)', score: '90/100' }
          ]
        },
        {
          pair: 'Mumbai → Hampi (Hospet)',
          dist: '710 km',
          modes: [
            { mode: 'Sleeper Superfast Train', time: '13h 15m', price: '₹1,250', carbon: '18 kg CO₂', score: '94/100 (Scenic)' },
            { mode: 'Flight to Jindal Vijayanagar (Vidyanagar)', time: '1h 15m', price: '₹5,800', carbon: '92 kg CO₂', score: '85/100' },
            { mode: 'Luxury Sleeper Bus', time: '14h 00m', price: '₹1,600', carbon: '26 kg CO₂', score: '80/100' }
          ]
        },
        {
          pair: 'Bengaluru → Munnar (Ghat Pass)',
          dist: '475 km',
          modes: [
            { mode: 'Private EV SUV Drive', time: '8h 45m', price: '₹4,800', carbon: '0 kg CO₂', score: '96/100 (Top Eco)' },
            { mode: 'Train to Kochi + Taxi', time: '10h 20m', price: '₹2,100', carbon: '22 kg CO₂', score: '88/100' }
          ]
        }
      ]
    },
    stays: {
      id: 'stays',
      title: 'Boutique Heritage Stays',
      category: 'craft',
      desc: 'Handpicked Havelis, tea estate bungalows, and restored forest lodges with ambient atmospheric soundscapes.',
      highlights: ['Curated Heritage Estates', 'Atmospheric Ambient Audio', 'Organic Local Gastronomy'],
      properties: [
        {
          name: 'Chhatra Sagar Heritage Lake Fortress',
          location: 'Pali, Rajasthan',
          type: '19th Century Rajput Tent & Fort',
          price: '₹16,500 / night',
          rating: '4.95 ★',
          sound: 'rain',
          img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
          desc: 'Perched on a 100-year-old dam overlooking bird-rich wetlands with hand-painted floral canvas suites.'
        },
        {
          name: 'Glenburn Tea Estate Lodge',
          location: 'Darjeeling, West Bengal',
          type: 'Colonial Plantation Bungalow',
          price: '₹22,000 / night',
          rating: '4.98 ★',
          sound: 'chimes',
          img: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
          desc: 'Resting below Mount Kanchenjunga with private verandahs, tea picking walks, and bonfire dinners.'
        },
        {
          name: 'Kanha Earth Lodge Forest Villas',
          location: 'Kanha Tiger Reserve, Madhya Pradesh',
          type: 'Eco Mud & Timber Lodge',
          price: '₹18,200 / night',
          rating: '4.92 ★',
          sound: 'crickets',
          img: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80',
          desc: '16 acres of wilderness built using local mud, stone, and recycled wood near the National Park core.'
        },
        {
          name: 'Brunton Boatyard Colonial Haven',
          location: 'Fort Kochi, Kerala',
          type: 'Restored Dutch-Victorian Shipyard',
          price: '₹14,800 / night',
          rating: '4.89 ★',
          sound: 'waves',
          img: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80',
          desc: 'Overlooking Chinese fishing nets with punkah ceiling fans, teak four-poster beds, and seafood curries.'
        }
      ]
    },
    'bharat-travel': {
      id: 'bharat-travel',
      title: 'Bharat Travel Intelligence',
      category: 'transit',
      desc: 'Complete spatial intelligence, AI itinerary engine, budget planner, weather forecast, and packing assistant.',
      highlights: ['AI Itinerary Generator', 'Seasonal Festival Synch', 'Live Climate Forecast'],
      sampleItinerary: [
        { day: 'Day 1', title: 'Arrival & Sacred Ghats Evening Aarti', morning: 'Check into Heritage Haveli & sip Kulhad Chai', afternoon: 'Explore weaver alleyways in Madanpura', evening: 'Dashashwamedh Ghat boat ride during Ganga Aarti' },
        { day: 'Day 2', title: 'Ancient Sarnath & Silk Weaving Atelier', morning: 'Sunrise boat trip past Manikarnika', afternoon: 'Visit Dhamek Stupa & Sarnath Museum', evening: 'Exclusive dinner with master Banarasi saree weavers' },
        { day: 'Day 3', title: 'Temple Architecture & Culinary Codex', morning: 'Kashi Vishwanath Corridor & Annapurna Temple', afternoon: 'Street food walk (Tamatar Chaat, Malaiyo, Lassi)', evening: 'Departure via Vande Bharat Express' }
      ]
    },
    transport: {
      id: 'transport',
      title: '5-Mode Transport & Fares',
      category: 'transit',
      desc: 'Real-time unified price aggregator across bus, rail, cab, metro, and ferry with live timetables.',
      highlights: ['Unified Price Matrix', 'Live Timetable Synch', 'Carbon Rating per Mode'],
      modesList: [
        { mode: 'Vande Bharat Express Rail', avgFare: '₹1.8 / km', speed: '130 km/h', greenRating: 'High', reliability: '99%' },
        { mode: 'Regional Air Express', avgFare: '₹5.5 / km', speed: '750 km/h', greenRating: 'Low', reliability: '94%' },
        { mode: 'State Volvo Luxury Bus', avgFare: '₹2.2 / km', speed: '75 km/h', greenRating: 'Medium', reliability: '91%' },
        { mode: 'Electric Intercity Cab', avgFare: '₹8.0 / km', speed: '90 km/h', greenRating: 'High', reliability: '97%' },
        { mode: 'Inland Waterway Ferry', avgFare: '₹0.8 / km', speed: '25 km/h', greenRating: 'Ultra High', reliability: '95%' }
      ]
    },
    showcase: {
      id: 'showcase',
      title: '36 States & UTs Showcase',
      category: 'heritage',
      desc: 'In-depth visual showcase of culture, sights, local cuisine, and hidden gems across all Indian states and UTs.',
      highlights: ['28 States & 8 UTs Directory', 'Folk Art & Cuisine Codex', 'Virtual Postcard Generator'],
      states: [
        { name: 'Rajasthan', region: 'North', capital: 'Jaipur', sight: 'Amber Fort & Thar Desert', dish: 'Dal Baati Churma', art: 'Phad Painting & Ghoomar', img: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=600&q=80' },
        { name: 'Kerala', region: 'South', capital: 'Thiruvananthapuram', sight: 'Alleppey Backwaters & Munnar', dish: 'Appam with Ishtu', art: 'Kathakali & Theyyam', img: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80' },
        { name: 'Meghalaya', region: 'North-East', capital: 'Shillong', sight: 'Cherrapunji Living Root Bridges', dish: 'Jadoh with Tungrymbai', art: 'Khasi Bamboo Craft', img: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80' },
        { name: 'Ladakh', region: 'North', capital: 'Leh', sight: 'Pangong Tso & Hemis Monastery', dish: 'Thukpa & Skyu', art: 'Thangka Painting', img: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=600&q=80' },
        { name: 'Odisha', region: 'East', capital: 'Bhubaneswar', sight: 'Konark & Chilika Lake', dish: 'Dalma & Chhena Poda', art: 'Pattachitra & Odissi', img: 'https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?auto=format&fit=crop&w=600&q=80' },
        { name: 'Gujarat', region: 'West', capital: 'Gandhinagar', sight: 'Rann of Kutch & Gir Forest', dish: 'Dhokla & Undhiyu', art: 'Rogan Art & Garba', img: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=600&q=80' }
      ]
    },
    'eco-trails': {
      id: 'eco-trails',
      title: 'Sacred Groves & Eco Trails',
      category: 'nature',
      desc: 'Curated off-grid trekking trails through biodiversity-rich protected forests with elevation profiles and permit guides.',
      highlights: ['Interactive Elevation Profile', 'Forest Reserve Permits', 'Flora & Fauna Field Guide'],
      trails: [
        {
          name: 'Mawphlang Sacred Forest Trail',
          state: 'Meghalaya',
          length: '6.5 km loop',
          elevGain: '240 m',
          difficulty: 'Moderate',
          fauna: 'Ruddy Kingfisher, Khasi Pine, Monotropa uniflora',
          permit: 'Local Tribal Council Eco-Pass (Instant)',
          desc: 'Ancient sanctified forest where taking even a single leaf is forbidden by Khasi spiritual tradition.'
        },
        {
          name: 'Silent Valley National Park Rainforest Trek',
          state: 'Kerala',
          length: '12.0 km',
          elevGain: '480 m',
          difficulty: 'Challenging',
          fauna: 'Lion-Tailed Macaque, Malabar Giant Squirrel',
          permit: 'Kerala Forest Dept Escorted Pass',
          desc: 'Pristine evergreen rainforest in the Nilgiri Biosphere Reserve untouched by human settlement.'
        },
        {
          name: 'Valley of Flowers High Himalayan Pass',
          state: 'Uttarakhand',
          length: '14.0 km',
          elevGain: '1,100 m',
          difficulty: 'Advanced',
          fauna: 'Brahma Kamal, Snow Leopard, Blue Poppy',
          permit: 'Nanda Devi Biosphere Entry Permit',
          desc: 'UNESCO World Heritage high-altitude alpine meadow carpeted with endemic alpine blossoms.'
        }
      ]
    },
    map: {
      id: 'map',
      title: 'Interactive Spatial India Map',
      category: 'transit',
      desc: 'Explore all 3D monuments, boutique stays, GI craft hubs, and sacred groves directly on an interactive spatial canvas.',
      highlights: ['Multi-layer Pin Toggles', 'Instant Details Popover', 'Coordinates Engine']
    },
    worlds: {
      id: 'worlds',
      title: '12 Mystic Worlds Gallery',
      category: 'heritage',
      desc: 'Immerse into 12 thematic spatial realms across Bharat.',
      highlights: ['12 Distinct Ambiances', 'Procedural Audio Triggers', 'High-Res Artwork']
    },
    reel: {
      id: 'reel',
      title: 'Ambient Sound Reel Player',
      category: 'nature',
      desc: 'Relax with soothing soundscapes, visual canvas equalizers, and serene forest visual loops.',
      highlights: ['Canvas Audio Visualizer', 'Procedural Sound Generator', 'Relaxation Timer']
    }
  };

  // ========================================================
  // 4. UI INTERACTION ENGINE & MODAL / DRAWER HANDLERS
  // ========================================================
  const exploreBtn = document.getElementById('explore-btn');
  const drawer = document.getElementById('portal-drawer');
  const drawerClose = document.getElementById('drawer-close');
  const drawerGrid = document.getElementById('drawer-grid');
  const drawerSearch = document.getElementById('drawer-search-input');
  const featureSearch = document.getElementById('feature-search');
  const chipsContainer = document.getElementById('chips-container');
  const viewport = document.getElementById('naturecore-viewport');
  
  const modal = document.getElementById('feature-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const modalKicker = document.getElementById('modal-kicker');
  const modalHighlights = document.getElementById('modal-highlights');
  const modalLaunch = document.getElementById('modal-launch');
  const modalClose = document.getElementById('modal-close');

  const toolViewport = document.getElementById('tool-viewport');
  const toolHeaderTitle = document.getElementById('tool-header-title');
  const toolHeaderKicker = document.getElementById('tool-header-kicker');
  const toolContentBody = document.getElementById('tool-content-body');
  const toolBackBtn = document.getElementById('tool-back-btn');
  const toolQuickFilters = document.getElementById('tool-quick-filters');

  let activeToolId = null;

  function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  function openFeatureModal(toolId) {
    const data = FEATURES_DATABASE[toolId];
    if (!data) return;
    activeToolId = toolId;
    modalKicker.textContent = `FEATURE ENGINE • ${data.category.toUpperCase()}`;
    modalTitle.textContent = data.title;
    modalDesc.textContent = data.desc;
    
    if (data.highlights && modalHighlights) {
      modalHighlights.innerHTML = data.highlights
        .map(h => `<div class="highlight-chip">✦ ${h}</div>`).join('');
    }

    modal.classList.add('active');
  }

  function closeFeatureModal() {
    modal.classList.remove('active');
  }

  modalClose.addEventListener('click', closeFeatureModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeFeatureModal();
  });

  // Open active tool interface inside #tool-viewport
  function launchToolEngine(toolId) {
    closeFeatureModal();
    if (drawer) drawer.classList.remove('active');
    if (viewport) viewport.classList.remove('entering');

    const data = FEATURES_DATABASE[toolId] || FEATURES_DATABASE['marketplace'];
    activeToolId = data.id;

    // Update Header
    toolHeaderTitle.textContent = data.title;
    toolHeaderKicker.textContent = `ACTIVE ENGINE • ${data.category ? data.category.toUpperCase() : 'PORTAL'}`;
    
    // Hide default hero/nav/tray
    const heroLockup = document.getElementById('hero-lockup');
    const mythicNav = document.querySelector('.mythic-nav');
    const reverieTray = document.getElementById('reverie-glass-tray');
    if (heroLockup) heroLockup.style.display = 'none';
    if (mythicNav) mythicNav.style.display = 'none';
    if (reverieTray) reverieTray.style.display = 'none';

    // Show tool viewport container
    toolViewport.style.display = 'flex';

    // Render Engine Content
    renderToolContent(data.id);

    // Update active chip styling
    document.querySelectorAll('.feature-chip').forEach(c => {
      if (c.dataset.toolId === data.id) c.classList.add('active-chip');
      else c.classList.remove('active-chip');
    });

    showToast(`Loaded ${data.title}`);
  }

  toolBackBtn.addEventListener('click', () => {
    toolViewport.style.display = 'none';
    const heroLockup = document.getElementById('hero-lockup');
    const mythicNav = document.querySelector('.mythic-nav');
    const reverieTray = document.getElementById('reverie-glass-tray');
    if (heroLockup) heroLockup.style.display = 'block';
    if (mythicNav) mythicNav.style.display = 'flex';
    if (reverieTray) reverieTray.style.display = 'flex';
  });

  modalLaunch.addEventListener('click', () => {
    if (activeToolId) launchToolEngine(activeToolId);
  });

  // Taskbar Chip Click
  document.querySelectorAll('.feature-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      const id = chip.dataset.toolId;
      openFeatureModal(id);
    });
  });

  // Taskbar live search filter
  if (featureSearch) {
    featureSearch.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('.feature-chip').forEach(chip => {
        const text = chip.textContent.toLowerCase();
        chip.style.display = text.includes(q) ? 'inline-block' : 'none';
      });
    });
  }

  // Right-side glass tray clicks
  document.querySelectorAll('.tray-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      if (action) launchToolEngine(action);
    });
  });

  // Parallax mouse motion on SVG arch
  const archGraphic = document.querySelector('.arch-svg-graphic');
  window.addEventListener('pointermove', (e) => {
    if (archGraphic && viewport && !viewport.classList.contains('entering')) {
      const x = (e.clientX / window.innerWidth - 0.5) * 26;
      const y = (e.clientY / window.innerHeight - 0.5) * 18;
      archGraphic.style.transform = `translate(calc(-50% + ${x}px), calc(-46% + ${y}px))`;
    }
  }, { passive: true });

  // Drawer logic
  function populateDrawer(categoryFilter = 'all') {
    if (!drawerGrid) return;
    drawerGrid.innerHTML = '';
    Object.values(FEATURES_DATABASE).forEach(item => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return;
      const card = document.createElement('div');
      card.className = 'drawer-card';
      card.innerHTML = `
        <h4>✦ ${item.title}</h4>
        <p>${item.desc}</p>
      `;
      card.addEventListener('click', () => {
        openFeatureModal(item.id);
      });
      drawerGrid.appendChild(card);
    });
  }

  function openPortalDrawer() {
    populateDrawer();
    viewport.classList.add('entering');
    setTimeout(() => {
      drawer.classList.add('active');
      if (drawerSearch) drawerSearch.focus();
    }, 200);
  }

  if (exploreBtn) exploreBtn.addEventListener('click', openPortalDrawer);
  if (drawerClose) drawerClose.addEventListener('click', () => {
    drawer.classList.remove('active');
    viewport.classList.remove('entering');
  });

  document.getElementById('nav-brand-logo').addEventListener('click', (e) => {
    e.preventDefault();
    openPortalDrawer();
  });

  // Mythic Header Nav Links
  document.querySelectorAll('.mythic-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const navTarget = link.dataset.nav;
      if (navTarget === 'craft') launchToolEngine('marketplace');
      else if (navTarget === 'worlds') launchToolEngine('worlds');
      else if (navTarget === 'immersions') launchToolEngine('reel');
      else if (navTarget === 'atelier') launchToolEngine('heritage');
      else if (navTarget === 'codex') launchToolEngine('showcase');
      else if (navTarget === 'connect') launchToolEngine('bharat-travel');
      else openPortalDrawer();
    });
  });

  // Drawer Category Tabs
  document.querySelectorAll('.drawer-category-tabs .tab-chip').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.drawer-category-tabs .tab-chip').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      populateDrawer(tab.dataset.category);
    });
  });

  if (drawerSearch) {
    drawerSearch.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      document.querySelectorAll('.drawer-card').forEach(card => {
        card.style.display = card.textContent.toLowerCase().includes(q) ? 'block' : 'none';
      });
    });
  }

  // ========================================================
  // 5. ENGINE RENDERING ENGINE (TOOL VIEWS IMPLEMENTATION)
  // ========================================================
  function renderToolContent(toolId) {
    toolContentBody.innerHTML = '';
    toolQuickFilters.innerHTML = '';

    if (toolId === 'marketplace') {
      renderMarketplaceView();
    } else if (toolId === 'heritage') {
      renderHeritage3DView();
    } else if (toolId === 'route-matrix') {
      renderRouteMatrixView();
    } else if (toolId === 'stays') {
      renderStaysView();
    } else if (toolId === 'bharat-travel') {
      renderBharatTravelView();
    } else if (toolId === 'transport') {
      renderTransportView();
    } else if (toolId === 'showcase') {
      renderShowcaseView();
    } else if (toolId === 'eco-trails') {
      renderEcoTrailsView();
    } else if (toolId === 'map') {
      renderMapView();
    } else if (toolId === 'worlds') {
      renderWorldsView();
    } else if (toolId === 'reel') {
      renderReelView();
    } else {
      renderMarketplaceView();
    }
  }

  // --- A. GI CRAFT & ARTISAN MARKETPLACE ---
  function renderMarketplaceView() {
    const data = FEATURES_DATABASE['marketplace'];
    toolContentBody.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <p class="tool-subheading">${data.desc}</p>
        <button class="btn-tool-action" id="btn-craft-calc">🧮 Craft Order Calculator</button>
      </div>
      <div class="grid-cards" id="craft-grid"></div>
    `;

    const grid = document.getElementById('craft-grid');
    data.items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'tool-card';
      card.innerHTML = `
        <div class="card-img-wrap">
          <img src="${item.img}" alt="${item.name}" loading="lazy">
          <span class="badge-tag">${item.tag}</span>
        </div>
        <div class="card-body">
          <div>
            <h3 class="card-title">${item.name}</h3>
            <div style="font-size: 11px; color: var(--accent-sage); margin-bottom: 6px;">📍 ${item.origin} • ${item.artisan}</div>
            <p class="card-desc">${item.desc}</p>
          </div>
          <div class="card-meta">
            <span>${item.price}</span>
            <button class="btn-tool-action btn-order" data-name="${item.name}" data-price="${item.price}">Acquire Craft →</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    document.querySelectorAll('.btn-order').forEach(btn => {
      btn.addEventListener('click', () => {
        showToast(`Order initiated for ${btn.dataset.name} (${btn.dataset.price}). Verified Artisan dispatched!`);
      });
    });

    const calcBtn = document.getElementById('btn-craft-calc');
    if (calcBtn) {
      calcBtn.addEventListener('click', () => {
        let total = data.items.reduce((acc, curr) => acc + curr.priceVal, 0);
        showToast(`Curated Collection Total Value: ₹${total.toLocaleString('en-IN')} (Includes GI Verification & Insured Shipping)`);
      });
    }
  }

  // --- B. UNESCO MONUMENTS 3D SCANNER ---
  function renderHeritage3DView() {
    const data = FEATURES_DATABASE['heritage'];
    toolContentBody.innerHTML = `
      <p class="tool-subheading">${data.desc}</p>
      <div class="scanner-viewport-container">
        <div class="canvas-3d-box">
          <div class="scanner-controls-overlay">
            <button class="scanner-mode-btn active" data-mode="points">Point-Cloud Mode</button>
            <button class="scanner-mode-btn" data-mode="wireframe">Wireframe Mesh</button>
            <button class="scanner-mode-btn" data-mode="solid">Textured Solid</button>
          </div>
          <canvas id="monument-3d-canvas"></canvas>
          <div style="position: absolute; bottom: 12px; left: 14px; right: 14px; display:flex; gap: 10px; align-items:center; background: rgba(4,10,7,0.85); padding: 8px 14px; border-radius: 999px; border: 1px solid var(--glass-border);">
            <span style="font-size: 11px; color: var(--text-muted);">Cross-Section Elevation:</span>
            <input type="range" id="elevation-slider" min="0" max="100" value="50" style="flex:1;">
            <span style="font-size: 11px; color: var(--accent-mint);" id="elev-val">Level: 50%</span>
          </div>
        </div>

        <div class="scanner-sidebar">
          <h3 style="font-family: var(--font-serif); font-size: 20px; color: var(--text-bright);">Select Monument Twin</h3>
          <div id="monument-list" style="display:flex; flex-direction:column; gap: 10px;"></div>
          <div style="margin-top: 10px; padding: 14px; background: rgba(237,244,236,0.05); border-radius: 12px; border: 1px solid var(--glass-border);">
            <div style="font-size: 11px; color: var(--accent-gold); font-weight: 700; margin-bottom: 4px;">SPEECH SYNTHESIS NARRATION</div>
            <p id="audio-guide-text" style="font-size: 12px; color: var(--text-muted); line-height: 1.45;">Click any monument below to launch live audio guide narration.</p>
            <button class="btn-tool-action" id="play-audio-guide" style="width: 100%; margin-top: 10px;">🔊 Play Audio Narration</button>
          </div>
        </div>
      </div>
    `;

    const canvas = document.getElementById('monument-3d-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    let selectedMon = data.monuments[0];
    let renderMode = 'points';
    let rotAngle = 0;
    let crossSection = 50;

    const listContainer = document.getElementById('monument-list');
    data.monuments.forEach(m => {
      const item = document.createElement('div');
      item.className = 'drawer-card';
      item.style.padding = '12px';
      item.innerHTML = `
        <div style="font-weight:700; font-size:14px; color:var(--text-bright);">${m.name}</div>
        <div style="font-size:11px; color:var(--accent-sage);">${m.location} • ${m.period}</div>
      `;
      item.addEventListener('click', () => {
        selectedMon = m;
        document.getElementById('audio-guide-text').textContent = m.audio;
        showToast(`Loaded ${m.name} 3D Scan (${m.points.toLocaleString()} vertices)`);
      });
      listContainer.appendChild(item);
    });

    document.querySelectorAll('.scanner-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.scanner-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderMode = btn.dataset.mode;
      });
    });

    const elevSlider = document.getElementById('elevation-slider');
    const elevVal = document.getElementById('elev-val');
    if (elevSlider) {
      elevSlider.addEventListener('input', (e) => {
        crossSection = e.target.value;
        elevVal.textContent = `Level: ${crossSection}%`;
      });
    }

    const playAudioBtn = document.getElementById('play-audio-guide');
    if (playAudioBtn) {
      playAudioBtn.addEventListener('click', () => {
        if ('speechSynthesis' in window) {
          const synth = window.speechSynthesis;
          synth.cancel();
          const utterance = new SpeechSynthesisUtterance(selectedMon.audio);
          utterance.pitch = 1.0;
          utterance.rate = 0.95;
          synth.speak(utterance);
          showToast(`Playing Voice Audio Guide for ${selectedMon.name}`);
        } else {
          showToast(`Audio Narration: "${selectedMon.audio}"`);
        }
      });
    }

    // Canvas 3D Pseudo Engine Rendering Loop
    function render3DCanvas() {
      if (!document.getElementById('monument-3d-canvas')) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2 + 20;
      rotAngle += 0.01;

      const numRings = 12;
      const pointsPerRing = 18;
      const cutoff = (crossSection / 100) * numRings;

      if (renderMode === 'wireframe') {
        ctx.strokeStyle = 'rgba(140, 210, 160, 0.4)';
        ctx.lineWidth = 1;
        for (let r = 0; r < cutoff; r++) {
          const radius = (numRings - r) * 12;
          const y = cy + (r - numRings / 2) * 16;
          ctx.beginPath();
          ctx.ellipse(cx, y, radius, radius * 0.4, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (renderMode === 'solid') {
        for (let r = 0; r < cutoff; r++) {
          const radius = (numRings - r) * 12;
          const y = cy + (r - numRings / 2) * 16;
          ctx.fillStyle = `rgba(15, 45, 25, ${0.4 + (r / numRings) * 0.5})`;
          ctx.beginPath();
          ctx.ellipse(cx, y, radius, radius * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Point cloud vertices
      for (let r = 0; r < cutoff; r++) {
        const radius = (numRings - r) * 12;
        const y = cy + (r - numRings / 2) * 16;
        for (let i = 0; i < pointsPerRing; i++) {
          const angle = (i / pointsPerRing) * Math.PI * 2 + rotAngle + r * 0.1;
          const px = cx + Math.cos(angle) * radius;
          const py = y + Math.sin(angle) * radius * 0.4;

          ctx.beginPath();
          ctx.arc(px, py, renderMode === 'points' ? 2 : 1.5, 0, Math.PI * 2);
          ctx.fillStyle = renderMode === 'points' ? 'rgba(168, 213, 181, 0.95)' : 'rgba(226, 192, 141, 0.8)';
          ctx.fill();
        }
      }

      requestAnimationFrame(render3DCanvas);
    }
    render3DCanvas();
  }

  // --- C. SMART INTERCITY ROUTE MATRIX ---
  function renderRouteMatrixView() {
    const data = FEATURES_DATABASE['route-matrix'];
    toolContentBody.innerHTML = `
      <p class="tool-subheading">${data.desc}</p>
      <div class="route-matrix-grid">
        <div class="route-form-panel">
          <h3 style="font-family: var(--font-serif); font-size: 20px; color: var(--text-bright);">Configure Intercity Corridor</h3>
          <div class="input-group">
            <label>Origin Hub</label>
            <select id="route-origin">
              <option value="Delhi">Delhi NCR</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Bengaluru">Bengaluru</option>
            </select>
          </div>
          <div class="input-group">
            <label>Destination Hub</label>
            <select id="route-dest">
              <option value="Varanasi">Varanasi</option>
              <option value="Hampi">Hampi (Hospet)</option>
              <option value="Munnar">Munnar Ghat</option>
            </select>
          </div>
          <div class="input-group">
            <label>Departure Date</label>
            <input type="date" value="2026-09-15">
          </div>
          <button class="btn-tool-action" id="btn-calc-route" style="margin-top: 10px;">⚡ Compute Multi-Modal Matrix</button>
        </div>

        <div class="route-results-panel" id="route-results-box">
          <!-- Populated dynamically -->
        </div>
      </div>
    `;

    function renderResults(routeIndex = 0) {
      const selected = data.routes[routeIndex] || data.routes[0];
      const resultsBox = document.getElementById('route-results-box');
      resultsBox.innerHTML = `
        <div style="font-size: 16px; font-weight: 700; color: var(--accent-mint); margin-bottom: 8px;">
          Corridor: ${selected.pair} (${selected.dist})
        </div>
      `;
      selected.modes.forEach(m => {
        const card = document.createElement('div');
        card.className = 'route-mode-card';
        card.innerHTML = `
          <div>
            <div style="font-weight:700; color:var(--text-bright); font-size:15px;">${m.mode}</div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">⏱️ Duration: ${m.time} • 🍃 Carbon: ${m.carbon}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:18px; font-weight:700; color:var(--accent-gold);">${m.price}</div>
            <div style="font-size:11px; color:var(--accent-mint); margin-top:2px;">Score: ${m.score}</div>
          </div>
        `;
        resultsBox.appendChild(card);
      });
    }
    renderResults(0);

    const calcBtn = document.getElementById('btn-calc-route');
    if (calcBtn) {
      calcBtn.addEventListener('click', () => {
        const randIdx = Math.floor(Math.random() * data.routes.length);
        renderResults(randIdx);
        showToast('Multi-Modal Corridor matrix calculated!');
      });
    }
  }

  // --- D. BOUTIQUE HERITAGE STAYS ---
  function renderStaysView() {
    const data = FEATURES_DATABASE['stays'];
    toolContentBody.innerHTML = `
      <p class="tool-subheading">${data.desc}</p>
      <div class="grid-cards">
        ${data.properties.map(p => `
          <div class="tool-card">
            <div class="card-img-wrap">
              <img src="${p.img}" alt="${p.name}" loading="lazy">
              <span class="badge-tag">${p.type}</span>
            </div>
            <div class="card-body">
              <div>
                <h3 class="card-title">${p.name}</h3>
                <div style="font-size:11px; color:var(--accent-sage); margin-bottom:6px;">📍 ${p.location} • ${p.rating}</div>
                <p class="card-desc">${p.desc}</p>
              </div>
              <div class="card-meta">
                <span>${p.price}</span>
                <button class="btn-tool-action btn-reserve-stay" data-name="${p.name}" data-sound="${p.sound}">Reserve Villa →</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    document.querySelectorAll('.btn-reserve-stay').forEach(btn => {
      btn.addEventListener('click', () => {
        playSoundscape(btn.dataset.sound);
        showToast(`Reserved ${btn.dataset.name}! Switched atmospheric soundscape.`);
      });
    });
  }

  // --- E. BHARAT TRAVEL INTELLIGENCE ---
  function renderBharatTravelView() {
    const data = FEATURES_DATABASE['bharat-travel'];
    toolContentBody.innerHTML = `
      <p class="tool-subheading">${data.desc}</p>
      <div style="display:grid; grid-template-columns: 1fr 2fr; gap: 20px;">
        <div class="route-form-panel">
          <h3 style="font-family: var(--font-serif); font-size: 20px; color: var(--text-bright);">Generate Spatial Itinerary</h3>
          <div class="input-group">
            <label>Destination Circuit</label>
            <select id="travel-circuit">
              <option value="Varanasi">Varanasi Sacred Heritage</option>
              <option value="Kochi">Kochi & Backwaters</option>
              <option value="Jaipur">Rajasthan Royal Forts</option>
            </select>
          </div>
          <div class="input-group">
            <label>Trip Duration</label>
            <select>
              <option>3 Days Immersion</option>
              <option>5 Days Deep Dive</option>
              <option>7 Days Grand Circuit</option>
            </select>
          </div>
          <div class="input-group">
            <label>Travel Vibe</label>
            <select>
              <option>Heritage & Craft Masterclasses</option>
              <option>Eco-Trekking & Forest Silence</option>
              <option>Culinary & Culinary Codex</option>
            </select>
          </div>
          <button class="btn-tool-action" id="btn-generate-ai-plan" style="margin-top:10px;">🪄 Generate AI Spatial Plan</button>
        </div>

        <div style="display:flex; flex-direction:column; gap: 14px;">
          ${data.sampleItinerary.map(item => `
            <div class="tool-card" style="padding:16px;">
              <div style="font-size:11px; color:var(--accent-gold); font-weight:700;">${item.day}</div>
              <h4 style="font-family:var(--font-serif); font-size:18px; color:var(--text-bright); margin-top:2px;">${item.title}</h4>
              <div style="font-size:12px; color:var(--text-muted); margin-top:8px; line-height:1.5;">
                🌅 <b>Morning:</b> ${item.morning}<br>
                ☀️ <b>Afternoon:</b> ${item.afternoon}<br>
                🌙 <b>Evening:</b> ${item.evening}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const genBtn = document.getElementById('btn-generate-ai-plan');
    if (genBtn) {
      genBtn.addEventListener('click', () => {
        showToast('AI Spatial Itinerary synthesized! Synched with local weather and artisan schedules.');
      });
    }
  }

  // --- F. 5-MODE TRANSPORT & FARES ---
  function renderTransportView() {
    const data = FEATURES_DATABASE['transport'];
    toolContentBody.innerHTML = `
      <p class="tool-subheading">${data.desc}</p>
      <div style="background:var(--bg-card); border:1px solid var(--glass-border); border-radius:var(--radius-md); overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; text-align:left; font-size:13px;">
          <thead>
            <tr style="background:rgba(237,244,236,0.06); border-bottom:1px solid var(--glass-border); color:var(--accent-sage);">
              <th style="padding:14px;">Transport Mode</th>
              <th style="padding:14px;">Avg Fare / km</th>
              <th style="padding:14px;">Cruising Speed</th>
              <th style="padding:14px;">Green Rating</th>
              <th style="padding:14px;">Reliability</th>
            </tr>
          </thead>
          <tbody>
            ${data.modesList.map(m => `
              <tr style="border-bottom:1px solid var(--glass-border); color:var(--text-main);">
                <td style="padding:14px; font-weight:600; color:var(--text-bright);">${m.mode}</td>
                <td style="padding:14px; color:var(--accent-gold);">${m.avgFare}</td>
                <td style="padding:14px;">${m.speed}</td>
                <td style="padding:14px; color:var(--accent-mint);">${m.greenRating}</td>
                <td style="padding:14px;">${m.reliability}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // --- G. 36 STATES & UTs SHOWCASE ---
  function renderShowcaseView() {
    const data = FEATURES_DATABASE['showcase'];
    toolContentBody.innerHTML = `
      <p class="tool-subheading">${data.desc}</p>
      <div class="grid-cards">
        ${data.states.map(s => `
          <div class="tool-card">
            <div class="card-img-wrap">
              <img src="${s.img}" alt="${s.name}" loading="lazy">
              <span class="badge-tag">${s.region} India</span>
            </div>
            <div class="card-body">
              <div>
                <h3 class="card-title">${s.name}</h3>
                <div style="font-size:11px; color:var(--accent-sage); margin-bottom:6px;">🏛️ Capital: ${s.capital}</div>
                <p class="card-desc">
                  <b>Must See:</b> ${s.sight}<br>
                  <b>Culinary:</b> ${s.dish}<br>
                  <b>Folk Art:</b> ${s.art}
                </p>
              </div>
              <button class="btn-tool-action btn-postcard" data-state="${s.name}" style="margin-top:10px;">💌 Generate Virtual Postcard</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    document.querySelectorAll('.btn-postcard').forEach(btn => {
      btn.addEventListener('click', () => {
        showToast(`Generated digital postcard for ${btn.dataset.state}! Saved to memory.`);
      });
    });
  }

  // --- H. SACRED GROVES & ECO TRAILS ---
  function renderEcoTrailsView() {
    const data = FEATURES_DATABASE['eco-trails'];
    toolContentBody.innerHTML = `
      <p class="tool-subheading">${data.desc}</p>
      <div style="display:flex; flex-direction:column; gap: 20px;">
        <div class="trail-canvas-box">
          <canvas id="trail-elevation-canvas"></canvas>
        </div>
        <div class="grid-cards">
          ${data.trails.map(t => `
            <div class="tool-card">
              <div class="card-body">
                <div>
                  <span class="badge-tag" style="position:static; display:inline-block; margin-bottom:8px;">${t.state}</span>
                  <h3 class="card-title">${t.name}</h3>
                  <div style="font-size:11px; color:var(--accent-sage); margin-bottom:6px;">📏 Length: ${t.length} • 🏔️ Elevation Gain: ${t.elevGain} • Difficulty: ${t.difficulty}</div>
                  <p class="card-desc">${t.desc}</p>
                  <div style="font-size:11px; color:var(--accent-gold); margin-top:8px;">🌿 Key Flora/Fauna: ${t.fauna}</div>
                </div>
                <button class="btn-tool-action btn-permit" data-name="${t.name}" style="margin-top:12px;">📄 Request Forest Permit Pass</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const canvas = document.getElementById('trail-elevation-canvas');
    if (canvas) {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(140, 210, 160, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(30, canvas.height - 30);
      ctx.quadraticCurveTo(canvas.width * 0.25, 40, canvas.width * 0.5, canvas.height * 0.5);
      ctx.quadraticCurveTo(canvas.width * 0.75, 20, canvas.width - 30, canvas.height - 30);
      ctx.stroke();

      ctx.fillStyle = 'rgba(140, 210, 160, 0.15)';
      ctx.lineTo(canvas.width - 30, canvas.height);
      ctx.lineTo(30, canvas.height);
      ctx.fill();

      ctx.fillStyle = '#edf4ec';
      ctx.font = '12px var(--font-sans)';
      ctx.fillText('Interactive Trail Elevation Profile Graph (0 m → 2,400 m)', 40, 30);
    }

    document.querySelectorAll('.btn-permit').forEach(btn => {
      btn.addEventListener('click', () => {
        showToast(`Permit application registered for ${btn.dataset.name}`);
      });
    });
  }

  // --- I. SPATIAL MAP VIEW ---
  function renderMapView() {
    toolContentBody.innerHTML = `
      <p class="tool-subheading">Interactive spatial viewer showing monuments, stays, markets, and eco trails.</p>
      <div style="width:100%; height:420px; background:#020604; border:1px solid var(--glass-border); border-radius:var(--radius-md); position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center;">
        <svg viewBox="0 0 800 600" style="width:100%; height:100%;">
          <path d="M300 100 L450 120 L500 250 L420 480 L350 550 L280 400 L220 250 Z" fill="rgba(15,35,22,0.6)" stroke="rgba(140,210,160,0.3)" stroke-width="2"/>
          <g class="map-pin" transform="translate(380, 220)" cursor="pointer">
            <circle cx="0" cy="0" r="10" fill="rgba(226,192,141,0.8)"/>
            <text x="14" y="4" fill="#edf4ec" font-size="12">Taj Mahal 3D</text>
          </g>
          <g class="map-pin" transform="translate(320, 420)" cursor="pointer">
            <circle cx="0" cy="0" r="10" fill="rgba(168,213,181,0.8)"/>
            <text x="14" y="4" fill="#edf4ec" font-size="12">Hampi Musical Pillars</text>
          </g>
          <g class="map-pin" transform="translate(480, 280)" cursor="pointer">
            <circle cx="0" cy="0" r="10" fill="rgba(31,163,87,0.8)"/>
            <text x="14" y="4" fill="#edf4ec" font-size="12">Mawphlang Sacred Grove</text>
          </g>
        </svg>
      </div>
    `;
    document.querySelectorAll('.map-pin').forEach(pin => {
      pin.addEventListener('click', () => {
        showToast('Selected spatial pinpoint! Synchronized with 3D model engine.');
      });
    });
  }

  // --- J. 12 MYSTIC WORLDS ---
  function renderWorldsView() {
    toolContentBody.innerHTML = `
      <p class="tool-subheading">12 thematic spatial realms across Bharat.</p>
      <div class="grid-cards">
        ${[
          { name: 'Canopy of Whispers', desc: 'Silent ancient rainforests of Western Ghats', sound: 'rain' },
          { name: 'Celestial Fortresses', desc: 'Floating hill forts of Aravalli Range', sound: 'chimes' },
          { name: 'Mystic Ghats & River Chimes', desc: 'Sacred riverfronts of Kashi & Haridwar', sound: 'waves' },
          { name: 'Night Grove Sanctuary', desc: 'Bioluminescent sacred groves of Meghalaya', sound: 'crickets' }
        ].map(w => `
          <div class="tool-card" style="padding:20px;">
            <h3 class="card-title">✦ ${w.name}</h3>
            <p class="card-desc">${w.desc}</p>
            <button class="btn-tool-action btn-play-world" data-sound="${w.sound}" style="margin-top:12px;">🎵 Enter Soundscape</button>
          </div>
        `).join('')}
      </div>
    `;

    document.querySelectorAll('.btn-play-world').forEach(btn => {
      btn.addEventListener('click', () => {
        playSoundscape(btn.dataset.sound);
        showToast('Entering World Soundscape...');
      });
    });
  }

  // --- K. AMBIENT REEL PLAYER ---
  function renderReelView() {
    toolContentBody.innerHTML = `
      <p class="tool-subheading">Cinematic audio-visual meditation reel.</p>
      <div style="background:#020604; border:1px solid var(--glass-border); border-radius:var(--radius-md); padding:30px; text-align:center;">
        <div style="font-size:48px; margin-bottom:12px;">🌿 🔔 🌧️</div>
        <h3 style="font-family:var(--font-serif); font-size:26px; color:var(--text-bright); margin-bottom:12px;">Serene Canopy Audio Reel</h3>
        <p style="color:var(--text-muted); font-size:14px; max-width:420px; margin: 0 auto 20px;">Experience procedural multi-track soundscapes generated in real-time with Web Audio synthesis.</p>
        <div style="display:flex; justify-content:center; gap:12px;">
          <button class="btn-tool-action" onclick="document.getElementById('audio-toggle-btn').click();">▶ Play / Pause Soundscape</button>
        </div>
      </div>
    `;
  }

});
