// DOM refs
    const channelList = document.getElementById("channel-list");
    const channelName = document.getElementById("channel-name");
    const videoWrapper = document.getElementById("videoWrapper");
    const loader = document.getElementById("loader");
    const unmuteBtn = document.getElementById("unmuteBtn");
    const qualitySelector = document.getElementById("qualitySelector");
    

    // state
    
    let stallTimeout;
    let scrollTimeout;
    let qualitySelectorSetup = false;
    let switching = false;
    let currentHls = null;
    let currentVideo = null;
    let currentShaka = null; // Add Shaka player instance


// ---------------------------
// Initialize channels with auto-play
// ---------------------------
function initializeChannels() {
    try {
        if (!Array.isArray(channels)) {
            throw new Error('Channels data is not a valid array');
        }
        
        console.log(`📺 Found ${channels.length} channels`);
        
        buildChannelList(channels);
        
        if (channels.length > 0) {
            // ✅ AUTO-PLAY FIRST CHANNEL
            const firstChannel = channels[0];
            console.log('🎬 Auto-playing first channel:', firstChannel.name);
            
            // Set channel name immediately
            channelName.textContent = firstChannel.name;
            
            // Small delay to ensure DOM is ready, then load channel
            setTimeout(() => {
                loadChannel(firstChannel);
            }, 500);
            
        } else {
            channelName.innerText = "No channels available";
            console.log('❌ No channels available for auto-play');
        }
        
    } catch (err) {
        console.error("Failed to initialize channels:", err);
        channelName.innerText = "Failed to load channels";
        
        channelList.innerHTML = `<div style="color: #ff6b6b; text-align: center; padding: 20px;">
            Error loading channels: ${err.message}
        </div>`;
    }
}

 // ---------------------------
// Updated Load Channel Function
// ---------------------------
function loadChannel(channel) {
    if (!channel || !channel.type) return;
    
    channelName.textContent = channel.name;
    showLoader(true);

    try {
        if (channel.type === "youtube") {
            loadYouTube(channel.link);
        } else if (channel.type === "m3u8") {
            loadHls(channel.link);
        } else if (channel.type === "mpd") {
            // Use smart DRM loader for MPD files
            console.log(`Loading MPD with smart DRM: ${channel.name}`);
            loadStreamWithSmartDRM(channel);
        } else {
            throw new Error(`Unsupported stream type: ${channel.type}`);
        }
    } catch (error) {
        console.error('Error loading channel:', error);
        channelName.textContent = `${channel.name} - Error: ${error.message}`;
        showLoader(false);

    
    channelName.textContent = `${channelName.textContent} - Shaka Error`;
    
    // ✅ IMPROVED: Better fallback logic
    if (streamData.link.includes('.mpd')) {
        console.log('🔄 Falling back to DASH.js...');
        
        // Create a clean stream data object for DASH fallback
        const shakaStream = {
            link: streamData.link,
            license: streamData.license || null
        };
        
        // Use setTimeout to avoid call stack issues
        setTimeout(() => {
            try {
                loadWithShakaPlayer(shakaStream.link, shakaStream.license);
            } catch (shakaError) {
                console.error('DASH fallback also failed:', shakaError);
                // Final fallback to HLS
                const hlsLink = streamData.link.replace('.mpd', '.m3u8');
                if (hlsLink !== streamData.link) {
                    console.log('🔄 Trying HLS fallback...');
                    loadHls(hlsLink);
                }
            }
        }, 100);
        
    }

}

}



async function loadStreamWithSmartDRM(streamData) {
    
    if (switching) return;
    switching = true;

    destroyCurrent();
    showLoader(true);

    setTimeout(() => switching = false, 500);

    try {
        const video = setupVideoElement();
        videoWrapper.appendChild(video);
        currentVideo = video;

        shaka.polyfill.installAll();
        const player = new shaka.Player();
        await player.attach(video);
        currentShaka = player;

        // Get DRM support (use cached or detect)
        const drmSupport = window.drmSupport || await detectDRMSupport();
        
        console.log('🎯 Smart DRM Loading with support:', drmSupport);
        
        // Configure DRM based on available support and stream requirements
        const drmConfig = await buildDRMConfig(streamData, drmSupport);
        
        if (Object.keys(drmConfig.servers).length > 0 || Object.keys(drmConfig.clearKeys || {}).length > 0) {
            player.configure({ drm: drmConfig });
            console.log('🔒 DRM configured:', drmConfig);
        } else {
            console.log('ℹ️ No DRM configuration applied - playing without DRM');
        }

        player.configure({
        drm: {
        clearKeys: {
        'f703e4c8ec9041eeb5028ab4248fa094': 'c22f2162e176eee6273a5d0b68d19530',
        '4bbdc78024a54662854b412d01fafa16': '6039ec9b213aca913821677a28bd78ae',
        '92032b0e41a543fb9830751273b8debd': '03f8b65e2af785b10d6634735dbe6c11',
        'd273c085f2ab4a248e7bfc375229007d': '7932354c3a84f7fc1b80efa6bcea0615',
        'a2d1f552ff9541558b3296b5a932136b': 'cdd48fa884dc0c3a3f85aeebca13d444',
        '900c43f0e02742dd854148b7a75abbec': 'da315cca7f2902b4de23199718ed7e90',
        'be9caaa813c5305e761c66ac63645901': '3d40f2990ec5362ca5be3a3c9bb8f8b4',
        '4ab9645a2a0a47edbd65e8479c2b9669': '8cb209f1828431ce9b50b593d1f44079',
        'd47ebabf7a21430b83a8c4b82d9ef6b1': '54c213b2b5f885f1e0290ee4131d425b',
        'bd17afb5dc9648a39be79ee3634dd4b8': '3ecf305d54a7729299b93a3d69c02ea5',
        'c5e51f41ceac48709d0bdcd9c13a4d88': '20b91609967e472c27040716ef6a8b9a',
        '53c3bf2eba574f639aa21f2d4409ff11': '3de28411cf08a64ea935b9578f6d0edd',
        '76dc29dd87a244aeab9e8b7c5da1e5f3': '95b2f2ffd4e14073620506213b62ac82',
        'dcbdaaa6662d4188bdf97f9f0ca5e830': '31e752b441bd2972f2b98a4b1bc1c7a1',
        '1917f4caf2364e6d9b1507326a85ead6': 'a1340a251a5aa63a9b0ea5d9d7f67595',
        '0a7ab3612f434335aa6e895016d8cd2d': 'b21654621230ae21714a5cab52daeb9d',
        '2615129ef2c846a9bbd43a641c7303ef': '07c7f996b1734ea288641a68e1cfdc4d',
        'eabd2d95c89e42f2b0b0b40ce4179ea0': '0e7e35a07e2c12822316c0dc4873903f',
        '96701d297d1241e492d41c397631d857': 'ca2931211c1a261f082a3a2c4fd9f91b',
        'fa3998b9a4de40659725ebc5151250d6': '998f1294b122bbf1a96c1ddc0cbb229f',
        'e1bde543e8a140b38d3f84ace746553e': 'b712c4ec307300043333a6899a402c10',
        '2e53f8d8a5e94bca8f9a1e16ce67df33': '3471b2464b5c7b033a03bb8307d9fa35',
        '4503cf86bca3494ab95a77ed913619a0': 'afc9c8f627fb3fb255dee8e3b0fe1d71',
        'c24a7811d9ab46b48b746a0e7e269210': 'c321afe1689b07d5b7e55bd025c483ce'
        }
        }
    });



        // Basic player configuration
        player.configure({
            streaming: {
                bufferingGoal: 15,
                rebufferingGoal: 1.5,
                bufferBehind: 20,
                lowLatencyMode: false
            }
        });

        // Load the stream
        await player.load(streamData.link);
        console.log('✅ Stream loaded successfully');
        
        showLoader(false);
        
        video.play().catch(err => {
            console.log('Autoplay prevented:', err);
            unmuteBtn.style.display = 'block';
        });

        // Auto-play with better error handling
        try {
            await video.play();
            console.log('▶️ Playback started successfully');
        } catch (err) {
            console.log('Autoplay prevented:', err);
            if (unmuteBtn) unmuteBtn.style.display = 'block';
            // Show play button overlay for user interaction
            showPlayButtonOverlay();
        }

    } catch (error) {
        console.error('💥 Smart DRM load failed:', error);
        handleDRMFallback(streamData, error);
    }
}

