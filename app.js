/**
 * IPTV Player Application
 * Cleaned and optimized version
 * Supports: YouTube, HLS (m3u8), DASH (mpd) with DRM
 */
// =============================================================================
// STATE MANAGEMENT
// =============================================================================

const AppState = {
    // Player instances
    currentHls: null,
    currentShaka: null,
    currentVideo: null,
    
    // UI state
    switching: false,
    qualitySelectorSetup: false,
    
    // Cached data
    drmSupport: null,
    networkSpeed: null,
    
    // Timers
    scrollTimeout: null,
    hideControlsTimeout: null,
    
    // Event cleanup functions
    eventCleanups: [],
    
    /**
     * Reset all player state
     */
    reset() {
        this.cleanup();
        this.currentHls = null;
        this.currentShaka = null;
        this.currentVideo = null;
        this.switching = false;
    },
    
    /**
     * Cleanup all active resources and event listeners
     */
    cleanup() {
        // Destroy Shaka Player
        if (this.currentShaka) {
            try {
                this.currentShaka.destroy();
            } catch (e) {
                console.error('Error destroying Shaka:', e);
            }
        }
        
        // Destroy HLS
        if (this.currentHls) {
            try {
                this.currentHls.stopLoad();
                this.currentHls.destroy();
            } catch (e) {
                console.error('Error destroying HLS:', e);
            }
        }
        
        // Cleanup video element
        if (this.currentVideo) {
            try {
                this.currentVideo.pause();
                this.currentVideo.removeAttribute('src');
                this.currentVideo.load();
                this.currentVideo.remove();
            } catch (e) {
                console.error('Error cleaning video:', e);
            }
        }
        
        // Remove iframes
        const oldIframe = DOM.videoWrapper.querySelector('iframe');
        if (oldIframe) oldIframe.remove();
        
        // Clear all registered event listeners
        this.eventCleanups.forEach(cleanup => {
            try {
                cleanup();
            } catch (e) {
                console.error('Error during event cleanup:', e);
            }
        });
        this.eventCleanups = [];
        
        // Clear timers
        if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
        if (this.hideControlsTimeout) clearTimeout(this.hideControlsTimeout);
    },
    
    /**
     * Register cleanup function for event listeners
     */
    registerCleanup(cleanupFn) {
        this.eventCleanups.push(cleanupFn);
    }
};

// =============================================================================
// DOM REFERENCES
// =============================================================================

const DOM = {
    channelList: null,
    channelName: null,
    videoWrapper: null,
    loader: null,
    unmuteBtn: null,
    qualitySelector: null,
    
    init() {
        this.channelList = document.getElementById("channel-list");
        this.channelName = document.getElementById("channel-name");
        this.videoWrapper = document.getElementById("videoWrapper");
        this.loader = document.getElementById("loader");
        this.unmuteBtn = document.getElementById("unmuteBtn");
        this.qualitySelector = document.getElementById("qualitySelector");
    }
};

// =============================================================================
// CONFIGURATION
// =============================================================================

