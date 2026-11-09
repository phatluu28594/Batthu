// js/profile.js
import { team, farm, pokedex } from './config.js';

export function openProfileMenu() {
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');

    // Lấy thông tin người chơi từ localStorage (nếu chưa có sẽ dùng mặc định)
    let playerName = localStorage.getItem('ar_player_name') || 'Nhà Huấn Luyện Tài Ba';
    let playerExp = parseInt(localStorage.getItem('ar_player_exp') || '120');
    let playerLevel = parseInt(localStorage.getItem('ar_player_level') || '3');
    let totalMeters = parseFloat(localStorage.getItem('ar_total_meters') || '1.45'); // tính bằng km hoặc mét

    // Tổng hợp tất cả thú đang có (Đội hình + Trang trại)
    let allOwnedPets = [...team, ...farm];

    content.innerHTML = `
    <div class="flex justify-between items-center mb-3">
        <h3 class="font-bold text-lg text-yellow-300">📜 Hồ Sơ Người Chơi</h3>
        <button onclick="closeModal()" class="text-zinc-400 font-bold">✕</button>
    </div>

    <!-- KHUNG THÔNG TIN CHÍNH & HÌNH NỀN -->
    <div class="relative bg-gradient-to-r from-purple-900/90 via-zinc-900 to-indigo-950 p-4 rounded-2xl border-2 border-purple-500/50 mb-4 shadow-xl overflow-hidden">
        <div class="absolute -right-4 -bottom-4 text-7xl opacity-20">🛡️</div>
        
        <div class="flex items-center gap-3 relative z-10">
            <div class="w-14 h-14 bg-gradient-to-tr from-amber-500 to-yellow-300 rounded-full flex items-center justify-center text-2xl shadow-lg border-2 border-white/30">
                🤠
            </div>
            <div class="flex-1">
                <div class="flex items-center justify-between">
                    <h4 id="player-name-display" class="font-bold text-base text-white">${playerName}</h4>
                    <button onclick="editPlayerName()" class="text-[10px] bg-white/10 px-2 py-0.5 rounded border border-white/20 hover:bg-white/20">✏️ Đổi tên</button>
                </div>
                <div class="text-xs text-yellow-400 font-bold mt-0.5">⭐ Cấp độ (Lv.${playerLevel})</div>
            </div>
        </div>

        <!-- THANH EXP -->
        <div class="mt-3 relative z-10">
            <div class="flex justify-between text-[11px] mb-1 text-zinc-300">
                <span>Kinh nghiệm (EXP)</span>
                <span>${playerExp} / 500 EXP</span>
            </div>
            <div class="w-full bg-zinc-900/80 rounded-full h-2 overflow-hidden border border-purple-500/30">
                <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-full" style="width: ${(playerExp/500)*100}%"></div>
            </div>
        </div>
    </div>

    <!-- THỐNG KÊ DI CHUYỂN & SƯU TẬP -->
    <div class="grid grid-cols-2 gap-2 mb-4">
        <div class="bg-zinc-800 p-3 rounded-xl border border-zinc-700 flex flex-col items-center text-center">
            <span class="text-2xl mb-1">🚶‍♂️</span>
            <div class="text-[11px] text-zinc-400">Quãng đường đi</div>
            <div class="text-sm font-bold text-emerald-400">${totalMeters} km</div>
        </div>
        <div class="bg-zinc-800 p-3 rounded-xl border border-zinc-700 flex flex-col items-center text-center">
            <span class="text-2xl mb-1">📖</span>
            <div class="text-[11px] text-zinc-400">Sổ tay Pokedex</div>
            <div class="text-sm font-bold text-yellow-400">${pokedex.length} loài</div>
        </div>
    </div>

    <!-- DANH SÁCH THÚ CƯNG ĐÃ SỞ HỮU -->
    <div class="text-xs font-bold text-zinc-300 mb-2">🐾 Kho Thú Cưng Đã Sở Hữu (${allOwnedPets.length})</div>
    <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
        ${allOwnedPets.length === 0 ? `
            <div class="text-zinc-500 text-xs text-center py-4 bg-zinc-800/50 rounded-xl">Bạn chưa sở hữu con thú nào. Hãy đi bắt ngay!</div>
        ` : allOwnedPets.map(pet => `
            <div class="bg-zinc-800 p-2.5 rounded-xl flex items-center justify-between border border-zinc-700">
                <div class="flex items-center gap-2.5">
                    <span class="text-3xl bg-zinc-900 p-1.5 rounded-lg">${pet.emoji}</span>
                    <div>
                        <div class="font-bold text-xs">${pet.name} <span class="text-yellow-400">Lv.${pet.level || 1}</span></div>
                        <div class="text-[10px] text-zinc-400">Hệ: ${pet.element || 'Kim'} | HP: ${pet.hp}/${pet.maxHp}</div>
                    </div>
                </div>
                <span class="text-[10px] bg-purple-950/60 text-purple-300 px-2 py-1 rounded border border-purple-500/30">CP ${pet.cp}</span>
            </div>
        `).join('')}
    </div>`;
}

// Tính năng đổi tên người chơi
window.editPlayerName = function() {
    let currentName = localStorage.getItem('ar_player_name') || 'Nhà Huấn Luyện Tài Ba';
    let newName = prompt('Nhập tên mới của bạn:', currentName);
    if (newName && newName.trim() !== '') {
        localStorage.setItem('ar_player_name', newName.trim());
        document.getElementById('player-name-display').innerText = newName.trim();
        alert('Đổi tên thành công!');
    }
};

// Hàm tự động cộng dồn quãng đường khi di chuyển/mở bản đồ (có thể gọi ở map.js)
window.addPlayerDistance = function(km) {
    let current = parseFloat(localStorage.getItem('ar_total_meters') || '1.45');
    current = parseFloat((current + km).toFixed(2));
    localStorage.setItem('ar_total_meters', current);
};