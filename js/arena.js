// js/arena.js - Xử lý Sảnh Chờ PvP và Canvas Battle
function openArenaMenu() {
    checkPetSurvival();
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    content.innerHTML = `
    <div class="flex justify-between items-center mb-4"><h3 class="font-bold text-lg">⚔️ Sảnh Chờ PvP Online</h3><button onclick="closeModal()" class="text-zinc-400 font-bold cursor-pointer">✕</button></div>
    <p class="text-xs text-zinc-300 mb-4">Ghép trận Realtime với người chơi thật. Nếu hạnh phúc < 30%, thú sẽ từ chối chiến đấu.</p>
    <button onclick="findOnlineMatch()" class="w-full bg-red-600 py-3.5 rounded-xl font-bold text-sm shadow-lg mb-2 cursor-pointer">🌐 Tìm Trận PvP Người Thật (30s)</button>
    <button onclick="startCanvasBattle(null)" class="w-full bg-zinc-700 py-3 rounded-xl font-bold text-xs cursor-pointer">🤖 Đấu Tập (Với Bot)</button>
    `;
}

let searchMatchTimeout = null;

function findOnlineMatch() {
    if (team.length === 0) { alert('Đội hình trống! Hãy vào Trang Trại đưa thú vào đội.'); closeModal(); return; }
    if (team[0].happiness < 30) { alert(`⚠️ ${team[0].name} đang bất mãn (Hạnh phúc < 30%) và từ chối chiến đấu!`); closeModal(); return; }

    closeModal();
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    content.innerHTML = `
    <div id="search-match-box" class="flex flex-col items-center py-8 text-center">
        <div class="text-6xl mb-4 animate-spin">🌐</div>
        <div class="text-base font-bold text-yellow-300 mb-2">Đang tìm người chơi thật xung quanh... (<span id="search-timer">30</span>s)</div>
        <button onclick="cancelSearchMatch()" class="bg-zinc-700 px-4 py-2 rounded-xl text-xs font-bold mt-2 cursor-pointer">Hủy tìm kiếm</button>
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
                <div class="text-xs text-zinc-400 mb-4">Không tìm thấy người chơi thật nào trong khu vực sau 30 giây.</div>
                <button onclick="closeModal()" class="bg-zinc-700 px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer">Quay lại</button>
            </div>`;
        } else {
            let onlinePeers = [
                { name: 'Cao Bồi Ken', avatar: '🤠', pet: { name: 'Chó Vàng', emoji: '🐕', cp: 145, hp: 80, maxHp: 80, atk: 90, level: 1, element: 'Kim', critRate: 20, dodgeRate: 15, accuracy: 20, attackSpeed: 1.3 } }
            ];
            let matched = onlinePeers[Math.floor(Math.random() * onlinePeers.length)];
            closeModal();
            startCanvasBattle(matched);
        }
    }, 5000);
}

function cancelSearchMatch() {
    if (searchMatchTimeout) clearTimeout(searchMatchTimeout);
    closeModal();
}

let battleCanvas, battleCtx, battleInterval;
let myBattlePet, enemyBattlePet;
let myHp, enemyHp, myMaxHp, enemyMaxHp;
let battleState = 'fighting';
let battleModeTitle = '⚔️ PVP REALTIME';
let animActionTick = 0;
let activeOpponentName = '';
let myBurnTurns = 0, enemyBurnTurns = 0;
let myStunTurns = 0, enemyStunTurns = 0;