const Config = {
    MAX_FALLBACK_ATTEMPTS: 2,
    NETWORK_SPEED_TEST_RUNS: 2,
    AUTOPLAY_DELAY: 500,
    SCROLL_DEBOUNCE_DELAY: 1000,
    CONTROLS_HIDE_DELAY: 3000,
    
    HLS: {
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        enableWorker: true,
        backBufferLength: 30
    },
    
    SHAKA: {
        streaming: {
            bufferingGoal: 15,
            rebufferingGoal: 2,
            bufferBehind: 25,
            lowLatencyMode: false,
            retryParameters: {
                maxAttempts: 5,
                baseDelay: 1000,
                backoffFactor: 2
            }
        }
    }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const Utils = {
    /**
     * Show or hide loader
     */
    showLoader(show) {
        DOM.loader.style.display = show ? 'block' : 'none';
        
        if (show) {
            DOM.channelName.classList.add('loading');
        } else {
            DOM.channelName.classList.remove('loading');
        }
    },
    
    /**
     * Log with prefix
     */
    log(...args) {
        console.log('[IPTV]', ...args);
    },
    
    /**
     * Format time display
     */
    formatTime(seconds) {
        if (!isFinite(seconds) || seconds > 86400) {
            return 'LIVE';
        }
        
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    
    /**
     * Format time display with duration
     */
    formatTimeDisplay(currentTime, duration) {
        if (!isFinite(duration) || duration > 86400) {
            return 'LIVE';
        }
        return `${this.formatTime(currentTime)} / ${this.formatTime(duration)}`;
    },
    
    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    /**
     * Get ready state text
     */
    getReadyStateText(state) {
        const states = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'];
        return states[state] || 'UNKNOWN';
    },
    
    /**
     * Get network state text
     */
    getNetworkStateText(state) {
        const states = ['NETWORK_EMPTY', 'NETWORK_IDLE', 'NETWORK_LOADING', 'NETWORK_NO_SOURCE'];
        return states[state] || 'UNKNOWN';
    }
};


// =============================================================================
// FETCH MANAGEMENT GitHub JSON fetcher BEFORE ChannelManager.init
// =============================================================================

let channels = [];

/**const CHANNELS_URL =
  'https://raw.githubusercontent.com/aishepisonet/freeCCTV/refs/heads/main/public/channels.json';

async function loadChannelsFromGitHub() {
  try {
    Utils.log('🌐 Fetching channels.json from GitHub...');

    const res = await fetch(CHANNELS_URL, { cache: 'no-store' });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    channels = await res.json();

    if (!Array.isArray(channels)) {
      throw new Error('channels.json is not an array');
    }

    Utils.log(`✅ Loaded ${channels.length} channels`);

    ChannelManager.init(); // 🔥 NOW init works
  } catch (err) {
    console.error('❌ Channel load failed:', err);

    DOM.channelName.textContent = 'Failed to load channels';
    DOM.channelList.innerHTML = `
      <div style="color:#ff6b6b; padding:20px; text-align:center;">
        Failed to load channels.json<br>
        ${err.message}
      </div>
    `;
  }
}
*/

async function loadChannelsFromPublic() {
  try {
    Utils.log('📡 Loading channels from /channels.json');

    const res = await fetch('./channels.json', { cache: 'no-store' });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error('channels.json is not an array');
    }

    channels = data; // 🔥 THIS feeds ChannelManager

    Utils.log(`✅ Loaded ${channels.length} channels`);

    ChannelManager.init(); // 🚀 NOW it works
  } catch (err) {
    console.error('❌ Failed to load channels.json', err);

    DOM.channelName.textContent = 'Failed to load channels';
    DOM.channelList.innerHTML = `
      <div style="color:#ff6b6b; text-align:center; padding:20px;">
        Failed to load channels.json<br>
        ${err.message}
      </div>
    `;
  }
}

// =============================================================================
// CHANNEL MANAGEMENT
// =============================================================================

const ChannelManager = {
    fallbackAttempts: 0,
    
    /**
     * Initialize channels with validation and auto-play
     */
    init() {
        try {
            if (!Array.isArray(channels)) {
                throw new Error('Channels data is not a valid array');
            }
            
            Utils.log(`📺 Found ${channels.length} channels`);
            
            // Validate and clean channels data
            const validatedChannels = this.validateChannels(channels);
            
            this.buildChannelList(validatedChannels);
            
            if (validatedChannels.length > 0) {
                const firstChannel = validatedChannels[0];
                Utils.log('🎬 Auto-playing first channel:', firstChannel.name);
                
                DOM.channelName.textContent = firstChannel.name;
                
                setTimeout(() => {
                    this.loadChannel(firstChannel);
                }, Config.AUTOPLAY_DELAY);
            } else {
                DOM.channelName.textContent = "No channels available";
                Utils.log('❌ No channels available');
            }
            
        } catch (err) {
            console.error("Failed to initialize channels:", err);
            DOM.channelName.textContent = "Failed to load channels";
            
            DOM.channelList.innerHTML = `<div style="color: #ff6b6b; text-align: center; padding: 20px;">
                Error loading channels: ${err.message}
            </div>`;
        }
    },
    
    /**
     * Validate and clean channels data
     */
    validateChannels(channels) {
        if (!Array.isArray(channels)) {
            console.error('Channels data is not an array');
            return [];
        }
        
        return channels.map((channel, index) => {
            const validated = {
                name: channel.name || `Channel ${index + 1}`,
                type: channel.type || 'm3u8',
                link: channel.link || '',
                logo: channel.logo && channel.logo !== 'undefined' ? channel.logo : '',
                ...channel
            };
            
            if (!validated.link) {
                console.warn(`Channel "${validated.name}" has no stream link`);
            }
            
            return validated;
        });
    },
    
    /**
     * Build channel list UI
     */
    buildChannelList(channels) {
        DOM.channelList.innerHTML = "";
        
        const placeholderSvg = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjZmZmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIj5OTyBMT0dPPC90ZXh0Pjwvc3ZnPg==';
        
        channels.forEach((channel, index) => {
            const div = document.createElement("div");
            div.className = "channel";
            div.title = channel.name || 'Unnamed Channel';
            
            const logoUrl = channel.logo || placeholderSvg;
            div.innerHTML = `<img src="${logoUrl}" alt="${channel.name}" onerror="this.src='${placeholderSvg}'" loading="lazy">`;
            
            div.addEventListener("click", () => {
                document.querySelectorAll(".channel").forEach(el => el.classList.remove("active"));
                div.classList.add("active");
                this.loadChannel(channel);
            });
            
            DOM.channelList.appendChild(div);
            
            if (index === 0) {
                div.classList.add("active");
            }
        });
        
        // Optimized scroll handling with debounce
        const handleScroll = Utils.debounce(() => {
            DOM.channelList.classList.remove('has-active');
            
            if (DOM.channelList.querySelector('.channel.active')) {
                DOM.channelList.classList.add('has-active');
            }
        }, Config.SCROLL_DEBOUNCE_DELAY);
        
        DOM.channelList.addEventListener('scroll', handleScroll);
        
        // Register cleanup
        AppState.registerCleanup(() => {
            DOM.channelList.removeEventListener('scroll', handleScroll);
        });
    },
    
    /**
     * Load a channel
     */
    async loadChannel(channel) {
        if (!channel || !channel.type) return;
        
        DOM.channelName.textContent = channel.name;
        Utils.showLoader(true);
        
        // Reset fallback attempts for new channel
        this.fallbackAttempts = 0;
        
        try {
            if (channel.type === "youtube") {
                await PlayerManager.loadYouTube(channel.link);
            } else if (channel.type === "m3u8") {
                await PlayerManager.loadHls(channel.link);
            } else if (channel.type === "mpd") {
                Utils.log(`Loading MPD with smart DRM: ${channel.name}`);
                await PlayerManager.loadStreamWithSmartDRM(channel);
            } else {
                throw new Error(`Unsupported stream type: ${channel.type}`);
            }
        } catch (error) {
            console.error('Error loading channel:', error);
            DOM.channelName.textContent = `${channel.name} - Error: ${error.message}`;
            Utils.showLoader(false);
            
            await this.handleLoadErrorFallback(channel, error);
        }
    },
    
    /**
     * Handle fallback when loading fails
     */
    async handleLoadErrorFallback(channel, error) {
        if (this.fallbackAttempts >= Config.MAX_FALLBACK_ATTEMPTS) {
            console.error('Maximum fallback attempts reached');
            DOM.channelName.textContent = `${channel.name} - Unable to load`;
            return;
        }
        
        this.fallbackAttempts++;
        Utils.log(`Attempting fallback ${this.fallbackAttempts} for ${channel.name}`);
        
        if (channel.link && channel.link.includes('.mpd')) {
            Utils.log('🔄 Falling back to Shaka Player...');
            
            try {
                await PlayerManager.loadWithShakaPlayer(channel.link, {
                    clearKeys: channel.clearKeys || {},
                    servers: channel.licenseServer ? {
                        'com.widevine.alpha': channel.licenseServer
                    } : {}
                });
            } catch (shakaError) {
                console.error('Shaka fallback failed:', shakaError);
                
                // Final fallback to HLS
                const hlsLink = channel.link.replace('.mpd', '.m3u8');
                if (hlsLink !== channel.link) {
                    Utils.log('🔄 Trying HLS fallback...');
                    await PlayerManager.loadHls(hlsLink);
                } else {
                    DOM.channelName.textContent = `${channel.name} - Failed to load`;
                }
            }
        }
    }
};

// =============================================================================
// PLAYER MANAGEMENT
// =============================================================================

const PlayerManager = {
    /**
     * Setup video element with proper event handlers
     */
    setupVideoElement() {
        const video = document.createElement("video");
        video.setAttribute("playsinline", "true");
        video.controls = true;
        video.autoplay = true;
        video.muted = false;
        video.preload = "auto";
        video.style.width = "100%";
        video.style.height = "100%";
        video.className = "shaka-video";
        
        // Event listeners for monitoring
        video.addEventListener('loadstart', () => {
            Utils.log('🚀 Video load started');
        });
        
        video.addEventListener('progress', () => {
            if (video.buffered.length > 0) {
                const bufferedEnd = video.buffered.end(0);
                const currentTime = video.currentTime;
                
                if (video.duration > 86400) {
                    const bufferAhead = bufferedEnd - currentTime;
                    Utils.log(`📥 Live buffer: ${bufferAhead.toFixed(1)}s ahead`);
                } else {
                    Utils.log(`📥 Buffered: ${Utils.formatTime(bufferedEnd)}`);
                }
            }
        });
        
        video.addEventListener('canplay', () => {
            Utils.log('✅ Video can play');
        });
        
        video.addEventListener('error', (e) => {
            console.error('🎬 Video error:', {
                readyState: Utils.getReadyStateText(video.readyState),
                networkState: Utils.getNetworkStateText(video.networkState),
                error: video.error,
                src: video.currentSrc
            });
            
            this.handleVideoError(video);
        });
        
        return video;
    },
    
    /**
     * Handle video element errors
     */
    handleVideoError(video) {
        let errorMessage = 'Video playback failed';
        
        if (video.networkState === video.NETWORK_NO_SOURCE) {
            errorMessage = 'No video source found';
        } else if (video.readyState === video.HAVE_NOTHING) {
            errorMessage = 'Video failed to load';
        } else if (video.error) {
            const codes = {
                1: 'Video loading aborted',
                2: 'Network error',
                3: 'Video decoding error',
                4: 'Video format not supported'
            };
            errorMessage = codes[video.error.code] || 'Video error';
        }
        
        DOM.channelName.textContent = `${DOM.channelName.textContent} - ${errorMessage}`;
        Utils.showLoader(false);
    },
    
    /**
     * Load YouTube stream
     */
    async loadYouTube(link) {
        if (AppState.switching) return;
        AppState.switching = true;
        
        AppState.cleanup();
        Utils.showLoader(true);
        
        const iframe = document.createElement("iframe");
        iframe.src = link;
        iframe.allow = "autoplay; encrypted-media; fullscreen";
        iframe.frameBorder = "0";
        
        iframe.onload = () => {
            Utils.showLoader(false);
            AppState.switching = false;
        };
        
        iframe.onerror = () => {
            Utils.showLoader(false);
            AppState.switching = false;
            DOM.channelName.textContent = `${DOM.channelName.textContent} - Failed to load`;
        };
        
        DOM.videoWrapper.appendChild(iframe);
    },
    
    /**
     * Load HLS stream
     */
    async loadHls(link) {
        if (AppState.switching) return;
        AppState.switching = true;
        
        AppState.cleanup();
        Utils.showLoader(true);
        
        const video = this.setupVideoElement();
        AppState.currentVideo = video;
        DOM.videoWrapper.appendChild(video);
        
        if (Hls.isSupported()) {
            const hls = new Hls(Config.HLS);
            AppState.currentHls = hls;
            
            hls.attachMedia(video);
            hls.loadSource(link);
            
            hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
                if (data.levels?.length > 1) {
                    QualityManager.populateSelector(hls, data.levels);
                } else {
                    DOM.qualitySelector.style.display = "none";
                }
                
                Utils.showLoader(false);
                video.play().catch(() => {
                    DOM.unmuteBtn.style.display = 'block';
                });
                AppState.switching = false;
            });
            
            hls.on(Hls.Events.ERROR, (_, data) => {
                if (data.fatal) {
                    console.error('Fatal HLS error:', data);
                    hls.destroy();
                    AppState.switching = false;
                }
            });
            
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            // Safari native HLS
            video.src = link;
            video.addEventListener("loadedmetadata", () => {
                video.play().catch(() => {
                    DOM.unmuteBtn.style.display = 'block';
                });
                Utils.showLoader(false);
                AppState.switching = false;
            });
        } else {
            Utils.log("HLS not supported");
            Utils.showLoader(false);
            AppState.switching = false;
        }
    },
    
    /**
     * Load DASH stream with smart DRM
     */
    async loadStreamWithSmartDRM(streamData) {
        if (AppState.switching) return;
        AppState.switching = true;
        
        AppState.cleanup();
        Utils.showLoader(true);
        
        setTimeout(() => { AppState.switching = false; }, 500);
        
        try {
            const video = this.setupVideoElement();
            DOM.videoWrapper.appendChild(video);
            AppState.currentVideo = video;
            
            shaka.polyfill.installAll();
            const player = new shaka.Player();
            await player.attach(video);
            AppState.currentShaka = player;
            
            // Get or detect DRM support
            const drmSupport = AppState.drmSupport || await DRMManager.detectSupport();
            AppState.drmSupport = drmSupport;
            
            Utils.log('🎯 Smart DRM loading with support:', drmSupport);
            
            // Configure DRM
            const drmConfig = await DRMManager.buildConfig(streamData, drmSupport);
            
            if (Object.keys(drmConfig.servers).length > 0 || Object.keys(drmConfig.clearKeys || {}).length > 0) {
                player.configure({ drm: drmConfig });
                Utils.log('🔒 DRM configured:', drmConfig);
            } else {
                Utils.log('ℹ️ No DRM configuration - playing without DRM');
            }
            
            // Configure streaming settings
            player.configure(Config.SHAKA);
            
            // Load stream
            await player.load(streamData.link);
            Utils.log('✅ Stream loaded successfully');
            
            Utils.showLoader(false);
            
            // Attempt autoplay
            try {
                await video.play();
                Utils.log('▶️ Playback started');
            } catch (err) {
                Utils.log('Autoplay prevented:', err.message);
                DOM.unmuteBtn.style.display = 'block';
            }
            
            // Setup live stream controls if applicable
            if (player.isLive()) {
                ControlsManager.setupLiveDisplay(video, player);
            }
            
        } catch (error) {
            console.error('💥 Smart DRM load failed:', error);
            DRMManager.handleFallback(streamData, error);
        }
    },
    
    /**
     * Load with Shaka Player (fallback)
     */
    async loadWithShakaPlayer(url, licenseData = null) {
        Utils.log('🔧 Loading with Shaka Player fallback:', url);
        
        if (!shaka.Player.isBrowserSupported()) {
            throw new Error('Shaka Player not supported in this browser');
        }
        
        try {
            const video = AppState.currentVideo || this.setupVideoElement();
            if (!AppState.currentVideo) {
                DOM.videoWrapper.appendChild(video);
                AppState.currentVideo = video;
            }
            
            const player = new shaka.Player();
            await player.attach(video);
            AppState.currentShaka = player;
            
            if (licenseData) {
                player.configure({
                    drm: {
                        clearKeys: licenseData.clearKeys || {},
                        servers: licenseData.servers || {}
                    }
                });
            }
            
            player.configure(Config.SHAKA);
            
            await player.load(url);
            Utils.log('✅ Shaka fallback loaded');
            
            Utils.showLoader(false);
            await video.play().catch(e => Utils.log('Autoplay prevented:', e.message));
            
            return player;
            
        } catch (error) {
            console.error('❌ Shaka fallback failed:', error);
            throw error;
        }
    }
};