// ---------------------------
// Fixed DRM Support Detection (No Warnings)
// ---------------------------
async function detectDRMSupport() {
    return new Promise((resolve) => {
        const support = {
            widevine: false,
            clearkey: false,
            playready: false
        };
        
        // ✅ FIXED: Add robustness levels to avoid warnings
        const widevineConfig = [{
            initDataTypes: ['cenc'],
            audioCapabilities: [{ 
                contentType: 'audio/mp4; codecs="mp4a.40.2"',
                robustness: 'SW_SECURE_CRYPTO' // ✅ Added robustness
            }],
            videoCapabilities: [{ 
                contentType: 'video/mp4; codecs="avc1.42E01E"',
                robustness: 'SW_SECURE_CRYPTO' // ✅ Added robustness
            }],
            distinctiveIdentifier: 'optional',
            persistentState: 'optional',
            sessionTypes: ['temporary']
        }];
        
        const clearkeyConfig = [{
            initDataTypes: ['cenc'],
            audioCapabilities: [{ 
                contentType: 'audio/mp4; codecs="mp4a.40.2"',
                robustness: '' // ✅ Empty string for ClearKey (no robustness requirement)
            }],
            videoCapabilities: [{ 
                contentType: 'video/mp4; codecs="avc1.42E01E"',
                robustness: '' // ✅ Empty string for ClearKey
            }],
            distinctiveIdentifier: 'not-allowed',
            persistentState: 'not-allowed',
            sessionTypes: ['temporary']
        }];

        // Test Widevine
        navigator.requestMediaKeySystemAccess('com.widevine.alpha', widevineConfig)
            .then(() => { 
                support.widevine = true; 
                console.log('✅ Widevine supported');
            })
            .catch(() => { 
                support.widevine = false; 
                console.log('❌ Widevine not supported');
            })
            .finally(() => {
                // Test ClearKey
                navigator.requestMediaKeySystemAccess('org.w3.clearkey', clearkeyConfig)
                    .then(() => { 
                        support.clearkey = true; 
                        console.log('✅ ClearKey supported');
                    })
                    .catch(() => { 
                        support.clearkey = false; 
                        console.log('❌ ClearKey not supported');
                    })
                    .finally(() => {
                        resolve(support);
                    });
            });
    });
}

async function buildDRMConfig(streamData, drmSupport) {
    const drmConfig = {
        servers: {},
        advanced: {},
        clearKeys: {}
    };

    // Priority 1: Use specified DRM type if supported
    if (streamData.drmType === 'widevine' && streamData.licenseServer && drmSupport.widevine) {
        drmConfig.servers['com.widevine.alpha'] = streamData.licenseServer;
        drmConfig.advanced['com.widevine.alpha'] = {
            videoRobustness: "SW_SECURE_CRYPTO", // ✅ Added robustness
            audioRobustness: "SW_SECURE_CRYPTO"  // ✅ Added robustness
        };
    }
    else if (streamData.drmType === 'clearkey' && streamData.clearkey && drmSupport.clearkey) {
        drmConfig.servers['org.w3.clearkey'] = 'data:application/json;base64,eyJrZXlzIjpbXSwidHlwZSI6InRlbXBvcmFyeSJ9';
        drmConfig.clearKeys = parseClearKeyData(streamData.clearkey);
        // ClearKey doesn't need robustness levels
    }
    // Priority 2: Auto-detect based on available data and support
    else if (streamData.licenseServer && drmSupport.widevine) {
        drmConfig.servers['com.widevine.alpha'] = streamData.licenseServer;
        drmConfig.advanced['com.widevine.alpha'] = {
            videoRobustness: "SW_SECURE_CRYPTO", // ✅ Added robustness
            audioRobustness: "SW_SECURE_CRYPTO"  // ✅ Added robustness
        };
    }
    else if (streamData.clearkey && drmSupport.clearkey) {
        drmConfig.servers['org.w3.clearkey'] = 'data:application/json;base64,eyJrZXlzIjpbXSwidHlwZSI6InRlbXBvcmFyeSJ9';
        drmConfig.clearKeys = parseClearKeyData(streamData.clearkey);
    }

    return drmConfig;
}


