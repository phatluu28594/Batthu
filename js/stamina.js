let stamina = parseInt(localStorage.getItem('ar_stamina') || '15');
let lastStaminaTime = parseInt(localStorage.getItem('ar_stamina_time') || Date.now());
let currentWeather = { name: 'Trời quang', icon: '☀️', effect: 'ATK +10%', buffAtk: 1.1 };

function initStaminaSystem() {
    setInterval(() => {
        let now = Date.now();
        let diffSec = Math.floor((now - lastStaminaTime) / 1000);
        let rechargeInterval = 10 * 60;

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

function initWeather() {
    const weathers = [
        { name: 'Trời quang', icon: '☀️', effect: 'ATK +10%', buffAtk: 1.1 },
        { name: 'Mưa dông', icon: '🌧️', effect: 'HP +15%', buffAtk: 1.0 },
        { name: 'Sương mù', icon: '🌫️', effect: 'Né tránh', buffAtk: 1.05 },
        { name: 'Nắng gắt', icon: '🔥', effect: 'ATK +20%', buffAtk: 1.2 }
    ];
    currentWeather = weathers[Math.floor(Math.random() * weathers.length)];
    let iconEl = document.getElementById('weather-icon');
    let statusEl = document.getElementById('weather-status');
    if (iconEl) iconEl.innerText = currentWeather.icon;
    if (statusEl) statusEl.innerText = currentWeather.name;
}
