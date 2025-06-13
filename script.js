// script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- State & Constants ---
    const CATEGORIES = [
        { id: 0, name: 'Ulusal' }, { id: 1, name: 'Haber' },
        { id: 2, name: 'Spor' }, { id: 3, name: 'Müzik' },
        { id: 4, name: 'Dini' }, { id: 5, name: 'Belgesel' },
        { id: 6, name: 'Çocuk' }, { id: 7, name: 'Yerel' },
        { id: 8, name: 'Diğer' }
    ];
    let channels = [];
    let currentChannel = null;
    let selectedCategoryId = 0;

    // --- DOM Elements ---
    const videoPlayer = document.getElementById('videoPlayer');
    const selectedChannelLogo = document.getElementById('selectedChannelLogo');
    const selectedChannelName = document.getElementById('selectedChannelName');
    const channelListContainer = document.getElementById('channelList');
    // Custom Select Elements
    const customSelect = document.getElementById('customCategoryFilter');
    const selectTrigger = customSelect.querySelector('.select-trigger');
    const selectedCategoryNameEl = document.getElementById('selectedCategoryName');
    const optionsContainer = customSelect.querySelector('.select-options');
    const unmuteOverlayBtn = document.getElementById('unmuteOverlayBtn');


    // --- HLS.js Setup ---
    let hls;
    if (Hls.isSupported()) {
        hls = new Hls();
        hls.attachMedia(videoPlayer);
    }

    /**
     * Populates the custom category dropdown and sets initial value.
     */
    function setupCategoryFilter() {
        optionsContainer.innerHTML = '';
        CATEGORIES.forEach(category => {
            const option = document.createElement('div');
            option.classList.add('select-option');
            option.textContent = category.name;
            option.dataset.value = category.id;

            if (category.id === selectedCategoryId) {
                option.classList.add('selected');
                selectedCategoryNameEl.textContent = category.name;
            }

            option.addEventListener('click', () => {
                selectedCategoryId = category.id;
                selectedCategoryNameEl.textContent = category.name;
                customSelect.classList.remove('open');
                
                // Remove 'selected' from all options and add to the clicked one
                optionsContainer.querySelectorAll('.select-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');

                renderChannelList();
            });
            optionsContainer.appendChild(option);
        });
    }

    /**
     * Fetches channels and autoplays the first one.
     */
    async function fetchChannels() {
        try {
            const response = await fetch('./channels.txt');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.text();
            channels = data
                .split('\n')
                .filter(line => line.trim() !== '' && !line.startsWith('#'))
                .map((line, index) => {
                    const [name, url, icon, type] = line.split(',').map(s => s.trim());
                    return { id: index, name, url, icon, type: parseInt(type, 10) };
                });

            // Autoplay the first channel of the initial category
            const firstChannelToPlay = channels.find(ch => ch.type === selectedCategoryId);
            if (firstChannelToPlay) {
                playChannel(firstChannelToPlay, true);
                // After starting the video, check if it's muted. If so, show our unmute button.
                if (videoPlayer.muted) {
                    unmuteOverlayBtn.classList.remove('hidden');
                }
            } else {
                renderChannelList();
            }

        } catch (error) {
            console.error("Could not fetch or parse channels.txt:", error);
            channelListContainer.innerHTML = 'Error loading channels.';
        }
    }

    /**
     * Renders the channel list based on the selected category.
     */
    function renderChannelList() {
        const scrollPosition = channelListContainer.scrollTop;
        channelListContainer.innerHTML = '';

        const filteredChannels = channels.filter(channel => channel.type === selectedCategoryId);

        if (filteredChannels.length === 0) {
            const noChannelsDiv = document.createElement('div');
            noChannelsDiv.textContent = 'Bu kategoride kanal bulunmuyor.';
            noChannelsDiv.style.padding = '10px 16px';
            noChannelsDiv.style.color = 'var(--on-surface-variant)';
            channelListContainer.appendChild(noChannelsDiv);
            return;
        }

        filteredChannels.forEach(channel => {
            const channelItem = document.createElement('div');
            channelItem.className = 'channel-item';
            if (currentChannel && currentChannel.id === channel.id) {
                channelItem.classList.add('active');
            }
            channelItem.addEventListener('click', () => playChannel(channel, false));
            
            const logo = document.createElement('img');
            logo.src = channel.icon;
            logo.alt = `${channel.name} Logo`;
            logo.onerror = () => { logo.src = 'placeholder.png'; };

            const name = document.createElement('span');
            name.textContent = channel.name;

            channelItem.appendChild(logo);
            channelItem.appendChild(name);
            channelListContainer.appendChild(channelItem);
        });

        channelListContainer.scrollTop = scrollPosition;
    }

    /**
     * Plays the selected channel.
     * @param {object} channel - The channel object to play.
     * @param {boolean} isAutoplay - If true, ensures player.play() is called.
     */
    function playChannel(channel, isAutoplay = false) {
        currentChannel = channel;
        selectedChannelLogo.src = channel.icon;
        selectedChannelName.textContent = channel.name;

        if (hls && Hls.isSupported()) {
            hls.loadSource(channel.url);
            if (isAutoplay) {
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    videoPlayer.play().catch(e => console.error("Autoplay was prevented:", e));
                });
            }else {
                // ADD THIS ELSE BLOCK:
                // This is a user click, which counts as interaction.
                // Unmute the player and hide the overlay button permanently.
                videoPlayer.muted = false;
                unmuteOverlayBtn.classList.add('hidden');
                videoPlayer.play(); // Ensure playback starts on channel change
            }
        } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            videoPlayer.src = channel.url;
        }

        if (isAutoplay) {
             videoPlayer.play().catch(e => console.error("Autoplay was prevented:", e));
        }
        
        renderChannelList();
    }

    // --- Event Listeners ---
    selectTrigger.addEventListener('click', () => {
        customSelect.classList.toggle('open');
    });

    window.addEventListener('click', (e) => {
        if (!customSelect.contains(e.target)) {
            customSelect.classList.remove('open');
        }
    });

    // ADD THESE TWO NEW LISTENERS:
    unmuteOverlayBtn.addEventListener('click', () => {
        videoPlayer.muted = false;
        unmuteOverlayBtn.classList.add('hidden');
    });

    // Hide the unmute button if the user unmutes using the video player's native controls.
    videoPlayer.addEventListener('volumechange', () => {
        if (!videoPlayer.muted) {
            unmuteOverlayBtn.classList.add('hidden');
        }
    });

    // --- Initial Load ---
    setupCategoryFilter();
    fetchChannels();
});