// ---------------------------
// Network Speed Detection
// ---------------------------
/**
 * Robust Network Speed Test
 * Measures approximate download speed (Mbps) for streaming optimization
 */

async function measureSpeedOnce(testFile = 'https://httpbin.org/stream-bytes/5000000', timeoutMs = 7000) {
    const controller = new AbortController();
    const signal = controller.signal;

    const startTime = Date.now();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(testFile, { signal });
        clearTimeout(timeout);

        let fileSizeBytes = 0;
        const contentLength = response.headers.get('Content-Length');
        if (contentLength) {
            fileSizeBytes = parseInt(contentLength);
        } else {
            const blob = await response.blob();
            fileSizeBytes = blob.size;
        }

        const endTime = Date.now();
        const durationSeconds = (endTime - startTime) / 1000;
        const fileSizeMB = fileSizeBytes / (1024 * 1024);
        const speedMbps = (fileSizeMB * 8) / durationSeconds;

        return speedMbps;
    } catch (err) {
        console.warn('Network speed test failed:', err);
        return 3; // fallback speed
    } finally {
        clearTimeout(timeout);
    }
}

/**
 * Detect network speed with multiple runs and average result
 */
async function detectNetworkSpeed(runs = 2) {
    console.group('📊 Network Speed Test');
    let totalSpeed = 0;
    for (let i = 0; i < runs; i++) {
        const speed = await measureSpeedOnce();
        console.log(`Run ${i + 1}: ${speed.toFixed(2)} Mbps`);
        totalSpeed += speed;
    }
    const avgSpeed = totalSpeed / runs;
    console.log(`📡 Average Network Speed: ${avgSpeed.toFixed(2)} Mbps`);
    console.groupEnd();
    return avgSpeed;
}

/**
 * Return optimized streaming config based on network speed
 */
function getOptimizedConfigForSpeed(speedMbps) {
    const configs = {
        slow: {
            bufferingGoal: 10,
            rebufferingGoal: 1,
            bufferBehind: 15,
            maxBandwidth: 1500000,
            maxWidth: 640,
            maxHeight: 360
        },
        moderate: {
            bufferingGoal: 15,
            rebufferingGoal: 1.5,
            bufferBehind: 20,
            maxBandwidth: 2500000,
            maxWidth: 854,
            maxHeight: 480
        },
        fast: {
            bufferingGoal: 30,
            rebufferingGoal: 2,
            bufferBehind: 30,
            maxBandwidth: 8000000,
            maxWidth: 1920,
            maxHeight: 1080
        }
    };

    if (speedMbps < 2) return configs.slow;
    if (speedMbps <= 5) return configs.moderate;
    return configs.fast;
}

/**
 * Example usage:
 */
(async () => {
    const speed = await detectNetworkSpeed();
    const config = getOptimizedConfigForSpeed(speed);

    console.log('✅ Recommended Player Config:', config);

    // Example: Apply config to video / HLS player
    // currentVideo.width = config.maxWidth;
    // currentVideo.height = config.maxHeight;
    // currentHls.config.maxBufferLength = config.bufferingGoal;
})();

// ---------------------------
// Fixed Live Stream Time Display (Public APIs Only)
// ---------------------------

function setupCustomTimeDisplay(video, player) {
    // Remove existing display
    const existingDisplay = document.getElementById('custom-time-display');
    if (existingDisplay) existingDisplay.remove();
    
    // Remove any existing live controls
    const existingControls = document.getElementById('live-stream-controls');
    if (existingControls) existingControls.remove();
    
    // Create custom time display
    const timeDisplay = document.createElement('div');
    timeDisplay.id = 'custom-time-display';
    timeDisplay.style.cssText = `
        position: absolute;
        bottom: 60px;
        right: 15px;
        background: rgba(255, 50, 50, 0.9);
        color: white;
        padding: 8px 12px;
        border-radius: 16px;
        font-size: 14px;
        font-weight: bold;
        z-index: 1000;
        font-family: Arial, sans-serif;
        pointer-events: none;
        box-shadow: 0 2px 10px rgba(0,0,0,0.5);
    `;
    
    // Create live controls
    const controlsHTML = `
        <div id="live-stream-controls" style="
            position: absolute; 
            bottom: 0; 
            left: 0; 
            right: 0; 
            background: linear-gradient(transparent, rgba(0,0,0,0.8)); 
            padding: 15px 20px; 
            display: flex; 
            align-items: center; 
            gap: 15px;
            z-index: 999;
            pointer-events: auto;
        ">
            <button id="live-play-pause" style="
                background: rgba(255,255,255,0.2); 
                border: none; 
                color: white; 
                width: 40px; 
                height: 40px; 
                border-radius: 50%; 
                font-size: 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(10px);
            ">⏸️</button>
            
            <div style="color: #ccc; font-size: 12px; margin-left: 10px;">LIVE STREAM</div>
            
            <button id="live-fullscreen" style="
                background: rgba(255,255,255,0.2); 
                border: none; 
                color: white; 
                width: 40px; 
                height: 40px; 
                border-radius: 50%; 
                font-size: 16px;
                cursor: pointer;
                margin-left: auto;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(10px);
            ">⛶</button>
        </div>
    `;
    
    const controlsElement = document.createElement('div');
    controlsElement.innerHTML = controlsHTML;
    videoWrapper.appendChild(controlsElement);
    videoWrapper.appendChild(timeDisplay);
    
    let isLive = false;
    let lastUpdateTime = 0;
    
    // ✅ FIXED: Use only public APIs
    const updateTimeDisplay = () => {
        if (!player || !video) return;
        
        try {
            const currentTime = video.currentTime;
            const duration = video.duration;
            
            // ✅ FIXED: Use public isLive() method instead of internal manifest
            isLive = player.isLive();
            
            if (isLive) {
                // For live streams, we can't access the timeline directly
                // but we can detect live streams and show appropriate display
                
                // Calculate time since last update to detect if we're near live edge
                const now = Date.now();
                const timeSinceLastUpdate = now - lastUpdateTime;
                
                if (timeSinceLastUpdate > 2000) {
                    // If video time hasn't updated in 2+ seconds, we might be behind
                    timeDisplay.textContent = `LIVE -${Math.round(timeSinceLastUpdate / 1000)}s`;
                    timeDisplay.style.background = 'rgba(255, 165, 0, 0.9)';
                } else {
                    // Close to real-time
                    timeDisplay.textContent = '● LIVE';
                    timeDisplay.style.background = 'rgba(255, 50, 50, 0.9)';
                }
                
                lastUpdateTime = now;
            } else {
                // VOD stream - show normal time
                timeDisplay.textContent = formatTimeDisplay(currentTime, duration);
                timeDisplay.style.background = 'rgba(0, 0, 0, 0.7)';
            }
            
        } catch (error) {
            // Fallback detection for live streams
            if (video.duration > 86400 || video.duration === Infinity) {
                timeDisplay.textContent = '● LIVE';
                timeDisplay.style.background = 'rgba(255, 50, 50, 0.9)';
            } else {
                timeDisplay.textContent = formatTimeDisplay(video.currentTime, video.duration);
            }
        }
    };
    
    // Update frequently for live streams
    const timeUpdateInterval = setInterval(updateTimeDisplay, 1000);
    
    // Also update on video time updates
    video.addEventListener('timeupdate', updateTimeDisplay);
    
    // Setup control handlers
    document.getElementById('live-play-pause').addEventListener('click', (e) => {
        e.stopPropagation();
        if (video.paused) {
            video.play();
            e.target.textContent = '⏸️';
        } else {
            video.pause();
            e.target.textContent = '▶️';
        }
    });
    
    document.getElementById('live-fullscreen').addEventListener('click', (e) => {
        e.stopPropagation();
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            videoWrapper.requestFullscreen();
        }
    });
    
    // Update play/pause button based on video state
    video.addEventListener('play', () => {
        const btn = document.getElementById('live-play-pause');
        if (btn) btn.textContent = '⏸️';
    });
    
    video.addEventListener('pause', () => {
        const btn = document.getElementById('live-play-pause');
        if (btn) btn.textContent = '▶️';
    });
    
    // Cleanup function
    const cleanup = () => {
        clearInterval(timeUpdateInterval);
        video.removeEventListener('timeupdate', updateTimeDisplay);
        if (timeDisplay.parentNode) timeDisplay.remove();
        if (controlsElement.parentNode) controlsElement.remove();
    };
    
    video.addEventListener('emptied', cleanup);
    video.addEventListener('error', cleanup);
    
    // Initial update
    updateTimeDisplay();
    lastUpdateTime = Date.now();
    
    return cleanup;
}

