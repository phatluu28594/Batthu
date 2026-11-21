// ============================================================================
// BẮT THÚ VƯƠNG - MODULE CHIẾN ĐẤU THÁP, BOSS THẾ GIỚI & ĐẤU TRƯỜNG (arena.js)
// Đã đồng bộ hoàn toàn Server (/api/world-boss), Sảnh Boss MMO & Đánh Boss 3vs1
// ============================================================================

// 1. THÁP VÔ TẬN (TOWER) - HIỂN THỊ QUÁI CHẾ ĐỘ IDLE & NÚT XEM THÔNG TIN QUÁI
        function getTowerFloorMonster(floorNum) {
            const fl = Math.max(1, Number(floorNum) || 1);
            const bossKeys = (typeof bossSpriteConfigs !== 'undefined') ? Object.keys(bossSpriteConfigs) : [];
            const spriteKey = bossKeys.length > 0 ? bossKeys[(fl - 1) % bossKeys.length] : null;
            const cfg = spriteKey && bossSpriteConfigs[spriteKey] ? bossSpriteConfigs[spriteKey] : null;
            const elem = cfg?.element || ['Hoa', 'Moc', 'Thuy', 'Kim', 'Tho'][(fl - 1) % 5];

            const cycle = Math.floor((fl - 1) / 10);
            const bonusScale = 1 + Math.floor(cycle / 2);
            const stepInCycle = ((fl - 1) % 10) + 1;
            const TOWER_FLOOR_ITEMS = [
                { key: 'stoneKim',       qty: 1 * bonusScale, label: `${1 * bonusScale} ⚔️ Đá Kim` },
                { key: 'stoneMoc',       qty: 1 * bonusScale, label: `${1 * bonusScale} 🌿 Đá Mộc` },
                { key: 'stoneThuy',      qty: 1 * bonusScale, label: `${1 * bonusScale} 💧 Đá Thủy` },
                { key: 'stoneHoa',       qty: 1 * bonusScale, label: `${1 * bonusScale} 🔥 Đá Hỏa` },
                { key: 'stoneTho',       qty: 1 * bonusScale, label: `${1 * bonusScale} 🪨 Đá Thổ` },
                { key: 'luckyTicket',    qty: 1,              label: `1 🎟️ Vé Quay May Mắn` },
                { key: 'trainer',        qty: 1 * bonusScale, label: `${1 * bonusScale} 🎫 Vé Tập Luyện` },
                { key: 'food',           qty: 2 * bonusScale, label: `${2 * bonusScale} 🍖 Thức Ăn` },
                { key: 'toy',            qty: 2 * bonusScale, label: `${2 * bonusScale} 🎾 Đồ Chơi` },
                { key: 'gearShardChest', qty: 1,              label: `1 🧰 Rương Mảnh Trang Bị` }
            ];

            return {
                floor: fl,
                name: `${cfg?.displayName || 'Thủ Vệ Tháp'} (Tầng ${fl})`,
                baseName: cfg?.displayName || 'Thủ Vệ Tháp',
                spriteKey,
                element: elem,
                emoji: '👹',
                hp: 120 + (fl * 25),
                maxHp: 120 + (fl * 25),
                atk: 20 + fl * 4,
                speed: 40 + fl * 2,
                accuracy: 88,
                dodgeRate: Math.min(35, 10 + fl),
                critRate: 15,
                blockRate: Math.min(40, 12 + fl),
                armorBreak: Math.min(35, 10 + fl),
                comboRate: Math.min(50, 15 + fl * 2),
                rewardGold: 300 + (fl * 50),
                rewardDiamond: fl % 5 === 0 ? 5 : 0,
                rewardItem: TOWER_FLOOR_ITEMS[stepInCycle - 1]?.label || ''
            };
        }

        function buildTowerIdleSpriteHtml(mon, sizePx = 110) {
            if (mon.spriteKey && typeof bossSpriteConfigs !== 'undefined' && bossSpriteConfigs[mon.spriteKey]) {
                const cfg = bossSpriteConfigs[mon.spriteKey];
                const cols = cfg.cols || 8;
                const rows = cfg.totalRows || 5;
                const idleRow = (cfg.rowMap && cfg.rowMap.idle !== undefined) ? cfg.rowMap.idle : 0;
                const posY = rows > 1 ? (idleRow / (rows - 1)) * 100 : 0;
                return `<div class="animated-sprite-box" data-cols="${cols}" data-rows="${rows}" data-total="${cols}" data-fixed-row="${idleRow}" style="width:${sizePx}px; height:${sizePx}px; display:inline-block; background-image:url('${cfg.sheet}'); background-size:${cols * 100}% ${rows * 100}%; background-position:0% ${posY}%; background-repeat:no-repeat; filter: drop-shadow(0 8px 14px rgba(0,0,0,0.85));"></div>`;
            }
            return `<span class="pet-walk-anim" style="font-size:${Math.floor(sizePx * 0.65)}px;">${mon.emoji || '👹'}</span>`;
        }

        function renderTowerIdleGuardian() {
            const stage = document.getElementById('tower-guardian-stage');
            if (!stage) return;
            const mon = getTowerFloorMonster(towerFloor);
            const elemInfo = (typeof elementNames !== 'undefined' && elementNames[mon.element])
                ? elementNames[mon.element]
                : { label: mon.element, color: 'text-amber-300' };

            stage.innerHTML = `
                <!-- Nút Xem Thông Tin Quái Chuẩn Bị Đánh -->
                <div class="absolute top-3 left-3 z-30 pointer-events-auto flex items-center gap-2">
                    <button onclick="openTowerMonsterInfoModal()" class="bg-amber-950/90 hover:bg-amber-900 text-amber-200 px-3.5 py-2 rounded-full border border-amber-400/80 text-xs font-black shadow-xl cursor-pointer flex items-center gap-1.5 transition active:scale-95">
                        <span>🔍</span>
                        <span>Thông Tin Quái (Tầng ${mon.floor})</span>
                    </button>
                </div>

                <!-- Quái vật của tầng đứng ngay trước cổng tháp (dưới dòng chữ Tầng X - Chạm Để Đấu) -->
                <div onclick="openSelectFighterModal('tower')" class="pointer-events-auto cursor-pointer flex flex-col items-center" style="position: absolute; top: 72%; left: 50%; transform: translate(-50%, -50%);">
                    <div class="relative flex flex-col items-center justify-center">
                        ${buildTowerIdleSpriteHtml(mon, 108)}
                        <div class="w-24 h-4 rounded-full bg-black/60 blur-[3px] -mt-2"></div>
                    </div>
                    <div class="bg-black/85 backdrop-blur-xs px-3 py-0.5 rounded-full border border-purple-400/70 text-[10px] font-black text-yellow-300 whitespace-nowrap shadow-lg mt-1">
                        ${mon.name} • <span class="${elemInfo.color}">${elemInfo.label}</span>
                    </div>
                </div>
            `;
        }

        window.openTowerMonsterInfoModal = function() {
            const mon = getTowerFloorMonster(towerFloor);
            const elemInfo = (typeof elementNames !== 'undefined' && elementNames[mon.element])
                ? elementNames[mon.element]
                : { label: mon.element, color: 'text-amber-300' };
            const counterElem = (typeof elementCounterMap !== 'undefined') ? elementCounterMap[mon.element] : null;
            const counterLabel = counterElem && elementNames?.[counterElem]?.label ? elementNames[counterElem].label : (counterElem || '—');

            const modal = document.getElementById('modal-container');
            const content = document.getElementById('modal-content');
            if (!modal || !content) return;
            modal.classList.remove('hidden');

            const diaText = mon.rewardDiamond > 0 ? ` + ${mon.rewardDiamond}💎` : '';
            const itemText = mon.rewardItem ? ` + ${mon.rewardItem}` : '';

            content.innerHTML = `
            <div class="flex justify-between items-center mb-3 pb-2 border-b border-purple-500/40">
                <div>
                    <h3 class="font-black text-base text-amber-300">👹 THÔNG TIN QUÁI TẦNG ${mon.floor}</h3>
                    <div class="text-[11px] text-zinc-400">Trạng thái: <span class="text-emerald-400 font-bold">Chờ Khiêu Chiến (Idle)</span></div>
                </div>
                <button onclick="closeModal()" class="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full font-bold text-sm cursor-pointer border border-zinc-600">✕</button>
            </div>

            <div class="bg-zinc-800/90 border border-purple-500/40 rounded-2xl p-3.5 mb-3 flex flex-col items-center text-center">
                <div class="mb-1 flex justify-center">${buildTowerIdleSpriteHtml(mon, 96)}</div>
                <div class="text-sm font-black text-yellow-300">${mon.name}</div>
                <div class="text-xs font-bold ${elemInfo.color} mt-0.5">
                    Hệ: ${elemInfo.label} • Khắc chế bởi: <span class="text-emerald-300">${counterLabel}</span>
                </div>

                <div class="w-full grid grid-cols-2 gap-1.5 mt-3 text-[11px] bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-700 text-left">
                    <div>❤️ Máu (HP): <span class="font-bold text-emerald-400">${mon.maxHp}</span></div>
                    <div>⚔️ ATK: <span class="font-bold text-red-400">${mon.atk}</span></div>
                    <div>⚡ Tốc độ: <span class="font-bold text-cyan-400">${mon.speed}</span></div>
                    <div>🔥 Liên kích: <span class="font-bold text-orange-400">${mon.comboRate}%</span></div>
                    <div>💥 Chí mạng: <span class="font-bold text-blue-400">${mon.critRate}%</span></div>
                    <div>🛡️ Đỡ đòn: <span class="font-bold text-purple-400">${mon.blockRate}%</span></div>
                    <div>🗡️ Phá giáp: <span class="font-bold text-rose-400">${mon.armorBreak}%</span></div>
                    <div>🏃 Né tránh: <span class="font-bold text-emerald-300">${mon.dodgeRate}%</span></div>
                </div>

                <div class="w-full mt-2.5 bg-amber-950/50 border border-amber-400/40 rounded-xl p-2 text-left text-[11px]">
                    <div class="font-extrabold text-amber-300">🎁 Thưởng Vượt Tầng ${mon.floor}:</div>
                    <div class="text-zinc-200 font-bold mt-0.5">+${mon.rewardGold}🪙 Vàng${diaText}${itemText}</div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
                <button onclick="closeModal()" class="bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-xl font-bold text-xs text-zinc-200 cursor-pointer border border-zinc-600">Đóng</button>
                <button onclick="closeModal(); openSelectFighterModal('tower');" class="bg-gradient-to-r from-purple-600 to-amber-500 hover:brightness-110 py-2.5 rounded-xl font-black text-xs text-white cursor-pointer shadow-lg">⚔️ Khiêu Chiến Ngay</button>
            </div>`;
        };

        function openTowerMenu() {
            checkPetSurvival();
            let gateTag = document.getElementById('tower-gate-floor');
            if (gateTag) gateTag.innerText = towerFloor;
            renderTowerIdleGuardian();
            document.getElementById('tower-screen').classList.remove('hidden');
        }
        function closeTowerScreen() {
            document.getElementById('tower-screen').classList.add('hidden');
        }