// =============================================================================
// DRM MANAGEMENT
// =============================================================================

const DRMManager = {
    /**
     * Detect DRM support
     */
    async detectSupport() {
        return new Promise((resolve) => {
            const support = {
                widevine: false,
                clearkey: false,
                playready: false
            };
            
            const widevineConfig = [{
                initDataTypes: ['cenc'],
                audioCapabilities: [{
                    contentType: 'audio/mp4; codecs="mp4a.40.2"',
                    robustness: 'SW_SECURE_CRYPTO'
                }],
                videoCapabilities: [{
                    contentType: 'video/mp4; codecs="avc1.42E01E"',
                    robustness: 'SW_SECURE_CRYPTO'
                }],
                distinctiveIdentifier: 'optional',
                persistentState: 'optional',
                sessionTypes: ['temporary']
            }];
            
            const clearkeyConfig = [{
                initDataTypes: ['cenc'],
                audioCapabilities: [{
                    contentType: 'audio/mp4; codecs="mp4a.40.2"',
                    robustness: ''
                }],
                videoCapabilities: [{
                    contentType: 'video/mp4; codecs="avc1.42E01E"',
                    robustness: ''
                }],
                distinctiveIdentifier: 'not-allowed',
                persistentState: 'not-allowed',
                sessionTypes: ['temporary']
            }];
            
            // Test Widevine
            navigator.requestMediaKeySystemAccess('com.widevine.alpha', widevineConfig)
                .then(() => {
                    support.widevine = true;
                    Utils.log('✅ Widevine supported');
                })
                .catch(() => {
                    support.widevine = false;
                    Utils.log('❌ Widevine not supported');
                })
                .finally(() => {
                    // Test ClearKey
                    navigator.requestMediaKeySystemAccess('org.w3.clearkey', clearkeyConfig)
                        .then(() => {
                            support.clearkey = true;
                            Utils.log('✅ ClearKey supported');
                        })
                        .catch(() => {
                            support.clearkey = false;
                            Utils.log('❌ ClearKey not supported');
                        })
                        .finally(() => resolve(support));
                });
        });
    },
    
    /**
     * Build DRM configuration
     */
    async buildConfig(streamData, drmSupport) {
        const drmConfig = {
            servers: {},
            advanced: {},
            clearKeys: {}
        };
        
        // Priority 1: Use specified DRM type if supported
        if (streamData.drmType === 'widevine' && streamData.licenseServer && drmSupport.widevine) {
            drmConfig.servers['com.widevine.alpha'] = streamData.licenseServer;
            drmConfig.advanced['com.widevine.alpha'] = {
                videoRobustness: "SW_SECURE_CRYPTO",
                audioRobustness: "SW_SECURE_CRYPTO"
            };
        } else if (streamData.drmType === 'clearkey' && streamData.clearkey && drmSupport.clearkey) {
            drmConfig.servers['org.w3.clearkey'] = 'data:application/json;base64,eyJrZXlzIjpbXSwidHlwZSI6InRlbXBvcmFyeSJ9';
            drmConfig.clearKeys = this.parseClearKeyData(streamData.clearkey);
        }
        // Priority 2: Auto-detect
        else if (streamData.licenseServer && drmSupport.widevine) {
            drmConfig.servers['com.widevine.alpha'] = streamData.licenseServer;
            drmConfig.advanced['com.widevine.alpha'] = {
                videoRobustness: "SW_SECURE_CRYPTO",
                audioRobustness: "SW_SECURE_CRYPTO"
            };
        } else if (streamData.clearkey && drmSupport.clearkey) {
            drmConfig.servers['org.w3.clearkey'] = 'data:application/json;base64,eyJrZXlzIjpbXSwidHlwZSI6InRlbXBvcmFyeSJ9';
            drmConfig.clearKeys = this.parseClearKeyData(streamData.clearkey);
        }
        
        return drmConfig;
    },
    
    /**
     * Parse ClearKey data
     */
    parseClearKeyData(clearkeyData) {
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
    },
    
    /**
     * Handle DRM fallback
     */
    handleFallback(streamData, error) {
        Utils.log('🔄 Handling DRM fallback...');
        Utils.showLoader(false);
        
        if (streamData.link.includes('.mpd')) {
            if (error.code === 4032 || error.code === 6001) {
                // DRM license error - try without DRM
                Utils.log('🔓 Trying without DRM...');
                const fallbackData = { ...streamData };
                delete fallbackData.licenseServer;
                delete fallbackData.clearkey;
                delete fallbackData.drmType;
                
                setTimeout(() => PlayerManager.loadStreamWithSmartDRM(fallbackData), 500);
            } else {
                // Try Shaka fallback
                Utils.log('🔄 Trying Shaka fallback...');
                PlayerManager.loadWithShakaPlayer(streamData.link, {
                    clearKeys: streamData.clearKeys || {}
                });
            }
        } else {
            DOM.channelName.textContent = `${DOM.channelName.textContent} - Playback Failed`;
        }
    }
};

