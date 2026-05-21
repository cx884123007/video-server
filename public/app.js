let videos = [];
let currentFolder = '';
let currentVideoIndex = -1;
const STORAGE_KEY = 'video_player_history';

function getPlaybackHistory() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function savePlaybackHistory(filename, progress) {
    const history = getPlaybackHistory();
    history[filename] = {
        progress,
        lastPlayed: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function getPlaybackProgress(filename) {
    const history = getPlaybackHistory();
    return history[filename]?.progress || 0;
}

async function loadVideos() {
    try {
        const res = await fetch('/api/videos');
        const data = await res.json();

        if (data.success) {
            videos = data.videos;
            document.getElementById('videoPath').textContent = data.videoPath;
            renderVideos();
        } else {
            showError(data.error);
        }
    } catch (err) {
        showError('加载失败: ' + err.message);
    }
}

function normalizePath(p) {
    return p.replace(/\\/g, '/');
}

function getSubfolders() {
    const folders = new Set();
    const normalizedCurrent = normalizePath(currentFolder);

    videos.forEach(video => {
        const normalizedVideoFolder = normalizePath(video.folder);
        if (normalizedVideoFolder.startsWith(normalizedCurrent)) {
            const relativePath = normalizedVideoFolder.slice(normalizedCurrent.length);
            const parts = relativePath.split('/').filter(p => p);
            if (parts.length > 0) {
                const subFolder = normalizedCurrent ? `${normalizedCurrent}/${parts[0]}` : parts[0];
                folders.add(subFolder);
            }
        }
    });
    return Array.from(folders);
}

function getCurrentVideos() {
    const normalizedCurrent = normalizePath(currentFolder);
    return videos.filter(video => {
        const normalizedVideoFolder = normalizePath(video.folder);
        if (normalizedCurrent === '') {
            return normalizedVideoFolder === '';
        }
        return normalizedVideoFolder === normalizedCurrent;
    });
}

function enterFolder(folder) {
    currentFolder = folder;
    renderVideos();
}

function goBack() {
    if (currentFolder) {
        const parts = normalizePath(currentFolder).split('/');
        parts.pop();
        currentFolder = parts.join('/');
        renderVideos();
    }
}

function goToFolder(folder) {
    currentFolder = folder;
    renderVideos();
}

function renderBreadcrumb() {
    const normalizedCurrent = normalizePath(currentFolder);
    const parts = normalizedCurrent ? normalizedCurrent.split('/') : [];
    let html = '<span class="breadcrumb-item" onclick="goToFolder(\'\')">🏠 根目录</span>';

    let pathSoFar = '';
    parts.forEach((part, index) => {
        pathSoFar = pathSoFar ? `${pathSoFar}/${part}` : part;
        html += `
            <span class="breadcrumb-sep">›</span>
            <span class="breadcrumb-item" onclick="goToFolder('${pathSoFar}')">${escapeHtml(part)}</span>
        `;
    });

    document.getElementById('breadcrumb').innerHTML = html;
}

function renderVideos() {
    const listEl = document.getElementById('videoList');
    const emptyTip = document.getElementById('emptyTip');
    const listSection = document.getElementById('listSection');

    if (videos.length === 0) {
        listSection.style.display = 'none';
        emptyTip.style.display = 'block';
        return;
    }

    listSection.style.display = 'block';
    emptyTip.style.display = 'none';
    const history = getPlaybackHistory();

    renderBreadcrumb();

    const subfolders = getSubfolders();
    const currentVideos = getCurrentVideos();

    let html = '';

    if (currentFolder) {
        html += `
            <div class="folder-card" onclick="goBack()">
                <div class="folder-icon-large">⬆️</div>
                <div class="folder-name">返回上级</div>
            </div>
        `;
    }

    subfolders.forEach(folder => {
        const folderName = normalizePath(folder).split('/').pop();
        const normalizedFolder = normalizePath(folder);
        const count = videos.filter(v => {
            const vf = normalizePath(v.folder);
            return vf === normalizedFolder || vf.startsWith(normalizedFolder + '/');
        }).length;
        html += `
            <div class="folder-card" onclick="enterFolder('${folder}')">
                <div class="folder-icon-large">📁</div>
                <div class="folder-name">${escapeHtml(folderName)}</div>
                <div class="folder-count-small">${count} 个视频</div>
            </div>
        `;
    });

    currentVideos.forEach(video => {
        const globalIndex = videos.indexOf(video);
        const played = history[video.name];
        const progress = played ? Math.round(played.progress * 100) : 0;
        const progressBar = progress > 5 ? `<div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>` : '';
        const playedBadge = progress > 95 ? '<span class="played-badge">✓ 已观看</span>' : '';
        const thumbUrl = `/thumbnail/${encodeURIComponent(video.name)}`;

        html += `
            <div class="video-card" data-index="${globalIndex}" onclick="playVideoByIndex(${globalIndex})">
                <div class="video-thumbnail">
                    <img src="${thumbUrl}" alt="" class="thumbnail-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                    <div class="thumbnail-placeholder" style="display: none;">
                        <span class="play-overlay">▶</span>
                    </div>
                    ${progressBar}
                </div>
                <div class="video-info">
                    <div class="video-name">${escapeHtml(video.fileName)}</div>
                    <div class="video-meta">
                        <span>${video.size}</span>
                        <span>${formatDate(video.mtime)}</span>
                    </div>
                    ${playedBadge}
                </div>
            </div>
        `;
    });

    if (subfolders.length === 0 && currentVideos.length === 0) {
        html = '<div class="empty-folder">📭 此文件夹为空</div>';
    }

    listEl.innerHTML = html;
}

function playVideoByIndex(index) {
    if (index < 0 || index >= videos.length) return;
    currentVideoIndex = index;
    const video = videos[index];
    playVideo(encodeURIComponent(video.name), video.name);
}

function playVideo(encodedName, displayName) {
    const playerSection = document.getElementById('playerSection');
    const listSection = document.getElementById('listSection');
    const player = document.getElementById('videoPlayer');
    const nameEl = document.getElementById('currentVideoName');

    player.src = `/video/${encodedName}`;
    const video = videos[currentVideoIndex];
    nameEl.textContent = '🎬 ' + (video?.fileName || displayName);

    playerSection.style.display = 'block';
    listSection.style.display = 'none';

    const savedProgress = getPlaybackProgress(displayName);
    player.onloadedmetadata = () => {
        if (savedProgress > 0 && savedProgress < 0.95) {
            player.currentTime = player.duration * savedProgress;
        }
        player.play().catch(() => {});
    };

    window.location.hash = encodedName;
    updateNavigationButtons();
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    prevBtn.disabled = currentVideoIndex <= 0;
    nextBtn.disabled = currentVideoIndex >= videos.length - 1;
}

function playPrevious() {
    if (currentVideoIndex > 0) {
        playVideoByIndex(currentVideoIndex - 1);
    }
}

function playNext() {
    if (currentVideoIndex < videos.length - 1) {
        playVideoByIndex(currentVideoIndex + 1);
    }
}

function closePlayer() {
    const playerSection = document.getElementById('playerSection');
    const listSection = document.getElementById('listSection');
    const player = document.getElementById('videoPlayer');

    player.pause();
    player.src = '';
    playerSection.style.display = 'none';
    listSection.style.display = 'block';

    window.location.hash = '';
    currentVideoIndex = -1;
}

function setPlaybackSpeed(speed) {
    const player = document.getElementById('videoPlayer');
    player.playbackRate = parseFloat(speed);
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.speed === speed);
    });
}

