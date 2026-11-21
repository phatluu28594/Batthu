/**
 * pwa_tma.js - Quản lý PWA 1 Chạm & Tương thích Telegram / Zalo Mini App
 * Hỗ trợ cài đặt màn hình chính (Add to Home Screen), TMA WebApp SDK, rung phản hồi Haptic
 */

(function () {
    let deferredInstallPrompt = null;
    let isPwaInstalled = false;

    // 1. Lắng nghe sự kiện PWA BeforeInstallPrompt
    window.addEventListener('beforeinstallprompt', (e) => {
        // Ngăn Chrome mặc định hiển thị mini-infobar
        e.preventDefault();
        deferredInstallPrompt = e;
        console.log('[PWA] Sự kiện beforeinstallprompt đã được kích hoạt');

        // Hiển thị nút cài đặt PWA nếu có trong DOM
        updatePwaButtonsVisibility(true);
    });

    // Khi người chơi cài đặt thành công
    window.addEventListener('appinstalled', () => {
        console.log('[PWA] Ứng dụng đã được cài đặt vào màn hình chính');
        deferredInstallPrompt = null;
        isPwaInstalled = true;
        updatePwaButtonsVisibility(false);
        if (typeof showGameToast === 'function') {
            showGameToast('🎉 Cài đặt Bắt Thú Vương thành công vào màn hình chính!');
        } else {
            alert('🎉 Chúc mừng bạn đã cài Bắt Thú Vương thành công vào màn hình chính!');
        }
    });

    // Hàm gọi khi người dùng bấm nút "Cài Đặt App"
    window.installPwaApp = async function () {
        if (!deferredInstallPrompt) {
            // Kiểm tra nếu là iOS Safari (không có beforeinstallprompt)
            const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
            const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

            if (isStandalone) {
                alert('📱 Bạn đã đang mở game từ Màn hình chính (PWA Mode)!');
                return;
            }

            if (isIos) {
                alert('🍎 Hướng dẫn cài đặt trên iPhone / iPad:\n1. Bấm vào nút Chia sẻ (Share) 📤 ở thanh dưới Safari.\n2. Cuộn xuống và chọn "Thêm vào MH chính" (Add to Home Screen) ➕.\n3. Bấm "Thêm" là xong!');
            } else {
                alert('💡 Hướng dẫn cài App:\nBấm vào biểu tượng 3 chấm (⋮) ở góc trên trình duyệt Chrome, sau đó chọn "Cài đặt ứng dụng" hoặc "Thêm vào màn hình chính" (Add to Home screen).');
            }
            return;
        }

        try {
            deferredInstallPrompt.prompt();
            const { outcome } = await deferredInstallPrompt.userChoice;
            console.log(`[PWA] Người dùng phản hồi: ${outcome}`);
            deferredInstallPrompt = null;
            if (outcome === 'accepted') {
                updatePwaButtonsVisibility(false);
            }
        } catch (err) {
            console.error('[PWA] Lỗi cài đặt:', err);
        }
    };

    function updatePwaButtonsVisibility(visible) {
        const pwaBtns = document.querySelectorAll('.pwa-install-btn');
        pwaBtns.forEach(btn => {
            if (visible) {
                btn.classList.remove('hidden');
            } else {
                btn.classList.add('hidden');
            }
        });
    }

    // 2. Khởi tạo Telegram Mini App (TMA)
    function initTelegramMiniApp() {
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            console.log('[TMA] Phát hiện môi trường Telegram Mini App');

            try {
                tg.ready();
                tg.expand();

                if (tg.requestFullscreen) {
                    try { tg.requestFullscreen(); } catch (e) {}
                }
                if (tg.lockOrientation) {
                    try { tg.lockOrientation(); } catch (e) {}
                }

                if (tg.setHeaderColor) tg.setHeaderColor('#09090b');
                if (tg.setBackgroundColor) tg.setBackgroundColor('#09090b');
                if (tg.enableClosingConfirmation) tg.enableClosingConfirmation();

                // Tự động nhận diện tài khoản Telegram người chơi nếu chưa lưu tên
                const tgUser = tg.initDataUnsafe && tg.initDataUnsafe.user;
                if (tgUser) {
                    const currentCloudUser = localStorage.getItem('ar_cloud_user');
                    if (!currentCloudUser || currentCloudUser.trim() === '' || currentCloudUser === 'Một Thợ Săn') {
                        const tgName = tgUser.username ? `@${tgUser.username}` : (tgUser.first_name || 'Thợ Săn');
                        localStorage.setItem('ar_cloud_user', tgName);
                        console.log(`[TMA] Tự động đồng bộ tên Thợ Săn Telegram: ${tgName}`);
                    }
                }
            } catch (err) {
                console.warn('[TMA] Lỗi cấu hình TMA:', err);
            }
        }
    }

    // 3. Hệ thống Rung Haptic Feedback đa nền tảng
    window.triggerHaptic = function (type = 'light') {
        try {
            const tg = window.Telegram && window.Telegram.WebApp;
            const isTgHapticAvailable = Boolean(tg && typeof tg.isVersionAtLeast === 'function' && tg.isVersionAtLeast('6.1') && tg.initData);

            if (isTgHapticAvailable && tg.HapticFeedback) {
                const haptic = tg.HapticFeedback;
                if (type === 'light' || type === 'medium' || type === 'heavy') {
                    haptic.impactOccurred(type);
                } else if (type === 'success' || type === 'warning' || type === 'error') {
                    haptic.notificationOccurred(type);
                } else if (type === 'selection') {
                    haptic.selectionChanged();
                }
                return;
            }

            if ('vibrate' in navigator) {
                if (type === 'heavy' || type === 'error') {
                    navigator.vibrate([40, 60, 40]);
                } else if (type === 'success') {
                    navigator.vibrate([20, 40, 20]);
                } else {
                    navigator.vibrate(25);
                }
            }
        } catch (e) {
            // Thiết bị không hỗ trợ haptic
        }
    };

    // Kiểm tra chạy ngay khi tải xong DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTelegramMiniApp);
    } else {
        initTelegramMiniApp();
    }
})();