// =============================================================================
// QUALITY MANAGEMENT
// =============================================================================

const QualityManager = {
    /**
     * Populate quality selector for HLS
     */
    populateSelector(hls, levels) {
        DOM.qualitySelector.innerHTML = "";
        
        const autoOption = document.createElement("option");
        autoOption.value = "auto";
        autoOption.textContent = "Auto";
        DOM.qualitySelector.appendChild(autoOption);
        
        levels.forEach((level, i) => {
            const opt = document.createElement("option");
            opt.value = i;
            const height = level.height || 'Unknown';
            const bitrate = level.bitrate ? ` (${Math.round(level.bitrate / 1000)}kbps)` : '';
            opt.textContent = `${height}p${bitrate}`;
            DOM.qualitySelector.appendChild(opt);
        });
        
        DOM.qualitySelector.style.display = "inline-block";
        
        DOM.qualitySelector.onchange = function() {
            if (this.value === "auto") {
                hls.currentLevel = -1;
            } else {
                hls.currentLevel = parseInt(this.value);
            }
        };
    }
};

// =============================================================================
// CONTROLS MANAGEMENT
// =============================================================================

const ControlsManager = {
    controls: null,
    liveIndicator: null,
    fullscreenBtn: null,
    
    /**
     * Initialize custom controls
     */
    init() {
        if (!document.getElementById('custom-controls')) {
            this.createControls();
        }
        
        this.controls = document.getElementById('custom-controls');
        this.liveIndicator = document.getElementById('live-indicator');
        this.fullscreenBtn = document.getElementById('fullscreen-btn');
        
        this.setupEventListeners();
    },
    
    /**
     * Create custom controls HTML
     */
    createControls() {
        const controlsHTML = `
            <div id="custom-controls" style="display: none;">
                <div id="live-indicator">● LIVE</div>
                <button id="fullscreen-btn" title="Toggle Fullscreen (F)">⛶</button>
            </div>
        `;
        DOM.videoWrapper.insertAdjacentHTML('beforeend', controlsHTML);
    },
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Fullscreen button
        this.fullscreenBtn.addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // Fullscreen change events
        const handleFullscreenChange = () => this.handleFullscreenChange();
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        
        // Mouse interaction
        const handleMouseMove = () => this.handleMouseMove();
        DOM.videoWrapper.addEventListener('mousemove', handleMouseMove);
        
        // Register cleanup
        AppState.registerCleanup(() => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            DOM.videoWrapper.removeEventListener('mousemove', handleMouseMove);
        });
    },
    
    /**
     * Handle mouse movement
     */
    handleMouseMove() {
        this.show();
        
        if (AppState.hideControlsTimeout) {
            clearTimeout(AppState.hideControlsTimeout);
        }
        
        AppState.hideControlsTimeout = setTimeout(() => {
            if (!this.isFullscreen()) {
                this.hide();
            }
        }, Config.CONTROLS_HIDE_DELAY);
    },
    
    /**
     * Handle fullscreen changes
     */
    handleFullscreenChange() {
        if (this.isFullscreen()) {
            this.fullscreenBtn.innerHTML = '⧉';
            this.fullscreenBtn.title = 'Exit Fullscreen (F)';
            this.show();
        } else {
            this.fullscreenBtn.innerHTML = '⛶';
            this.fullscreenBtn.title = 'Enter Fullscreen (F)';
            this.hide();
        }
    },
    
    /**
     * Show controls
     */
    show() {
        if (this.controls) {
            this.controls.style.display = 'flex';
            this.controls.style.opacity = '1';
        }
    },
    
    /**
     * Hide controls
     */
    hide() {
        if (this.controls && !this.isFullscreen()) {
            this.controls.style.opacity = '0';
            setTimeout(() => {
                if (this.controls && this.controls.style.opacity === '0') {
                    this.controls.style.display = 'none';
                }
            }, 300);
        }
    },
    
    /**
     * Toggle fullscreen
     */
    toggleFullscreen() {
        if (!this.isFullscreen()) {
            this.enterFullscreen();
        } else {
            this.exitFullscreen();
        }
    },
    
    /**
     * Enter fullscreen
     */
    enterFullscreen() {
        const element = DOM.videoWrapper;
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    },
    
    /**
     * Exit fullscreen
     */
    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    },
    
    /**
     * Check if in fullscreen
     */
    isFullscreen() {
        return !!(document.fullscreenElement ||
                 document.webkitFullscreenElement ||
                 document.msFullscreenElement);
    },
    
    /**
     * Setup live stream display
     */
    setupLiveDisplay(video, player) {
        const liveDiv = document.createElement('div');
        liveDiv.id = 'live-time-display';
   /**      liveDiv.style.cssText = `
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
            pointer-events: none;
            box-shadow: 0 2px 10px rgba(0,0,0,0.5);
        `;
     */   
        liveDiv.textContent = '● LIVE';
        
        DOM.videoWrapper.appendChild(liveDiv);
        
        let lastUpdateTime = Date.now();
        
        const updateDisplay = () => {
            if (!player || !video) return;
            
            try {
                const now = Date.now();
                const timeSinceUpdate = now - lastUpdateTime;
                
                if (timeSinceUpdate > 2000) {
                    liveDiv.textContent = `LIVE -${Math.round(timeSinceUpdate / 1000)}s`;
                    liveDiv.style.background = 'rgba(255, 165, 0, 0.9)';
                } else {
                    liveDiv.textContent = '● LIVE';
                    liveDiv.style.background = 'rgba(255, 50, 50, 0.9)';
                }
                
                lastUpdateTime = now;
            } catch (error) {
                liveDiv.textContent = '● LIVE';
            }
        };
        
        const interval = setInterval(updateDisplay, 1000);
        video.addEventListener('timeupdate', () => { lastUpdateTime = Date.now(); });
        
        // Cleanup
        const cleanup = () => {
            clearInterval(interval);
            if (liveDiv.parentNode) liveDiv.remove();
        };
        
        video.addEventListener('emptied', cleanup);
        video.addEventListener('error', cleanup);
        
        AppState.registerCleanup(cleanup);
        
        return cleanup;
    }
};

