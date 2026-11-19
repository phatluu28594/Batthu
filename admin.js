// ============================================================================
// BẮT THÚ VƯƠNG - MODULE QUẢN TRỊ VIÊN CAO CẤP (admin.js - Bản Đầy Đủ)
// Bao gồm: Tạo Thú (tùy chọn kỹ năng Hồi Máu x2 Dame), Tạo Trứng, Cấp Tài Nguyên,
// Gọi / Thu hồi / Hồi Máu Boss Thế Giới 3 Miền đồng bộ 100% với arena.js & Server
// ============================================================================

(function () {
    const ADMIN_ACCOUNTS = ['GiaPhat28594', 'ThuyHan171097'];

    function isCurrentUserAdmin() {
        const u = (localStorage.getItem('ar_cloud_user') || '').trim();
        return ADMIN_ACCOUNTS.some(id => id.toLowerCase() === u.toLowerCase());
    }

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

    function buildAdminCustomPet(name, rarityIdx, level, customElement, customTraitType, forceHealSkill = false) {
        const monsters = (typeof allMonsters !== 'undefined') ? allMonsters : [];
        const rarityList = (typeof rarities !== 'undefined') ? rarities : [];
        const traitsList = (typeof possibleTraits !== 'undefined') ? possibleTraits : [];

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

        if (chosenTrait) {
            raw.trait = { ...chosenTrait, chance: 35 };
        }
        if (forceHealSkill || elem === 'Moc' || elem === 'Thuy') {
            raw.hasHealSkill = true;
        }

        return typeof sanitizePetsData === 'function' ? sanitizePetsData([raw])[0] : raw;
    }

    async function sendAdminGiftToRemotePlayer(targetUsername, giftPayload) {
        const adminUser = (localStorage.getItem('ar_cloud_user') || '').trim();
        const adminPin = (localStorage.getItem('ar_cloud_pin') || '').trim();
        if (!adminUser || !adminPin) {
            alert('❌ Thiếu thông tin đăng nhập GM (ID hoặc mã PIN)! Hãy bấm nút ☁️ Nick để đăng nhập lại.');
            return false;
        }
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
            const text = await res.text();
            let data = {};
            try { data = JSON.parse(text); } catch (e) {}

            if (!res.ok || !data.ok) {
                alert(`❌ Không gửi được cho [${targetUsername}]!\nLý do: ${data.error || 'Lỗi máy chủ (Mã ' + res.status + ')'}`);
                return false;
            }
            alert(`✅ Đã gửi quà thành công tới hộp thư của [${data.targetUser || targetUsername}]!\nNgười chơi sẽ tự động nhận ngay khi vào game hoặc sau vài giây.`);
            return true;
        } catch (err) {
            alert('❌ Lỗi kết nối máy chủ Admin: ' + err.message);
            return false;
        }
    }

    // Tự động kiểm tra và nhận quà GM gửi tới cho tất cả người chơi
    let isCheckingAdminGifts = false;
    const claimedGiftIdCache = new Set();

    window.checkAndClaimAdminGifts = async function () {
        if (isCheckingAdminGifts) return;
        const myUser = (localStorage.getItem('ar_cloud_user') || '').trim();
        if (!myUser) return;

        isCheckingAdminGifts = true;
        try {
            const res = await fetch('/api/admin?u=' + encodeURIComponent(myUser) + '&t=' + Date.now(), { cache: 'no-store' });
            const data = await res.json();
            if (!data.ok || !Array.isArray(data.gifts) || data.gifts.length === 0) {
                return;
            }

            const newlyClaimedIds = [];
            const summaryLines = [];

            for (const row of data.gifts) {
                if (!row || claimedGiftIdCache.has(row.id)) continue;
                claimedGiftIdCache.add(row.id);

                let gift = {};
                try { gift = JSON.parse(row.gift_json || '{}'); } catch (e) {}

                if (gift.type === 'pet' && gift.pet) {
                    const sanitized = (typeof sanitizePetsData === 'function') ? sanitizePetsData([gift.pet])[0] : gift.pet;
                    if (sanitized) {
                        if (typeof ensurePetGears === 'function') ensurePetGears(sanitized);
                        if (typeof farm !== 'undefined' && Array.isArray(farm)) {
                            farm.push(sanitized);
                        } else if (typeof team !== 'undefined' && Array.isArray(team)) {
                            team.push(sanitized);
                        }
                        summaryLines.push(`🐾 Linh thú: [${sanitized.rarity?.badge || ''} ${sanitized.name} Lv.${sanitized.level || 1}] (đã vào Kho Trại Hộ)`);
                    }
                } else if (gift.type === 'egg' && gift.egg) {
                    if (typeof eggs !== 'undefined' && Array.isArray(eggs)) {
                        eggs.push(gift.egg);
                    }
                    summaryLines.push(`🥚 Trứng: [${gift.egg.name || 'Trứng Thần'}] (đã vào Khu Ấp Trứng)`);
                } else if (gift.type === 'currency') {
                    const c = Number(gift.coins) || 0;
                    const d = Number(gift.diamonds) || 0;
                    if (typeof playerCoins !== 'undefined') playerCoins += c;
                    if (typeof playerDiamonds !== 'undefined') playerDiamonds += d;
                    if (c > 0) summaryLines.push(`🪙 +${c.toLocaleString()} Vàng`);
                    if (d > 0) summaryLines.push(`💎 +${d.toLocaleString()} Kim Cương`);
                } else if (gift.type === 'items' && gift.items && typeof inventory !== 'undefined') {
                    for (const [k, qty] of Object.entries(gift.items)) {
                        inventory[k] = (inventory[k] || 0) + (Number(qty) || 0);
                    }
                    localStorage.setItem('ar_inventory', JSON.stringify(inventory));
                    summaryLines.push(`🎒 +20 Đá Ngũ Hành các loại, +20 Vé Tập, Thức Ăn & Đồ Chơi`);
                }

                newlyClaimedIds.push(row.id);
            }

            if (newlyClaimedIds.length > 0) {
                if (typeof saveGameData === 'function') saveGameData();
                if (typeof updateTeamCount === 'function') updateTeamCount();

                // Đánh dấu đã nhận trên Server trước, sau đó đồng bộ save game mới lên Cloud
                await fetch('/api/admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'claim_gifts',
                        username: myUser,
                        giftIds: newlyClaimedIds
                    })
                }).catch(() => {});

                if (typeof syncCurrentAccountToCloud === 'function') {
                    // Đồng bộ ngầm không hiện popup lưu
                    const pin = localStorage.getItem('ar_cloud_pin');
                    const sessionToken = localStorage.getItem('ar_cloud_session');
                    if (pin && typeof packCurrentGameState === 'function') {
                        fetch('/api/auth', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'sync',
                                username: myUser,
                                pin: pin,
                                sessionToken: sessionToken,
                                gameData: packCurrentGameState()
                            })
                        }).catch(() => {});
                    }
                }

                if (summaryLines.length > 0) {
                    alert(`🎁 BẠN NHẬN ĐƯỢC QUÀ TỪ ADMIN (GM)!\n\n${summaryLines.join('\n')}`);
                }
            }
        } catch (e) {
        } finally {
            isCheckingAdminGifts = false;
        }
    };

    // Kiểm tra hộp thư quà GM ngay khi tải trang và định kỳ mỗi 8 giây
    setTimeout(() => window.checkAndClaimAdminGifts(), 2000);
    setInterval(() => window.checkAndClaimAdminGifts(), 8000);

    window.openAdminGmModal = function () {
        if (!isCurrentUserAdmin()) {
            alert('⛔ Bạn không có quyền truy cập Bảng Điều Khiển Admin!');
            return;
        }

        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;
        modal.classList.remove('hidden');

        const monsters = (typeof allMonsters !== 'undefined') ? allMonsters : [];
        const rarityList = (typeof rarities !== 'undefined') ? rarities : [];
        const traitsList = (typeof possibleTraits !== 'undefined') ? possibleTraits : [];

        const monsterOptions = monsters.map(m =>
            `<option value="${m.name}">${m.emoji} ${m.name} (Hệ ${m.element})</option>`
        ).join('');

        const rarityOptions = rarityList.map((r, idx) =>
            `<option value="${idx}">${r.badge} ${r.name} (x${r.statMultiplier})</option>`
        ).join('');

        const traitOptions = traitsList.map(t =>
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
                        <option value="Moc">🌿 Hệ Mộc (Có Hồi Máu)</option>
                        <option value="Thuy">💧 Hệ Thủy (Có Hồi Máu)</option>
                        <option value="Hoa">🔥 Hệ Hỏa</option>
                        <option value="Tho">🪨 Hệ Thổ</option>
                    </select>
                </div>
                <select id="gm-pet-trait" class="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-white">
                    <option value="RANDOM">🎲 Đặc kỹ ngẫu nhiên</option>
                    ${traitOptions}
                </select>
                <label class="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-emerald-300 font-bold cursor-pointer">
                    <input id="gm-pet-heal" type="checkbox" checked class="accent-emerald-500 w-4 h-4">
                    <span>💚 Gắn Kỹ năng: Hồi Phục Linh Hồn (Hồi x2 Dame)</span>
                </label>
                <button onclick="adminCreatePet()" class="w-full bg-emerald-600 hover:bg-emerald-500 py-2 rounded-lg font-extrabold text-white cursor-pointer">
                    ✨ Tạo / Gửi Linh Thú Ngay
                </button>
            </div>

            <!-- 2. TẠO TRỨNG LINH THÚ -->
            <div class="bg-zinc-800/90 border border-cyan-500/40 rounded-xl p-3 space-y-2">
                <div class="font-extrabold text-cyan-300">🥚 2. Tạo & Gửi Trứng Ấp</div>
                <div class="grid grid-cols-2 gap-1.5">
                    <select id="gm-egg-name" class="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-white">${monsterOptions}</select>
                    <select id="gm-egg-rarity" class="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-white">${rarityOptions}</select>
                </div>
                <label class="flex items-center gap-2 bg-cyan-950/50 border border-cyan-500/40 rounded-lg px-2.5 py-1.5 text-cyan-200 font-bold cursor-pointer">
                    <input id="gm-egg-heal" type="checkbox" checked class="accent-cyan-500 w-4 h-4">
                    <span>💚 Thú nở từ trứng có Kỹ năng Hồi Máu (x2 Dame)</span>
                </label>
                <button onclick="adminCreateEgg()" class="w-full bg-cyan-600 hover:bg-cyan-500 py-2 rounded-lg font-extrabold text-white cursor-pointer">
                    🥚 Tạo / Gửi Trứng Ngay (Sẵn sàng nở)
                </button>
            </div>

            <!-- 3. BƠM TÀI NGUYÊN & VẬT PHẨM -->
            <div class="bg-zinc-800/90 border border-yellow-500/40 rounded-xl p-3 space-y-2">
                <div class="font-extrabold text-yellow-300">💰 3. Cấp Vàng, Kim Cương & Vật Phẩm</div>
                <div class="grid grid-cols-2 gap-1.5">
                    <input id="gm-add-coins" type="number" value="10000" placeholder="Số Vàng 🪙" class="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-yellow-300 font-bold">
                    <input id="gm-add-diamonds" type="number" value="500" placeholder="Số Kim Cương 💎" class="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-sky-300 font-bold">
                </div>
                <div class="grid grid-cols-2 gap-1.5">
                    <button onclick="adminGrantCurrency()" class="bg-amber-600 hover:bg-amber-500 py-2 rounded-lg font-extrabold text-white cursor-pointer">
                        🎁 Gửi Vàng & KC
                    </button>
                    <button onclick="adminGrantStonesAndItems()" class="bg-indigo-600 hover:bg-indigo-500 py-2 rounded-lg font-extrabold text-white cursor-pointer">
                        💎 +20 Đá & Vé Tập
                    </button>
                </div>
            </div>

            <!-- 4. ĐIỀU KHIỂN BOSS THẾ GIỚI -->
            <div class="bg-zinc-800/90 border border-red-500/50 rounded-xl p-3 space-y-2">
                <div class="font-extrabold text-red-400">👹 4. Triệu Hồi & Chỉnh Boss Thế Giới (Đồng bộ Server)</div>
                <div class="grid grid-cols-3 gap-1.5 text-xs">
                    <button onclick="adminForceSpawnWorldBoss()" class="bg-red-600 hover:bg-red-500 py-2 rounded-lg font-extrabold text-white cursor-pointer shadow">
                        🔥 Gọi Boss 3 Miền
                    </button>
                    <button onclick="adminCloseWorldBoss()" class="bg-zinc-700 hover:bg-zinc-600 py-2 rounded-lg font-extrabold text-zinc-200 cursor-pointer shadow">
                        🛑 Thu Hồi Boss
                    </button>
                    <button onclick="adminResetWorldBossHp()" class="bg-purple-600 hover:bg-purple-500 py-2 rounded-lg font-extrabold text-white cursor-pointer shadow">
                        ⚡ Hồi Máu Boss
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
        const forceHeal = !!document.getElementById('gm-pet-heal')?.checked;

        const newPet = buildAdminCustomPet(name, rarityIdx, level, elem, traitType, forceHeal);
        const currentUser = (localStorage.getItem('ar_cloud_user') || '').toLowerCase();
        const healNote = newPet.hasHealSkill ? ' + 💚 Hồi Máu x2 Dame' : '';

        if (!targetUser || targetUser.toLowerCase() === currentUser) {
            if (typeof team !== 'undefined' && Array.isArray(team)) {
                if (team.length < 3) team.push(newPet);
                else if (typeof farm !== 'undefined' && Array.isArray(farm)) farm.push(newPet);
            }
            if (typeof saveGameData === 'function') saveGameData();
            if (typeof updateTeamCount === 'function') updateTeamCount();
            if (typeof syncCurrentAccountToCloud === 'function') syncCurrentAccountToCloud();
            alert(`🎉 Admin đã tạo thành công [${newPet.rarity.badge} ${newPet.name} Lv.${newPet.level}${healNote}] vào kho của bạn!`);
        } else {
            await sendAdminGiftToRemotePlayer(targetUser, { type: 'pet', pet: newPet });
        }
    };

    window.adminCreateEgg = async function () {
        const targetUser = document.getElementById('gm-target-user')?.value.trim();
        const name = document.getElementById('gm-egg-name')?.value;
        const rarityIdx = parseInt(document.getElementById('gm-egg-rarity')?.value || '0', 10);
        const forceHeal = !!document.getElementById('gm-egg-heal')?.checked;
        const childPet = buildAdminCustomPet(name, rarityIdx, 1, 'DEFAULT', 'RANDOM', forceHeal);

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
            if (typeof eggs !== 'undefined' && Array.isArray(eggs)) eggs.push(newEgg);
            if (typeof saveGameData === 'function') saveGameData();
            if (typeof syncCurrentAccountToCloud === 'function') syncCurrentAccountToCloud();
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
            if (typeof playerCoins !== 'undefined') playerCoins += coins;
            if (typeof playerDiamonds !== 'undefined') playerDiamonds += diamonds;
            if (typeof saveGameData === 'function') saveGameData();
            if (typeof syncCurrentAccountToCloud === 'function') syncCurrentAccountToCloud();
            alert(`💰 Đã cộng +${coins.toLocaleString()}🪙 và +${diamonds.toLocaleString()}💎 cho tài khoản của bạn!`);
        } else {
            await sendAdminGiftToRemotePlayer(targetUser, { type: 'currency', coins, diamonds });
        }
    };

    window.adminGrantStonesAndItems = async function () {
        const targetUser = document.getElementById('gm-target-user')?.value.trim();
        const currentUser = (localStorage.getItem('ar_cloud_user') || '').toLowerCase();
        const pack = {
            food: 20,
            toy: 20,
            trainer: 20,
            stoneKim: 20,
            stoneMoc: 20,
            stoneThuy: 20,
            stoneHoa: 20,
            stoneTho: 20
        };

        if (!targetUser || targetUser.toLowerCase() === currentUser) {
            if (typeof inventory !== 'undefined') {
                for (const [k, qty] of Object.entries(pack)) {
                    inventory[k] = (inventory[k] || 0) + qty;
                }
                localStorage.setItem('ar_inventory', JSON.stringify(inventory));
                if (typeof saveGameData === 'function') saveGameData();
                if (typeof syncCurrentAccountToCloud === 'function') syncCurrentAccountToCloud();
                alert('💎 Đã cộng +20 Đá Ngũ Hành các loại, +20 Vé Tập Luyện, Thức Ăn & Đồ Chơi vào túi!');
            }
        } else {
            await sendAdminGiftToRemotePlayer(targetUser, { type: 'items', items: pack });
        }
    };

    // Triệu hồi khẩn cấp Boss Thế Giới 3 Miền và đồng bộ ngay với arena.js + Server
    window.adminForceSpawnWorldBoss = async function () {
        const adminUser = localStorage.getItem('ar_cloud_user');
        const adminPin = localStorage.getItem('ar_cloud_pin');
        if (!adminUser || !adminPin) {
            alert('❌ Bạn chưa đăng nhập tài khoản Đám Mây của GM (thiếu username/pin)!');
            return;
        }

        const lv = (typeof bossLevel !== 'undefined') ? bossLevel : 1;
        const maxHp = 35000 + (lv - 1) * 5000;
        const regions = [
            { regionKey: 'bac', active: 1, bossName: 'Hỏa Kỳ Lân Bắc Cực', hp: maxHp, maxHp: maxHp },
            { regionKey: 'trung', active: 1, bossName: 'Cửu Đầu Xà Hydra', hp: maxHp, maxHp: maxHp },
            { regionKey: 'nam', active: 1, bossName: 'Địa Ngục Khuyển Cerberus', hp: maxHp, maxHp: maxHp }
        ];

        try {
            const res = await fetch('/api/world-boss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminUser, adminPin, regions })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                alert('❌ Lỗi triệu hồi Boss trên Server: ' + (data.error || res.statusText));
                return;
            }

            window.serverWorldBossActive = true;
            if (typeof wbState !== 'undefined') {
                wbState.maxHp = maxHp;
                wbState.hp = maxHp;
            }
            if (typeof fetchWorldBossServerState === 'function') {
                await fetchWorldBossServerState(true);
            } else if (typeof renderWorldBossMarkersOnMap === 'function') {
                renderWorldBossMarkersOnMap();
            }
            if (typeof window.sendWorldChat === 'function') {
                window.sendWorldChat('🚨 [SỰ KIỆN ADMIN] Boss Thế Giới 3 Miền vừa được triệu hồi khẩn cấp trên toàn server!', true);
            }
            alert('🔥 Đã kích hoạt và đồng bộ Boss Thế Giới 3 Miền lên toàn Server thành công!');
        } catch (err) {
            alert('❌ Lỗi kết nối máy chủ: ' + err.message);
        }
    };

    // Thu hồi / Đóng sự kiện Boss Thế Giới 3 Miền trên Cloudflare Server
    window.adminCloseWorldBoss = async function () {
        const adminUser = localStorage.getItem('ar_cloud_user');
        const adminPin = localStorage.getItem('ar_cloud_pin');
        if (!adminUser || !adminPin) {
            alert('❌ Bạn chưa đăng nhập tài khoản Đám Mây của GM!');
            return;
        }
        if (!confirm('🛑 Bạn có chắc muốn thu hồi / đóng Boss Thế Giới 3 Miền trên toàn server?')) return;

        const regions = [
            { regionKey: 'bac', active: 0, bossName: 'Hỏa Kỳ Lân Bắc Cực', hp: 0, maxHp: 35000 },
            { regionKey: 'trung', active: 0, bossName: 'Cửu Đầu Xà Hydra', hp: 0, maxHp: 35000 },
            { regionKey: 'nam', active: 0, bossName: 'Địa Ngục Khuyển Cerberus', hp: 0, maxHp: 35000 }
        ];

        try {
            const res = await fetch('/api/world-boss', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminUser, adminPin, regions })
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                alert('❌ Lỗi thu hồi Boss trên Server: ' + (data.error || res.statusText));
                return;
            }

            window.serverWorldBossActive = false;
            if (typeof fetchWorldBossServerState === 'function') {
                await fetchWorldBossServerState(true);
            } else if (typeof renderWorldBossMarkersOnMap === 'function') {
                renderWorldBossMarkersOnMap();
            }
            if (typeof window.sendWorldChat === 'function') {
                window.sendWorldChat('🛑 [SỰ KIỆN ADMIN] Sự kiện Boss Thế Giới đã kết thúc. Cảm ơn các Thợ Săn đã tham chiến!', true);
            }
            alert('🛑 Đã thu hồi Boss Thế Giới 3 Miền trên toàn Server thành công!');
        } catch (err) {
            alert('❌ Lỗi kết nối máy chủ: ' + err.message);
        }
    };

    // Hồi đầy máu Boss Thế Giới và đồng bộ Server
    window.adminResetWorldBossHp = async function () {
        const adminUser = localStorage.getItem('ar_cloud_user');
        const adminPin = localStorage.getItem('ar_cloud_pin');
        const lv = (typeof bossLevel !== 'undefined') ? bossLevel : 1;
        const maxHp = 35000 + (lv - 1) * 5000;
        if (typeof wbState !== 'undefined') {
            wbState.maxHp = maxHp;
            wbState.hp = maxHp;
        }

        if (adminUser && adminPin) {
            try {
                await fetch('/api/world-boss', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        adminUser,
                        adminPin,
                        regions: [
                            { regionKey: 'bac', active: 1, bossName: 'Hỏa Kỳ Lân Bắc Cực', hp: maxHp, maxHp: maxHp },
                            { regionKey: 'trung', active: 1, bossName: 'Cửu Đầu Xà Hydra', hp: maxHp, maxHp: maxHp },
                            { regionKey: 'nam', active: 1, bossName: 'Địa Ngục Khuyển Cerberus', hp: maxHp, maxHp: maxHp }
                        ]
                    })
                });
                if (typeof fetchWorldBossServerState === 'function') {
                    await fetchWorldBossServerState(true);
                }
            } catch (e) {}
        }
        alert(`⚡ Đã hồi đầy ${maxHp.toLocaleString()} HP cho Boss Thế Giới (đã đồng bộ Server)!`);
    };

    // Tự động bổ sung huy hiệu hiển thị Kỹ năng Hồi Máu trong hồ sơ thú ở Đội Hình (openPetDetail)
    const _origOpenPetDetail = window.openPetDetail;
    if (typeof _origOpenPetDetail === 'function') {
        window.openPetDetail = function (index) {
            _origOpenPetDetail.apply(this, arguments);
            const pet = (typeof team !== 'undefined') ? team[index] : null;
            if (!pet) return;
            if (pet.element === 'Moc' || pet.element === 'Thuy' || pet.hasHealSkill) {
                const badgeContainer = document.querySelector('#modal-content .bg-amber-950\/70');
                if (badgeContainer && !document.getElementById('pet-detail-heal-badge')) {
                    badgeContainer.insertAdjacentHTML(
                        'afterend',
                        `<div id="pet-detail-heal-badge" class="mt-1 inline-flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-400/50 px-3 py-0.5 rounded-full text-[11px] font-extrabold text-emerald-300">💚 Kỹ năng: Hồi Phục Linh Hồn (Hồi x2 Dame)</div>`
                    );
                }
            }
        };
    }
})();