function setupSimpleLiveDisplay(video) {
    const liveIndicator = document.createElement('div');
    liveIndicator.id = 'simple-live-indicator';
    liveIndicator.style.cssText = `
        position: absolute;
        bottom: 20px;
        right: 20px;
        background: #ff0000;
        color: white;
        padding: 8px 16px;
        border-radius: 50px;
        font-size: 14px;
        font-weight: bold;
        z-index: 1000;
        pointer-events: none;
    `;
    liveIndicator.textContent = '● LIVE';
    
    videoWrapper.appendChild(liveIndicator);
    
    // Hide native controls time display
    video.controls = false;
    
    return () => {
        if (liveIndicator.parentNode) liveIndicator.remove();
        video.controls = true;
    };
}


// ---------------------------
// Safe logo loader
// ---------------------------
function createChannelLogo(channel) {
    const img = document.createElement('img');
    
    // Set alt text
    img.alt = channel.name || 'Channel Logo';
    
    // Handle logo URL safely
    if (channel.logo && channel.logo !== 'undefined' && channel.logo.startsWith('http')) {
        img.src = channel.logo;
    } else {
        // Use placeholder
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5OTyBMT0dPPC90ZXh0Pjwvc3ZnPg==';
    }
    
    // Error handling for broken images
    img.onerror = function() {
        this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5OTyBMT0dPPC90ZXh0Pjwvc3ZnPg==';
        this.alt = 'Logo not available';
    };
    
    // Lazy loading for performance
    img.loading = 'lazy';
    
    return img;
}
    // ---------------------------
// Build channel list with auto-selection
// ---------------------------
function buildChannelList(channels) {
    channelList.innerHTML = "";
    channels.forEach((channel, index) => {
        const div = document.createElement("div");
        div.className = "channel";
        div.title = channel.name || 'Unnamed Channel';
        
        const logoUrl = channel.logo && channel.logo !== 'undefined' ? channel.logo : '';
        const placeholderSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5OTyBMT0dPPC90ZXh0Pjwvc3ZnPg==';
        
        div.innerHTML = `<img src="${logoUrl || placeholderSvg}" alt="${channel.name || 'Channel'}" onerror="this.src='${placeholderSvg}'">`;
        
        div.addEventListener("click", () => {
            document.querySelectorAll(".channel").forEach(el => el.classList.remove("active"));
            div.classList.add("active");
            loadChannel(channel);
        });
        
        channelList.appendChild(div);
        
        // ✅ Force first channel to be active
        if (index === 0) {
            div.classList.add("active");
        }
    });
    channelList.addEventListener('click', (e) => {
  const channel = e.target.closest('.channel');
  if (!channel) return;

  // Remove previous active
  document.querySelectorAll('#channel-list .channel')
    .forEach(c => c.classList.remove('active'));

  // Activate clicked channel
  channel.classList.add('active');

  // Mark list as having an active channel
  channelList.classList.add('has-active');
  });

  channelList.addEventListener('scroll', () => {
  // Remove dim while scrolling
  channelList.classList.remove('has-active');

  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    // Re-apply dim ONLY if a channel is still active
    if (channelList.querySelector('.channel.active')) {
      channelList.classList.add('has-active');
    }
  }, 1000); // delay after scroll stops
  });

}

