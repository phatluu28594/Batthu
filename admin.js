// ============================================================================
// BẮT THÚ VƯƠNG - MODULE QUẢN TRỊ VIÊN CAO CẤP (admin.js)
// Tách biệt hoàn toàn khỏi index.html để giữ mã nguồn gọn nhẹ & dễ bảo trì
// ============================================================================

(function () {
    const ADMIN_ACCOUNTS = ['AdminPhat', 'PhatLuu28'];

    function isCurrentUserAdmin() {
        const u = (localStorage.getItem('ar_cloud_user') || '').trim();
        return ADMIN_ACCOUNTS.some(id => id.toLowerCase() === u.toLowerCase());
    }

    // Tự động gắn hoặc gỡ nút [👑 GM] tùy theo tài khoản đang đăng nhập
    function syncAdminUiButton() {
        const isAdmin = isCurrentUserAdmin();
        let homeBtn = document.getElementById('btn-admin-home');
        let mapBtn = document.getElementById('btn-admin-map');

        if (!isAdmin) {
            if (homeBtn) homeBtn.remove();
            if (mapBtn) mapBtn.remove();
            return;
        }

        const homeBar = document.querySelector('#home-screen .pointer-events-auto.flex.items-center');
        if (homeBar && !homeBtn) {
            const btn = document.createElement('button');
            btn.id = 'btn-admin-home';
            btn.onclick = window.openAdminGmModal;
            btn.className = 'bg-gradient-to-r from-red-600 to-amber-500 px-2.5 py-1.5 rounded-full border border-yellow-300 text-xs font-black text-white shadow-lg cursor-pointer animate-pulse';
            btn.innerText = '👑 GM';
            homeBar.prepend(btn);
        }

        const mapBar = document.querySelector('#map-top-nav > div:first-child');
        if (mapBar && !mapBtn) {
            const btn = document.createElement('button');
            btn.id = 'btn-admin-map';
            btn.onclick = window.openAdminGmModal;
            btn.className = 'bg-gradient-to-r from-red-600 to-amber-500 px-2.5 py-1.5 rounded-full border border-yellow-300 text-xs font-black text-white shadow-lg cursor-pointer animate-pulse whitespace-nowrap';
            btn.innerText = '👑 GM';
            mapBar.prepend(btn);
        }
    }

    setInterval(syncAdminUiButton, 2000);
    window.addEventListener('load', syncAdminUiButton);

    // Dựng đối tượng linh thú tùy chỉnh chuẩn dữ liệu game
    function buildAdminCustomPet(name, rarityIdx, level, customElement, customTraitType) {
        const monsters = window.allMonsters || [];
        const rarityList = window.rarities || [];
        const traitsList = window.possibleTraits || [];

        const base = monsters.find(m => m.name === name) || monsters[0] || {
            id: 101, name: 'Gà Lửa', emoji: '🐔', element: 'Hoa', hp: 110, maxHp: 110, atk: 42, speed: 62
        };
        const rarity = rarityList[rarityIdx] || rarityList[0] || {
            name: 'Thường', color: 'text-zinc-300', bg: 'border-zinc-600', badge: '⚪ Trắng', statMultiplier: 1.0
        };
        const mult = rarity.statMultiplier || 1;
        const lv = Math.max(1, parseInt(level, 10) || 1);
        const elem = (customElement && customElement !== 'DEFAULT') ? customElement : base.element;
        const chosenTrait = (customTraitType && customTraitType !== 'RANDOM')
            ? (traitsList.find(t => t.type === customTraitType) || null)
            : null;

        const raw = {
            ...base,
            id: 'gm_pet_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
            element: elem,
            rarity: rarity,
            level: lv,
            hearts: 3,
            maxHp: Math.floor((base.maxHp + (lv - 1) * 25) * mult),
            hp: Math.floor((base.maxHp + (lv - 1) * 25) * mult),
            atk: Math.floor((base.atk + (lv - 1) * 8) * mult),
            speed: Math.floor((base.speed + (lv - 1) * 2) * (1 + (mult - 1) * 0.4))
        };
        if (chosenTrait) raw.trait = { ...chosenTrait, chance: 35 };

        return typeof window.sanitizePetsData === 'function' ? window.sanitizePetsData([raw])[0] : raw;
    }

    // Gửi gói quà Admin qua API Cloudflare Worker (/api/admin) cho người chơi khác
    async function sendAdminGiftToRemotePlayer(targetUsername, giftPayload) {
        const adminUser = localStorage.getItem('ar_cloud_user');
        const adminPin = localStorage.getItem('ar_cloud_pin');
        try {
            const res = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminUser: adminUser,
                    adminPin: adminPin,
                    targetUser: targetUsername,
                    gift: giftPayload
                })
            });
            const data = await res.json();
            if (!data.ok) {
                alert('❌ Lỗi gửi cho người chơi: ' + (data.error || 'Không tìm thấy ID người nhận!'));
                return false;
            }
            alert(`✅ Đã gửi thành công tới kho của người chơi [${targetUsername}]!`);
            return true;
        } catch (err) {
            alert('❌ Lỗi kết nối máy chủ Admin: ' + err.message);
            return false;
        }
    }

    // Mở giao diện Bảng Điều Khiển Admin
    window.openAdminGmModal = function () {
        if (!isCurrentUserAdmin()) {
            alert('⛔ Bạn không có quyền truy cập Bảng Điều Khiển Admin!');
            return;
        }

        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;
        modal.classList.remove('hidden');

        const monsterOptions = (window.allMonsters || []).map(m =>
            `<option value="${m.name}">${m.emoji} ${m.name} (Hệ ${m.element})</option>`
        ).join('');

        const rarityOptions = (window.rarities || []).map((r, idx) =>
            `<option value="${idx}">${r.badge} ${r.name} (x${r.statMultiplier})</option>`
        ).join('');

        const traitOptions = (window.possibleTraits || []).map(t =>
            `<option value="${t.type}">${t.icon} - ${t.name}</option>`
        ).join('');

        content.innerHTML = `
        <div class="flex justify-between items-center mb-3 pb-2 border-b border-amber-500/40">
            <h3 class="font-black text-base text-yellow-300">👑 BẢNG ĐIỀU KHIỂN ADMIN (GM)</h3>
            <button onclick="closeModal()" class="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full font-bold text-sm cursor-pointer border border-zinc-600">✕</button>
        </div>

        <div class="bg-amber-950/40 border border-amber-500/50 rounded-xl p-2.5 mb-3">
            <label class="text-[11px] font-extrabold text-amber-300 block mb-1">🎯 ID Người Nhận (Để trống = Tự tạo cho bản thân):</label>
            <input id="gm-target-user" type="text" maxlength="16" placeholder="Nhập ID người chơi khác hoặc để trống..."
                class="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-yellow-400 outline-none">
        </div>

        <div class="space-y-3 max-h-[62vh] overflow-y-auto pr-1 text-xs">
            <!-- 1. TẠO LINH THÚ -->
            <div class="bg-zinc-800/90 border border-emerald-500/40 rounded-xl p-3 space-y-2">
                <div class="font-extrabold text-emerald-300">🐾 1. Tạo & Gửi Linh Thú</div>
                <div class="grid grid-cols-2 gap-1.5">
                    <select id="gm-pet-name" class="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-white">${monsterOptions}</select>
                    <select id="gm-pet-rarity" class="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-white">${rarityOptions}</select>
                </div>
                <div class="grid grid-cols-2 gap-1.5">
                    <input id="gm-pet-level" type="number" min="1" max="999" value="10" placeholder="Cấp độ (Lv)" class="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white">
                    <select id="gm-pet-element" class="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-white">
                        <option value="DEFAULT">Hệ mặc định</option>
                        <option value="Kim">⚔️ Hệ Kim</option>
                        <option value="Moc">🌿 Hệ Mộc</option>
                        <option value="Thuy">💧 Hệ Thủy</option>
                        <option value="Hoa">🔥 Hệ Hỏa</option>
                        <option value="Tho">🪨 Hệ Thổ</option>
                    </select>
                </div>
                <select id="gm-pet-trait" class="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-white">
                    <option value="RANDOM">🎲 Đặc kỹ ngẫu nhiên</option>
                    ${traitOptions}
                </select>
                <button onclick="adminCreatePet()" class="w-full bg-emerald-600 hover:bg-emerald-500 py-2 rounded-lg font-extrabold text-white cursor-pointer">
                    ✨ Tạo Linh Thú Ngay
                </button>
            </div>

            <!-- 2. TẠO TRỨNG LINH THÚ -->
            <div class="bg-zinc-800/90 border border-cyan-500/40 rounded-xl p-3 space-y-2">
                <div class="font-extrabold text-cyan-300">🥚 2. Tạo & Gửi Trứng Ấp</div>
                <div class="grid grid-cols-2 gap-1.5">
                    <select id="gm-egg-name" class="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-white">${monsterOptions}</select>
                    <select id="gm-egg-rarity" class="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-white">${rarityOptions}</select>
                </div>
                <button onclick="adminCreateEgg()" class="w-full bg-cyan-600 hover:bg-cyan-500 py-2 rounded-lg font-extrabold text-white cursor-pointer">
                    🥚 Tạo Trứng Ngay (Sẵn sàng nở)
                </button>
            </div>

            <!-- 3. BƠM TÀI NGUYÊN & VẬT PHẨM -->
            <div class="bg-zinc-800/90 border border-yellow-500/40 rounded-xl p-3 space-y-2">
                <div class="font-extrabold text-yellow-300">💰 3. Cấp Vàng, Kim Cương & Đá</div>
                <div class="grid grid-cols-2 gap-1.5">
                    <input id="gm-add-coins" type="number" value="10000" placeholder="Số Vàng 🪙" class="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-yellow-300 font-bold">
                    <input id="gm-add-diamonds" type="number" value="500" placeholder="Số Kim Cương 💎" class="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sky-300 font-bold">
                </div>
                <button onclick="adminGrantCurrency()" class="w-full bg-amber-600 hover:bg-amber-500 py-2 rounded-lg font-extrabold text-white cursor-pointer">
                    🎁 Gửi Tài Nguyên
                </button>
            </div>

            <!-- 4. ĐIỀU KHIỂN BOSS THẾ GIỚI -->
            <div class="bg-zinc-800/90 border border-red-500/50 rounded-xl p-3 space-y-2">
                <div class="font-extrabold text-red-400">👹 4. Triệu Hồi & Chỉnh Boss Thế Giới</div>
                <div class="grid grid-cols-2 gap-1.5">
                    <button onclick="adminForceSpawnWorldBoss()" class="bg-red-600 hover:bg-red-500 py-2 rounded-lg font-extrabold text-white cursor-pointer">
                        🔥 Gọi Boss 3 Miền
                    </button>
                    <button onclick="adminResetWorldBossHp()" class="bg-purple-600 hover:bg-purple-500 py-2 rounded-lg font-extrabold text-white cursor-pointer">
                        ⚡ Hồi Đầy Máu Boss
                    </button>
                </div>
            </div>
        </div>`;
    };

    window.adminCreatePet = async function () {
        const targetUser = document.getElementById('gm-target-user')?.value.trim();
        const name = document.getElementById('gm-pet-name')?.value;
        const rarityIdx = parseInt(document.getElementById('gm-pet-rarity')?.value || '0', 10);
        const level = parseInt(document.getElementById('gm-pet-level')?.value || '1', 10);
        const elem = document.getElementById('gm-pet-element')?.value;
        const traitType = document.getElementById('gm-pet-trait')?.value;

        const newPet = buildAdminCustomPet(name, rarityIdx, level, elem, traitType);
        const currentUser = (localStorage.getItem('ar_cloud_user') || '').toLowerCase();

        if (!targetUser || targetUser.toLowerCase() === currentUser) {
            if (window.team && window.team.length < 3) window.team.push(newPet);
            else if (window.farm) window.farm.push(newPet);
            if (typeof window.saveGameData === 'function') window.saveGameData();
            if (typeof window.updateTeamCount === 'function') window.updateTeamCount();
            alert(`🎉 Admin đã tạo thành công [${newPet.rarity.badge} ${newPet.name} Lv.${newPet.level}] vào kho của bạn!`);
        } else {
            await sendAdminGiftToRemotePlayer(targetUser, { type: 'pet', pet: newPet });
        }
    };

    window.adminCreateEgg = async function () {
        const targetUser = document.getElementById('gm-target-user')?.value.trim();
        const name = document.getElementById('gm-egg-name')?.value;
        const rarityIdx = parseInt(document.getElementById('gm-egg-rarity')?.value || '0', 10);
        const childPet = buildAdminCustomPet(name, rarityIdx, 1, 'DEFAULT', 'RANDOM');

        const newEgg = {
            name: `Trứng Thần ${childPet.name}`,
            element: childPet.element,
            rarity: childPet.rarity,
            steps: 100,
            requiredSteps: 100,
            petData: childPet
        };

        const currentUser = (localStorage.getItem('ar_cloud_user') || '').toLowerCase();
        if (!targetUser || targetUser.toLowerCase() === currentUser) {
            if (window.eggs) window.eggs.push(newEgg);
            if (typeof window.saveGameData === 'function') window.saveGameData();
            alert(`🥚 Đã tạo [${newEgg.name}] (${newEgg.rarity.badge}) sẵn sàng ấp nở!`);
        } else {
            await sendAdminGiftToRemotePlayer(targetUser, { type: 'egg', egg: newEgg });
        }
    };

    window.adminGrantCurrency = async function () {
        const targetUser = document.getElementById('gm-target-user')?.value.trim();
        const coins = parseInt(document.getElementById('gm-add-coins')?.value || '0', 10);
        const diamonds = parseInt(document.getElementById('gm-add-diamonds')?.value || '0', 10);
        const currentUser = (localStorage.getItem('ar_cloud_user') || '').toLowerCase();

        if (!targetUser || targetUser.toLowerCase() === currentUser) {
            window.playerCoins = (window.playerCoins || 0) + coins;
            window.playerDiamonds = (window.playerDiamonds || 0) + diamonds;
            if (typeof window.saveGameData === 'function') window.saveGameData();
            alert(`💰 Đã cộng +${coins.toLocaleString()}🪙 và +${diamonds.toLocaleString()}💎 cho tài khoản của bạn!`);
        } else {
            await sendAdminGiftToRemotePlayer(targetUser, { type: 'currency', coins, diamonds });
        }
    };

    window.adminForceSpawnWorldBoss = function () {
        window.isWorldBossActiveNow = function () { return true; };
        if (typeof window.renderWorldBossMarkersOnMap === 'function') {
            window.renderWorldBossMarkersOnMap();
        }
        if (typeof window.sendWorldChat === 'function') {
            window.sendWorldChat('🚨 [SỰ KIỆN ADMIN] Boss Thế Giới 3 Miền vừa được triệu hồi khẩn cấp trên bản đồ!', true);
        }
        alert('🔥 Đã triệu hồi khẩn cấp 3 Boss Bắc - Trung - Nam lên bản đồ GPS!');
    };

    window.adminResetWorldBossHp = function () {
        if (typeof window.wbState !== 'undefined') {
            const lv = window.bossLevel || 1;
            window.wbState.maxHp = 5000 + lv * 3000;
            window.wbState.hp = window.wbState.maxHp;
            alert(`⚡ Đã hồi đầy ${window.wbState.maxHp.toLocaleString()} HP cho Boss Thế Giới!`);
        }
    };
})();
