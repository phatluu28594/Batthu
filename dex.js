// ============================================================================
// BẮT THÚ VƯƠNG - MODULE BÁCH KHOA LINH THÚ & BUFF BỘ SƯU TẬP (dex.js)
// Tự động ghi nhận các loài thú & bậc phẩm chất đã sở hữu, cộng buff vĩnh viễn
// ============================================================================

(function () {
    const DEX_STORAGE_KEY = 'ar_monster_dex';

    const RARITY_ORDER = ['Thường', 'Hiếm', 'Cực Hiếm', 'Huyền Thoại', 'Thần Thánh'];

    function loadDexData() {
        try {
            const raw = localStorage.getItem(DEX_STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function saveDexData(dex) {
        try {
            localStorage.setItem(DEX_STORAGE_KEY, JSON.stringify(dex));
        } catch (e) {}
    }

    function getRarityRank(rarityName) {
        const idx = RARITY_ORDER.indexOf(rarityName);
        return idx >= 0 ? idx : 0;
    }

    // Quét toàn bộ thú người chơi đang sở hữu để tự động mở khóa Bách Khoa
    window.syncMonsterDexFromOwned = function () {
        const dex = loadDexData();
        let changed = false;

        const pools = [
            ...(typeof team !== 'undefined' && Array.isArray(team) ? team : []),
            ...(typeof farm !== 'undefined' && Array.isArray(farm) ? farm : []),
            ...(typeof restingPets !== 'undefined' && Array.isArray(restingPets) ? restingPets : []),
            ...(typeof trainingPoles !== 'undefined' && Array.isArray(trainingPoles) ? trainingPoles : [])
        ];

        pools.forEach(p => {
            if (!p || !p.name) return;
            const baseName = String(p.name).replace(/^F1_/i, '').trim();
            const rRank = getRarityRank(p.rarity?.name || 'Thường');

            if (!dex[baseName]) {
                dex[baseName] = { unlocked: true, maxRarityIdx: rRank, firstAt: Date.now() };
                changed = true;
            } else {
                if (!dex[baseName].unlocked) {
                    dex[baseName].unlocked = true;
                    changed = true;
                }
                if (rRank > (dex[baseName].maxRarityIdx ?? 0)) {
                    dex[baseName].maxRarityIdx = rRank;
                    changed = true;
                }
            }
        });

        // Quét thêm thú F1 trong trứng nếu có
        if (typeof eggs !== 'undefined' && Array.isArray(eggs)) {
            eggs.forEach(e => {
                const p = e?.petData;
                if (!p || !p.name) return;
                const baseName = String(p.name).replace(/^F1_/i, '').trim();
                const rRank = getRarityRank(p.rarity?.name || 'Thường');
                if (!dex[baseName]) {
                    dex[baseName] = { unlocked: true, maxRarityIdx: rRank, firstAt: Date.now() };
                    changed = true;
                } else if (rRank > (dex[baseName].maxRarityIdx ?? 0)) {
                    dex[baseName].maxRarityIdx = rRank;
                    changed = true;
                }
            });
        }

        if (changed) saveDexData(dex);
        return dex;
    };

    // Tính tổng Buff vĩnh viễn từ Bách Khoa Linh Thú
    window.getMonsterDexBuffs = function () {
        const dex = window.syncMonsterDexFromOwned();
        const list = (typeof allMonsters !== 'undefined' && Array.isArray(allMonsters)) ? allMonsters : [];

        const byElem = { Kim: [], Moc: [], Thuy: [], Hoa: [], Tho: [] };
        let unlockedCount = 0;

        list.forEach(m => {
            if (byElem[m.element]) byElem[m.element].push(m.name);
            if (dex[m.name]?.unlocked) unlockedCount++;
        });

        const isElemComplete = (el) => byElem[el].length > 0 && byElem[el].every(name => dex[name]?.unlocked);

        const elemSets = {
            Hoa:  { complete: isElemComplete('Hoa'),  label: '🔥 Đủ Bộ Hệ Hỏa (+6% ATK)',          atkPct: 6, hpPct: 0, speedPct: 0, critBonus: 0, blockBonus: 0, dodgeBonus: 0 },
            Thuy: { complete: isElemComplete('Thuy'), label: '💧 Đủ Bộ Hệ Thủy (+8% HP, +3% Né)',  atkPct: 0, hpPct: 8, speedPct: 0, critBonus: 0, blockBonus: 0, dodgeBonus: 3 },
            Moc:  { complete: isElemComplete('Moc'),  label: '🌿 Đủ Bộ Hệ Mộc (+6% Tốc Độ)',       atkPct: 0, hpPct: 0, speedPct: 6, critBonus: 0, blockBonus: 0, dodgeBonus: 0 },
            Tho:  { complete: isElemComplete('Tho'),  label: '🪨 Đủ Bộ Hệ Thổ (+5% HP, +6% Đỡ)',   atkPct: 0, hpPct: 5, speedPct: 0, critBonus: 0, blockBonus: 6, dodgeBonus: 0 },
            Kim:  { complete: isElemComplete('Kim'),  label: '⚔️ Đủ Bộ Hệ Kim (+6% Chí Mạng)',     atkPct: 0, hpPct: 0, speedPct: 0, critBonus: 6, blockBonus: 0, dodgeBonus: 0 }
        };

        let milestonePct = 0;
        if (unlockedCount >= 20) milestonePct = 10;
        else if (unlockedCount >= 14) milestonePct = 6;
        else if (unlockedCount >= 7) milestonePct = 3;

        let totalAtkPct = milestonePct;
        let totalHpPct = milestonePct;
        let totalSpeedPct = milestonePct;
        let totalCrit = 0;
        let totalBlock = 0;
        let totalDodge = 0;

        Object.values(elemSets).forEach(s => {
            if (s.complete) {
                totalAtkPct += s.atkPct;
                totalHpPct += s.hpPct;
                totalSpeedPct += s.speedPct;
                totalCrit += s.critBonus;
                totalBlock += s.blockBonus;
                totalDodge += s.dodgeBonus;
            }
        });

        return {
            unlockedCount,
            totalSpecies: list.length,
            milestonePct,
            elemSets,
            atkPct: totalAtkPct,
            hpPct: totalHpPct,
            speedPct: totalSpeedPct,
            critBonus: totalCrit,
            blockBonus: totalBlock,
            dodgeBonus: totalDodge
        };
    };

    // Giao diện Sổ Tay Bách Khoa Linh Thú
    let currentDexFilter = 'ALL';

    window.openMonsterDexModal = function (filterElem = currentDexFilter) {
        currentDexFilter = filterElem;
        const dex = window.syncMonsterDexFromOwned();
        const buffs = window.getMonsterDexBuffs();
        const list = (typeof allMonsters !== 'undefined' && Array.isArray(allMonsters)) ? allMonsters : [];
        const rarityList = (typeof rarities !== 'undefined' && Array.isArray(rarities)) ? rarities : [];

        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;
        modal.classList.remove('hidden');

        const tabs = [
            { key: 'ALL',  label: `Tất cả (${buffs.unlockedCount}/${buffs.totalSpecies})` },
            { key: 'Hoa',  label: '🔥 Hỏa' },
            { key: 'Thuy', label: '💧 Thủy' },
            { key: 'Moc',  label: '🌿 Mộc' },
            { key: 'Tho',  label: '🪨 Thổ' },
            { key: 'Kim',  label: '⚔️ Kim' }
        ];

        const tabsHtml = tabs.map(t => `
            <button onclick="openMonsterDexModal('${t.key}')"
                class="px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer transition ${currentDexFilter === t.key ? 'bg-amber-500 text-black shadow' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}">
                ${t.label}
            </button>
        `).join('');

        const filtered = currentDexFilter === 'ALL'
            ? list
            : list.filter(m => m.element === currentDexFilter);

        const cardsHtml = filtered.map(m => {
            const entry = dex[m.name];
            const unlocked = !!(entry && entry.unlocked);
            const maxR = unlocked ? (rarityList[entry.maxRarityIdx] || rarityList[0]) : null;
            const elemInfo = (typeof elementNames !== 'undefined' && elementNames[m.element])
                ? elementNames[m.element]
                : { label: m.element, color: 'text-zinc-300' };

            const spriteHtml = (typeof getPetSpriteHtml === 'function')
                ? getPetSpriteHtml(m, 'idle', 50, unlocked ? '' : 'grayscale brightness-50 opacity-50')
                : `<span class="text-3xl ${unlocked ? '' : 'grayscale opacity-40'}">${m.emoji}</span>`;

            return `
            <div class="p-2.5 rounded-xl border ${unlocked ? (maxR?.bg || 'border-emerald-500/50') + ' bg-zinc-800/95' : 'border-zinc-800 bg-zinc-950/80'} flex flex-col items-center text-center relative">
                <div class="mb-1 flex items-center justify-center h-12">${spriteHtml}</div>
                <div class="text-xs font-extrabold ${unlocked ? 'text-yellow-300' : 'text-zinc-500'} truncate w-full">
                    ${unlocked ? m.name : '??? (' + m.name + ')'}
                </div>
                <div class="text-[10px] font-bold ${unlocked ? elemInfo.color : 'text-zinc-600'}">
                    ${elemInfo.label}
                </div>
                ${unlocked
                    ? `<div class="mt-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-black/60 ${maxR?.color || 'text-zinc-300'}">Cao nhất: ${maxR?.badge || '⚪ Trắng'}</div>`
                    : `<div class="mt-1 text-[9px] font-bold text-zinc-600">Chưa bắt được</div>`
                }
            </div>`;
        }).join('');

        const setBadgesHtml = Object.values(buffs.elemSets).map(s => `
            <div class="px-2.5 py-1 rounded-lg text-[10px] font-bold border ${s.complete ? 'bg-emerald-950/80 border-emerald-400/60 text-emerald-300' : 'bg-zinc-950/70 border-zinc-800 text-zinc-500'}">
                ${s.complete ? '✅' : '🔒'} ${s.label}
            </div>
        `).join('');

        content.innerHTML = `
        <div class="flex justify-between items-center mb-3 pb-2 border-b border-amber-500/40">
            <div>
                <h3 class="font-black text-base text-amber-300">📖 BÁCH KHOA LINH THÚ</h3>
                <div class="text-[10px] text-zinc-400">Đã mở khóa: <b class="text-emerald-400">${buffs.unlockedCount}/${buffs.totalSpecies}</b> loài • Mốc thưởng: <b class="text-yellow-300">+${buffs.milestonePct}% Toàn Chỉ Số</b></div>
            </div>
            <button onclick="closeModal()" class="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full font-bold text-sm cursor-pointer border border-zinc-600">✕</button>
        </div>

        <div class="bg-zinc-950/90 border border-amber-500/30 rounded-xl p-2.5 mb-2.5 space-y-1.5">
            <div class="text-[11px] font-extrabold text-cyan-300">✨ Buff Vĩnh Viễn Đang Kích Hoạt Cho Toàn Đội:</div>
            <div class="text-[11px] text-zinc-200 font-bold">
                ⚔️ +${buffs.atkPct}% ATK • ❤️ +${buffs.hpPct}% HP • ⚡ +${buffs.speedPct}% Tốc • 💥 +${buffs.critBonus}% CM • 🛡️ +${buffs.blockBonus}% Đỡ • 🏃 +${buffs.dodgeBonus}% Né
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1 pt-1">
                ${setBadgesHtml}
            </div>
        </div>

        <div class="flex flex-wrap gap-1 mb-2">${tabsHtml}</div>

        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-[50vh] overflow-y-auto pr-1">
            ${cardsHtml}
        </div>`;
    };

    // Tự động quét khi khởi chạy và đồng bộ định kỳ
    window.addEventListener('load', () => {
        setTimeout(() => window.syncMonsterDexFromOwned(), 800);
    });
    setInterval(() => window.syncMonsterDexFromOwned(), 10000);
})();
