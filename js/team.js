import { team, farm, inventory, saveInventory, checkPetSurvival, elements } from './config.js';

export function openTeamMenu() {
    checkPetSurvival();
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    let html = `<div class="flex justify-between items-center mb-4"><h3 class="font-bold text-lg">🎒 Đội Hình Chiến Đấu (${team.length}/3)</h3><button onclick="closeModal()" class="text-zinc-400 font-bold">✕</button></div>`;
    if (team.length === 0) {
        html += `<p class="text-zinc-400 text-sm text-center py-6">Đội hình trống. Hãy vào Trang Trại đưa thú vào đội!</p>`;
    } else {
        html += `<div class="space-y-3">`;
        team.forEach((pet, idx) => {
            let elemObj = elements.find(e => e.name === pet.element) || elements[0];
            let isRefusing = (pet.happiness < 30);
            html += `
            <div onclick="openPetDetail(${idx})" class="bg-zinc-800 cursor-pointer p-3 rounded-xl flex items-center justify-between border ${isRefusing ? 'border-red-500' : 'border-zinc-700'}">
                <div class="flex items-center gap-3">
                    <span class="text-4xl bg-zinc-900 p-2 rounded-xl pet-animate">${pet.emoji}</span>
                    <div>
                        <div class="font-bold text-sm">${pet.name} <span class="text-xs text-yellow-400">Lv.${pet.level}</span> <span class="${elemObj.color}">(${elemObj.icon}${pet.element})</span></div>
                        <div class="text-[11px] text-zinc-300">HP: ${pet.hp}/${pet.maxHp} | No: ${pet.hunger}% | Vui: ${pet.happiness}%</div>
                        ${isRefusing ? '<div class="text-[10px] text-red-400 font-bold">⚠️ Hạnh phúc < 30%: Từ chối chiến đấu!</div>' : ''}
                    </div>
                </div>
                <button onclick="event.stopPropagation(); removePetToFarm(${idx})" class="text-amber-400 text-xs px-2 py-1 bg-amber-950/40 rounded">Về trại</button>
            </div>`;
        });
        html += `</div>`;
    }
    content.innerHTML = html;
}

