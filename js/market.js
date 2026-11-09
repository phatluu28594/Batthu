import { inventory, saveInventory, playerCoins } from './config.js';

let marketQtys = { food: 1, toy: 1, trainer: 1, stamina: 1, stoneKim: 1, stoneMoc: 1, stoneThuy: 1, stoneHoa: 1, stoneTho: 1 };

export function openMarketMenu() {
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    renderMarketContent();
}

function renderMarketContent() {
    const content = document.getElementById('modal-content');
    content.innerHTML = `
    <div class="flex justify-between items-center mb-4"><h3 class="font-bold text-lg">🛒 Chợ Đen & Trao Đổi</h3><button onclick="closeModal()" class="text-zinc-400 font-bold">✕</button></div>
    <div class="text-xs text-yellow-400 font-bold mb-3">💰 Vàng hiện có: <span id="market-coins">${window.playerCoins}</span> 🪙</div>
    <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
        <div class="bg-zinc-800 p-3 rounded-xl flex items-center justify-between border border-amber-500/50">
            <div><div class="font-bold text-sm text-amber-300">⚡ Năng Lượng (x5) (500🪙)</div></div>
            <div class="flex items-center gap-2">
                <div class="flex items-center bg-zinc-900 rounded border border-zinc-700">
                    <button onclick="adjustQty('stamina', -1)" class="px-2 py-1 text-xs font-bold">-</button>
                    <span id="qty-stamina" class="px-2 text-xs font-bold">${marketQtys.stamina}</span>
                    <button onclick="adjustQty('stamina', 1)" class="px-2 py-1 text-xs font-bold">+</button>
                </div>
                <button onclick="buyStaminaBatch(500)" class="bg-amber-600 hover:bg-amber-500 px-3 py-1.5 rounded text-xs font-bold">Mua</button>
            </div>
        </div>
        <div class="bg-zinc-800 p-3 rounded-xl flex items-center justify-between border border-zinc-700">
            <div><div class="font-bold text-sm">🍖 Thức Ăn (50🪙)</div><div class="text-[10px] text-zinc-400">Kho: ${inventory.food}</div></div>
            <div class="flex items-center gap-2">
                <div class="flex items-center bg-zinc-900 rounded border border-zinc-700">
                    <button onclick="adjustQty('food', -1)" class="px-2 py-1 text-xs font-bold">-</button>
                    <span id="qty-food" class="px-2 text-xs font-bold">${marketQtys.food}</span>
                    <button onclick="adjustQty('food', 1)" class="px-2 py-1 text-xs font-bold">+</button>
                </div>
                <button onclick="buyBatch('food', 50)" class="bg-amber-600 px-3 py-1.5 rounded text-xs font-bold">Mua</button>
            </div>
        </div>
        <!-- Thêm các vật phẩm đá ngũ hành tương tự -->
    </div>`;
}

// Gán vào window để các nút onclick trong HTML gọi được trực tiếp
window.adjustQty = function(item, delta) {
    marketQtys[item] = Math.max(1, marketQtys[item] + delta);
    document.getElementById(`qty-${item}`).innerText = marketQtys[item];
};

window.buyBatch = function(type, unitPrice) {
    let qty = marketQtys[type] || 1;
    let totalPrice = unitPrice * qty;
    if (window.playerCoins < totalPrice) { alert('Bạn không đủ vàng!'); return; }
    window.playerCoins -= totalPrice;
    localStorage.setItem('ar_coins', window.playerCoins);

    inventory[type] = (inventory[type] || 0) + qty;
    saveInventory();
    alert(`🛒 Mua thành công ${qty} vật phẩm!`);
    renderMarketContent();
};