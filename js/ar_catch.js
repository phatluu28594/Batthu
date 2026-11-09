// js/ar_catch.js - Xử lý camera AR và quăng dây thừng bắt thú
let canvas, ctx;
let isARActive = false;
let rope = { x: 0, y: 0, vx: 0, vy: 0, radius: 30, flying: false };
let monsterPos = { x: 0, y: 0, vx: 2 };
let touchStart = { x: 0, y: 0 }, touchEnd = { x: 0, y: 0 };

async function enterARScreen() {
    document.getElementById('map-screen').classList.add('hidden');
    document.getElementById('ar-screen').classList.remove('hidden');
    isARActive = true;

    let elemObj = elements.find(e => e.name === currentWildMonster.element) || elements[0];
    document.getElementById('ar-mon-info').innerText = `${currentWildMonster.emoji} ${currentWildMonster.name} (${elemObj.icon}${currentWildMonster.element}) - CP ${currentWildMonster.cp}`;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: "environment" } }, audio: false });
        document.getElementById('camera-feed').srcObject = stream;
    } catch (e) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            document.getElementById('camera-feed').srcObject = stream;
        } catch (err) {}
    }
    initCanvasGame();
}

function exitARScreen() {
    isARActive = false;
    const videoEl = document.getElementById('camera-feed');
    if (videoEl.srcObject) videoEl.srcObject.getTracks().forEach(t => t.stop());
    document.getElementById('ar-screen').classList.add('hidden');
    document.getElementById('map-screen').classList.remove('hidden');
    map.invalidateSize();
}

function initCanvasGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    monsterPos.x = canvas.width / 2;
    monsterPos.y = canvas.height * 0.35;
    resetRope();

    canvas.onpointerdown = (e) => {
        if (rope.flying) return;
        touchStart.x = e.clientX; touchStart.y = e.clientY;
    };

    canvas.onpointerup = (e) => {
        if (rope.flying) return;
        touchEnd.x = e.clientX; touchEnd.y = e.clientY;
        let dx = touchEnd.x - touchStart.x;
        let dy = touchEnd.y - touchStart.y;

        if (dy < -30) {
            if (stamina > 0) {
                stamina--;
                localStorage.setItem('ar_stamina', stamina);
                document.getElementById('stamina-count').innerText = stamina;
            }
            rope.vx = dx * 0.12;
            rope.vy = dy * 0.15;
            rope.flying = true;
        }
    };
    requestAnimationFrame(updateCanvasGame);
}

function resetRope() {
    rope.x = canvas.width / 2; rope.y = canvas.height * 0.85;
    rope.vx = 0; rope.vy = 0; rope.flying = false;
}

function updateCanvasGame() {
    if (!isARActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    monsterPos.x += monsterPos.vx;
    if (monsterPos.x < 60 || monsterPos.x > canvas.width - 60) monsterPos.vx *= -1;

    ctx.font = "80px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(currentWildMonster.emoji, monsterPos.x, monsterPos.y);

    if (rope.flying) {
        rope.x += rope.vx; rope.y += rope.vy; rope.vy += 0.25;
        ctx.beginPath(); ctx.moveTo(canvas.width / 2, canvas.height * 0.85); ctx.lineTo(rope.x, rope.y);
        ctx.strokeStyle = "#d4a373"; ctx.lineWidth = 4; ctx.stroke();

        let dist = Math.hypot(rope.x - monsterPos.x, rope.y - monsterPos.y);
        if (dist < 65) { rope.flying = false; handleCatchResult(); }
        if (rope.y < 0 || rope.x < 0 || rope.x > canvas.width) { rope.flying = false; handleMissAttempt("Quăng hụt!"); resetRope(); }
    }

    ctx.font = "40px sans-serif";
    ctx.fillText("🪢", rope.x, rope.y);
    requestAnimationFrame(updateCanvasGame);
}

function handleCatchResult() {
    let isFailed = Math.random() < 0.50;
    if (isFailed) { handleMissAttempt(`${currentWildMonster.name} giãy giụa thoát!`); resetRope(); }
    else {
        const feedback = document.getElementById('throw-feedback');
        feedback.innerText = `🎉 Bắt thành công ${currentWildMonster.name}!`;
        feedback.style.opacity = '1';
        setTimeout(() => { feedback.style.opacity = '0'; exitARScreen(); promptCatchChoice(currentWildMonster); }, 1000);
    }
}

function handleMissAttempt(reasonMsg) {
    catchAttempts++;
    document.getElementById('throw-attempt-count').innerText = `Lượt quăng: ${catchAttempts}/3`;
    const feedback = document.getElementById('throw-feedback');

    if (catchAttempts >= 3) {
        feedback.innerText = `😜 ${currentWildMonster.name} đã chạy mất!`;
        feedback.style.opacity = '1';
        setTimeout(() => { feedback.style.opacity = '0'; exitARScreen(); spawnMultipleMonsters(); }, 2500);
    } else {
        feedback.innerText = `💥 ${reasonMsg}`;
        feedback.style.opacity = '1';
        setTimeout(() => { feedback.style.opacity = '0'; }, 2000);
    }
}
