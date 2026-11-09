let map, userMarker;
let activeMarkers = [];
let otherPlayersMarkers = [];
let userLat = 10.0452, userLng = 105.7469; 

// Kiểm tra và hiển thị bảng nhập thông tin khi vừa vào game
function checkPlayerProfile() {
    let profile = JSON.parse(localStorage.getItem('ar_player_profile') || 'null');
    const setupModal = document.getElementById('player-setup-modal');
    
    if (!profile && setupModal) {
        setupModal.classList.remove('hidden'); // Hiển thị bảng nếu chưa có dữ liệu
    }
}

// Lưu thông tin người chơi khi bấm nút xác nhận
function savePlayerProfile() {
    let name = document.getElementById('setup-name').value.trim();
    let age = document.getElementById('setup-age').value.trim();
    let gender = document.getElementById('setup-gender').value;

    if (!name) {
        alert('Vui lòng nhập tên nhân vật của bạn!');
        return;
    }
    if (!age || age <= 0) {
        alert('Vui lòng nhập số tuổi hợp lệ!');
        return;
    }

    let profileData = { name: name, age: age, gender: gender };
    localStorage.setItem('ar_player_profile', JSON.stringify(profileData));

    // Ẩn bảng đi
    const setupModal = document.getElementById('player-setup-modal');
    if (setupModal) setupModal.classList.add('hidden');

    alert(`Chào mừng nhà thám hiểm ${name} đã tham gia game!`);
}
function initMap() {
    map = L.map('map', { zoomControl: false }).setView([userLat, userLng], 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    const userIcon = L.divIcon({
        className: 'custom-user-icon',
        html: '<div style="font-size: 28px; filter: drop-shadow(0 0 8px rgba(59,130,246,0.8));">📍</div>',
        iconSize: [30, 30], iconAnchor: [15, 15]
    });

    userMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
    spawnMultipleMonsters();
    spawnOtherPlayers();

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition((position) => {
            userLat = position.coords.latitude;
            userLng = position.coords.longitude;
            userMarker.setLatLng([userLat, userLng]);
        }, (error) => {}, { enableHighAccuracy: true });
    }

    setTimeout(() => { map.invalidateSize(); }, 300);
}

function recenterMap() { 
    map.setView([userLat, userLng], 17); 
    map.invalidateSize(); 
}

let mockRealPlayers = [
    { id: 'p1', name: 'Cao Bồi Ken', avatar: '🤠', pet: { name: 'Chó Vàng', emoji: '🐕', cp: 145, hp: 80, maxHp: 80, atk: 90, level: 1, element: 'Kim', critRate: 20, dodgeRate: 15, accuracy: 20, attackSpeed: 1.3 } }
];

function spawnOtherPlayers() {
    otherPlayersMarkers.forEach(m => map.removeLayer(m));
    otherPlayersMarkers = [];

    mockRealPlayers.forEach((player) => {
        let pLat = userLat + (Math.random() - 0.5) * 0.002;
        let pLng = userLng + (Math.random() - 0.5) * 0.002;

        const playerIcon = L.divIcon({
            className: 'custom-player-icon',
            html: `<div style="font-size: 30px; animation: bounce 2s infinite; filter: drop-shadow(0 0 8px rgba(168,85,247,0.9));">${player.avatar}</div>`,
            iconSize: [32, 32], iconAnchor: [16, 16]
        });

        const marker = L.marker([pLat, pLng], { icon: playerIcon }).addTo(map);
        marker.on('click', () => { openOtherPlayerModal(player); });
        otherPlayersMarkers.push(marker);
    });
}

function openOtherPlayerModal(player) {
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    let petInfo = player.pet;
    let elemObj = elements.find(e => e.name === petInfo.element) || elements[0];

    content.innerHTML = `
    <div class="flex justify-between items-center mb-3">
        <h3 class="font-bold text-lg">👤 Người Chơi: ${player.name}</h3>
        <button onclick="closeModal()" class="text-zinc-400 font-bold">✕</button>
    </div>
    <div class="bg-zinc-800 p-4 rounded-2xl border border-zinc-700 mb-4 text-center">
        <div class="text-5xl mb-2">${player.avatar}</div>
        <div class="text-sm font-bold text-yellow-300 mb-2">Linh thú chủ lực:</div>
        <div class="bg-zinc-900 p-3 rounded-xl flex items-center justify-center gap-3 border border-zinc-700">
            <span class="text-4xl">${petInfo.emoji}</span>
            <div class="text-left">
                <div class="font-bold text-sm">${petInfo.name} <span class="${elemObj.color}">(${elemObj.icon}${petInfo.element})</span></div>
                <div class="text-xs text-zinc-300">Lv.${petInfo.level} | CP: ${petInfo.cp} | Crit: ${petInfo.critRate}%</div>
            </div>
        </div>
    </div>
    <button onclick="attackRealPlayer('${player.name}')" class="w-full bg-red-600 py-3 rounded-xl font-bold text-xs shadow-lg">⚔️ Thách Đấu Realtime</button>`;
}

function attackRealPlayer(playerName) {
    closeModal();
    let foundP = mockRealPlayers.find(p => p.name === playerName);
    startCanvasBattle(foundP);
}

function spawnMultipleMonsters() {
    activeMarkers.forEach(m => map.removeLayer(m));
    activeMarkers = [];

    for (let i = 0; i < 8; i++) {
        const baseTemplate = allMonsters[Math.floor(Math.random() * allMonsters.length)];
        const randomElem = elements[Math.floor(Math.random() * elements.length)];
        const monsterData = { 
            ...baseTemplate, 
            element: randomElem.name,
            cp: Math.floor(baseTemplate.cp * (0.9 + Math.random() * 0.3)),
            critRate: Math.floor(1 + Math.random() * 34),
            dodgeRate: Math.floor(1 + Math.random() * 34),
            accuracy: Math.floor(1 + Math.random() * 34),
            attackSpeed: parseFloat((1.0 + Math.random() * 1.0).toFixed(1)),
            lat: userLat + (Math.random() - 0.5) * 0.0025,
            lng: userLng + (Math.random() - 0.5) * 0.0025
        };

        const monsterIcon = L.divIcon({
            className: 'custom-monster-icon',
            html: `<div style="font-size: 32px; animation: bounce 1.5s infinite; filter: drop-shadow(0 0 8px rgba(234,179,8,0.9));">${monsterData.emoji}</div>`,
            iconSize: [35, 35], iconAnchor: [17, 17]
        });

        const marker = L.marker([monsterData.lat, monsterData.lng], { icon: monsterIcon }).addTo(map);
        marker.on('click', () => {
            if (stamina <= 0) { alert('⚡ Hết Năng Lượng!'); return; }
            currentWildMonster = monsterData;
            catchAttempts = 0;
            document.getElementById('throw-attempt-count').innerText = `Lượt quăng: 0/3`;
            enterARScreen();
        });
        activeMarkers.push(marker);
    }
}

window.onload = () => {
    checkPlayerProfile();
    initWeather();
    initMap();
    initStaminaSystem();
    updateTeamCount();
};