// 2. ĐẤU TRƯỜNG & KHIÊU CHIẾN CÁ NHÂN / THÁP
        function openArenaMenu() {
            checkPetSurvival();
            const modal = document.getElementById('modal-container');
            const content = document.getElementById('modal-content');
            modal.classList.remove('hidden');
            content.innerHTML = `<div class="flex justify-between items-center mb-4"><h3 class="font-bold text-lg">⚔️ Đấu Trường PvP (1vs1)</h3><button onclick="closeModal()" class="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full font-bold text-sm cursor-pointer border border-zinc-600">✕</button></div><button onclick="openSelectFighterModal('arena')" class="w-full bg-red-600 hover:bg-red-500 py-3 rounded-xl font-bold text-xs cursor-pointer shadow-lg">⚔️ Chọn Thú Xuất Chiến (1vs1)</button>`;
        }


        const HEAL_SKILL_CONFIG = {
            id: 'divine_heal',
            name: '💚 Hồi Phục Linh Hồn',
            type: 'heal_lowest',
            multiplier: 2, // Hồi máu = x2 lần chỉ số tấn công (dame)
            cooldown: 3,   // Hồi chiêu 3 lượt
            desc: 'Hồi HP cho đồng minh có máu thấp nhất bằng 200% Sát Thương.'
        };

        function tryCastHealLowestAlly(caster, activeTeam, teamHpList, teamSlots, defaultX, defaultY, impactEffects) {
            let lowestIdx = -1;
            let lowestHp = Infinity;
            activeTeam.forEach((ally, idx) => {
                const curHp = teamHpList[idx];
                if (curHp > 0 && curHp < ally.maxHp && curHp < lowestHp) {
                    lowestHp = curHp;
                    lowestIdx = idx;
                }
            });

            if (lowestIdx === -1) return false;

            const healAmount = Math.max(1, Math.floor((caster.atk || 10) * 2));
            const targetPet = activeTeam[lowestIdx];
            const oldHp = teamHpList[lowestIdx];
            teamHpList[lowestIdx] = Math.min(targetPet.maxHp, oldHp + healAmount);
            const actualHealed = Math.floor(teamHpList[lowestIdx] - oldHp);

            if (actualHealed <= 0) return false;

            const slotPos = teamSlots[lowestIdx] || { x: defaultX, y: defaultY };
            if (Array.isArray(impactEffects)) {
                impactEffects.push({
                    x: slotPos.x,
                    y: slotPos.y - 10,
                    radius: 16,
                    alpha: 1,
                    color: '#34d399',
                    text: `+${actualHealed}💚`
                });
            }
            const logEl = document.getElementById('battle-log');
            if (logEl) {
                logEl.innerText = `💚 [${caster.name}] dùng Hồi Phục, chữa +${actualHealed} HP (x2 Dame) cho [${targetPet.name}]!`;
            }
            return true;
        }

        // ==========================================
        // ĐẤU TRƯỜNG ATB V1.2
        // ==========================================
        let battleCanvas, battleCtx, battleInterval;
        let currentBattleSyncFn = null;

        window.openSelectFighterModal = function(mode) {
            checkPetSurvival();
            if (!team || team.length === 0) {
                alert('⚠️ Đội hình trong túi đang trống! Hãy bắt thú hoặc đưa thú từ Trang Trại vào đội.');
                return;
            }

            if (team.length === 1) {
                if (team[0].hp <= 0) {
                    alert(`⚠️ Linh thú [${team[0].name}] đã cạn HP! Hãy hồi sức trước khi chiến đấu.`);
                    return;
                }
                startBattle(mode, 0);
                return;
            }

            const modal = document.getElementById('modal-container');
            const content = document.getElementById('modal-content');
            modal.classList.remove('hidden');

            const titleText = mode === 'tower'
                ? `🗼 Chọn Thú Leo Tháp 1vs1 (Tầng ${towerFloor})`
                : `⚔️ Chọn Thú Đấu PvP 1vs1`;

            let listHtml = team.map((pet, idx) => {
                ensurePetGears(pet);
                const bonus = getPetGearBonus(pet);
                const fullHp = pet.maxHp + bonus.maxHp;
                const isFainted = pet.hp <= 0;
                const elemInfo = elementNames[pet.element] || { label: pet.element, color: 'text-zinc-300' };

                return `
                <div onclick="${isFainted ? '' : `closeModal(); startBattle('${mode}', ${idx});`}"
                    class="p-3 rounded-xl border flex items-center justify-between transition ${isFainted
                        ? 'bg-zinc-950/60 border-zinc-800 opacity-45 cursor-not-allowed'
                        : `bg-zinc-800 hover:bg-zinc-700 ${pet.rarity.bg} cursor-pointer`}">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="bg-zinc-900 p-1.5 rounded-xl shrink-0">
                            ${getPetSpriteHtml(pet, 'idle', 46)}
                        </div>
                        <div class="min-w-0">
                            <div class="font-bold text-xs text-yellow-300 truncate">
                                ${pet.name} <span class="${pet.rarity.color}">${pet.rarity.badge}</span> <span class="text-white">Lv.${Math.floor(pet.level)}</span>
                            </div>
                            <div class="text-[10px] ${elemInfo.color} font-bold mt-0.5 flex items-center flex-wrap">
                                [${elemInfo.label}] • ❤️ ${'❤️'.repeat(pet.hearts || 3)}
                            </div>
                            <div class="text-[10px] text-zinc-300 mt-0.5">
                                HP: ${Math.floor(pet.hp)}/${fullHp} • ⚔️${Math.floor(pet.atk + bonus.atk)} • ⚡${(pet.speed || 50) + bonus.speed}
                            </div>
                        </div>
                    </div>
                    <span class="px-3 py-1.5 rounded-lg text-[11px] font-extrabold shrink-0 ${isFainted ? 'bg-zinc-800 text-zinc-500' : 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow'}">
                        ${isFainted ? 'Hết HP' : '⚔️ Xuất Chiến'}
                    </span>
                </div>`;
            }).join('');

            content.innerHTML = `
            <div class="flex justify-between items-center mb-3 pb-2 border-b border-zinc-800">
                <h3 class="font-bold text-sm text-amber-300">${titleText}</h3>
                <button onclick="closeModal()" class="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full font-bold text-sm cursor-pointer border border-zinc-600">✕</button>
            </div>
            <div class="text-[11px] text-zinc-400 mb-2.5">Chọn 1 linh thú trong túi để vào trận 1vs1:</div>
            <div class="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                ${listHtml}
            </div>`;
        };

        function startBattle(mode, selectedIndex = 0) {
            checkPetSurvival();
            if (team.length === 0) { alert('Đội hình trống!'); return; }
            if (mode === 'boss') {
                if (team.length < 3) {
                    alert('⚠️ Boss Thế Giới yêu cầu đủ 3 linh thú (3vs1) trong đội hình!');
                    return;
                }
                const aliveCount = team.filter(p => p && p.hp > 0).length;
                if (aliveCount === 0) {
                    alert('⚠️ Tất cả linh thú trong đội đều đã cạn HP! Hãy hồi sức trước khi đánh Boss.');
                    return;
                }
            }

            const chosenPet = team[selectedIndex] || team[0];
            if (mode !== 'boss' && chosenPet.hp <= 0) {
                alert(`⚠️ Linh thú [${chosenPet.name}] đã hết HP! Vui lòng chọn linh thú khác hoặc hồi sức.`);
                return;
            }

            closeModal();
            closeTowerScreen();
            if (mode === 'boss') {
                // Tạm dừng loop sảnh Boss khi bước vào trận đánh
                wbState.active = false;
                if (wbState.loopId) {
                    cancelAnimationFrame(wbState.loopId);
                    wbState.loopId = null;
                }
                document.getElementById('world-boss-screen')?.classList.add('hidden');
            }
            document.getElementById('map-screen').classList.add('hidden');
            document.getElementById('battle-screen').classList.remove('hidden');
            switchGameMusic('battle');

            const rawSquad = (mode === 'boss') ? [...team] : [chosenPet];
            const teamSynergy = getTeamSynergy(rawSquad);
            const dexBuff = (typeof getMonsterDexBuffs === 'function')
                ? getMonsterDexBuffs()
                : { atkPct: 0, hpPct: 0, speedPct: 0, critBonus: 0, blockBonus: 0, dodgeBonus: 0 };

            let activeTeam = rawSquad.map(p => {
                let b = getPetGearBonus(p);
                let baseMaxHp = Math.floor((p.maxHp + b.maxHp) * (1 + (dexBuff.hpPct || 0) / 100));
                let baseAtk = Math.floor((p.atk + b.atk) * (1 + (dexBuff.atkPct || 0) / 100));
                let baseSpeed = Math.floor(((p.speed || 50) + b.speed) * (1 + (dexBuff.speedPct || 0) / 100));
                let baseCrit = (p.critRate ?? 20) + b.critRate + (dexBuff.critBonus || 0);

                if (teamSynergy?.id === 'pure') baseAtk = Math.floor(baseAtk * 1.30);
                if (teamSynergy?.id === 'triad') {
                    baseSpeed = Math.floor(baseSpeed * 1.15);
                    baseCrit = Math.min(100, baseCrit + 15);
                }

                return {
                    ...p,
                    _ref: p,
                    hp: p.hp,
                    maxHp: baseMaxHp,
                    atk: baseAtk,
                    speed: baseSpeed,
                    critRate: baseCrit,
                    blockRate: (p.blockRate ?? 15) + b.blockRate + (dexBuff.blockBonus || 0),
                    dodgeRate: (p.dodgeRate ?? 15) + (dexBuff.dodgeBonus || 0),
                    armorBreak: (p.armorBreak ?? 15) + b.armorBreak,
                    skill: (p.trait?.type === 'heal' || p.hasHealSkill) ? { ...HEAL_SKILL_CONFIG } : null,
                    skillCd: 0
                };
            });

            let teamHpList = activeTeam.map(p => p.hp);
            let teamMaxHpTotal = activeTeam.reduce((sum, p) => sum + p.maxHp, 0);

            function syncBattleHpToTeam() {
                activeTeam.forEach((pet, idx) => {
                    if (pet._ref) {
                        pet._ref.hp = Math.max(0, Math.floor(teamHpList[idx]));
                    }
                });
                saveGameData();
            }
            currentBattleSyncFn = syncBattleHpToTeam;

            const bossKeys = Object.keys(bossSpriteConfigs);
            const randomBossKey = bossKeys[Math.floor(Math.random() * bossKeys.length)];
            const chosenBossCfg = bossSpriteConfigs[randomBossKey];

            // Nếu đánh Boss Thế Giới -> lấy đúng thông tin & HP hiện tại của Boss khu vực đó
            let wbRegion = activeWorldBossRegion || WORLD_BOSS_REGIONS[0];
            let wbSpriteKey = (wbRegion && bossSpriteConfigs[wbRegion.spriteKey]) ? wbRegion.spriteKey : randomBossKey;
            let wbCfg = bossSpriteConfigs[wbSpriteKey] || chosenBossCfg;
            let wbServerRow = wbRegion ? getServerBossRegionState(wbRegion.id) : null;
            let wbCurrentHp = Math.max(100, Number(wbServerRow?.hp) || Number(wbState.hp) || (5000 + bossLevel * 3000));
            let wbMaxHp = Math.max(wbCurrentHp, Number(wbServerRow?.max_hp) || Number(wbState.maxHp) || (5000 + bossLevel * 3000));

            let enemy = mode === 'boss' ? {
                name: `${wbServerRow?.boss_name || wbRegion?.bossName || wbCfg.displayName}`,
                spriteKey: wbSpriteKey,
                element: wbCfg.element || 'Hoa',
                emoji: wbRegion?.emoji || '👹',
                hp: wbCurrentHp,
                maxHp: wbMaxHp,
                atk: 38 + (bossLevel * 10),
                speed: 48 + bossLevel * 3,
                accuracy: 95, dodgeRate: 15, critRate: 20, blockRate: 20, armorBreak: 20, comboRate: 25
            } :
            mode === 'tower' ? (() => {
                const towerMon = getTowerFloorMonster(towerFloor);
                return {
                    name: towerMon.name,
                    spriteKey: towerMon.spriteKey,
                    element: towerMon.element,
                    emoji: towerMon.emoji || '👹',
                    hp: towerMon.hp,
                    maxHp: towerMon.maxHp,
                    atk: towerMon.atk,
                    speed: towerMon.speed,
                    accuracy: towerMon.accuracy,
                    dodgeRate: towerMon.dodgeRate,
                    critRate: towerMon.critRate,
                    blockRate: towerMon.blockRate,
                    armorBreak: towerMon.armorBreak,
                    comboRate: towerMon.comboRate
                };
            })() :
            { name: 'Đối Thủ PvP', element: 'Tho', emoji: '🤖', hp: 160, maxHp: 160, atk: 25, speed: 52, accuracy: 90, dodgeRate: 18, critRate: 18, blockRate: 18, armorBreak: 16, comboRate: 22 };

            let enemyHp = enemy.hp;
            const startEnemyHp = enemy.hp;
            let teamStatus = activeTeam.map(() => ({ stun: 0, poison: 0, burn: 0, slow: 0, shield: 0 }));
            let enemyStatus = { stun: 0, poison: 0, burn: 0, slow: 0, shield: 0 };

            const teamNamesEl = document.getElementById('battle-team-names');
            if (teamNamesEl) {
                teamNamesEl.innerText = activeTeam.map(p => `${p.name} Lv.${Math.floor(p.level || 1)}`).join(', ');
            }
            document.getElementById('battle-enemy-name').innerText = `${enemy.name} [${elementNames[enemy.element]?.label}] (⚡${enemy.speed} | 🔥${enemy.comboRate}%)`;

            // Gắn nút Rút lui đúng ngữ cảnh (nếu đang đánh Boss Thế Giới thì quay về Sảnh Boss)
            const retreatBtn = document.querySelector('#battle-screen button[onclick*="exitBattleScreen"]');
            const origRetreatAttr = retreatBtn ? retreatBtn.getAttribute('onclick') : null;
            if (retreatBtn && mode === 'boss') {
                retreatBtn.onclick = function () {
                    const dealt = Math.max(0, startEnemyHp - Math.max(0, enemyHp));
                    if (dealt > 0) reportDamageToWorldBoss(dealt);
                    retreatBtn.onclick = null;
                    if (origRetreatAttr) retreatBtn.setAttribute('onclick', origRetreatAttr);
                    if (typeof currentBattleSyncFn === 'function') {
                        currentBattleSyncFn();
                        currentBattleSyncFn = null;
                    }
                    if (battleInterval) clearInterval(battleInterval);
                    document.getElementById('battle-screen').classList.add('hidden');
                    switchGameMusic('map');
                    openWorldBossLobby(activeWorldBossRegion);
                };
            }

            battleCanvas = document.getElementById('battleCanvas');
            let dpr = window.devicePixelRatio || 1;
            let rect = battleCanvas.getBoundingClientRect();
            battleCanvas.width = rect.width * dpr;
            battleCanvas.height = rect.height * dpr;
            battleCtx = battleCanvas.getContext('2d');
            battleCtx.scale(dpr, dpr);
            battleCtx.imageSmoothingEnabled = true;
            battleCtx.imageSmoothingQuality = 'high';

            let attacker = null;
            let turnQueue = [];
            let roundNumber = 0;
            let turnDelayFrames = 14;

            function buildNextRoundQueue() {
                roundNumber++;
                if (teamSynergy?.id === 'sheng') {
                    activeTeam.forEach((pet, idx) => {
                        if (teamHpList[idx] > 0 && teamHpList[idx] < pet.maxHp) {
                            const healAmt = Math.max(1, Math.floor(pet.maxHp * 0.08));
                            teamHpList[idx] = Math.min(pet.maxHp, teamHpList[idx] + healAmt);
                            const pPos = { x: leftEdgeX, y: cy };
                            impactEffects.push({ x: pPos.x, y: pPos.y - 25, radius: 10, alpha: 1, color: '#34d399', text: `+${healAmt}💚` });
                        }
                    });
                }
                let fighters = [];
                activeTeam.forEach((pet, idx) => {
                    if (teamHpList[idx] > 0) {
                        fighters.push({ side: 'team', index: idx, speed: pet.speed || 50 });
                    }
                });
                if (enemyHp > 0) {
                    fighters.push({ side: 'enemy', index: 0, speed: enemy.speed || 50 });
                }
                fighters.sort((a, b) => b.speed - a.speed);
                return fighters;
            }

            let idleTick = 0;
            let introFrames = 26; // Hiệu ứng đi bộ vào tâm võ đài lúc bắt đầu trận đấu
            let teamHitShake = [0, 0, 0];
            let enemyHitShake = 0;
            let impactEffects = [];
            let battleEnded = false;

            if (battleInterval) clearInterval(battleInterval);

            battleInterval = setInterval(() => {
                battleCtx.clearRect(0, 0, rect.width, rect.height);
                idleTick += 0.14;

                // Căn chỉnh sàn đấu chuẩn Widescreen 16:9 Landscape:
                // - Vị trí đứng dọc (cy) nằm đúng vùng vòng tròn tâm võ đài (~65% chiều cao)
                // - Đội thú và Quái/Boss đi bộ từ 2 cánh vào đối mặt nhau ngay tâm sàn đấu (43% vs 57% width)
                let cy = rect.height * 0.65;
                let clashLeftX = rect.width * 0.43;  // Vị trí giao chiến đội thú bên trái
                let clashRightX = rect.width * 0.57; // Vị trí giao chiến Quái/Boss bên phải
                let startLeftX = rect.width * 0.12;
                let startRightX = rect.width * 0.88;

                let marchT = (introFrames > 0) ? Math.min(1, Math.max(0, 1 - (introFrames / 26))) : 1;
                let curLeftX = startLeftX + (clashLeftX - startLeftX) * marchT;
                let curRightX = startRightX + (clashRightX - startRightX) * marchT;
                let defaultEnemyX = curRightX;

                const teamSlots = (mode === 'boss')
                    ? [
                        { x: curLeftX,       y: cy },
                        { x: curLeftX - 35,  y: cy - 42 },
                        { x: curLeftX - 35,  y: cy + 42 }
                    ]
                    : [
                        { x: curLeftX,       y: cy }
                    ];

                if (introFrames > 0) {
                    introFrames--;
                    // Trong lúc 2 bên đang đi bộ vào giữa đối mặt nhau, tạm dừng đếm hiệp
                } else if (!attacker && !battleEnded) {
                    if (turnDelayFrames > 0) {
                        turnDelayFrames--;
                    } else {
                        while (turnQueue.length > 0) {
                            let candidate = turnQueue[0];
                            let isAlive = candidate.side === 'team' ? (teamHpList[candidate.index] > 0) : (enemyHp > 0);
                            if (isAlive) break;
                            turnQueue.shift();
                        }

                        if (turnQueue.length === 0) {
                            turnQueue = buildNextRoundQueue();
                        }

                        if (turnQueue.length > 0) {
                            let nextActor = turnQueue.shift();
                            let st = nextActor.side === 'team' ? teamStatus[nextActor.index] : enemyStatus;
                            let actorName = nextActor.side === 'team' ? activeTeam[nextActor.index].name : enemy.name;
                            let actorMaxHp = nextActor.side === 'team' ? activeTeam[nextActor.index].maxHp : enemy.maxHp;
                            let fxX = nextActor.side === 'team' ? (teamSlots[nextActor.index]?.x || clashLeftX) : defaultEnemyX;
                            let fxY = nextActor.side === 'team' ? (teamSlots[nextActor.index]?.y || cy) : cy;

                            let dotDmg = 0;
                            let dotLabel = [];
                            if (st.poison > 0) {
                                dotDmg += Math.max(5, Math.floor(actorMaxHp * 0.06));
                                st.poison--;
                                dotLabel.push('🟢Độc');
                            }
                            if (st.burn > 0) {
                                dotDmg += Math.max(6, Math.floor(actorMaxHp * 0.07));
                                st.burn--;
                                dotLabel.push('🔥Cháy');
                            }
                            if (dotDmg > 0) {
                                if (nextActor.side === 'team') {
                                    teamHpList[nextActor.index] = Math.max(0, teamHpList[nextActor.index] - dotDmg);
                                    activeTeam[nextActor.index].hp = teamHpList[nextActor.index];
                                } else {
                                    enemyHp = Math.max(0, enemyHp - dotDmg);
                                }
                                impactEffects.push({ x: fxX, y: fxY - 10, radius: 8, alpha: 1, color: '#4ade80', text: `-${dotDmg} (${dotLabel.join('+')})` });
                                document.getElementById('battle-log').innerText = `[Hiệp ${roundNumber}] ${actorName} chịu -${dotDmg} sát thương từ ${dotLabel.join(' & ')}!`;
                            }

                            if (st.slow > 0) st.slow--;
                            if (st.shield > 0) st.shield--;

                            let stillAlive = nextActor.side === 'team' ? (teamHpList[nextActor.index] > 0) : (enemyHp > 0);
                            if (!stillAlive) {
                                turnDelayFrames = 14;
                            } else if (st.stun > 0) {
                                st.stun = 0;
                                impactEffects.push({ x: fxX, y: fxY - 20, radius: 14, alpha: 1, color: '#facc15', text: `💫 CHOÁNG! Mất lượt` });
                                document.getElementById('battle-log').innerText = `[Hiệp ${roundNumber}] 💫 ${actorName} bị choáng, mất lượt!`;
                                turnDelayFrames = 26;
                            } else {
                                let usedHealSkill = false;
                                if (nextActor.side === 'team') {
                                    const caster = activeTeam[nextActor.index];
                                    if (caster && caster.skill && caster.skill.type === 'heal_lowest') {
                                        if ((caster.skillCd || 0) <= 0) {
                                            usedHealSkill = tryCastHealLowestAlly(caster, activeTeam, teamHpList, teamSlots, clashLeftX, cy, impactEffects);
                                            if (usedHealSkill) {
                                                caster.skillCd = caster.skill.cooldown || 3;
                                                syncBattleHpToTeam();
                                                turnDelayFrames = 22;
                                            }
                                        } else {
                                            caster.skillCd--;
                                        }
                                    }
                                }

                                if (!usedHealSkill) {
                                    attacker = { side: nextActor.side, index: nextActor.index, step: 0, isComboHit: false };
                                }
                            }
                        }
                    }
                }

                let myOffsetsX = [0, 0, 0];
                let myOffsetsY = [0, 0, 0];
                let myRotations = [0, 0, 0];
                let enemyOffsetX = 0;
                let enemyOffsetY = 0;
                let enemyRotation = 0;

                if (attacker && !battleEnded) {
                    attacker.step++;

                    if (attacker.side === 'team') {
                        let idx = attacker.index;
                        const lungeDist = 16; // Tấn công tại chỗ đối mặt, nhích tới trước 16px

                        if (attacker.step <= 5) {
                            let t = attacker.step / 5;
                            myOffsetsX[idx] = t * lungeDist;
                        } else if (attacker.step <= 12) {
                            myOffsetsX[idx] = lungeDist;

                            if (attacker.step === 6) {
                                let pet = activeTeam[idx];
                                let comboTag = attacker.isComboHit ? ' 🔥LIÊN KÍCH!' : '';
                                let hitChance = Math.max(25, Math.min(100, (pet.accuracy ?? 90) - (enemy.dodgeRate ?? 15) + 15));
                                if (Math.random() * 100 > hitChance) {
                                    impactEffects.push({
                                        x: defaultEnemyX - 10,
                                        y: cy,
                                        radius: 10,
                                        alpha: 1,
                                        color: '#94a3b8',
                                        text: `💨 NÉ TRÁNH!`
                                    });
                                    document.getElementById('battle-log').innerText = `[Hiệp ${roundNumber}] ${pet.name}${comboTag} tấn công nhưng ${enemy.name} đã né tránh!`;
                                } else {
                                    let dmg = pet.atk * (0.85 + Math.random() * 0.3);
                                    if (pet.element === currentWeather.bonusElem) dmg *= currentWeather.statBonus;
                                    let isCounter = false;
                                    if (elementCounterMap[pet.element] === enemy.element) { dmg *= 1.35; isCounter = true; }
                                    let isCrit = Math.random() * 100 < (pet.critRate ?? 20);
                                    if (isCrit) dmg *= 1.5;

                                    let effectiveBlock = Math.max(0, (enemy.blockRate ?? 12) - (pet.armorBreak ?? 15));
                                    let isBlocked = Math.random() * 100 < effectiveBlock;
                                    if (isBlocked) dmg *= 0.6;

                                    let finalDmg = Math.max(1, Math.floor(dmg));
                                    enemyHp = Math.max(0, enemyHp - finalDmg);
                                    enemyHitShake = 12;

                                    let triggerChance = Math.max(30, pet.trait?.chance || 30);
                                    if (pet.trait && (Math.random() * 100 < triggerChance)) {
                                        let tType = pet.trait.type;
                                        if (tType === 'stun') enemyStatus.stun = 2;
                                        else if (tType === 'poison') enemyStatus.poison = 2;
                                        else if (tType === 'burn') enemyStatus.burn = 2;
                                        else if (tType === 'slow') enemyStatus.slow = 2;
                                        else if (tType === 'shield') teamStatus[idx].shield = 2;
                                    }

                                    let tags = `${isCrit ? '💥' : ''}${isBlocked ? '🛡️' : ''}${attacker.isComboHit ? '🔥' : ''}`;
                                    impactEffects.push({
                                        x: defaultEnemyX - 10,
                                        y: cy,
                                        radius: 10,
                                        alpha: 1,
                                        color: isCrit ? '#facc15' : (attacker.isComboHit ? '#fb923c' : '#38bdf8'),
                                        text: `-${finalDmg} ${tags}`
                                    });
                                    document.getElementById('battle-log').innerText = `[Hiệp ${roundNumber}] ⚡${pet.speed} ${pet.name}${comboTag}: -${finalDmg} dmg ${isCrit ? '[CHÍ MẠNG!] ' : ''}${isBlocked ? '[BỊ ĐỠ!] ' : ''}${isCounter ? '[KHẮC HỆ!]' : ''}`;
                                }
                            }
                        } else if (attacker.step <= 18) {
                            let t = 1 - (attacker.step - 12) / 6;
                            myOffsetsX[idx] = lungeDist * t;
                        } else {
                            let pet = activeTeam[idx];
                            let comboChance = pet.comboRate ?? 20;
                            if (!attacker.isComboHit && enemyHp > 0 && teamHpList[idx] > 0 && (Math.random() * 100 < comboChance)) {
                                attacker = { side: 'team', index: idx, step: 0, isComboHit: true };
                            } else {
                                attacker = null;
                                turnDelayFrames = 12;
                            }
                        }
                    } else if (attacker.side === 'enemy') {
                        let targetIdx = teamHpList.findIndex(h => h > 0);
                        let targetSlot = targetIdx !== -1 ? (teamSlots[targetIdx] || { x: clashLeftX, y: cy }) : { x: clashLeftX, y: cy };
                        let targetY = targetSlot.y;
                        const enLungeDist = 16; // Quái/Boss nhích sang trái 16px tấn công đối mặt

                        if (attacker.step <= 5) {
                            let t = attacker.step / 5;
                            enemyOffsetX = -t * enLungeDist;
                        } else if (attacker.step <= 12) {
                            enemyOffsetX = -enLungeDist;

                            if (attacker.step === 6 && targetIdx !== -1) {
                                let targetPet = activeTeam[targetIdx];
                                let comboTag = attacker.isComboHit ? ' 🔥LIÊN KÍCH!' : '';
                                let hitChance = Math.max(25, Math.min(100, (enemy.accuracy ?? 88) - (targetPet.dodgeRate ?? 15) + 15));
                                if (Math.random() * 100 > hitChance) {
                                    impactEffects.push({
                                        x: targetSlot.x + 10,
                                        y: targetY,
                                        radius: 10,
                                        alpha: 1,
                                        color: '#34d399',
                                        text: `💨 NÉ TRÁNH!`
                                    });
                                    document.getElementById('battle-log').innerText = `[Hiệp ${roundNumber}] ${targetPet.name} nhanh nhẹn né tránh đòn đánh của ${enemy.name}!`;
                                } else {
                                    let rawDmg = enemy.atk * (0.85 + Math.random() * 0.3);
                                    let isCrit = Math.random() * 100 < (enemy.critRate ?? 15);
                                    if (isCrit) rawDmg *= 1.5;

                                    let effectiveBlock = Math.max(0, (targetPet.blockRate ?? 15) - (enemy.armorBreak ?? 15));
                                    let isBlocked = Math.random() * 100 < effectiveBlock;
                                    if (isBlocked) rawDmg *= 0.6;
                                    if (teamStatus[targetIdx].shield > 0) rawDmg *= 0.65;

                                    let enDmg = Math.max(1, Math.floor(rawDmg));
                                    teamHpList[targetIdx] = Math.max(0, teamHpList[targetIdx] - enDmg);
                                    activeTeam[targetIdx].hp = teamHpList[targetIdx];
                                    teamHitShake[targetIdx] = 12;

                                    let tags = `${isCrit ? '💥' : ''}${isBlocked ? '🛡️' : ''}${attacker.isComboHit ? '🔥' : ''}`;
                                    impactEffects.push({
                                        x: targetSlot.x + 10,
                                        y: targetY,
                                        radius: 10,
                                        alpha: 1,
                                        color: isBlocked ? '#a855f7' : (attacker.isComboHit ? '#fb923c' : '#ef4444'),
                                        text: `-${enDmg} ${tags}`
                                    });
                                    document.getElementById('battle-log').innerText = `[Hiệp ${roundNumber}] ⚡${enemy.speed} ${enemy.name}${comboTag}: -${enDmg} dmg lên ${targetPet.name} ${isBlocked ? '[ĐỠ ĐÒN!] ' : ''}${isCrit ? '[CHÍ MẠNG!]' : ''}`;
                                }
                            }
                        } else if (attacker.step <= 18) {
                            let t = 1 - (attacker.step - 12) / 6;
                            enemyOffsetX = -enLungeDist * t;
                        } else {
                            let enemyComboChance = enemy.comboRate ?? 20;
                            let stillAlive = teamHpList.some(h => h > 0);
                            if (!attacker.isComboHit && stillAlive && enemyHp > 0 && (Math.random() * 100 < enemyComboChance)) {
                                attacker = { side: 'enemy', index: 0, step: 0, isComboHit: true };
                            } else {
                                attacker = null;
                                turnDelayFrames = 12;
                            }
                        }
                    }
                }

                let currentTeamHpTotal = teamHpList.reduce((a, b) => Math.max(0, a) + Math.max(0, b), 0);
                let teamHpPercent = Math.max(0, (currentTeamHpTotal / teamMaxHpTotal) * 100);
                let enemyHpPercent = Math.max(0, (enemyHp / enemy.maxHp) * 100);
                document.getElementById('battle-team-hp-bar').style.width = teamHpPercent + '%';
                document.getElementById('battle-team-hp-text').innerText = `HP: ${currentTeamHpTotal}/${teamMaxHpTotal}`;
                document.getElementById('battle-enemy-hp-bar').style.width = enemyHpPercent + '%';
                document.getElementById('battle-enemy-hp-text').innerText = `HP: ${Math.max(0, enemyHp)}/${enemy.maxHp}`;

                let isEnemyDead = enemyHp <= 0;
                let isEnemyAttacking = (attacker && attacker.side === 'enemy');
                let isEnemyHit = enemyHitShake > 0;
                let enKnockback = 0;
                if (isEnemyHit) {
                    enKnockback = Math.sin(enemyHitShake * 1.8) * 8 + 4;
                    enemyHitShake--;
                }

                let finalEnX = isEnemyDead ? defaultEnemyX : (defaultEnemyX + enemyOffsetX + enKnockback);
                let finalEnY = isEnemyDead ? (cy + 14) : (cy + enemyOffsetY);

                if (enemy.spriteKey && bossSpriteConfigs[enemy.spriteKey]) {
                    let bossCfg = bossSpriteConfigs[enemy.spriteKey];
                    let maxFrames = bossCfg.singleSheet ? (bossCfg.cols || 8) : (getSpriteGrid(bossCfg, isEnemyDead ? 'death' : (isEnemyAttacking ? 'attack' : (isEnemyHit ? 'hit' : (introFrames > 0 ? 'walk' : 'idle')))).totalFrames);
                    let enAnimState = (introFrames > 0) ? 'walk' : 'idle';
                    let enAnimFrame = Math.floor(idleTick * 2.4) % maxFrames;
                    if (isEnemyDead) {
                        enAnimState = 'death';
                        enAnimFrame = maxFrames - 1;
                    } else if (isEnemyAttacking) {
                        enAnimState = 'attack';
                        enAnimFrame = Math.min(maxFrames - 1, Math.floor((attacker.step / 18) * maxFrames));
                    } else if (isEnemyHit) {
                        enAnimState = 'hit';
                        enAnimFrame = Math.min(maxFrames - 1, Math.floor((12 - enemyHitShake) * (maxFrames / 12)));
                    }
                    let enemySize = (mode === 'boss') ? 126 : 108; // Quái và Boss to ra 20% (105->126, 90->108) căn giữa sàn đấu
                    drawBossEntity(battleCtx, enemy, enAnimState, enAnimFrame, finalEnX, finalEnY, enemySize);
                } else {
                    let enIdleScaleY = (isEnemyDead || battleEnded) ? 1 : (1 + Math.sin(idleTick + 1) * 0.04);
                    let finalEnRotation = isEnemyDead ? (Math.PI / 2) : enemyRotation;
                    battleCtx.save();
                    battleCtx.translate(finalEnX, finalEnY);
                    battleCtx.rotate(finalEnRotation);
                    battleCtx.scale(1, enIdleScaleY);
                    battleCtx.font = "78px sans-serif"; // To ra 20% (65->78)
                    battleCtx.textAlign = "center";
                    battleCtx.textBaseline = "middle";
                    battleCtx.fillText(enemy.emoji, 0, 0);
                    battleCtx.restore();
                }

                if (!isEnemyDead) drawSpriteStatusFX(battleCtx, enemyStatus, finalEnX, finalEnY, idleTick, (mode === 'boss') ? 168 : 144);

                if (teamSynergy && activeTeam.length === 3 && teamSlots.length === 3) {
                    drawTeamSynergyField(battleCtx, teamSynergy, teamSlots, idleTick);
                }

                activeTeam.forEach((pet, i) => {
                    let isPetDead = teamHpList[i] <= 0;
                    let isAttacking = (attacker && attacker.side === 'team' && attacker.index === i);
                    let isHit = teamHitShake[i] > 0;
                    let knockback = 0;

                    if (isHit) {
                        knockback = -Math.sin(teamHitShake[i] * 1.8) * 8 - 4;
                        teamHitShake[i]--;
                    }

                    let baseSlot = teamSlots[i] || { x: clashLeftX, y: cy };
                    let posY = isPetDead ? (baseSlot.y + 10) : (baseSlot.y + myOffsetsY[i]);
                    let posX = isPetDead ? baseSlot.x : (baseSlot.x + myOffsetsX[i] + knockback);
                    let baseName = pet.name.replace('F1_', '');
                    let hasSprite = isPetSpriteReady(baseName);

                    let animState = (introFrames > 0) ? 'walk' : 'idle';
                    if (isPetDead) animState = 'death';
                    else if (isAttacking) animState = 'attack';
                    else if (isHit) animState = 'hit';

                    let petCfg = spriteConfigs[baseName];
                    let petGrid = petCfg ? getSpriteGrid(petCfg, animState) : { totalFrames: 16 };
                    let pMaxFrames = petGrid.totalFrames || 16;

                    let animFrame = Math.floor(idleTick * 2.4) % pMaxFrames;
                    if (isPetDead) {
                        animFrame = pMaxFrames - 1;
                    } else if (isAttacking) {
                        animFrame = Math.min(pMaxFrames - 1, Math.floor((attacker.step / 18) * pMaxFrames));
                    } else if (isHit) {
                        animFrame = Math.min(pMaxFrames - 1, Math.floor((12 - teamHitShake[i]) * (pMaxFrames / 12)));
                    }

                    // Thú nhỏ lại 30% (Aura 72->50, Sprite 85->60, Emoji 52->36, FX 105->74)
                    if (!isPetDead) drawRarityAura(battleCtx, pet, posX, posY + 30, idleTick, 50);

                    if (hasSprite) {
                        drawPetEntity(battleCtx, pet, animState, animFrame, posX, posY, 60, false);
                    } else {
                        let idleScaleY = (isPetDead || battleEnded) ? 1 : (1 + Math.sin(idleTick + i * 1.2) * 0.04);
                        let petRot = isPetDead ? (-Math.PI / 2) : myRotations[i];
                        battleCtx.save();
                        battleCtx.translate(posX, posY);
                        battleCtx.rotate(petRot);
                        battleCtx.scale(-1, idleScaleY);
                        battleCtx.font = "36px sans-serif";
                        battleCtx.textAlign = "center";
                        battleCtx.textBaseline = "middle";
                        battleCtx.fillText(pet.emoji, 0, 0);
                        battleCtx.restore();
                    }
                    if (!isPetDead) drawSpriteStatusFX(battleCtx, teamStatus[i], posX, posY, idleTick, 74);
                });

                for (let idx = impactEffects.length - 1; idx >= 0; idx--) {
                    let eff = impactEffects[idx];
                    eff.radius += 4.5;
                    eff.alpha -= 0.055;
                    eff.y -= 1.5;

                    if (eff.alpha <= 0) {
                        impactEffects.splice(idx, 1);
                        continue;
                    }

                    battleCtx.save();
                    battleCtx.globalAlpha = Math.max(0, eff.alpha);
                    battleCtx.beginPath();
                    battleCtx.arc(eff.x, eff.y, eff.radius, 0, Math.PI * 2);
                    battleCtx.strokeStyle = eff.color;
                    battleCtx.lineWidth = 3.5;
                    battleCtx.stroke();

                    battleCtx.font = "900 18px sans-serif";
                    battleCtx.fillStyle = eff.color;
                    battleCtx.textAlign = "center";
                    battleCtx.strokeStyle = "#000000";
                    battleCtx.lineWidth = 3;
                    battleCtx.strokeText(eff.text, eff.x, eff.y - 18);
                    battleCtx.fillText(eff.text, eff.x, eff.y - 18);
                    battleCtx.restore();
                }

                let allTeamDead = teamHpList.every(h => h <= 0);
                if ((enemyHp <= 0 || allTeamDead) && !battleEnded) {
                    battleEnded = true;
                    attacker = null;
                    syncBattleHpToTeam();
                    currentBattleSyncFn = null;

                    if (retreatBtn) {
                        retreatBtn.onclick = null;
                        if (origRetreatAttr) retreatBtn.setAttribute('onclick', origRetreatAttr);
                    }

                    setTimeout(() => {
                        clearInterval(battleInterval);
                        if (enemyHp <= 0) {
                            let rewardGold = mode === 'boss' ? 1200 + (bossLevel * 250) : mode === 'tower' ? 300 + (towerFloor * 50) : 350;
                            let rewardDiamond = mode === 'boss' ? 15 : (mode === 'tower' && towerFloor % 5 === 0 ? 5 : 0);
                            playerCoins += rewardGold;
                            playerDiamonds += rewardDiamond;
                            saveGameData();
                            addQuestProgress(2, 1);

                            let diamondNote = rewardDiamond > 0 ? ` và +${rewardDiamond}💎` : '';

                            if (mode === 'tower') {
                                let clearedFloor = towerFloor;
                                towerFloor++;
                                localStorage.setItem('ar_tower_floor', towerFloor);
                                if (typeof renderTowerIdleGuardian === 'function') renderTowerIdleGuardian();

                                // Chu kỳ phần thưởng 10 tầng luân phiên từng loại vật phẩm
                                const cycle = Math.floor((clearedFloor - 1) / 10);
                                const bonusScale = 1 + Math.floor(cycle / 2); // Tăng thêm số lượng ở các tầng cao
                                const stepInCycle = ((clearedFloor - 1) % 10) + 1;
                                const TOWER_FLOOR_ITEMS = [
                                    { key: 'stoneKim',       qty: 1 * bonusScale, label: `${1 * bonusScale} ⚔️ Đá Kim` },
                                    { key: 'stoneMoc',       qty: 1 * bonusScale, label: `${1 * bonusScale} 🌿 Đá Mộc` },
                                    { key: 'stoneThuy',      qty: 1 * bonusScale, label: `${1 * bonusScale} 💧 Đá Thủy` },
                                    { key: 'stoneHoa',       qty: 1 * bonusScale, label: `${1 * bonusScale} 🔥 Đá Hỏa` },
                                    { key: 'stoneTho',       qty: 1 * bonusScale, label: `${1 * bonusScale} 🪨 Đá Thổ` },
                                    { key: 'luckyTicket',    qty: 1,              label: `1 🎟️ Vé Quay May Mắn` },
                                    { key: 'trainer',        qty: 1 * bonusScale, label: `${1 * bonusScale} 🎫 Vé Tập Luyện` },
                                    { key: 'food',           qty: 2 * bonusScale, label: `${2 * bonusScale} 🍖 Thức Ăn` },
                                    { key: 'toy',            qty: 2 * bonusScale, label: `${2 * bonusScale} 🎾 Đồ Chơi` },
                                    { key: 'gearShardChest', qty: 1,              label: `1 🧰 Rương Mảnh Trang Bị` }
                                ];
                                const floorDrop = TOWER_FLOOR_ITEMS[stepInCycle - 1];
                                if (floorDrop && typeof inventory !== 'undefined') {
                                    inventory[floorDrop.key] = (inventory[floorDrop.key] || 0) + floorDrop.qty;
                                    localStorage.setItem('ar_inventory', JSON.stringify(inventory));
                                    if (floorDrop.key === 'luckyTicket' && typeof window.addLuckyTicket === 'function') {
                                        // Đồng bộ HUD vé quay
                                        if (typeof updateGachaHud === 'function') updateGachaHud();
                                    }
                                }
                                saveGameData();
                                if (typeof silentCloudSync === 'function') silentCloudSync(true);

                                const itemRewardText = floorDrop ? ` + ${floorDrop.label}` : '';
                                showInGameConfirm(
                                    `🏆 Chúc mừng! Bạn đã vượt qua Tầng ${clearedFloor} và nhận:\n• +${rewardGold}🪙 Vàng${diamondNote}${itemRewardText}!\n\n🗼 Bạn có muốn tiếp tục khiêu chiến Tầng ${towerFloor} ngay bây giờ không?`,
                                    () => {
                                        startBattle('tower', selectedIndex);
                                    },
                                    () => {
                                        exitBattleScreen();
                                    }
                                );
                                return;
                            } else if (mode === 'boss') {
                                const dealt = Math.max(0, startEnemyHp - Math.max(0, enemyHp));
                                reportDamageToWorldBoss(dealt);
                                bossLevel++;
                                localStorage.setItem('ar_boss_level', bossLevel);
                                saveGameData();

                                const hunterName = localStorage.getItem('ar_cloud_user') || 'Một Thợ Săn';
                                if (window.sendWorldChat) {
                                    window.sendWorldChat(`🏆 [${hunterName}] vừa tung đòn kết liễu hạ gục Boss Thế Giới [${enemy.name}]!`, true);
                                }

                                alert(`🏆 KẾT LIỄU BOSS THẾ GIỚI!\nBạn gây ${dealt.toLocaleString()} sát thương và nhận +${rewardGold}🪙${diamondNote}!`);
                                document.getElementById('battle-screen').classList.add('hidden');
                                switchGameMusic('map');
                                openWorldBossLobby(activeWorldBossRegion);
                                return;
                            } else {
                                alert(`🏆 Chiến thắng vẻ vang! Nhận +${rewardGold}🪙!`);
                            }
                        } else {
                            if (mode === 'boss') {
                                document.getElementById('battle-screen').classList.add('hidden');
                                switchGameMusic('map');
                                onPlayerDefeatedByWorldBoss(Math.max(0, startEnemyHp - Math.max(0, enemyHp)));
                                return;
                            }
                            let fallenList = [];
                            let deadForeverNames = [];

                            activeTeam.forEach(pet => {
                                let realPet = pet._ref || pet;
                                realPet.hearts = Math.max(0, (realPet.hearts || 1) - 1);
                                if (realPet.hearts <= 0) {
                                    deadForeverNames.push(realPet.name);
                                } else if (realPet.hp <= 0) {
                                    fallenList.push(realPet);
                                }
                            });

                            team = team.filter(p => p.hearts > 0);
                            saveGameData();
                            updateTeamCount();

                            if (fallenList.length > 0) {
                                sendDefeatedPetsToHospital(fallenList);
                            } else if (deadForeverNames.length > 0) {
                                alert(`💀 Thất bại!\nLinh thú ${deadForeverNames.join(', ')} đã cạn tim và tử trận vĩnh viễn!`);
                            } else {
                                alert('💀 Thất bại! Đội hình của bạn đã bị đánh bại.');
                            }
                        }
                        exitBattleScreen();
                    }, 1100);
                }
            }, 30);
        }

        function exitBattleScreen() {
            if (typeof currentBattleSyncFn === 'function') {
                currentBattleSyncFn();
                currentBattleSyncFn = null;
            }
            switchGameMusic('map');
            if (battleInterval) clearInterval(battleInterval);
            document.getElementById('battle-screen').classList.add('hidden');
            document.getElementById('map-screen').classList.remove('hidden');
            setTimeout(() => { if (map) map.invalidateSize(); }, 100);
        }


