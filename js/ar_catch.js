// js/ar_catch.js
import { stamina, elements, team, farm, pokedex, saveInventory } from './config.js';

let canvas, ctx;
let isARActive = false;
let rope = { x: 0, y: 0, vx: 0, vy: 0, radius: 30, flying: false };
let monsterPos = { x: 0, y: 0, vx: 2 };
let touchStart = { x: 0, y: 0 }, touchEnd = { x: 0, y: 0 };
let currentWildMonster = null;
let catchAttempts = 0;

export async function enterARScreen(monsterData) {
    currentWildMonster = monsterData;
    catchAttempts = 0;

    document.getElementById('map-screen').classList.add('hidden');
    document.getElementById('ar-screen').classList.remove('hidden');
    isARActive = true;

    let elemObj = elements.find(e => e.name === currentWildMonster.element) || elements[0];
    document.getElementById('ar-mon-info').innerText = `${currentWildMonster.emoji} ${currentWildMonster.name} (${elemObj.icon}${currentWildMonster.element}) - CP ${currentWildMonster.cp}`;
    document.getElementById('throw-attempt-count').innerText = `Lượt quăng: 0/3`;

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

export function exitARScreen()

function initCanvasGame() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
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

        let staminaVal = parseInt(localStorage.getItem('ar_stamina') || '15');
        if (dy < -30) {
            if (staminaVal > 0) {
                staminaVal--;
                localStorage.setItem('ar_stamina', staminaVal);
                if (document.getElementById('stamina-count')) {
                    document.getElementById('stamina-count').innerText = staminaVal;
                }
            }
            rope.vx = dx * 0.12;
            rope.vy = dy * 0.15;
            rope.flying = true;
        }
    };
    requestAnimationFrame(updateCanvasGame);
}

function resetRope() {
    if (!canvas) return;
    rope.x = canvas.width / 2; rope.y = canvas.height * 0.85;
    rope.vx = 0; rope.vy = 0; rope.flying = false;
}

function updateCanvasGame() {
    if (!isARActive || !ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    monsterPos.x += monsterPos.vx;
    if (monsterPos.x < 60 || monsterPos.x > canvas.width - 60) monsterPos.vx *= -1;

    ctx.font = "80px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (currentWildMonster) {
        ctx.fillText(currentWildMonster.emoji, monsterPos.x, monsterPos.y);
    }

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
    let isFailed = Math.random() < 0.30;
    if (isFailed) { 
        handleMissAttempt(`${currentWildMonster.name} giãy giụa thoát!`); 
        resetRope(); 
    } else {
        const feedback = document.getElementById('throw-feedback');
        if (feedback) {
            feedback.innerText = `🎉 Bắt thành công ${currentWildMonster.name}!`;
            feedback.style.opacity = '1';
        }
        
        // Tự động cộng EXP và Quãng đường cho Hồ sơ cá nhân
        let currentExp = parseInt(localStorage.getItem('ar_player_exp') || '120') + 50;
        let currentLevel = parseInt(localStorage.getItem('ar_player_level') || '3');
        if (currentExp >= 500) {
            currentExp -= 500;
            currentLevel += 1;
        }
        localStorage.setItem('ar_player_exp', currentExp);
        localStorage.setItem('ar_player_level', currentLevel);
        
        let currentKm = parseFloat(localStorage.getItem('ar_total_meters') || '1.45');
        localStorage.setItem('ar_total_meters', (currentKm + 0.15).toFixed(2));

        setTimeout(() => { 
            if (feedback) feedback.style.opacity = '0'; 
            window.exitARScreen(); 
            promptCatchChoice(currentWildMonster); 
        }, 1000);
    }
}

