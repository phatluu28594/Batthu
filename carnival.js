/**
 * carnival.js - Chuỗi Sự Kiện Tân Thủ 7 Ngày (7-Day Carnival)
 * Bắt Thú Vương AR - Hệ thống quà tặng tân thủ giữ chân người chơi tuần đầu tiên
 */

(function () {
    const CARNIVAL_STORAGE_KEY = 'ar_7day_carnival';

    // Cấu hình danh sách phần thưởng 7 ngày
    const CARNIVAL_DAYS_CONFIG = [
        {
            day: 1,
            title: 'Ngày 1: Gia Nhập Thế Giới',
            desc: '1.000 Vàng + 50 Kim Cương',
            badge: '🪙 1.000 + 💎 50',
            icon: '💰',
            previewImg: './background.webp',
            claimText: 'Nhận 1.000 Vàng & 50 Kim Cương'
        },
        {
            day: 2,
            title: 'Ngày 2: Đồng Đội Đầu Tiên',
            desc: 'Linh Thú Hiếm Hệ Thủy (Hải Cẩu)',
            badge: '🟢 Hải Cẩu',
            icon: '🦭',
            previewImg: 'assets/haicau.webp',
            claimText: 'Nhận Hải Cẩu (Hiếm)'
        },
        {
            day: 3,
            title: 'Ngày 3: Vũ Trang Tận Răng',
            desc: 'Bộ Trang Bị Tím (Cấp 20)',
            badge: '🟣 Bộ Ấn Ký Cấp 20',
            icon: '🛡️',
            previewImg: 'assets_gear/gears.webp',
            claimText: 'Nâng Cấp Đồ Tím Cấp 20'
        },
        {
            day: 4,
            title: 'Ngày 4: Tiếp Tế Thợ Săn',
            desc: '2.000 Vàng + 5 Vé Quay + 5 Đá Mỗi Hệ',
            badge: '🎟️ x5 + 🪨 x25',
            icon: '🎁',
            previewImg: 'assets/trung.webp',
            claimText: 'Nhận Quà Tiếp Tế'
        },
        {
            day: 5,
            title: 'Ngày 5: Kỳ Tích Lai Tạo',
            desc: 'Trứng Biến Dị F1 (Đột Biến Quý Hiếm)',
            badge: '🥚 Trứng F1 Biến Dị',
            icon: '🥚',
            previewImg: 'assets/trung.webp',
            claimText: 'Nhận Trứng Biến Dị F1'
        },
        {
            day: 6,
            title: 'Ngày 6: Bứt Phá Sức Mạnh',
            desc: '100 Kim Cương + 10 Tiệc Thịt Thần Kỳ',
            badge: '💎 100 + 🍖 x10',
            icon: '🍖',
            previewImg: './farm-bg.webp',
            claimText: 'Nhận 100💎 & 10 Thịt Thần'
        },
        {
            day: 7,
            title: 'Ngày 7: Thợ Săn Tiên Phong',
            desc: 'Danh Hiệu Độc Quyền + Linh Thú Huyền Thoại Tự Chọn',
            badge: '👑 Danh Hiệu + 🔴 Pet Đỏ',
            icon: '👑',
            previewImg: 'assets_boss/ronglua.webp',
            claimText: 'Chọn Linh Thú Huyền Thoại'
        }
    ];

    function getCarnivalData() {
        const today = new Date().toISOString().slice(0, 10);
        let defaultData = {
            loginDays: 1,
            lastLoginDate: today,
            claimed: {}
        };

        try {
            const raw = localStorage.getItem(CARNIVAL_STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.lastLoginDate !== today) {
                    parsed.loginDays = Math.min(7, (parsed.loginDays || 0) + 1);
                    parsed.lastLoginDate = today;
                    localStorage.setItem(CARNIVAL_STORAGE_KEY, JSON.stringify(parsed));
                }
                return parsed;
            }
        } catch (e) {
            console.error('[Carnival] Lỗi đọc dữ liệu:', e);
        }

        localStorage.setItem(CARNIVAL_STORAGE_KEY, JSON.stringify(defaultData));
        return defaultData;
    }

    function saveCarnivalData(data) {
        try {
            localStorage.setItem(CARNIVAL_STORAGE_KEY, JSON.stringify(data));
        } catch (e) {}
        updateCarnivalBadge();
    }

    // Cập nhật chấm đỏ thông báo trên nút Tân Thủ
    window.updateCarnivalBadge = function () {
        const data = getCarnivalData();
        let hasUnclaimed = false;
        for (let d = 1; d <= data.loginDays; d++) {
            if (!data.claimed[d]) {
                hasUnclaimed = true;
                break;
            }
        }

        const badges = document.querySelectorAll('.carnival-notify-badge');
        badges.forEach(b => {
            if (hasUnclaimed) b.classList.remove('hidden');
            else b.classList.add('hidden');
        });
    };

    // Mở Modal Sự Kiện 7 Ngày
    window.openCarnivalModal = function () {
        const data = getCarnivalData();
        let modal = document.getElementById('carnival-modal');
        if (!modal) {
            modal = createCarnivalModalDOM();
            document.body.appendChild(modal);
        }

        renderCarnivalDays(data);
        modal.classList.remove('hidden');
        if (typeof window.triggerHaptic === 'function') window.triggerHaptic('light');
    };

    window.closeCarnivalModal = function () {
        const modal = document.getElementById('carnival-modal');
        if (modal) modal.classList.add('hidden');
    };

    function createCarnivalModalDOM() {
        const wrap = document.createElement('div');
        wrap.id = 'carnival-modal';
        wrap.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 hidden';
        wrap.innerHTML = `
            <div class="relative w-full max-w-lg max-h-[92vh] bg-gradient-to-b from-zinc-900 to-black rounded-3xl border border-amber-500/40 shadow-2xl flex flex-col overflow-hidden text-white animate-scale-up">
                <!-- Header -->
                <div class="p-4 bg-gradient-to-r from-amber-950/80 via-zinc-900 to-amber-950/80 border-b border-amber-500/30 flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <span class="text-3xl animate-bounce">🎁</span>
                        <div>
                            <h2 class="text-base font-black text-amber-300 tracking-wide uppercase flex items-center gap-1.5">
                                Chuỗi Sự Kiện Tân Thủ 7 Ngày
                            </h2>
                            <p class="text-[11px] text-zinc-300">Đăng nhập mỗi ngày để nhận Thú Hiếm & Trang Bị Tím!</p>
                        </div>
                    </div>
                    <button onclick="closeCarnivalModal()" class="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-black flex items-center justify-center cursor-pointer transition">✕</button>
                </div>

                <!-- Days Container -->
                <div id="carnival-days-list" class="p-3.5 space-y-2.5 overflow-y-auto max-h-[68vh] no-scrollbar">
                    <!-- Render dynamic cards -->
                </div>

                <!-- Footer -->
                <div class="p-3 bg-zinc-950/90 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
                    <span id="carnival-day-summary">Đã đăng nhập: 1 / 7 Ngày</span>
                    <button onclick="closeCarnivalModal()" class="bg-zinc-800 hover:bg-zinc-700 px-4 py-1.5 rounded-xl font-bold text-white cursor-pointer transition">Đóng</button>
                </div>
            </div>
        `;
        return wrap;
    }

    function renderCarnivalDays(data) {
        const list = document.getElementById('carnival-days-list');
        const summary = document.getElementById('carnival-day-summary');
        if (!list) return;

        if (summary) summary.innerText = `Đã đăng nhập: ${data.loginDays} / 7 Ngày`;

        list.innerHTML = CARNIVAL_DAYS_CONFIG.map(cfg => {
            const isClaimed = !!data.claimed[cfg.day];
            const isUnlocked = cfg.day <= data.loginDays;
            const canClaim = isUnlocked && !isClaimed;

            let borderStyle = isClaimed
                ? 'border-zinc-800 bg-zinc-900/50 opacity-70'
                : canClaim
                ? 'border-amber-400/80 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-amber-950/20 shadow-lg shadow-amber-950/30 ring-1 ring-amber-400/30'
                : 'border-zinc-800 bg-zinc-950/60 opacity-60';

            let btnHtml = '';
            if (isClaimed) {
                btnHtml = `<span class="bg-zinc-800 text-zinc-500 text-[11px] font-bold px-3 py-1.5 rounded-xl border border-white/5">✓ Đã Nhận</span>`;
            } else if (canClaim) {
                btnHtml = `
                    <button onclick="claimCarnivalReward(${cfg.day})" class="bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black font-black text-xs px-3.5 py-1.5 rounded-xl shadow-md cursor-pointer animate-pulse transition">
                        Nhận Ngay
                    </button>
                `;
            } else {
                btnHtml = `<span class="bg-zinc-900 text-zinc-500 text-[10px] font-bold px-2.5 py-1.5 rounded-xl border border-white/5">🔒 Mở vào Ngày ${cfg.day}</span>`;
            }

            return `
                <div class="flex items-center justify-between p-3 rounded-2xl border ${borderStyle} transition">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center text-2xl shrink-0 relative overflow-hidden">
                            <span>${cfg.icon}</span>
                            ${isClaimed ? '<div class="absolute inset-0 bg-black/60 flex items-center justify-center text-emerald-400 font-bold text-sm">✓</div>' : ''}
                        </div>
                        <div class="text-left">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-black ${canClaim ? 'text-amber-300' : 'text-zinc-300'}">${cfg.title}</span>
                                <span class="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded font-bold">${cfg.badge}</span>
                            </div>
                            <div class="text-[11px] text-zinc-400 mt-0.5">${cfg.desc}</div>
                        </div>
                    </div>
                    <div class="shrink-0 ml-2">
                        ${btnHtml}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Nhận quà ngày cụ thể
    window.claimCarnivalReward = function (day) {
        const data = getCarnivalData();
        if (day > data.loginDays || data.claimed[day]) return;

        if (day === 1) {
            window.playerCoins = (window.playerCoins || 0) + 1000;
            window.playerDiamonds = (window.playerDiamonds || 0) + 50;
            finalizeClaim(day, '1.000 Vàng & 50 Kim Cương');
        } else if (day === 2) {
            // Linh Thú Hiếm Hệ Thủy Hải Cẩu
            const petHaicau = {
                id: 'pet_carnival_haicau_' + Date.now(),
                name: 'Hải Cẩu',
                sheet: 'assets/haicau.webp',
                element: 'Thuy',
                level: 10,
                hp: 380,
                maxHp: 380,
                atk: 75,
                speed: 52,
                hearts: 3,
                gender: 'Cái',
                rarity: { name: 'Hiếm', color: 'text-emerald-400', bg: 'border-emerald-500', badge: '🟢 Xanh', statMultiplier: 1.3 },
                trait: { name: 'Hộ thân Buff Giáp', icon: '🛡️ Buff', type: 'shield', chance: 35 }
            };
            addPetToTeamOrFarm(petHaicau);
            finalizeClaim(day, 'Linh Thú Hiếm [Hải Cẩu]');
        } else if (day === 3) {
            // Bộ Trang Bị Tím Cấp 20 cho Pet đầu tiên
            const targetPet = (window.team && window.team[0]) || (window.farm && window.farm[0]);
            if (targetPet) {
                targetPet.gearTier = Math.max(targetPet.gearTier || 0, 2);
                targetPet.gears = { claw: 20, armor: 20, orb: 20 };
                targetPet.hp = targetPet.maxHp + 200;
                targetPet.maxHp += 200;
                finalizeClaim(day, `Bộ Trang Bị Tím Cấp 20 cho [${targetPet.name}]`);
            } else {
                window.playerCoins = (window.playerCoins || 0) + 2500;
                finalizeClaim(day, '2.500 Vàng Tiếp Tế');
            }
        } else if (day === 4) {
            window.playerCoins = (window.playerCoins || 0) + 2000;
            if (window.inventory) {
                window.inventory.luckyTicket = (window.inventory.luckyTicket || 0) + 5;
                window.inventory.stoneKim = (window.inventory.stoneKim || 0) + 5;
                window.inventory.stoneMoc = (window.inventory.stoneMoc || 0) + 5;
                window.inventory.stoneThuy = (window.inventory.stoneThuy || 0) + 5;
                window.inventory.stoneHoa = (window.inventory.stoneHoa || 0) + 5;
                window.inventory.stoneTho = (window.inventory.stoneTho || 0) + 5;
            }
            finalizeClaim(day, '2.000 Vàng + 5 Vé Quay + 25 Đá Tiến Hóa');
        } else if (day === 5) {
            // Trứng Biến Dị F1
            const mutantPet = {
                id: 'pet_f1_mutant_' + Date.now(),
                name: 'Rồng Băng F1 Đột Biến',
                element: 'Thuy',
                level: 1,
                hp: 420,
                maxHp: 420,
                atk: 88,
                speed: 60,
                hearts: 3,
                rarity: { name: 'Cực Hiếm', color: 'text-yellow-400', bg: 'border-yellow-500', badge: '🟡 Vàng', statMultiplier: 1.6 },
                trait: { name: 'Làm chậm đối thủ', icon: '❄️ Chậm', type: 'slow', chance: 35 }
            };
            if (!Array.isArray(window.eggs)) window.eggs = [];
            window.eggs.push({
                name: 'Trứng Biến Dị F1',
                element: 'Thuy',
                rarity: mutantPet.rarity,
                steps: 0,
                requiredSteps: 40,
                petData: mutantPet
            });
            finalizeClaim(day, 'Trứng Biến Dị F1 (Ấp trong 40 bước)');
        } else if (day === 6) {
            window.playerDiamonds = (window.playerDiamonds || 0) + 100;
            if (window.inventory) {
                window.inventory.food = (window.inventory.food || 0) + 10;
            }
            finalizeClaim(day, '100 Kim Cương + 10 Tiệc Thịt Thần Kỳ');
        } else if (day === 7) {
            // Mở Modal Chọn Linh Thú Huyền Thoại
            openMythicSelectModal();
        }
    };

    function finalizeClaim(day, rewardName) {
        const data = getCarnivalData();
        data.claimed[day] = true;
        saveCarnivalData(data);

        if (typeof window.saveGameData === 'function') window.saveGameData();
        if (typeof window.updateTeamCount === 'function') window.updateTeamCount();
        if (typeof window.syncCurrentAccountToCloud === 'function') window.syncCurrentAccountToCloud();
        if (typeof window.triggerHaptic === 'function') window.triggerHaptic('success');

        renderCarnivalDays(data);
        alert(`🎉 Chúc mừng bạn đã nhận thưởng Ngày ${day}:\n${rewardName}!`);
    }

    function addPetToTeamOrFarm(pet) {
        let sanitized = pet;
        if (typeof window.sanitizePetsData === 'function') {
            sanitized = window.sanitizePetsData([pet])[0];
        }
        if (window.team && window.team.length < 3) {
            window.team.push(sanitized);
        } else if (window.farm) {
            window.farm.push(sanitized);
        }
    }

    // Modal chọn Linh Thú Huyền Thoại Ngày 7
    function openMythicSelectModal() {
        let mModal = document.getElementById('mythic-select-modal');
        if (!mModal) {
            mModal = document.createElement('div');
            mModal.id = 'mythic-select-modal';
            mModal.className = 'fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 text-white';
            mModal.innerHTML = `
                <div class="relative w-full max-w-md bg-zinc-950 rounded-3xl border border-red-500/50 shadow-2xl p-5 text-center flex flex-col gap-3.5 animate-scale-up">
                    <div class="text-3xl animate-bounce">👑</div>
                    <h3 class="text-lg font-black text-red-400 uppercase tracking-wide">
                        Chọn 1 Linh Thú Huyền Thoại
                    </h3>
                    <p class="text-xs text-zinc-300">Bạn đã hoàn thành 7 ngày gắn bó! Hãy chọn 1 Viễn Cổ Thần Thú để đồng hành:</p>

                    <div class="grid grid-cols-1 gap-2.5 my-2">
                        <!-- Rồng Lửa -->
                        <div onclick="pickMythicPet('ronglua')" class="flex items-center gap-3 p-3 rounded-2xl border border-red-500/40 bg-red-950/30 hover:border-red-400 hover:bg-red-900/40 cursor-pointer transition">
                            <span class="text-3xl">🐲</span>
                            <div class="text-left grow">
                                <div class="text-xs font-black text-red-300">Rồng Lửa Viễn Cổ (Hệ Hỏa)</div>
                                <div class="text-[10px] text-zinc-400">Công cực đại, đòn thiêu đốt diện rộng!</div>
                            </div>
                            <span class="text-xs font-bold text-red-400">Chọn ➔</span>
                        </div>
                        <!-- Cerberus -->
                        <div onclick="pickMythicPet('cerberus')" class="flex items-center gap-3 p-3 rounded-2xl border border-amber-500/40 bg-amber-950/30 hover:border-amber-400 hover:bg-amber-900/40 cursor-pointer transition">
                            <span class="text-3xl">🐕</span>
                            <div class="text-left grow">
                                <div class="text-xs font-black text-amber-300">Chó Địa Ngục Cerberus (Hệ Thổ)</div>
                                <div class="text-[10px] text-zinc-400">Máu trâu, phản đòn và kháng khống chế!</div>
                            </div>
                            <span class="text-xs font-bold text-amber-400">Chọn ➔</span>
                        </div>
                        <!-- Hydra -->
                        <div onclick="pickMythicPet('hydra')" class="flex items-center gap-3 p-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 hover:border-emerald-400 hover:bg-emerald-900/40 cursor-pointer transition">
                            <span class="text-3xl">🐍</span>
                            <div class="text-left grow">
                                <div class="text-xs font-black text-emerald-300">Thần Thú Hydra 9 Đầu (Hệ Mộc)</div>
                                <div class="text-[10px] text-zinc-400">Hồi phục vô tận, độc sát đa mục tiêu!</div>
                            </div>
                            <span class="text-xs font-bold text-emerald-400">Chọn ➔</span>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(mModal);
        } else {
            mModal.classList.remove('hidden');
        }
    }

    window.pickMythicPet = function (type) {
        let petData = null;
        if (type === 'ronglua') {
            petData = {
                id: 'pet_mythic_ronglua_' + Date.now(),
                name: 'Rồng Lửa',
                sheet: 'assets_boss/ronglua.webp',
                element: 'Hoa',
                level: 15,
                hp: 600,
                maxHp: 600,
                atk: 140,
                speed: 68,
                hearts: 3,
                rarity: { name: 'Huyền Thoại', color: 'text-red-500', bg: 'border-red-500', badge: '🔴 Đỏ', statMultiplier: 2.0 },
                trait: { name: 'Thiêu đốt diện rộng', icon: '🔥 Cháy', type: 'burn', chance: 40 }
            };
        } else if (type === 'cerberus') {
            petData = {
                id: 'pet_mythic_cerberus_' + Date.now(),
                name: 'Cerberus',
                sheet: 'assets_boss/Cerberus.webp',
                element: 'Tho',
                level: 15,
                hp: 750,
                maxHp: 750,
                atk: 120,
                speed: 55,
                hearts: 3,
                rarity: { name: 'Huyền Thoại', color: 'text-red-500', bg: 'border-red-500', badge: '🔴 Đỏ', statMultiplier: 2.0 },
                trait: { name: 'Khả năng Làm choáng', icon: '💫 Choáng', type: 'stun', chance: 35 }
            };
        } else {
            petData = {
                id: 'pet_mythic_hydra_' + Date.now(),
                name: 'Hydra',
                sheet: 'assets_boss/Hydra.webp',
                element: 'Moc',
                level: 15,
                hp: 680,
                maxHp: 680,
                atk: 130,
                speed: 62,
                hearts: 3,
                rarity: { name: 'Huyền Thoại', color: 'text-red-500', bg: 'border-red-500', badge: '🔴 Đỏ', statMultiplier: 2.0 },
                trait: { name: 'Hồi Phục Linh Hồn', icon: '💚 Hồi Máu', type: 'heal', chance: 40 }
            };
        }

        // Tặng danh hiệu
        localStorage.setItem('ar_player_title', 'Thợ Săn Tiên Phong');
        addPetToTeamOrFarm(petData);

        const mModal = document.getElementById('mythic-select-modal');
        if (mModal) mModal.classList.add('hidden');

        finalizeClaim(7, `Linh Thú Huyền Thoại [${petData.name}] & Danh Hiệu "Thợ Săn Tiên Phong"`);

        if (window.sendWorldChat) {
            const hunter = localStorage.getItem('ar_cloud_user') || 'Một Thợ Săn';
            window.sendWorldChat(`🎉 [${hunter}] vừa hoàn thành 7 Ngày Tân Thủ và sở hữu Viễn Thú Huyền Thoại [${petData.name}]!`, true);
        }
    };

    // Kiểm tra badge lúc khởi động
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateCarnivalBadge);
    } else {
        updateCarnivalBadge();
    }
})();