// 3. BOSS THẾ GIỚI 3 MIỀN & SẢNH BOSS MMO (ĐỒNG BỘ SERVER /api/world-boss + TOP SÁT THƯƠNG)
        const WORLD_BOSS_REGIONS = [
            {
                id: 'bac',
                regionName: 'Miền Bắc (Hà Nội)',
                bossName: 'Hỏa Kỳ Lân Bắc Cực',
                spriteKey: 'Rồng Lửa',
                emoji: '🐉',
                lat: 21.0285,
                lng: 105.8542
            },
            {
                id: 'trung',
                regionName: 'Miền Trung (Đà Nẵng)',
                bossName: 'Cửu Đầu Xà Hydra',
                spriteKey: 'Hydra',
                emoji: '🐍',
                lat: 16.0544,
                lng: 108.2272
            },
            {
                id: 'nam',
                regionName: 'Miền Nam (Cần Thơ)',
                bossName: 'Địa Ngục Khuyển Cerberus',
                spriteKey: 'Cerberus',
                emoji: '🐺',
                lat: 10.0342,
                lng: 105.7878
            }
        ];

        const WORLD_BOSS_HOURS = [
            { startHour: 12, endHour: 13 },
            { startHour: 20, endHour: 21 }
        ];

        let worldBossMapMarkers = [];
        let serverWorldBossList = [];
        let wbServerLeaderboard = [];
        let wbCanClaimReward = false;
        let wbMyServerRank = 0;

        function getServerBossRegionState(regionId) {
            if (!Array.isArray(serverWorldBossList)) return null;
            return serverWorldBossList.find(b => b.region_key === regionId) || null;
        }

        function updateWorldBossTopHud() {
            const box = document.getElementById('wb-top-rank-panel');
            if (!box) return;

            const top5 = (wbServerLeaderboard || []).slice(0, 5);
            const rowsHtml = top5.map((r, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                return `<div class="flex justify-between gap-2 text-[10px] leading-tight">
                    <span class="truncate text-zinc-200">${medal} <b>${r.username}</b></span>
                    <span class="text-amber-300 font-bold shrink-0">${Number(r.damage || 0).toLocaleString()}</span>
                </div>`;
            }).join('') || `<div class="text-[10px] text-zinc-400 italic">Chưa có sát thương</div>`;

            const claimBtnHtml = wbCanClaimReward
                ? `<button onclick="claimWorldBossRankReward('${activeWorldBossRegion?.id || 'bac'}')" class="mt-1.5 w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-[10px] py-1 px-2 rounded-lg shadow animate-bounce cursor-pointer">
                       🎁 Nhận Thưởng Top #${wbMyServerRank || '?'}
                   </button>`
                : '';

            box.innerHTML = `
                <div class="text-[10px] font-black text-yellow-300 border-b border-white/15 pb-0.5 mb-1">🏆 TOP SÁT THƯƠNG</div>
                <div class="space-y-0.5">${rowsHtml}</div>
                ${claimBtnHtml}
            `;
        }

        async function fetchWorldBossServerState(forceRender = false, regionIdForRank = null) {
            try {
                const me = (localStorage.getItem('ar_cloud_user') || '').trim();
                const targetReg = regionIdForRank || (wbState.active && activeWorldBossRegion ? activeWorldBossRegion.id : '');
                let qUrl = '/api/world-boss?t=' + Date.now();
                if (targetReg) qUrl += '&region=' + encodeURIComponent(targetReg);
                if (me) qUrl += '&u=' + encodeURIComponent(me);

                const res = await fetch(qUrl, { cache: 'no-store' });
                const data = await res.json();
                if (data.ok && Array.isArray(data.bosses)) {
                    serverWorldBossList = data.bosses;
                    window.serverWorldBossActive = serverWorldBossList.some(b => Number(b.active) === 1);

                    if (targetReg) {
                        wbServerLeaderboard = Array.isArray(data.leaderboard) ? data.leaderboard : [];
                        wbCanClaimReward = !!data.canClaimReward;
                        wbMyServerRank = Number(data.myRank) || 0;
                        if (typeof data.myDamage === 'number' && data.myDamage > (wbState.myTotalDamage || 0)) {
                            wbState.myTotalDamage = data.myDamage;
                        }
                    }

                    // Cập nhật thanh máu & trạng thái thực tế nếu đang đứng trong Sảnh Boss
                    if (wbState.active && activeWorldBossRegion) {
                        const curRow = getServerBossRegionState(activeWorldBossRegion.id);
                        if (curRow) {
                            if (Number(curRow.max_hp) > 0) wbState.maxHp = Number(curRow.max_hp);
                            wbState.hp = Math.max(0, Number(curRow.hp) || 0);
                            const dmgLabel = document.getElementById('wb-top-dmg-label');
                            if (dmgLabel) {
                                const rankTag = wbMyServerRank > 0 ? ` (Hạng #${wbMyServerRank})` : '';
                                dmgLabel.innerText = `Sát thương của bạn: ${(wbState.myTotalDamage || 0).toLocaleString()}${rankTag}`;
                            }
                        }
                        updateWorldBossTopHud();
                    }

                    if (forceRender && typeof map !== 'undefined' && map) {
                        renderWorldBossMarkersOnMap();
                    }
                }
            } catch (e) {}
            return serverWorldBossList;
        }
        window.fetchWorldBossServerState = fetchWorldBossServerState;

        window.claimWorldBossRankReward = async function(regionId) {
            const me = (localStorage.getItem('ar_cloud_user') || '').trim();
            if (!me) return alert('⚠️ Bạn cần đăng nhập Tài Khoản Mây để nhận thưởng!');
            try {
                const res = await fetch('/api/world-boss', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'claim_reward',
                        regionKey: regionId,
                        username: me
                    })
                });
                const data = await res.json();
                if (!res.ok || !data.ok) {
                    alert('❌ ' + (data.error || 'Không thể nhận thưởng Boss!'));
                    return;
                }

                const rw = data.rewards || {};
                if (typeof playerCoins !== 'undefined') playerCoins += Number(rw.coins) || 0;
                if (typeof playerDiamonds !== 'undefined') playerDiamonds += Number(rw.diamonds) || 0;
                if (typeof inventory !== 'undefined') {
                    const stAdd = Number(rw.stonesPerElem) || 1;
                    for (const sk of ['stoneKim', 'stoneMoc', 'stoneThuy', 'stoneHoa', 'stoneTho']) {
                        inventory[sk] = (inventory[sk] || 0) + stAdd;
                    }
                    inventory.gearShardChest = (inventory.gearShardChest || 0) + (Number(rw.gearChestCount) || 1);
                    localStorage.setItem('ar_inventory', JSON.stringify(inventory));
                }
                if (typeof saveGameData === 'function') saveGameData();

                wbCanClaimReward = false;
                updateWorldBossTopHud();

                const killerNote = data.isKiller ? '\n🗡️ Thưởng thêm Đòn Kết Liễu: +1.000🪙 & +10💎!' : '';
                alert(
                    `🏆 PHẦN THƯỞNG TOP #${data.rank} BOSS THẾ GIỚI!\n\n` +
                    `• +${Number(rw.coins || 0).toLocaleString()}🪙 Vàng\n` +
                    `• +${Number(rw.diamonds || 0)}💎 Kim Cương\n` +
                    `• +${rw.stonesPerElem || 1} Đá Ngũ Hành mỗi hệ\n` +
                    `• +${rw.gearChestCount || 1} Rương Mảnh Trang Bị${killerNote}`
                );

                await fetchWorldBossServerState(true, regionId);
                const modalTitle = document.querySelector('#modal-content h3');
                if (modalTitle && modalTitle.textContent.includes('Boss Thế Giới')) {
                    openWorldBossMenu();
                }
            } catch (err) {
                alert('❌ Lỗi kết nối khi nhận thưởng: ' + err.message);
            }
        };

        function isWorldBossScheduleOpen() {
            const h = new Date().getHours();
            return WORLD_BOSS_HOURS.some(slot => h >= slot.startHour && h < slot.endHour);
        }

        function isWorldBossRegionOpen(regionId) {
            const row = getServerBossRegionState(regionId);
            if (row) {
                if (Number(row.active) === 1 && Number(row.hp) > 0) return true;
                if (Number(row.active) === 0 && (row.opened_by || row.spawn_id) && (Date.now() - Number(row.updated_at || 0) < 7200000)) {
                    return false;
                }
            }
            if (window.serverWorldBossActive === true) return true;
            return isWorldBossScheduleOpen();
        }

        function isWorldBossActiveNow() {
            return WORLD_BOSS_REGIONS.some(r => isWorldBossRegionOpen(r.id));
        }
        window.isWorldBossActiveNow = isWorldBossActiveNow;

        function getNextWorldBossTimeText() {
            const h = new Date().getHours();
            const nextSlot = WORLD_BOSS_HOURS.find(s => h < s.startHour) || WORLD_BOSS_HOURS[0];
            return `${String(nextSlot.startHour).padStart(2, '0')}:00 - ${String(nextSlot.endHour).padStart(2, '0')}:00`;
        }

        function renderWorldBossMarkersOnMap() {
            if (!map) return;
            worldBossMapMarkers.forEach(m => map.removeLayer(m));
            worldBossMapMarkers = [];

            WORLD_BOSS_REGIONS.forEach(region => {
                if (!isWorldBossRegionOpen(region.id)) return;

                const row = getServerBossRegionState(region.id);
                const displayBossName = (row && row.boss_name) ? row.boss_name : region.bossName;

                const bossIcon = L.divIcon({
                    className: 'leaflet-div-icon',
                    html: `
                    <div onclick="enterRegionalWorldBoss('${region.id}')" class="flex flex-col items-center cursor-pointer pointer-events-auto animate-bounce" style="width: 120px;">
                        <div class="bg-red-950/95 border-2 border-yellow-400 text-yellow-300 text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap">
                            🔥 ${region.regionName}
                        </div>
                        <div class="text-4xl drop-shadow-[0_0_12px_rgba(239,68,68,0.95)] mt-0.5">${region.emoji}</div>
                        <div class="bg-black/85 text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-red-500/60 whitespace-nowrap">
                            ${displayBossName}
                        </div>
                    </div>`,
                    iconSize: [120, 75],
                    iconAnchor: [60, 45]
                });

                const marker = L.marker([region.lat, region.lng], { icon: bossIcon, zIndexOffset: 1100 }).addTo(map);
                marker.on('click', (e) => {
                    if (e && e.originalEvent) L.DomEvent.stopPropagation(e);
                    enterRegionalWorldBoss(region.id);
                });
                worldBossMapMarkers.push(marker);
            });
        }

        setInterval(() => {
            fetchWorldBossServerState(true);
        }, 10000);
        setTimeout(() => fetchWorldBossServerState(true), 1500);

        async function openWorldBossMenu() {
            const modal = document.getElementById('modal-container');
            const content = document.getElementById('modal-content');
            modal.classList.remove('hidden');

            content.innerHTML = `<div class="text-center py-8 text-amber-300 font-bold animate-pulse">🔥 Đang đồng bộ Boss 3 Miền & BXH Sát Thương...</div>`;
            await fetchWorldBossServerState(true, 'bac');

            // Kiểm tra xem có miền nào Boss vừa bị tiêu diệt mà người chơi có quà chưa nhận không
            let pendingRewardHtml = '';
            for (const r of WORLD_BOSS_REGIONS) {
                const checkRes = await fetch(`/api/world-boss?region=${r.id}&u=${encodeURIComponent(localStorage.getItem('ar_cloud_user') || '')}&t=${Date.now()}`).then(x => x.json()).catch(() => null);
                if (checkRes && checkRes.ok && checkRes.canClaimReward) {
                    pendingRewardHtml += `
                    <div class="bg-amber-950/80 border-2 border-yellow-400 rounded-xl p-2.5 mb-2.5 flex items-center justify-between gap-2">
                        <div class="text-xs text-yellow-200 font-bold">
                            🏆 Bạn đạt <b>Top #${checkRes.myRank}</b> sát thương tại <b>${r.regionName}</b>!
                        </div>
                        <button onclick="claimWorldBossRankReward('${r.id}')" class="bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs px-3 py-1.5 rounded-lg cursor-pointer shrink-0 shadow">
                            🎁 Nhận Quà
                        </button>
                    </div>`;
                }
            }

            const isOpen = isWorldBossActiveNow();
            const statusHtml = isOpen
                ? `<div class="bg-emerald-950/80 border border-emerald-400/60 text-emerald-300 text-xs font-extrabold px-3 py-2 rounded-xl text-center mb-3 animate-pulse">
                       🔥 BOSS THẾ GIỚI ĐANG XUẤT HIỆN TRÊN BẢN ĐỒ!
                   </div>`
                : `<div class="bg-zinc-800/90 border border-amber-500/40 text-amber-300 text-xs font-bold px-3 py-2.5 rounded-xl text-center mb-3">
                       ⏳ Chưa tới giờ Boss xuất hiện!<br>
                       <span class="text-[11px] text-zinc-300">Khung giờ kế tiếp: <b class="text-yellow-300">${getNextWorldBossTimeText()}</b> (12:00 & 20:00)</span>
                   </div>`;

            let regionsHtml = WORLD_BOSS_REGIONS.map(r => {
                const regionOpen = isWorldBossRegionOpen(r.id);
                const row = getServerBossRegionState(r.id);
                const bName = (row && row.boss_name) ? row.boss_name : r.bossName;
                const hpInfo = (regionOpen && row && Number(row.max_hp) > 0)
                    ? `<div class="text-[10px] text-rose-300 font-bold">❤️ HP: ${Number(row.hp).toLocaleString()} / ${Number(row.max_hp).toLocaleString()}</div>`
                    : '';

                return `
                <div class="bg-zinc-800/90 border border-red-500/40 p-3 rounded-xl flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <span class="text-3xl shrink-0">${r.emoji}</span>
                        <div class="min-w-0">
                            <div class="text-xs font-black text-yellow-300 truncate">${bName}</div>
                            <div class="text-[10px] text-zinc-300">📍 Khu vực: ${r.regionName}</div>
                            ${hpInfo}
                        </div>
                    </div>
                    ${regionOpen
                        ? `<div class="flex flex-col gap-1 shrink-0">
                               <button onclick="closeModal(); enterRegionalWorldBoss('${r.id}');" class="bg-gradient-to-r from-red-600 to-amber-600 hover:brightness-110 text-white px-3 py-1.5 rounded-lg text-[11px] font-black cursor-pointer shadow">
                                   ⚔️ Vào Sảnh
                               </button>
                               <button onclick="closeModal(); focusWorldBossOnMap('${r.id}');" class="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer">
                                   📍 Xem Map
                               </button>
                           </div>`
                        : `<span class="text-[10px] font-bold text-zinc-500 px-2 py-1 bg-zinc-900 rounded-lg shrink-0">Đang ẩn</span>`
                    }
                </div>`;
            }).join('');

            content.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h3 class="font-bold text-base text-red-400">👹 Boss Thế Giới 3 Miền</h3>
                <button onclick="closeModal()" class="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full font-bold text-sm cursor-pointer border border-zinc-600">✕</button>
            </div>
            ${pendingRewardHtml}
            ${statusHtml}
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-3">${regionsHtml}</div>
            <div class="text-[10px] text-zinc-400 text-center">
                🎁 Hạ gục Boss chia thưởng theo <b>Top Sát Thương</b>: Rương Mảnh Trang Bị, Đá Ngũ Hành, Kim Cương & Vàng!
            </div>`;
        }

        window.focusWorldBossOnMap = function(regionId) {
            const region = WORLD_BOSS_REGIONS.find(r => r.id === regionId);
            if (!region) return;
            document.getElementById('home-screen')?.classList.add('hidden');
            document.getElementById('map-screen')?.classList.remove('hidden');
            if (typeof initMap === 'function') initMap();
            setTimeout(() => {
                if (map) {
                    map.invalidateSize();
                    renderWorldBossMarkersOnMap();
                    map.setView([region.lat, region.lng], 17);
                }
            }, 120);
        };

        window.enterRegionalWorldBoss = async function(regionId) {
            await fetchWorldBossServerState(false, regionId);
            if (!isWorldBossRegionOpen(regionId)) {
                alert(`⏳ Boss Thế Giới khu vực này hiện chưa mở hoặc đã bị hạ gục!\nKhung giờ kế tiếp: ${getNextWorldBossTimeText()}`);
                renderWorldBossMarkersOnMap();
                return;
            }
            const region = WORLD_BOSS_REGIONS.find(r => r.id === regionId);
            if (!region) return;
            activeWorldBossRegion = region;
            openWorldBossLobby(region);
        };

        // ==========================================
        // SẢNH BOSS THẾ GIỚI MMO (VẠCH NGANG & CHỜ XUẤT PHÁT)
        // ==========================================
        let activeWorldBossRegion = null;
        let wbPresenceTimer = null;

        let wbState = {
            active: false,
            loopId: null,
            hp: 35000,
            maxHp: 35000,
            myTotalDamage: 0,
            respawnEndTime: 0,
            respawnDuration: 10000,
            playerX: 500,
            playerY: 880,
            targetX: 500,
            targetY: 880,
            playerDir: 'up',
            spawnX: 500,
            spawnY: 880,
            gateLineY: 740,
            bossX: 500,
            bossY: 360,
            otherPlayers: []
        };

        async function reportDamageToWorldBoss(damageDealt) {
            const dmg = Math.max(0, Math.floor(Number(damageDealt) || 0));
            if (dmg <= 0) return;
            wbState.myTotalDamage = (wbState.myTotalDamage || 0) + dmg;
            wbState.hp = Math.max(0, (wbState.hp || 0) - dmg);

            const dmgLabel = document.getElementById('wb-top-dmg-label');
            if (dmgLabel) {
                dmgLabel.innerText = `Sát thương của bạn: ${wbState.myTotalDamage.toLocaleString()}`;
            }

            if (activeWorldBossRegion) {
                try {
                    const res = await fetch('/api/world-boss', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'damage',
                            regionKey: activeWorldBossRegion.id,
                            damage: dmg,
                            username: localStorage.getItem('ar_cloud_user') || ''
                        })
                    });
                    const data = await res.json();
                    if (data.ok && Array.isArray(data.bosses)) {
                        serverWorldBossList = data.bosses;
                        const curRow = getServerBossRegionState(activeWorldBossRegion.id);
                        if (curRow) {
                            wbState.hp = Math.max(0, Number(curRow.hp) || 0);
                            if (Number(curRow.max_hp) > 0) wbState.maxHp = Number(curRow.max_hp);
                        }
                    }
                    await fetchWorldBossServerState(true, activeWorldBossRegion.id);
                } catch (e) {}
            }
        }
        window.reportDamageToWorldBoss = reportDamageToWorldBoss;

        window.triggerWorldBossFight = function() {
            if (wbState.hp <= 0) {
                alert('🎉 Boss khu vực này đã bị hạ gục! Hãy bấm Nhận Thưởng Top Sát Thương ở góc trên.');
                return;
            }
            if (Date.now() < wbState.respawnEndTime) {
                const remain = Math.ceil((wbState.respawnEndTime - Date.now()) / 1000);
                alert(`⏳ Đội hình đang hồi sức sau khi bị đánh gục! Chờ ${remain}s nữa để xuất kích.`);
                return;
            }
            if (!team || team.length < 3) {
                alert('⚠️ Boss Thế Giới yêu cầu đội hình đủ 3 linh thú (3vs1)!\nHãy vào Túi / Trang Trại để xếp đủ 3 thú vào đội.');
                return;
            }
            const alivePets = team.filter(p => p && p.hp > 0);
            if (alivePets.length === 0) {
                alert('⚠️ Tất cả linh thú trong đội đã cạn HP! Hãy hồi phục trước khi khiêu chiến Boss.');
                return;
            }
            startBattle('boss', 0);
        };
        window.startWorldBossBattle = window.triggerWorldBossFight;

        window.onPlayerDefeatedByWorldBoss = function(damageDealt = 0) {
            if (damageDealt > 0) {
                reportDamageToWorldBoss(damageDealt);
            }
            team.forEach(p => {
                if (p && p.hp <= 0) p.hp = Math.max(1, Math.floor((p.maxHp || 100) * 0.25));
            });
            saveGameData();

            wbState.respawnDuration = 10000;
            wbState.respawnEndTime = Date.now() + wbState.respawnDuration;
            wbState.playerX = wbState.spawnX;
            wbState.playerY = wbState.spawnY;
            wbState.targetX = wbState.spawnX;
            wbState.targetY = wbState.spawnY;

            openWorldBossLobby(activeWorldBossRegion);
            alert(`💀 Đội hình bị Boss đánh gục!\nBạn đã gây ${Math.floor(damageDealt).toLocaleString()} sát thương. Chờ 10 giây tại vạch xuất phát để tiếp tục tấn công!`);
        };

        const wbBgImg = new Image();
        wbBgImg.onerror = () => {
            if (!wbBgImg.dataset.fallback) {
                wbBgImg.dataset.fallback = '1';
                wbBgImg.src = './battle-bg.webp';
            }
        };
        wbBgImg.src = './boss-lobby-bg.webp';

        const wbHunterSheets = {
            Nam: { idle: new Image(), walk: new Image() },
            Nữ:  { idle: new Image(), walk: new Image() }
        };
        wbHunterSheets.Nam.idle.src = 'assets/char_nam_idle.webp';
        wbHunterSheets.Nam.walk.src = 'assets/char_nam_walk.webp';
        wbHunterSheets.Nữ.idle.src  = 'assets/char_nu_idle.webp';
        wbHunterSheets.Nữ.walk.src  = 'assets/char_nu_walk.webp';

        const WB_DIR_ROW = { down: 0, left: 1, right: 2, up: 3 };

        async function syncWorldBossLobbyPlayers() {
            if (!wbState.active) return;
            const myUser = (localStorage.getItem('ar_cloud_user') || '').trim();
            if (!myUser) return;

            try {
                const res = await fetch('/api/presence', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'world_boss',
                        username: myUser,
                        gender: localStorage.getItem('ar_cloud_gender') === 'Nữ' ? 'Nữ' : 'Nam',
                        bossId: activeWorldBossRegion?.id || activeWorldBossRegion?.bossName || 'default',
                        x: wbState.playerX,
                        y: wbState.playerY,
                        dir: wbState.playerDir || 'up',
                        leadPet: (typeof team !== 'undefined' && team[0]) ? team[0].name : ''
                    })
                });
                const data = await res.json();
                if (data.ok && Array.isArray(data.players)) {
                    const prevMap = new Map(wbState.otherPlayers.map(p => [p.name, p]));
                    wbState.otherPlayers = data.players.map(p => {
                        const old = prevMap.get(p.name);
                        return {
                            ...p,
                            renderX: old && typeof old.renderX === 'number' ? old.renderX : p.x,
                            renderY: old && typeof old.renderY === 'number' ? old.renderY : p.y
                        };
                    });

                    const onlineEl = document.getElementById('wb-online-count');
                    if (onlineEl) {
                        onlineEl.innerText = `👥 ${wbState.otherPlayers.length + 1}`;
                    }
                }
            } catch (e) {}
        }

        function startWorldBossLobbySync() {
            if (wbPresenceTimer) clearInterval(wbPresenceTimer);
            syncWorldBossLobbyPlayers();
            if (activeWorldBossRegion) {
                fetchWorldBossServerState(false, activeWorldBossRegion.id);
            }
            let wbRankPollTick = 0;
            wbPresenceTimer = setInterval(() => {
                if (!wbState.active) {
                    clearInterval(wbPresenceTimer);
                    wbPresenceTimer = null;
                    return;
                }
                syncWorldBossLobbyPlayers();
                wbRankPollTick++;
                // Tối ưu D1: Cập nhật BXH DPS và máu server mỗi 6 giây (4 nhịp x 1.5s) thay vì mỗi 1.5s
                if (wbRankPollTick % 4 === 0) {
                    fetchWorldBossServerState(false, activeWorldBossRegion?.id || null);
                }
            }, 1500);
        }

        function drawWorldBossHunter(ctx, x, y, gender, isWalking, dir, labelText, isSelf, tick) {
            const gKey = gender === 'Nữ' ? 'Nữ' : 'Nam';
            const stateKey = isWalking ? 'walk' : 'idle';
            const img = wbHunterSheets[gKey]?.[stateKey];

            ctx.save();
            ctx.beginPath();
            ctx.ellipse(x, y + 24, 15, 6, 0, 0, Math.PI * 2);
            ctx.fillStyle = isSelf ? 'rgba(250, 204, 21, 0.38)' : 'rgba(56, 189, 248, 0.30)';
            ctx.fill();
            ctx.strokeStyle = isSelf ? '#facc15' : '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();

            if (img && img.complete && img.naturalWidth > 0) {
                const cols = 10;
                const rows = 4;
                const fw = img.naturalWidth / cols;
                const fh = img.naturalHeight / rows;
                const col = Math.floor(tick * (isWalking ? 1.8 : 1.0)) % cols;
                const row = WB_DIR_ROW[dir] ?? 0;

                const drawW = 38;
                const drawH = 62;
                ctx.drawImage(
                    img,
                    col * fw, row * fh, fw, fh,
                    x - drawW / 2, y - drawH + 24, drawW, drawH
                );
            } else {
                ctx.font = '26px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(gKey === 'Nữ' ? '👧' : '👦', x, y);
            }

            ctx.save();
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            const textW = ctx.measureText(labelText).width;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
            ctx.fillRect(x - textW / 2 - 6, y - 54, textW + 12, 16);
            ctx.strokeStyle = isSelf ? '#facc15' : (gKey === 'Nữ' ? '#f472b6' : '#38bdf8');
            ctx.lineWidth = 1;
            ctx.strokeRect(x - textW / 2 - 6, y - 54, textW + 12, 16);

            ctx.fillStyle = isSelf ? '#fef08a' : '#f4f4f5';
            ctx.fillText(labelText, x, y - 42);
            ctx.restore();
        }

        window.openWorldBossLobby = function(regionData) {
            if (regionData && typeof regionData === 'object') {
                activeWorldBossRegion = regionData;
            }
            if (!activeWorldBossRegion && WORLD_BOSS_REGIONS.length > 0) {
                activeWorldBossRegion = WORLD_BOSS_REGIONS[0];
            }

            const screen = document.getElementById('world-boss-screen');
            if (!screen) return;

            document.getElementById('home-screen')?.classList.add('hidden');
            document.getElementById('map-screen')?.classList.add('hidden');
            screen.classList.remove('hidden');

            // Tạo khung BXH Top Sát Thương nổi góc phải trên sân đấu nếu chưa có
            const arenaWrap = document.getElementById('world-boss-canvas')?.parentElement;
            if (arenaWrap && !document.getElementById('wb-top-rank-panel')) {
                const panel = document.createElement('div');
                panel.id = 'wb-top-rank-panel';
                panel.className = 'absolute top-2.5 right-2.5 z-20 w-44 bg-black/75 backdrop-blur-sm border border-amber-400/50 rounded-xl p-2 shadow-xl';
                arenaWrap.appendChild(panel);
            }

            const serverRow = activeWorldBossRegion ? getServerBossRegionState(activeWorldBossRegion.id) : null;
            if (serverRow) {
                if (Number(serverRow.max_hp) > 0) wbState.maxHp = Number(serverRow.max_hp);
                wbState.hp = Math.max(0, Number(serverRow.hp) || 0);
            } else if (!wbState.hp || wbState.hp <= 0) {
                wbState.maxHp = 35000;
                wbState.hp = 35000;
            }

            const bossDisplayName = (serverRow && serverRow.boss_name)
                ? serverRow.boss_name
                : (activeWorldBossRegion?.bossName || 'BOSS THẾ GIỚI');

            const headerEl = document.getElementById('wb-header-title');
            if (headerEl) {
                headerEl.innerHTML = `${activeWorldBossRegion?.emoji || '🔥'} ${bossDisplayName.toUpperCase()} (CẤP <span id="wb-boss-lv">${bossLevel}</span>)`;
            }
            const dmgLabel = document.getElementById('wb-top-dmg-label');
            if (dmgLabel) {
                dmgLabel.innerText = `Sát thương của bạn: ${(wbState.myTotalDamage || 0).toLocaleString()}`;
            }

            wbState.active = true;
            wbState.playerX = wbState.spawnX;
            wbState.playerY = wbState.spawnY;
            wbState.targetX = wbState.spawnX;
            wbState.targetY = wbState.spawnY;
            wbState.playerDir = 'up';
            wbState.otherPlayers = [];

            const canvas = document.getElementById('world-boss-canvas');
            if (canvas && !canvas.dataset.boundTap) {
                canvas.dataset.boundTap = '1';
                canvas.addEventListener('pointerdown', (e) => {
                    if (!wbState.active) return;
                    const rect = canvas.getBoundingClientRect();
                    const nx = ((e.clientX - rect.left) / rect.width) * 1000;
                    const ny = ((e.clientY - rect.top) / rect.height) * 1000;

                    const isWaiting = Date.now() < wbState.respawnEndTime;
                    wbState.targetX = Math.max(60, Math.min(940, nx));
                    wbState.targetY = isWaiting
                        ? Math.max(wbState.gateLineY + 25, Math.min(950, ny))
                        : Math.max(180, Math.min(950, ny));

                    const clickBossDist = Math.hypot(nx - wbState.bossX, ny - wbState.bossY);
                    if (!isWaiting && wbState.hp > 0 && clickBossDist <= 140) {
                        const playerDist = Math.hypot(wbState.playerX - wbState.bossX, wbState.playerY - wbState.bossY);
                        if (playerDist <= 220) {
                            triggerWorldBossFight();
                        } else {
                            wbState.targetX = wbState.bossX;
                            wbState.targetY = wbState.bossY + 115;
                        }
                    }
                });
            }

            updateWorldBossTopHud();
            startWorldBossLobbySync();
            if (wbState.loopId) cancelAnimationFrame(wbState.loopId);
            renderWorldBossLoop();
        };

        window.exitWorldBossLobby = function() {
            wbState.active = false;
            if (wbState.loopId) {
                cancelAnimationFrame(wbState.loopId);
                wbState.loopId = null;
            }
            if (wbPresenceTimer) {
                clearInterval(wbPresenceTimer);
                wbPresenceTimer = null;
            }
            wbState.otherPlayers = [];

            document.getElementById('world-boss-screen')?.classList.add('hidden');
            const mapScreen = document.getElementById('map-screen');
            if (mapScreen) {
                mapScreen.classList.remove('hidden');
                if (typeof map !== 'undefined' && map) setTimeout(() => map.invalidateSize(), 100);
            }
        };

        function renderWorldBossLoop() {
            if (!wbState.active) return;
            const canvas = document.getElementById('world-boss-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');

            if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
                canvas.width = canvas.clientWidth;
                canvas.height = canvas.clientHeight;
            }
            const W = canvas.width;
            const H = canvas.height;
            const toPxX = nx => (nx / 1000) * W;
            const toPxY = ny => (ny / 1000) * H;

            const now = Date.now();
            const tick = now / 95;
            const isWaiting = now < wbState.respawnEndTime;

            const banner = document.getElementById('wb-respawn-banner');
            if (banner) {
                if (isWaiting) {
                    const remainMs = wbState.respawnEndTime - now;
                    const pct = Math.min(100, ((wbState.respawnDuration - remainMs) / wbState.respawnDuration) * 100);
                    banner.classList.remove('hidden');
                    const timerEl = document.getElementById('wb-respawn-timer');
                    const progEl = document.getElementById('wb-respawn-progress');
                    if (timerEl) timerEl.innerText = `${Math.ceil(remainMs / 1000)}s`;
                    if (progEl) progEl.style.width = `${pct}%`;
                } else {
                    banner.classList.add('hidden');
                }
            }

            const hpBarEl = document.getElementById('wb-hp-bar');
            const hpTxtEl = document.getElementById('wb-hp-text');
            if (hpBarEl) hpBarEl.style.width = `${Math.max(0, (wbState.hp / wbState.maxHp) * 100)}%`;
            if (hpTxtEl) {
                hpTxtEl.innerText = wbState.hp > 0
                    ? `${wbState.hp.toLocaleString()} / ${wbState.maxHp.toLocaleString()} HP`
                    : `💀 BOSS ĐÃ BỊ HẠ GỤC (0 / ${wbState.maxHp.toLocaleString()} HP)`;
            }

            const dx = wbState.targetX - wbState.playerX;
            const dy = wbState.targetY - wbState.playerY;
            const dist = Math.hypot(dx, dy);
            let isPlayerWalking = false;

            if (dist > 4) {
                isPlayerWalking = true;
                const speed = 6.5;
                let nextY = wbState.playerY + (dy / dist) * speed;
                if (isWaiting && nextY < wbState.gateLineY + 25) {
                    nextY = wbState.gateLineY + 25;
                }
                wbState.playerX += (dx / dist) * speed;
                wbState.playerY = nextY;

                if (Math.abs(dx) > Math.abs(dy)) {
                    wbState.playerDir = dx >= 0 ? 'right' : 'left';
                } else {
                    wbState.playerDir = dy >= 0 ? 'down' : 'up';
                }
            } else if (!wbState.playerDir) {
                wbState.playerDir = 'up';
            }

            const distToBoss = Math.hypot(wbState.playerX - wbState.bossX, wbState.playerY - wbState.bossY);
            const atkBtn = document.getElementById('wb-attack-btn');
            if (atkBtn) {
                if (!isWaiting && wbState.hp > 0 && distToBoss <= 220) atkBtn.classList.remove('hidden');
                else atkBtn.classList.add('hidden');
            }

            ctx.clearRect(0, 0, W, H);

            if (wbBgImg.complete && wbBgImg.naturalWidth > 0) {
                const imgRatio = wbBgImg.naturalWidth / wbBgImg.naturalHeight;
                const canvasRatio = W / H;
                let drawW = W, drawH = H, offsetX = 0, offsetY = 0;
                if (canvasRatio > imgRatio) {
                    drawH = W / imgRatio;
                    offsetY = (H - drawH) / 2;
                } else {
                    drawW = H * imgRatio;
                    offsetX = (W - drawW) / 2;
                }
                ctx.drawImage(wbBgImg, offsetX, offsetY, drawW, drawH);
                ctx.fillStyle = 'rgba(9, 9, 11, 0.25)';
                ctx.fillRect(0, 0, W, H);
            } else {
                const bgGrad = ctx.createRadialGradient(W / 2, H * 0.35, 30, W / 2, H * 0.5, H * 0.85);
                bgGrad.addColorStop(0, '#450a0a');
                bgGrad.addColorStop(0.55, '#18181b');
                bgGrad.addColorStop(1, '#09090b');
                ctx.fillStyle = bgGrad;
                ctx.fillRect(0, 0, W, H);
            }

            const gateY = toPxY(wbState.gateLineY);
            ctx.fillStyle = isWaiting ? 'rgba(239, 68, 68, 0.16)' : 'rgba(16, 185, 129, 0.08)';
            ctx.fillRect(0, gateY, W, H - gateY);

            ctx.save();
            ctx.beginPath();
            ctx.setLineDash([14, 8]);
            ctx.moveTo(0, gateY);
            ctx.lineTo(W, gateY);
            ctx.lineWidth = 3;
            ctx.strokeStyle = isWaiting ? '#ef4444' : '#10b981';
            ctx.stroke();
            ctx.restore();

            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = isWaiting ? '#fca5a5' : '#6ee7b7';
            ctx.fillText(
                isWaiting ? '⛔ VẠCH CHỜ XUẤT PHÁT (CHƯA HẾT THỜI GIAN CHỜ)' : '✅ VẠCH XUẤT PHÁT (CHẠM LÊN BOSS ĐỂ XUẤT KÍCH)',
                W / 2,
                gateY + 18
            );

            ctx.beginPath();
            ctx.ellipse(toPxX(wbState.spawnX), toPxY(wbState.spawnY) + 18, 34, 12, 0, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
            ctx.lineWidth = 2;
            ctx.stroke();

            const bx = toPxX(wbState.bossX);
            const by = toPxY(wbState.bossY);
            const pulse = Math.sin(now / 240) * 6;

            ctx.save();
            ctx.beginPath();
            ctx.ellipse(bx, by + 48, 86 + pulse, 28 + pulse * 0.3, 0, 0, Math.PI * 2);
            ctx.fillStyle = wbState.hp > 0 ? 'rgba(239, 68, 68, 0.22)' : 'rgba(16, 185, 129, 0.22)';
            ctx.fill();
            ctx.strokeStyle = wbState.hp > 0 ? 'rgba(248, 113, 113, 0.85)' : '#34d399';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.restore();

            const bossSpriteKey = activeWorldBossRegion?.spriteKey || 'Rồng Lửa';
            if (typeof drawBossEntity === 'function' && typeof bossSpriteConfigs !== 'undefined' && bossSpriteConfigs?.[bossSpriteKey]) {
                const bossState = wbState.hp > 0 ? 'idle' : 'death';
                const bossFrame = wbState.hp > 0 ? Math.floor(tick * 1.1) : 7;
                drawBossEntity(ctx, { spriteKey: bossSpriteKey, emoji: activeWorldBossRegion?.emoji || '🐉' }, bossState, bossFrame, bx, by, 126);
            } else {
                ctx.font = '82px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(wbState.hp > 0 ? (activeWorldBossRegion?.emoji || '🐉') : '💀', bx, by);
            }

            const serverRow = activeWorldBossRegion ? getServerBossRegionState(activeWorldBossRegion.id) : null;
            const bNameDisplay = (serverRow && serverRow.boss_name) ? serverRow.boss_name : (activeWorldBossRegion?.bossName || 'BOSS THẾ GIỚI');
            const bossTitle = wbState.hp > 0 ? `🔥 ${bNameDisplay} (Chạm để đánh)` : `🏆 ${bNameDisplay} (ĐÃ BỊ HẠ GỤC)`;
            ctx.save();
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            const bTitleW = ctx.measureText(bossTitle).width;
            ctx.fillStyle = 'rgba(69, 10, 10, 0.85)';
            ctx.fillRect(bx - bTitleW / 2 - 8, by - 88, bTitleW + 16, 20);
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(bx - bTitleW / 2 - 8, by - 88, bTitleW + 16, 20);
            ctx.fillStyle = '#fde047';
            ctx.fillText(bossTitle, bx, by - 74);
            ctx.restore();

            wbState.otherPlayers.forEach((op, idx) => {
                if (typeof op.renderX !== 'number') {
                    op.renderX = op.x ?? 500;
                    op.renderY = op.y ?? 700;
                }
                const targetX = op.x ?? op.renderX;
                const targetY = op.y ?? op.renderY;
                const moveDx = targetX - op.renderX;
                const moveDy = targetY - op.renderY;
                const isMoving = Math.hypot(moveDx, moveDy) > 2;

                if (isMoving) {
                    op.renderX += moveDx * 0.18;
                    op.renderY += moveDy * 0.18;
                }

                const ox = toPxX(op.renderX);
                const oy = toPxY(op.renderY);
                drawWorldBossHunter(
                    ctx,
                    ox,
                    oy,
                    op.gender || 'Nam',
                    isMoving,
                    op.dir || 'up',
                    op.name,
                    false,
                    tick + idx * 3
                );
            });

            const myGender = localStorage.getItem('ar_cloud_gender') === 'Nữ' ? 'Nữ' : 'Nam';
            const myName = localStorage.getItem('ar_cloud_user') || 'BẠN';
            const px = toPxX(wbState.playerX);
            const py = toPxY(wbState.playerY);
            drawWorldBossHunter(ctx, px, py, myGender, isPlayerWalking, wbState.playerDir || 'up', `⭐ ${myName}`, true, tick);

            wbState.loopId = requestAnimationFrame(renderWorldBossLoop);
        }


// Gắn các hàm chiến đấu ra phạm vi toàn cục (window)
window.openTowerMenu = openTowerMenu;
window.closeTowerScreen = closeTowerScreen;
window.openArenaMenu = openArenaMenu;
window.startBattle = startBattle;
window.exitBattleScreen = exitBattleScreen;
window.renderWorldBossMarkersOnMap = renderWorldBossMarkersOnMap;
window.openWorldBossMenu = openWorldBossMenu;
window.triggerWorldBossFight = triggerWorldBossFight;
window.startWorldBossBattle = startWorldBossBattle;
