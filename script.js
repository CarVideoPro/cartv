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
    const fullscreenBtn = document.getElementById('fullscreenBtn');

    // Yeni Eklenenler: Swipe için DOM elemanları
    const playerContainer = document.getElementById('playerContainer'); // playerContainer zaten HTML'de var
    const swipeLeftArea = document.getElementById('swipeLeft'); // HTML'den gelmeli
    const swipeRightArea = document.getElementById('swipeRight'); // HTML'den gelmeli


    // --- HLS.js Setup ---
    let hls;
    if (Hls.isSupported()) {
        hls = new Hls();
        hls.attachMedia(videoPlayer);
        // HLS.js hata yönetimi
        hls.on(Hls.Events.ERROR, function(event, data) {
            console.error('HLS.js hata:', data);
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.error('Fatal network error, attempting to recover...');
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.error('Fatal media error, attempting to recover...');
                        hls.recoverMediaError();
                        break;
                    default:
                        console.error('Unrecoverable HLS.js error, destroying HLS instance.');
                        hls.destroy();
                        // Opsiyonel: Kullanıcıya bilgi ver veya varsayılan bir kanala geç
                        selectedChannelName.textContent = "Video oynatılamıyor: Bir hata oluştu.";
                        selectedChannelLogo.src = "placeholder.png";
                        videoPlayer.src = '';
                        break;
                }
            }
        });
    }

    // --- Swipe Variables ---
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50; // Minimum kaydırma mesafesi (piksel)


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
                // Kategoriyi değiştirdiğimizde ilk kanalı oynat (eğer varsa)
                const firstChannelInNewCategory = channels.find(ch => ch.type === selectedCategoryId);
                if (firstChannelInNewCategory) {
                    playChannel(firstChannelInNewCategory, true); // True ile otomatk oynatma denemesi yap
                } else {
                    // Eğer yeni kategoride hiç kanal yoksa, oynatıcıyı temizle
                    selectedChannelName.textContent = "Bu kategoride kanal bulunmuyor.";
                    selectedChannelLogo.src = "placeholder.png";
                    videoPlayer.src = '';
                    if (hls) hls.destroy(); // HLS instance'ını temizle
                    currentChannel = null;
                }
            });
            optionsContainer.appendChild(option);
        });
    }

    /** Toggles fullscreen mode for the player container */
    function toggleFullscreen() {
        // Bu, doğrudan video oynatıcının tam ekran moduna geçmesini sağlar.
        if (videoPlayer.requestFullscreen) {
            videoPlayer.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                alert(`Tam ekran moduna geçilemiyor: ${err.message}`);
            });
        } else if (videoPlayer.mozRequestFullScreen) { // Firefox
            videoPlayer.mozRequestFullScreen().catch(err => {
                console.error(`Firefox fullscreen error: ${err.message} (${err.name})`);
                alert(`Tam ekran moduna geçilemiyor: ${err.message}`);
            });
        } else if (videoPlayer.webkitRequestFullscreen) { // Chrome, Safari and Opera
            videoPlayer.webkitRequestFullscreen().catch(err => {
                console.error(`Webkit fullscreen error: ${err.message} (${err.name})`);
                alert(`Tam ekran moduna geçilemiyor: ${err.message}`);
            });
        } else if (videoPlayer.msRequestFullscreen) { // IE/Edge
            videoPlayer.msRequestFullscreen().catch(err => {
                console.error(`MS fullscreen error: ${err.message} (${err.name})`);
                alert(`Tam ekran moduna geçilemiyor: ${err.message}`);
            });
        }
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
                renderChannelList(); // Kategoride kanal yoksa listeyi yine de render et
                selectedChannelName.textContent = "Bu kategoride kanal bulunmuyor.";
                selectedChannelLogo.src = "placeholder.png";
                videoPlayer.src = '';
                if (hls) hls.destroy();
            }

        } catch (error) {
            console.error("Could not fetch or parse channels.txt:", error);
            channelListContainer.innerHTML = 'Kanallar yüklenemedi. Lütfen kanallar dosyasının (channels.txt) doğru yolda olduğundan ve formatının düzgün olduğundan emin olun.';
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
            // Kaydırma ile değiştirilen kanalı listede bulup aktif hale getirmek için data-id ekleyelim
            channelItem.dataset.id = channel.id;
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

        // Mevcut kanalı listede bulup görünür hale getir
        if (currentChannel) {
            const activeItem = channelListContainer.querySelector(`.channel-item[data-id="${currentChannel.id}"]`);
            if (activeItem) {
                activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        channelListContainer.scrollTop = scrollPosition; // Scroll pozisyonunu koru
    }

    /**
     * Plays the selected channel.
     * @param {object} channel - The channel object to play.
     * @param {boolean} isAutoplay - If true, ensures player.play() is called.
     */
    function playChannel(channel, isAutoplay = false) {
        // Mevcut kanalı zaten oynatıyorsak tekrar yüklemeye gerek yok
        if (currentChannel && currentChannel.id === channel.id && !videoPlayer.paused) {
            console.log("Aynı kanal zaten oynatılıyor:", channel.name);
            renderChannelList(); // Aktif sınıfını güncellemek için tekrar render et
            return;
        }

        currentChannel = channel;
        selectedChannelLogo.src = channel.icon;
        selectedChannelLogo.onerror = () => { selectedChannelLogo.src = 'placeholder.png'; }; // Hata durumunda placeholder
        selectedChannelName.textContent = channel.name;

        // Oynatıcıyı her kanal değişiminde temizle ve yeniden başlat
        if (hls) {
            hls.destroy();
            hls = new Hls();
            hls.attachMedia(videoPlayer);
            // Hata yöneticisini tekrar bağla
            hls.on(Hls.Events.ERROR, function(event, data) {
                console.error('HLS.js hata:', data);
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.error('Fatal network error, attempting to recover...');
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.error('Fatal media error, attempting to recover...');
                            hls.recoverMediaError();
                            break;
                        default:
                            console.error('Unrecoverable HLS.js error, destroying HLS instance.');
                            hls.destroy();
                            selectedChannelName.textContent = "Video oynatılamıyor: Bir hata oluştu.";
                            selectedChannelLogo.src = "placeholder.png";
                            videoPlayer.src = '';
                            break;
                    }
                }
            });
        }


        if (hls && Hls.isSupported()) {
            hls.loadSource(channel.url);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                videoPlayer.play().catch(e => {
                    console.error("Autoplay/Play was prevented:", e);
                    // Kullanıcı etkileşimi olmadan otomatik oynatma engellenirse sesi kapat ve uyarı göster
                    videoPlayer.muted = true;
                    unmuteOverlayBtn.classList.remove('hidden');
                });
            });
        } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            videoPlayer.src = channel.url;
            videoPlayer.addEventListener('loadedmetadata', function() {
                videoPlayer.play().catch(e => {
                    console.error("Autoplay/Play was prevented (native):", e);
                    videoPlayer.muted = true;
                    unmuteOverlayBtn.classList.remove('hidden');
                });
            }, { once: true }); // Sadece bir kez tetiklensin
        } else {
            console.warn('Tarayıcınız M3U8 formatını desteklemiyor veya HLS.js yüklenemedi.');
            selectedChannelName.textContent = "Kanal oynatılamıyor: Tarayıcı desteği yok.";
            selectedChannelLogo.src = "placeholder.png";
            videoPlayer.src = '';
        }

        // Eğer kullanıcı bir kanala tıklarsa (otomatik oynatma değilse), sesli başlasın
        if (!isAutoplay) {
             videoPlayer.muted = false;
             unmuteOverlayBtn.classList.add('hidden');
        }

        renderChannelList(); // Aktif kanalı işaretlemek için listeyi yeniden render et
    }


    /**
     * Plays the next channel in the current category.
     */
    function playNextChannel() {
        const filteredChannels = channels.filter(channel => channel.type === selectedCategoryId);
        if (filteredChannels.length === 0) return;

        let currentIndex = filteredChannels.findIndex(ch => currentChannel && ch.id === currentChannel.id);
        let nextIndex = (currentIndex + 1) % filteredChannels.length;
        playChannel(filteredChannels[nextIndex], false); // Swipe kullanıcı etkileşimi sayılır
    }

    /**
     * Plays the previous channel in the current category.
     */
    function playPreviousChannel() {
        const filteredChannels = channels.filter(channel => channel.type === selectedCategoryId);
        if (filteredChannels.length === 0) return;

        let currentIndex = filteredChannels.findIndex(ch => currentChannel && ch.id === currentChannel.id);
        let prevIndex = (currentIndex - 1 + filteredChannels.length) % filteredChannels.length;
        playChannel(filteredChannels[prevIndex], false); // Swipe kullanıcı etkileşimi sayılır
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

    unmuteOverlayBtn.addEventListener('click', () => {
        videoPlayer.muted = false;
        unmuteOverlayBtn.classList.add('hidden');
        videoPlayer.play().catch(e => console.error("Unmute sonrası oynatma hatası:", e));
    });

    // Hide the unmute button if the user unmutes using the video player's native controls.
    videoPlayer.addEventListener('volumechange', () => {
        if (!videoPlayer.muted) {
            unmuteOverlayBtn.classList.add('hidden');
        }
    });

    fullscreenBtn.addEventListener('click', toggleFullscreen);

    // Yeni Eklenenler: Swipe olay dinleyicileri
    if (swipeLeftArea && swipeRightArea) {
        [swipeLeftArea, swipeRightArea].forEach(area => {
            area.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
            }, { passive: true }); // Performansı artırmak için passive: true

            area.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].clientX;
                handleSwipe();
            });

            // Fare (mouse) ile kaydırma için (isteğe bağlı, masaüstünde kullanışlı)
            area.addEventListener('mousedown', (e) => {
                touchStartX = e.clientX;
            });

            area.addEventListener('mouseup', (e) => {
                touchEndX = e.clientX;
                handleSwipe();
            });
        });
    } else {
        console.warn("Swipe alanları (swipeLeft/swipeRight) HTML'de bulunamadı. Kaydırma özelliği çalışmayacak.");
    }


    function handleSwipe() {
        const swipeDistance = touchEndX - touchStartX;

        if (swipeDistance > minSwipeDistance) {
            // Sağa kaydırma (önceki kanal)
            playPreviousChannel();
        } else if (swipeDistance < -minSwipeDistance) {
            // Sola kaydırma (sonraki kanal)
            playNextChannel();
        }
        // Sıfırlama
        touchStartX = 0;
        touchEndX = 0;
    }


    // --- Initial Load ---
    setupCategoryFilter();
    fetchChannels();
});
