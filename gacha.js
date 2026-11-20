/**
 * gacha.js - Vòng Quay May Mắn (Lucky Gacha Machine)
 * Bắt Thú Vương AR - Tính năng vòng quay nhận quà, auras, vé quay và trứng thần thoại
 */

(function () {
    const GACHA_FREE_DATE_KEY = 'ar_last_free_spin_date';

    // 8 ô phần thưởng
    const WHEEL_SECTORS = [
        { label: '150 💎', name: '150 Kim Cương', color: '#0284c7', textColor: '#ffffff', icon: '💎', type: 'diamond', value: 150 },
        { label: '3,000 🪙', name: '3.000 Vàng', color: '#eab308', textColor: '#000000', icon: '🪙', type: 'coin', value: 3000 },
        { label: '🌈 Hào Quang', name: 'Hào Quang Ngũ Sắc Huyền Thoại', color: '#9333ea', textColor: '#ffffff', icon: '🌈', type: 'aura', value: 1 },
        { label: '5x Mảnh Thần', name: '5x Mảnh Thú Thần Thoại', color: '#ec4899', textColor: '#ffffff', icon: '🧩', type: 'shards', value: 5 },
        { label: '3x Vé Quay', name: '3x Vé Quay May Mắn', color: '#10b981', textColor: '#ffffff', icon: '🎟️', type: 'ticket', value: 3 },
        { label: '🛡️ Rương Tím', name: '1x Rương Ấn Ký Tím', color: '#7c3aed', textColor: '#ffffff', icon: '🛡️', type: 'chest', value: 1 },
        { label: '🥚 Trứng Thần', name: '1x Trứng Thần Thoại May Mắn', color: '#f97316', textColor: '#ffffff', icon: '🥚', type: 'egg', value: 1 },
        { label: '🍖 10x Thịt Thần', name: '10x Tiệc Thịt Thần Kỳ', color: '#14b8a6', textColor: '#ffffff', icon: '🍖', type: 'food', value: 10 }
    ];

    let currentRotation = 0;
    let isSpinning = false;

    // Kiểm tra lượt quay miễn phí hôm nay
    function hasFreeSpinToday() {
        const today = new Date().toISOString().slice(0, 10);
        const lastDate = localStorage.getItem(GACHA_FREE_DATE_KEY);
        return lastDate !== today;
    }

    function useFreeSpin() {
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(GACHA_FREE_DATE_KEY, today);
    }

    // Thêm vé quay từ bên ngoài (bắt thú, vượt tháp)
    window.addLuckyTicket = function (count = 1) {
        if (!window.inventory) window.inventory = {};
        window.inventory.luckyTicket = (window.inventory.luckyTicket || 0) + count;
        if (typeof window.saveGameData === 'function') window.saveGameData();
        updateGachaHud();
    };

    // Mở Modal Vòng Quay
    window.openLuckyWheelModal = function () {
        let modal = document.getElementById('lucky-wheel-modal');
        if (!modal) {
            modal = createLuckyWheelModalDOM();
            document.body.appendChild(modal);
        }

        modal.classList.remove('hidden');
        drawWheelCanvas();
        updateGachaHud();
        if (typeof window.triggerHaptic === 'function') window.triggerHaptic('light');
    };

    window.closeLuckyWheelModal = function () {
        if (isSpinning) return;
        const modal = document.getElementById('lucky-wheel-modal');
        if (modal) modal.classList.add('hidden');
    };

    function createLuckyWheelModalDOM() {
        const wrap = document.createElement('div');
        wrap.id = 'lucky-wheel-modal';
        wrap.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 hidden';
        wrap.innerHTML = `
            <div class="relative w-full max-w-sm bg-gradient-to-b from-zinc-900 to-black rounded-3xl border border-amber-500/50 shadow-2xl flex flex-col items-center p-4 text-white animate-scale-up">
                <!-- Nút Đóng -->
                <button onclick="closeLuckyWheelModal()" class="absolute top-3 right-3 w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-black flex items-center justify-center cursor-pointer transition">✕</button>

                <!-- Header -->
                <div class="text-center mb-2">
                    <h2 class="text-base font-black text-amber-300 uppercase tracking-wider flex items-center justify-center gap-1.5">
                        🎡 Vòng Quay May Mắn
                    </h2>
                    <p class="text-[11px] text-zinc-300">Cơ hội trúng Hào Quang, Trứng Thần & Rương Tím!</p>
                </div>

                <!-- Thông tin tài nguyên -->
                <div class="flex items-center justify-between w-full mb-3 text-xs bg-zinc-950/80 px-3 py-1.5 rounded-full border border-white/10">
                    <span class="text-amber-400 font-black">🪙 <span id="gacha-coin-count">0</span></span>
                    <span class="text-cyan-300 font-black">💎 <span id="gacha-diamond-count">0</span></span>
                    <span class="text-emerald-400 font-black">🎟️ <span id="gacha-ticket-count">0</span></span>
                    <span id="gacha-free-status" class="text-amber-300 font-bold">Free: 1/1</span>
                </div>

                <!-- Bánh Xe Vòng Quay -->
                <div class="relative w-64 h-64 my-1 flex items-center justify-center">
                    <!-- Kim Chỉ Vòng Quay (ở đỉnh trên cùng) -->
                    <div class="absolute -top-3 z-20 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[20px] border-t-amber-400 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"></div>

                    <!-- Canvas Vẽ Bánh Xe -->
                    <canvas id="wheel-canvas" width="256" height="256" class="rounded-full shadow-2xl border-4 border-amber-500/80"></canvas>

                    <!-- Nút Trục Tâm Bánh Xe -->
                    <div onclick="startLuckySpin()" class="absolute z-10 w-12 h-12 rounded-full bg-gradient-to-b from-amber-400 to-yellow-600 border-2 border-white shadow-xl flex items-center justify-center font-black text-black text-[11px] cursor-pointer hover:scale-105 active:scale-95 transition">
                        QUAY
                    </div>
                </div>

                <!-- Nút Bấm Quay Phía Dưới -->
                <div class="w-full mt-3 flex flex-col gap-2">
                    <button id="btn-spin-main" onclick="startLuckySpin()" class="w-full py-2.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-black font-black text-xs uppercase rounded-2xl shadow-lg shadow-amber-900/30 cursor-pointer transition">
                        Quay Miễn Phí (1/1)
                    </button>
                    <div class="text-center text-[10px] text-zinc-400">
                        * Bắt thú ngoài map (tỷ lệ 30%) hoặc leo Tháp Vô Tận để nhận thêm vé quay!
                    </div>
                </div>
            </div>
        `;
        return wrap;
    }

    function updateGachaHud() {
        const ticketEl = document.getElementById('gacha-ticket-count');
        const coinEl = document.getElementById('gacha-coin-count');
        const diamondEl = document.getElementById('gacha-diamond-count');
        const freeStatusEl = document.getElementById('gacha-free-status');
        const btnSpin = document.getElementById('btn-spin-main');

        const curCoins = (typeof playerCoins !== 'undefined' ? playerCoins : window.playerCoins) || 0;
        const curDiamonds = (typeof playerDiamonds !== 'undefined' ? playerDiamonds : window.playerDiamonds) || 0;
        const inv = (typeof inventory !== 'undefined' ? inventory : window.inventory) || {};
        const tickets = inv.luckyTicket || 0;
        const isFree = hasFreeSpinToday();

        if (ticketEl) ticketEl.innerText = tickets;
        if (coinEl) coinEl.innerText = Number(curCoins).toLocaleString();
        if (diamondEl) diamondEl.innerText = Number(curDiamonds).toLocaleString();

        if (freeStatusEl) {
            freeStatusEl.innerText = isFree ? 'Free: 1/1' : 'Hết Free';
            freeStatusEl.className = isFree ? 'text-amber-300 font-bold' : 'text-zinc-500 font-bold';
        }

        // Cập nhật tất cả các vị trí hiển thị Vàng và Kim Cương trên toàn game
        document.querySelectorAll('.ui-coins-val').forEach(el => el.innerText = curCoins);
        document.querySelectorAll('.ui-diamonds-val').forEach(el => el.innerText = curDiamonds);

        if (btnSpin) {
            if (isFree) {
                btnSpin.innerText = '✨ QUAY MIỄN PHÍ HÔM NAY ✨';
                btnSpin.className = 'w-full py-2.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-black font-black text-xs uppercase rounded-2xl shadow-lg cursor-pointer transition animate-pulse';
            } else if (tickets > 0) {
                btnSpin.innerText = `🎟️ DÙNG 1 VÉ QUAY (CÒN ${tickets})`;
                btnSpin.className = 'w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-black font-black text-xs uppercase rounded-2xl shadow-lg cursor-pointer transition';
            } else {
                btnSpin.innerText = '💎 DÙNG 50 KIM CƯƠNG QUAY';
                btnSpin.className = 'w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white font-black text-xs uppercase rounded-2xl shadow-lg cursor-pointer transition';
            }
        }
    }

    // Vẽ Bánh Xe trên HTML5 Canvas
    function drawWheelCanvas() {
        const canvas = document.getElementById('wheel-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const numSectors = WHEEL_SECTORS.length;
        const arc = (2 * Math.PI) / numSectors;
        const radius = canvas.width / 2;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < numSectors; i++) {
            const angle = i * arc;
            const sector = WHEEL_SECTORS[i];

            // Vẽ nan quạt
            ctx.beginPath();
            ctx.fillStyle = sector.color;
            ctx.moveTo(radius, radius);
            ctx.arc(radius, radius, radius - 2, angle, angle + arc);
            ctx.lineTo(radius, radius);
            ctx.fill();

            // Viền nan quạt
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Vẽ chữ và icon
            ctx.save();
            ctx.translate(radius, radius);
            ctx.rotate(angle + arc / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = sector.textColor;
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText(`${sector.icon} ${sector.label}`, radius - 14, 4);
            ctx.restore();
        }
    }

    // Thực hiện vòng quay
    window.startLuckySpin = function () {
        if (isSpinning) return;

        const isFree = hasFreeSpinToday();
        const inv = (typeof inventory !== 'undefined' ? inventory : window.inventory) || {};
        const tickets = inv.luckyTicket || 0;
        const curDiamonds = (typeof playerDiamonds !== 'undefined' ? playerDiamonds : window.playerDiamonds) || 0;

        // Trừ chi phí
        if (isFree) {
            useFreeSpin();
        } else if (tickets > 0) {
            if (typeof inventory !== 'undefined') inventory.luckyTicket = tickets - 1;
            if (window.inventory) window.inventory.luckyTicket = tickets - 1;
        } else if (curDiamonds >= 50) {
            if (typeof playerDiamonds !== 'undefined') playerDiamonds -= 50;
            if (window.playerDiamonds !== undefined) window.playerDiamonds = curDiamonds - 50;
        } else {
            alert('⚠️ Bạn không đủ Vé Quay hoặc 50 Kim Cương!\nHãy đi bắt thú ngoài map hoặc vượt Tháp Vô Tận để săn vé nhé.');
            return;
        }

        isSpinning = true;
        if (typeof window.saveGameData === 'function') window.saveGameData();
        else if (typeof saveGameData === 'function') saveGameData();
        updateGachaHud();

        // Chọn ngẫu nhiên kết quả theo tỷ lệ
        const chosenIndex = rollGachaSector();
        const chosenSector = WHEEL_SECTORS[chosenIndex];

        // Tính góc dừng:
        const numSectors = WHEEL_SECTORS.length;
        const sectorAngleDeg = 360 / numSectors;
        const targetSectorCenterDeg = chosenIndex * sectorAngleDeg + (sectorAngleDeg / 2);

        let baseStopDeg = 270 - targetSectorCenterDeg;
        while (baseStopDeg < 0) baseStopDeg += 360;

        const totalSpinsDeg = 360 * 6 + baseStopDeg;
        const currentMod = currentRotation % 360;
        const finalDeg = currentRotation + (totalSpinsDeg - currentMod);

        const canvas = document.getElementById('wheel-canvas');
        if (canvas) {
            canvas.style.transition = 'transform 4.5s cubic-bezier(0.15, 0.9, 0.25, 1)';
            canvas.style.transform = `rotate(${finalDeg}deg)`;
        }

        if (typeof window.triggerHaptic === 'function') window.triggerHaptic('medium');

        setTimeout(() => {
            currentRotation = finalDeg;
            isSpinning = false;
            applyGachaReward(chosenSector);
            updateGachaHud();
        }, 4600);
    };

    function rollGachaSector() {
        // Tỷ lệ may mắn
        const weights = [
            12, // 150 Diamond
            25, // 3000 Gold
            5,  // Rainbow Aura
            15, // 5x Shards
            18, // 3x Tickets
            8,  // Purple Chest
            5,  // Mythic Egg
            12  // 10x Food
        ];
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let rand = Math.random() * totalWeight;
        for (let i = 0; i < weights.length; i++) {
            if (rand < weights[i]) return i;
            rand -= weights[i];
        }
        return 1;
    }

    function applyGachaReward(sector) {
        if (sector.type === 'diamond') {
            if (typeof playerDiamonds !== 'undefined') playerDiamonds += sector.value;
            window.playerDiamonds = ((typeof playerDiamonds !== 'undefined' ? playerDiamonds : window.playerDiamonds) || 0) + sector.value;
        } else if (sector.type === 'coin') {
            if (typeof playerCoins !== 'undefined') playerCoins += sector.value;
            window.playerCoins = ((typeof playerCoins !== 'undefined' ? playerCoins : window.playerCoins) || 0) + sector.value;
        } else if (sector.type === 'ticket') {
            if (typeof inventory !== 'undefined') inventory.luckyTicket = (inventory.luckyTicket || 0) + sector.value;
            if (window.inventory) window.inventory.luckyTicket = (window.inventory.luckyTicket || 0) + sector.value;
        } else if (sector.type === 'food') {
            if (typeof inventory !== 'undefined') inventory.food = (inventory.food || 0) + sector.value;
            if (window.inventory) window.inventory.food = (window.inventory.food || 0) + sector.value;
        } else if (sector.type === 'aura') {
            // Tặng hào quang cho pet trong đội hình
            const pet = (window.team && window.team[0]) || (window.farm && window.farm[0]);
            if (pet) {
                pet.hasAura = true;
                pet.auraName = 'Ngũ Sắc Huyền Bí';
                pet.atk += 35;
                pet.maxHp += 150;
                pet.hp += 150;
            } else {
                if (typeof playerDiamonds !== 'undefined') playerDiamonds += 150;
                window.playerDiamonds = ((typeof playerDiamonds !== 'undefined' ? playerDiamonds : window.playerDiamonds) || 0) + 150;
            }
        } else if (sector.type === 'chest') {
            // Rương Ấn Ký Tím
            const pet = (window.team && window.team[0]) || (window.farm && window.farm[0]);
            if (pet) {
                pet.gearTier = Math.max(pet.gearTier || 0, 2);
                pet.gears = {
                    claw: Math.max(pet.gears?.claw || 0, 20),
                    armor: Math.max(pet.gears?.armor || 0, 20),
                    orb: Math.max(pet.gears?.orb || 0, 20)
                };
            } else {
                if (typeof playerCoins !== 'undefined') playerCoins += 2000;
                window.playerCoins = ((typeof playerCoins !== 'undefined' ? playerCoins : window.playerCoins) || 0) + 2000;
            }
        } else if (sector.type === 'egg') {
            // Trứng Thần Thoại May Mắn
            if (!Array.isArray(window.eggs)) window.eggs = [];
            const mythicBaby = {
                id: 'pet_gacha_egg_' + Date.now(),
                name: 'Kỳ Lân May Mắn',
                element: 'Kim',
                level: 1,
                hp: 450,
                maxHp: 450,
                atk: 95,
                speed: 65,
                hearts: 3,
                rarity: { name: 'Thần Thánh', color: 'text-purple-400', bg: 'border-purple-500', badge: '🟣 Tím', statMultiplier: 2.5 },
                trait: 'Vận Khí Trời Ban'
            };
            window.eggs.push({
                name: 'Trứng Kỳ Lân Thần Thánh',
                element: 'Kim',
                rarity: mythicBaby.rarity,
                steps: 0,
                requiredSteps: 50,
                petData: mythicBaby
            });
        } else if (sector.type === 'shards') {
            if (typeof playerCoins !== 'undefined') playerCoins += 1500;
            window.playerCoins = ((typeof playerCoins !== 'undefined' ? playerCoins : window.playerCoins) || 0) + 1500;
            if (typeof playerDiamonds !== 'undefined') playerDiamonds += 50;
            window.playerDiamonds = ((typeof playerDiamonds !== 'undefined' ? playerDiamonds : window.playerDiamonds) || 0) + 50;
        }

        if (typeof window.saveGameData === 'function') window.saveGameData();
        else if (typeof saveGameData === 'function') saveGameData();
        if (typeof window.syncCurrentAccountToCloud === 'function') window.syncCurrentAccountToCloud();
        if (typeof window.triggerHaptic === 'function') window.triggerHaptic('success');
        updateGachaHud();

        // Thông báo ra Kênh Thế Giới nếu trúng giải đặc biệt
        if (sector.type === 'aura' || sector.type === 'egg' || sector.type === 'chest') {
            if (window.sendWorldChat) {
                const hunter = localStorage.getItem('ar_cloud_user') || 'Một Thợ Săn';
                window.sendWorldChat(`✨ [${hunter}] vừa quay trúng [${sector.name}] trên Vòng Quay May Mắn!`, true);
            }
        }

        alert(`🎉 CHÚC MỪNG BẠN!\nBạn vừa quay trúng: ${sector.name} ${sector.icon}!`);
    }
})();
