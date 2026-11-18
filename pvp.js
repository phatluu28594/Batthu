// BẮT THÚ VƯƠNG - MODULE PVP 1VS1 (pvp.js)
// 1. Đấu Trường Danh Vọng 1vs1 (Auto-Battle, Điểm Danh Vọng & Bảng Xếp Hạng Tuần)
// 2. Khiêu Chiến Sinh Tử qua Avatar GPS / Bạn Bè (Thua mất vĩnh viễn thú!)
// ============================================================================

(function () {
    let activeDuelPollingTimer = null;
    let handledDuelIds = new Set();
    let currentPvpMatch = null;
    let pvpBattleTimer = null;

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

    // Bộ tạo số ngẫu nhiên đồng bộ (Deterministic PRNG) giúp 2 máy chiếu trận đánh giống hệt nhau 100%
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
            return `<option value="${i}">${p.emoji || '🐾'} ${p.name} (Lv.${p.level || 1} | ATK:${p.atk} | HP:${p.maxHp}${traitLabel})</option>`;
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

            launchPvp1v1Arena({
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
            return `<option value="${i}">${p.emoji || '🐾'} ${p.name} (Lv.${p.level || 1} | ATK:${p.atk} | HP:${p.maxHp}${traitLabel})</option>`;
        }).join('');

        content.innerHTML = `
            <div class="flex justify-between items-center mb-3 pb-2 border-b border-red-500/50">
                <h3 class="font-black text-base text-red-400">☠️ KHIÊU CHIẾN SINH TỬ 1VS1</h3>
                <button onclick="closeModal()" class="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full font-bold text-sm cursor-pointer border border-zinc-600">✕</button>
            </div>

            <div class="bg-red-950/60 border border-red-500/70 rounded-xl p-3 mb-3 text-xs text-red-200 space-y-1">
                <div class="font-black text-red-400 text-sm">⚠️ CẢNH BÁO LUẬT SINH TỬ:</div>
                <div>• Đối thủ: <span class="font-black text-yellow-300">${targetUsername}</span></div>
                <div>• Trận đấu diễn ra <b>Tự Động (Auto)</b> theo chỉ số & đặc kỹ.</div>
                <div>• <b>BÊN THUA SẼ MẤT VĨNH VIỄN LINH THÚ XUẤT CHIẾN!</b></div>
            </div>

            <div class="space-y-3 text-xs">
                <div>
                    <label class="font-extrabold text-amber-300 block mb-1">🐾 Chọn Linh Thú Cược Mạng Xuất Chiến:</label>
                    <select id="duel-pet-select" class="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-2 text-white">${petOptions}</select>
                </div>
                <button onclick="sendDeathmatchChallenge('${targetUsername}')" class="w-full bg-gradient-to-r from-red-600 to-rose-700 hover:brightness-110 py-2.5 rounded-xl font-black text-white shadow-lg cursor-pointer">
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

        if (!confirm(`☠️ XÁC NHẬN LẦN CUỐI:\nBạn chắc chắn đưa [${chosen.name} Lv.${chosen.level || 1}] vào trận Sinh Tử với [${targetUsername}]?\nNếu thua, [${chosen.name}] sẽ biến mất vĩnh viễn!`)) {
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

    // Hiển thị popup nhận chiến thư cho Bên B
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
            return `<option value="${i}">${p.emoji || '🐾'} ${p.name} (Lv.${p.level || 1} | ATK:${p.atk} | HP:${p.maxHp}${traitLabel})</option>`;
        }).join('');

        content.innerHTML = `
            <div class="border-b border-red-500/50 pb-2 mb-3">
                <h3 class="font-black text-base text-red-400 animate-pulse">🚨 CHIẾN THƯ SINH TỬ 1VS1!</h3>
            </div>
            <div class="bg-zinc-900 border border-amber-500/40 rounded-xl p-3 mb-3 text-xs space-y-1.5">
                <div>Thợ săn <span class="font-black text-yellow-300">${duel.challenger}</span> khiêu chiến bạn!</div>
                <div class="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                    Đối thủ xuất chiến: <span class="font-black text-emerald-300">${enemyPet.emoji || '🐾'} ${enemyPet.name} (Lv.${enemyPet.level || 1})</span>
                    <div class="text-[11px] text-zinc-400">Hệ: ${enemyPet.element} | HP: ${enemyPet.maxHp} | ATK: ${enemyPet.atk} | Tốc: ${enemyPet.speed}</div>
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

            launchPvp1v1Arena({
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

    // Polling kiểm tra chiến thư đến & tín hiệu đối thủ đã chấp nhận (mỗi 4 giây khi đã đăng nhập)
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

                    launchPvp1v1Arena({
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
    // 3. ĐỘNG CƠ MÔ PHỎNG & CHIẾU TRẬN AUTO-BATTLE 1VS1 (ĐỒNG BỘ SEED)
    // ========================================================================
    function getElementAdvantage(atkElem, defElem) {
        const counter = { Kim: 'Moc', Moc: 'Tho', Tho: 'Thuy', Thuy: 'Hoa', Hoa: 'Kim' };
        if (counter[atkElem] === defElem) return 1.25;
        if (counter[defElem] === atkElem) return 0.85;
        return 1.0;
    }

    function launchPvp1v1Arena(cfg) {
        currentPvpMatch = cfg;
        if (pvpBattleTimer) clearInterval(pvpBattleTimer);

        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;
        modal.classList.remove('hidden');

        // Trong chế độ Sinh Tử, luôn mô phỏng theo góc nhìn chuẩn (Challenger vs Defender) để 2 máy khớp 100%
        const isDeathmatch = cfg.mode === 'deathmatch';
        const leftName = isDeathmatch ? cfg.challengerName : cfg.myName;
        const rightName = isDeathmatch ? cfg.defenderName : cfg.enemyName;

        const leftUnit = {
            owner: leftName,
            ...(isDeathmatch ? cfg.challengerPet : cfg.myPet),
            curHp: (isDeathmatch ? cfg.challengerPet : cfg.myPet).maxHp,
            status: {},
            healCd: 0
        };
        const rightUnit = {
            owner: rightName,
            ...(isDeathmatch ? cfg.defenderPet : cfg.enemyPet),
            curHp: (isDeathmatch ? cfg.defenderPet : cfg.enemyPet).maxHp,
            status: {},
            healCd: 0
        };

        const rng = createSeededRng(cfg.seed);
        const logs = [];
        let turn = 0;

        // Tiền mô phỏng toàn bộ trận đấu theo Seed chuẩn xác
        while (leftUnit.curHp > 0 && rightUnit.curHp > 0 && turn < 60) {
            turn++;
            const order = (leftUnit.speed * (leftUnit.status.slow ? 0.7 : 1)) >= (rightUnit.speed * (rightUnit.status.slow ? 0.7 : 1))
                ? [[leftUnit, rightUnit], [rightUnit, leftUnit]]
                : [[rightUnit, leftUnit], [leftUnit, rightUnit]];

            for (const [atkUnit, defUnit] of order) {
                if (atkUnit.curHp <= 0 || defUnit.curHp <= 0) continue;

                // Hiệu ứng duy trì đầu lượt (Độc / Cháy)
                if (atkUnit.status.poison > 0) {
                    const dmg = Math.max(5, Math.floor(atkUnit.maxHp * 0.06));
                    atkUnit.curHp = Math.max(0, atkUnit.curHp - dmg);
                    atkUnit.status.poison--;
                    logs.push({ lHp: leftUnit.curHp, rHp: rightUnit.curHp, text: `🟢 [${atkUnit.name}] ngấm độc mất ${dmg} HP!` });
                    if (atkUnit.curHp <= 0) break;
                }
                if (atkUnit.status.burn > 0) {
                    const dmg = Math.max(5, Math.floor(atkUnit.maxHp * 0.07));
                    atkUnit.curHp = Math.max(0, atkUnit.curHp - dmg);
                    atkUnit.status.burn--;
                    logs.push({ lHp: leftUnit.curHp, rHp: rightUnit.curHp, text: `🔥 [${atkUnit.name}] bị thiêu đốt mất ${dmg} HP!` });
                    if (atkUnit.curHp <= 0) break;
                }

                if (atkUnit.healCd > 0) atkUnit.healCd--;
                if (atkUnit.status.slow > 0) atkUnit.status.slow--;
                if (atkUnit.status.shield > 0) atkUnit.status.shield--;

                // Kiểm tra Choáng
                if (atkUnit.status.stun > 0) {
                    atkUnit.status.stun--;
                    logs.push({ lHp: leftUnit.curHp, rHp: rightUnit.curHp, text: `💫 [${atkUnit.name}] bị choáng, mất lượt!` });
                    continue;
                }

                // Kiểm tra Đặc kỹ Hồi Phục Linh Hồn (x2 Dame)
                const hasHeal = atkUnit.trait?.type === 'heal' || atkUnit.hasHealSkill;
                if (hasHeal && atkUnit.healCd === 0 && atkUnit.curHp < atkUnit.maxHp * 0.85) {
                    const healAmt = Math.floor(atkUnit.atk * 2);
                    atkUnit.curHp = Math.min(atkUnit.maxHp, atkUnit.curHp + healAmt);
                    atkUnit.healCd = 3;
                    logs.push({ lHp: leftUnit.curHp, rHp: rightUnit.curHp, text: `💚 [${atkUnit.name}] kích hoạt Hồi Phục Linh Hồn (+${healAmt} HP)!` });
                    continue;
                }

                // Tính sát thương đánh thường + Ngũ Hành + Chí Mạng + Đặc kỹ
                const elemMult = getElementAdvantage(atkUnit.element, defUnit.element);
                const isCrit = rng() < 0.2;
                const shieldMult = defUnit.status.shield > 0 ? 0.65 : 1.0;
                const variance = 0.9 + rng() * 0.2;
                let dmg = Math.max(10, Math.floor(atkUnit.atk * elemMult * (isCrit ? 1.5 : 1.0) * shieldMult * variance));
                defUnit.curHp = Math.max(0, defUnit.curHp - dmg);

                let note = isCrit ? ' 💥CHÍ MẠNG!' : '';
                if (elemMult > 1) note += ' (Khắc hệ)';

                // Kích hoạt đặc kỹ phụ trợ
                if (atkUnit.trait && defUnit.curHp > 0) {
                    const roll = rng() * 100;
                    const chance = atkUnit.trait.chance || 25;
                    if (roll < chance) {
                        if (atkUnit.trait.type === 'stun') { defUnit.status.stun = 1; note += ' 💫Gây Choáng!'; }
                        else if (atkUnit.trait.type === 'poison') { defUnit.status.poison = 2; note += ' 🟢Trúng Độc!'; }
                        else if (atkUnit.trait.type === 'burn') { defUnit.status.burn = 2; note += ' 🔥Thiêu Đốt!'; }
                        else if (atkUnit.trait.type === 'slow') { defUnit.status.slow = 2; note += ' ❄️Làm Chậm!'; }
                        else if (atkUnit.trait.type === 'shield') { atkUnit.status.shield = 2; note += ' 🛡️Bật Khiên!'; }
                    }
                }

                logs.push({
                    lHp: leftUnit.curHp,
                    rHp: rightUnit.curHp,
                    text: `⚔️ [${atkUnit.name}] tấn công [${defUnit.name}] gây ${dmg} sát thương!${note}`
                });
            }
        }

        const winnerOwner = leftUnit.curHp > 0 ? leftName : rightName;
        const iWon = winnerOwner.toLowerCase() === cfg.myName.toLowerCase();

        content.innerHTML = `
            <div class="border-b border-amber-500/40 pb-2 mb-3 flex justify-between items-center">
                <span class="font-black text-sm ${isDeathmatch ? 'text-red-400' : 'text-amber-300'}">
                    ${isDeathmatch ? '☠️ ĐẤU SINH TỬ 1VS1 (AUTO)' : '⚔️ ĐẤU TRƯỜNG DANH VỌNG 1VS1'}
                </span>
                <span class="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">Auto-Battle</span>
            </div>

            <div class="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div class="bg-zinc-900 border border-sky-500/40 rounded-xl p-2.5 text-center">
                    <div class="text-[10px] text-sky-300 font-bold truncate">👤 ${leftName}</div>
                    <div class="text-3xl my-1">${leftUnit.emoji || '🐾'}</div>
                    <div class="font-black text-white truncate">${leftUnit.name} (Lv.${leftUnit.level || 1})</div>
                    <div class="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden mt-1.5">
                        <div id="pvp-left-hp-bar" class="bg-emerald-500 h-full transition-all duration-300" style="width:100%"></div>
                    </div>
                    <div id="pvp-left-hp-text" class="text-[10px] font-bold text-emerald-300 mt-1">${leftUnit.maxHp} / ${leftUnit.maxHp}</div>
                </div>

                <div class="bg-zinc-900 border border-rose-500/40 rounded-xl p-2.5 text-center">
                    <div class="text-[10px] text-rose-300 font-bold truncate">👤 ${rightName}</div>
                    <div class="text-3xl my-1">${rightUnit.emoji || '🐾'}</div>
                    <div class="font-black text-white truncate">${rightUnit.name} (Lv.${rightUnit.level || 1})</div>
                    <div class="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden mt-1.5">
                        <div id="pvp-right-hp-bar" class="bg-emerald-500 h-full transition-all duration-300" style="width:100%"></div>
                    </div>
                    <div id="pvp-right-hp-text" class="text-[10px] font-bold text-emerald-300 mt-1">${rightUnit.maxHp} / ${rightUnit.maxHp}</div>
                </div>
            </div>

            <div id="pvp-battle-log" class="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 h-40 overflow-y-auto text-[11px] space-y-1 text-zinc-200">
                <div class="text-amber-300 font-bold">🔔 Trận đấu bắt đầu!</div>
            </div>

            <div id="pvp-battle-footer" class="mt-3 text-center text-xs text-zinc-400">
                Đang giao chiến tự động...
            </div>
        `;

        let step = 0;
        pvpBattleTimer = setInterval(async () => {
            if (step >= logs.length) {
                clearInterval(pvpBattleTimer);
                pvpBattleTimer = null;
                currentPvpMatch = null;
                await finalizePvpOutcome(cfg, iWon, winnerOwner);
                return;
            }

            const entry = logs[step++];
            const lPct = Math.max(0, Math.round((entry.lHp / leftUnit.maxHp) * 100));
            const rPct = Math.max(0, Math.round((entry.rHp / rightUnit.maxHp) * 100));

            const lBar = document.getElementById('pvp-left-hp-bar');
            const rBar = document.getElementById('pvp-right-hp-bar');
            const lTxt = document.getElementById('pvp-left-hp-text');
            const rTxt = document.getElementById('pvp-right-hp-text');
            const logBox = document.getElementById('pvp-battle-log');

            if (lBar) lBar.style.width = lPct + '%';
            if (rBar) rBar.style.width = rPct + '%';
            if (lTxt) lTxt.innerText = `${entry.lHp} / ${leftUnit.maxHp}`;
            if (rTxt) rTxt.innerText = `${entry.rHp} / ${rightUnit.maxHp}`;
            if (logBox) {
                logBox.insertAdjacentHTML('beforeend', `<div>${entry.text}</div>`);
                logBox.scrollTop = logBox.scrollHeight;
            }
        }, 650);
    }

    async function finalizePvpOutcome(cfg, iWon, winnerOwner) {
        const footer = document.getElementById('pvp-battle-footer');
        let summaryHtml = '';

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
                        leadPet: `${cfg.myPet.emoji || '🐾'} ${cfg.myPet.name} (Lv.${cfg.myPet.level || 1})`
                    })
                });
                const data = await res.json();
                if (data.ok) newPts = ` (Tổng: ${data.points} ĐV)`;
            } catch (e) {}

            summaryHtml = iWon
                ? `<div class="text-emerald-400 font-black text-sm mb-2">🎉 CHIẾN THẮNG! +${delta} Điểm Danh Vọng${newPts}</div>`
                : `<div class="text-rose-400 font-black text-sm mb-2">💔 THẤT BẠI! ${delta} Điểm Danh Vọng${newPts}</div>`;
            summaryHtml += `<button onclick="openPvpArenaHub()" class="w-full bg-amber-600 hover:bg-amber-500 py-2 rounded-xl font-black text-white cursor-pointer">Quay lại Bảng Xếp Hạng</button>`;
        } else {
            // Chế độ Khiêu Chiến Sinh Tử
            try {
                await fetch('/api/pvp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'duel_finish', duelId: cfg.duelId, winner: winnerOwner })
                });
            } catch (e) {}

            if (iWon) {
                summaryHtml = `
                    <div class="text-emerald-400 font-black text-sm mb-1">🏆 BẠN ĐÃ CHIẾN THẮNG TRẬN SINH TỬ!</div>
                    <div class="text-xs text-zinc-300 mb-2">Linh thú [${cfg.enemyPet.name}] của ${cfg.enemyName} đã bị tiêu diệt vĩnh viễn!</div>
                    <button onclick="closeModal()" class="w-full bg-emerald-600 py-2 rounded-xl font-black text-white cursor-pointer">Hoàn Tất</button>
                `;
            } else {
                permanentlyRemovePet(cfg.myPet.id, cfg.myPet.name);
                summaryHtml = `
                    <div class="text-red-500 font-black text-sm mb-1">☠️ BẠN ĐÃ THUA TRẬN SINH TỬ!</div>
                    <div class="text-xs text-red-200 mb-2">Linh thú <b>[${cfg.myPet.name} Lv.${cfg.myPet.level || 1}]</b> đã tử trận và biến mất vĩnh viễn!</div>
                    <button onclick="closeModal()" class="w-full bg-zinc-800 border border-zinc-600 py-2 rounded-xl font-black text-white cursor-pointer">Chấp Nhận</button>
                `;
            }
        }

        if (footer) footer.innerHTML = summaryHtml;
    }
})();