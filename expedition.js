/**
 * expedition.js - Hệ Thống Thám Hiểm Phó Bản Tự Động (Offline Expedition / Pet Idle Dispatch)
 * Bắt Thú Vương AR - Phái linh thú đi khai hoang 3 vùng đất hiểm trở mang tài nguyên về
 */

(function () {
    const EXPEDITION_STORAGE_KEY = 'ar_active_expedition';

    // CẤU HÌNH 3 VÙNG ĐẤT THÁM HIỂM ĐẶC TRƯNG
    const EXPEDITION_ZONES = [
        {
            id: 'forest',
            name: 'Rừng Sương Mù',
            subtitle: 'Đại Ngàn Huyền Bí',
            icon: '🌲',
            bg: 'zone_forest.webp',
            fallbackBg: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
            badgeBg: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300',
            accentColor: '#10b981',
            favoredElements: ['Moc', 'Thuy'], // Mộc & Thủy
            favoredLabel: 'Hệ Mộc 🌿 & Hệ Thủy 💧',
            bonusDesc: '+35% Tỷ lệ Quà Quý & Cơ Hội Rơi Trứng Linh Thú Xanh',
            lore: 'Khu rừng đại thụ ngàn năm rêu phong mây mờ ảo diệu. Nơi đây dồi dào sinh khí tự nhiên, ẩn chứa nhiều thảo mộc tăng lực và trứng linh thú hệ Mộc/Thủy.',
            specialDrops: [
                { key: 'stoneMoc', name: 'Đá Mộc', icon: '🌿' },
                { key: 'stoneThuy', name: 'Đá Thủy', icon: '💧' },
                { key: 'food', name: 'Thịt Thần', icon: '🍖' },
                { key: 'toy', name: 'Đồ Chơi', icon: '🎾' },
                { key: 'luckyTicket', name: 'Vé Quay', icon: '🎟️' }
            ]
        },
        {
            id: 'volcano',
            name: 'Đỉnh Núi Lửa',
            subtitle: 'Hoả Ngục Bất Tận',
            icon: '🌋',
            bg: 'zone_volcano.webp',
            fallbackBg: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)',
            badgeBg: 'bg-rose-950/80 border-rose-500/60 text-rose-300',
            accentColor: '#ef4444',
            favoredElements: ['Hoa', 'Tho'], // Hỏa & Thổ
            favoredLabel: 'Hệ Hỏa 🔥 & Hệ Thổ 🪨',
            bonusDesc: '+35% Tỷ lệ Quà Quý & Cơ Hội Rơi Rương Ấn Ký / KC Khủng',
            lore: 'Miệng núi lửa bốc khói nham thạch đỏ rực trên vách đá bazan đen. Là thánh địa rèn đúc trang bị bảo vật và tích tụ khối lượng Vàng, Kim Cương khổng lồ.',
            specialDrops: [
                { key: 'stoneHoa', name: 'Đá Hỏa', icon: '🔥' },
                { key: 'stoneTho', name: 'Đá Thổ', icon: '🪨' },
                { key: 'gearShardChest', name: 'Rương Mảnh TB', icon: '🧰' },
                { key: 'diamonds', name: 'Kim Cương', icon: '💎' },
                { key: 'coins', name: 'Vàng Khủng', icon: '🪙' }
            ]
        },
        {
            id: 'swamp',
            name: 'Đầm Lầy Cổ Xưa',
            subtitle: 'Vực Thẳm U Tịch',
            icon: '🍄',
            bg: 'zone_swamp.webp',
            fallbackBg: 'linear-gradient(135deg, #3b0764 0%, #1e1b4b 100%)',
            badgeBg: 'bg-purple-950/80 border-purple-500/60 text-purple-300',
            accentColor: '#a855f7',
            favoredElements: ['Kim', 'Thuy'], // Kim & Thủy
            favoredLabel: 'Hệ Kim ⚔️ & Hệ Thủy 💧',
            bonusDesc: '+35% Tỷ lệ Quà Quý & Cơ Hội Rơi Mảnh Thần Thoại / Trứng F1',
            lore: 'Vùng đầm nước phản chiếu nấm phát quang tím ma mị và rễ cây đan xen cổ quái. Nơi lưu giữ tàn tích sinh học thượng cổ cùng mảnh ghép Thần Thú bí ẩn.',
            specialDrops: [
                { key: 'stoneKim', name: 'Đá Kim', icon: '⚔️' },
                { key: 'mythicShards', name: 'Mảnh Thần', icon: '🧩' },
                { key: 'arenaTicket', name: 'Vé PvP', icon: '⚔️' },
                { key: 'cleanseWater', name: 'Nước Thanh Tẩy', icon: '🍶' },
                { key: 'expPotion', name: 'Thuốc EXP', icon: '🧪' }
            ]
        }
    ];

    // CẤU HÌNH 3 MỐC THỜI GIAN KHÁM PHÁ
    const EXPEDITION_DURATIONS = [
        {
            hours: 2,
            title: '2 Giờ',
            tag: '⚡ Thám Hiểm Nhanh',
            minGold: 800,
            maxGold: 1600,
            minDiamonds: 0,
            maxDiamonds: 8,
            stoneBaseQty: 2,
            baseExp: 200,
            eggChance: 0.08
        },
        {
            hours: 6,
            title: '6 Giờ',
            tag: '🌟 Thám Hiểm Tiêu Chuẩn',
            minGold: 2600,
            maxGold: 4800,
            minDiamonds: 12,
            maxDiamonds: 30,
            stoneBaseQty: 5,
            baseExp: 650,
            eggChance: 0.25
        },
        {
            hours: 12,
            title: '12 Giờ',
            tag: '👑 Đại Chinh Phạt (Qua Đêm)',
            minGold: 6000,
            maxGold: 11000,
            minDiamonds: 40,
            maxDiamonds: 90,
            stoneBaseQty: 10,
            baseExp: 1600,
            eggChance: 0.55
        }
    ];

    // Trạng thái hiện tại trên UI
    let selectedZoneIndex = 0;
    let selectedDurationHours = 6;
    let selectedPetIds = []; // Mảng ID 1..3 thú được chọn
    let expeditionTimerInterval = null;

    // Lấy thông tin chuyến thám hiểm đang hoạt động
    function getActiveExpedition() {
        try {
            const raw = localStorage.getItem(EXPEDITION_STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error('[Expedition] Lỗi parse dữ liệu thám hiểm:', e);
        }
        return null;
    }

    function saveActiveExpedition(data) {
        if (!data) {
            localStorage.removeItem(EXPEDITION_STORAGE_KEY);
        } else {
            localStorage.setItem(EXPEDITION_STORAGE_KEY, JSON.stringify(data));
        }
        updateExpeditionNotifyBadges();
    }

    // Kiểm tra và cập nhật chấm đỏ thông báo
    window.updateExpeditionNotifyBadges = function () {
        const exp = getActiveExpedition();
        let isReadyToHarvest = false;
        if (exp && Date.now() >= exp.endTime) {
            isReadyToHarvest = true;
        }

        const badges = document.querySelectorAll('.expedition-notify-badge');
        badges.forEach(b => {
            if (isReadyToHarvest) b.classList.remove('hidden');
            else b.classList.add('hidden');
        });
    };

    // Mở Modal Thám Hiểm
    window.openExpeditionModal = function () {
        let modal = document.getElementById('expedition-modal');
        if (!modal) {
            modal = createExpeditionModalDOM();
            document.body.appendChild(modal);
        }

        renderExpeditionUI();
        modal.classList.remove('hidden');

        if (expeditionTimerInterval) clearInterval(expeditionTimerInterval);
        expeditionTimerInterval = setInterval(updateExpeditionCountdown, 1000);

        if (typeof window.triggerHaptic === 'function') window.triggerHaptic('light');
    };

    window.closeExpeditionModal = function () {
        if (expeditionTimerInterval) clearInterval(expeditionTimerInterval);
        const modal = document.getElementById('expedition-modal');
        if (modal) modal.classList.add('hidden');
    };

    function createExpeditionModalDOM() {
        const wrap = document.createElement('div');
        wrap.id = 'expedition-modal';
        wrap.className = 'fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 hidden select-none';
        wrap.innerHTML = `
            <div id="expedition-modal-body" class="relative w-full max-w-md max-h-[92vh] max-h-[92dvh] bg-zinc-950 rounded-3xl border-2 border-emerald-500/50 shadow-2xl flex flex-col overflow-hidden text-white animate-scale-up">
                <!-- Nội dung render động -->
            </div>
        `;
        return wrap;
    }

    function renderExpeditionUI() {
        const body = document.getElementById('expedition-modal-body');
        if (!body) return;

        const activeExp = getActiveExpedition();
        if (activeExp) {
            // MÀN HÌNH CHUYẾN ĐI ĐANG DIỄN RA HOẶC ĐÃ HOÀN THÀNH
            renderActiveExpeditionScreen(body, activeExp);
        } else {
            // MÀN HÌNH THIẾT LẬP PHÁI THÚ THÁM HIỂM MỚI
            renderSetupExpeditionScreen(body);
        }
    }

    // ==========================================
    // 1. MÀN HÌNH THIẾT LẬP CHUYẾN ĐI MỚI
    // ==========================================
    function renderSetupExpeditionScreen(container) {
        const currentZone = EXPEDITION_ZONES[selectedZoneIndex];

        // Lấy danh sách thú rảnh (từ Farm + Team)
        const allAvailablePets = getAvailablePetsForExpedition();

        // Kiểm tra xem thú đã chọn có hợp lệ không
        selectedPetIds = selectedPetIds.filter(id => allAvailablePets.some(p => p.id === id));

        // Kiểm tra có thú nào hưởng buff khắc hệ không
        const selectedPets = allAvailablePets.filter(p => selectedPetIds.includes(p.id));
        const hasFavoredElement = selectedPets.some(p => currentZone.favoredElements.includes(p.element));

        // Render Tabs 3 vùng đất
        const tabsHtml = EXPEDITION_ZONES.map((zone, idx) => {
            const isActive = idx === selectedZoneIndex;
            return `
            <button onclick="setExpeditionZone(${idx})" class="flex-1 py-2 px-1 rounded-2xl text-xs font-black transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${isActive ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg scale-[1.02]' : 'bg-zinc-900/90 text-zinc-400 hover:text-white border border-white/5'}">
                <span class="text-base">${zone.icon}</span>
                <span class="truncate max-w-full">${zone.name}</span>
            </button>
            `;
        }).join('');

        // Render Mốc thời gian
        const durationsHtml = EXPEDITION_DURATIONS.map(d => {
            const isSelected = d.hours === selectedDurationHours;
            return `
            <button onclick="setExpeditionDuration(${d.hours})" class="flex-1 p-2 rounded-2xl border text-center transition cursor-pointer ${isSelected ? 'border-amber-400 bg-amber-500/20 text-amber-300 font-black shadow' : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 font-bold hover:bg-zinc-800'}">
                <div class="text-xs">${d.title}</div>
                <div class="text-[9px] opacity-75 mt-0.5">${d.tag.split(' ')[0]}</div>
            </button>
            `;
        }).join('');

        // 3 Ô chọn Linh Thú tham gia
        let petSlotsHtml = '';
        for (let i = 0; i < 3; i++) {
            const petId = selectedPetIds[i];
            const pet = petId ? allAvailablePets.find(p => p.id === petId) : null;
            if (pet) {
                const isFavored = currentZone.favoredElements.includes(pet.element);
                petSlotsHtml += `
                <div onclick="removeExpeditionPet('${pet.id}')" class="relative aspect-square rounded-2xl border-2 ${isFavored ? 'border-emerald-400 ring-2 ring-emerald-500/30' : 'border-amber-400/80'} bg-zinc-900/90 p-1 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition shadow">
                    <span class="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 text-white w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shadow">✕</span>
                    <div class="w-10 h-10 flex items-center justify-center overflow-hidden mb-0.5">
                        ${typeof getPetSpriteHtml === 'function' ? getPetSpriteHtml(pet, 'idle', 38) : '🐾'}
                    </div>
                    <span class="text-[10px] font-black text-yellow-300 truncate w-full text-center">${pet.name}</span>
                    <span class="text-[8px] font-extrabold ${isFavored ? 'text-emerald-400' : 'text-zinc-400'}">Lv.${Math.floor(pet.level || 1)} • ${pet.element}</span>
                    ${isFavored ? '<span class="absolute bottom-0.5 bg-emerald-500 text-black text-[7px] font-black px-1 rounded">BUFF</span>' : ''}
                </div>`;
            } else {
                petSlotsHtml += `
                <div onclick="openSelectPetForExpeditionPicker()" class="aspect-square rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-950/60 hover:border-amber-400/80 hover:bg-zinc-900/80 flex flex-col items-center justify-center cursor-pointer transition text-zinc-500 hover:text-amber-300">
                    <span class="text-2xl mb-0.5">+</span>
                    <span class="text-[9px] font-bold">Thêm Thú</span>
                </div>`;
            }
        }

        // Render đặc sản rơi
        const dropsHtml = currentZone.specialDrops.map(d => `
            <span class="inline-flex items-center gap-1 bg-black/60 border border-white/10 px-2 py-0.5 rounded-full text-[10px] text-zinc-300">
                <span>${d.icon}</span>
                <span class="font-bold">${d.name}</span>
            </span>
        `).join('');

        container.innerHTML = `
            <!-- Header -->
            <div class="p-3.5 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-900 border-b border-white/10 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">🧭</span>
                    <div>
                        <h2 class="text-sm font-black text-amber-300 uppercase tracking-wide">Thám Hiểm Phó Bản Tự Động</h2>
                        <div class="text-[10px] text-zinc-400">Phái thú đi thám hiểm nhận Vàng, Kim Cương, Đá & Trứng kể cả khi Offline!</div>
                    </div>
                </div>
                <button onclick="closeExpeditionModal()" class="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-black flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <!-- Tab chọn Vùng Đất -->
            <div class="px-3.5 pt-3 pb-1 flex gap-1.5 bg-zinc-950">
                ${tabsHtml}
            </div>

            <!-- Khung Vùng Đất Chính với Background -->
            <div class="p-3.5 overflow-y-auto max-h-[70vh] space-y-3 no-scrollbar">
                <div class="relative w-full rounded-3xl overflow-hidden border border-white/15 shadow-xl bg-cover bg-center min-h-[175px] flex flex-col justify-between p-3.5"
                    style="background-image: url('${currentZone.bg}'), ${currentZone.fallbackBg};">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 pointer-events-none"></div>

                    <!-- Thông tin đầu thẻ -->
                    <div class="relative z-10 flex items-center justify-between">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${currentZone.badgeBg}">
                            ${currentZone.subtitle}
                        </span>
                        <span class="bg-black/75 px-2.5 py-0.5 rounded-full text-[10px] font-black text-amber-300 border border-amber-400/30">
                            Ưu đãi: ${currentZone.favoredLabel}
                        </span>
                    </div>

                    <!-- Mô tả & Đặc sản -->
                    <div class="relative z-10 space-y-1.5 mt-4">
                        <h3 class="text-base font-black text-white drop-shadow">${currentZone.icon} ${currentZone.name}</h3>
                        <p class="text-[11px] text-zinc-200 leading-snug drop-shadow-sm">${currentZone.lore}</p>
                        <div class="flex flex-wrap gap-1 pt-1">
                            ${dropsHtml}
                        </div>
                    </div>
                </div>

                <!-- Bảng Chọn Mốc Thời Gian -->
                <div class="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 space-y-2">
                    <div class="flex justify-between items-center text-xs">
                        <span class="font-bold text-zinc-300">⏱️ Chọn Thời Gian Thám Hiểm:</span>
                        <span class="text-amber-300 text-[11px] font-bold">Thời gian càng dài, quà càng khủng!</span>
                    </div>
                    <div class="flex gap-2">
                        ${durationsHtml}
                    </div>
                </div>

                <!-- Bảng Chọn Linh Thú Tham Gia (1-3 con) -->
                <div class="bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800 space-y-2">
                    <div class="flex justify-between items-center text-xs">
                        <span class="font-bold text-zinc-300">🐾 Đội Hình Xuất Phát (${selectedPetIds.length}/3 Linh Thú):</span>
                        <span class="text-[10px] text-emerald-400 font-bold">${hasFavoredElement ? '⚡ Kích hoạt +35% Quà Quý' : 'Chọn đúng Hệ để nhận Buff'}</span>
                    </div>
                    <div class="grid grid-cols-3 gap-2.5">
                        ${petSlotsHtml}
                    </div>
                    ${hasFavoredElement ? `
                    <div class="bg-emerald-950/60 border border-emerald-400/50 rounded-xl px-2.5 py-1 text-[10px] text-emerald-300 flex items-center gap-1.5">
                        <span>✨</span>
                        <span>Đội hình có linh thú <b>${currentZone.favoredLabel}</b>! Tăng <b>+35%</b> tỷ lệ nhặt Đá Hiếm, Mảnh Thần & Trứng!</span>
                    </div>` : `
                    <div class="bg-zinc-950/60 border border-zinc-800 rounded-xl px-2.5 py-1 text-[10px] text-zinc-400">
                        💡 Mẹo: Phái thú có Hệ Mộc/Thủy vào Rừng, Hệ Hỏa/Thổ vào Núi Lửa để nhận +35% tỷ lệ rơi quà quý!
                    </div>`}
                </div>
            </div>

            <!-- Footer nút xuất kích -->
            <div class="p-3.5 bg-zinc-950 border-t border-white/10 flex items-center justify-between gap-3">
                <div class="text-[11px] text-zinc-400">
                    <span>Đã chọn: </span>
                    <b class="text-amber-300">${selectedPetIds.length} thú</b> • 
                    <b class="text-white">${selectedDurationHours} tiếng</b>
                </div>
                <button onclick="startExpeditionDispatch()" ${selectedPetIds.length === 0 ? 'disabled' : ''}
                    class="px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wide transition cursor-pointer shadow-lg ${selectedPetIds.length > 0 ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 text-black shadow-emerald-900/40 active:scale-95' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'}">
                    🚀 Xuất Phát Ngay
                </button>
            </div>
        `;
    }

    // ==========================================
    // 2. MÀN HÌNH CHUYẾN ĐI ĐANG DIỄN RA
    // ==========================================
    function renderActiveExpeditionScreen(container, exp) {
        const zone = EXPEDITION_ZONES.find(z => z.id === exp.zoneId) || EXPEDITION_ZONES[0];
        const now = Date.now();
        const isCompleted = now >= exp.endTime;
        const totalDuration = exp.endTime - exp.startTime;
        const elapsed = Math.max(0, now - exp.startTime);
        const percent = Math.min(100, Math.floor((elapsed / totalDuration) * 100));

        // Render các thú đang hành quân
        const petsHtml = (exp.pets || []).map(p => `
            <div class="flex flex-col items-center bg-black/60 backdrop-blur-md p-2 rounded-2xl border border-white/15 shadow text-center">
                <div class="w-12 h-12 flex items-center justify-center overflow-hidden mb-1 animate-bounce" style="animation-duration: 1.8s;">
                    ${typeof getPetSpriteHtml === 'function' ? getPetSpriteHtml(p, 'walk', 46) : '🐾'}
                </div>
                <span class="text-xs font-black text-yellow-300 truncate w-20">${p.name}</span>
                <span class="text-[9px] text-zinc-300">Lv.${Math.floor(p.level || 1)} • ${p.element}</span>
            </div>
        `).join('');

        container.innerHTML = `
            <!-- Header -->
            <div class="p-3.5 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-900 border-b border-white/10 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">${isCompleted ? '🎉' : '🧭'}</span>
                    <div>
                        <h2 class="text-sm font-black text-amber-300 uppercase tracking-wide">
                            ${isCompleted ? 'Thám Hiểm Đã Hoàn Thành!' : 'Đang Thám Hiểm...'}
                        </h2>
                        <div class="text-[10px] text-zinc-400">Vùng đất: <b class="text-white">${zone.name}</b> (${exp.durationHours} tiếng)</div>
                    </div>
                </div>
                <button onclick="closeExpeditionModal()" class="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-black flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <!-- Bối cảnh thực tế của vùng đất đang thám hiểm -->
            <div class="p-3.5 space-y-3 overflow-y-auto max-h-[72vh] no-scrollbar">
                <div class="relative w-full rounded-3xl overflow-hidden border border-white/15 shadow-2xl bg-cover bg-center min-h-[260px] flex flex-col justify-between p-4"
                    style="background-image: url('${zone.bg}'), ${zone.fallbackBg};">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/30 pointer-events-none"></div>

                    <!-- Huy hiệu trạng thái -->
                    <div class="relative z-10 flex items-center justify-between">
                        <span class="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${isCompleted ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/40 animate-pulse' : 'bg-black/80 text-amber-300 border border-amber-400/40'}">
                            ${isCompleted ? '✓ ĐÃ HOÀN THÀNH CHUYẾN ĐI' : '🚶 ĐANG BĂNG RỪNG VƯỢT NÚI'}
                        </span>
                        <span id="expedition-timer-clock" class="bg-black/90 px-3 py-1 rounded-full text-xs font-black text-white border border-white/20">
                            --:--:--
                        </span>
                    </div>

                    <!-- Linh thú đang đi dạo giữa bối cảnh -->
                    <div class="relative z-10 flex items-center justify-center gap-3 my-4">
                        ${petsHtml}
                    </div>

                    <!-- Thanh tiến trình hành trình -->
                    <div class="relative z-10 space-y-1">
                        <div class="flex justify-between text-[11px] font-black text-zinc-200">
                            <span>Tiến độ khám phá</span>
                            <span id="expedition-progress-label">${percent}%</span>
                        </div>
                        <div class="w-full bg-black/80 rounded-full h-3 p-0.5 border border-white/20 overflow-hidden">
                            <div id="expedition-progress-bar" class="h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-gradient-to-r from-emerald-400 to-teal-300 shadow' : 'bg-gradient-to-r from-amber-500 to-yellow-400'}" style="width: ${percent}%;"></div>
                        </div>
                    </div>
                </div>

                <!-- Lời khuyên hoặc danh sách thu hoạch dự kiến -->
                <div class="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3 text-xs space-y-1.5">
                    <div class="font-bold text-amber-300 flex items-center gap-1.5">
                        <span>🎁</span>
                        <span>Dự kiến mang về từ ${zone.name}:</span>
                    </div>
                    <div class="text-[11px] text-zinc-300 leading-relaxed">
                        • Hàng ngàn Vàng 🪙, Kim Cương 💎 và Đá Tiến Hóa Ngũ Hành tương ứng.<br>
                        • Thịt Thần, Bóng Đồ Chơi, Vé Quay hoặc Mảnh Thú Thần Thoại.<br>
                        • Mỗi linh thú tham gia nhận được một lượng lớn điểm EXP rèn luyện!
                    </div>
                </div>
            </div>

            <!-- Footer hành động -->
            <div class="p-3.5 bg-zinc-950 border-t border-white/10 flex items-center justify-between gap-3">
                ${isCompleted ? `
                    <button onclick="claimExpeditionRewards()" class="w-full py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-110 text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-900/40 cursor-pointer animate-pulse transition active:scale-95">
                        🎁 THU HOẠCH PHẦN THƯỞNG NGAY
                    </button>
                ` : `
                    <button onclick="confirmCancelExpedition()" class="px-4 py-2.5 bg-zinc-800 hover:bg-red-950 hover:text-red-300 text-zinc-400 font-bold text-xs rounded-xl border border-white/10 cursor-pointer transition">
                        ✕ Hủy Chuyến Đi
                    </button>
                    <span class="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>Đang thám hiểm...</span>
                    </span>
                `}
            </div>
        `;
    }

    // Cập nhật đồng hồ đếm ngược mỗi giây
    function updateExpeditionCountdown() {
        const exp = getActiveExpedition();
        if (!exp) return;

        const clockEl = document.getElementById('expedition-timer-clock');
        const barEl = document.getElementById('expedition-progress-bar');
        const labelEl = document.getElementById('expedition-progress-label');

        const now = Date.now();
        const remMs = exp.endTime - now;

        if (remMs <= 0) {
            // Đã hoàn thành, nếu chưa render lại nút thu hoạch thì render lại
            if (clockEl) clockEl.innerText = 'HOÀN THÀNH!';
            if (barEl) barEl.style.width = '100%';
            if (labelEl) labelEl.innerText = '100%';
            updateExpeditionNotifyBadges();
            // Nếu modal đang mở và chưa có nút thu hoạch, render lại
            const body = document.getElementById('expedition-modal-body');
            if (body && !body.innerText.includes('THU HOẠCH PHẦN THƯỞNG NGAY')) {
                renderActiveExpeditionScreen(body, exp);
            }
            return;
        }

        const totalDuration = exp.endTime - exp.startTime;
        const elapsed = Math.max(0, now - exp.startTime);
        const percent = Math.min(100, Math.floor((elapsed / totalDuration) * 100));

        const remSec = Math.floor(remMs / 1000);
        const hrs = String(Math.floor(remSec / 3600)).padStart(2, '0');
        const mins = String(Math.floor((remSec % 3600) / 60)).padStart(2, '0');
        const secs = String(remSec % 60).padStart(2, '0');

        if (clockEl) clockEl.innerText = `${hrs}:${mins}:${secs}`;
        if (barEl) barEl.style.width = `${percent}%`;
        if (labelEl) labelEl.innerText = `${percent}%`;
    }

    // ==========================================
    // 3. THAO TÁC XUẤT PHÁT & CHỌN THÚ
    // ==========================================
    window.setExpeditionZone = function (idx) {
        selectedZoneIndex = idx;
        renderExpeditionUI();
    };

    window.setExpeditionDuration = function (hours) {
        selectedDurationHours = hours;
        renderExpeditionUI();
    };

    window.removeExpeditionPet = function (petId) {
        selectedPetIds = selectedPetIds.filter(id => id !== petId);
        renderExpeditionUI();
    };

    function getAvailablePetsForExpedition() {
        const pets = [];
        const activeExp = getActiveExpedition();
        const busyIds = activeExp ? (activeExp.petIds || []) : [];

        // Lấy từ Trang Trại (Farm)
        if (typeof farm !== 'undefined' && Array.isArray(farm)) {
            farm.forEach(p => {
                if (p && !busyIds.includes(p.id)) pets.push(p);
            });
        }
        // Lấy từ Đội Hình (Team)
        if (typeof team !== 'undefined' && Array.isArray(team)) {
            team.forEach(p => {
                if (p && !busyIds.includes(p.id)) pets.push(p);
            });
        }
        return pets;
    }

    // Modal chọn thú từ danh sách
    window.openSelectPetForExpeditionPicker = function () {
        const availablePets = getAvailablePetsForExpedition().filter(p => !selectedPetIds.includes(p.id));
        if (availablePets.length === 0) {
            alert('⚠️ Bạn không còn linh thú nào rảnh rỗi trong Nông Trại hoặc Đội Hình!');
            return;
        }

        const currentZone = EXPEDITION_ZONES[selectedZoneIndex];

        let picker = document.getElementById('expedition-pet-picker-modal');
        if (!picker) {
            picker = document.createElement('div');
            picker.id = 'expedition-pet-picker-modal';
            picker.className = 'fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 text-white';
            document.body.appendChild(picker);
        }

        const petRowsHtml = availablePets.map(pet => {
            const isFavored = currentZone.favoredElements.includes(pet.element);
            return `
            <div onclick="choosePetForExpedition('${pet.id}')" class="flex items-center justify-between p-2.5 rounded-2xl border ${isFavored ? 'border-emerald-400 bg-emerald-950/30' : 'border-zinc-700 bg-zinc-900/80'} hover:border-amber-400 cursor-pointer transition">
                <div class="flex items-center gap-2.5 min-w-0 pr-1">
                    <div class="w-10 h-10 rounded-xl bg-black/60 flex items-center justify-center shrink-0">
                        ${typeof getPetSpriteHtml === 'function' ? getPetSpriteHtml(pet, 'idle', 38) : '🐾'}
                    </div>
                    <div class="min-w-0">
                        <div class="text-xs font-black text-yellow-300 truncate">${pet.name} (${pet.gender || 'Đực'})</div>
                        <div class="text-[10px] text-zinc-300">Lv.${Math.floor(pet.level || 1)} • Hệ ${pet.element} • ❤️ ${pet.hearts || 3}</div>
                    </div>
                </div>
                <div class="shrink-0 text-right">
                    ${isFavored ? '<span class="bg-emerald-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full">+35% BUFF</span>' : '<span class="text-zinc-500 text-[10px]">Chọn ➔</span>'}
                </div>
            </div>`;
        }).join('');

        picker.innerHTML = `
            <div class="relative w-full max-w-sm bg-zinc-950 rounded-3xl border border-amber-500/50 shadow-2xl p-4 flex flex-col max-h-[85vh] overflow-hidden animate-scale-up">
                <div class="flex justify-between items-center mb-2.5 pb-2 border-b border-white/10">
                    <div>
                        <h3 class="text-sm font-black text-amber-300">🐾 Chọn Linh Thú Thám Hiểm</h3>
                        <div class="text-[10px] text-zinc-400">Chọn tối đa 3 linh thú tham gia chuyến đi</div>
                    </div>
                    <button onclick="document.getElementById('expedition-pet-picker-modal').classList.add('hidden')" class="w-7 h-7 rounded-full bg-zinc-800 text-zinc-300 hover:text-white font-black flex items-center justify-center cursor-pointer">✕</button>
                </div>
                <div class="space-y-2 overflow-y-auto max-h-[62vh] pr-0.5 no-scrollbar">
                    ${petRowsHtml}
                </div>
            </div>
        `;
        picker.classList.remove('hidden');
    };

    window.choosePetForExpedition = function (petId) {
        if (selectedPetIds.length < 3 && !selectedPetIds.includes(petId)) {
            selectedPetIds.push(petId);
        }
        const picker = document.getElementById('expedition-pet-picker-modal');
        if (picker) picker.classList.add('hidden');
        renderExpeditionUI();
    };

    // Bắt đầu xuất phát
    window.startExpeditionDispatch = function () {
        if (selectedPetIds.length === 0) {
            alert('⚠️ Hãy chọn ít nhất 1 linh thú để tham gia chuyến thám hiểm!');
            return;
        }

        const zone = EXPEDITION_ZONES[selectedZoneIndex];
        const allPets = getAvailablePetsForExpedition();
        const chosenPets = allPets.filter(p => selectedPetIds.includes(p.id));

        const now = Date.now();
        const durationMs = selectedDurationHours * 3600 * 1000;
        const endTime = now + durationMs;

        const newExpedition = {
            zoneId: zone.id,
            durationHours: selectedDurationHours,
            startTime: now,
            endTime: endTime,
            petIds: selectedPetIds,
            pets: chosenPets.map(p => ({
                id: p.id,
                name: p.name,
                element: p.element,
                level: p.level || 1,
                sheet: p.sheet
            }))
        };

        saveActiveExpedition(newExpedition);
        if (typeof window.saveGameData === 'function') window.saveGameData();
        if (typeof window.triggerHaptic === 'function') window.triggerHaptic('success');

        alert(`🚀 ĐỘI HÌNH ĐÃ XUẤT PHÁT!\n${chosenPets.length} linh thú đã lên đường khám phá [${zone.name}] trong ${selectedDurationHours} tiếng.\nBạn có thể yên tâm tắt máy, khi hết giờ quay lại thu hoạch quà nhé!`);
        renderExpeditionUI();
    };

    // Hủy chuyến đi (có confirm)
    window.confirmCancelExpedition = function () {
        if (confirm('⚠️ Bạn có chắc chắn muốn HỦY chuyến thám hiểm này không?\nLinh thú sẽ quay về ngay lập tức nhưng bạn sẽ không nhận được bất kỳ phần thưởng nào.')) {
            saveActiveExpedition(null);
            if (typeof window.saveGameData === 'function') window.saveGameData();
            alert('Đã hủy chuyến thám hiểm. Linh thú đã trở về Nông Trại.');
            renderExpeditionUI();
        }
    };

    // ==========================================
    // 4. THU HOẠCH PHẦN THƯỞNG
    // ==========================================
    window.claimExpeditionRewards = function () {
        const exp = getActiveExpedition();
        if (!exp) return;
        if (Date.now() < exp.endTime) {
            alert('Chuyến thám hiểm chưa hoàn thành!');
            return;
        }

        const zone = EXPEDITION_ZONES.find(z => z.id === exp.zoneId) || EXPEDITION_ZONES[0];
        const durationCfg = EXPEDITION_DURATIONS.find(d => d.hours === exp.durationHours) || EXPEDITION_DURATIONS[1];
        const petCount = (exp.pets || []).length || 1;

        // Hệ số nhân theo số lượng thú (1 thú: 1.0, 2 thú: 1.3, 3 thú: 1.6)
        const petMultiplier = 1 + (petCount - 1) * 0.3;

        // Kiểm tra buff khắc hệ
        const hasFavoredBuff = (exp.pets || []).some(p => zone.favoredElements.includes(p.element));
        const luckMultiplier = hasFavoredBuff ? 1.35 : 1.0;

        // 1. Tính Vàng & Kim Cương
        const baseGold = Math.floor(durationCfg.minGold + Math.random() * (durationCfg.maxGold - durationCfg.minGold));
        const earnedGold = Math.floor(baseGold * petMultiplier);

        const baseDiamonds = Math.floor(durationCfg.minDiamonds + Math.random() * (durationCfg.maxDiamonds - durationCfg.minDiamonds));
        const earnedDiamonds = Math.floor(baseDiamonds * petMultiplier);

        window.playerCoins = (Number(window.playerCoins) || 0) + earnedGold;
        window.playerDiamonds = (Number(window.playerDiamonds) || 0) + earnedDiamonds;

        const inv = window.inventory || (typeof inventory !== 'undefined' ? inventory : {});

        // 2. Tính Đá Ngũ Hành theo Vùng đất
        const baseStones = Math.floor(durationCfg.stoneBaseQty * petMultiplier);
        const stoneList = [];
        if (zone.id === 'forest') {
            inv.stoneMoc = (Number(inv.stoneMoc) || 0) + baseStones;
            inv.stoneThuy = (Number(inv.stoneThuy) || 0) + Math.max(1, Math.floor(baseStones * 0.7));
            stoneList.push(`🌿 Đá Mộc (+${baseStones})`, `💧 Đá Thủy (+${Math.max(1, Math.floor(baseStones * 0.7))})`);
        } else if (zone.id === 'volcano') {
            inv.stoneHoa = (Number(inv.stoneHoa) || 0) + baseStones;
            inv.stoneTho = (Number(inv.stoneTho) || 0) + Math.max(1, Math.floor(baseStones * 0.7));
            stoneList.push(`🔥 Đá Hỏa (+${baseStones})`, `🪨 Đá Thổ (+${Math.max(1, Math.floor(baseStones * 0.7))})`);
        } else {
            inv.stoneKim = (Number(inv.stoneKim) || 0) + baseStones;
            inv.stoneThuy = (Number(inv.stoneThuy) || 0) + Math.max(1, Math.floor(baseStones * 0.7));
            stoneList.push(`⚔️ Đá Kim (+${baseStones})`, `💧 Đá Thủy (+${Math.max(1, Math.floor(baseStones * 0.7))})`);
        }

        // 3. Vật phẩm đặc sản theo vùng đất
        const dropItems = [];
        if (zone.id === 'forest') {
            const foodQty = Math.floor((1 + Math.random() * 3) * petMultiplier);
            const toyQty = Math.floor((1 + Math.random() * 2) * petMultiplier);
            inv.food = (Number(inv.food) || 0) + foodQty;
            inv.toy = (Number(inv.toy) || 0) + toyQty;
            dropItems.push(`🍖 Tiệc Thịt Thần (+${foodQty})`, `🎾 Bóng Đồ Chơi (+${toyQty})`);

            if (Math.random() < 0.4 * luckMultiplier) {
                inv.luckyTicket = (Number(inv.luckyTicket) || 0) + 1;
                dropItems.push(`🎟️ Vé Quay May Mắn (+1)`);
            }
        } else if (zone.id === 'volcano') {
            const chestQty = Math.max(1, Math.floor(petMultiplier));
            inv.gearShardChest = (Number(inv.gearShardChest) || 0) + chestQty;
            dropItems.push(`🧰 Rương Mảnh Trang Bị (+${chestQty})`);

            if (Math.random() < 0.35 * luckMultiplier) {
                inv.luckyTicket = (Number(inv.luckyTicket) || 0) + 1;
                dropItems.push(`🎟️ Vé Quay May Mắn (+1)`);
            }
        } else if (zone.id === 'swamp') {
            const potionQty = Math.floor((1 + Math.random() * 2) * petMultiplier);
            inv.expPotion = (Number(inv.expPotion) || 0) + potionQty;
            dropItems.push(`🧪 Thuốc Tăng EXP (+${potionQty})`);

            // Mảnh Thú Thần Thoại
            const shardRoll = Math.random();
            if (shardRoll < 0.65 * luckMultiplier) {
                const shardQty = Math.floor(2 + Math.random() * 3);
                inv.mythicShards = (Number(inv.mythicShards) || 0) + shardQty;
                dropItems.push(`🧩 Mảnh Thần Thoại (+${shardQty})`);
            }
            if (Math.random() < 0.4 * luckMultiplier) {
                inv.arenaTicket = (Number(inv.arenaTicket) || 0) + 1;
                dropItems.push(`⚔️ Vé Đấu Trường PvP (+1)`);
            }
        }

        // 4. Cơ hội rơi Trứng Linh Thú
        let eggDropped = null;
        const eggRoll = Math.random();
        if (eggRoll < durationCfg.eggChance * luckMultiplier) {
            const targetEggs = (typeof eggs !== 'undefined' && Array.isArray(eggs)) ? eggs : (window.eggs = window.eggs || []);
            if (zone.id === 'forest') {
                eggDropped = {
                    name: 'Trứng Đại Ngàn Hiếm',
                    element: Math.random() < 0.5 ? 'Moc' : 'Thuy',
                    rarity: { name: 'Hiếm', color: 'text-emerald-400', bg: 'border-emerald-500', badge: '🟢 Xanh', statMultiplier: 1.3 },
                    steps: 0,
                    requiredSteps: 35
                };
            } else if (zone.id === 'volcano') {
                eggDropped = {
                    name: 'Trứng Hỏa Long F1 Cực Hiếm',
                    element: 'Hoa',
                    rarity: { name: 'Cực Hiếm', color: 'text-yellow-400', bg: 'border-yellow-500', badge: '🟡 Vàng', statMultiplier: 1.6 },
                    steps: 0,
                    requiredSteps: 45
                };
            } else {
                eggDropped = {
                    name: 'Trứng Đột Biến F1 Đầm Lầy',
                    element: 'Thuy',
                    rarity: { name: 'Cực Hiếm', color: 'text-yellow-400', bg: 'border-yellow-500', badge: '🟡 Vàng', statMultiplier: 1.6 },
                    steps: 0,
                    requiredSteps: 45
                };
            }
            targetEggs.push(eggDropped);
        }

        // 5. Thưởng EXP cho tất cả linh thú tham gia chuyến đi
        const earnedExpPerPet = Math.floor(durationCfg.baseExp * (hasFavoredBuff ? 1.25 : 1.0));
        const allPetsInGame = [...(window.farm || []), ...(window.team || [])];
        const leveledUpPets = [];

        (exp.petIds || []).forEach(petId => {
            const realPet = allPetsInGame.find(p => p && p.id === petId);
            if (realPet) {
                realPet.exp = (Number(realPet.exp) || 0) + earnedExpPerPet;
                const oldLv = Math.floor(realPet.level || 1);
                // Kiểm tra thăng cấp
                let reqExp = oldLv * 100;
                while (realPet.exp >= reqExp && (realPet.level || 1) < 100) {
                    realPet.exp -= reqExp;
                    realPet.level = (realPet.level || 1) + 1;
                    realPet.maxHp = Math.floor(realPet.maxHp * 1.05);
                    realPet.hp = realPet.maxHp;
                    realPet.atk = Math.floor(realPet.atk * 1.05);
                    reqExp = realPet.level * 100;
                }
                if (Math.floor(realPet.level) > oldLv) {
                    leveledUpPets.push(`${realPet.name} (Lv.${oldLv} ➔ Lv.${Math.floor(realPet.level)})`);
                }
            }
        });

        // Xóa trạng thái thám hiểm hoàn thành
        saveActiveExpedition(null);
        selectedPetIds = [];

        if (typeof window.saveGameData === 'function') window.saveGameData();
        if (typeof window.updateTeamCount === 'function') window.updateTeamCount();
        if (typeof window.triggerHaptic === 'function') window.triggerHaptic('success');

        // Mở popup nhận thưởng rực rỡ
        showHarvestRewardPopup({
            zoneName: zone.name,
            earnedGold,
            earnedDiamonds,
            stoneList,
            dropItems,
            eggDropped,
            earnedExpPerPet,
            leveledUpPets
        });

        renderExpeditionUI();
    };

    function showHarvestRewardPopup(data) {
        let popup = document.getElementById('harvest-reward-popup');
        if (!popup) {
            popup = document.createElement('div');
            popup.id = 'harvest-reward-popup';
            popup.className = 'fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 text-white';
            document.body.appendChild(popup);
        }

        const dropLines = [
            `🪙 <b>+${data.earnedGold.toLocaleString()} Vàng</b>`,
            data.earnedDiamonds > 0 ? `💎 <b>+${data.earnedDiamonds} Kim Cương</b>` : '',
            ...data.stoneList.map(s => `• ${s}`),
            ...data.dropItems.map(d => `• ${d}`),
            data.eggDropped ? `🥚 <b class="text-yellow-300">${data.eggDropped.name} (${data.eggDropped.rarity.badge})</b>` : '',
            `✨ <b>+${data.earnedExpPerPet} EXP</b> cho mỗi thú tham gia!`
        ].filter(Boolean);

        const levelUpNotice = data.leveledUpPets.length > 0
            ? `<div class="bg-amber-950/60 border border-amber-400/50 rounded-xl p-2 text-xs text-amber-300">🎉 <b>THĂNG CẤP LINH THÚ:</b><br>${data.leveledUpPets.join(', ')}</div>`
            : '';

        popup.innerHTML = `
            <div class="relative w-full max-w-sm bg-gradient-to-b from-zinc-900 to-black rounded-3xl border-2 border-amber-400 shadow-2xl p-5 text-center flex flex-col gap-3 animate-scale-up">
                <div class="text-4xl animate-bounce">🎁🎉</div>
                <h3 class="text-base font-black text-amber-300 uppercase tracking-wide">
                    THU HOẠCH THÀNH CÔNG!
                </h3>
                <div class="text-xs text-zinc-300">Đội thám hiểm đã trở về từ <b>${data.zoneName}</b> mang theo vô số chiến lợi phẩm:</div>

                <div class="bg-zinc-950/80 p-3 rounded-2xl border border-white/10 text-left space-y-1.5 text-xs text-zinc-200 max-h-[45vh] overflow-y-auto no-scrollbar">
                    ${dropLines.map(l => `<div>${l}</div>`).join('')}
                </div>

                ${levelUpNotice}

                <button onclick="document.getElementById('harvest-reward-popup').classList.add('hidden')" class="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black font-black text-xs uppercase rounded-xl shadow-lg cursor-pointer">
                    Đồng Ý & Tiếp Tục
                </button>
            </div>
        `;
        popup.classList.remove('hidden');
    }

    // Khởi động kiểm tra badge
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateExpeditionNotifyBadges);
    } else {
        updateExpeditionNotifyBadges();
    }
})();
