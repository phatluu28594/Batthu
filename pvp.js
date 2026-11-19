
// BẮT THÚ VƯƠNG - MODULE PVP 1VS1 (pvp.js)
// 1. Đấu Trường Danh Vọng 1vs1 (Auto-Battle trên Sân Đấu Canvas battle-bg.webp)
// 2. Khiêu Chiến Sinh Tử qua Avatar GPS / Bạn Bè (Thua mất vĩnh viễn thú!)
// ============================================================================

(function () {
    let activeDuelPollingTimer = null;
    let handledDuelIds = new Set();
    let currentPvpMatch = null;
    let pvpBattleInterval = null;

    function getMyUser() {
        return (localStorage.getItem('ar_cloud_user') || '').trim();
    }

    function getAllOwnedPets() {
        const list = [];
        if (typeof team !== 'undefined' && Array.isArray(team)) {
            team.forEach((p, idx) => list.push({ source: 'team', index: idx, pet: p }));
        }
        if (typeof farm !== 'undefined' && Array.isArray(farm)) {
            farm.forEach((p, idx) => list.push({ source: 'farm', index: idx, pet: p }));
        }
        return list;
    }

    // Bộ tạo số ngẫu nhiên đồng bộ (Deterministic PRNG) giúp 2 máy diễn hoạt trận đánh giống hệt nhau 100%
    function createSeededRng(seed) {
        let s = (Number(seed) || 123456) % 2147483647;
        if (s <= 0) s += 2147483646;
        return function () {
            s = (s * 16807) % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    // Xóa vĩnh viễn linh thú thua cuộc trong Khiêu Chiến Sinh Tử & đồng bộ Cloud ngay
    function permanentlyRemovePet(petId, petName) {
        let removed = false;
        if (typeof team !== 'undefined' && Array.isArray(team)) {
            const idx = team.findIndex(p => p && (p.id === petId || p.name === petName));
            if (idx !== -1) {
                team.splice(idx, 1);
                removed = true;
            }
        }
        if (!removed && typeof farm !== 'undefined' && Array.isArray(farm)) {
            const idx = farm.findIndex(p => p && (p.id === petId || p.name === petName));
            if (idx !== -1) {
                farm.splice(idx, 1);
                removed = true;
            }
        }
        if (removed) {
            if (typeof saveGameData === 'function') saveGameData();
            if (typeof updateTeamCount === 'function') updateTeamCount();
            if (typeof syncCurrentAccountToCloud === 'function') syncCurrentAccountToCloud();
        }
        return removed;
    }

    // ========================================================================
    // 1. GIAO DIỆN ĐẤU TRƯỜNG DANH VỌNG & BẢNG XẾP HẠNG TUẦN
    // ========================================================================
    window.openPvpArenaHub = async function () {
        const me = getMyUser();
        if (!me) {
            alert('⚠️ Bạn cần đăng nhập Tài Khoản Mây (☁️ Nick) để tham gia Đấu Trường PvP!');
            if (typeof openCloudAccountModal === 'function') openCloudAccountModal();
            return;
        }

        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;
        modal.classList.remove('hidden');

        content.innerHTML = `
            <div class="text-center py-8 text-amber-300 font-bold animate-pulse">
                ⚔️ Đang tải Bảng Xếp Hạng Danh Vọng Tuần...
            </div>
        `;

        let rankData = { weekKey: '', leaderboard: [], myRank: { points: 1000, wins: 0, losses: 0 } };
        try {
            const res = await fetch('/api/pvp?u=' + encodeURIComponent(me));
            const json = await res.json();
            if (json.ok) rankData = json;
        } catch (e) {}

        const owned = getAllOwnedPets();
        const petOptions = owned.map((item, i) => {
            const p = item.pet;
            const traitLabel = p.trait ? ` • ${p.trait.icon}` : '';
            return `<option value="${i}">${p.emoji || '🐾'} ${p.name} (Lv.${Math.floor(p.level || 1)} | ATK:${Math.floor(p.atk)} | HP:${p.maxHp}${traitLabel})</option>`;
        }).join('');

        const lbRows = (rankData.leaderboard || []).map((row, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
            const isMe = row.username.toLowerCase() === me.toLowerCase();
            return `
                <div class="flex items-center justify-between px-2.5 py-1.5 rounded-lg ${isMe ? 'bg-amber-900/50 border border-amber-400/60' : 'bg-zinc-900/80'} text-xs">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="font-black w-6 text-center text-yellow-300">${medal}</span>
                        <div class="truncate">
                            <div class="font-extrabold text-white truncate">${row.username} ${isMe ? '(Bạn)' : ''}</div>
                            <div class="text-[10px] text-zinc-400 truncate">${row.lead_pet || 'Thợ Săn'}</div>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <div class="font-black text-amber-300">${row.points} ĐV</div>
                        <div class="text-[10px] text-emerald-400">${row.wins}T - <span class="text-rose-400">${row.losses}B</span></div>
                    </div>
                </div>
            `;
        }).join('') || `<div class="text-center text-zinc-400 text-xs py-4">Chưa có dữ liệu xếp hạng tuần này. Hãy là người đầu tiên ghi danh!</div>`;

        content.innerHTML = `
            <div class="flex justify-between items-center mb-3 pb-2 border-b border-amber-500/40">
                <div>
                    <h3 class="font-black text-base text-amber-300">⚔️ ĐẤU TRƯỜNG DANH VỌNG 1VS1</h3>
                    <div class="text-[10px] text-zinc-400">Mùa giải tuần: <span class="text-sky-300 font-bold">${rankData.weekKey}</span> (Reset Thứ 2)</div>
                </div>
                <button onclick="closeModal()" class="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full font-bold text-sm cursor-pointer border border-zinc-600">✕</button>
            </div>

            <div class="grid grid-cols-3 gap-1.5 bg-zinc-900/90 border border-amber-500/30 rounded-xl p-2.5 mb-3 text-center">
                <div>
                    <div class="text-[10px] text-zinc-400">Điểm Danh Vọng</div>
                    <div class="font-black text-sm text-yellow-300">🏆 ${rankData.myRank.points}</div>
                </div>
                <div>
                    <div class="text-[10px] text-zinc-400">Thắng / Thua</div>
                    <div class="font-black text-sm text-emerald-400">${rankData.myRank.wins} <span class="text-zinc-500">/</span> <span class="text-rose-400">${rankData.myRank.losses}</span></div>
                </div>
                <div>
                    <div class="text-[10px] text-zinc-400">Thể thức</div>
                    <div class="font-black text-xs text-sky-300 mt-0.5">1vs1 Auto</div>
                </div>
            </div>

            <div class="bg-zinc-800/90 border border-emerald-500/40 rounded-xl p-3 mb-3 space-y-2">
                <div class="text-xs font-extrabold text-emerald-300">🐾 Chọn 1 Linh Thú Chủ Lực Xuất Chiến:</div>
                ${owned.length > 0
                    ? `<select id="pvp-rank-pet-select" class="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs text-white">${petOptions}</select>
                       <button onclick="startRankedPvp1v1()" class="w-full bg-gradient-to-r from-amber-500 to-red-600 hover:brightness-110 py-2.5 rounded-xl font-black text-xs text-white shadow-lg cursor-pointer">
                           🔥 TÌM ĐỐI THỦ & ĐẤU NGAY (+25 / -15 ĐV)
                       </button>`
                    : `<div class="text-xs text-rose-400 font-bold">Bạn chưa có linh thú nào để xuất chiến!</div>`
                }
                <div class="text-[10px] text-zinc-400 text-center">🛡️ Chế độ Danh Vọng an toàn: Thua chỉ trừ điểm xếp hạng, KHÔNG mất thú.</div>
            </div>

            <div>
                <div class="font-extrabold text-xs text-yellow-300 mb-1.5">🏆 BẢNG XẾP HẠNG DANH VỌNG TUẦN (TOP 20)</div>
                <div class="space-y-1.5 max-h-[34vh] overflow-y-auto pr-1">${lbRows}</div>
            </div>
        `;
    };

    window.startRankedPvp1v1 = async function () {
        const me = getMyUser();
        const owned = getAllOwnedPets();
        const idx = parseInt(document.getElementById('pvp-rank-pet-select')?.value || '0', 10);
        const chosen = owned[idx]?.pet;
        if (!me || !chosen) return;

        const content = document.getElementById('modal-content');
        if (content) {
            content.innerHTML = `<div class="text-center py-10 text-amber-300 font-black animate-pulse">🔍 Đang ghép cặp với Thợ Săn thật trên máy chủ...</div>`;
        }

        try {
            const res = await fetch('/api/pvp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'find_rank_opponent', username: me })
            });
            const data = await res.json();
            if (!data.ok) {
                alert('❌ ' + (data.error || 'Không tìm được đối thủ!'));
                window.openPvpArenaHub();
                return;
            }

            launchPvp1v1CanvasArena({
                mode: 'ranked',
                seed: data.seed,
                myName: me,
                myPet: JSON.parse(JSON.stringify(chosen)),
                enemyName: data.opponent.username,
                enemyPet: data.opponent.pet
            });
        } catch (err) {
            alert('❌ Lỗi kết nối máy chủ PvP: ' + err.message);
        }
    };

    // ========================================================================
    // 2. KHIÊU CHIẾN SINH TỬ QUA AVATAR GPS / BẠN BÈ (THUA MẤT THÚ VĨNH VIỄN)
    // ========================================================================
    window.openDeathmatchChallengeModal = function (targetUsername) {
        const me = getMyUser();
        if (!me) {
            alert('⚠️ Bạn cần đăng nhập Tài Khoản Mây để khiêu chiến!');
            return;
        }
        if (!targetUsername || targetUsername.toLowerCase() === me.toLowerCase()) return;

        const owned = getAllOwnedPets();
        if (owned.length === 0) {
            alert('⚠️ Bạn không có linh thú nào để khiêu chiến!');
            return;
        }

        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;
        modal.classList.remove('hidden');

        const petOptions = owned.map((item, i) => {
            const p = item.pet;
            const traitLabel = p.trait ? ` • ${p.trait.icon}` : '';
            return `<option value="${i}">${p.emoji || '🐾'} ${p.name} (Lv.${Math.floor(p.level || 1)} | ATK:${Math.floor(p.atk)} | HP:${p.maxHp}${traitLabel})</option>`;
        }).join('');

        content.innerHTML = `
            <div class="flex justify-between items-center mb-3 pb-2 border-b border-red-500/50">
                <h3 class="font-black text-base text-red-400">☠️ KHIÊU CHIẾN SINH TỬ 1VS1</h3>
                <button onclick="closeModal()" class="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full font-bold text-sm cursor-pointer border border-zinc-600">✕</button>
            </div>

            <div class="bg-red-950/60 border border-red-500/70 rounded-xl p-3 mb-3 text-xs text-red-200 space-y-1">
                <div class="font-black text-red-400 text-sm">⚠️ CẢNH BÁO LUẬT SINH TỬ:</div>
                <div>• Đối thủ: <span class="font-black text-yellow-300">${targetUsername}</span></div>
                <div>• Trận đấu diễn ra <b>Tự Động (Auto)</b> trên Đấu Trường theo chỉ số & đặc kỹ.</div>
                <div>• <b>BÊN THUA SẼ MẤT VĨNH VIỄN LINH THÚ XUẤT CHIẾN!</b></div>
            </div>

            <div class="space-y-3 text-xs">
                <div>
                    <label class="font-extrabold text-amber-300 block mb-1">🐾 Chọn Linh Thú Cược Mạng Xuất Chiến:</label>
                    <select id="duel-pet-select" class="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-2 text-white">${petOptions}</select>
                </div>
                <button onclick="sendDeathmatchChallenge('${targetUsername.replace(/'/g, "\\'")}')" class="w-full bg-gradient-to-r from-red-600 to-rose-700 hover:brightness-110 py-2.5 rounded-xl font-black text-white shadow-lg cursor-pointer">
                    ⚔️ GỬI LỜI KHIÊU CHIẾN SINH TỬ
                </button>
            </div>
        `;
    };

    window.sendDeathmatchChallenge = async function (targetUsername) {
        const me = getMyUser();
        const owned = getAllOwnedPets();
        const idx = parseInt(document.getElementById('duel-pet-select')?.value || '0', 10);
        const chosen = owned[idx]?.pet;
        if (!me || !chosen) return;

        if (!confirm(`☠️ XÁC NHẬN LẦN CUỐI:\\nBạn chắc chắn đưa [${chosen.name} Lv.${Math.floor(chosen.level || 1)}] vào trận Sinh Tử với [${targetUsername}]?\\nNếu thua, [${chosen.name}] sẽ biến mất vĩnh viễn!`)) {
            return;
        }

        const content = document.getElementById('modal-content');
        if (content) {
            content.innerHTML = `
                <div class="text-center py-6 space-y-3">
                    <div class="text-3xl animate-bounce">⚔️</div>
                    <div class="font-black text-sm text-amber-300">Đang gửi chiến thư tới [${targetUsername}]...</div>
                    <div class="text-xs text-zinc-400">Chờ đối thủ chấp nhận trong vòng 60 giây. Không tắt trang này!</div>
                    <button onclick="closeModal()" class="mt-2 bg-zinc-800 border border-zinc-600 px-4 py-1.5 rounded-lg text-xs text-zinc-300 cursor-pointer">Đóng chờ ngầm</button>
                </div>
            `;
        }

        try {
            const res = await fetch('/api/pvp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'duel_challenge',
                    username: me,
                    target: targetUsername,
                    pet: chosen
                })
            });
            const data = await res.json();
            if (!data.ok) {
                alert('❌ ' + (data.error || 'Không gửi được lời khiêu chiến!'));
                if (typeof closeModal === 'function') closeModal();
            }
        } catch (err) {
            alert('❌ Lỗi gửi chiến thư: ' + err.message);
        }
    };

    function showIncomingDuelPopup(duel) {
        if (handledDuelIds.has(duel.id)) return;
        handledDuelIds.add(duel.id);

        let enemyPet = {};
        try { enemyPet = JSON.parse(duel.challenger_pet || '{}'); } catch (e) {}

        const owned = getAllOwnedPets();
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;
        modal.classList.remove('hidden');

        const petOptions = owned.map((item, i) => {
            const p = item.pet;
            const traitLabel = p.trait ? ` • ${p.trait.icon}` : '';
            return `<option value="${i}">${p.emoji || '🐾'} ${p.name} (Lv.${Math.floor(p.level || 1)} | ATK:${Math.floor(p.atk)} | HP:${p.maxHp}${traitLabel})</option>`;
        }).join('');

        content.innerHTML = `
            <div class="border-b border-red-500/50 pb-2 mb-3">
                <h3 class="font-black text-base text-red-400 animate-pulse">🚨 CHIẾN THƯ SINH TỬ 1VS1!</h3>
            </div>
            <div class="bg-zinc-900 border border-amber-500/40 rounded-xl p-3 mb-3 text-xs space-y-1.5">
                <div>Thợ săn <span class="font-black text-yellow-300">${duel.challenger}</span> khiêu chiến bạn!</div>
                <div class="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                    Đối thủ xuất chiến: <span class="font-black text-emerald-300">${enemyPet.emoji || '🐾'} ${enemyPet.name} (Lv.${Math.floor(enemyPet.level || 1)})</span>
                    <div class="text-[11px] text-zinc-400">Hệ: ${enemyPet.element} | HP: ${enemyPet.maxHp} | ATK: ${Math.floor(enemyPet.atk || 0)} | Tốc: ${enemyPet.speed}</div>
                </div>
                <div class="text-red-400 font-bold">☠️ Luật Sinh Tử: Bên thua sẽ MẤT VĨNH VIỄN thú xuất chiến!</div>
            </div>
            ${owned.length > 0 ? `
                <div class="space-y-2 text-xs">
                    <select id="accept-duel-pet-select" class="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-2 text-white">${petOptions}</select>
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="declineDeathmatchDuel(${duel.id})" class="bg-zinc-800 hover:bg-zinc-700 py-2.5 rounded-xl font-bold text-zinc-300 cursor-pointer border border-zinc-600">
                            🏳️ Từ Chối
                        </button>
                        <button onclick="acceptDeathmatchDuel(${duel.id})" class="bg-gradient-to-r from-red-600 to-amber-600 py-2.5 rounded-xl font-black text-white cursor-pointer shadow-lg">
                            ⚔️ CHẤP NHẬN ĐẤU
                        </button>
                    </div>
                </div>
            ` : `
                <div class="text-xs text-rose-400 mb-2">Bạn không có linh thú nào để nghênh chiến!</div>
                <button onclick="declineDeathmatchDuel(${duel.id})" class="w-full bg-zinc-800 py-2 rounded-xl text-xs text-white">Đóng</button>
            `}
        `;
    }

    window.declineDeathmatchDuel = async function (duelId) {
        if (typeof closeModal === 'function') closeModal();
        try {
            await fetch('/api/pvp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'duel_decline', duelId })
            });
        } catch (e) {}
    };

    window.acceptDeathmatchDuel = async function (duelId) {
        const me = getMyUser();
        const owned = getAllOwnedPets();
        const idx = parseInt(document.getElementById('accept-duel-pet-select')?.value || '0', 10);
        const chosen = owned[idx]?.pet;
        if (!me || !chosen) return;

        try {
            const res = await fetch('/api/pvp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'duel_accept', duelId, pet: chosen })
            });
            const data = await res.json();
            if (!data.ok || !data.duel) {
                alert('❌ ' + (data.error || 'Không thể bắt đầu trận đấu!'));
                if (typeof closeModal === 'function') closeModal();
                return;
            }

            const d = data.duel;
            const cPet = JSON.parse(d.challenger_pet);
            const dPet = JSON.parse(d.defender_pet);

            launchPvp1v1CanvasArena({
                mode: 'deathmatch',
                duelId: d.id,
                seed: d.seed,
                challengerName: d.challenger,
                challengerPet: cPet,
                defenderName: d.defender,
                defenderPet: dPet,
                myName: me,
                myPet: dPet,
                enemyName: d.challenger,
                enemyPet: cPet
            });
        } catch (err) {
            alert('❌ Lỗi kết nối: ' + err.message);
        }
    };

    function startDuelPoller() {
        if (activeDuelPollingTimer) clearInterval(activeDuelPollingTimer);
        activeDuelPollingTimer = setInterval(async () => {
            const me = getMyUser();
            if (!me || currentPvpMatch) return;
            try {
                const res = await fetch('/api/pvp?u=' + encodeURIComponent(me));
                const data = await res.json();
                if (!data.ok) return;

                if (data.activeDuel && !handledDuelIds.has('acc_' + data.activeDuel.id)) {
                    handledDuelIds.add('acc_' + data.activeDuel.id);
                    const d = data.activeDuel;
                    const cPet = JSON.parse(d.challenger_pet);
                    const dPet = JSON.parse(d.defender_pet);
                    const amChallenger = d.challenger.toLowerCase() === me.toLowerCase();

                    launchPvp1v1CanvasArena({
                        mode: 'deathmatch',
                        duelId: d.id,
                        seed: d.seed,
                        challengerName: d.challenger,
                        challengerPet: cPet,
                        defenderName: d.defender,
                        defenderPet: dPet,
                        myName: me,
                        myPet: amChallenger ? cPet : dPet,
                        enemyName: amChallenger ? d.defender : d.challenger,
                        enemyPet: amChallenger ? dPet : cPet
                    });
                    return;
                }

                if (Array.isArray(data.incomingDuels) && data.incomingDuels.length > 0) {
                    showIncomingDuelPopup(data.incomingDuels[0]);
                }
            } catch (e) {}
        }, 4000);
    }

    window.addEventListener('load', startDuelPoller);

    // ========================================================================
    // 3. ĐỘNG CƠ ĐẤU TRƯỜNG FULLSCREEN CANVAS (battle-screen + battle-bg.webp)
    // ========================================================================
    function prepareCombatStats(rawPet, ownerName) {
        const p = JSON.parse(JSON.stringify(rawPet || {}));
        if (typeof ensurePetGears === 'function') ensurePetGears(p);
        const bonus = (typeof getPetGearBonus === 'function')
            ? getPetGearBonus(p)
            : { atk: 0, maxHp: 0, speed: 0, critRate: 0, blockRate: 0, armorBreak: 0 };

        const fullMaxHp = (p.maxHp || 150) + bonus.maxHp;
        return {
            ...p,
            owner: ownerName,
            maxHp: fullMaxHp,
            hp: fullMaxHp,
            atk: (p.atk || 40) + bonus.atk,
            speed: (p.speed || 50) + bonus.speed,
            critRate: (p.critRate ?? 20) + bonus.critRate,
            blockRate: (p.blockRate ?? 15) + bonus.blockRate,
            armorBreak: (p.armorBreak ?? 15) + bonus.armorBreak,
            dodgeRate: p.dodgeRate ?? 15,
            accuracy: p.accuracy ?? 90,
            comboRate: p.comboRate ?? 20,
            hasHealSkill: !!(p.trait?.type === 'heal' || p.hasHealSkill),
            healCd: 0
        };
    }

    function restoreScreenAfterPvp() {
        const battleScreen = document.getElementById('battle-screen');
        if (battleScreen) battleScreen.classList.add('hidden');
        if (typeof switchGameMusic === 'function') switchGameMusic('map');

        const homeScreen = document.getElementById('home-screen');
        const mapScreen = document.getElementById('map-screen');
        if (homeScreen && !homeScreen.classList.contains('hidden')) {
            if (typeof centerPanorama === 'function') setTimeout(() => centerPanorama('home-scroller'), 80);
        } else if (mapScreen) {
            mapScreen.classList.remove('hidden');
            if (typeof map !== 'undefined' && map) setTimeout(() => map.invalidateSize(), 100);
        }
    }

    function launchPvp1v1CanvasArena(cfg) {
        currentPvpMatch = cfg;
        if (pvpBattleInterval) clearInterval(pvpBattleInterval);
        if (typeof battleInterval !== 'undefined' && battleInterval) clearInterval(battleInterval);

        if (typeof closeModal === 'function') closeModal();
        const homeScreen = document.getElementById('home-screen');
        const mapScreen = document.getElementById('map-screen');
        const battleScreen = document.getElementById('battle-screen');
        if (!battleScreen) return;

        if (homeScreen) homeScreen.classList.add('hidden');
        if (mapScreen) mapScreen.classList.add('hidden');
        battleScreen.classList.remove('hidden');
        if (typeof switchGameMusic === 'function') switchGameMusic('battle');

        const isDeathmatch = cfg.mode === 'deathmatch';
        const amLeft = !isDeathmatch || (cfg.challengerName.toLowerCase() === cfg.myName.toLowerCase());

        const leftRaw = amLeft ? cfg.myPet : cfg.enemyPet;
        const leftOwner = amLeft ? cfg.myName : cfg.enemyName;
        const rightRaw = amLeft ? cfg.enemyPet : cfg.myPet;
        const rightOwner = amLeft ? cfg.enemyName : cfg.myName;

        const leftUnit = prepareCombatStats(leftRaw, leftOwner);
        const rightUnit = prepareCombatStats(rightRaw, rightOwner);

        let leftHp = leftUnit.maxHp;
        let rightHp = rightUnit.maxHp;
        let leftStatus = { stun: 0, poison: 0, burn: 0, slow: 0, shield: 0 };
        let rightStatus = { stun: 0, poison: 0, burn: 0, slow: 0, shield: 0 };

        const elemMap = (typeof elementNames !== 'undefined') ? elementNames : {};
        const counterMap = (typeof elementCounterMap !== 'undefined')
            ? elementCounterMap
            : { Kim: 'Moc', Moc: 'Tho', Tho: 'Thuy', Thuy: 'Hoa', Hoa: 'Kim' };

        const modeTag = isDeathmatch ? '☠️ SINH TỬ' : '🏆 RANK';
        const teamNameEl = document.getElementById('battle-team-names');
        const enemyNameEl = document.getElementById('battle-enemy-name');
        const logEl = document.getElementById('battle-log');

        if (teamNameEl) {
            teamNameEl.innerText = `[${leftOwner}] ${leftUnit.name} Lv.${Math.floor(leftUnit.level || 1)} [${elemMap[leftUnit.element]?.label || leftUnit.element}]`;
        }
        if (enemyNameEl) {
            enemyNameEl.innerText = `${modeTag} [${rightOwner}] ${rightUnit.name} Lv.${Math.floor(rightUnit.level || 1)} [${elemMap[rightUnit.element]?.label || rightUnit.element}]`;
        }
        if (logEl) {
            logEl.innerText = isDeathmatch
                ? `☠️ TRẬN SINH TỬ: ${leftOwner} vs ${rightOwner} — Kẻ thua sẽ MẤT VĨNH VIỄN linh thú!`
                : `⚔️ ĐẤU TRƯỜNG DANH VỌNG: ${leftOwner} vs ${rightOwner} — Bắt đầu giao chiến!`;
        }

        // Gắn cảnh báo nút Rút lui khi đang đấu Sinh Tử
        const retreatBtn = battleScreen.querySelector('button[onclick*="exitBattleScreen"]');
        const origRetreatOnclick = retreatBtn ? retreatBtn.getAttribute('onclick') : null;
        if (retreatBtn) {
            retreatBtn.onclick = function () {
                if (isDeathmatch) {
                    alert('☠️ Đang trong trận Khiêu Chiến Sinh Tử! Không thể rút lui giữa chừng!');
                    return;
                }
                clearInterval(pvpBattleInterval);
                pvpBattleInterval = null;
                currentPvpMatch = null;
                retreatBtn.onclick = null;
                if (origRetreatOnclick) retreatBtn.setAttribute('onclick', origRetreatOnclick);
                restoreScreenAfterPvp();
            };
        }

        const pvpCanvas = document.getElementById('battleCanvas');
        const dpr = window.devicePixelRatio || 1;
        const rect = pvpCanvas.getBoundingClientRect();
        pvpCanvas.width = rect.width * dpr;
        pvpCanvas.height = rect.height * dpr;
        const pCtx = pvpCanvas.getContext('2d');
        pCtx.scale(dpr, dpr);
        pCtx.imageSmoothingEnabled = true;
        pCtx.imageSmoothingQuality = 'high';

        const rng = createSeededRng(cfg.seed);
        let attacker = null;
        let turnQueue = [];
        let roundNumber = 0;
        let turnDelayFrames = 14;
        let idleTick = 0;
        let leftHitShake = 0;
        let rightHitShake = 0;
        let impactEffects = [];
        let battleEnded = false;

        function buildNextRoundQueue() {
            roundNumber++;
            const fighters = [];
            if (leftHp > 0) {
                const spd = Math.floor(leftUnit.speed * (leftStatus.slow > 0 ? 0.7 : 1));
                fighters.push({ side: 'left', speed: spd });
            }
            if (rightHp > 0) {
                const spd = Math.floor(rightUnit.speed * (rightStatus.slow > 0 ? 0.7 : 1));
                fighters.push({ side: 'right', speed: spd });
            }
            // Đồng bộ thứ tự ra đòn tuyệt đối giữa 2 máy
            fighters.sort((a, b) => (b.speed - a.speed) || (a.side === 'left' ? -1 : 1));
            return fighters;
        }

        pvpBattleInterval = setInterval(() => {
            pCtx.clearRect(0, 0, rect.width, rect.height);
            idleTick += 0.14;

            const cx = rect.width / 2;
            const cy = rect.height * 0.63;
            const leftBaseX = cx - 90;
            const rightBaseX = cx + 90;

            if (!attacker && !battleEnded) {
                if (turnDelayFrames > 0) {
                    turnDelayFrames--;
                } else {
                    while (turnQueue.length > 0) {
                        const cand = turnQueue[0];
                        const alive = cand.side === 'left' ? leftHp > 0 : rightHp > 0;
                        if (alive) break;
                        turnQueue.shift();
                    }
                    if (turnQueue.length === 0) {
                        turnQueue = buildNextRoundQueue();
                    }

                    if (turnQueue.length > 0) {
                        const nextActor = turnQueue.shift();
                        const isLeft = nextActor.side === 'left';
                        const unit = isLeft ? leftUnit : rightUnit;
                        const st = isLeft ? leftStatus : rightStatus;
                        const fxX = isLeft ? leftBaseX : rightBaseX;

                        // Sát thương duy trì Độc / Cháy
                        let dotDmg = 0;
                        const dotLabel = [];
                        if (st.poison > 0) {
                            dotDmg += Math.max(5, Math.floor(unit.maxHp * 0.06));
                            st.poison--;
                            dotLabel.push('🟢Độc');
                        }
                        if (st.burn > 0) {
                            dotDmg += Math.max(6, Math.floor(unit.maxHp * 0.07));
                            st.burn--;
                            dotLabel.push('🔥Cháy');
                        }
                        if (dotDmg > 0) {
                            if (isLeft) leftHp = Math.max(0, leftHp - dotDmg);
                            else rightHp = Math.max(0, rightHp - dotDmg);
                            impactEffects.push({ x: fxX, y: cy - 12, radius: 8, alpha: 1, color: '#4ade80', text: `-${dotDmg} (${dotLabel.join('+')})` });
                            if (logEl) logEl.innerText = `[Hiệp ${roundNumber}] ${unit.name} chịu -${dotDmg} sát thương từ ${dotLabel.join(' & ')}!`;
                        }

                        if (st.slow > 0) st.slow--;
                        if (st.shield > 0) st.shield--;

                        const stillAlive = isLeft ? leftHp > 0 : rightHp > 0;
                        if (!stillAlive) {
                            turnDelayFrames = 14;
                        } else if (st.stun > 0) {
                            st.stun = 0;
                            impactEffects.push({ x: fxX, y: cy - 22, radius: 14, alpha: 1, color: '#facc15', text: `💫 CHOÁNG! Mất lượt` });
                            if (logEl) logEl.innerText = `[Hiệp ${roundNumber}] 💫 ${unit.name} bị choáng, mất lượt!`;
                            turnDelayFrames = 24;
                        } else {
                            // Kiểm tra Đặc kỹ Hồi Phục Linh Hồn (x2 Dame)
                            const curHp = isLeft ? leftHp : rightHp;
                            if (unit.hasHealSkill && unit.healCd <= 0 && curHp < unit.maxHp * 0.85) {
                                const healAmt = Math.max(1, Math.floor(unit.atk * 2));
                                const newHp = Math.min(unit.maxHp, curHp + healAmt);
                                const actualHealed = newHp - curHp;
                                if (isLeft) leftHp = newHp;
                                else rightHp = newHp;
                                unit.healCd = 3;

                                impactEffects.push({ x: fxX, y: cy - 14, radius: 16, alpha: 1, color: '#34d399', text: `+${actualHealed}💚` });
                                if (logEl) logEl.innerText = `[Hiệp ${roundNumber}] 💚 [${unit.name}] kích hoạt Hồi Phục Linh Hồn (+${actualHealed} HP)!`;
                                turnDelayFrames = 22;
                            } else {
                                if (unit.healCd > 0) unit.healCd--;
                                attacker = { side: nextActor.side, step: 0, isComboHit: false };
                            }
                        }
                    }
                }
            }

            let leftOffsetX = 0, leftOffsetY = 0, leftRot = 0;
            let rightOffsetX = 0, rightOffsetY = 0, rightRot = 0;

            if (attacker && !battleEnded) {
                attacker.step++;
                const isLeftAtk = attacker.side === 'left';
                const atkUnit = isLeftAtk ? leftUnit : rightUnit;
                const defUnit = isLeftAtk ? rightUnit : leftUnit;
                const atkStatus = isLeftAtk ? leftStatus : rightStatus;
                const defStatus = isLeftAtk ? rightStatus : leftStatus;
                const defX = isLeftAtk ? rightBaseX : leftBaseX;
                const chargeDist = (rightBaseX - leftBaseX) - 42;

                if (attacker.step <= 9) {
                    const t = attacker.step / 9;
                    if (isLeftAtk) {
                        leftOffsetX = t * chargeDist;
                        leftOffsetY = -Math.sin(t * Math.PI) * 32;
                        leftRot = t * 0.25;
                    } else {
                        rightOffsetX = -t * chargeDist;
                        rightOffsetY = -Math.sin(t * Math.PI) * 32;
                        rightRot = -t * 0.25;
                    }
                } else if (attacker.step <= 15) {
                    if (isLeftAtk) { leftOffsetX = chargeDist; leftRot = 0.25; }
                    else { rightOffsetX = -chargeDist; rightRot = -0.25; }

                    if (attacker.step === 10) {
                        const comboTag = attacker.isComboHit ? ' 🔥LIÊN KÍCH!' : '';
                        const hitChance = Math.max(25, Math.min(100, (atkUnit.accuracy ?? 90) - (defUnit.dodgeRate ?? 15) + 15));

                        if (rng() * 100 > hitChance) {
                            impactEffects.push({
                                x: defX,
                                y: cy,
                                radius: 10,
                                alpha: 1,
                                color: '#94a3b8',
                                text: `💨 NÉ TRÁNH!`
                            });
                            if (logEl) logEl.innerText = `[Hiệp ${roundNumber}] ${atkUnit.name}${comboTag} tấn công nhưng ${defUnit.name} đã né tránh!`;
                        } else {
                            let dmg = atkUnit.atk * (0.85 + rng() * 0.3);
                            let isCounter = false;
                            if (counterMap[atkUnit.element] === defUnit.element) {
                                dmg *= 1.35;
                                isCounter = true;
                            }
                            const isCrit = (rng() * 100) < (atkUnit.critRate ?? 20);
                            if (isCrit) dmg *= 1.5;

                            const effectiveBlock = Math.max(0, (defUnit.blockRate ?? 15) - (atkUnit.armorBreak ?? 15));
                            const isBlocked = (rng() * 100) < effectiveBlock;
                            if (isBlocked) dmg *= 0.6;
                            if (defStatus.shield > 0) dmg *= 0.65;

                            const finalDmg = Math.max(1, Math.floor(dmg));
                            if (isLeftAtk) {
                                rightHp = Math.max(0, rightHp - finalDmg);
                                rightHitShake = 12;
                            } else {
                                leftHp = Math.max(0, leftHp - finalDmg);
                                leftHitShake = 12;
                            }

                            const defAlive = isLeftAtk ? rightHp > 0 : leftHp > 0;
                            const triggerChance = Math.max(30, atkUnit.trait?.chance || 30);
                            if (atkUnit.trait && defAlive && (rng() * 100 < triggerChance)) {
                                const tType = atkUnit.trait.type;
                                if (tType === 'stun') defStatus.stun = 1;
                                else if (tType === 'poison') defStatus.poison = 2;
                                else if (tType === 'burn') defStatus.burn = 2;
                                else if (tType === 'slow') defStatus.slow = 2;
                                else if (tType === 'shield') atkStatus.shield = 2;
                            }

                            const tags = `${isCrit ? '💥' : ''}${isBlocked ? '🛡️' : ''}${attacker.isComboHit ? '🔥' : ''}`;
                            impactEffects.push({
                                x: defX,
                                y: cy,
                                radius: 10,
                                alpha: 1,
                                color: isCrit ? '#facc15' : (attacker.isComboHit ? '#fb923c' : '#38bdf8'),
                                text: `-${finalDmg} ${tags}`
                            });
                            if (logEl) {
                                logEl.innerText = `[Hiệp ${roundNumber}] ⚡${atkUnit.speed} ${atkUnit.name}${comboTag}: -${finalDmg} dmg ${isCrit ? '[CHÍ MẠNG!] ' : ''}${isBlocked ? '[BỊ ĐỠ!] ' : ''}${isCounter ? '[KHẮC HỆ!]' : ''}`;
                            }
                        }
                    }
                } else if (attacker.step <= 22) {
                    const t = 1 - (attacker.step - 15) / 7;
                    if (isLeftAtk) {
                        leftOffsetX = chargeDist * t;
                        leftOffsetY = -Math.sin(t * Math.PI) * 15;
                        leftRot = t * 0.25;
                    } else {
                        rightOffsetX = -chargeDist * t;
                        rightOffsetY = -Math.sin(t * Math.PI) * 15;
                        rightRot = -t * 0.25;
                    }
                } else {
                    const comboChance = atkUnit.comboRate ?? 20;
                    if (!attacker.isComboHit && leftHp > 0 && rightHp > 0 && (rng() * 100 < comboChance)) {
                        attacker = { side: attacker.side, step: 0, isComboHit: true };
                    } else {
                        attacker = null;
                        turnDelayFrames = 12;
                    }
                }
            }

            // Cập nhật 2 thanh máu trên cùng của battle-screen
            const leftBar = document.getElementById('battle-team-hp-bar');
            const leftTxt = document.getElementById('battle-team-hp-text');
            const rightBar = document.getElementById('battle-enemy-hp-bar');
            const rightTxt = document.getElementById('battle-enemy-hp-text');

            if (leftBar) leftBar.style.width = Math.max(0, (leftHp / leftUnit.maxHp) * 100) + '%';
            if (leftTxt) leftTxt.innerText = `HP: ${Math.max(0, leftHp)}/${leftUnit.maxHp}`;
            if (rightBar) rightBar.style.width = Math.max(0, (rightHp / rightUnit.maxHp) * 100) + '%';
            if (rightTxt) rightTxt.innerText = `HP: ${Math.max(0, rightHp)}/${rightUnit.maxHp}`;

            // VẼ LINH THÚ BÊN TRÁI (HƯỚNG SANG PHẢI)
            const isLeftDead = leftHp <= 0;
            const isLeftAtk = attacker && attacker.side === 'left';
            let leftKnock = 0;
            if (leftHitShake > 0) {
                leftKnock = -Math.sin(leftHitShake * 1.8) * 10 - 6;
                leftHitShake--;
            }
            const finalLeftX = isLeftDead ? leftBaseX : (leftBaseX + leftOffsetX + leftKnock);
            const finalLeftY = isLeftDead ? (cy + 14) : (cy + leftOffsetY);

            if (!isLeftDead && typeof drawRarityAura === 'function') {
                drawRarityAura(pCtx, leftUnit, finalLeftX, finalLeftY + 44, idleTick, 74);
            }
            const leftBaseName = (leftUnit.name || '').replace('F1_', '');
            if (typeof isPetSpriteReady === 'function' && isPetSpriteReady(leftBaseName) && typeof drawPetEntity === 'function') {
                const lState = isLeftDead ? 'death' : (isLeftAtk ? 'attack' : (leftHitShake > 0 ? 'hit' : 'idle'));
                const lCfg = spriteConfigs[leftBaseName];
                const lMaxF = lCfg ? (getSpriteGrid(lCfg, lState).totalFrames || 8) : 8;
                let lFrame = Math.floor(idleTick * 2.2) % lMaxF;
                if (isLeftDead) lFrame = lMaxF - 1;
                else if (isLeftAtk) lFrame = Math.min(lMaxF - 1, Math.floor((attacker.step / 22) * lMaxF));
                drawPetEntity(pCtx, leftUnit, lState, lFrame, finalLeftX, finalLeftY, 92, false);
            } else {
                pCtx.save();
                pCtx.translate(finalLeftX, finalLeftY);
                if (isLeftDead) pCtx.rotate(-Math.PI / 2);
                else pCtx.rotate(leftRot);
                pCtx.scale(-1, 1);
                pCtx.font = '56px sans-serif';
                pCtx.textAlign = 'center';
                pCtx.textBaseline = 'middle';
                pCtx.fillText(leftUnit.emoji || '🐾', 0, 0);
                pCtx.restore();
            }
            if (!isLeftDead && typeof drawSpriteStatusFX === 'function') {
                drawSpriteStatusFX(pCtx, leftStatus, finalLeftX, finalLeftY, idleTick, 110);
            }

            // VẼ LINH THÚ BÊN PHẢI (LẬT MẶT HƯỚNG SANG TRÁI ĐỐI ĐẦU)
            const isRightDead = rightHp <= 0;
            const isRightAtk = attacker && attacker.side === 'right';
            let rightKnock = 0;
            if (rightHitShake > 0) {
                rightKnock = Math.sin(rightHitShake * 1.8) * 10 + 6;
                rightHitShake--;
            }
            const finalRightX = isRightDead ? rightBaseX : (rightBaseX + rightOffsetX + rightKnock);
            const finalRightY = isRightDead ? (cy + 14) : (cy + rightOffsetY);

            if (!isRightDead && typeof drawRarityAura === 'function') {
                drawRarityAura(pCtx, rightUnit, finalRightX, finalRightY + 44, idleTick, 74);
            }
            const rightBaseName = (rightUnit.name || '').replace('F1_', '');
            if (typeof isPetSpriteReady === 'function' && isPetSpriteReady(rightBaseName) && typeof drawPetEntity === 'function') {
                const rState = isRightDead ? 'death' : (isRightAtk ? 'attack' : (rightHitShake > 0 ? 'hit' : 'idle'));
                const rCfg = spriteConfigs[rightBaseName];
                const rMaxF = rCfg ? (getSpriteGrid(rCfg, rState).totalFrames || 8) : 8;
                let rFrame = Math.floor(idleTick * 2.2) % rMaxF;
                if (isRightDead) rFrame = rMaxF - 1;
                else if (isRightAtk) rFrame = Math.min(rMaxF - 1, Math.floor((attacker.step / 22) * rMaxF));
                drawPetEntity(pCtx, rightUnit, rState, rFrame, finalRightX, finalRightY, 92, true);
            } else {
                pCtx.save();
                pCtx.translate(finalRightX, finalRightY);
                if (isRightDead) pCtx.rotate(Math.PI / 2);
                else pCtx.rotate(rightRot);
                pCtx.font = '56px sans-serif';
                pCtx.textAlign = 'center';
                pCtx.textBaseline = 'middle';
                pCtx.fillText(rightUnit.emoji || '🐾', 0, 0);
                pCtx.restore();
            }
            if (!isRightDead && typeof drawSpriteStatusFX === 'function') {
                drawSpriteStatusFX(pCtx, rightStatus, finalRightX, finalRightY, idleTick, 110);
            }

            // VẼ HIỆU ỨNG SÁT THƯƠNG / HỒI MÁU NỔI TRÊN SÂN ĐẤU
            for (let idx = impactEffects.length - 1; idx >= 0; idx--) {
                const eff = impactEffects[idx];
                eff.radius += 4.5;
                eff.alpha -= 0.055;
                eff.y -= 1.5;

                if (eff.alpha <= 0) {
                    impactEffects.splice(idx, 1);
                    continue;
                }

                pCtx.save();
                pCtx.globalAlpha = Math.max(0, eff.alpha);
                pCtx.beginPath();
                pCtx.arc(eff.x, eff.y, eff.radius, 0, Math.PI * 2);
                pCtx.strokeStyle = eff.color;
                pCtx.lineWidth = 3.5;
                pCtx.stroke();

                pCtx.font = '900 18px sans-serif';
                pCtx.fillStyle = eff.color;
                pCtx.textAlign = 'center';
                pCtx.strokeStyle = '#000000';
                pCtx.lineWidth = 3;
                pCtx.strokeText(eff.text, eff.x, eff.y - 18);
                pCtx.fillText(eff.text, eff.x, eff.y - 18);
                pCtx.restore();
            }

            // KIỂM TRA KẾT THÚC TRẬN ĐẤU
            if ((leftHp <= 0 || rightHp <= 0) && !battleEnded) {
                battleEnded = true;
                attacker = null;
                const winnerOwner = leftHp > 0 ? leftOwner : rightOwner;
                const iWon = winnerOwner.toLowerCase() === cfg.myName.toLowerCase();

                setTimeout(async () => {
                    clearInterval(pvpBattleInterval);
                    pvpBattleInterval = null;
                    currentPvpMatch = null;
                    if (retreatBtn) {
                        retreatBtn.onclick = null;
                        if (origRetreatOnclick) retreatBtn.setAttribute('onclick', origRetreatOnclick);
                    }
                    await finalizePvpOutcome(cfg, iWon, winnerOwner);
                }, 1100);
            }
        }, 30);
    }

    async function finalizePvpOutcome(cfg, iWon, winnerOwner) {
        if (cfg.mode === 'ranked') {
            let delta = iWon ? 25 : -15;
            let newPts = '';
            try {
                const res = await fetch('/api/pvp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'report_rank_result',
                        username: cfg.myName,
                        isWin: iWon,
                        leadPet: `${cfg.myPet.emoji || '🐾'} ${cfg.myPet.name} (Lv.${Math.floor(cfg.myPet.level || 1)})`
                    })
                });
                const data = await res.json();
                if (data.ok) newPts = ` (Tổng: ${data.points} ĐV)`;
            } catch (e) {}

            restoreScreenAfterPvp();
            alert(iWon
                ? `🎉 CHIẾN THẮNG ĐẤU TRƯỜNG!\\n+${delta} Điểm Danh Vọng${newPts}`
                : `💔 THẤT BẠI!\\n${delta} Điểm Danh Vọng${newPts}`);
            window.openPvpArenaHub();
        } else {
            try {
                await fetch('/api/pvp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'duel_finish', duelId: cfg.duelId, winner: winnerOwner })
                });
            } catch (e) {}

            if (iWon) {
                restoreScreenAfterPvp();
                alert(`🏆 CHIẾN THẮNG TRẬN SINH TỬ!\\nLinh thú [${cfg.enemyPet.name}] của [${cfg.enemyName}] đã bị tiêu diệt vĩnh viễn!`);
            } else {
                permanentlyRemovePet(cfg.myPet.id, cfg.myPet.name);
                restoreScreenAfterPvp();
                alert(`☠️ BẠN ĐÃ THUA TRẬN SINH TỬ!\\nLinh thú [${cfg.myPet.name} Lv.${Math.floor(cfg.myPet.level || 1)}] đã tử trận và biến mất vĩnh viễn!`);
            }
        }
    }
})();
"""

with open("pvp.js", "w", encoding="utf-8") as f:
    f.write(pvp_js_canvas)

print("Updated pvp.js with fullscreen battle-bg.webp canvas arena")
