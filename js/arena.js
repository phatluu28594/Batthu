import { team, checkPetSurvival, elements, currentWeather } from './config.js';

let battleCanvas, battleCtx, battleInterval;
let myBattlePet, enemyBattlePet;
let myHp, enemyHp, myMaxHp, enemyMaxHp;
let battleState = 'fighting';
let animActionTick = 0;
let activeOpponentName = '';
let myBurnTurns = 0, enemyBurnTurns = 0;
let myStunTurns = 0, enemyStunTurns = 0;
let searchMatchTimeout = null;

export function openArenaMenu() {
    checkPetSurvival();
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    content.innerHTML = `
    <div class="flex justify-between items-center mb-4"><h3 class="font-bold text-lg">⚔️ Sảnh Chờ PvP Online</h3><button onclick="closeModal()" class="text-zinc-400 font-bold">✕</button></div>
    <p class="text-xs text-zinc-300 mb-4">Ghép trận Realtime với người chơi thật. Nếu hạnh phúc < 30%, thú từ chối chiến đấu.</p>
    <button onclick="findOnlineMatch()" class="w-full bg-red-600 py-3.5 rounded-xl font-bold text-sm shadow-lg mb-2">🌐 Tìm Trận PvP Người Thật (30s)</button>
    <button onclick="startCanvasBattle(null)" class="w-full bg-zinc-700 py-3 rounded-xl font-bold text-xs">🤖 Đấu Tập (Với Bot)</button>
    `;
}

window.findOnlineMatch = function() {
    if (team.length === 0) { alert('Đội hình trống!'); closeModal(); return; }
    if (team[0].happiness < 30) { alert(`⚠️ ${team[0].name} đang bất mãn và từ chối chiến đấu!`); closeModal(); return; }

    closeModal();
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    content.innerHTML = `
    <div id="search-match-box" class="flex flex-col items-center py-8 text-center">
        <div class="text-6xl mb-4 animate-spin">🌐</div>
        <div class="text-base font-bold text-yellow-300 mb-2">Đang tìm người chơi thật xung quanh... (<span id="search-timer">30</span>s)</div>
        <button onclick="cancelSearchMatch()" class="bg-zinc-700 px-4 py-2 rounded-xl text-xs font-bold mt-2">Hủy tìm kiếm</button>
    </div>`;

    let timeLeft = 30;
    let timerInterval = setInterval(() => {
        timeLeft--;
        let timerEl = document.getElementById('search-timer');
        if (timerEl) timerEl.innerText = timeLeft;
        if (timeLeft <= 0) clearInterval(timerInterval);
    }, 1000);

    searchMatchTimeout = setTimeout(() => {
        clearInterval(timerInterval);
        let foundRealPlayer = Math.random() < 0.5;

        if (!foundRealPlayer) {
            content.innerHTML = `
            <div class="flex flex-col items-center py-6 text-center">
                <div class="text-5xl mb-3">📭</div>
                <div class="text-base font-bold text-red-400 mb-2">Không có ai xung quanh để tấn công!</div>
                <button onclick="closeModal()" class="bg-zinc-700 px-5 py-2.5 rounded-xl text-xs font-bold mt-3">Quay lại</button>
            </div>`;
        } else {
            let onlinePeers = [{ name: 'Cao Bồi Ken', avatar: '🤠', pet: { name: 'Chó Vàng', emoji: '🐕', cp: 145, hp: 80, maxHp: 80, atk: 90, level: 1, element: 'Kim', critRate: 20, dodgeRate: 15, accuracy: 20, attackSpeed: 1.3 } }];
            let matched = onlinePeers[Math.floor(Math.random() * onlinePeers.length)];
            closeModal();
            window.startCanvasBattle(matched);
        }
    }, 5000);
};

window.cancelSearchMatch = function() {
    if (searchMatchTimeout) clearTimeout(searchMatchTimeout);
    closeModal();
};

window.startCanvasBattle = function(opponentObj = null) {
    checkPetSurvival();
    if (team.length === 0) { alert('Đội hình trống!'); closeModal(); return; }
    closeModal();
    document.getElementById('map-screen').classList.add('hidden');
    document.getElementById('battle-screen').classList.remove('hidden');

    myBattlePet = team[0];
    if (opponentObj && opponentObj.pet) {
        enemyBattlePet = { ...opponentObj.pet };
        activeOpponentName = opponentObj.name;
    } else {
        enemyBattlePet = { name: 'Bot', emoji: '🤖', hp: 80, maxHp: 80, atk: 80, level: 1, element: 'Hỏa', critRate: 15, dodgeRate: 12, accuracy: 20, attackSpeed: 1.2 };
        activeOpponentName = 'Bot Huấn Luyện';
    }

    myMaxHp = myBattlePet.maxHp; myHp = myBattlePet.hp;
    enemyMaxHp = enemyBattlePet.maxHp; enemyHp = enemyBattlePet.maxHp;
    battleState = 'fighting'; animActionTick = 0;

    battleCanvas = document.getElementById('battleCanvas');
    battleCtx = battleCanvas.getContext('2d');
    battleCanvas.width = battleCanvas.clientWidth;
    battleCanvas.height = battleCanvas.clientHeight;
};

window.exitBattleScreen = function() {
    clearInterval(battleInterval);
    document.getElementById('battle-screen').classList.add('hidden');
    document.getElementById('map-screen').classList.remove('hidden');
};