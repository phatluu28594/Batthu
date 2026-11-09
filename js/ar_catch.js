export let currentWildMonster = null;
export let catchAttempts = 0;
export let capturedTempMonster = null;
let canvas, ctx;
let isARActive = false;
let rope = { x: 0, y: 0, vx: 0, vy: 0, radius: 30, flying: false };
let monsterPos = { x: 0, y: 0, vx: 2 };
let touchStart = { x: 0, y: 0 }, touchEnd = { x: 0, y: 0 };

export async function enterARScreen() {
    document.getElementById('map-screen').classList.add('hidden');
    document.getElementById('ar-screen').classList.remove('hidden');
    isARActive = true;

    let elemObj = elements.find(e => e.name === currentWildMonster.element) || elements[0];
    document.getElementById('ar-mon-info').innerText = `${currentWildMonster.emoji} ${currentWildMonster.name} (${elemObj.icon}${currentWildMonster.element}) - CP ${currentWildMonster.cp}`;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } }, audio: false });
        document.getElementById('camera-feed').srcObject = stream;
    } catch (e) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            document.getElementById('camera-feed').srcObject = stream;
        } catch (err) {}
    }
    initCanvasGame();
}

export function exitARScreen() {
    isARActive = false;
    const videoEl = document.getElementById('camera-feed');
    if (videoEl.srcObject) videoEl.srcObject.getTracks().forEach(t => t.stop());
    document.getElementById('ar-screen').classList.add('hidden');
    document.getElementById('map-screen').classList.remove('hidden');
    if (typeof map !== 'undefined' && map.invalidateSize) {
        map.invalidateSize();
    }
}

function initCanvasGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    monsterPos.x = canvas.width / 2;
    monsterPos.y = canvas.height * 0.35;
    resetRope();

    canvas.onpointerdown = (e) => {
        if (rope.flying) return;
        touchStart.x = e.clientX; touchStart.y = e.clientY;
    };

    canvas.onpointerup = (e) => {
        if (rope.flying) return;
        touchEnd.x = e.clientX; touchEnd.y = e.clientY;
        let dx = touchEnd.x - touchStart.x;
        let dy = touchEnd.y - touchStart.y;

        if (dy < -30) {
            if (stamina > 0) {
                stamina--;
                localStorage.setItem('ar_stamina', stamina);
                document.getElementById('stamina-count').innerText = stamina;
            }
            rope.vx = dx * 0.12;
            rope.vy = dy * 0.15;
            rope.flying = true;
        }
    };
    requestAnimationFrame(updateCanvasGame);
}

function resetRope() {
    rope.x = canvas.width / 2; rope.y = canvas.height * 0.85;
    rope.vx = 0; rope.vy = 0; rope.flying = false;
}