// ---------------------------
// Validate and clean channels data
// ---------------------------
function validateChannels(channels) {
    if (!Array.isArray(channels)) {
        console.error('Channels data is not an array');
        return [];
    }
    
    return channels.map((channel, index) => {
        // Ensure channel has required properties
        const validatedChannel = {
            name: channel.name || `Channel ${index + 1}`,
            type: channel.type || 'm3u8', // default type
            link: channel.link || '',
            logo: channel.logo || '', // empty string instead of undefined
            // Preserve other properties
            ...channel
        };
        
        // Clean up logo URL
        if (validatedChannel.logo === 'undefined' || validatedChannel.logo === undefined) {
            validatedChannel.logo = '';
        }
        
        // Log warnings for invalid channels
        if (!validatedChannel.link) {
            console.warn(`Channel "${validatedChannel.name}" has no stream link`);
        }
        
        return validatedChannel;
    });
}

    // ---------------------------
    // Helper Functions
    // ---------------------------
    function showLoader(show) { 
        loader.style.display = show ? 'block' : 'none'; 

         if (show) {
        channelName.classList.add('loading');
    } else {
        channelName.classList.remove('loading');
    }
}

    function log(...args) { 
        console.log('[IPTV]', ...args); 
    }

    function setupVideoElement() {
    const v = document.createElement("video");
    v.setAttribute("playsinline", "true");
    v.controls = true;
    v.autoplay = true;
    v.muted = true;
    v.preload = "auto";
    v.style.width = "100%";
    v.style.height = "100%";
    v.className = "shaka-video"; // Add class for easier targeting
    
    // Enhanced error event listener - COMPLETE VERSION
v.addEventListener('error', (e) => {
    console.group('🎬 VIDEO ELEMENT ERROR - ENHANCED DEBUGGING');
    
    // 1. Basic event info
    console.error('=== EVENT OBJECT ===');
    console.error('Event type:', e.type);
    console.error('Event target:', e.target);
    console.error('Event currentTarget:', e.currentTarget);
    console.error('Is trusted:', e.isTrusted);
    
    // 2. Video element state - MULTIPLE WAYS TO GET ERROR
    console.error('=== VIDEO ELEMENT STATE ===');
    console.error('Video element:', v);
    console.error('Video error property (v.error):', v.error);
    console.error('Video readyState:', v.readyState, getReadyStateText(v.readyState));
    console.error('Video networkState:', v.networkState, getNetworkStateText(v.networkState));
    console.error('Video src:', v.src);
    console.error('Video currentSrc:', v.currentSrc);
    console.error('Video duration:', v.duration);
    console.error('Video videoWidth:', v.videoWidth);
    console.error('Video videoHeight:', v.videoHeight);
    
    // 3. Try alternative ways to get error info
    console.error('=== ALTERNATIVE ERROR DETECTION ===');
    
    // Method 1: Check if error is on the event
    console.error('Event error property:', e.error);
    
    // Method 2: Check MediaError constants
    if (window.MediaError) {
        console.error('MediaError constants available');
        console.error('MEDIA_ERR_ABORTED:', MediaError.MEDIA_ERR_ABORTED);
        console.error('MEDIA_ERR_NETWORK:', MediaError.MEDIA_ERR_NETWORK);
        console.error('MEDIA_ERR_DECODE:', MediaError.MEDIA_ERR_DECODE);
        console.error('MEDIA_ERR_SRC_NOT_SUPPORTED:', MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED);
    }
    
    // Method 3: Try to create a MediaError to test
    try {
        const testError = new MediaError();
        console.error('MediaError constructor available');
    } catch (err) {
        console.error('MediaError constructor not available:', err);
    }
    
    // 4. Check browser-specific error properties
    console.error('=== BROWSER SPECIFIC ===');
    console.error('Video mozHasAudio:', v.mozHasAudio);
    console.error('Video webkitAudioDecodedByteCount:', v.webkitAudioDecodedByteCount);
    console.error('Video webkitVideoDecodedByteCount:', v.webkitVideoDecodedByteCount);
    
    // 5. Check if it's a Shaka-specific issue
    if (window.currentShaka) {
        console.error('=== SHAKA PLAYER STATE ===');
        try {
            const player = currentShaka;
            console.error('Shaka player exists');
            console.error('Shaka isLive:', player.isLive());
            console.error('Shaka isBuffering:', player.isBuffering());
            
            const manifest = player.getManifest();
            console.error('Shaka manifest loaded:', !!manifest);
            
            if (manifest) {
                console.error('Shaka variants:', manifest.variants.length);
            }
        } catch (shakaErr) {
            console.error('Shaka check error:', shakaErr);
        }
    }
    
    // 6. Network and performance info
    console.error('=== PERFORMANCE INFO ===');
    if (performance && performance.getEntriesByType) {
        const resources = performance.getEntriesByType('resource');
        const videoResources = resources.filter(r => r.name.includes('.mpd') || r.name.includes('.m3u8'));
        console.error('Video-related resources:', videoResources);
    }
    
    console.groupEnd();
    
    // Show user message based on available info
    showLoader(false);
    determineErrorMessage(v);
});

function determineErrorMessage(video) {
    let errorMessage = 'Video playback failed';
    
    // Try to determine error from available info
    if (video.networkState === video.NETWORK_NO_SOURCE) {
        errorMessage = 'No video source found';
    } else if (video.readyState === video.HAVE_NOTHING) {
        errorMessage = 'Video failed to load';
    } else if (video.error) {
        // If we eventually get an error object
        const codes = {
            1: 'Video loading aborted',
            2: 'Network error',
            3: 'Video decoding error', 
            4: 'Video format not supported'
        };
        errorMessage = codes[video.error.code] || 'Video error';
    }
    
    channelName.textContent = `${channelName.textContent} - ${errorMessage}`;
    console.error('User message:', errorMessage);
}

// Helper functions
function getReadyStateText(state) {
    const states = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'];
    return states[state] || 'UNKNOWN';
}

function getNetworkStateText(state) {
    const states = ['NETWORK_EMPTY', 'NETWORK_IDLE', 'NETWORK_LOADING', 'NETWORK_NO_SOURCE'];
    return states[state] || 'UNKNOWN';
}
    }