function startCanvasBattle(opponentObj = null) {
    checkPetSurvival();
    if (team.length === 0) { alert('Đội hình trống! Không có thú để chiến đấu.'); closeModal(); return; }
    if (team[0].happiness < 30) { alert(`⚠️ ${team[0].name} đang bất mãn và từ chối chiến đấu!`); closeModal(); return; }

    closeModal();
    document.getElementById('map-screen').classList.add('hidden');
    document.getElementById('battle-screen').classList.remove('hidden');

    myBattlePet = team[0];
    if (opponentObj && opponentObj.pet) {
        enemyBattlePet = { ...opponentObj.pet };
        activeOpponentName = opponentObj.name;
        battleModeTitle = `⚔️ PVP REALTIME VS [${opponentObj.name.toUpperCase()}]`;
    } else {
        let enemyBase = allMonsters[Math.floor(Math.random() * allMonsters.length)];
        let enemyElem = elements[Math.floor(Math.random() * elements.length)].name;
        enemyBattlePet = { ...enemyBase, level: myBattlePet.level, element: enemyElem, critRate: 15, dodgeRate: 12, accuracy: 20, attackSpeed: 1.2, buffEffect: null };
        activeOpponentName = 'Bot Huấn Luyện';
        battleModeTitle = `⚔️ ĐẤU TRƯỜNG ONLINE`;
    }

    document.getElementById('battle-title-tag').innerText = battleModeTitle;

    myMaxHp = myBattlePet.maxHp;
    myHp = myBattlePet.hp;
    enemyMaxHp = enemyBattlePet.maxHp;
    enemyHp = enemyBattlePet.maxHp;
    battleState = 'fighting';
    animActionTick = 0;
    myBurnTurns = 0; enemyBurnTurns = 0;
    myStunTurns = 0; enemyStunTurns = 0;

    battleCanvas = document.getElementById('battleCanvas');
    battleCtx = battleCanvas.getContext('2d');
    battleCanvas.width = battleCanvas.clientWidth;
    battleCanvas.height = battleCanvas.clientHeight;

    runBattleLoop();
}

function exitBattleScreen() {
    clearInterval(battleInterval);
    document.getElementById('battle-screen').classList.add('hidden');
    document.getElementById('map-screen').classList.remove('hidden');
    map.invalidateSize();
}

function showDamagePopup(text, isCrit, x, y) {
    const container = document.getElementById('damage-popup-container');
    if(!container) return;
    const el = document.createElement('div');
    el.className = `absolute text-sm font-black damage-popup ${isCrit ? 'text-yellow-300 text-lg scale-125' : 'text-red-400'}`;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.innerText = text;
    container.appendChild(el);
    setTimeout(() => el.remove(), 700);
}

