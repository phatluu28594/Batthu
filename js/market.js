let playerCoins = parseInt(localStorage.getItem('ar_coins') || '500');
let inventory = JSON.parse(localStorage.getItem('ar_inventory') || JSON.stringify({ food: 5, toy: 5, trainer: 3, meat: 0, stoneKim: 0, stoneMoc: 0, stoneThuy: 0, stoneHoa: 0, stoneTho: 0 }));
let marketQtys = { food: 1, toy: 1, trainer: 1, stamina: 1, stoneKim: 1, stoneMoc: 1, stoneThuy: 1, stoneHoa: 1, stoneTho: 1 };

function saveInventory() { 
    localStorage.setItem('ar_inventory', JSON.stringify(inventory)); 
}

function openMarketMenu() {
    const modal = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    renderMarketContent();
}

function renderMarketContent() {
    const content = document.getElementById('modal-content');
    content.innerHTML = `
    <div class="flex justify-between items-center mb-4"><h3 class="font-bold text-lg">🛒 Chợ Đen & Trao Đổi</h3><button onclick="closeModal()" class="text-zinc-400 font-bold">✕</button></div>
    <div class="text-xs text-yellow-400 font-bold mb-3">💰 Vàng hiện có: <span id="market-coins">${playerCoins}</span> 🪙</div>
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
        <div class="bg-zinc-800 p-3 rounded-xl flex items-center justify-between border border-zinc-700">
            <div><div class="font-bold text-sm">🎾 Đồ Chơi (50🪙)</div><div class="text-[10px] text-zinc-400">Kho: ${inventory.toy}</div></div>
            <div class="flex items-center gap-2">
                <div class="flex items-center bg-zinc-900 rounded border border-zinc-700">
                    <button onclick="adjustQty('toy', -1)" class="px-2 py-1 text-xs font-bold">-</button>
                    <span id="qty-toy" class="px-2 text-xs font-bold">${marketQtys.toy}</span>
                    <button onclick="adjustQty('toy', 1)" class="px-2 py-1 text-xs font-bold">+</button>
                </div>
                <button onclick="buyBatch('toy', 50)" class="bg-amber-600 px-3 py-1.5 rounded text-xs font-bold">Mua</button>
            </div>
        </div>
        <div class="bg-zinc-800 p-3 rounded-xl flex items-center justify-between border border-zinc-700">
            <div><div class="font-bold text-sm">🏋️ Dụng Cụ Tập (100🪙)</div><div class="text-[10px] text-zinc-400">Kho: ${inventory.trainer}</div></div>
            <div class="flex items-center gap-2">
                <div class="flex items-center bg-zinc-900 rounded border border-zinc-700">
                    <button onclick="adjustQty('trainer', -1)" class="px-2 py-1 text-xs font-bold">-</button>
                    <span id="qty-trainer" class="px-2 text-xs font-bold">${marketQtys.trainer}</span>
                    <button onclick="adjustQty('trainer', 1)" class="px-2 py-1 text-xs font-bold">+</button>
                </div>
                <button onclick="buyBatch('trainer', 100)" class="bg-amber-600 px-3 py-1.5 rounded text-xs font-bold">Mua</button>
            </div>
        </div>

        <div class="text-xs font-bold text-yellow-400 mt-2">💎 Đá Ngũ Hành (150🪙 / viên)</div>
        <div class="bg-zinc-800 p-2.5 rounded-xl flex items-center justify-between border border-zinc-700">
            <div class="text-xs">⚔️ Đá Kim (Kho: ${inventory.stoneKim})</div>
            <button onclick="buyBatch('stoneKim', 150)" class="bg-amber-600 px-3 py-1 rounded text-xs font-bold">Mua</button>
        </div>
        <div class="bg-zinc-800 p-2.5 rounded-xl flex items-center justify-between border border-zinc-700">
            <div class="text-xs">🌿 Đá Mộc (Kho: ${inventory.stoneMoc})</div>
            <button onclick="buyBatch('stoneMoc', 150)" class="bg-amber-600 px-3 py-1 rounded text-xs font-bold">Mua</button>
        </div>
        <div class="bg-zinc-800 p-2.5 rounded-xl flex items-center justify-between border border-zinc-700">
            <div class="text-xs">💧 Đá Thủy (Kho: ${inventory.stoneThuy})</div>
            <button onclick="buyBatch('stoneThuy', 150)" class="bg-amber-600 px-3 py-1 rounded text-xs font-bold">Mua</button>
        </div>
        <div class="bg-zinc-800 p-2.5 rounded-xl flex items-center justify-between border border-zinc-700">
            <div class="text-xs">🔥 Đá Hỏa (Kho: ${inventory.stoneHoa})</div>
            <button onclick="buyBatch('stoneHoa', 150)" class="bg-amber-600 px-3 py-1 rounded text-xs font-bold">Mua</button>
        </div>
        <div class="bg-zinc-800 p-2.5 rounded-xl flex items-center justify-between border border-zinc-700">
            <div class="text-xs">🪨 Đá Thổ (Kho: ${inventory.stoneTho})</div>
            <button onclick="buyBatch('stoneTho', 150)" class="bg-amber-600 px-3 py-1 rounded text-xs font-bold">Mua</button>
        </div>
    </div>`;
}

function adjustQty(item, delta) {
    marketQtys[item] = Math.max(1, marketQtys[item] + delta);
    document.getElementById(`qty-${item}`).innerText = marketQtys[item];
}

function buyBatch(type, unitPrice) {
    let qty = marketQtys[type] || 1;
    let totalPrice = unitPrice * qty;
    if (playerCoins < totalPrice) { alert('Bạn không đủ vàng!'); return; }
    playerCoins -= totalPrice;
    localStorage.setItem('ar_coins', playerCoins);

    inventory[type] = (inventory[type] || 0) + qty;
    saveInventory();
    alert(`🛒 Mua thành công ${qty} vật phẩm!`);
    renderMarketContent();
}

function buyStaminaBatch(unitPrice) {
    let qty = marketQtys.stamina;
    let totalPrice = unitPrice * qty;
    if (playerCoins < totalPrice) { alert('Bạn không đủ vàng!'); return; }
    playerCoins -= totalPrice;
    localStorage.setItem('ar_coins', playerCoins);
    stamina = Math.min(15, stamina + (qty * 5));
    localStorage.setItem('ar_stamina', stamina);
    document.getElementById('stamina-count').innerText = stamina;
    alert(`⚡ Hồi phục +${qty * 5} Năng lượng!`);
    renderMarketContent();
}