// =============================================================================
// NETWORK DIAGNOSTICS (Optional - Call manually)
// =============================================================================

const NetworkDiagnostics = {
    /**
     * Measure network speed once
     */
    async measureSpeedOnce(testFile = 'https://httpbin.org/stream-bytes/5000000', timeoutMs = 7000) {
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
    },
    
    /**
     * Detect network speed with multiple runs
     */
    async detectNetworkSpeed(runs = 2) {
        console.group('📊 Network Speed Test');
        let totalSpeed = 0;
        
        for (let i = 0; i < runs; i++) {
            const speed = await this.measureSpeedOnce();
            console.log(`Run ${i + 1}: ${speed.toFixed(2)} Mbps`);
            totalSpeed += speed;
        }
        
        const avgSpeed = totalSpeed / runs;
        console.log(`📡 Average: ${avgSpeed.toFixed(2)} Mbps`);
        console.groupEnd();
        
        AppState.networkSpeed = avgSpeed;
        return avgSpeed;
    },
    
    /**
     * Get optimized config based on speed
     */
    getOptimizedConfig(speedMbps) {
        const configs = {
            slow: {
                bufferingGoal: 10,
                rebufferingGoal: 1,
                bufferBehind: 15,
                maxBandwidth: 1500000,
                maxResolution: '360p'
            },
            moderate: {
                bufferingGoal: 15,
                rebufferingGoal: 1.5,
                bufferBehind: 20,
                maxBandwidth: 2500000,
                maxResolution: '480p'
            },
            fast: {
                bufferingGoal: 30,
                rebufferingGoal: 2,
                bufferBehind: 30,
                maxBandwidth: 8000000,
                maxResolution: '1080p'
            }
        };
        
        if (speedMbps < 2) return configs.slow;
        if (speedMbps <= 5) return configs.moderate;
        return configs.fast;
    }
};

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the application
 */