window.openPetDetail = function(index) {
    let pet = team[index];
    let elemObj = elements.find(e => e.name === pet.element) || elements[0];
    const content = document.getElementById('modal-content');

    let stoneKey = '', stoneName = '', effectDesc = '';
    if (pet.element === 'Kim') { stoneKey = 'stoneKim'; stoneName = 'Đá Kim'; effectDesc = 'Tăng thủ bản thân'; }
    else if (pet.element === 'Mộc') { stoneKey = 'stoneMoc'; stoneName = 'Đá Mộc'; effectDesc = 'Trúng độc đối thủ'; }
    else if (pet.element === 'Thủy') { stoneKey = 'stoneThuy'; stoneName = 'Đá Thủy'; effectDesc = 'Giảm tốc đối thủ'; }
    else if (pet.element === 'Hỏa') { stoneKey = 'stoneHoa'; stoneName = 'Đá Hỏa'; effectDesc = 'Đốt cháy đối thủ'; }
    else if (pet.element === 'Thổ') { stoneKey = 'stoneTho'; stoneName = 'Đá Thổ'; effectDesc = 'Choáng đối thủ'; }

    let stoneCount = inventory[stoneKey] || 0;
    let hasBuff = pet.buffEffect ? `<span class="text-emerald-400 font-bold">✨ Hiệu ứng: ${pet.buffEffect}</span>` : `<span class="text-zinc-400">Chưa nâng cấp hiệu ứng hệ</span>`;

    content.innerHTML = `
    <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-lg">🐾 Chăm Sóc & Nâng Cấp Thú</h3>
        <button onclick="openTeamMenu()" class="text-zinc-400 font-bold">‹ Quay lại</button>
    </div>
    <div class="flex flex-col items-center bg-zinc-800 p-4 rounded-2xl border border-zinc-700 mb-4 text-center">
        <div class="text-7xl mb-2 pet-animate filter drop-shadow-xl">${pet.emoji}</div>
        <div class="text-base font-bold text-yellow-300">${pet.name} <span class="${elemObj.color} text-sm">(${elemObj.icon}${pet.element})</span></div>
        <div class="text-[11px] text-amber-300 mt-1 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-700">
            🎯 Chí mạng: ${pet.critRate}% | 💨 Né: ${pet.dodgeRate}% | 🎯 Chính xác: ${pet.accuracy}% | ⚡ Tốc đánh: ${pet.attackSpeed}/s
        </div>
        <div class="text-xs mt-2">${hasBuff}</div>
        
        <div class="w-full space-y-1.5 mt-3 text-left">
            <div>
                <div class="flex justify-between text-[10px] mb-0.5"><span>HP</span><span>${pet.hp}/${pet.maxHp}</span></div>
                <div class="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden"><div class="bg-emerald-500 h-full" style="width: ${(pet.hp/pet.maxHp)*100}%"></div></div>
            </div>
            <div>
                <div class="flex justify-between text-[10px] mb-0.5"><span>Độ no</span><span>${pet.hunger}%</span></div>
                <div class="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden"><div class="bg-amber-500 h-full" style="width: ${pet.hunger}%"></div></div>
            </div>
            <div>
                <div class="flex justify-between text-[10px] mb-0.5"><span>Hạnh phúc</span><span>${pet.happiness}%</span></div>
                <div class="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden"><div class="bg-pink-500 h-full" style="width: ${pet.happiness}%"></div></div>
            </div>
        </div>
    </div>

    <div class="space-y-2 mb-3">
        <button onclick="upgradePetElement(${index}, '${stoneKey}', '${effectDesc}')" class="w-full bg-purple-600 hover:bg-purple-500 p-2.5 rounded-xl font-bold text-xs shadow flex items-center justify-between px-4">
            <span>💎 Dùng ${stoneName} nâng cấp hiệu ứng hệ</span>
            <span class="bg-black/40 px-2 py-0.5 rounded">Kho: ${stoneCount}</span>
        </button>
    </div>

    <div class="grid grid-cols-3 gap-2 text-center">
        <button onclick="petAction(${index}, 'feed')" class="bg-emerald-600 p-2.5 rounded-xl font-bold text-xs">🍖 Cho ăn (${inventory.food})</button>
        <button onclick="petAction(${index}, 'play')" class="bg-amber-600 p-2.5 rounded-xl font-bold text-xs">🎾 Chơi (${inventory.toy})</button>
        <button onclick="petAction(${index}, 'train')" class="bg-indigo-600 p-2.5 rounded-xl font-bold text-xs">🏋️ Tập (${inventory.trainer})</button>
    </div>`;
};

window.upgradePetElement = function(index, stoneKey, effectDesc) {
    let pet = team[index];
    if ((inventory[stoneKey] || 0) <= 0) {
        alert(`Bạn không có viên đá phù hợp với hệ ${pet.element}! Hãy vào Chợ Đen mua.`);
        return;
    }
    inventory[stoneKey]--;
    saveInventory();
    pet.buffEffect = effectDesc;
    localStorage.setItem('ar_team', JSON.stringify(team));
    alert(`✨ Nâng cấp thành công hiệu ứng: ${effectDesc}`);
    window.openPetDetail(index);
};

window.petAction = function(index, action) {
    let pet = team[index];
    if (action === 'feed') {
        if (inventory.food <= 0) { alert('Hết Thức ăn!'); return; }
        inventory.food--;
        pet.hunger = Math.min(100, pet.hunger + 25);
        pet.hp = Math.min(pet.maxHp, pet.hp + 20);
    } else if (action === 'play') {
        if (inventory.toy <= 0) { alert('Hết Đồ chơi!'); return; }
        inventory.toy--;
        pet.happiness = Math.min(100, pet.happiness + 30);
    } else if (action === 'train') {
        if (inventory.trainer <= 0) { alert('Hết Dụng cụ tập!'); return; }
        inventory.trainer--;
        pet.level++;
        pet.atk += 12;
        pet.maxHp += 20;
        pet.hp = pet.maxHp;
    }
    saveInventory();
    localStorage.setItem('ar_team', JSON.stringify(team));
    window.openPetDetail(index);
};

window.removePetToFarm = function(index) {
    let pet = team.splice(index, 1)[0];
    farm.push(pet);
    localStorage.setItem('ar_team', JSON.stringify(team));
    localStorage.setItem('ar_farm', JSON.stringify(farm));
    if (window.updateTeamCount) window.updateTeamCount();
    openTeamMenu();
};