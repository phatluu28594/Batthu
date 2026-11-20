/**
 * ar_share.js - Tính Năng Chụp Ảnh AR Flex Mạng Xã Hội (AR Photo Sharing)
 * Bắt Thú Vương AR - Khung hình AR thực tế ảo, chụp ảnh khoe thú cưng lên Facebook/TikTok/Zalo/Story
 */

(function () {
    let currentVideoStream = null;
    let currentFacingMode = 'environment';
    let currentPet = null;
    let currentSceneBg = 'camera'; // 'camera', 'cafe', 'street', 'park'
    let petScale = 1.0;

    // Các hình nền thực tế ảo mô phỏng khi không có camera
    const VIRTUAL_SCENES = {
        cafe: 'linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url(./battle-bg.webp)',
        street: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.7)), url(./boss-lobby-bg.webp)',
        park: 'linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.5)), url(./farm-bg.webp)'
    };

    // Mở màn hình Chụp Ảnh AR Flex
    window.openArShareModal = function (source = 'team', index = 0, directPet = null) {
        if (directPet) {
            currentPet = directPet;
        } else if (source === 'team' && window.team && window.team[index]) {
            currentPet = window.team[index];
        } else if (source === 'farm' && window.farm && window.farm[index]) {
            currentPet = window.farm[index];
        } else {
            currentPet = (window.team && window.team[0]) || (window.farm && window.farm[0]);
        }

        if (!currentPet) {
            alert('⚠️ Bạn chưa có linh thú nào để chụp ảnh AR!');
            return;
        }

        let modal = document.getElementById('ar-share-modal');
        if (!modal) {
            modal = createArShareModalDOM();
            document.body.appendChild(modal);
        }

        renderArPetInfo();
        modal.classList.remove('hidden');
        initArCamera();
        if (typeof window.triggerHaptic === 'function') window.triggerHaptic('light');
    };

    window.closeArShareModal = function () {
        stopArCamera();
        const modal = document.getElementById('ar-share-modal');
        if (modal) modal.classList.add('hidden');
    };

    function createArShareModalDOM() {
        const wrap = document.createElement('div');
        wrap.id = 'ar-share-modal';
        wrap.className = 'fixed inset-0 z-50 bg-black flex flex-col justify-between hidden select-none overflow-hidden';
        wrap.innerHTML = `
            <!-- VÙNG HIỂN THỊ CAMERA / PHÔNG NỀN THỰC TẾ -->
            <div id="ar-viewport" class="relative w-full h-full flex flex-col justify-between overflow-hidden bg-zinc-950">
                <!-- Video Camera Thật -->
                <video id="ar-video-feed" autoplay playsinline muted class="absolute inset-0 w-full h-full object-cover z-0"></video>
                
                <!-- Phông nền giả lập AR (khi tắt camera) -->
                <div id="ar-virtual-bg" class="hidden absolute inset-0 w-full h-full bg-cover bg-center z-0 transition-all duration-500"></div>

                <!-- Lưới AR Hologram mờ tạo cảm giác thực tế ảo -->
                <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none z-10"></div>

                <!-- THANH ĐIỀU HƯỚNG TRÊN CÙNG -->
                <div class="relative z-20 flex items-center justify-between p-3">
                    <div class="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-cyan-400/50 shadow-lg text-white">
                        <span class="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                        <span class="text-xs font-black tracking-widest uppercase text-cyan-300">AR FLEX CAM</span>
                    </div>

                    <div class="flex items-center gap-2">
                        <!-- Đổi phông nền -->
                        <button onclick="cycleArSceneBg()" title="Đổi bối cảnh" class="bg-black/75 hover:bg-black p-2 rounded-full border border-white/20 text-white text-xs font-bold cursor-pointer transition">
                            🎨 Phông
                        </button>
                        <!-- Đổi camera trước/sau -->
                        <button onclick="switchArCameraFacing()" title="Đổi Camera Trước/Sau" class="bg-black/75 hover:bg-black p-2 rounded-full border border-white/20 text-white text-xs font-bold cursor-pointer transition">
                            🔄
                        </button>
                        <!-- Nút Đóng -->
                        <button onclick="closeArShareModal()" class="w-8 h-8 rounded-full bg-black/80 hover:bg-zinc-800 text-white font-black flex items-center justify-center border border-white/20 cursor-pointer transition">
                            ✕
                        </button>
                    </div>
                </div>

                <!-- KHUNG CHÍNH GIỮA: LINH THÚ ĐỨNG NHẢY MÚA NGOÀI ĐỜI THẬT -->
                <div class="relative z-20 grow flex flex-col items-center justify-end pb-8 pointer-events-none">
                    <!-- Bóng Linh Thú trên mặt sàn thực tế -->
                    <div class="w-36 h-8 rounded-full bg-black/60 blur-[3px] transform scale-y-50 mb-1"></div>

                    <!-- Container Linh Thú -->
                    <div id="ar-pet-sprite-wrap" class="relative pointer-events-auto cursor-grab active:cursor-grabbing flex flex-col items-center animate-bounce transition-transform duration-200" style="animation-duration: 2s;">
                        <!-- Hào quang nếu có -->
                        <div id="ar-pet-aura-glow" class="hidden absolute inset-0 rounded-full bg-gradient-to-r from-amber-400 via-pink-500 to-cyan-400 blur-xl opacity-60 animate-spin" style="animation-duration: 6s;"></div>
                        
                        <!-- Sprite Con Thú -->
                        <img id="ar-pet-img" src="assets_boss/ronglua.webp" alt="AR Pet" class="w-44 h-44 object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">

                        <!-- Huy Hiệu Tên Linh Thú -->
                        <div class="bg-black/85 backdrop-blur-md px-3 py-1 rounded-full border border-amber-400/60 shadow-xl flex items-center gap-1.5 mt-2">
                            <span id="ar-pet-badge" class="text-xs">🔴</span>
                            <span id="ar-pet-name" class="text-xs font-black text-amber-300">Rồng Lửa</span>
                            <span id="ar-pet-lv" class="text-[10px] text-cyan-300 font-bold">Lv.20</span>
                        </div>
                    </div>
                </div>

                <!-- KHUNG VIỀN THƯƠNG HIỆU & THÔNG TIN FLEX DƯỚI CÙNG -->
                <div class="relative z-20 p-3 flex flex-col gap-2.5">
                    <!-- Khung Viền Thương Hiệu Game -->
                    <div class="bg-gradient-to-r from-black/90 via-zinc-950/95 to-black/90 backdrop-blur-md p-3 rounded-2xl border border-amber-500/40 shadow-2xl text-white">
                        <div class="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
                            <div class="flex items-center gap-1.5">
                                <span class="text-amber-400 text-xs font-black tracking-wider uppercase">🎮 BẮT THÚ VƯƠNG AR</span>
                                <span class="bg-red-600 text-white text-[9px] px-1.5 py-0.2 rounded font-black uppercase">FLEX</span>
                            </div>
                            <span id="ar-share-date" class="text-[10px] text-zinc-400">20/11/2026</span>
                        </div>
                        <div id="ar-share-caption" class="text-xs font-bold text-amber-200">
                            Thợ Săn [Hà Nội] vừa thuần hóa thành công F1 Rồng Lửa!
                        </div>
                        <div id="ar-share-stats" class="text-[10px] text-zinc-300 flex items-center gap-3 mt-1">
                            <span>⚔️ ATK: 120</span>
                            <span>❤️ HP: 550</span>
                            <span>⚡ Tốc: 65</span>
                            <span class="text-emerald-400">📍 GPS Verified</span>
                        </div>
                    </div>

                    <!-- HÀNG NÚT CHỨC NĂNG 1 CHẠM -->
                    <div class="grid grid-cols-2 gap-2">
                        <!-- Nút Tải Ảnh -->
                        <button onclick="captureAndDownloadArPhoto()" class="py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 active:scale-95 text-black font-black text-xs rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition">
                            <span class="text-base">📸</span>
                            <span>LƯU ẢNH (PNG)</span>
                        </button>
                        <!-- Nút Chia Sẻ Mạng Xã Hội -->
                        <button onclick="shareArPhotoToSocial()" class="py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 hover:brightness-110 active:scale-95 text-white font-black text-xs rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition">
                            <span class="text-base">🚀</span>
                            <span>FLEX NGAY (SHARE)</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        return wrap;
    }

    // Khởi tạo Camera thời gian thực
    async function initArCamera() {
        const video = document.getElementById('ar-video-feed');
        const virtualBg = document.getElementById('ar-virtual-bg');

        if (currentSceneBg !== 'camera') {
            if (video) video.classList.add('hidden');
            if (virtualBg) {
                virtualBg.classList.remove('hidden');
                virtualBg.style.background = VIRTUAL_SCENES[currentSceneBg] || VIRTUAL_SCENES.cafe;
            }
            return;
        }

        if (virtualBg) virtualBg.classList.add('hidden');
        if (video) video.classList.remove('hidden');

        try {
            stopArCamera();
            let stream = null;

            // 1. Thử mở Camera với facingMode yêu cầu (environment/user)
            try {
                const constraints = {
                    video: {
                        facingMode: currentFacingMode,
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                };
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (errFacing) {
                // 2. Nếu không tìm thấy Camera sau (ví dụ chạy trên PC/Laptop chỉ có webcam trước), thử mở camera bất kỳ
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                        audio: false
                    });
                } catch (errFallback) {
                    throw errFallback;
                }
            }

            currentVideoStream = stream;
            if (video) {
                video.srcObject = currentVideoStream;
                video.play();
            }
        } catch (err) {
            // Thiết bị không có camera hoặc từ chối cấp quyền: Chuyển sang phông nền 3D Studio mượt mà
            currentSceneBg = 'cafe';
            if (video) video.classList.add('hidden');
            if (virtualBg) {
                virtualBg.classList.remove('hidden');
                virtualBg.style.background = VIRTUAL_SCENES.cafe;
            }
        }
    }

    function stopArCamera() {
        if (currentVideoStream) {
            currentVideoStream.getTracks().forEach(track => track.stop());
            currentVideoStream = null;
        }
    }

    // Đổi camera Trước / Sau
    window.switchArCameraFacing = function () {
        currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
        currentSceneBg = 'camera';
        initArCamera();
        if (typeof window.triggerHaptic === 'function') window.triggerHaptic('light');
    };

    // Đổi hình nền ảo (khi không thích bật camera)
    window.cycleArSceneBg = function () {
        const scenes = ['camera', 'cafe', 'street', 'park'];
        const nextIdx = (scenes.indexOf(currentSceneBg) + 1) % scenes.length;
        currentSceneBg = scenes[nextIdx];
        initArCamera();
        if (typeof window.triggerHaptic === 'function') window.triggerHaptic('light');
    };

    // Cập nhật thông tin Linh Thú và văn bản flex
    function renderArPetInfo() {
        if (!currentPet) return;

        const imgEl = document.getElementById('ar-pet-img');
        const badgeEl = document.getElementById('ar-pet-badge');
        const nameEl = document.getElementById('ar-pet-name');
        const lvEl = document.getElementById('ar-pet-lv');
        const captionEl = document.getElementById('ar-share-caption');
        const statsEl = document.getElementById('ar-share-stats');
        const dateEl = document.getElementById('ar-share-date');
        const auraEl = document.getElementById('ar-pet-aura-glow');

        // Tìm ảnh sprite chuẩn xác theo cấu hình hệ thống
        let petSprite = 'assets_boss/ronglua.webp';
        if (currentPet.sheet) {
            petSprite = currentPet.sheet;
        } else if (typeof spriteConfigs !== 'undefined' && spriteConfigs[currentPet.name]) {
            const cfg = spriteConfigs[currentPet.name];
            petSprite = cfg.singleSheet ? cfg.sheet : (cfg.walk || cfg.idle || cfg.sheet);
        } else if (typeof bossConfigs !== 'undefined' && bossConfigs[currentPet.name]) {
            petSprite = bossConfigs[currentPet.name].sheet;
        } else {
            const petKey = (currentPet.name || '').toLowerCase();
            if (petKey.includes('hải cẩu')) petSprite = 'assets/haicau.webp';
            else if (petKey.includes('rồng')) petSprite = 'assets_boss/ronglua.webp';
            else if (petKey.includes('hydra')) petSprite = 'assets_boss/Hydra.webp';
            else if (petKey.includes('cerberus')) petSprite = 'assets_boss/Cerberus.webp';
            else if (petKey.includes('golem')) petSprite = 'assets_boss/golem.webp';
            else if (petKey.includes('chupacabra')) petSprite = 'assets_boss/Chupacabra.webp';
            else if (petKey.includes('chó')) petSprite = 'assets/cho.webp';
            else if (petKey.includes('mèo')) petSprite = 'assets/meo.webp';
            else if (petKey.includes('cáo')) petSprite = 'assets/caosamac.webp';
            else if (petKey.includes('gà')) petSprite = 'assets/ga.webp';
            else if (petKey.includes('heo')) petSprite = 'assets/heo.webp';
            else if (petKey.includes('chuột')) petSprite = 'assets/chuot.webp';
            else if (petKey.includes('ong')) petSprite = 'assets/ong.webp';
            else if (petKey.includes('rùa')) petSprite = 'assets/rua.webp';
            else if (petKey.includes('đại bàng')) petSprite = 'assets/daibang.webp';
            else if (petKey.includes('hồ ly')) petSprite = 'assets/holy.webp';
            else if (petKey.includes('trứng')) petSprite = 'assets/trung.webp';
        }

        if (imgEl) {
            imgEl.onerror = function () {
                this.onerror = null;
                this.src = 'assets_boss/ronglua.webp';
            };
            imgEl.src = petSprite;
        }
        if (badgeEl) badgeEl.innerText = currentPet.rarity?.badge || '🟢';
        if (nameEl) nameEl.innerText = currentPet.name || 'Linh Thú';
        if (lvEl) lvEl.innerText = `Lv.${currentPet.level || 1}`;

        if (auraEl) {
            if (currentPet.hasAura || (currentPet.rarity && currentPet.rarity.name === 'Thần Thánh')) {
                auraEl.classList.remove('hidden');
            } else {
                auraEl.classList.add('hidden');
            }
        }

        const hunter = localStorage.getItem('ar_cloud_user') || 'Một Thợ Săn';
        const now = new Date();
        const dateStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} - ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;

        if (dateEl) dateEl.innerText = dateStr;
        if (captionEl) {
            captionEl.innerText = `Thợ Săn [${hunter}] vừa thuần hóa thành công ${currentPet.name} (${currentPet.rarity?.name || 'Hiếm'})!`;
        }
        if (statsEl) {
            statsEl.innerHTML = `
                <span>⚔️ ATK: ${currentPet.atk || 50}</span>
                <span>❤️ HP: ${currentPet.maxHp || 200}</span>
                <span>⚡ Tốc: ${currentPet.speed || 50}</span>
                <span class="text-emerald-400">📍 GPS Verified</span>
            `;
        }
    }

    // Tạo Canvas hợp nhất để xuất ảnh chụp Flex độ phân giải cao
    async function generateCompositeCanvas() {
        const width = 1080;
        const height = 1350;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // 1. Vẽ hình nền (từ video camera hoặc virtual background)
        const video = document.getElementById('ar-video-feed');
        if (currentSceneBg === 'camera' && video && video.readyState >= 2) {
            ctx.drawImage(video, 0, 0, width, height);
        } else {
            // Nền gradient ảo
            const grad = ctx.createLinearGradient(0, 0, 0, height);
            grad.addColorStop(0, '#111827');
            grad.addColorStop(0.5, '#1e1b4b');
            grad.addColorStop(1, '#09090b');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);

            // Vẽ chi tiết cảnh nền
            ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
            for (let i = 0; i < 40; i++) {
                ctx.beginPath();
                ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Lớp gradient viền tối nhẹ
        const vgrad = ctx.createLinearGradient(0, 0, 0, height);
        vgrad.addColorStop(0, 'rgba(0,0,0,0.6)');
        vgrad.addColorStop(0.25, 'rgba(0,0,0,0)');
        vgrad.addColorStop(0.7, 'rgba(0,0,0,0.2)');
        vgrad.addColorStop(1, 'rgba(0,0,0,0.9)');
        ctx.fillStyle = vgrad;
        ctx.fillRect(0, 0, width, height);

        // 2. Vẽ bóng của con thú
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(width / 2, height * 0.72, 220, 45, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.filter = 'blur(10px)';
        ctx.fill();
        ctx.restore();

        // 3. Vẽ Sprite Con Thú
        const img = document.getElementById('ar-pet-img');
        const petW = 440;
        const petH = 440;
        const petX = (width - petW) / 2;
        const petY = height * 0.38;

        if (img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
            try {
                ctx.drawImage(img, petX, petY, petW, petH);
            } catch (e) {
                console.warn('[AR] Không thể vẽ ảnh pet lên canvas:', e);
            }
        } else {
            // Fallback an toàn tuyệt đối: Vẽ huy hiệu thay thế, không bao giờ để crash Canvas
            ctx.save();
            ctx.fillStyle = 'rgba(234, 179, 8, 0.2)';
            ctx.beginPath();
            ctx.arc(width / 2, petY + petH / 2, 170, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 4;
            ctx.stroke();

            ctx.fillStyle = '#fde047';
            ctx.font = 'bold 96px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(currentPet?.rarity?.badge || '✨', width / 2, petY + petH / 2 - 20);

            ctx.font = 'bold 36px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(currentPet?.name || 'Linh Thú', width / 2, petY + petH / 2 + 60);
            ctx.restore();
        }

        // 4. Vẽ Khung Viền Thương Hiệu Gaming
        ctx.save();
        // Viền bo ngoài ảnh
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 14;
        ctx.strokeRect(10, 10, width - 20, height - 20);

        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        ctx.strokeRect(20, 20, width - 40, height - 40);

        // Header trên
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(35, 35, width - 70, 90);
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.6)';
        ctx.lineWidth = 2;
        ctx.strokeRect(35, 35, width - 70, 90);

        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('🎮 BẮT THÚ VƯƠNG AR', 60, 95);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('HUNT & BATTLE • GPS REALITY', width - 60, 93);

        // Footer dưới (Thẻ Thông Tin Thợ Săn)
        const footerY = height - 230;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        ctx.fillRect(35, footerY, width - 70, 180);
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(35, footerY, width - 70, 180);

        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px sans-serif';
        const hunter = localStorage.getItem('ar_cloud_user') || 'Một Thợ Săn';
        const petName = currentPet ? currentPet.name : 'Linh Thú';
        const rarityBadge = currentPet?.rarity?.badge || '🟢';
        ctx.fillText(`Thợ Săn [${hunter}] vừa thuần hóa thành công ${rarityBadge} ${petName}!`, 60, footerY + 55);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '24px sans-serif';
        const statsStr = `⚔️ ATK: ${currentPet?.atk || 50}  |  ❤️ HP: ${currentPet?.maxHp || 200}  |  ⚡ Tốc: ${currentPet?.speed || 50}  |  Bậc: ${currentPet?.gearTier || 0}`;
        ctx.fillText(statsStr, 60, footerY + 105);

        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 20px sans-serif';
        const now = new Date();
        const dateStr = `📍 Tọa Độ Thực Tế GPS  •  ⏱️ ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
        ctx.fillText(dateStr, 60, footerY + 150);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('batthu.pages.dev', width - 60, footerY + 150);

        ctx.restore();
        return canvas;
    }

    // 1 Chạm Tải Ảnh PNG
    window.captureAndDownloadArPhoto = async function () {
        if (typeof window.triggerHaptic === 'function') window.triggerHaptic('medium');
        try {
            const canvas = await generateCompositeCanvas();
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            const petName = currentPet ? currentPet.name.replace(/\s+/g, '_') : 'Pet';
            link.download = `BatThuVuong_Flex_${petName}_${Date.now()}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            if (typeof window.triggerHaptic === 'function') window.triggerHaptic('success');
            alert('🎉 Đã tải ảnh Flex AR thành công vào thư viện máy của bạn!');
        } catch (err) {
            console.error('[AR] Lỗi tải ảnh:', err);
            alert('⚠️ Có lỗi khi lưu ảnh. Vui lòng thử lại!');
        }
    };

    // 1 Chạm Chia Sẻ Lên Mạng Xã Hội (Facebook, Zalo, Story, TikTok)
    window.shareArPhotoToSocial = async function () {
        if (typeof window.triggerHaptic === 'function') window.triggerHaptic('medium');
        try {
            const canvas = await generateCompositeCanvas();
            const hunter = localStorage.getItem('ar_cloud_user') || 'Một Thợ Săn';
            const petName = currentPet ? currentPet.name : 'Linh Thú';
            const shareTitle = `🎮 Bắt Thú Vương AR - Thợ Săn [${hunter}]`;
            const shareText = `🔥 Tôi vừa thuần hóa thành công ${petName} ngay ngoài đời thực! Chơi cùng tôi tại https://batthu.pages.dev`;

            // Kiểm tra hỗ trợ Web Share API với tệp ảnh
            canvas.toBlob(async (blob) => {
                if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'flex.png', { type: 'image/png' })] })) {
                    const file = new File([blob], `BatThuVuong_${petName}.png`, { type: 'image/png' });
                    try {
                        await navigator.share({
                            title: shareTitle,
                            text: shareText,
                            files: [file]
                        });
                        return;
                    } catch (e) {
                        console.log('[AR] Người dùng hủy share hoặc lỗi chia sẻ file:', e);
                    }
                }

                // Fallback: Nếu không thể chia sẻ trực tiếp file ảnh, gọi share URL hoặc tải ảnh & copy text
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: shareTitle,
                            text: shareText,
                            url: window.location.href
                        });
                        return;
                    } catch (e) {}
                }

                // Fallback cuối cùng: Tải ảnh về máy và copy lời khoe vào clipboard
                window.captureAndDownloadArPhoto();
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(shareText);
                    alert(`📋 Đã lưu ảnh và sao chép lời khoe vào bộ nhớ tạm:\n"${shareText}"\nHãy dán lên Zalo, Facebook hoặc Story của bạn nhé!`);
                }
            }, 'image/png');
        } catch (err) {
            console.error('[AR] Lỗi chia sẻ:', err);
            window.captureAndDownloadArPhoto();
        }
    };
})();
