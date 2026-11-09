import { eggSteps, allMonsters, elements, team, farm } from './config.js';

export function openEggsMenu() {
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    const targetSteps = 50;
    let currentSteps = parseInt(localStorage.getItem('ar_egg_steps') || '0');
    let progress = Math.min(100, (currentSteps / targetSteps) * 100);
    let canHatch = currentSteps >= targetSteps;

    content.innerHTML = `
    <div class="flex justify-between items-center mb-4"><h3 class="font-bold text-lg">🥚 Ấp Trứng Linh Thú</h3><button onclick="closeModal()" class="text-zinc-400 font-bold">✕</button></div>
    <div class="flex flex-col items-center bg-zinc-800 p-6 rounded-2xl border border-zinc-700 text-center">
        <div class="text-7xl mb-3 animate-pulse">🥚</div>
        <div class="font-bold text-sm mb-1">Trứng Đặc Biệt</div>
        <div class="text-xs text-zinc-400 mb-4">Đi bộ tích lũy bước chân ấp trứng!</div>
        <div class="w-full bg-zinc-900 rounded-full h-4 overflow-hidden border border-zinc-700 mb-2">
            <div class="bg-amber-500 h-full transition-all" style="width: ${progress}%"></div>
        </div>
        <div class="text-xs font-bold text-yellow-300 mb-4">Tiến độ: ${currentSteps} / ${targetSteps} bước</div>
        <button onclick="hatchEgg()" ${canHatch ? '' : 'disabled'} class="w-full py-3 rounded-xl font-bold text-sm shadow-lg transition-all ${canHatch ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer' : 'bg-zinc-700 text-zinc-400 opacity-50 cursor-not-allowed'}">
            ${canHatch ? '🎉 ẤP NỞ NGAY!' : '🔒 Chưa đủ bước chân'}
        </button>
    </div>`;
}

window.hatchEgg = function() {
    let currentSteps = parseInt(localStorage.getItem('ar_egg_steps') || '0');
    if (currentSteps < 50) return;
    currentSteps -= 50;
    localStorage.setItem('ar_egg_steps', currentSteps);
    if (document.getElementById('egg-steps-count')) {
        document.getElementById('egg-steps-count').innerText = currentSteps;
    }

    const basePet = allMonsters[Math.floor(Math.random() * allMonsters.length)];
    const randomElem = elements[Math.floor(Math.random() * elements.length)];
    const hatchedPet = { 
        ...basePet, 
        uniqueId: Date.now(), 
        level: 1, 
        hunger: 80, 
        happiness: 80, 
        element: randomElem.name,
        critRate: Math.floor(1 + Math.random() * 34),
        dodgeRate: Math.floor(1 + Math.random() * 34),
        accuracy: Math.floor(1 + Math.random() * 34),
        attackSpeed: parseFloat((1.0 + Math.random() * 1.0).toFixed(1)),
        buffEffect: null
    };

    if (team.length < 3) {
        team.push(hatchedPet);
        localStorage.setItem('ar_team', JSON.stringify(team));
        if (window.updateTeamCount) window.updateTeamCount();
        alert(`🎉 Trứng nở ra ${hatchedPet.emoji} ${hatchedPet.name} [Hệ ${hatchedPet.element}] vào đội hình!`);
    } else {
        farm.push(hatchedPet);
        localStorage.setItem('ar_farm', JSON.stringify(farm));
        alert(`🎉 Trứng nở ra ${hatchedPet.emoji} ${hatchedPet.name} [Hệ ${hatchedPet.element}] vào Trang Trại!`);
    }
    closeModal();
};