function handleMissAttempt(reasonMsg) {
    catchAttempts++;
    let countEl = document.getElementById('throw-attempt-count');
    if (countEl) countEl.innerText = `Lượt quăng: ${catchAttempts}/3`;
    const feedback = document.getElementById('throw-feedback');

    if (catchAttempts >= 3) {
        if (feedback) {
            feedback.innerText = `😜 ${currentWildMonster.name} đã chạy mất!`;
            feedback.style.opacity = '1';
        }
        setTimeout(() => { 
            if (feedback) feedback.style.opacity = '0'; 
            window.exitARScreen(); 
            if (window.spawnMultipleMonsters) window.spawnMultipleMonsters(); 
        }, 2500);
    } else {
        if (feedback) {
            feedback.innerText = `💥 ${reasonMsg}`;
            feedback.style.opacity = '1';
        }
        setTimeout(() => { if (feedback) feedback.style.opacity = '0'; }, 2000);
    }
}

let capturedTempMonster = null;
function promptCatchChoice(monster) {
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
    if (!modal || !content) return;
    modal.classList.remove('hidden');

    let elemObj = elements.find(e => e.name === monster.element) || elements[0];
    content.innerHTML = `
    <div class="flex justify-between items-center mb-3"><h3 class="font-bold text-lg">🎉 Bắt Thành Công!</h3></div>
    <div class="flex flex-col items-center bg-zinc-800 p-4 rounded-2xl border border-zinc-700 mb-4 text-center">
        <span class="text-7xl mb-2">${monster.emoji}</span>
        <div class="text-lg font-bold text-yellow-300">${monster.name} <span class="${elemObj.color} text-sm">(${elemObj.icon}${monster.element})</span></div>
        <div class="text-xs text-zinc-400 mt-1">CP: ${monster.cp} | HP: ${capturedTempMonster.maxHp}</div>
    </div>
    <div class="space-y-2">
        <button onclick="handleCatchDecision('team')" class="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-bold text-xs">🎒 Đưa vào Đội hình (hoặc Trại)</button>
        <button onclick="handleCatchDecision('meat')" class="w-full bg-amber-600 hover:bg-amber-500 py-3 rounded-xl font-bold text-xs">🥩 Giết lấy thịt (+Thức ăn & Vàng)</button>
        <button onclick="handleCatchDecision('sell')" class="w-full bg-red-600 hover:bg-red-500 py-3 rounded-xl font-bold text-xs">💰 Bán ngay (${monster.rarePrice || 100} Vàng)</button>
    </div>`;
}

window.handleCatchDecision = function(action) {
    if (!capturedTempMonster) return;
    if (action === 'team') {
        if (team.length < 3) {
            team.push(capturedTempMonster);
            localStorage.setItem('ar_team', JSON.stringify(team));
            alert(`Đã đưa ${capturedTempMonster.name} vào đội hình chiến đấu!`);
        } else {
            farm.push(capturedTempMonster);
            localStorage.setItem('ar_farm', JSON.stringify(farm));
            alert(`Đội hình đầy (3/3), đã đưa ${capturedTempMonster.name} vào Trang Trại!`);
        }
        let countEl = document.getElementById('team-count');
        if (countEl) countEl.innerText = team.length;
    } else if (action === 'meat') {
        let inv = JSON.parse(localStorage.getItem('ar_inventory') || '{}');
        inv.food = (inv.food || 0) + 2;
        localStorage.setItem('ar_inventory', JSON.stringify(inv));
        let coins = parseInt(localStorage.getItem('ar_coins') || '500') + 30;
        localStorage.setItem('ar_coins', coins);
        alert(`Nhận +2 Thức ăn & +30 Vàng!`);
    } else if (action === 'sell') {
        let price = capturedTempMonster.rarePrice || 100;
        let coins = parseInt(localStorage.getItem('ar_coins') || '500') + price;
        localStorage.setItem('ar_coins', coins);
        alert(`Bán thành công +${price} Vàng!`);
    }

    if (!pokedex.includes(capturedTempMonster.id)) {
        pokedex.push(capturedTempMonster.id);
        localStorage.setItem('ar_pokedex', JSON.stringify(pokedex));
    }

    closeModal();
    if (window.spawnMultipleMonsters) window.spawnMultipleMonsters();
};