function initApp() {
    Utils.log('🚀 Initializing IPTV Player...');
    
    // Initialize DOM references
    DOM.init();
    
    // Check library availability
    Utils.log('HLS.js available:', typeof Hls !== 'undefined');
    Utils.log('Shaka Player available:', typeof shaka !== 'undefined');
    
    // Initialize controls
    ControlsManager.init();
    
    // Initialize channels
    ChannelManager.init();
    
    Utils.log('✅ Initialization complete');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Fallback initialization on full page load
window.addEventListener('load', function() {
    if (!window.appInitialized) {
        Utils.log('📄 Fallback initialization on window.load');
        window.appInitialized = true;
        initApp();
    }
});
// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  loadChannelsFromPublic();
});

// =============================================================================
// GLOBAL API (for console debugging)
// =============================================================================

window.IPTVPlayer = {
    // Expose key modules for debugging
    state: AppState,
    channels: ChannelManager,
    player: PlayerManager,
    drm: DRMManager,
    network: NetworkDiagnostics,
    utils: Utils,
    
    // Helper functions
    async testNetworkSpeed() {
        return await NetworkDiagnostics.detectNetworkSpeed();
    },
    
    getCurrentChannel() {
        const active = document.querySelector('.channel.active');
        return active ? active.title : 'None';
    },
    
    getPlayerInfo() {
        return {
            hasHLS: !!AppState.currentHls,
            hasShaka: !!AppState.currentShaka,
            hasVideo: !!AppState.currentVideo,
            drmSupport: AppState.drmSupport,
            networkSpeed: AppState.networkSpeed
        };
    }
};

Utils.log('💡 Debug API available at window.IPTVPlayer');





