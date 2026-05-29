const trackNameEl = document.getElementById('track-name');
const artistNameEl = document.getElementById('artist-name');
const albumArtEl = document.getElementById('album-art');
const rightSide = document.getElementById('right-side');
const mainContainer = document.querySelector('main');

let currentTrackId = "";
let currentLyrics = [];
let lastActiveIndex = -1;
let isPlaying = false;
let localProgressMs = 0;
let lastSyncTimestamp = 0;

function startApp() {
    getNowPlaying();
    setInterval(getNowPlaying, 1000);
    requestAnimationFrame(animationLoop);
}

async function getNowPlaying() {
    if (!ACCESS_TOKEN) return;

    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
        });

        if (response.status === 204) {
            isPlaying = false;
            return;
        } 
        
        // Wenn der Token abgelaufen ist, lassen wir Flask das regeln!
        if (response.status === 401) {
            window.location.href = '/login'; 
            return;
        }

        const data = await response.json();
        if (data?.item) {
            isPlaying = data.is_playing;
            if (isPlaying) {
                localProgressMs = data.progress_ms;
                lastSyncTimestamp = Date.now();
            }

            if (data.item.id !== currentTrackId) {
                currentTrackId = data.item.id;
                updateUI(data.item);
            }
        }
    } catch (e) {
        console.error("Sync error:", e);
    }
}

function updateUI(item) {
    const trackName = item.name;
    const artistName = item.artists[0].name;
    const albumImg = item.album.images[0].url;

    trackNameEl.textContent = trackName;
    artistNameEl.textContent = artistName;
    albumArtEl.src = albumImg;
    document.documentElement.style.setProperty('--bg-image', `url(${albumImg})`);

    checkMarquee();
    fetchLyrics(trackName, artistName, item.duration_ms);
}

async function fetchLyrics(track, artist, duration) {
    showLoader(rightSide);
    currentLyrics = [];
    lastActiveIndex = -1;

    try {
        const res = await fetch(`https://lrclib.net/api/get?track_name=${encodeURIComponent(track)}&artist_name=${encodeURIComponent(artist)}&duration=${Math.floor(duration / 1000)}`);
        const data = await res.json();
        if (data.syncedLyrics) {
            currentLyrics = parseLRC(data.syncedLyrics);
        }
    } catch (err) {
        console.error("Lyrics error:", err);
    }
    renderLyricsToDOM(currentLyrics);
}

function parseLRC(lrc) {
    const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
    return lrc.split('\n').map(line => {
        const match = line.match(regex);
        if (!match) return null;
        return {
            time: (parseInt(match[1]) * 60000) + (parseInt(match[2]) * 1000) + parseInt(match[3].padEnd(3, '0')),
            text: match[4].trim(),
            isNote: match[4].trim() === "♪" || !match[4].trim()
        };
    }).filter(Boolean);
}

function renderLyricsToDOM(lyrics) {
    rightSide.innerHTML = '';
    mainContainer.classList.toggle('no-lyrics', !lyrics.length);
    if (!lyrics.length) return;

    const fragment = document.createDocumentFragment();
    lyrics.forEach(line => {
        const div = document.createElement('div');
        div.className = 'lyric-line';

        if (line.isNote) {
            div.appendChild(createNoteDots());
        } else {
            const words = line.text.split(' ');
            let charOffset = 0;
            words.forEach((word, i) => {
                const span = document.createElement('span');
                const wordWithSpace = word + (i < words.length - 1 ? ' ' : '');
                span.textContent = wordWithSpace;
                span.dataset.start = (charOffset / line.text.length) * 100;
                charOffset += wordWithSpace.length;
                span.dataset.end = (charOffset / line.text.length) * 100;
                div.appendChild(span);
            });
        }
        fragment.appendChild(div);
    });

    rightSide.appendChild(fragment);
    rightSide.offsetHeight; 
    rightSide.classList.add('animated-slide-in', 'from-right');
}

function updateActiveLyric(currentMs) {
    if (!currentLyrics.length) return;

    const activeIndex = currentLyrics.findLastIndex(l => currentMs >= l.time);
    const lyricElements = document.querySelectorAll('.lyric-line');

    if (activeIndex !== lastActiveIndex) {
        lyricElements.forEach((el, i) => {
            el.classList.toggle('passed', i < activeIndex);
            el.classList.toggle('active', i === activeIndex);
            if (i === activeIndex) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        lastActiveIndex = activeIndex;
    }

    if (activeIndex >= 0 && !currentLyrics[activeIndex].isNote) {
        const activeEl = lyricElements[activeIndex];
        const start = currentLyrics[activeIndex].time;
        const next = currentLyrics[activeIndex + 1]?.time || start + 5000;
        const progress = Math.min(100, Math.max(0, ((currentMs - start) / Math.min(next - start, currentLyrics[activeIndex].text.length * 150)) * 100));

        activeEl.querySelectorAll('span').forEach(span => {
            const s = parseFloat(span.dataset.start);
            const e = parseFloat(span.dataset.end);
            const localP = progress >= e ? 100 : (progress <= s ? -10 : ((progress - s) / (e - s)) * 100);
            span.style.setProperty('--local-progress', `${localP}%`);
            span.classList.toggle('current-word', progress > s && progress < e);
        });
    }
}

function animationLoop() {
    if (isPlaying && currentLyrics.length) {
        updateActiveLyric(localProgressMs + (Date.now() - lastSyncTimestamp));
    }
    requestAnimationFrame(animationLoop);
}

function checkMarquee() {
    const containerEl = document.querySelector('.track-info-container');
    if (trackNameEl.scrollWidth > containerEl.clientWidth) {
        const dist = trackNameEl.scrollWidth - containerEl.clientWidth + 20;
        trackNameEl.style.setProperty('--scroll-dist', `-${dist}px`);
        trackNameEl.style.setProperty('--scroll-dur', `${Math.max(14, dist / 10)}s`);
        trackNameEl.classList.add('scrolling');
    } else {
        trackNameEl.classList.remove('scrolling');
    }
}

function createNoteDots() {
    const div = document.createElement('div');
    div.className = 'note-dots';
    for (let i = 0; i < 3; i++) div.appendChild(document.createElement('div'));
    return div;
}

function showLoader(container) {
    container.classList.remove('animated-slide-in', 'from-right');
    container.innerHTML = '<div class="loaderContainer active"><div class="Loader1"></div></div>';
}

startApp();