function runBattleLoop() {
    let animStep = 0;
    battleInterval = setInterval(() => {
        battleCtx.clearRect(0, 0, battleCanvas.width, battleCanvas.height);
        animStep++;
        animActionTick++;

        let grad = battleCtx.createRadialGradient(battleCanvas.width/2, battleCanvas.height/2, 10, battleCanvas.width/2, battleCanvas.height/2, 280);
        grad.addColorStop(0, '#9a3412');
        grad.addColorStop(0.6, '#451a03');
        grad.addColorStop(1, '#09090b');
        battleCtx.fillStyle = grad;
        battleCtx.fillRect(0, 0, battleCanvas.width, battleCanvas.height);

        battleCtx.beginPath();
        battleCtx.strokeStyle = '#fbbf24';
        battleCtx.lineWidth = 4;
        battleCtx.arc(battleCanvas.width/2, battleCanvas.height/2 - 10, 120, 0, Math.PI * 2);
        battleCtx.stroke();

        let myX = 85 + Math.sin(animStep * 0.15) * 15;
        let enemyX = battleCanvas.width - 125 - Math.sin(animStep * 0.15) * 15;
        let centerY = battleCanvas.height / 2 - 15;

        let myElemObj = elements.find(e => e.name === myBattlePet.element) || elements[0];
        let enemyElemObj = elements.find(e => e.name === enemyBattlePet.element) || elements[0];

        battleCtx.font = "80px sans-serif";
        battleCtx.textAlign = "center";
        battleCtx.fillText(myBattlePet.emoji, myX, centerY);

        battleCtx.fillStyle = "#18181b";
        battleCtx.fillRect(25, centerY + 55, 130, 14);
        battleCtx.fillStyle = "#10b981";
        battleCtx.fillRect(25, centerY + 55, 130 * Math.max(0, myHp / myMaxHp), 14);
        battleCtx.font = "10px sans-serif";
        battleCtx.fillStyle = "#fff";
        battleCtx.fillText(`${myBattlePet.name} (${myElemObj.icon}${myBattlePet.element})`, 90, centerY + 50);

        battleCtx.font = "80px sans-serif";
        battleCtx.fillText(enemyBattlePet.emoji, enemyX, centerY);

        battleCtx.fillStyle = "#18181b";
        battleCtx.fillRect(battleCanvas.width - 155, centerY + 55, 130, 14);
        battleCtx.fillStyle = "#ef4444";
        battleCtx.fillRect(battleCanvas.width - 155, centerY + 55, 130 * Math.max(0, enemyHp / enemyMaxHp), 14);
        battleCtx.font = "10px sans-serif";
        battleCtx.fillStyle = "#fff";
        battleCtx.fillText(`${enemyBattlePet.name} (${enemyElemObj.icon}${enemyBattlePet.element})`, battleCanvas.width - 90, centerY + 50);

        let tickInterval = myBattlePet.attackSpeed >= enemyBattlePet.attackSpeed ? 22 : 28;

        if (battleState === 'fighting' && animActionTick % tickInterval === 0) {
            if (enemyBurnTurns > 0) { enemyHp -= 10; enemyBurnTurns--; showDamagePopup(`-10`, false, battleCanvas.width - 130, centerY - 40); }
            if (myBurnTurns > 0) { myHp -= 10; myBurnTurns--; showDamagePopup(`-10`, false, 90, centerY - 40); }

            if (myStunTurns > 0) {
                myStunTurns--;
            } else {
                let effectiveDodge = Math.max(0, enemyBattlePet.dodgeRate - myBattlePet.accuracy);
                let enemyDodge = Math.random() * 100 < effectiveDodge;

                if (!enemyDodge) {
                    let isCrit = Math.random() * 100 < myBattlePet.critRate;
                    let myHasAdvantage = checkElementAdvantage(myBattlePet.element, enemyBattlePet.element);
                    let dmgMultiplier = isCrit ? 1.5 : 1.0;
                    let myBaseDmg = Math.floor(myBattlePet.atk * 0.4 * dmgMultiplier * currentWeather.buffAtk);
                    if (myHasAdvantage) myBaseDmg = Math.floor(myBaseDmg * 1.35);

                    enemyHp -= myBaseDmg;
                    showDamagePopup(`-${myBaseDmg}`, isCrit, battleCanvas.width - 130, centerY - 20);

                    if (myBattlePet.buffEffect) enemyBurnTurns = 3;
                }
            }

            if (enemyHp <= 0 || myHp <= 0) {
                battleState = enemyHp > 0 ? 'lost' : 'won';
            }
        }

        if (battleState === 'won' || battleState === 'lost') {
            clearInterval(battleInterval);
            let hpLostPercent = Math.max(0, (myMaxHp - Math.max(0, myHp)) / myMaxHp);
            myBattlePet.hp = Math.max(0, myHp);
            myBattlePet.hunger = Math.max(0, myBattlePet.hunger - Math.floor(hpLostPercent * 40));
            myBattlePet.happiness = Math.max(0, myBattlePet.happiness - Math.floor(hpLostPercent * 40));

            let rewardCoins = battleState === 'won' ? 350 : 0;
            if (battleState === 'won') {
                playerCoins += rewardCoins;
                localStorage.setItem('ar_coins', playerCoins);
                team[0] = myBattlePet;
                localStorage.setItem('ar_team', JSON.stringify(team));
            } else {
                team.shift();
                localStorage.setItem('ar_team', JSON.stringify(team));
                updateTeamCount();
            }

            checkPetSurvival();
            showBattleResultModal(battleState === 'won', rewardCoins, hpLostPercent, myBattlePet.name);
        }
    }, 80);
}

function showBattleResultModal(isWon, coinsEarned, hpLostPct, petName) {
    exitBattleScreen();
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    content.innerHTML = `
    <div class="flex flex-col items-center text-center py-2">
        <div class="text-6xl mb-2">${isWon ? '🏆' : '💀'}</div>
        <h3 class="font-bold text-xl ${isWon ? 'text-yellow-400' : 'text-red-500'} mb-1">${isWon ? 'CHIẾN THẮNG VANG DỘI!' : 'THẤT BẠI THẢM HẢI!'}</h3>
        <div class="w-full bg-zinc-800 p-4 rounded-2xl border border-zinc-700 text-left space-y-2 mb-4">
            <div class="flex justify-between text-xs"><span>Phần thưởng Vàng:</span><strong class="text-yellow-400">+${coinsEarned} 🪙</strong></div>
            <div class="flex justify-between text-xs"><span>Tổn thất HP thú:</span><strong class="text-red-400">-${Math.floor(hpLostPct * 100)}% HP</strong></div>
            <div class="flex justify-between text-xs"><span>Tình trạng:</span><strong class="${isWon ? 'text-emerald-400' : 'text-red-500'}">${isWon ? petName + ' sống sót' : petName + ' đã hy sinh!'}</strong></div>
        </div>
        <button onclick="closeModal(); spawnMultipleMonsters();" class="w-full bg-amber-600 py-3 rounded-xl font-bold text-xs shadow-lg cursor-pointer">Tiếp Tục Khám Phá Bản Đồ</button>
    </div>`;
}