function updateCanvasGame() {
    if (!isARActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    monsterPos.x += monsterPos.vx;
    if (monsterPos.x < 60 || monsterPos.x > canvas.width - 60) monsterPos.vx *= -1;

    ctx.font = "80px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(currentWildMonster.emoji, monsterPos.x, monsterPos.y);

    if (rope.flying) {
        rope.x += rope.vx; rope.y += rope.vy; rope.vy += 0.25;
        ctx.beginPath(); ctx.moveTo(canvas.width / 2, canvas.height * 0.85); ctx.lineTo(rope.x, rope.y);
        ctx.strokeStyle = "#d4a373"; ctx.lineWidth = 4; ctx.stroke();

        let dist = Math.hypot(rope.x - monsterPos.x, rope.y - monsterPos.y);
        if (dist < 65) { rope.flying = false; handleCatchResult(); }
        if (rope.y < 0 || rope.x < 0 || rope.x > canvas.width) { rope.flying = false; handleMissAttempt("Quăng hụt!"); resetRope(); }
    }

    ctx.font = "40px sans-serif";
    ctx.fillText("🪢", rope.x, rope.y);
    requestAnimationFrame(updateCanvasGame);
}

function handleCatchResult() {
    let isFailed = Math.random() < 0.50;
    if (isFailed) { handleMissAttempt(`${currentWildMonster.name} giãy giụa thoát!`); resetRope(); }
    else {
        const feedback = document.getElementById('throw-feedback');
        feedback.innerText = `🎉 Bắt thành công ${currentWildMonster.name}!`;
        feedback.style.opacity = '1';
        setTimeout(() => { feedback.style.opacity = '0'; exitARScreen(); promptCatchChoice(currentWildMonster); }, 1000);
    }
}

function handleMissAttempt(reasonMsg) {
    catchAttempts++;
    document.getElementById('throw-attempt-count').innerText = `Lượt quăng: ${catchAttempts}/3`;
    const feedback = document.getElementById('throw-feedback');

    if (catchAttempts >= 3) {
        feedback.innerText = `😜 ${currentWildMonster.name} đã chạy mất!`;
        feedback.style.opacity = '1';
        setTimeout(() => { feedback.style.opacity = '0'; exitARScreen(); spawnMultipleMonsters(); }, 2500);
    } else {
        feedback.innerText = `💥 ${reasonMsg}`;
        feedback.style.opacity = '1';
        setTimeout(() => { feedback.style.opacity = '0'; }, 2000);
    }
}

export function promptCatchChoice(monster) {
    capturedTempMonster = {
        ...monster,
        maxHp: monster.maxHp || monster.hp || 80,
        hp: monster.maxHp || monster.hp || 80,
        level: 1,
        hunger: 80,
        happiness: 80,
        critRate: Math.floor(1 + Math.random() * 34),
        dodgeRate: Math.floor(1 + Math.random() * 34),
        accuracy: Math.floor(1 + Math.random() * 34),
        attackSpeed: parseFloat((1.0 + Math.random() * 1.0).toFixed(1)),
        buffEffect: null
    };

    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    let elemObj = elements.find(e => e.name === monster.element) || elements[0];
    
    content.innerHTML = `
    <div class="flex justify-between items-center mb-3"><h3 class="font-bold text-lg">🎉 Bắt Thành Công!</h3></div>
    <div class="flex flex-col items-center bg-zinc-800 p-4 rounded-2xl border border-zinc-700 mb-4 text-center">
        <span class="text-7xl mb-2">${monster.emoji}</span>
        <div class="text-lg font-bold text-yellow-300">${monster.name} <span class="${elemObj.color} text-sm">(${elemObj.icon}${monster.element})</span></div>
        <div class="text-xs text-zinc-400 mt-1">CP: ${monster.cp} | Chí mạng: ${capturedTempMonster.critRate}% | Né: ${capturedTempMonster.dodgeRate}%</div>
    </div>
    <div class="space-y-2">
        <button id="btn-catch-team" class="w-full bg-emerald-600 py-3 rounded-xl font-bold text-xs text-white">🎒 Đưa vào Đội hình (hoặc Trang Trại)</button>
        <button id="btn-catch-meat" class="w-full bg-amber-600 py-3 rounded-xl font-bold text-xs text-white">🥩 Giết lấy thịt (+Thức ăn & Vàng)</button>
        <button id="btn-catch-sell" class="w-full bg-red-600 py-3 rounded-xl font-bold text-xs text-white">💰 Bán ngay (${monster.rarePrice || 50} Vàng)</button>
    </div>`;

    document.getElementById('btn-catch-team').onclick = () => handleCatchDecision('team');
    document.getElementById('btn-catch-meat').onclick = () => handleCatchDecision('meat');
    document.getElementById('btn-catch-sell').onclick = () => handleCatchDecision('sell');
}

export function handleCatchDecision(action) {
    if (action === 'team') {
        if (typeof team !== 'undefined' && team.length < 3) {
            team.push(capturedTempMonster);
            localStorage.setItem('ar_team', JSON.stringify(team));
            alert(`Đã đưa ${capturedTempMonster.name} vào đội hình chiến đấu!`);
        } else {
            if (typeof farm !== 'undefined') {
                farm.push(capturedTempMonster);
                localStorage.setItem('ar_farm', JSON.stringify(farm));
            }
            alert(`Đội hình chính đã đầy (3/3), ${capturedTempMonster.name} đã được đưa vào Trang Trại!`);
        }
        if (typeof updateTeamCount === 'function') updateTeamCount();
    } else if (action === 'meat') {
        if (typeof inventory !== 'undefined') {
            inventory.food = (inventory.food || 0) + 2;
            if (typeof saveInventory === 'function') saveInventory();
        }
        playerCoins = (playerCoins || 0) + 30;
        localStorage.setItem('ar_coins', playerCoins);
        alert(`Nhận +2 Thức ăn & +30 Vàng!`);
    } else if (action === 'sell') {
        let price = capturedTempMonster.rarePrice || 50;
        playerCoins = (playerCoins || 0) + price;
        localStorage.setItem('ar_coins', playerCoins);
        alert(`Bán thành công +${price} Vàng!`);
    }

    if (typeof pokedex !== 'undefined' && !pokedex.includes(capturedTempMonster.id)) {
        pokedex.push(capturedTempMonster.id);
        localStorage.setItem('ar_pokedex', JSON.stringify(pokedex));
    }

    if (typeof closeModal === 'function') {
        closeModal();
    } else {
        document.getElementById('modal-container').classList.add('hidden');
    }

    if (typeof spawnMultipleMonsters === 'function') {
        spawnMultipleMonsters();
    }
}