// Add these to your setupVideoElement function
function setupVideoElement() {
    const v = document.createElement("video");
    // ... your existing setup code ...
    
    // ERROR DETECTION AT DIFFERENT STAGES
    
    // 1. Load start
    v.addEventListener('loadstart', () => {
        console.log('🚀 Video load started - currentSrc:', v.currentSrc);
    });
    
    // 2. Progress (loading)
    // In your setupVideoElement function, update the progress event:
v.addEventListener('progress', () => {
    if (v.buffered.length > 0) {
        const bufferedEnd = v.buffered.end(0);
        
        // For live streams, show relative buffer instead of absolute time
        if (v.duration > 86400) { // Live stream
            const currentTime = v.currentTime;
            const bufferAhead = bufferedEnd - currentTime;
            console.log('📥 Live stream - buffer ahead:', bufferAhead.toFixed(1) + 's');
        } else {
            console.log('📥 Video loading progress - buffered:', bufferedEnd);
        }
    }
});
    
    // 3. Can play
    v.addEventListener('canplay', () => {
        console.log('✅ Video can play - readyState:', v.readyState);
    });
    
    // 4. Stalled (buffering)
    v.addEventListener('stalled', () => {
        console.log('🔄 Video stalled - networkState:', v.networkState);
    });
    
    // 5. Suspend (loading paused)
    v.addEventListener('suspend', () => {
        console.log('⏸️ Video loading suspended');
    });
    
    // 6. Abort
    v.addEventListener('abort', () => {
        console.log('❌ Video loading aborted');
    });
    
    // 7. Emptied (media removed)
    v.addEventListener('emptied', () => {
        console.log('🗑️ Video media emptied');
    });
    
    return v;
}

    // ---------------------------
    // Updated Destroy Function
    // ---------------------------
function destroyCurrent() {
    // --- Destroy Shaka Player ---
    if (currentShaka) {
        try { currentShaka.destroy(); } catch(e){ console.error(e); }
        currentShaka = null;
    }

    // --- Destroy HLS ---
    if (currentHls) {
        try { 
            currentHls.stopLoad();   // stop network requests immediately
            currentHls.destroy(); 
        } catch(e){}
        currentHls = null;
    }

    // --- Destroy Video Element ---
    if (currentVideo) {
        try { 
            currentVideo.pause();
            currentVideo.removeAttribute('src'); // stops playback safely
            currentVideo.load();
            currentVideo.remove();
        } catch(e){}
        currentVideo = null;
    }

    // --- Destroy Iframe (YouTube / other embeds) ---
    const oldIframe = videoWrapper.querySelector('iframe');
    if (oldIframe) oldIframe.remove();

    // --- Hide UI ---
    if (customControls?.hide) customControls.hide();
    qualitySelector.style.display = "none";
    qualitySelector.innerHTML = "";
    unmuteBtn.style.display = 'none';
}


function loadYouTube(link) {
    if (switching) return;
    switching = true;

    destroyCurrent();
    showLoader(true);

    const iframe = document.createElement("iframe");
    iframe.src = link;
    iframe.allow = "autoplay; encrypted-media; fullscreen";
    iframe.frameBorder = "0";

    iframe.onload = () => {
        showLoader(false);
        switching = false;
    };

    videoWrapper.appendChild(iframe);
}



function loadHls(link) {
    if (switching) return;
    switching = true;

    destroyCurrent();
    showLoader(true);

    // Create new video element
    const video = setupVideoElement();
    currentVideo = video;
    videoWrapper.appendChild(video);

    if (Hls.isSupported()) {
        const hls = new Hls({
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            enableWorker: true,
            backBufferLength: 30
        });
        currentHls = hls;

        hls.attachMedia(video);
        hls.loadSource(link);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
            if (data.levels?.length > 1) populateQualitySelector(hls, data.levels);
            else qualitySelector.style.display = "none";

            showLoader(false);
            video.play().catch(() => { unmuteBtn.style.display = 'block'; });
            switching = false; // unlock after video ready
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) hls.destroy();
        });

    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS
        video.src = link;
        video.addEventListener("loadedmetadata", () => {
            video.play().catch(() => { unmuteBtn.style.display = 'block'; });
            showLoader(false);
            switching = false;
        });
    } else {
        log("HLS not supported");
        showLoader(false);
        switching = false;
    }
}



