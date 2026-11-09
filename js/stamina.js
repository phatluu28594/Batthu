// --- HỆ THỐNG NĂNG LƯỢNG (STAMINA) ---
function initStaminaSystem() {
    setInterval(() => {
        let now = Date.now();
        let lastStaminaTime = parseInt(localStorage.getItem('ar_stamina_time') || now);
        let stamina = parseInt(localStorage.getItem('ar_stamina') || '15');
        let diffSec = Math.floor((now - lastStaminaTime) / 1000);
        let rechargeInterval = 10 * 60; // 10 phút hồi 1 năng lượng

        if (stamina < 15) {
            let addedStamina = Math.floor(diffSec / rechargeInterval);
            if (addedStamina > 0) {
                stamina = Math.min(15, stamina + addedStamina);
                lastStaminaTime = now - (diffSec % rechargeInterval) * 1000;
                localStorage.setItem('ar_stamina', stamina);
                localStorage.setItem('ar_stamina_time', lastStaminaTime);
            }
        } else {
            lastStaminaTime = now;
            localStorage.setItem('ar_stamina_time', lastStaminaTime);
        }

        let nextRechargeTime = rechargeInterval - (Math.floor((now - lastStaminaTime) / 1000) % rechargeInterval);
        let m = Math.floor(nextRechargeTime / 60);
        let s = nextRechargeTime % 60;
        
        let staminaCountEl = document.getElementById('stamina-count');
        let staminaTimerEl = document.getElementById('stamina-timer');
        if (staminaCountEl) staminaCountEl.innerText = stamina;
        if (staminaTimerEl) staminaTimerEl.innerText = stamina >= 15 ? 'MAX' : `${m}:${s < 10 ? '0' : ''}${s}`;
    }, 1000);
}
