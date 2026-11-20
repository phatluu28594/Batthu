// ============================================================================
// BẮT THÚ VƯƠNG - MODULE TÚI CHỨA ĐỒ NHÀ CHÍNH LƯỚI 5x10 (bag.js)
// Hiển thị toàn bộ vật phẩm & trứng đang sở hữu (90% màn hình), hỗ trợ dùng trực tiếp
// ============================================================================

(function () {
    const BAG_ITEM_DEFS = [
        {
            key: 'purpleSealChest',
            name: 'Rương Ấn Ký Tím',
            icon: '🛡️',
            rarity: 'border-purple-400 bg-purple-950/45',
            desc: 'Mở ra và chọn 1 linh thú để nâng thẳng 3 Bảo Vật lên Bậc 2 (Cấp 20) +200 HP!',
            actionType: 'use_purple_chest',
            actionLabel: '🛡️ Mở Rương Tím'
        },
        {
            key: 'rainbowAuraScroll',
            name: 'Hào Quang Ngũ Sắc',
            icon: '🌈',
            rarity: 'border-fuchsia-400 bg-fuchsia-950/45',
            desc: 'Truyền Hào Quang Ngũ Sắc Huyền Thoại cho 1 linh thú (+35 ATK, +150 Max HP & vòng sáng cầu vồng).',
            actionType: 'use_rainbow_aura',
            actionLabel: '🌈 Gắn Hào Quang'
        },
        {
            key: 'mythicShards',
            name: 'Mảnh Thú Thần Thoại',
            icon: '🧩',
            rarity: 'border-pink-400 bg-pink-950/40',
            desc: 'Tích lũy đủ 20 Mảnh Thần để triệu hồi ngẫu nhiên 1 Linh Thú Thần Thánh (🟣 Tím)!',
            actionType: 'combine_mythic_shards',
            actionLabel: '✨ Ghép Thú Thần (20)'
        },
        {
            key: 'gearShardChest',
            name: 'Rương Mảnh Trang Bị',
            icon: '🧰',
            rarity: 'border-indigo-400 bg-indigo-950/40',
            desc: 'Mở nhận ngẫu nhiên 2-4 viên Đá Ngũ Hành và 300-700 Vàng cường hóa.',
            actionType: 'use_shard_chest',
            actionLabel: '🧰 Mở Rương Ngay'
        },
        {
            key: 'luckyTicket',
            name: 'Vé Quay May Mắn',
            icon: '🎟️',
            rarity: 'border-rose-400 bg-rose-950/40',
            desc: 'Dùng để quay thưởng tại Vòng Quay May Mắn (nhận Kim Cương, Trứng Thần, Rương Tím...).',
            actionType: 'goto_gacha',
            actionLabel: '🎡 Tới Vòng Quay'
        },
        {
            key: 'trainer',
            name: 'Vé Tập Luyện (1h)',
            icon: '🎫',
            rarity: 'border-amber-400 bg-amber-950/35',
            desc: 'Đưa linh thú vào Bãi Tập Trang Trại trong 1 tiếng để tăng +1 Cấp độ.',
            actionType: 'goto_training',
            actionLabel: '🪵 Vào Bãi Tập'
        },
        {
            key: 'food',
            name: 'Thức Ăn Linh Thú',
            icon: '🍖',
            rarity: 'border-emerald-500/70 bg-emerald-950/35',
            desc: 'Cho linh thú ăn để hồi +30% Độ no và +25 HP ngay lập tức.',
            actionType: 'use_food',
            actionLabel: '🍖 Cho Thú Ăn'
        },
        {
            key: 'toy',
            name: 'Đồ Chơi Vui Nhộn',
            icon: '🎾',
            rarity: 'border-yellow-400/70 bg-yellow-950/30',
            desc: 'Chơi đùa cùng linh thú để tăng +35% Độ hạnh phúc.',
            actionType: 'use_toy',
            actionLabel: '🎾 Chơi Với Thú'
        },
        {
            key: 'stoneKim',
            name: 'Đá Ngũ Hành - Kim',
            icon: '⚔️',
            rarity: 'border-yellow-200/70 bg-yellow-950/30',
            desc: 'Nguyên liệu Tiến Hóa & Đột Phá Bảo Vật hệ Kim.',
            actionType: 'goto_evolve',
            actionLabel: '💎 Đài Tiến Hóa'
        },
        {
            key: 'stoneMoc',
            name: 'Đá Ngũ Hành - Mộc',
            icon: '🌿',
            rarity: 'border-emerald-400/70 bg-emerald-950/30',
            desc: 'Nguyên liệu Tiến Hóa & Đột Phá Bảo Vật hệ Mộc.',
            actionType: 'goto_evolve',
            actionLabel: '💎 Đài Tiến Hóa'
        },
        {
            key: 'stoneThuy',
            name: 'Đá Ngũ Hành - Thủy',
            icon: '💧',
            rarity: 'border-sky-400/70 bg-sky-950/30',
            desc: 'Nguyên liệu Tiến Hóa & Đột Phá Bảo Vật hệ Thủy.',
            actionType: 'goto_evolve',
            actionLabel: '💎 Đài Tiến Hóa'
        },
        {
            key: 'stoneHoa',
            name: 'Đá Ngũ Hành - Hỏa',
            icon: '🔥',
            rarity: 'border-red-400/70 bg-red-950/30',
            desc: 'Nguyên liệu Tiến Hóa & Đột Phá Bảo Vật hệ Hỏa.',
            actionType: 'goto_evolve',
            actionLabel: '💎 Đài Tiến Hóa'
        },
        {
            key: 'stoneTho',
            name: 'Đá Ngũ Hành - Thổ',
            icon: '🪨',
            rarity: 'border-amber-600/70 bg-amber-950/30',
            desc: 'Nguyên liệu Tiến Hóa & Đột Phá Bảo Vật hệ Thổ.',
            actionType: 'goto_evolve',
            actionLabel: '💎 Đài Tiến Hóa'
        }
    ];

    let selectedBagSlotIdx = 0;

    function getLiveInventory() {
        if (typeof inventory !== 'undefined' && inventory) return inventory;
        if (window.inventory) return window.inventory;
        window.inventory = {};
        return window.inventory;
    }

    function persistBagChange() {
        const inv = getLiveInventory();
        try {
            localStorage.setItem('ar_inventory', JSON.stringify(inv));
        } catch (e) {}
        if (typeof saveGameData === 'function') saveGameData();
        if (typeof updateTeamCount === 'function') updateTeamCount();
        if (typeof silentCloudSync === 'function') silentCloudSync(true);
    }

    // Gom toàn bộ vật phẩm đang có số lượng > 0 + Trứng vào lưới 5x10 (50 ô)
    window.getBag5x10Slots = function () {
        const inv = getLiveInventory();
        const slots = [];
        const knownKeys = new Set();

        BAG_ITEM_DEFS.forEach(meta => {
            knownKeys.add(meta.key);
            const qty = Math.floor(Number(inv[meta.key]) || 0);
            if (qty > 0) {
                slots.push({
                    kind: 'item',
                    key: meta.key,
                    name: meta.name,
                    icon: meta.icon,
                    qty,
                    rarity: meta.rarity,
                    desc: meta.desc,
                    actionType: meta.actionType,
                    actionLabel: meta.actionLabel
                });
            }
        });

        // Tự động hiển thị bất kỳ vật phẩm mới/lạ nào khác nếu có trong inventory > 0
        Object.keys(inv).forEach(k => {
            if (knownKeys.has(k)) return;
            const qty = Math.floor(Number(inv[k]) || 0);
            if (qty > 0) {
                slots.push({
                    kind: 'item',
                    key: k,
                    name: k,
                    icon: '📦',
                    qty,
                    rarity: 'border-zinc-500 bg-zinc-900',
                    desc: 'Vật phẩm đặc biệt trong kho.',
                    actionType: 'none',
                    actionLabel: ''
                });
            }
        });

        // Hiển thị tất cả Trứng đang sở hữu trong túi
        const eggList = (typeof eggs !== 'undefined' && Array.isArray(eggs)) ? eggs : (window.eggs || []);
        eggList.forEach((egg, eIdx) => {
            const isReady = (egg.steps || 0) >= (egg.requiredSteps || 80);
            slots.push({
                kind: 'egg',
                eggIndex: eIdx,
                name: egg.name || 'Trứng Linh Thú',
                icon: '🥚',
                qty: 1,
                rarity: egg.rarity?.bg || 'border-emerald-500/70 bg-emerald-950/35',
                desc: isReady
                    ? `✨ Trứng đã đủ bước chân (${egg.steps}/${egg.requiredSteps}) — Sẵn sàng ấp nở ngay!`
                    : `Tiến độ ấp: ${egg.steps || 0}/${egg.requiredSteps || 80} bước chân.`,
                actionType: isReady ? 'hatch_egg_now' : 'goto_egg',
                actionLabel: isReady ? '🐣 Ấp Nở Ngay!' : '🥚 Xem Lồng Ấp'
            });
        });

        while (slots.length < 50) {
            slots.push(null);
        }
        return slots.slice(0, 50);
    };

    window.openHomeStorageBagModal = function (selectIdx = selectedBagSlotIdx) {
        selectedBagSlotIdx = Math.max(0, Math.min(49, Number(selectIdx) || 0));
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;

        // Kích thước Túi Đồ 90% chiều rộng & 90% chiều cao màn hình
        content.className = 'bg-zinc-900/95 border-2 border-amber-400/75 w-[90vw] max-w-[90vw] h-[90vh] h-[90dvh] max-h-[90dvh] rounded-3xl p-3.5 sm:p-5 flex flex-col overflow-hidden relative shadow-2xl';
        modal.classList.remove('hidden');

        const slots = window.getBag5x10Slots();
        const usedCount = slots.filter(s => s !== null).length;
        const activeItem = slots[selectedBagSlotIdx];

        const gridHtml = slots.map((slot, idx) => {
            const isSelected = idx === selectedBagSlotIdx;
            const selRing = isSelected ? 'ring-2 ring-yellow-300 border-yellow-300 scale-[1.03] z-10' : '';
            if (!slot) {
                return `
                <div onclick="openHomeStorageBagModal(${idx})"
                    class="aspect-square rounded-xl border border-zinc-800/90 bg-zinc-950/75 hover:border-zinc-700 flex items-center justify-center cursor-pointer transition ${selRing}">
                    <span class="text-[10px] text-zinc-700 font-bold">${idx + 1}</span>
                </div>`;
            }
            return `
            <div onclick="openHomeStorageBagModal(${idx})"
                class="aspect-square rounded-xl border ${slot.rarity} flex flex-col items-center justify-center relative cursor-pointer transition p-1 shadow-inner ${selRing}">
                <span class="text-2xl sm:text-3xl leading-none">${slot.icon}</span>
                <span class="mt-1 text-[9px] sm:text-[10px] font-bold text-zinc-200 truncate w-full text-center px-0.5">${slot.name}</span>
                <span class="absolute top-1 right-1.5 bg-black/85 text-amber-300 text-[10px] font-black px-1.5 py-0.2 rounded-md border border-amber-400/40">
                    x${slot.qty}
                </span>
            </div>`;
        }).join('');

        let detailBarHtml = '';
        if (activeItem) {
            let btnHtml = '';
            if (activeItem.actionType && activeItem.actionType !== 'none' && activeItem.actionLabel) {
                const disabledShard = activeItem.actionType === 'combine_mythic_shards' && activeItem.qty < 20;
                btnHtml = `
                <button onclick="executeBagSlotAction(${selectedBagSlotIdx})" ${disabledShard ? 'disabled' : ''}
                    class="${disabledShard
                        ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 via-orange-500 to-pink-600 hover:brightness-110 text-white cursor-pointer shadow-lg'} font-black text-xs px-4 py-2.5 rounded-xl shrink-0 transition">
                    ${disabledShard ? `Cần 20 Mảnh (${activeItem.qty}/20)` : activeItem.actionLabel}
                </button>`;
            }

            detailBarHtml = `
            <div class="bg-zinc-950/95 border border-amber-400/50 rounded-2xl p-3 flex items-center justify-between gap-3 shrink-0 mt-2.5">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-12 h-12 rounded-xl bg-zinc-900 border border-white/15 flex items-center justify-center text-3xl shrink-0">
                        ${activeItem.icon}
                    </div>
                    <div class="min-w-0">
                        <div class="text-xs sm:text-sm font-black text-yellow-300 truncate">
                            ${activeItem.name} <span class="text-emerald-400">(Đang có: ${activeItem.qty})</span>
                        </div>
                        <div class="text-[11px] text-zinc-300 line-clamp-2">${activeItem.desc}</div>
                    </div>
                </div>
                ${btnHtml}
            </div>`;
        } else {
            detailBarHtml = `
            <div class="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-3 text-center text-xs text-zinc-400 shrink-0 mt-2.5">
                Ô chứa #${selectedBagSlotIdx + 1} đang trống • Chạm vào vật phẩm để xem chi tiết hoặc sử dụng.
            </div>`;
        }

        const curCoins = (typeof playerCoins !== 'undefined' ? playerCoins : window.playerCoins) || 0;
        const curDiamonds = (typeof playerDiamonds !== 'undefined' ? playerDiamonds : window.playerDiamonds) || 0;

        content.innerHTML = `
        <div class="flex items-center justify-between pb-2.5 mb-2.5 border-b border-amber-500/40 shrink-0">
            <div>
                <h3 class="font-black text-base sm:text-lg text-amber-300">🎒 TÚI CHỨA ĐỒ NHÀ CHÍNH (5x10)</h3>
                <div class="text-[11px] text-zinc-300">
                    Đang chứa: <b class="text-emerald-400">${usedCount}/50</b> ô • Vàng: <b class="text-yellow-400">${curCoins.toLocaleString()}🪙</b> • KC: <b class="text-cyan-300">${curDiamonds.toLocaleString()}💎</b>
                </div>
            </div>
            <button onclick="closeModal()" class="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3.5 py-1.5 rounded-full font-black text-sm cursor-pointer border border-zinc-600">✕ Đóng</button>
        </div>

        <!-- LƯỚI TÚI ĐỒ 5 CỘT x 10 HÀNG (50 Ô) -->
        <div class="flex-1 overflow-y-auto pr-1">
            <div class="grid grid-cols-5 gap-2 sm:gap-2.5">
                ${gridHtml}
            </div>
        </div>

        ${detailBarHtml}`;
    };

    // Giao diện chọn linh thú ngay trong Túi 5x10 để dùng Rương Tím / Hào Quang / Thức Ăn / Đồ Chơi
    function openBagPetTargetPicker(itemKey, titleText, subtitleText, onPickPet) {
        const teamList = (typeof team !== 'undefined' && Array.isArray(team)) ? team : [];
        const farmList = (typeof farm !== 'undefined' && Array.isArray(farm)) ? farm : [];
        const allPets = [
            ...teamList.map((p, i) => ({ pet: p, loc: '🎒 Đội', idx: i })),
            ...farmList.map((p, i) => ({ pet: p, loc: '🏡 Trại', idx: i }))
        ];

        if (allPets.length === 0) {
            alert('⚠️ Bạn chưa có linh thú nào trong Đội hình hay Trang trại!');
            return;
        }

        const content = document.getElementById('modal-content');
        if (!content) return;

        window._bagPendingPetAction = onPickPet;

        const listHtml = allPets.map((entry, flatIdx) => {
            const p = entry.pet;
            const spriteHtml = typeof getPetSpriteHtml === 'function'
                ? getPetSpriteHtml(p, 'idle', 46)
                : `<span class="text-2xl">${p.emoji || '🐾'}</span>`;
            const auraTag = p.hasAura ? `<span class="text-fuchsia-300 text-[10px] font-black ml-1">🌈 Có Hào Quang</span>` : '';
            return `
            <div onclick="confirmBagPetTarget(${flatIdx})"
                class="bg-zinc-800/95 hover:bg-zinc-700 border ${p.rarity?.bg || 'border-zinc-700'} p-3 rounded-2xl flex items-center justify-between cursor-pointer transition">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="bg-zinc-950 p-1.5 rounded-xl shrink-0">${spriteHtml}</div>
                    <div class="min-w-0">
                        <div class="text-xs sm:text-sm font-black text-yellow-300 truncate">
                            ${p.name} <span class="${p.rarity?.color || ''}">${p.rarity?.badge || ''}</span> <span class="text-white">Lv.${Math.floor(p.level || 1)}</span>${auraTag}
                        </div>
                        <div class="text-[11px] text-zinc-300">
                            ${entry.loc} • HP: ${Math.floor(p.hp)}/${p.maxHp} • Ấn ký Bậc ${p.gearTier || 0}
                        </div>
                    </div>
                </div>
                <span class="bg-amber-500 text-black font-black text-xs px-3 py-1.5 rounded-xl shrink-0">Chọn ›</span>
            </div>`;
        }).join('');

        window._bagSelectablePets = allPets.map(e => e.pet);

        content.innerHTML = `
        <div class="flex items-center justify-between pb-2.5 mb-3 border-b border-amber-500/40 shrink-0">
            <div>
                <h3 class="font-black text-base text-amber-300">${titleText}</h3>
                <div class="text-xs text-zinc-300">${subtitleText}</div>
            </div>
            <button onclick="openHomeStorageBagModal()" class="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3.5 py-1.5 rounded-full font-bold text-xs cursor-pointer border border-zinc-600">‹ Quay Lại Túi</button>
        </div>
        <div class="flex-1 overflow-y-auto space-y-2 pr-1">
            ${listHtml}
        </div>`;
    }

    window.confirmBagPetTarget = function (flatIdx) {
        const pet = window._bagSelectablePets?.[flatIdx];
        const fn = window._bagPendingPetAction;
        if (pet && typeof fn === 'function') {
            fn(pet);
        }
    };

    window.executeBagSlotAction = function (slotIdx) {
        const slots = window.getBag5x10Slots();
        const slot = slots[slotIdx];
        if (!slot) return;
        const inv = getLiveInventory();

        if (slot.kind === 'egg') {
            if (slot.actionType === 'hatch_egg_now' && typeof hatchEgg === 'function') {
                hatchEgg(slot.eggIndex);
                openHomeStorageBagModal(0);
            } else {
                if (typeof closeModal === 'function') closeModal();
                if (typeof openEggIncubatorMenu === 'function') openEggIncubatorMenu();
            }
            return;
        }

        const type = slot.actionType;

        if (type === 'use_shard_chest') {
            const count = Number(inv.gearShardChest) || 0;
            if (count <= 0) return;
            inv.gearShardChest = count - 1;

            const stoneKeys = ['stoneKim', 'stoneMoc', 'stoneThuy', 'stoneHoa', 'stoneTho'];
            const stoneNames = { stoneKim: 'Đá Kim', stoneMoc: 'Đá Mộc', stoneThuy: 'Đá Thủy', stoneHoa: 'Đá Hỏa', stoneTho: 'Đá Thổ' };
            const pickedKey = stoneKeys[Math.floor(Math.random() * stoneKeys.length)];
            const stoneQty = 2 + Math.floor(Math.random() * 3);
            const bonusGold = 300 + Math.floor(Math.random() * 401);

            inv[pickedKey] = (inv[pickedKey] || 0) + stoneQty;
            if (typeof playerCoins !== 'undefined') playerCoins += bonusGold;
            window.playerCoins = (typeof playerCoins !== 'undefined' ? playerCoins : (window.playerCoins || 0));

            persistBagChange();
            alert(`🧰 MỞ RƯƠNG MẢNH TRANG BỊ THÀNH CÔNG!

• +${stoneQty} viên ${stoneNames[pickedKey]}
• +${bonusGold}🪙 Vàng!`);
            openHomeStorageBagModal(slotIdx);
            return;
        }

        if (type === 'use_purple_chest') {
            if ((Number(inv.purpleSealChest) || 0) <= 0) return;
            openBagPetTargetPicker(
                'purpleSealChest',
                '🛡️ MỞ RƯƠNG ẤN KÝ TÍM',
                'Chọn 1 linh thú để nâng thẳng 3 Bảo Vật lên Bậc 2 (Cấp 20) +200 Max HP:',
                (pet) => {
                    inv.purpleSealChest = Math.max(0, (Number(inv.purpleSealChest) || 0) - 1);
                    if (typeof ensurePetGears === 'function') ensurePetGears(pet);
                    pet.gearTier = Math.max(pet.gearTier || 0, 2);
                    pet.gears = {
                        claw: Math.max(pet.gears?.claw || 0, 20),
                        armor: Math.max(pet.gears?.armor || 0, 20),
                        orb: Math.max(pet.gears?.orb || 0, 20)
                    };
                    pet.maxHp = (pet.maxHp || 150) + 200;
                    pet.hp = pet.maxHp + (typeof getPetGearBonus === 'function' ? getPetGearBonus(pet).maxHp : 0);

                    persistBagChange();
                    alert(`🛡️ MỞ RƯƠNG ẤN KÝ TÍM THÀNH CÔNG!
Linh thú [${pet.name}] đã nhận trọn bộ Ấn Ký Tím Bậc 2 (Cấp 20) và +200 Max HP!`);
                    openHomeStorageBagModal(0);
                }
            );
            return;
        }

        if (type === 'use_rainbow_aura') {
            if ((Number(inv.rainbowAuraScroll) || 0) <= 0) return;
            openBagPetTargetPicker(
                'rainbowAuraScroll',
                '🌈 TRUYỀN HÀO QUANG NGŨ SẮC',
                'Chọn 1 linh thú để kích hoạt Hào Quang Cầu Vồng (+35 ATK, +150 Max HP):',
                (pet) => {
                    if (pet.hasAura) {
                        alert(`⚠️ Linh thú [${pet.name}] đã sở hữu Hào Quang Ngũ Sắc rồi! Hãy chọn linh thú khác.`);
                        return;
                    }
                    inv.rainbowAuraScroll = Math.max(0, (Number(inv.rainbowAuraScroll) || 0) - 1);
                    pet.hasAura = true;
                    pet.auraName = 'Ngũ Sắc Huyền Bí';
                    pet.atk = (pet.atk || 40) + 35;
                    pet.maxHp = (pet.maxHp || 150) + 150;
                    pet.hp = (pet.hp || pet.maxHp) + 150;

                    persistBagChange();
                    alert(`🌈 KÍCH HOẠT HÀO QUANG THÀNH CÔNG!
Linh thú [${pet.name}] tỏa sáng Hào Quang Ngũ Sắc (+35 ATK, +150 Max HP)!`);
                    openHomeStorageBagModal(0);
                }
            );
            return;
        }

        if (type === 'combine_mythic_shards') {
            const shards = Number(inv.mythicShards) || 0;
            if (shards < 20) {
                alert(`⚠️ Cần đủ 20 🧩 Mảnh Thú Thần Thoại để ghép (Hiện có: ${shards}/20)!`);
                return;
            }
            if (typeof getTotalOwnedPetCount === 'function' && typeof maxPetCapacity !== 'undefined' && getTotalOwnedPetCount() >= maxPetCapacity) {
                alert(`⚠️ Kho linh thú đã đầy (${getTotalOwnedPetCount()}/${maxPetCapacity})! Hãy mở rộng chỗ trước khi ghép.`);
                return;
            }

            inv.mythicShards = shards - 20;
            const pool = (typeof allMonsters !== 'undefined' && Array.isArray(allMonsters) && allMonsters.length > 0)
                ? allMonsters
                : [{ id: 304, name: 'Gấu Trúc', emoji: '🐼', element: 'Moc', hp: 205, maxHp: 205, atk: 70, speed: 60 }];
            const base = pool[Math.floor(Math.random() * pool.length)];
            const mythicRarity = (typeof rarities !== 'undefined' && rarities[4])
                ? rarities[4]
                : { name: 'Thần Thánh', color: 'text-purple-400', bg: 'border-purple-500', badge: '🟣 Tím', statMultiplier: 2.5 };
            const mult = mythicRarity.statMultiplier || 2.5;

            const rawPet = {
                ...base,
                id: 'mythic_shard_' + Date.now(),
                level: 1,
                hearts: 3,
                rarity: mythicRarity,
                hp: Math.floor(base.maxHp * mult),
                maxHp: Math.floor(base.maxHp * mult),
                atk: Math.floor(base.atk * mult),
                speed: Math.floor(base.speed * 1.4)
            };
            const summoned = typeof sanitizePetsData === 'function' ? sanitizePetsData([rawPet])[0] : rawPet;
            if (typeof team !== 'undefined' && team.length < 3) team.push(summoned);
            else if (typeof farm !== 'undefined') farm.push(summoned);

            persistBagChange();
            if (typeof window.sendWorldChat === 'function') {
                const hunter = localStorage.getItem('ar_cloud_user') || 'Một Thợ Săn';
                window.sendWorldChat(`🌟 CHẤN ĐỘNG! [${hunter}] vừa ghép 20 Mảnh Thần triệu hồi thành công [${summoned.name}] 🟣 Thần Thánh!`, true);
            }
            alert(`🎉 GHÉP MẢNH THẦN THÀNH CÔNG!
Bạn đã triệu hồi được Linh Thú Thần Thánh: ${summoned.rarity.badge} ${summoned.name}!`);
            openHomeStorageBagModal(0);
            return;
        }

        if (type === 'use_food') {
            if ((Number(inv.food) || 0) <= 0) return;
            openBagPetTargetPicker('food', '🍖 CHO LINH THÚ ĂN', 'Chọn 1 linh thú để hồi +30% Độ no và +25 HP:', (pet) => {
                inv.food = Math.max(0, (Number(inv.food) || 0) - 1);
                if (typeof ensurePetGears === 'function') ensurePetGears(pet);
                const fullHp = pet.maxHp + (typeof getPetGearBonus === 'function' ? getPetGearBonus(pet).maxHp : 0);
                pet.hunger = Math.min(100, (pet.hunger ?? 70) + 30);
                pet.hp = Math.min(fullHp, (pet.hp || 0) + 25);
                if (typeof addQuestProgress === 'function') addQuestProgress(3, 1);

                persistBagChange();
                alert(`🍖 Đã cho [${pet.name}] ăn ngon lành (+30% No, +25 HP)!`);
                openHomeStorageBagModal(0);
            });
            return;
        }

        if (type === 'use_toy') {
            if ((Number(inv.toy) || 0) <= 0) return;
            openBagPetTargetPicker('toy', '🎾 CHƠI CÙNG LINH THÚ', 'Chọn 1 linh thú để tăng +35% Độ hạnh phúc:', (pet) => {
                inv.toy = Math.max(0, (Number(inv.toy) || 0) - 1);
                pet.happiness = Math.min(100, (pet.happiness ?? 70) + 35);

                persistBagChange();
                alert(`🎾 [${pet.name}] rất vui vẻ (+35% Hạnh phúc)!`);
                openHomeStorageBagModal(0);
            });
            return;
        }

        if (type === 'goto_gacha') {
            if (typeof closeModal === 'function') closeModal();
            if (typeof openLuckyWheelModal === 'function') openLuckyWheelModal();
            return;
        }

        if (type === 'goto_training') {
            if (typeof closeModal === 'function') closeModal();
            if (typeof openTrainingArenaModal === 'function') openTrainingArenaModal();
            return;
        }

        if (type === 'goto_evolve') {
            if (typeof closeModal === 'function') closeModal();
            if (typeof openHospitalActionModal === 'function') openHospitalActionModal('evolve');
            return;
        }
    };
})();