function toggleFullscreen() {
    const player = document.getElementById('videoPlayer');
    if (!document.fullscreenElement) {
        player.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen();
    }
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('zh-CN') + ' ' +
           date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(msg) {
    document.getElementById('videoList').innerHTML =
        `<div class="loading" style="color: #ff6b6b;">❌ ${msg}</div>`;
}

function checkHash() {
    const hash = window.location.hash.slice(1);
    if (hash && videos.length > 0) {
        const index = videos.findIndex(v => encodeURIComponent(v.name) === hash);
        if (index >= 0) {
            playVideoByIndex(index);
        }
    }
}

document.addEventListener('keydown', (e) => {
    const player = document.getElementById('videoPlayer');
    const playerSection = document.getElementById('playerSection');

    if (playerSection.style.display === 'none') return;

    switch(e.key) {
        case ' ':
            e.preventDefault();
            player.paused ? player.play() : player.pause();
            break;
        case 'ArrowLeft':
            player.currentTime -= 10;
            break;
        case 'ArrowRight':
            player.currentTime += 10;
            break;
        case 'ArrowUp':
            player.volume = Math.min(1, player.volume + 0.1);
            break;
        case 'ArrowDown':
            player.volume = Math.max(0, player.volume - 0.1);
            break;
        case 'f':
            toggleFullscreen();
            break;
        case 'm':
            player.muted = !player.muted;
            break;
        case 'Escape':
            closePlayer();
            break;
        case 'n':
            playNext();
            break;
        case 'p':
            playPrevious();
            break;
    }
});

window.onload = async () => {
    await loadVideos();
    checkHash();

    const player = document.getElementById('videoPlayer');
    let saveTimeout;

    player.addEventListener('timeupdate', () => {
        if (player.duration) {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                const progress = player.currentTime / player.duration;
                if (currentVideoIndex >= 0 && videos[currentVideoIndex]) {
                    savePlaybackHistory(videos[currentVideoIndex].name, progress);
                }
            }, 1000);
        }
    });

    player.addEventListener('ended', () => {
        if (currentVideoIndex < videos.length - 1) {
            if (confirm('播放完毕，是否播放下一个视频？')) {
                playNext();
            }
        }
    });
};

async function openVideoFolder() {
    try {
        await fetch('/api/open-folder');
    } catch (err) {
        alert('无法打开文件夹，请手动访问: ' + document.getElementById('videoPath').textContent);
    }
}

window.onhashchange = checkHash;