// ---------------------------
// Enhanced Controls Manager for DASH
// ---------------------------
const customControls = {
    init() {
        if (!document.getElementById('custom-controls')) {
            this.createControls();
        }
        
        this.controls = document.getElementById('custom-controls');
        this.liveIndicator = document.getElementById('live-indicator');
        this.fullscreenBtn = document.getElementById('fullscreen-btn');
        this.videoWrapper = document.getElementById('videoWrapper');
        
        this.setupEventListeners();
    },

    createControls() {
        const controlsHTML = `
            <div id="custom-controls" style="display: none;">
                <div id="live-indicator">● LIVE</div>
                <button id="fullscreen-btn" title="Toggle Fullscreen (F)">⛶</button>
            </div>
        `;
        document.getElementById('videoWrapper').insertAdjacentHTML('beforeend', controlsHTML);
    },

    setupEventListeners() {
        this.fullscreenBtn.addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Fullscreen change events
        document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
        document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange.bind(this));

        // Show controls on video wrapper interaction
        this.videoWrapper.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.videoWrapper.addEventListener('click', this.handleClick.bind(this));
    },

    handleMouseMove() {
        this.show();
        this.clearHideTimeout();
        this.hideTimeout = setTimeout(() => {
            if (!this.isFullscreen()) {
                this.hide();
            }
        }, 3000);
    },

    handleClick() {
        this.show();
        this.clearHideTimeout();
         this.hideTimeout = setTimeout(() => {
            if (!this.isFullscreen()) {
                this.hide();
            }
        }, 3000);
    },

    handleFullscreenChange() {
        if (this.isFullscreen()) {
            this.fullscreenBtn.innerHTML = '⧉';
            this.fullscreenBtn.title = 'Exit Fullscreen (F)';
            this.show(); // Always show in fullscreen
        } else {
            this.fullscreenBtn.innerHTML = '⛶';
            this.fullscreenBtn.title = 'Enter Fullscreen (F)';
            this.hide();
        }
    },

    clearHideTimeout() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }
    },

    show() {
        if (this.controls) {
            this.controls.style.display = 'flex';
            this.controls.style.opacity = '1';
        }
    },

    hide() {
        if (this.controls && !this.isFullscreen()) {
            this.controls.style.opacity = '0';
            setTimeout(() => {
                if (this.controls.style.opacity === '0') {
                    this.controls.style.display = 'none';
                }
            }, 300);
        }
    },

    toggleFullscreen() {
        if (!this.isFullscreen()) {
            this.enterFullscreen();
        } else {
            this.exitFullscreen();
        }
    },

    enterFullscreen() {
        const element = this.videoWrapper;
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    },

    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    },

    isFullscreen() {
        return !!(document.fullscreenElement || 
                 document.webkitFullscreenElement || 
                 document.msFullscreenElement);
    },

    setLiveIndicator(live) {
        if (this.liveIndicator) {
            if (live) {
                this.liveIndicator.style.display = 'block';
                this.liveIndicator.textContent = '● LIVE';
                this.liveIndicator.style.background = 'rgba(255, 50, 50, 0.9)';
            } else {
                this.liveIndicator.style.display = 'none';
            }
        }
    },

    updateLiveDelay(delaySeconds) {
        if (this.liveIndicator && this.liveIndicator.style.display !== 'none') {
            if (delaySeconds <= 5) {
                this.liveIndicator.textContent = '● LIVE';
                this.liveIndicator.style.background = 'rgba(255, 50, 50, 0.9)';
            } else if (delaySeconds <= 15) {
                this.liveIndicator.textContent = `LIVE -${Math.round(delaySeconds)}s`;
                this.liveIndicator.style.background = 'rgba(255, 165, 0, 0.9)';
            } else if (delaySeconds <= 30) {
                this.liveIndicator.textContent = `LIVE -${Math.round(delaySeconds)}s`;
                this.liveIndicator.style.background = 'rgba(255, 200, 0, 0.9)';
            } else {
                this.liveIndicator.textContent = `LIVE -${Math.round(delaySeconds)}s`;
                this.liveIndicator.style.background = 'rgba(0, 100, 255, 0.9)';
            }
        }
    }
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    customControls.init();
});



    function loadWithShakaPlayer(link, licenseData = null) {
    if (switching) return;
    switching = true;

    destroyCurrent();
    showLoader(true);

    setTimeout(() => switching = false, 500);

    const video = setupVideoElement();
    videoWrapper.appendChild(video);
    currentVideo = video;

    // 1. Check Browser Support
    if (!shaka.Player.isBrowserSupported()) {
        console.error("Shaka Player: Browser not supported!");
        showLoader(false);
        channelName.textContent = `${channelName.textContent} - Browser not supported`;
        return;
    }

    // 2. Create Player Instance and attach to video element
    const player = new shaka.Player(video);
    currentShakaPlayer = player; // Store reference globally to control later

    // 3. Configure Player
    player.configure({
        streaming: {
            bufferingGoal: 30,
            rebufferingGoal: 2,
            bufferBehind: 30,
            lowLatencyMode: false,
            inaccurateManifestTolerance: 0,
            retryParameters: {
                maxAttempts: 5,
                baseDelay: 1000,
                backoffFactor: 2,
                fuzzFactor: 0.5,
                timeout: 30000
            }
        },
        abr: {
            enabled: true,
            defaultBandwidthEstimate: 500000,
            switchInterval: 2
        }
    });

    // 4. Set up DRM (ClearKey example)
    if (licenseData && licenseData.type === "clearkey") {
        try {
            const [keyId, keyValue] = licenseData.key.split(':');
            player.configure({
                drm: {
                    clearKeys: {
                        [keyId]: keyValue
                    }
                }
            });
            console.log('Shaka Player: ClearKey DRM configured');
        } catch (drmError) {
            console.error('Shaka Player: DRM setup error:', drmError);
        }
    }

    // 5. Listen to Player Events
    player.addEventListener('error', (event) => {
        console.error('Shaka Player: Error event:', event.detail);
        showLoader(false);
    });

    player.addEventListener('loading', () => {
        showLoader(true);
    });

    player.addEventListener('loaded', () => {
        console.log("Shaka Player: Manifest loaded.");
        showLoader(false);
    });

    player.addEventListener('adaptation', () => {
        console.log("Shaka Player: Adaptation changed.");
        // You can update a quality selector UI here if needed
        populateShakaQualitySelector(player);
    });

    // 6. Load the Stream
    console.log("Shaka Player: Loading stream:", link);
    player.load(link).then(() => {
        console.log("Shaka Player: Playback started!");
        showLoader(false);
        video.play().catch(e => console.log("Autoplay prevented:", e));
    }).catch((error) => {
        console.error('Shaka Player: Error loading stream:', error);
        showLoader(false);
    });
}

// Helper to create quality selector (basic example)
function populateShakaQualitySelector(player) {
    const tracks = player.getVariantTracks();
    // ... logic to build UI from tracks array ...
}
    // ---------------------------
    // Quality selector helpers
    // ---------------------------
    function populateQualitySelector(hls, levels) {
        qualitySelector.innerHTML = "";
        const autoOption = document.createElement("option");
        autoOption.value = "auto";
        autoOption.textContent = "Auto";
        qualitySelector.appendChild(autoOption);

        levels.forEach((level, i) => {
            const opt = document.createElement("option");
            opt.value = i;
            const height = level.height || 'Unknown';
            const bitrate = level.bitrate ? ` (${Math.round(level.bitrate/1000)}kbps)` : '';
            opt.textContent = `${height}p${bitrate}`;
            qualitySelector.appendChild(opt);
        });

        qualitySelector.style.display = "inline-block";

        qualitySelector.onchange = function () {
            if (this.value === "auto") {
                hls.currentLevel = -1;
            } else {
                hls.currentLevel = parseInt(this.value);
            }
        };
    }

// ---------------------------
// User Quality Selection
// ---------------------------
function populateOptimizedQualitySelector(hls, levels) {
    qualitySelector.innerHTML = "";
    
    // Group by resolution and select optimal bitrates
    const optimalLevels = levels.filter(level => 
        level.bitrate <= 2500000 && level.height <= 720
    ).sort((a, b) => a.height - b.height);
    
    const autoOption = document.createElement("option");
    autoOption.value = "auto";
    autoOption.textContent = "Auto (Recommended)";
    autoOption.selected = true;
    qualitySelector.appendChild(autoOption);

    optimalLevels.forEach((level, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        const bitrateText = level.bitrate ? ` (${Math.round(level.bitrate/1000)}kbps)` : '';
        opt.textContent = `${level.height}p${bitrateText}`;
        
        // Recommend 480p for 3Mbps
        if (level.height === 480 && level.bitrate <= 1200000) {
            opt.textContent += ' ★';
        }
        
        qualitySelector.appendChild(opt);
    });

    qualitySelector.style.display = "inline-block";
    qualitySelector.onchange = function () {
        if (this.value === "auto") {
            hls.currentLevel = -1;
        } else {
            hls.currentLevel = parseInt(this.value);
        }
    };
}

