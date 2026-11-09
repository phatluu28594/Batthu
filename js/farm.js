import { farm, team, checkPetSurvival } from './config.js';

let farmCanvas, farmCtx, farmAnimInterval;
let farmPetsState = [];

export function openFarmMenu() {
    checkPetSurvival();
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    let html = `
    <div class="flex justify-between items-center mb-3">
        <h3 class="font-bold text-lg">🏡 Trang Trại Linh Thú (${farm.length})</h3>
        <button onclick="closeModal()" class="text-zinc-400 font-bold">✕</button>
    </div>
    <div class="relative w-full h-56 bg-gradient-to-b from-emerald-900/80 to-emerald-950 rounded-2xl border-2 border-emerald-600/50 overflow-hidden mb-4 shadow-inner">
        <canvas id="farmCanvas" class="absolute inset-0 w-full h-full"></canvas>
    </div>`;

    html += `<div class="space-y-2.5 max-h-40 overflow-y-auto">`;
    if (farm.length === 0) {
        html += `<div class="text-zinc-400 text-xs text-center py-4">Trang trại đang trống.</div>`;
    } else {
        farm.forEach((pet, idx) => {
            html += `
            <div class="bg-zinc-800/90 p-2.5 rounded-xl flex items-center justify-between border border-zinc-700">
                <div class="flex items-center gap-2.5">
                    <span class="text-3xl">${pet.emoji}</span>
                    <div>
                        <div class="font-bold text-xs">${pet.name} <span class="text-yellow-400">Lv.${pet.level || 1}</span></div>
                        <div class="text-[10px] text-zinc-300">HP: ${pet.hp}/${pet.maxHp}</div>
                    </div>
                </div>
                <div class="flex gap-1">
                    <button onclick="moveToTeam(${idx})" class="bg-blue-600 text-[10px] px-2 py-1 rounded font-bold">Đưa đội</button>
                </div>
            </div>`;
        });
    }
    html += `</div>`;
    content.innerHTML = html;
    setTimeout(initFarmCanvasAnimation, 100);
}

function initFarmCanvasAnimation() {
    farmCanvas = document.getElementById('farmCanvas');
    if (!farmCanvas) return;
    farmCtx = farmCanvas.getContext('2d');
    farmCanvas.width = farmCanvas.clientWidth;
    farmCanvas.height = farmCanvas.clientHeight;

    farmPetsState = farm.map((pet) => ({
        ...pet,
        x: Math.random() * (farmCanvas.width - 60) + 30,
        y: Math.random() * (farmCanvas.height - 60) + 30,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.2,
        wobble: Math.random() * Math.PI
    }));

    if (farmAnimInterval) clearInterval(farmAnimInterval);
    farmAnimInterval = setInterval(() => {
        if (!farmCtx || !farmCanvas) return;
        farmCtx.clearRect(0, 0, farmCanvas.width, farmCanvas.height);
        farmCtx.fillStyle = '#064e3b';
        farmCtx.fillRect(0, 0, farmCanvas.width, farmCanvas.height);

        farmPetsState.forEach(p => {
            p.x += p.vx; p.y += p.vy; p.wobble += 0.1;
            if (p.x < 30 || p.x > farmCanvas.width - 30) p.vx *= -1;
            if (p.y < 30 || p.y > farmCanvas.height - 30) p.vy *= -1;

            let bounceY = p.y + Math.sin(p.wobble) * 4;
            farmCtx.font = "40px sans-serif";
            farmCtx.textAlign = "center";
            farmCtx.textBaseline = "middle";
            farmCtx.fillText(p.emoji, p.x, bounceY);
        });
    }, 50);
}

window.moveToTeam = function(index) {
    checkPetSurvival();
    if (team.length >= 3) { alert('Đội hình chính đã đầy (3/3)!'); return; }
    if (farmAnimInterval) clearInterval(farmAnimInterval);
    let pet = farm.splice(index, 1)[0];
    team.push(pet);
    localStorage.setItem('ar_farm', JSON.stringify(farm));
    localStorage.setItem('ar_team', JSON.stringify(team));
    if (window.updateTeamCount) window.updateTeamCount();
    openFarmMenu();
};