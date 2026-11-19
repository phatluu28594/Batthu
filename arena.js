// ============================================================================
// BẮT THÚ VƯƠNG - MODULE CHIẾN ĐẤU THÁP, BOSS THẾ GIỚI & ĐẤU TRƯỜNG (arena.js)
// Tách trực tiếp từ index.html: Tháp Vô Tận, Boss 3 Miền MMO, Đấu Trường ATB 1vs1 / 3vs1
// ============================================================================

// 1. THÁP VÔ TẬN (TOWER)
        function openTowerMenu() {
            checkPetSurvival();
            let gateTag = document.getElementById('tower-gate-floor');
            if (gateTag) gateTag.innerText = towerFloor;
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
            // 1. Tìm đồng minh còn sống (HP > 0) có lượng HP hiện tại thấp nhất (và chưa đầy máu)
            let lowestIdx = -1;
            let lowestHp = Infinity;
            activeTeam.forEach((ally, idx) => {
                const curHp = teamHpList[idx];
                if (curHp > 0 && curHp < ally.maxHp && curHp < lowestHp) {
                    lowestHp = curHp;
                    lowestIdx = idx;
                }
            });

            if (lowestIdx === -1) return false; // Cả đội đều đang đầy máu -> không buff thừa

            // 2. Hồi máu = x2 lần sát thương (atk) của thú thi triển
            const healAmount = Math.max(1, Math.floor((caster.atk || 10) * 2));
            const targetPet = activeTeam[lowestIdx];
            const oldHp = teamHpList[lowestIdx];
            teamHpList[lowestIdx] = Math.min(targetPet.maxHp, oldHp + healAmount);
            const actualHealed = Math.floor(teamHpList[lowestIdx] - oldHp);

            if (actualHealed <= 0) return false;

            // 3. Hiện vòng sáng hồi phục & số xanh +HP bay lên ngay trên đầu thú được hồi
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
        // ==========================================
        // BẢNG CHỌN LINH THÚ XUẤT CHIẾN 1VS1 (THÁP / PVP)
        // ==========================================
        window.openSelectFighterModal = function(mode) {
            checkPetSurvival();
            if (!team || team.length === 0) {
                alert('⚠️ Đội hình trong túi đang trống! Hãy bắt thú hoặc đưa thú từ Trang Trại vào đội.');
                return;
            }

            // Nếu trong túi chỉ có 1 con duy nhất và còn HP thì vào đánh 1vs1 luôn
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
            if (mode === 'boss' && team.length < 3) { alert('⚠️ Boss Thế Giới yêu cầu đủ 3 linh thú (3vs1)!'); return; }

            const chosenPet = team[selectedIndex] || team[0];
            if (mode !== 'boss' && chosenPet.hp <= 0) {
                alert(`⚠️ Linh thú [${chosenPet.name}] đã hết HP! Vui lòng chọn linh thú khác hoặc hồi sức.`);
                return;
            }

            closeModal();
            closeTowerScreen();
            document.getElementById('map-screen').classList.add('hidden');
            document.getElementById('battle-screen').classList.remove('hidden');
            switchGameMusic('battle');

            const rawSquad = (mode === 'boss') ? [...team] : [chosenPet];
            const teamSynergy = getTeamSynergy(rawSquad);

            let activeTeam = rawSquad.map(p => {
                let b = getPetGearBonus(p);
                let baseAtk = p.atk + b.atk;
                let baseSpeed = (p.speed || 50) + b.speed;
                let baseCrit = (p.critRate ?? 20) + b.critRate;

                if (teamSynergy?.id === 'pure') baseAtk = Math.floor(baseAtk * 1.30);
                if (teamSynergy?.id === 'triad') {
                    baseSpeed = Math.floor(baseSpeed * 1.15);
                    baseCrit = Math.min(100, baseCrit + 15);
                }

                return {
                    ...p,
                    _ref: p,
                    hp: p.hp,
                    maxHp: p.maxHp + b.maxHp,
                    atk: baseAtk,
                    speed: baseSpeed,
                    critRate: baseCrit,
                    blockRate: (p.blockRate ?? 15) + b.blockRate,
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

            let enemy = mode === 'boss' ? {
                name: `${chosenBossCfg.displayName} (Boss Lv.${bossLevel})`,
                spriteKey: randomBossKey,
                element: chosenBossCfg.element,
                emoji: '👹',
                hp: 300 + (bossLevel * 100),
                maxHp: 300 + (bossLevel * 100),
                atk: 30 + (bossLevel * 8),
                speed: 45 + bossLevel * 3,
                accuracy: 95, dodgeRate: 15, critRate: 20, blockRate: 20, armorBreak: 20, comboRate: 25
            } :
            mode === 'tower' ? {
                name: `${chosenBossCfg.displayName} (Tầng ${towerFloor})`,
                spriteKey: randomBossKey,
                element: chosenBossCfg.element,
                emoji: '👹',
                hp: 120 + (towerFloor * 25),
                maxHp: 120 + (towerFloor * 25),
                atk: 20 + towerFloor * 4,
                speed: 40 + towerFloor * 2,
                accuracy: 88, dodgeRate: Math.min(35, 10 + towerFloor), critRate: 15, blockRate: Math.min(40, 12 + towerFloor), armorBreak: Math.min(35, 10 + towerFloor), comboRate: Math.min(50, 15 + towerFloor * 2)
            } :
            { name: 'Đối Thủ PvP', element: 'Tho', emoji: '🤖', hp: 160, maxHp: 160, atk: 25, speed: 52, accuracy: 90, dodgeRate: 18, critRate: 18, blockRate: 18, armorBreak: 16, comboRate: 22 };

            let enemyHp = enemy.hp;
            let teamStatus = activeTeam.map(() => ({ stun: 0, poison: 0, burn: 0, slow: 0, shield: 0 }));
            let enemyStatus = { stun: 0, poison: 0, burn: 0, slow: 0, shield: 0 };

           const teamNamesEl = document.getElementById('battle-team-names');
            if (teamNamesEl) {
                teamNamesEl.innerText = activeTeam.map(p => `${p.name} Lv.${Math.floor(p.level || 1)}`).join(', ');
            }
            document.getElementById('battle-enemy-name').innerText = `${enemy.name} [${elementNames[enemy.element]?.label}] (⚡${enemy.speed} | 🔥${enemy.comboRate}%)`;

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
                            const pPos = { x: rect.width / 2 - 85, y: rect.height * 0.63 };
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
            let teamHitShake = [0, 0, 0];
            let enemyHitShake = 0;
            let impactEffects = [];
            let battleEnded = false;

            if (battleInterval) clearInterval(battleInterval);

            battleInterval = setInterval(() => {
                battleCtx.clearRect(0, 0, rect.width, rect.height);
                idleTick += 0.14;

                let cx = rect.width / 2, cy = rect.height * 0.63;
                let defaultEnemyX = cx + 95;

                const teamSlots = (mode === 'boss')
                    ? [
                        { x: cx - 105, y: cy - 78 },
                        { x: cx - 72,  y: cy },
                        { x: cx - 105, y: cy + 78 }
                    ]
                    : [
                        { x: cx - 85,  y: cy }
                    ];

                if (!attacker && !battleEnded) {
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
                            let fxX = nextActor.side === 'team' ? (teamSlots[nextActor.index]?.x || cx - 85) : defaultEnemyX;
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
                                // KIỂM TRA KỸ NĂNG HỒI MÁU (x2 DAME) CHO ĐỒNG MINH THẤP MÁU NHẤT
                                let usedHealSkill = false;
                                if (nextActor.side === 'team') {
                                    const caster = activeTeam[nextActor.index];
                                    if (caster && caster.skill && caster.skill.type === 'heal_lowest') {
                                        if ((caster.skillCd || 0) <= 0) {
                                            usedHealSkill = tryCastHealLowestAlly(caster, activeTeam, teamHpList, teamSlots, cx - 85, cy, impactEffects);
                                            if (usedHealSkill) {
                                                caster.skillCd = caster.skill.cooldown || 3; // Hồi chiêu 3 lượt
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
                        let startSlot = teamSlots[idx] || { x: cx - 85, y: cy };
                        let chargeDist = (defaultEnemyX - 35) - startSlot.x;
                        let targetY = cy;
                        let startY = startSlot.y;

                        if (attacker.step <= 9) {
                            let t = attacker.step / 9;
                            myOffsetsX[idx] = t * chargeDist;
                            myOffsetsY[idx] = (targetY - startY) * t - Math.sin(t * Math.PI) * 32;
                            myRotations[idx] = t * 0.25;
                        } else if (attacker.step <= 15) {
                            myOffsetsX[idx] = chargeDist;
                            myOffsetsY[idx] = targetY - startY;
                            myRotations[idx] = 0.25;

                            if (attacker.step === 10) {
                                let pet = activeTeam[idx];
                                let comboTag = attacker.isComboHit ? ' 🔥LIÊN KÍCH!' : '';
                                let hitChance = Math.max(25, Math.min(100, (pet.accuracy ?? 90) - (enemy.dodgeRate ?? 15) + 15));
                                if (Math.random() * 100 > hitChance) {
                                    impactEffects.push({
                                        x: defaultEnemyX - 15,
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
                                        x: defaultEnemyX - 15,
                                        y: cy,
                                        radius: 10,
                                        alpha: 1,
                                        color: isCrit ? '#facc15' : (attacker.isComboHit ? '#fb923c' : '#38bdf8'),
                                        text: `-${finalDmg} ${tags}`
                                    });
                                    document.getElementById('battle-log').innerText = `[Hiệp ${roundNumber}] ⚡${pet.speed} ${pet.name}${comboTag}: -${finalDmg} dmg ${isCrit ? '[CHÍ MẠNG!] ' : ''}${isBlocked ? '[BỊ ĐỠ!] ' : ''}${isCounter ? '[KHẮC HỆ!]' : ''}`;
                                }
                            }
                        } else if (attacker.step <= 22) {
                            let t = 1 - (attacker.step - 15) / 7;
                            myOffsetsX[idx] = chargeDist * t;
                            myOffsetsY[idx] = (targetY - startY) * t - Math.sin(t * Math.PI) * 15;
                            myRotations[idx] = t * 0.25;
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
                        let targetSlot = targetIdx !== -1 ? (teamSlots[targetIdx] || { x: cx - 85, y: cy }) : { x: cx - 85, y: cy };
                        let targetY = targetSlot.y;
                        let enemyChargeDist = defaultEnemyX - (targetSlot.x + 35);

                        if (attacker.step <= 9) {
                            let t = attacker.step / 9;
                            enemyOffsetX = -t * enemyChargeDist;
                            enemyOffsetY = (targetY - cy) * t - Math.sin(t * Math.PI) * 32;
                            enemyRotation = -t * 0.25;
                        } else if (attacker.step <= 15) {
                            enemyOffsetX = -enemyChargeDist;
                            enemyOffsetY = targetY - cy;
                            enemyRotation = -0.25;

                            if (attacker.step === 10 && targetIdx !== -1) {
                                let targetPet = activeTeam[targetIdx];
                                let comboTag = attacker.isComboHit ? ' 🔥LIÊN KÍCH!' : '';
                                let hitChance = Math.max(25, Math.min(100, (enemy.accuracy ?? 88) - (targetPet.dodgeRate ?? 15) + 15));
                                if (Math.random() * 100 > hitChance) {
                                    impactEffects.push({
                                        x: targetSlot.x + 15,
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
                                        x: targetSlot.x + 15,
                                        y: targetY,
                                        radius: 10,
                                        alpha: 1,
                                        color: isBlocked ? '#a855f7' : (attacker.isComboHit ? '#fb923c' : '#ef4444'),
                                        text: `-${enDmg} ${tags}`
                                    });
                                    document.getElementById('battle-log').innerText = `[Hiệp ${roundNumber}] ⚡${enemy.speed} ${enemy.name}${comboTag}: -${enDmg} dmg lên ${targetPet.name} ${isBlocked ? '[ĐỠ ĐÒN!] ' : ''}${isCrit ? '[CHÍ MẠNG!]' : ''}`;
                                }
                            }
                        } else if (attacker.step <= 22) {
                            let t = 1 - (attacker.step - 15) / 7;
                            enemyOffsetX = -enemyChargeDist * t;
                            enemyOffsetY = (targetY - cy) * t - Math.sin(t * Math.PI) * 15;
                            enemyRotation = -t * 0.25;
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
                    enKnockback = Math.sin(enemyHitShake * 1.8) * 10 + 6;
                    enemyHitShake--;
                }

                let finalEnX = isEnemyDead ? defaultEnemyX : (defaultEnemyX + enemyOffsetX + enKnockback);
                let finalEnY = isEnemyDead ? (cy + 14) : (cy + enemyOffsetY);

                if (enemy.spriteKey && bossSpriteConfigs[enemy.spriteKey]) {
                    let bossCfg = bossSpriteConfigs[enemy.spriteKey];
                    let maxFrames = bossCfg.singleSheet ? (bossCfg.cols || 8) : (getSpriteGrid(bossCfg, isEnemyDead ? 'death' : (isEnemyAttacking ? 'attack' : (isEnemyHit ? 'hit' : 'idle'))).totalFrames);
                    let enAnimState = 'idle';
                    let enAnimFrame = Math.floor(idleTick * 2.2) % maxFrames;
                    if (isEnemyDead) {
                        enAnimState = 'death';
                        enAnimFrame = maxFrames - 1;
                    } else if (isEnemyAttacking) {
                        enAnimState = 'attack';
                        enAnimFrame = Math.min(maxFrames - 1, Math.floor((attacker.step / 22) * maxFrames));
                    } else if (isEnemyHit) {
                        enAnimState = 'hit';
                        enAnimFrame = Math.min(maxFrames - 1, Math.floor((12 - enemyHitShake) * (maxFrames / 12)));
                    }
                    drawBossEntity(battleCtx, enemy, enAnimState, enAnimFrame, finalEnX, finalEnY, mode === 'boss' ? 105 : 90);
                } else {
                    let enIdleScaleY = (isEnemyDead || battleEnded) ? 1 : (1 + Math.sin(idleTick + 1) * 0.04);
                    let finalEnRotation = isEnemyDead ? (Math.PI / 2) : enemyRotation;
                    battleCtx.save();
                    battleCtx.translate(finalEnX, finalEnY);
                    battleCtx.rotate(finalEnRotation);
                    battleCtx.scale(1, enIdleScaleY);
                    battleCtx.font = "65px sans-serif";
                    battleCtx.textAlign = "center";
                    battleCtx.textBaseline = "middle";
                    battleCtx.fillText(enemy.emoji, 0, 0);
                    battleCtx.restore();
                }

                if (!isEnemyDead) drawSpriteStatusFX(battleCtx, enemyStatus, finalEnX, finalEnY, idleTick, mode === 'boss' ? 140 : 120);

                if (teamSynergy && activeTeam.length === 3 && teamSlots.length === 3) {
                    drawTeamSynergyField(battleCtx, teamSynergy, teamSlots, idleTick);
                }

                activeTeam.forEach((pet, i) => {
                    let isPetDead = teamHpList[i] <= 0;
                    let isAttacking = (attacker && attacker.side === 'team' && attacker.index === i);
                    let isHit = teamHitShake[i] > 0;
                    let knockback = 0;

                    if (isHit) {
                        knockback = -Math.sin(teamHitShake[i] * 1.8) * 10 - 6;
                        teamHitShake[i]--;
                    }

                    let baseSlot = teamSlots[i] || { x: cx - 85, y: cy };
                    let posY = isPetDead ? (baseSlot.y + 12) : (baseSlot.y + myOffsetsY[i]);
                    let posX = isPetDead ? baseSlot.x : (baseSlot.x + myOffsetsX[i] + knockback);
                    let baseName = pet.name.replace('F1_', '');
                    let hasSprite = isPetSpriteReady(baseName);

                    let animState = 'idle';
                    if (isPetDead) animState = 'death';
                    else if (isAttacking) animState = 'attack';
                    else if (isHit) animState = 'hit';

                    let petCfg = spriteConfigs[baseName];
                    let petGrid = petCfg ? getSpriteGrid(petCfg, animState) : { totalFrames: 16 };
                    let pMaxFrames = petGrid.totalFrames || 16;

                    let animFrame = Math.floor(idleTick * 2.2) % pMaxFrames;
                    if (isPetDead) {
                        animFrame = pMaxFrames - 1;
                    } else if (isAttacking) {
                        animFrame = Math.min(pMaxFrames - 1, Math.floor((attacker.step / 22) * pMaxFrames));
                    } else if (isHit) {
                        animFrame = Math.min(pMaxFrames - 1, Math.floor((12 - teamHitShake[i]) * (pMaxFrames / 12)));
                    }

                    // Vòng hào quang phẩm chất to rõ dưới chân thú
                    if (!isPetDead) drawRarityAura(battleCtx, pet, posX, posY + 42, idleTick, 72);

                    if (hasSprite) {
                        drawPetEntity(battleCtx, pet, animState, animFrame, posX, posY, 85, false);
                    } else {
                        let idleScaleY = (isPetDead || battleEnded) ? 1 : (1 + Math.sin(idleTick + i * 1.2) * 0.04);
                        let petRot = isPetDead ? (-Math.PI / 2) : myRotations[i];
                        battleCtx.save();
                        battleCtx.translate(posX, posY);
                        battleCtx.rotate(petRot);
                        battleCtx.scale(-1, idleScaleY);
                        battleCtx.font = "52px sans-serif";
                        battleCtx.textAlign = "center";
                        battleCtx.textBaseline = "middle";
                        battleCtx.fillText(pet.emoji, 0, 0);
                        battleCtx.restore();
                    }
                    if (!isPetDead) drawSpriteStatusFX(battleCtx, teamStatus[i], posX, posY, idleTick, 105);
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

                    setTimeout(() => {
                        clearInterval(battleInterval);
                        if (enemyHp <= 0) {
                            let rewardGold = mode === 'boss' ? 700 + (bossLevel * 200) : mode === 'tower' ? 300 + (towerFloor * 50) : 350;
                            let rewardDiamond = mode === 'boss' ? 10 : (mode === 'tower' && towerFloor % 5 === 0 ? 5 : 0);
                            playerCoins += rewardGold;
                            playerDiamonds += rewardDiamond;
                            saveGameData();
                            addQuestProgress(2, 1);

                            let diamondNote = rewardDiamond > 0 ? ` và +${rewardDiamond}💎` : '';

                            if (mode === 'tower') {
                                let clearedFloor = towerFloor;
                                towerFloor++;
                                localStorage.setItem('ar_tower_floor', towerFloor);
                                saveGameData();

                                showInGameConfirm(
                                    `🏆 Chúc mừng! Bạn đã vượt qua Tầng ${clearedFloor} và nhận +${rewardGold}🪙${diamondNote}!\n\n🗼 Bạn có muốn tiếp tục khiêu chiến Tầng ${towerFloor} ngay bây giờ không?`,
                                    () => {
                                        startBattle('tower', selectedIndex);
                                    },
                                    () => {
                                        exitBattleScreen();
                                    }
                                );
                                return;
                             } else if (mode === 'boss') {
                                        bossLevel++;
                                        localStorage.setItem('ar_boss_level', bossLevel);
                                        saveGameData();
                                        alert(`🏆 Chiến thắng vẻ vang! Nhận +${rewardGold}🪙${diamondNote}!`);
                                        exitBattleScreen();
                                        openWorldBossLobby(true);
                                        return;
                            } else {
                                alert(`🏆 Chiến thắng vẻ vang! Nhận +${rewardGold}🪙!`);
                            }
                        } else {
                            if (mode === 'boss') {
                                clearInterval(battleInterval);
                                document.getElementById('battle-screen').classList.add('hidden');
                                switchGameMusic('map');
                                onPlayerDefeatedByWorldBoss(enemy.maxHp - Math.max(0, enemyHp));
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


// 3. BOSS THẾ GIỚI 3 MIỀN & SẢNH BOSS MMO
        // ==========================================
        // CẤU HÌNH BOSS THẾ GIỚI 3 MIỀN & KHUNG GIỜ XUẤT HIỆN
        // ==========================================
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

        // Khung giờ Boss xuất hiện (12h00-13h00 và 20h00-21h00 hằng ngày)
        const WORLD_BOSS_HOURS = [
            { startHour: 12, endHour: 13 },
            { startHour: 20, endHour: 21 }
        ];

        let worldBossMapMarkers = [];

        // ==========================================
        // BỘ NHỚ TRẠNG THÁI BOSS THẾ GIỚI ĐỒNG BỘ TỪ SERVER CLOUDFLARE
        // ==========================================
        let serverWorldBossState = {};
        let lastWorldBossSyncTime = 0;
        window.serverWorldBossActive = false;

        async function syncWorldBossStateFromServer(force = false) {
            const now = Date.now();
            if (!force && now - lastWorldBossSyncTime < 10000) return;
            lastWorldBossSyncTime = now;

            try {
                const res = await fetch('/api/world-boss');
                if (!res.ok) return;
                const data = await res.json();
                if (data.ok && Array.isArray(data.bosses)) {
                    let anyActive = false;
                    data.bosses.forEach(b => {
                        serverWorldBossState[b.region_key] = b;
                        if (b.active === 1) anyActive = true;
                    });
                    window.serverWorldBossActive = anyActive;

                    if (typeof map !== 'undefined' && map) {
                        renderWorldBossMarkersOnMap();
                    }
                }
            } catch (e) {}
        }
        window.syncWorldBossStateFromServer = syncWorldBossStateFromServer;

        function isDefaultBossHour() {
            const h = new Date().getHours();
            return WORLD_BOSS_HOURS.some(slot => h >= slot.startHour && h < slot.endHour);
        }

        function isRegionBossActive(regionId) {
            if (regionId && serverWorldBossState[regionId]) {
                if (serverWorldBossState[regionId].active === 1) return true;
                if (serverWorldBossState[regionId].active === 0 && !isDefaultBossHour()) return false;
            }
            if (window.serverWorldBossActive) return true;
            return isDefaultBossHour();
        }

        function isWorldBossActiveNow(regionId) {
            if (regionId) return isRegionBossActive(regionId);
            return WORLD_BOSS_REGIONS.some(r => isRegionBossActive(r.id));
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

            if (!isWorldBossActiveNow()) return;

            WORLD_BOSS_REGIONS.forEach(region => {
                if (!isRegionBossActive(region.id)) return;

                const bossIcon = L.divIcon({
                    className: 'leaflet-div-icon',
                    html: `
                    <div onclick="enterRegionalWorldBoss('${region.id}')" class="flex flex-col items-center cursor-pointer pointer-events-auto animate-bounce" style="width: 115px;">
                        <div class="bg-red-950/95 border-2 border-yellow-400 text-yellow-300 text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap">
                            🔥 ${region.regionName}
                        </div>
                        <div class="text-4xl drop-shadow-[0_0_12px_rgba(239,68,68,0.95)] mt-0.5">${region.emoji}</div>
                        <div class="bg-black/85 text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-red-500/60 whitespace-nowrap">
                            ${region.bossName}
                        </div>
                    </div>`,
                    iconSize: [115, 75],
                    iconAnchor: [57, 45]
                });

                const marker = L.marker([region.lat, region.lng], { icon: bossIcon, zIndexOffset: 1100 }).addTo(map);
                marker.on('click', (e) => {
                    if (e && e.originalEvent) L.DomEvent.stopPropagation(e);
                    enterRegionalWorldBoss(region.id);
                });
                worldBossMapMarkers.push(marker);
            });
        }

        // Tự động quét cập nhật trạng thái Boss từ server định kỳ mỗi 20 giây
        setInterval(() => {
            syncWorldBossStateFromServer();
            if (typeof map !== 'undefined' && map) renderWorldBossMarkersOnMap();
        }, 20000);

        // Đồng bộ ngay khi tải trang
        if (typeof window !== 'undefined') {
            window.addEventListener('load', () => {
                setTimeout(() => syncWorldBossStateFromServer(true), 1500);
            });
        }

        async function openWorldBossMenu() {
            const modal = document.getElementById('modal-container');
            const content = document.getElementById('modal-content');
            modal.classList.remove('hidden');

            // Hiển thị khung chờ và đồng bộ mới nhất từ Server
            await syncWorldBossStateFromServer(true);

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
                const isRegionOpen = isRegionBossActive(r.id);
                return `
                <div class="bg-zinc-800/90 border border-red-500/40 p-3 rounded-xl flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <span class="text-3xl shrink-0">${r.emoji}</span>
                        <div class="min-w-0">
                            <div class="text-xs font-black text-yellow-300 truncate">${r.bossName}</div>
                            <div class="text-[10px] text-zinc-300">📍 Khu vực: ${r.regionName}</div>
                        </div>
                    </div>
                    ${isRegionOpen
                        ? `<button onclick="closeModal(); focusWorldBossOnMap('${r.id}');" class="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-[11px] font-extrabold cursor-pointer shrink-0 shadow">
                               📍 Tới Vị Trí
                           </button>`
                        : `<span class="text-[10px] font-bold text-zinc-500 px-2 py-1 bg-zinc-900 rounded-lg shrink-0">Đang ẩn</span>`
                    }
                </div>`;
            }).join('');

            content.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h3 class="font-bold text-base text-red-400">👹 Lịch Boss Thế Giới 3 Miền</h3>
                <button onclick="closeModal()" class="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full font-bold text-sm cursor-pointer border border-zinc-600">✕</button>
            </div>
            ${statusHtml}
            <div class="space-y-2 mb-3">${regionsHtml}</div>
            <div class="text-[10px] text-zinc-400 text-center">
                💡 Tới giờ Boss sẽ tự hiện trên bản đồ GPS (Bắc - Trung - Nam). Hãy chạm trực tiếp vào Boss trên bản đồ để vào Sảnh Boss!
            </div>`;
        }

        window.focusWorldBossOnMap = function(regionId) {
            const region = WORLD_BOSS_REGIONS.find(r => r.id === regionId);
            if (!region || !map) return;
            renderWorldBossMarkersOnMap();
            map.setView([region.lat, region.lng], 17);
        };

        window.enterRegionalWorldBoss = async function(regionId) {
            await syncWorldBossStateFromServer(true);
            if (!isWorldBossActiveNow(regionId)) {
                alert(`⏳ Boss Thế Giới đã hết giờ xuất hiện!\nKhung giờ kế tiếp: ${getNextWorldBossTimeText()}`);
                renderWorldBossMarkersOnMap();
                return;
            }
            const region = WORLD_BOSS_REGIONS.find(r => r.id === regionId);
            if (!region) return;
            activeWorldBossRegion = region;
            openWorldBossLobby(false, region);
        };

        // ==========================================
        // SẢNH BOSS THẾ GIỚI MMO (VẠCH NGANG & CHỜ XUẤT PHÁT)
        // ==========================================
        let activeWorldBossRegion = null;
        let wbPresenceTimer = null;

        let wbState = {
            active: false,
            loopId: null,
            hp: 5000000,
            maxHp: 5000000,
            respawnEndTime: 0,
            respawnDuration: 15000,
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

        // Nạp hình nền Sảnh Boss (ưu tiên boss-lobby-bg.webp, dự phòng battle-bg.webp)
        const wbBgImg = new Image();
        wbBgImg.onerror = () => {
            if (!wbBgImg.dataset.fallback) {
                wbBgImg.dataset.fallback = '1';
                wbBgImg.src = './battle-bg.webp';
            }
        };
        wbBgImg.src = './boss-lobby-bg.webp';

        // Nạp Sprite Thợ Săn Nam / Nữ (10 cột x 4 hàng)
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
                }
            } catch (e) {}
        }

        function startWorldBossLobbySync() {
            if (wbPresenceTimer) clearInterval(wbPresenceTimer);
            syncWorldBossLobbyPlayers();
            wbPresenceTimer = setInterval(() => {
                if (!wbState.active) {
                    clearInterval(wbPresenceTimer);
                    wbPresenceTimer = null;
                    return;
                }
                syncWorldBossLobbyPlayers();
            }, 1500);
        }

        function drawWorldBossHunter(ctx, x, y, gender, isWalking, dir, labelText, isSelf, tick) {
            const gKey = gender === 'Nữ' ? 'Nữ' : 'Nam';
            const stateKey = isWalking ? 'walk' : 'idle';
            const img = wbHunterSheets[gKey]?.[stateKey];

            // Vòng sáng định vị dưới chân nhân vật
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(x, y + 24, 15, 6, 0, 0, Math.PI * 2);
            ctx.fillStyle = isSelf ? 'rgba(250, 204, 21, 0.38)' : 'rgba(56, 189, 248, 0.30)';
            ctx.fill();
            ctx.strokeStyle = isSelf ? '#facc15' : '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();

            // Vẽ Sprite 10 cột x 4 hàng của Thợ Săn Nam / Nữ
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

            // Bảng tên nhân vật phía trên đầu
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
            if (regionData) activeWorldBossRegion = regionData;
            if (!activeWorldBossRegion && typeof worldBossRegions !== 'undefined' && worldBossRegions.length > 0) {
                activeWorldBossRegion = worldBossRegions[0];
            }

            const screen = document.getElementById('world-boss-screen');
            if (!screen) return;

            document.getElementById('home-screen')?.classList.add('hidden');
            document.getElementById('map-screen')?.classList.add('hidden');
            screen.classList.remove('hidden');

            const titleEl = document.getElementById('wb-boss-title');
            if (titleEl && activeWorldBossRegion) {
                titleEl.innerText = `${activeWorldBossRegion.emoji || '🐉'} ${activeWorldBossRegion.bossName || 'BOSS THẾ GIỚI'}`;
            }

            if (activeWorldBossRegion && serverWorldBossState[activeWorldBossRegion.id]) {
                const s = serverWorldBossState[activeWorldBossRegion.id];
                if (s.max_hp > 0) {
                    wbState.maxHp = s.max_hp;
                    wbState.hp = s.hp > 0 ? s.hp : s.max_hp;
                }
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
                    if (!isWaiting && clickBossDist <= 130 && typeof startWorldBossBattle === 'function') {
                        const playerDist = Math.hypot(wbState.playerX - wbState.bossX, wbState.playerY - wbState.bossY);
                        if (playerDist <= 185) {
                            startWorldBossBattle();
                        }
                    }
                });
            }

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

            // Cập nhật thông báo hồi sinh & thanh HP Boss
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
            if (hpTxtEl) hpTxtEl.innerText = `${wbState.hp.toLocaleString()} / ${wbState.maxHp.toLocaleString()} HP`;

            // Di chuyển nhân vật của bản thân & xác định hướng quay mặt
            const dx = wbState.targetX - wbState.playerX;
            const dy = wbState.targetY - wbState.playerY;
            const dist = Math.hypot(dx, dy);
            let isPlayerWalking = false;

            if (dist > 4) {
                isPlayerWalking = true;
                const speed = 6;
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
                if (!isWaiting && distToBoss <= 185) atkBtn.classList.remove('hidden');
                else atkBtn.classList.add('hidden');
            }

            ctx.clearRect(0, 0, W, H);

            // 1. VẼ HÌNH NỀN BACKGROUND SẢNH BOSS
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

            // 2. VẼ VẠCH XUẤT PHÁT & ĐIỂM XUẤT PHÁT
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

            // 3. VẼ BOSS ĐỨNG Ở GIỮA SẢNH
            const bx = toPxX(wbState.bossX);
            const by = toPxY(wbState.bossY);
            const pulse = Math.sin(now / 240) * 6;

            ctx.save();
            ctx.beginPath();
            ctx.ellipse(bx, by + 48, 86 + pulse, 28 + pulse * 0.3, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(248, 113, 113, 0.85)';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.restore();

            const bossSpriteKey = activeWorldBossRegion?.spriteKey || 'Rồng Lửa';
            if (typeof drawBossEntity === 'function' && typeof bossSpriteConfigs !== 'undefined' && bossSpriteConfigs?.[bossSpriteKey]) {
                const bossFrame = Math.floor(tick * 1.1);
                drawBossEntity(ctx, { spriteKey: bossSpriteKey, emoji: activeWorldBossRegion?.emoji || '🐉' }, 'idle', bossFrame, bx, by, 105);
            } else {
                ctx.font = '68px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(activeWorldBossRegion?.emoji || '🐉', bx, by);
            }

            const bossTitle = `🔥 ${activeWorldBossRegion?.bossName || 'BOSS THẾ GIỚI'} (Chạm để đánh)`;
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

            // 4. VẼ TẤT CẢ NGƯỜI CHƠI KHÁC ĐANG CÙNG TRONG SẢNH BOSS
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

            // 5. VẼ NHÂN VẬT CỦA ANH
            const myGender = localStorage.getItem('ar_cloud_gender') === 'Nữ' ? 'Nữ' : 'Nam';
            const myName = localStorage.getItem('ar_cloud_user') || 'BẠN';
            const px = toPxX(wbState.playerX);
            const py = toPxY(wbState.playerY);
            drawWorldBossHunter(ctx, px, py, myGender, isPlayerWalking, wbState.playerDir || 'up', `⭐ ${myName}`, true, tick);

            wbState.loopId = requestAnimationFrame(renderWorldBossLoop);
        }


// Gắn các hàm chiến đấu ra phạm vi toàn cục (window) để HTML & các module khác gọi trực tiếp
window.openTowerMenu = openTowerMenu;
window.closeTowerScreen = closeTowerScreen;
window.openArenaMenu = openArenaMenu;
window.startBattle = startBattle;
window.exitBattleScreen = exitBattleScreen;
window.renderWorldBossMarkersOnMap = renderWorldBossMarkersOnMap;
window.openWorldBossMenu = openWorldBossMenu;