function formatTimeDisplay(currentTime, duration) {
    if (!isFinite(duration) || duration > 86400) {
        return 'LIVE';
    }
    
    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
    };
    
    return `${formatTime(currentTime)} / ${formatTime(duration)}`;
}

   
// Helper function to format ClearKey keys
function formatClearKeyKeys(keys) {
    if (typeof keys === 'string') {
        // Assume "keyId:keyValue" format
        const [keyId, keyValue] = keys.split(':');
        return { [keyId]: keyValue };
    } else if (Array.isArray(keys)) {
        // Convert array to object
        const keyObj = {};
        keys.forEach(key => {
            if (key.keyId && key.key) {
                keyObj[key.keyId] = key.key;
            }
        });
        return keyObj;
    } else if (typeof keys === 'object') {
        return keys;
    }
    return {};
}

// Example usage in your DRM configuration:
//const clearkeyConfig = {
    //servers: {
   //     'org.w3.clearkey': 'data:application/json;base64,eyJrZXlzIjpbXSwidHlwZSI6InRlbXBvcmFyeSJ9'
   // },
  //  clearKeys: formatClearKeyKeys(channel.clearkey)
//};


function checkAllDRMSupport() {
    console.group('🔒 DRM Support Overview');
    
    const drmSystems = [
        { name: 'ClearKey', keySystem: 'org.w3.clearkey' },
        { name: 'Widevine', keySystem: 'com.widevine.alpha' },
        { name: 'PlayReady', keySystem: 'com.microsoft.playready' }
    ];
    
    drmSystems.forEach(system => {
        if (navigator.requestMediaKeySystemAccess) {
            navigator.requestMediaKeySystemAccess(system.keySystem, [{
                initDataTypes: ['cenc'],
                audioCapabilities: [{ contentType: 'audio/mp4; codecs="mp4a.40.2"' }],
                videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"' }]
            }]).then(() => {
                console.log(`✅ ${system.name} supported`);
            }).catch(() => {
                console.log(`❌ ${system.name} not supported`);
            });
        } else {
            console.log(`❌ EME not supported - cannot check ${system.name}`);
        }
    });
    
    console.groupEnd();
}


function parseClearKeyData(clearkeyData) {
    if (typeof clearkeyData === 'string') {
        const [keyId, keyValue] = clearkeyData.split(':');
        return keyId && keyValue ? { [keyId]: keyValue } : {};
    } else if (Array.isArray(clearkeyData)) {
        const keys = {};
        clearkeyData.forEach(key => {
            if (key.keyId && key.key) keys[key.keyId] = key.key;
        });
        return keys;
    } else if (typeof clearkeyData === 'object') {
        return { ...clearkeyData };
    }
    return {};
}


// ---------------------------
// Handle autoplay restrictions
// ---------------------------
function handleAutoplayRestrictions(video) {
    const playPromise = video.play();
    
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.log('🔇 Autoplay was prevented:', error.name);
            
            // Show a subtle message to the user
            const autoplayMessage = document.createElement('div');
            autoplayMessage.style.cssText = `
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
                z-index: 1000;
            `;
            autoplayMessage.textContent = 'Click the video to play';
            video.parentNode.appendChild(autoplayMessage);
            
            // Remove message after 3 seconds
            setTimeout(() => {
                if (autoplayMessage.parentNode) {
                    autoplayMessage.remove();
                }
            }, 3000);
            
            // Allow manual play on click
            video.addEventListener('click', function playOnClick() {
                video.play().then(() => {
                    video.removeEventListener('click', playOnClick);
                    if (autoplayMessage.parentNode) {
                        autoplayMessage.remove();
                    }
                });
            }, { once: true });
        });
    }
}


function handleDRMFallback(streamData, error) {
    console.log('🔄 Handling DRM fallback...');
    showLoader(false);
    
    // Fallback strategies
    if (streamData.link.includes('.mpd')) {
        if (error.code === 4032 || error.code === 6001) {
            // DRM license error - try without DRM
            console.log('🔓 Trying without DRM...');
            const fallbackData = { ...streamData };
            delete fallbackData.licenseServer;
            delete fallbackData.clearkey;
            delete fallbackData.drmType;
            
            setTimeout(() => loadStreamWithSmartDRM(fallbackData.link), 500);
        } else {
            // Other error - try DASH.js
            console.log('🔄 Falling back to DASH.js...');
            loadWithShakaPlayer(streamData.link, streamData.clearkey);
            (streamData.link, streamData.clearkey);
        }
    } else {
        channelName.textContent = `${channelName.textContent} - Playback Failed`;
    }
}


// ---------------------------
// Initialize when page loads
// ---------------------------
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded, initializing player...');
    console.log('DashJS available:', typeof dashjs !== 'undefined');
    console.log('HLS.js available:', typeof Hls !== 'undefined');
    console.log('Shaka Player available:', typeof shaka !== 'undefined');
    
    initializeChannels();
});


// ---------------------------
// Wait for all resources to load
// ---------------------------
window.addEventListener('load', function() {
    console.log('📄 All page resources loaded');
    
    // If channels aren't initialized yet, do it now
    if (!window.channelsInitialized) {
        setTimeout(() => {
            initializeChannels();
        }, 100);
    }
});

// Also keep your DOMContentLoaded for faster initial load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, starting initialization...');
    window.channelsInitialized = true;
    initializeChannels();
});


function checkCodecSupport() {
    console.group('🔍 Codec Support Check');
    
    const video = document.createElement('video');
    const codecs = [
        'video/mp4; codecs="avc1.42E01E"',
        'video/mp4; codecs="avc1.42801E"',
        'video/mp4; codecs="avc1.640028"',
        'video/mp4; codecs="hev1.1.6.L93.B0"',
        'video/mp4; codecs="hvc1.1.6.L93.B0"',
        'video/webm; codecs="vp9"',
        'video/webm; codecs="vp8"',
        'audio/mp4; codecs="mp4a.40.2"',
        'audio/mp4; codecs="mp4a.40.5"',
        'audio/webm; codecs="opus"'
    ];
    
    codecs.forEach(codec => {
        const isSupported = video.canPlayType(codec);
        console.log(`${codec}: ${isSupported}`);
    });
    
    console.groupEnd();
}

// Call this in your DOMContentLoaded
checkCodecSupport();

// Keep all your existing functions (loadHls, loadDash, loadYouTube, etc.) as they are
// Only the functions above need to be added/modified