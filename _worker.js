function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8" }
    });
}

function getCurrentWeekKey() {
    const now = new Date(Date.now() + 7 * 3600 * 1000); // Giờ Việt Nam (UTC+7)
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const db = env.DB;

        // ==========================================
        // API 1: ĐĂNG KÝ / ĐĂNG NHẬP / ĐỒNG BỘ DỮ LIỆU (/api/auth)
        // ==========================================
        if (url.pathname === "/api/auth") {
            try {
                if (!db) return jsonResponse({ ok: false, error: "Chưa kết nối D1 Database (DB)!" }, 500);

                await db.prepare(`
                    CREATE TABLE IF NOT EXISTS players (
                        username TEXT PRIMARY KEY,
                        pin TEXT NOT NULL,
                        gender TEXT DEFAULT 'Nam',
                        session_token TEXT,
                        game_data TEXT,
                        updated_at INTEGER
                    )
                `).run();

                const alterQueries = [
                    "ALTER TABLE players ADD COLUMN gender TEXT DEFAULT 'Nam'",
                    "ALTER TABLE players ADD COLUMN session_token TEXT",
                    "ALTER TABLE players ADD COLUMN game_data TEXT",
                    "ALTER TABLE players ADD COLUMN updated_at INTEGER"
                ];
                for (const sql of alterQueries) {
                    try { await db.prepare(sql).run(); } catch (e) {}
                }

                const body = await request.json();
                const { action, username, pin, gender, sessionToken, gameData } = body;

                if (!username || typeof username !== "string") {
                    return jsonResponse({ ok: false, error: "Thiếu ID Game!" }, 400);
                }
                const cleanUser = username.trim();

                if (action === "register") {
                    if (cleanUser.length < 3 || cleanUser.length > 16) {
                        return jsonResponse({ ok: false, error: "ID Game phải từ 3 đến 16 ký tự!" }, 400);
                    }
                    if (!/^[0-9]{8}$/.test(String(pin || "").trim())) {
                        return jsonResponse({ ok: false, error: "Mã PIN phải gồm đúng 8 chữ số!" }, 400);
                    }
                    const existing = await db.prepare("SELECT username FROM players WHERE LOWER(username) = LOWER(?)").bind(cleanUser).first();
                    if (existing) {
                        return jsonResponse({ ok: false, error: "ID Game này đã có người sử dụng!" }, 409);
                    }

                    const newToken = crypto.randomUUID();
                    const safeGender = gender === "Nữ" ? "Nữ" : "Nam";
                    await db.prepare(
                        "INSERT INTO players (username, pin, gender, session_token, game_data, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
                    ).bind(cleanUser, pin, safeGender, newToken, JSON.stringify(gameData || {}), Date.now()).run();

                    return jsonResponse({ ok: true, username: cleanUser, gender: safeGender, sessionToken: newToken });
                }

                if (action === "login") {
                    const player = await db.prepare("SELECT * FROM players WHERE LOWER(username) = LOWER(?)").bind(cleanUser).first();
                    if (!player) return jsonResponse({ ok: false, error: "Không tìm thấy ID Game này!" }, 404);
                    if (player.pin !== pin) return jsonResponse({ ok: false, error: "Sai mã PIN bảo mật!" }, 401);

                    const newToken = crypto.randomUUID();
                    await db.prepare("UPDATE players SET session_token = ?, updated_at = ? WHERE username = ?")
                        .bind(newToken, Date.now(), player.username).run();

                    let parsedGameData = {};
                    try { parsedGameData = JSON.parse(player.game_data || "{}"); } catch (e) {}

                    return jsonResponse({
                        ok: true,
                        username: player.username,
                        gender: player.gender || "Nam",
                        sessionToken: newToken,
                        gameData: parsedGameData
                    });
                }

                if (action === "verify_session") {
                    const player = await db.prepare("SELECT session_token FROM players WHERE LOWER(username) = LOWER(?)").bind(cleanUser).first();
                    if (!player || player.session_token !== sessionToken) {
                        return jsonResponse({ ok: false, code: "SESSION_EXPIRED" });
                    }
                    return jsonResponse({ ok: true });
                }

                if (action === "sync") {
                    const existing = await db.prepare(
                        "SELECT session_token, game_data FROM players WHERE LOWER(username) = LOWER(?) AND pin = ?"
                    ).bind(cleanUser, pin).first();

                    if (!existing) {
                        return jsonResponse({ ok: false, error: "Sai tài khoản hoặc mã PIN!" }, 401);
                    }

                    if (sessionToken && existing.session_token && existing.session_token !== sessionToken) {
                        return jsonResponse({ ok: false, code: "SESSION_EXPIRED", error: "Phiên đăng nhập đã hết hạn trên thiết bị này!" }, 401);
                    }

                    const ADMIN_LIST = ["giaphat28594", "thuyhan171097"];
                    const isGmAccount = ADMIN_LIST.includes(cleanUser.toLowerCase());

                    let prevData = {};
                    try { prevData = JSON.parse(existing.game_data || "{}"); } catch (e) {}

                    // Hàm làm sạch & chặn gian lận chỉ số linh thú vượt trần cấp độ / phẩm chất
                    const RARITY_MAX_MULT = {
                        "Thường": 1.15,
                        "Hiếm": 1.45,
                        "Cực Hiếm": 1.8,
                        "Huyền Thoại": 2.25,
                        "Thần Thánh": 2.8
                    };
                    const clampPetObject = (p) => {
                        if (!p || typeof p !== "object") return null;
                        const maxLv = isGmAccount ? 999 : 200;
                        const lv = Math.max(1, Math.min(maxLv, Math.floor(Number(p.level) || 1)));
                        const rName = p.rarity?.name || "Thường";
                        const mult = RARITY_MAX_MULT[rName] || 1.15;
                        const tier = Math.max(0, Math.min(10, Math.floor(Number(p.gearTier) || 0)));
                        const clawLv = Math.max(0, Math.min(100, Math.floor(Number(p.gears?.claw) || 0)));
                        const armorLv = Math.max(0, Math.min(100, Math.floor(Number(p.gears?.armor) || 0)));
                        const orbLv = Math.max(0, Math.min(100, Math.floor(Number(p.gears?.orb) || 0)));

                        // Trần chỉ số gốc hợp lệ theo cấp độ & phẩm chất
                        const ceilingHp = Math.floor((260 + lv * 35) * mult) + 500;
                        const ceilingAtk = Math.floor((95 + lv * 14) * mult) + 250;
                        const ceilingSpeed = Math.floor((110 + lv * 3) * (1 + (mult - 1) * 0.5)) + 150;

                        const safeMaxHp = isGmAccount ? Math.max(50, Math.floor(Number(p.maxHp) || 150)) : Math.max(50, Math.min(ceilingHp, Math.floor(Number(p.maxHp) || 150)));
                        const safeAtk = isGmAccount ? Math.max(10, Math.floor(Number(p.atk) || 40)) : Math.max(10, Math.min(ceilingAtk, Math.floor(Number(p.atk) || 40)));
                        const safeSpeed = isGmAccount ? Math.max(10, Math.floor(Number(p.speed) || 50)) : Math.max(10, Math.min(ceilingSpeed, Math.floor(Number(p.speed) || 50)));

                        return {
                            ...p,
                            level: lv,
                            maxHp: safeMaxHp,
                            hp: Math.max(0, Math.min(safeMaxHp + armorLv * 25 + tier * 60, Math.floor(Number(p.hp) ?? safeMaxHp))),
                            atk: safeAtk,
                            speed: safeSpeed,
                            hearts: Math.max(0, Math.min(3, Math.floor(Number(p.hearts) ?? 3))),
                            critRate: Math.max(0, Math.min(100, Number(p.critRate) || 20)),
                            dodgeRate: Math.max(0, Math.min(85, Number(p.dodgeRate) || 15)),
                            blockRate: Math.max(0, Math.min(90, Number(p.blockRate) || 15)),
                            armorBreak: Math.max(0, Math.min(100, Number(p.armorBreak) || 15)),
                            comboRate: Math.max(0, Math.min(80, Number(p.comboRate) || 20)),
                            gearTier: tier,
                            gears: { claw: clawLv, armor: armorLv, orb: orbLv }
                        };
                    };

                    const incoming = (gameData && typeof gameData === "object") ? gameData : {};
                    const prevCoins = Math.max(0, Math.floor(Number(prevData.coins) || 0));
                    const prevDiamonds = Math.max(0, Math.floor(Number(prevData.diamonds) || 0));
                    let nextCoins = Math.max(0, Math.floor(Number(incoming.coins) || 0));
                    let nextDiamonds = Math.max(0, Math.floor(Number(incoming.diamonds) || 0));

                    // Chống bơm tiền bất thường trong 1 lần đồng bộ (tối đa +25.000 vàng / +150 KC mỗi lần sync nếu không phải GM)
                    if (!isGmAccount) {
                        if (nextCoins - prevCoins > 25000) nextCoins = prevCoins + 25000;
                        if (nextDiamonds - prevDiamonds > 150) nextDiamonds = prevDiamonds + 150;
                    }

                    const safeCap = Math.max(10, Math.min(60, Math.floor(Number(incoming.maxPetCapacity) || 10)));
                    const sanitizeList = (arr, maxLen) => Array.isArray(arr)
                        ? arr.slice(0, maxLen).map(clampPetObject).filter(Boolean)
                        : [];

                    const cleanState = {
                        coins: nextCoins,
                        diamonds: nextDiamonds,
                        maxPetCapacity: safeCap,
                        towerFloor: Math.max(1, Math.min(5000, Math.floor(Number(incoming.towerFloor) || 1))),
                        bossLevel: Math.max(1, Math.min(1000, Math.floor(Number(incoming.bossLevel) || 1))),
                        team: sanitizeList(incoming.team, 3),
                        farm: sanitizeList(incoming.farm, safeCap),
                        eggs: Array.isArray(incoming.eggs) ? incoming.eggs.slice(0, 12) : [],
                        restingPets: sanitizeList(incoming.restingPets, 4),
                        trainingPoles: Array.isArray(incoming.trainingPoles)
                            ? incoming.trainingPoles.slice(0, 4).map(p => p ? clampPetObject(p) : null)
                            : [null, null, null, null],
                        inventory: (incoming.inventory && typeof incoming.inventory === "object") ? incoming.inventory : {}
                    };

                    const saveDataStr = JSON.stringify(cleanState);
                    if (existing.game_data === saveDataStr) {
                        return jsonResponse({ ok: true, skipped: true });
                    }

                    await db.prepare(
                        "UPDATE players SET game_data = ?, updated_at = ? WHERE LOWER(username) = LOWER(?) AND pin = ?"
                    ).bind(saveDataStr, Date.now(), cleanUser, pin).run();

                    return jsonResponse({ ok: true });
                }

                // Xác thực nhận thưởng nhiệm vụ ngày phía Server (chống spam nhận nhiều lần)
                if (action === "claim_quest") {
                    const questId = Number(body.questId);
                    const QUEST_REWARDS = {
                        1: { coins: 200, diamonds: 5 },
                        2: { coins: 300, diamonds: 5 },
                        3: { coins: 150, diamonds: 5 }
                    };
                    const rewardCfg = QUEST_REWARDS[questId];
                    if (!rewardCfg) return jsonResponse({ ok: false, error: "Nhiệm vụ không hợp lệ!" }, 400);

                    const player = await db.prepare(
                        "SELECT session_token, game_data FROM players WHERE LOWER(username) = LOWER(?) AND pin = ?"
                    ).bind(cleanUser, pin).first();
                    if (!player) return jsonResponse({ ok: false, error: "Sai thông tin tài khoản!" }, 401);
                    if (sessionToken && player.session_token && player.session_token !== sessionToken) {
                        return jsonResponse({ ok: false, code: "SESSION_EXPIRED" }, 401);
                    }

                    const nowVn = new Date(Date.now() + 7 * 3600 * 1000);
                    const dayKey = `${nowVn.getUTCFullYear()}-${String(nowVn.getUTCMonth() + 1).padStart(2, "0")}-${String(nowVn.getUTCDate()).padStart(2, "0")}`;

                    await db.prepare(`
                        CREATE TABLE IF NOT EXISTS daily_quest_claims (
                            username TEXT NOT NULL,
                            day_key TEXT NOT NULL,
                            quest_id INTEGER NOT NULL,
                            claimed_at INTEGER NOT NULL,
                            PRIMARY KEY (username, day_key, quest_id)
                        )
                    `).run();

                    const already = await db.prepare(
                        "SELECT quest_id FROM daily_quest_claims WHERE LOWER(username) = LOWER(?) AND day_key = ? AND quest_id = ?"
                    ).bind(cleanUser, dayKey, questId).first();
                    if (already) {
                        return jsonResponse({ ok: false, error: "Bạn đã nhận thưởng nhiệm vụ này hôm nay rồi!" }, 409);
                    }

                    await db.prepare(
                        "INSERT INTO daily_quest_claims (username, day_key, quest_id, claimed_at) VALUES (?, ?, ?, ?)"
                    ).bind(cleanUser, dayKey, questId, Date.now()).run();

                    let gd = {};
                    try { gd = JSON.parse(player.game_data || "{}"); } catch (e) {}
                    gd.coins = (Number(gd.coins) || 0) + rewardCfg.coins;
                    gd.diamonds = (Number(gd.diamonds) || 0) + rewardCfg.diamonds;

                    await db.prepare(
                        "UPDATE players SET game_data = ?, updated_at = ? WHERE LOWER(username) = LOWER(?)"
                    ).bind(JSON.stringify(gd), Date.now(), cleanUser).run();

                    return jsonResponse({
                        ok: true,
                        coinsAdded: rewardCfg.coins,
                        diamondsAdded: rewardCfg.diamonds,
                        totalCoins: gd.coins,
                        totalDiamonds: gd.diamonds
                    });
                }

                if (action === "pull") {
                    const player = await db.prepare(
                        "SELECT username, gender, session_token, game_data FROM players WHERE LOWER(username) = LOWER(?) AND pin = ?"
                    ).bind(cleanUser, pin).first();

                    if (!player) {
                        return jsonResponse({ ok: false, error: "Không tìm thấy tài khoản!" }, 404);
                    }
                    if (sessionToken && player.session_token && player.session_token !== sessionToken) {
                        return jsonResponse({ ok: false, code: "SESSION_EXPIRED" }, 401);
                    }

                    let parsedGameData = {};
                    try { parsedGameData = JSON.parse(player.game_data || "{}"); } catch (e) {}

                    return new Response(JSON.stringify({
                        ok: true,
                        username: player.username,
                        gender: player.gender || "Nam",
                        gameData: parsedGameData
                    }), {
                        status: 200,
                        headers: {
                            "Content-Type": "application/json; charset=utf-8",
                            "Cache-Control": "no-store, no-cache, must-revalidate"
                        }
                    });
                }

                return jsonResponse({ ok: false, error: "Hành động không hợp lệ!" }, 400);
            } catch (err) {
                return jsonResponse({ ok: false, error: "Lỗi server: " + err.message }, 500);
            }
        }

        // ==========================================
        // API 2: KÊNH CHAT THẾ GIỚI (/api/chat)
        // ==========================================
        if (url.pathname === "/api/chat") {
            try {
                if (!db) return jsonResponse({ ok: false, error: "Chưa kết nối D1!" }, 500);

                await db.prepare(`
                    CREATE TABLE IF NOT EXISTS world_chat (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        sender TEXT,
                        gender TEXT DEFAULT 'Nam',
                        pet_info TEXT DEFAULT '',
                        text TEXT NOT NULL,
                        is_system INTEGER DEFAULT 0,
                        created_at INTEGER NOT NULL
                    )
                `).run();

                if (request.method === "GET") {
                    const { results } = await db.prepare(
                        "SELECT id, sender, gender, pet_info, text, is_system, created_at FROM world_chat ORDER BY id DESC LIMIT 25"
                    ).all();
                    return jsonResponse({ ok: true, messages: (results || []).reverse() });
                }

                if (request.method === "POST") {
                    const body = await request.json();
                    const sender = String(body.sender || "Thợ Săn Ẩn Danh").slice(0, 32);
                    const gender = body.gender === "Nữ" ? "Nữ" : "Nam";
                    const petInfo = String(body.petInfo || "").slice(0, 1500);
                    const text = String(body.text || "").trim().slice(0, 180);
                    const isSystem = body.isSystem ? 1 : 0;

                    if (!text) return jsonResponse({ ok: false, error: "Nội dung trống!" }, 400);

                    await db.prepare(
                        "INSERT INTO world_chat (sender, gender, pet_info, text, is_system, created_at) VALUES (?, ?, ?, ?, ?, ?)"
                    ).bind(sender, gender, petInfo, text, isSystem, Date.now()).run();

                    if (Math.random() < 0.1) {
                        await db.prepare(
                            "DELETE FROM world_chat WHERE id NOT IN (SELECT id FROM world_chat ORDER BY id DESC LIMIT 100)"
                        ).run();
                    }

                    return jsonResponse({ ok: true });
                }
            } catch (err) {
                return jsonResponse({ ok: false, error: err.message }, 500);
            }
        }

        // ==========================================
        // API 3: ĐỒNG BỘ VỊ TRÍ NGƯỜI CHƠI TRÊN BẢN ĐỒ & SẢNH BOSS (/api/presence)
        // ==========================================
        if (url.pathname === "/api/presence" && request.method === "POST") {
            try {
                if (!db) return jsonResponse({ ok: false, error: "Chưa kết nối D1!" }, 500);

                await db.prepare(`
                    CREATE TABLE IF NOT EXISTS player_presence (
                        username TEXT PRIMARY KEY,
                        gender TEXT DEFAULT 'Nam',
                        lat REAL DEFAULT 0,
                        lng REAL DEFAULT 0,
                        dir TEXT DEFAULT 'down',
                        state TEXT DEFAULT 'idle',
                        lead_pet TEXT DEFAULT '',
                        updated_at INTEGER NOT NULL
                    )
                `).run();

                const body = await request.json();
                const now = Date.now();
                const username = String(body.username || "").trim();

                // 1. Thoát game / rời bản đồ
                if (body.action === "offline" && username) {
                    await db.prepare("DELETE FROM player_presence WHERE username = ?")
                        .bind(username).run();
                    return jsonResponse({ ok: true });
                }

                // 2. Đồng bộ người chơi cùng đứng trong Sảnh Boss Thế Giới
                if (body.action === "world_boss") {
                    const bossId = String(body.bossId || "default");
                    const posX = Math.round(Number(body.x) || 500);
                    const posY = Math.round(Number(body.y) || 750);
                    const dir = String(body.dir || "up");
                    const stateTag = `wb:${bossId}:${posX}:${posY}:${dir}`;

                    if (username) {
                        await db.prepare(`
                            INSERT INTO player_presence (username, gender, lat, lng, dir, state, lead_pet, updated_at)
                            VALUES (?, ?, 0, 0, ?, ?, ?, ?)
                            ON CONFLICT(username) DO UPDATE SET
                                gender = excluded.gender,
                                dir = excluded.dir,
                                state = excluded.state,
                                lead_pet = excluded.lead_pet,
                                updated_at = excluded.updated_at
                        `).bind(
                            username,
                            body.gender === "Nữ" ? "Nữ" : "Nam",
                            dir,
                            stateTag,
                            String(body.leadPet || ""),
                            now
                        ).run();
                    }

                    const activeThreshold = now - 15000;
                    const { results } = await db.prepare(`
                        SELECT username, gender, state, lead_pet
                        FROM player_presence
                        WHERE LOWER(username) != LOWER(?) AND state LIKE ? AND updated_at >= ?
                        LIMIT 50
                    `).bind(username, `wb:${bossId}:%`, activeThreshold).all();

                    const lobbyPlayers = (results || []).map(r => {
                        const parts = String(r.state || "").split(":");
                        return {
                            name: r.username,
                            gender: r.gender || "Nam",
                            x: Number(parts[2]) || 500,
                            y: Number(parts[3]) || 700,
                            dir: parts[4] || "up",
                            leadPet: r.lead_pet || ""
                        };
                    });

                    return jsonResponse({ ok: true, players: lobbyPlayers });
                }

                // 3. Đồng bộ vị trí GPS trên bản đồ thế giới (bán kính 200m)
                if (username && typeof body.lat === "number" && typeof body.lng === "number") {
                    await db.prepare(`
                        INSERT INTO player_presence (username, gender, lat, lng, dir, state, lead_pet, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(username) DO UPDATE SET
                            gender = excluded.gender,
                            lat = excluded.lat,
                            lng = excluded.lng,
                            dir = excluded.dir,
                            state = excluded.state,
                            lead_pet = excluded.lead_pet,
                            updated_at = excluded.updated_at
                    `).bind(
                        username,
                        body.gender === "Nữ" ? "Nữ" : "Nam",
                        body.lat,
                        body.lng,
                        String(body.dir || "down"),
                        String(body.state || "idle"),
                        String(body.leadPet || ""),
                        now
                    ).run();
                }

                const activeThreshold = now - 45000;
                const { results } = await db.prepare(`
                    SELECT username, gender, lat, lng, dir, state, lead_pet, updated_at
                    FROM player_presence
                    WHERE LOWER(username) != LOWER(?) AND state NOT LIKE 'wb:%' AND updated_at >= ?
                    LIMIT 120
                `).bind(username, activeThreshold).all();

                const calcDistMeters = (lat1, lng1, lat2, lng2) => {
                    const R = 6371000;
                    const toRad = (deg) => deg * Math.PI / 180;
                    const dLat = toRad(lat2 - lat1);
                    const dLng = toRad(lng2 - lng1);
                    const a = Math.sin(dLat / 2) ** 2 +
                              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
                    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                };

                const maxRadius = Math.max(200, Math.min(5000, Number(body.radius) || 1000));
                const nearbyPlayers = [];
                for (const p of (results || [])) {
                    if (typeof body.lat !== "number" || typeof body.lng !== "number") continue;
                    if (typeof p.lat !== "number" || typeof p.lng !== "number") continue;
                    const dist = Math.round(calcDistMeters(body.lat, body.lng, p.lat, p.lng));
                    if (dist <= maxRadius) {
                        nearbyPlayers.push({ ...p, distance: dist });
                    }
                }
                nearbyPlayers.sort((a, b) => a.distance - b.distance);

                return jsonResponse({ ok: true, players: nearbyPlayers, radius: maxRadius });
            } catch (err) {
                return jsonResponse({ ok: false, error: err.message }, 500);
            }
        }

        // ==========================================
        // API 3.5: HEARTBEAT TỔNG HỢP (TỐI ƯU 90% TÀI NGUYÊN CLOUDFLARE) (/api/heartbeat)
        // Gộp vị trí Map, PvP duel, Tin nhắn mật, Payout Chợ P2P, Quà Admin & Boss Thế Giới trong 1 call
        // ==========================================
        if (url.pathname === "/api/heartbeat" && request.method === "POST") {
            try {
                if (!db) return jsonResponse({ ok: false, error: "Chưa kết nối D1!" }, 500);

                const body = await request.json();
                const now = Date.now();
                const username = String(body.username || "").trim();

                let nearbyPlayers = [];
                let incomingDuels = [];
                let activeDuel = null;
                let marketPayouts = [];
                let adminGifts = [];
                let unreadPms = 0;

                // 1. Cập nhật toạ độ GPS của người chơi
                if (username && typeof body.lat === "number" && typeof body.lng === "number") {
                    await db.prepare(`
                        INSERT INTO player_presence (username, gender, lat, lng, dir, state, lead_pet, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(username) DO UPDATE SET
                            gender = excluded.gender,
                            lat = excluded.lat,
                            lng = excluded.lng,
                            dir = excluded.dir,
                            state = excluded.state,
                            lead_pet = excluded.lead_pet,
                            updated_at = excluded.updated_at
                    `).bind(
                        username,
                        body.gender === "Nữ" ? "Nữ" : "Nam",
                        body.lat,
                        body.lng,
                        String(body.dir || "down"),
                        String(body.state || "idle"),
                        String(body.leadPet || ""),
                        now
                    ).run();
                }

                // 2. Quét người chơi xung quanh bán kính 1000m
                if (typeof body.lat === "number" && typeof body.lng === "number") {
                    const activeThreshold = now - 45000;
                    const { results } = await db.prepare(`
                        SELECT username, gender, lat, lng, dir, state, lead_pet, updated_at
                        FROM player_presence
                        WHERE LOWER(username) != LOWER(?) AND state NOT LIKE 'wb:%' AND updated_at >= ?
                        LIMIT 60
                    `).bind(username, activeThreshold).all();

                    const calcDistMeters = (lat1, lng1, lat2, lng2) => {
                        const R = 6371000;
                        const toRad = (deg) => deg * Math.PI / 180;
                        const dLat = toRad(lat2 - lat1);
                        const dLng = toRad(lng2 - lng1);
                        const a = Math.sin(dLat / 2) ** 2 +
                                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
                        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    };

                    const maxRadius = Math.max(200, Math.min(5000, Number(body.radius) || 1000));
                    for (const p of (results || [])) {
                        if (typeof p.lat !== "number" || typeof p.lng !== "number") continue;
                        const dist = Math.round(calcDistMeters(body.lat, body.lng, p.lat, p.lng));
                        if (dist <= maxRadius) {
                            nearbyPlayers.push({ ...p, distance: dist });
                        }
                    }
                    nearbyPlayers.sort((a, b) => a.distance - b.distance);
                }

                // 3. Nếu đã đăng nhập: Kiểm tra PvP, Hộp thư, Payout Chợ P2P, Quà Admin
                if (username) {
                    // a. Kiểm tra lời mời và trận khiêu chiến sinh tử PvP
                    try {
                        const { results: inc } = await db.prepare(`
                            SELECT id, challenger, defender, challenger_pet, status, seed, created_at
                            FROM pvp_duels
                            WHERE LOWER(defender) = LOWER(?) AND status = 'pending' AND created_at >= ?
                            ORDER BY id DESC LIMIT 3
                        `).bind(username, now - 60000).all();
                        incomingDuels = inc || [];

                        const acc = await db.prepare(`
                            SELECT id, challenger, defender, challenger_pet, defender_pet, status, seed, updated_at
                            FROM pvp_duels
                            WHERE (LOWER(challenger) = LOWER(?) OR LOWER(defender) = LOWER(?))
                              AND status = 'accepted' AND updated_at >= ?
                            ORDER BY id DESC LIMIT 1
                        `).bind(username, username, now - 30000).first();
                        if (acc) activeDuel = acc;
                    } catch (e) {}

                    // b. Kiểm tra tin nhắn riêng chưa đọc
                    try {
                        const lastPmId = Number(body.lastPmId) || 0;
                        const pmRow = await db.prepare(`
                            SELECT COUNT(*) as c FROM private_messages
                            WHERE LOWER(receiver) = LOWER(?) AND id > ?
                        `).bind(username, lastPmId).first();
                        unreadPms = Number(pmRow?.c) || 0;
                    } catch (e) {}

                    // c. Kiểm tra tiền bán hàng Chợ P2P chưa nhận
                    try {
                        const { results: payRows } = await db.prepare(`
                            SELECT id, coins, diamonds, note, created_at
                            FROM market_payouts
                            WHERE LOWER(username) = LOWER(?) AND claimed = 0
                            ORDER BY id ASC LIMIT 10
                        `).bind(username).all();
                        marketPayouts = payRows || [];
                    } catch (e) {}

                    // d. Kiểm tra quà tặng Admin chưa nhận
                    try {
                        const { results: giftRows } = await db.prepare(`
                            SELECT id, sender_user, gift_json, created_at
                            FROM admin_gifts
                            WHERE LOWER(target_user) = LOWER(?) AND claimed = 0
                            ORDER BY id ASC LIMIT 10
                        `).bind(username).all();
                        adminGifts = giftRows || [];
                    } catch (e) {}
                }

                // 4. Kiểm tra trạng thái Boss Thế Giới
                let worldBossActive = false;
                let bosses = [];
                try {
                    const { results } = await db.prepare(
                        "SELECT region_key, active, boss_name, hp, max_hp, opened_by, killer, updated_at FROM world_boss_state"
                    ).all();
                    bosses = results || [];
                    worldBossActive = bosses.some(b => Number(b.active) === 1);
                } catch (e) {}

                return jsonResponse({
                    ok: true,
                    players: nearbyPlayers,
                    pvp: {
                        incomingDuels,
                        activeDuel
                    },
                    pm: {
                        unreadCount: unreadPms,
                        hasNew: unreadPms > 0
                    },
                    marketPayouts,
                    adminGifts,
                    worldBoss: {
                        active: worldBossActive,
                        bosses
                    }
                });
            } catch (err) {
                return jsonResponse({ ok: false, error: "Lỗi Heartbeat: " + err.message }, 500);
            }
        }

        // ==========================================
        // API 4: NHẮN TIN RIÊNG & HỘP THƯ ĐẾN (/api/pm)
        // ==========================================
        if (url.pathname === "/api/pm") {
            try {
                if (!db) return jsonResponse({ ok: false, error: "Chưa kết nối D1!" }, 500);

                await db.prepare(`
                    CREATE TABLE IF NOT EXISTS private_messages (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        sender TEXT NOT NULL,
                        receiver TEXT NOT NULL,
                        text TEXT NOT NULL,
                        created_at INTEGER NOT NULL
                    )
                `).run();

                if (request.method === "GET") {
                    const mode = url.searchParams.get("mode");

                    if (mode === "inbox") {
                        const me = String(url.searchParams.get("u") || "").trim();
                        if (!me) return jsonResponse({ ok: false }, 400);

                        const { results } = await db.prepare(`
                            SELECT id, sender, receiver, text, created_at
                            FROM private_messages
                            WHERE receiver = ? OR sender = ?
                            ORDER BY id DESC
                            LIMIT 30
                        `).bind(me, me).all();

                        return jsonResponse({ ok: true, messages: results || [] });
                    }

                    const user1 = String(url.searchParams.get("u1") || "").trim();
                    const user2 = String(url.searchParams.get("u2") || "").trim();
                    if (!user1 || !user2) return jsonResponse({ ok: false, error: "Thiếu người dùng" }, 400);

                    const { results } = await db.prepare(`
                        SELECT id, sender, receiver, text, created_at
                        FROM private_messages
                        WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)
                        ORDER BY id DESC
                        LIMIT 40
                    `).bind(user1, user2, user2, user1).all();

                    return jsonResponse({ ok: true, messages: (results || []).reverse() });
                }

                if (request.method === "POST") {
                    const body = await request.json();
                    const sender = String(body.sender || "").trim();
                    const receiver = String(body.receiver || "").trim();
                    const text = String(body.text || "").trim().slice(0, 200);

                    if (!sender || !receiver || !text) {
                        return jsonResponse({ ok: false, error: "Nội dung không hợp lệ" }, 400);
                    }

                    const now = Date.now();
                    await db.prepare(`
                        INSERT INTO private_messages (sender, receiver, text, created_at)
                        VALUES (?, ?, ?, ?)
                    `).bind(sender, receiver, text, now).run();

                    if (Math.random() < 0.1) {
                        await db.prepare("DELETE FROM private_messages WHERE created_at < ?")
                            .bind(now - 86400000).run();
                    }

                    return jsonResponse({ ok: true });
                }
            } catch (err) {
                return jsonResponse({ ok: false, error: err.message }, 500);
            }
        }

        // ==========================================
        // API 5: HỆ THỐNG KẾT BẠN (/api/friends)
        // ==========================================
        if (url.pathname === "/api/friends") {
            try {
                await db.batch([
                    db.prepare(`
                        CREATE TABLE IF NOT EXISTS friendships (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            requester TEXT NOT NULL,
                            target TEXT NOT NULL,
                            status TEXT NOT NULL DEFAULT 'pending',
                            created_at INTEGER NOT NULL,
                            UNIQUE(requester, target)
                        )
                    `),
                    db.prepare(`CREATE INDEX IF NOT EXISTS idx_friend_req ON friendships(requester, status)`),
                    db.prepare(`CREATE INDEX IF NOT EXISTS idx_friend_tgt ON friendships(target, status)`)
                ]);

                if (request.method === "GET") {
                    const me = String(url.searchParams.get("u") || "").trim();
                    if (!me) return jsonResponse({ ok: false, error: "Thiếu tài khoản" }, 400);

                    const { results } = await db.prepare(`
                        SELECT id, requester, target, status, created_at
                        FROM friendships
                        WHERE requester = ? OR target = ?
                        ORDER BY id DESC
                    `).bind(me, me).all();

                    const rows = results || [];
                    const friends = [];
                    const incoming = [];
                    const outgoing = [];
                    const friendNames = [];

                    rows.forEach(r => {
                        if (r.status === "accepted") {
                            const fName = r.requester === me ? r.target : r.requester;
                            friends.push(fName);
                            friendNames.push(fName);
                        } else if (r.status === "pending") {
                            if (r.target === me) incoming.push({ id: r.id, from: r.requester });
                            else outgoing.push({ id: r.id, to: r.target });
                        }
                    });

                    let onlineMap = {};
                    if (friendNames.length > 0) {
                        try {
                            const activeThreshold = Date.now() - 25000;
                            const { results: onlineRows } = await db.prepare(`
                                SELECT username, gender, lead_pet
                                FROM player_presence
                                WHERE updated_at >= ?
                            `).bind(activeThreshold).all();

                            (onlineRows || []).forEach(p => {
                                onlineMap[p.username] = { gender: p.gender, leadPet: p.lead_pet };
                            });
                        } catch (e) {}
                    }

                    const friendList = friends.map(name => ({
                        username: name,
                        online: !!onlineMap[name],
                        gender: onlineMap[name]?.gender || "Nam",
                        leadPet: onlineMap[name]?.leadPet || ""
                    }));

                    friendList.sort((a, b) => Number(b.online) - Number(a.online));

                    return jsonResponse({
                        ok: true,
                        friends: friendList,
                        incoming: incoming,
                        outgoing: outgoing
                    });
                }

                if (request.method === "POST") {
                    const body = await request.json();
                    const action = String(body.action || "");
                    const me = String(body.me || "").trim();
                    const target = String(body.target || "").trim();

                    if (!me || !target || me === target) {
                        return jsonResponse({ ok: false, error: "Thông tin không hợp lệ" }, 400);
                    }

                    if (action === "request") {
                        const userExists = await db.prepare("SELECT username FROM players WHERE username = ?")
                            .bind(target).first();
                        if (!userExists) {
                            return jsonResponse({ ok: false, error: `Không tìm thấy Thợ Săn [${target}]!` }, 404);
                        }

                        const existing = await db.prepare(`
                            SELECT id, requester, target, status FROM friendships
                            WHERE (requester = ? AND target = ?) OR (requester = ? AND target = ?)
                        `).bind(me, target, target, me).first();

                        if (existing) {
                            if (existing.status === "accepted") {
                                return jsonResponse({ ok: false, error: "Hai bạn đã là bạn bè rồi!" });
                            }
                            if (existing.requester === target) {
                                await db.prepare("UPDATE friendships SET status = 'accepted' WHERE id = ?")
                                    .bind(existing.id).run();
                                return jsonResponse({ ok: true, autoAccepted: true });
                            }
                            return jsonResponse({ ok: false, error: "Bạn đã gửi lời mời trước đó rồi!" });
                        }

                        await db.prepare(`
                            INSERT INTO friendships (requester, target, status, created_at)
                            VALUES (?, ?, 'pending', ?)
                        `).bind(me, target, Date.now()).run();

                        return jsonResponse({ ok: true });
                    }

                    if (action === "accept") {
                        await db.prepare(`
                            UPDATE friendships SET status = 'accepted'
                            WHERE requester = ? AND target = ? AND status = 'pending'
                        `).bind(target, me).run();
                        return jsonResponse({ ok: true });
                    }

                    if (action === "reject" || action === "remove") {
                        await db.prepare(`
                            DELETE FROM friendships
                            WHERE (requester = ? AND target = ?) OR (requester = ? AND target = ?)
                        `).bind(me, target, target, me).run();
                        return jsonResponse({ ok: true });
                    }

                    return jsonResponse({ ok: false, error: "Hành động không hợp lệ" }, 400);
                }
            } catch (err) {
                return jsonResponse({ ok: false, error: err.message }, 500);
            }
        }

        // ==========================================
        // API 6: BẢNG ĐIỀU KHIỂN QUẢN TRỊ VIÊN & HỘP THƯ QUÀ GM (/api/admin)
        // ==========================================
        if (url.pathname === "/api/admin") {
            try {
                if (!db) return jsonResponse({ ok: false, error: "Chưa kết nối D1!" }, 500);

                await db.batch([
                    db.prepare(`
                        CREATE TABLE IF NOT EXISTS admin_gifts (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            target_user TEXT NOT NULL,
                            sender_user TEXT NOT NULL,
                            gift_json TEXT NOT NULL,
                            claimed INTEGER NOT NULL DEFAULT 0,
                            created_at INTEGER NOT NULL
                        )
                    `),
                    db.prepare(`CREATE INDEX IF NOT EXISTS idx_admin_gifts_target ON admin_gifts(target_user, claimed)`)
                ]);

                // GET: Người chơi kiểm tra quà GM đang chờ nhận (không bị ghi đè khi sync)
                if (request.method === "GET") {
                    const me = String(url.searchParams.get("u") || "").trim();
                    if (!me) return jsonResponse({ ok: false, error: "Thiếu tài khoản" }, 400);

                    const { results } = await db.prepare(`
                        SELECT id, sender_user, gift_json, created_at
                        FROM admin_gifts
                        WHERE LOWER(target_user) = LOWER(?) AND claimed = 0
                        ORDER BY id ASC
                        LIMIT 20
                    `).bind(me).all();

                    return new Response(JSON.stringify({ ok: true, gifts: results || [] }), {
                        status: 200,
                        headers: {
                            "Content-Type": "application/json; charset=utf-8",
                            "Cache-Control": "no-store, no-cache, must-revalidate"
                        }
                    });
                }

                if (request.method === "POST") {
                    const body = await request.json();

                    // Người chơi xác nhận đã nhận quà xong -> đánh dấu claimed = 1
                    if (body.action === "claim_gifts") {
                        const me = String(body.username || "").trim();
                        const ids = Array.isArray(body.giftIds) ? body.giftIds.map(Number).filter(n => n > 0) : [];
                        for (const gid of ids) {
                            await db.prepare(
                                "UPDATE admin_gifts SET claimed = 1 WHERE id = ? AND LOWER(target_user) = LOWER(?)"
                            ).bind(gid, me).run();
                        }
                        return jsonResponse({ ok: true });
                    }

                    // GM gửi quà cho người chơi khác
                    const adminUser = String(body.adminUser || "").trim();
                    const adminPin = String(body.adminPin || "").trim();
                    const targetUser = String(body.targetUser || "").trim();
                    const gift = body.gift || {};

                    const ADMIN_LIST = ["GiaPhat28594", "ThuyHan171097"];
                    if (!ADMIN_LIST.some(id => id.toLowerCase() === adminUser.toLowerCase())) {
                        return jsonResponse({ ok: false, error: "Tài khoản không có quyền Admin!" }, 403);
                    }

                    const adminRow = await db.prepare("SELECT pin FROM players WHERE LOWER(username) = LOWER(?)")
                        .bind(adminUser).first();
                    if (!adminRow || adminRow.pin !== adminPin) {
                        return jsonResponse({ ok: false, error: "Sai mã PIN xác thực Admin!" }, 401);
                    }

                    if (!targetUser) {
                        return jsonResponse({ ok: false, error: "Vui lòng nhập ID người nhận!" }, 400);
                    }

                    const targetRow = await db.prepare("SELECT username FROM players WHERE LOWER(username) = LOWER(?)")
                        .bind(targetUser).first();
                    if (!targetRow) {
                        return jsonResponse({ ok: false, error: `Không tìm thấy người chơi [${targetUser}]!` }, 404);
                    }

                    await db.prepare(`
                        INSERT INTO admin_gifts (target_user, sender_user, gift_json, claimed, created_at)
                        VALUES (?, ?, ?, 0, ?)
                    `).bind(targetRow.username, adminUser, JSON.stringify(gift), Date.now()).run();

                    return jsonResponse({ ok: true, targetUser: targetRow.username });
                }
            } catch (err) {
                return jsonResponse({ ok: false, error: "Lỗi Admin API: " + err.message }, 500);
            }
        }

        // ==========================================
        // API 7: ĐẤU TRƯỜNG PVP DANH VỌNG & KHIÊU CHIẾN SINH TỬ (/api/pvp)
        // ==========================================
        if (url.pathname === "/api/pvp") {
            try {
                if (!db) return jsonResponse({ ok: false, error: "Chưa kết nối D1!" }, 500);

                await db.batch([
                    db.prepare(`
                        CREATE TABLE IF NOT EXISTS pvp_leaderboard (
                            username TEXT NOT NULL,
                            week_key TEXT NOT NULL,
                            points INTEGER NOT NULL DEFAULT 1000,
                            wins INTEGER NOT NULL DEFAULT 0,
                            losses INTEGER NOT NULL DEFAULT 0,
                            lead_pet TEXT,
                            updated_at INTEGER NOT NULL,
                            PRIMARY KEY (username, week_key)
                        )
                    `),
                    db.prepare(`
                        CREATE TABLE IF NOT EXISTS pvp_duels (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            challenger TEXT NOT NULL,
                            defender TEXT NOT NULL,
                            challenger_pet TEXT NOT NULL,
                            defender_pet TEXT,
                            status TEXT NOT NULL DEFAULT 'pending',
                            seed INTEGER NOT NULL,
                            winner TEXT,
                            created_at INTEGER NOT NULL,
                            updated_at INTEGER NOT NULL
                        )
                    `),
                    db.prepare(`CREATE INDEX IF NOT EXISTS idx_pvp_duel_def ON pvp_duels(defender, status)`),
                    db.prepare(`CREATE INDEX IF NOT EXISTS idx_pvp_duel_chal ON pvp_duels(challenger, status)`)
                ]);

                const weekKey = getCurrentWeekKey();

                // GET: Lấy BXH Tuần + Điểm cá nhân + Kiểm tra lời mời/trận Khiêu Chiến Sinh Tử
                if (request.method === "GET") {
                    const me = String(url.searchParams.get("u") || "").trim();

                    const { results: topRows } = await db.prepare(`
                        SELECT username, points, wins, losses, lead_pet
                        FROM pvp_leaderboard
                        WHERE week_key = ?
                        ORDER BY points DESC, wins DESC
                        LIMIT 20
                    `).bind(weekKey).all();

                    let myRank = { points: 1000, wins: 0, losses: 0 };
                    let incomingDuels = [];
                    let activeDuel = null;

                    if (me) {
                        const mine = await db.prepare(`
                            SELECT points, wins, losses FROM pvp_leaderboard
                            WHERE LOWER(username) = LOWER(?) AND week_key = ?
                        `).bind(me, weekKey).first();
                        if (mine) myRank = mine;

                        const now = Date.now();
                        // Lời mời khiêu chiến sinh tử gửi đến mình (còn hiệu lực trong 60 giây)
                        const { results: inc } = await db.prepare(`
                            SELECT id, challenger, defender, challenger_pet, status, seed, created_at
                            FROM pvp_duels
                            WHERE LOWER(defender) = LOWER(?) AND status = 'pending' AND created_at >= ?
                            ORDER BY id DESC LIMIT 5
                        `).bind(me, now - 60000).all();
                        incomingDuels = inc || [];

                        // Trận khiêu chiến sinh tử vừa được chấp nhận (dành cho bên thách đấu nhận tín hiệu vào trận)
                        const acc = await db.prepare(`
                            SELECT id, challenger, defender, challenger_pet, defender_pet, status, seed, updated_at
                            FROM pvp_duels
                            WHERE (LOWER(challenger) = LOWER(?) OR LOWER(defender) = LOWER(?))
                              AND status = 'accepted' AND updated_at >= ?
                            ORDER BY id DESC LIMIT 1
                        `).bind(me, me, now - 30000).first();
                        if (acc) activeDuel = acc;
                    }

                    return jsonResponse({
                        ok: true,
                        weekKey,
                        leaderboard: topRows || [],
                        myRank,
                        incomingDuels,
                        activeDuel
                    });
                }

                if (request.method === "POST") {
                    const body = await request.json();
                    const action = String(body.action || "");
                    const me = String(body.username || "").trim();

                    // 1. Tìm đối thủ thật cho Đấu Trường Danh Vọng 1vs1
                    if (action === "find_rank_opponent") {
                        const { results: candidates } = await db.prepare(`
                            SELECT username, game_data FROM players
                            WHERE LOWER(username) != LOWER(?) AND game_data IS NOT NULL AND game_data != ''
                            ORDER BY updated_at DESC LIMIT 30
                        `).bind(me).all();

                        const validOpponents = [];
                        for (const row of (candidates || [])) {
                            try {
                                const gd = JSON.parse(row.game_data || "{}");
                                const pool = [...(gd.team || []), ...(gd.farm || [])].filter(p => p && p.name && p.maxHp);
                                if (pool.length > 0) {
                                    // Chọn thú mạnh nhất của đối thủ
                                    pool.sort((a, b) => ((b.atk || 0) + (b.maxHp || 0)) - ((a.atk || 0) + (a.maxHp || 0)));
                                    validOpponents.push({ username: row.username, pet: pool[0] });
                                }
                            } catch (e) {}
                        }

                        if (validOpponents.length === 0) {
                            return jsonResponse({ ok: false, error: "Chưa tìm thấy Thợ Săn nào khác có linh thú trên máy chủ!" }, 404);
                        }

                        const picked = validOpponents[Math.floor(Math.random() * validOpponents.length)];
                        const seed = Math.floor(Math.random() * 2147483646) + 1;
                        return jsonResponse({ ok: true, opponent: picked, seed });
                    }

                    // 2. Cập nhật kết quả Đấu Trường Danh Vọng & BXH Tuần
                    if (action === "report_rank_result") {
                        const isWin = !!body.isWin;
                        const leadPet = String(body.leadPet || "").slice(0, 60);
                        const delta = isWin ? 25 : -15;

                        const existing = await db.prepare(`
                            SELECT points, wins, losses FROM pvp_leaderboard
                            WHERE username = ? AND week_key = ?
                        `).bind(me, weekKey).first();

                        const newPoints = Math.max(0, (existing ? existing.points : 1000) + delta);
                        const newWins = (existing ? existing.wins : 0) + (isWin ? 1 : 0);
                        const newLosses = (existing ? existing.losses : 0) + (isWin ? 0 : 1);

                        await db.prepare(`
                            INSERT INTO pvp_leaderboard (username, week_key, points, wins, losses, lead_pet, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(username, week_key) DO UPDATE SET
                                points = excluded.points,
                                wins = excluded.wins,
                                losses = excluded.losses,
                                lead_pet = excluded.lead_pet,
                                updated_at = excluded.updated_at
                        `).bind(me, weekKey, newPoints, newWins, newLosses, leadPet, Date.now()).run();

                        return jsonResponse({ ok: true, points: newPoints, delta, wins: newWins, losses: newLosses });
                    }

                    // 3. Gửi lời mời Khiêu Chiến Sinh Tử qua Avatar / Bạn bè
                    if (action === "duel_challenge") {
                        const target = String(body.target || "").trim();
                        const pet = body.pet;
                        if (!me || !target || me.toLowerCase() === target.toLowerCase() || !pet) {
                            return jsonResponse({ ok: false, error: "Thông tin khiêu chiến không hợp lệ!" }, 400);
                        }

                        const targetExists = await db.prepare("SELECT username FROM players WHERE LOWER(username) = LOWER(?)")
                            .bind(target).first();
                        if (!targetExists) {
                            return jsonResponse({ ok: false, error: `Không tìm thấy người chơi [${target}]!` }, 404);
                        }

                        const now = Date.now();
                        const seed = Math.floor(Math.random() * 2147483646) + 1;
                        const res = await db.prepare(`
                            INSERT INTO pvp_duels (challenger, defender, challenger_pet, status, seed, created_at, updated_at)
                            VALUES (?, ?, ?, 'pending', ?, ?, ?)
                        `).bind(me, targetExists.username, JSON.stringify(pet), seed, now, now).run();

                        return jsonResponse({ ok: true, duelId: res.meta?.last_row_id, seed });
                    }

                    // 4. Bên B Chấp Nhận Khiêu Chiến Sinh Tử
                    if (action === "duel_accept") {
                        const duelId = Number(body.duelId);
                        const pet = body.pet;
                        if (!duelId || !pet) return jsonResponse({ ok: false, error: "Thiếu dữ liệu thú xuất chiến!" }, 400);

                        const duel = await db.prepare("SELECT * FROM pvp_duels WHERE id = ? AND status = 'pending'")
                            .bind(duelId).first();
                        if (!duel) {
                            return jsonResponse({ ok: false, error: "Lời khiêu chiến đã hết hạn hoặc bị hủy!" }, 404);
                        }

                        const now = Date.now();
                        await db.prepare(`
                            UPDATE pvp_duels
                            SET defender_pet = ?, status = 'accepted', updated_at = ?
                            WHERE id = ?
                        `).bind(JSON.stringify(pet), now, duelId).run();

                        const updated = await db.prepare("SELECT * FROM pvp_duels WHERE id = ?").bind(duelId).first();
                        return jsonResponse({ ok: true, duel: updated });
                    }

                    // 5. Từ chối hoặc Hủy Khiêu Chiến Sinh Tử
                    if (action === "duel_decline") {
                        const duelId = Number(body.duelId);
                        await db.prepare("UPDATE pvp_duels SET status = 'declined', updated_at = ? WHERE id = ?")
                            .bind(Date.now(), duelId).run();
                        return jsonResponse({ ok: true });
                    }

                    // 6. Chốt kết quả Khiêu Chiến Sinh Tử (Đánh dấu hoàn thành để không chiếu lại lần 2)
                    if (action === "duel_finish") {
                        const duelId = Number(body.duelId);
                        const winner = String(body.winner || "");
                        await db.prepare("UPDATE pvp_duels SET status = 'finished', winner = ?, updated_at = ? WHERE id = ?")
                            .bind(winner, Date.now(), duelId).run();
                        return jsonResponse({ ok: true });
                    }

                    return jsonResponse({ ok: false, error: "Lệnh PvP không hợp lệ!" }, 400);
                }
            } catch (err) {
                return jsonResponse({ ok: false, error: "Lỗi PvP API: " + err.message }, 500);
            }
        }

        // ==========================================
        // API 8: ĐỒNG BỘ TRẠNG THÁI BOSS 3 MIỀN, TOP SÁT THƯƠNG & CHIA THƯỞNG (/api/world-boss)
        // ==========================================
        if (url.pathname === "/api/world-boss") {
            try {
                if (!db) return jsonResponse({ ok: false, error: "Chưa kết nối D1!" }, 500);

                await db.batch([
                    db.prepare(`
                        CREATE TABLE IF NOT EXISTS world_boss_state (
                            region_key TEXT PRIMARY KEY,
                            active INTEGER NOT NULL DEFAULT 0,
                            boss_name TEXT DEFAULT '',
                            hp INTEGER DEFAULT 0,
                            max_hp INTEGER DEFAULT 0,
                            opened_by TEXT DEFAULT '',
                            spawn_id TEXT DEFAULT '',
                            killer TEXT DEFAULT '',
                            updated_at INTEGER NOT NULL
                        )
                    `),
                    db.prepare(`
                        CREATE TABLE IF NOT EXISTS world_boss_damage (
                            spawn_id TEXT NOT NULL,
                            region_key TEXT NOT NULL,
                            username TEXT NOT NULL,
                            damage INTEGER NOT NULL DEFAULT 0,
                            claimed INTEGER NOT NULL DEFAULT 0,
                            updated_at INTEGER NOT NULL,
                            PRIMARY KEY (spawn_id, region_key, username)
                        )
                    `),
                    db.prepare(`CREATE INDEX IF NOT EXISTS idx_wb_dmg_rank ON world_boss_damage(spawn_id, region_key, damage DESC)`)
                ]);

                // Bổ sung cột spawn_id & killer nếu bảng đã tồn tại từ bản cũ
                for (const alterSql of [
                    "ALTER TABLE world_boss_state ADD COLUMN spawn_id TEXT DEFAULT ''",
                    "ALTER TABLE world_boss_state ADD COLUMN killer TEXT DEFAULT ''"
                ]) {
                    try { await db.prepare(alterSql).run(); } catch (e) {}
                }

                if (request.method === "GET") {
                    const regionFilter = String(url.searchParams.get("region") || "").trim();
                    const me = String(url.searchParams.get("u") || "").trim();

                    const { results } = await db.prepare(
                        "SELECT region_key, active, boss_name, hp, max_hp, opened_by, spawn_id, killer, updated_at FROM world_boss_state"
                    ).all();
                    const bosses = results || [];

                    let leaderboard = [];
                    let myDamage = 0;
                    let canClaimReward = false;
                    let myRank = 0;

                    if (regionFilter) {
                        const targetBoss = bosses.find(b => b.region_key === regionFilter);
                        const sid = targetBoss?.spawn_id || "";
                        if (sid) {
                            const { results: dmgRows } = await db.prepare(`
                                SELECT username, damage, claimed
                                FROM world_boss_damage
                                WHERE spawn_id = ? AND region_key = ? AND damage > 0
                                ORDER BY damage DESC
                                LIMIT 20
                            `).bind(sid, regionFilter).all();
                            leaderboard = dmgRows || [];

                            if (me) {
                                const mine = await db.prepare(`
                                    SELECT damage, claimed FROM world_boss_damage
                                    WHERE spawn_id = ? AND region_key = ? AND LOWER(username) = LOWER(?)
                                `).bind(sid, regionFilter, me).first();
                                if (mine) {
                                    myDamage = Number(mine.damage) || 0;
                                    const rankIdx = leaderboard.findIndex(r => r.username.toLowerCase() === me.toLowerCase());
                                    myRank = rankIdx >= 0 ? (rankIdx + 1) : 0;
                                    if (Number(targetBoss.hp) <= 0 && myDamage > 0 && Number(mine.claimed) === 0) {
                                        canClaimReward = true;
                                    }
                                }
                            }
                        }
                    }

                    return new Response(JSON.stringify({
                        ok: true,
                        bosses,
                        leaderboard,
                        myDamage,
                        myRank,
                        canClaimReward
                    }), {
                        status: 200,
                        headers: {
                            "Content-Type": "application/json; charset=utf-8",
                            "Cache-Control": "no-store, no-cache, must-revalidate"
                        }
                    });
                }

                if (request.method === "POST") {
                    const body = await request.json();

                    // 1. Người chơi báo cáo sát thương lên Boss Thế Giới (chống gửi vượt ngưỡng 1 lượt đánh)
                    if (body.action === "damage") {
                        const regionKey = String(body.regionKey || "").trim();
                        const username = String(body.username || "").trim();
                        const rawDmg = Math.max(0, Math.floor(Number(body.damage) || 0));
                        // Trần sát thương tối đa hợp lệ trong 1 lần giao chiến (chống hack packet)
                        const dmg = Math.min(rawDmg, 25000);

                        if (regionKey && dmg > 0) {
                            const row = await db.prepare(
                                "SELECT active, hp, max_hp, spawn_id, killer FROM world_boss_state WHERE region_key = ?"
                            ).bind(regionKey).first();

                            if (row && Number(row.active) === 1 && Number(row.hp) > 0) {
                                const actualDmg = Math.min(Number(row.hp), dmg);
                                const nextHp = Math.max(0, Number(row.hp) - actualDmg);
                                const isKilled = nextHp <= 0;
                                const nextActive = isKilled ? 0 : 1;
                                const killerName = isKilled ? (username || "Thợ Săn") : (row.killer || "");

                                await db.prepare(
                                    "UPDATE world_boss_state SET hp = ?, active = ?, killer = ?, updated_at = ? WHERE region_key = ?"
                                ).bind(nextHp, nextActive, killerName, Date.now(), regionKey).run();

                                const sid = row.spawn_id || `legacy_${regionKey}`;
                                if (username) {
                                    await db.prepare(`
                                        INSERT INTO world_boss_damage (spawn_id, region_key, username, damage, claimed, updated_at)
                                        VALUES (?, ?, ?, ?, 0, ?)
                                        ON CONFLICT(spawn_id, region_key, username) DO UPDATE SET
                                            damage = world_boss_damage.damage + excluded.damage,
                                            updated_at = excluded.updated_at
                                    `).bind(sid, regionKey, username, actualDmg, Date.now()).run();
                                }
                            }
                        }

                        const { results } = await db.prepare(
                            "SELECT region_key, active, boss_name, hp, max_hp, opened_by, spawn_id, killer, updated_at FROM world_boss_state"
                        ).all();
                        return jsonResponse({ ok: true, bosses: results || [] });
                    }

                    // 2. Người chơi nhận thưởng Top Sát Thương sau khi Boss bị hạ gục (xác thực 1 lần duy nhất trên Server)
                    if (body.action === "claim_reward") {
                        const regionKey = String(body.regionKey || "").trim();
                        const username = String(body.username || "").trim();
                        if (!regionKey || !username) {
                            return jsonResponse({ ok: false, error: "Thiếu thông tin nhận thưởng!" }, 400);
                        }

                        const bossRow = await db.prepare(
                            "SELECT hp, max_hp, boss_name, spawn_id, killer FROM world_boss_state WHERE region_key = ?"
                        ).bind(regionKey).first();
                        if (!bossRow || !bossRow.spawn_id) {
                            return jsonResponse({ ok: false, error: "Không tìm thấy dữ liệu Boss!" }, 404);
                        }
                        if (Number(bossRow.hp) > 0) {
                            return jsonResponse({ ok: false, error: "Boss chưa bị hạ gục, chưa thể chia thưởng!" }, 400);
                        }

                        const sid = bossRow.spawn_id;
                        const { results: rankRows } = await db.prepare(`
                            SELECT username, damage, claimed
                            FROM world_boss_damage
                            WHERE spawn_id = ? AND region_key = ? AND damage > 0
                            ORDER BY damage DESC
                            LIMIT 50
                        `).bind(sid, regionKey).all();

                        const list = rankRows || [];
                        const idx = list.findIndex(r => r.username.toLowerCase() === username.toLowerCase());
                        if (idx === -1) {
                            return jsonResponse({ ok: false, error: "Bạn chưa gây sát thương lên Boss này!" }, 403);
                        }
                        if (Number(list[idx].claimed) === 1) {
                            return jsonResponse({ ok: false, error: "Bạn đã nhận thưởng Boss đợt này rồi!" }, 409);
                        }

                        const rank = idx + 1;
                        const isKiller = bossRow.killer && bossRow.killer.toLowerCase() === username.toLowerCase();

                        // Tính gói thưởng theo Top Sát Thương
                        let rewardDiamonds = rank === 1 ? 40 : rank === 2 ? 25 : rank === 3 ? 18 : rank <= 10 ? 10 : 5;
                        let rewardCoins = rank === 1 ? 3000 : rank === 2 ? 2000 : rank === 3 ? 1500 : 800;
                        let stonesPerElem = rank === 1 ? 3 : rank <= 3 ? 2 : 1;
                        let gearChestCount = rank === 1 ? 3 : rank <= 3 ? 2 : 1;
                        if (isKiller) {
                            rewardDiamonds += 10;
                            rewardCoins += 1000;
                        }

                        await db.prepare(
                            "UPDATE world_boss_damage SET claimed = 1, updated_at = ? WHERE spawn_id = ? AND region_key = ? AND LOWER(username) = LOWER(?)"
                        ).bind(Date.now(), sid, regionKey, username).run();

                        // Cộng thưởng trực tiếp vào tài khoản player trên D1
                        const playerRow = await db.prepare("SELECT game_data FROM players WHERE LOWER(username) = LOWER(?)")
                            .bind(username).first();
                        let gd = {};
                        try { gd = JSON.parse(playerRow?.game_data || "{}"); } catch (e) {}
                        gd.coins = (Number(gd.coins) || 0) + rewardCoins;
                        gd.diamonds = (Number(gd.diamonds) || 0) + rewardDiamonds;
                        gd.inventory = (gd.inventory && typeof gd.inventory === "object") ? gd.inventory : {};
                        for (const sk of ["stoneKim", "stoneMoc", "stoneThuy", "stoneHoa", "stoneTho"]) {
                            gd.inventory[sk] = (Number(gd.inventory[sk]) || 0) + stonesPerElem;
                        }
                        gd.inventory.gearShardChest = (Number(gd.inventory.gearShardChest) || 0) + gearChestCount;

                        if (playerRow) {
                            await db.prepare("UPDATE players SET game_data = ?, updated_at = ? WHERE LOWER(username) = LOWER(?)")
                                .bind(JSON.stringify(gd), Date.now(), username).run();
                        }

                        return jsonResponse({
                            ok: true,
                            rank,
                            isKiller,
                            rewards: {
                                coins: rewardCoins,
                                diamonds: rewardDiamonds,
                                stonesPerElem,
                                gearChestCount
                            }
                        });
                    }

                    // 3. GM Triệu hồi / Thu hồi / Hồi máu Boss 3 Miền
                    const adminUser = String(body.adminUser || "").trim();
                    const adminPin = String(body.adminPin || "").trim();
                    const ADMIN_LIST = ["GiaPhat28594", "ThuyHan171097"];

                    if (!ADMIN_LIST.some(id => id.toLowerCase() === adminUser.toLowerCase())) {
                        return jsonResponse({ ok: false, error: "Tài khoản không có quyền GM/Admin!" }, 403);
                    }
                    const adminRow = await db.prepare("SELECT pin FROM players WHERE LOWER(username) = LOWER(?)")
                        .bind(adminUser).first();
                    if (!adminRow || adminRow.pin !== adminPin) {
                        return jsonResponse({ ok: false, error: "Sai mã PIN xác thực GM!" }, 401);
                    }

                    const regions = Array.isArray(body.regions) ? body.regions : [];
                    const now = Date.now();
                    const newSpawnId = `wb_${now}_${Math.floor(Math.random() * 1000)}`;

                    for (const r of regions) {
                        const key = String(r.regionKey || "").trim();
                        if (!key) continue;
                        const isAct = r.active ? 1 : 0;
                        await db.prepare(`
                            INSERT INTO world_boss_state (region_key, active, boss_name, hp, max_hp, opened_by, spawn_id, killer, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, '', ?)
                            ON CONFLICT(region_key) DO UPDATE SET
                                active = excluded.active,
                                boss_name = excluded.boss_name,
                                hp = excluded.hp,
                                max_hp = excluded.max_hp,
                                opened_by = excluded.opened_by,
                                spawn_id = CASE WHEN excluded.active = 1 THEN excluded.spawn_id ELSE world_boss_state.spawn_id END,
                                killer = CASE WHEN excluded.active = 1 THEN '' ELSE world_boss_state.killer END,
                                updated_at = excluded.updated_at
                        `).bind(
                            key,
                            isAct,
                            String(r.bossName || ""),
                            Number(r.hp) || 0,
                            Number(r.maxHp) || 0,
                            adminUser,
                            isAct ? newSpawnId : "",
                            now
                        ).run();
                    }

                    const { results } = await db.prepare(
                        "SELECT region_key, active, boss_name, hp, max_hp, opened_by, spawn_id, killer, updated_at FROM world_boss_state"
                    ).all();
                    return jsonResponse({ ok: true, bosses: results || [] });
                }
            } catch (err) {
                return jsonResponse({ ok: false, error: "Lỗi World Boss API: " + err.message }, 500);
            }
        }

        // ==========================================
        // API 9: BANG HỘI / GIA TỘC THỢ SĂN (/api/guild)
        // ==========================================
        if (url.pathname === "/api/guild") {
            try {
                if (!db) return jsonResponse({ ok: false, error: "Chưa kết nối D1!" }, 500);

                await db.batch([
                    db.prepare(`
                        CREATE TABLE IF NOT EXISTS guilds (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            name TEXT NOT NULL UNIQUE,
                            tag TEXT NOT NULL,
                            leader TEXT NOT NULL,
                            level INTEGER NOT NULL DEFAULT 1,
                            exp INTEGER NOT NULL DEFAULT 0,
                            coins_fund INTEGER NOT NULL DEFAULT 0,
                            announcement TEXT DEFAULT 'Chào mừng các Thợ Săn gia nhập Bang Hội!',
                            created_at INTEGER NOT NULL
                        )
                    `),
                    db.prepare(`
                        CREATE TABLE IF NOT EXISTS guild_members (
                            username TEXT PRIMARY KEY,
                            guild_id INTEGER NOT NULL,
                            role TEXT NOT NULL DEFAULT 'member',
                            contribution INTEGER NOT NULL DEFAULT 0,
                            joined_at INTEGER NOT NULL
                        )
                    `),
                    db.prepare(`
                        CREATE TABLE IF NOT EXISTS guild_chat (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            guild_id INTEGER NOT NULL,
                            sender TEXT NOT NULL,
                            text TEXT NOT NULL,
                            created_at INTEGER NOT NULL
                        )
                    `),
                    db.prepare(`
                        CREATE TABLE IF NOT EXISTS guild_boss (
                            guild_id INTEGER PRIMARY KEY,
                            week_key TEXT NOT NULL,
                            boss_name TEXT NOT NULL,
                            hp INTEGER NOT NULL,
                            max_hp INTEGER NOT NULL,
                            defeated INTEGER NOT NULL DEFAULT 0,
                            updated_at INTEGER NOT NULL
                        )
                    `),
                    db.prepare(`CREATE INDEX IF NOT EXISTS idx_guild_mem_gid ON guild_members(guild_id)`),
                    db.prepare(`CREATE INDEX IF NOT EXISTS idx_guild_chat_gid ON guild_chat(guild_id, id)`)
                ]);

                const weekKey = getCurrentWeekKey();

                if (request.method === "GET") {
                    const me = String(url.searchParams.get("u") || "").trim();
                    let myMembership = null;
                    let myGuild = null;
                    let members = [];
                    let messages = [];
                    let guildBoss = null;

                    if (me) {
                        myMembership = await db.prepare(
                            "SELECT username, guild_id, role, contribution, joined_at FROM guild_members WHERE LOWER(username) = LOWER(?)"
                        ).bind(me).first();

                        if (myMembership) {
                            myGuild = await db.prepare("SELECT * FROM guilds WHERE id = ?")
                                .bind(myMembership.guild_id).first();

                            if (myGuild) {
                                const { results: memRows } = await db.prepare(
                                    "SELECT username, role, contribution, joined_at FROM guild_members WHERE guild_id = ? ORDER BY contribution DESC, joined_at ASC"
                                ).bind(myGuild.id).all();
                                members = memRows || [];

                                const { results: chatRows } = await db.prepare(
                                    "SELECT id, sender, text, created_at FROM guild_chat WHERE guild_id = ? ORDER BY id DESC LIMIT 30"
                                ).bind(myGuild.id).all();
                                messages = (chatRows || []).reverse();

                                const bossMaxHp = 25000 + (myGuild.level || 1) * 15000;
                                guildBoss = await db.prepare("SELECT * FROM guild_boss WHERE guild_id = ?")
                                    .bind(myGuild.id).first();

                                if (!guildBoss || guildBoss.week_key !== weekKey) {
                                    await db.prepare(`
                                        INSERT INTO guild_boss (guild_id, week_key, boss_name, hp, max_hp, defeated, updated_at)
                                        VALUES (?, ?, 'Thần Thú Hộ Mệnh Bang Hội', ?, ?, 0, ?)
                                        ON CONFLICT(guild_id) DO UPDATE SET
                                            week_key = excluded.week_key,
                                            hp = excluded.hp,
                                            max_hp = excluded.max_hp,
                                            defeated = 0,
                                            updated_at = excluded.updated_at
                                    `).bind(myGuild.id, weekKey, bossMaxHp, bossMaxHp, Date.now()).run();
                                    guildBoss = await db.prepare("SELECT * FROM guild_boss WHERE guild_id = ?")
                                        .bind(myGuild.id).first();
                                }
                            }
                        }
                    }

                    const { results: guildList } = await db.prepare(`
                        SELECT g.id, g.name, g.tag, g.leader, g.level, g.exp, g.announcement,
                               (SELECT COUNT(*) FROM guild_members gm WHERE gm.guild_id = g.id) AS member_count
                        FROM guilds g
                        ORDER BY g.level DESC, g.exp DESC, g.id ASC
                        LIMIT 30
                    `).all();

                    return new Response(JSON.stringify({
                        ok: true,
                        myMembership,
                        myGuild,
                        members,
                        messages,
                        guildBoss,
                        guilds: guildList || []
                    }), {
                        status: 200,
                        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
                    });
                }

                if (request.method === "POST") {
                    const body = await request.json();
                    const action = String(body.action || "");
                    const me = String(body.username || "").trim();
                    if (!me) return jsonResponse({ ok: false, error: "Thiếu tài khoản!" }, 400);

                    if (action === "create") {
                        const name = String(body.name || "").trim().slice(0, 20);
                        const tag = String(body.tag || "").trim().toUpperCase().slice(0, 4);
                        if (name.length < 3) return jsonResponse({ ok: false, error: "Tên Bang Hội phải từ 3-20 ký tự!" }, 400);
                        if (tag.length < 2) return jsonResponse({ ok: false, error: "Huy hiệu Bang phải từ 2-4 ký tự!" }, 400);

                        const already = await db.prepare("SELECT guild_id FROM guild_members WHERE LOWER(username) = LOWER(?)")
                            .bind(me).first();
                        if (already) return jsonResponse({ ok: false, error: "Bạn đã thuộc một Bang Hội khác rồi!" }, 400);

                        const dupName = await db.prepare("SELECT id FROM guilds WHERE LOWER(name) = LOWER(?)")
                            .bind(name).first();
                        if (dupName) return jsonResponse({ ok: false, error: "Tên Bang Hội này đã tồn tại!" }, 409);

                        const now = Date.now();
                        const res = await db.prepare(
                            "INSERT INTO guilds (name, tag, leader, level, exp, coins_fund, created_at) VALUES (?, ?, ?, 1, 0, 0, ?)"
                        ).bind(name, tag, me, now).run();
                        const guildId = res.meta?.last_row_id;

                        await db.prepare(
                            "INSERT INTO guild_members (username, guild_id, role, contribution, joined_at) VALUES (?, ?, 'leader', 500, ?)"
                        ).bind(me, guildId, now).run();

                        await db.prepare(
                            "INSERT INTO guild_chat (guild_id, sender, text, created_at) VALUES (?, '📢 HỆ THỐNG', ?, ?)"
                        ).bind(guildId, `Thợ Săn [${me}] đã sáng lập Bang Hội [${tag}] ${name}!`, now).run();

                        return jsonResponse({ ok: true, guildId });
                    }

                    if (action === "join") {
                        const guildId = Number(body.guildId);
                        const already = await db.prepare("SELECT guild_id FROM guild_members WHERE LOWER(username) = LOWER(?)")
                            .bind(me).first();
                        if (already) return jsonResponse({ ok: false, error: "Bạn đã ở trong một Bang Hội rồi!" }, 400);

                        const guild = await db.prepare("SELECT id, level FROM guilds WHERE id = ?").bind(guildId).first();
                        if (!guild) return jsonResponse({ ok: false, error: "Không tìm thấy Bang Hội!" }, 404);

                        const cntRow = await db.prepare("SELECT COUNT(*) as c FROM guild_members WHERE guild_id = ?")
                            .bind(guildId).first();
                        const maxMembers = 15 + ((guild.level || 1) - 1) * 5;
                        if ((cntRow?.c || 0) >= maxMembers) {
                            return jsonResponse({ ok: false, error: `Bang Hội đã đủ thành viên (${maxMembers}/${maxMembers})!` }, 400);
                        }

                        const now = Date.now();
                        await db.prepare(
                            "INSERT INTO guild_members (username, guild_id, role, contribution, joined_at) VALUES (?, ?, 'member', 0, ?)"
                        ).bind(me, guildId, now).run();

                        await db.prepare(
                            "INSERT INTO guild_chat (guild_id, sender, text, created_at) VALUES (?, '📢 HỆ THỐNG', ?, ?)"
                        ).bind(guildId, `Chào mừng [${me}] gia nhập Bang Hội!`, now).run();

                        return jsonResponse({ ok: true });
                    }

                    if (action === "leave") {
                        const mem = await db.prepare("SELECT guild_id, role FROM guild_members WHERE LOWER(username) = LOWER(?)")
                            .bind(me).first();
                        if (!mem) return jsonResponse({ ok: false, error: "Bạn chưa vào Bang Hội nào!" }, 400);

                        if (mem.role === "leader") {
                            const nextMember = await db.prepare(
                                "SELECT username FROM guild_members WHERE guild_id = ? AND LOWER(username) != LOWER(?) ORDER BY contribution DESC LIMIT 1"
                            ).bind(mem.guild_id, me).first();
                            if (nextMember) {
                                await db.prepare("UPDATE guilds SET leader = ? WHERE id = ?").bind(nextMember.username, mem.guild_id).run();
                                await db.prepare("UPDATE guild_members SET role = 'leader' WHERE username = ?").bind(nextMember.username).run();
                            } else {
                                await db.prepare("DELETE FROM guilds WHERE id = ?").bind(mem.guild_id).run();
                                await db.prepare("DELETE FROM guild_chat WHERE guild_id = ?").bind(mem.guild_id).run();
                                await db.prepare("DELETE FROM guild_boss WHERE guild_id = ?").bind(mem.guild_id).run();
                            }
                        }
                        await db.prepare("DELETE FROM guild_members WHERE LOWER(username) = LOWER(?)").bind(me).run();
                        return jsonResponse({ ok: true });
                    }

                    if (action === "donate") {
                        const mem = await db.prepare("SELECT guild_id FROM guild_members WHERE LOWER(username) = LOWER(?)")
                            .bind(me).first();
                        if (!mem) return jsonResponse({ ok: false, error: "Bạn chưa gia nhập Bang Hội!" }, 400);

                        const expGain = Math.max(10, Number(body.expGain) || 100);
                        const goldAdd = Math.max(0, Number(body.goldAdd) || 0);
                        const guild = await db.prepare("SELECT level, exp, coins_fund FROM guilds WHERE id = ?")
                            .bind(mem.guild_id).first();
                        if (!guild) return jsonResponse({ ok: false, error: "Không tìm thấy Bang Hội!" }, 404);

                        let newLevel = guild.level || 1;
                        let newExp = (guild.exp || 0) + expGain;
                        let reqExp = newLevel * 1000;
                        while (newExp >= reqExp && newLevel < 10) {
                            newExp -= reqExp;
                            newLevel++;
                            reqExp = newLevel * 1000;
                        }

                        await db.prepare("UPDATE guilds SET level = ?, exp = ?, coins_fund = ? WHERE id = ?")
                            .bind(newLevel, newExp, (guild.coins_fund || 0) + goldAdd, mem.guild_id).run();
                        await db.prepare("UPDATE guild_members SET contribution = contribution + ? WHERE LOWER(username) = LOWER(?)")
                            .bind(expGain, me).run();

                        return jsonResponse({ ok: true, level: newLevel, exp: newExp });
                    }

                    if (action === "chat") {
                        const mem = await db.prepare("SELECT guild_id FROM guild_members WHERE LOWER(username) = LOWER(?)")
                            .bind(me).first();
                        if (!mem) return jsonResponse({ ok: false, error: "Bạn chưa gia nhập Bang Hội!" }, 400);

                        const text = String(body.text || "").trim().slice(0, 160);
                        if (!text) return jsonResponse({ ok: false, error: "Tin nhắn trống!" }, 400);

                        await db.prepare(
                            "INSERT INTO guild_chat (guild_id, sender, text, created_at) VALUES (?, ?, ?, ?)"
                        ).bind(mem.guild_id, me, text, Date.now()).run();
                        return jsonResponse({ ok: true });
                    }

                    if (action === "announcement") {
                        const mem = await db.prepare("SELECT guild_id, role FROM guild_members WHERE LOWER(username) = LOWER(?)")
                            .bind(me).first();
                        if (!mem || mem.role !== "leader") {
                            return jsonResponse({ ok: false, error: "Chỉ Bang Chủ mới có quyền sửa thông báo!" }, 403);
                        }
                        const text = String(body.text || "").trim().slice(0, 140);
                        await db.prepare("UPDATE guilds SET announcement = ? WHERE id = ?").bind(text, mem.guild_id).run();
                        return jsonResponse({ ok: true });
                    }

                    if (action === "boss_damage") {
                        const mem = await db.prepare("SELECT guild_id FROM guild_members WHERE LOWER(username) = LOWER(?)")
                            .bind(me).first();
                        if (!mem) return jsonResponse({ ok: false, error: "Bạn chưa gia nhập Bang Hội!" }, 400);

                        const dmg = Math.max(1, Math.floor(Number(body.damage) || 0));
                        const boss = await db.prepare("SELECT * FROM guild_boss WHERE guild_id = ?")
                            .bind(mem.guild_id).first();
                        if (!boss || boss.defeated) {
                            return jsonResponse({ ok: true, alreadyDefeated: true });
                        }

                        const nextHp = Math.max(0, (boss.hp || 0) - dmg);
                        const isKilled = nextHp <= 0 ? 1 : 0;
                        await db.prepare("UPDATE guild_boss SET hp = ?, defeated = ?, updated_at = ? WHERE guild_id = ?")
                            .bind(nextHp, isKilled, Date.now(), mem.guild_id).run();

                        await db.prepare("UPDATE guild_members SET contribution = contribution + ? WHERE LOWER(username) = LOWER(?)")
                            .bind(Math.max(10, Math.floor(dmg / 10)), me).run();

                        if (isKilled) {
                            await db.prepare(
                                "INSERT INTO guild_chat (guild_id, sender, text, created_at) VALUES (?, '🔥 BOSS BANG', ?, ?)"
                            ).bind(mem.guild_id, `🎉 [${me}] đã tung đòn kết liễu hạ gục Boss Bang Hội tuần này!`, Date.now()).run();
                        }

                        return jsonResponse({ ok: true, hp: nextHp, defeated: !!isKilled });
                    }

                    return jsonResponse({ ok: false, error: "Lệnh Bang Hội không hợp lệ!" }, 400);
                }
            } catch (err) {
                return jsonResponse({ ok: false, error: "Lỗi Guild API: " + err.message }, 500);
            }
        }

        // ==========================================
        // API 10: CHỢ GIAO DỊCH / ĐẤU GIÁ NGƯỜI CHƠI (/api/market-p2p)
        // ==========================================
        if (url.pathname === "/api/market-p2p") {
            try {
                if (!db) return jsonResponse({ ok: false, error: "Chưa kết nối D1!" }, 500);

                await db.batch([
                    db.prepare(`
                        CREATE TABLE IF NOT EXISTS market_listings (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            seller TEXT NOT NULL,
                            item_type TEXT NOT NULL,
                            item_name TEXT NOT NULL,
                            item_json TEXT NOT NULL,
                            price INTEGER NOT NULL,
                            currency TEXT NOT NULL DEFAULT 'diamonds',
                            status TEXT NOT NULL DEFAULT 'active',
                            buyer TEXT DEFAULT '',
                            created_at INTEGER NOT NULL
                        )
                    `),
                    db.prepare(`
                        CREATE TABLE IF NOT EXISTS market_payouts (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            username TEXT NOT NULL,
                            coins INTEGER NOT NULL DEFAULT 0,
                            diamonds INTEGER NOT NULL DEFAULT 0,
                            note TEXT DEFAULT '',
                            claimed INTEGER NOT NULL DEFAULT 0,
                            created_at INTEGER NOT NULL
                        )
                    `),
                    db.prepare(`CREATE INDEX IF NOT EXISTS idx_mkt_status ON market_listings(status, id)`),
                    db.prepare(`CREATE INDEX IF NOT EXISTS idx_mkt_payout ON market_payouts(username, claimed)`)
                ]);

                if (request.method === "GET") {
                    const me = String(url.searchParams.get("u") || "").trim();
                    const { results: activeRows } = await db.prepare(
                        "SELECT id, seller, item_type, item_name, item_json, price, currency, created_at FROM market_listings WHERE status = 'active' ORDER BY id DESC LIMIT 50"
                    ).all();

                    let payouts = [];
                    if (me) {
                        const { results: payRows } = await db.prepare(
                            "SELECT id, coins, diamonds, note, created_at FROM market_payouts WHERE LOWER(username) = LOWER(?) AND claimed = 0 ORDER BY id ASC LIMIT 30"
                        ).bind(me).all();
                        payouts = payRows || [];
                    }

                    return new Response(JSON.stringify({
                        ok: true,
                        listings: activeRows || [],
                        payouts
                    }), {
                        status: 200,
                        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
                    });
                }

                if (request.method === "POST") {
                    const body = await request.json();
                    const action = String(body.action || "");
                    const me = String(body.username || "").trim();
                    if (!me) return jsonResponse({ ok: false, error: "Thiếu tài khoản!" }, 400);

                    if (action === "list") {
                        const itemType = String(body.itemType || "");
                        const itemName = String(body.itemName || "").slice(0, 60);
                        const itemJson = JSON.stringify(body.itemData || {});
                        const currency = body.currency === "coins" ? "coins" : "diamonds";
                        const price = Math.floor(Number(body.price) || 0);

                        const minPrice = currency === "diamonds" ? 5 : 100;
                        const maxPrice = currency === "diamonds" ? 50000 : 5000000;
                        if (price < minPrice || price > maxPrice) {
                            return jsonResponse({ ok: false, error: `Giá rao bán phải từ ${minPrice} đến ${maxPrice}!` }, 400);
                        }

                        const countRow = await db.prepare(
                            "SELECT COUNT(*) as c FROM market_listings WHERE LOWER(seller) = LOWER(?) AND status = 'active'"
                        ).bind(me).first();
                        if ((countRow?.c || 0) >= 8) {
                            return jsonResponse({ ok: false, error: "Bạn chỉ được treo tối đa 8 vật phẩm cùng lúc!" }, 400);
                        }

                        await db.prepare(`
                            INSERT INTO market_listings (seller, item_type, item_name, item_json, price, currency, status, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
                        `).bind(me, itemType, itemName, itemJson, price, currency, Date.now()).run();

                        return jsonResponse({ ok: true });
                    }

                    if (action === "buy") {
                        const listingId = Number(body.listingId);
                        const item = await db.prepare(
                            "SELECT * FROM market_listings WHERE id = ? AND status = 'active'"
                        ).bind(listingId).first();
                        if (!item) {
                            return jsonResponse({ ok: false, error: "Vật phẩm đã được người khác mua hoặc vừa bị gỡ!" }, 404);
                        }
                        if (item.seller.toLowerCase() === me.toLowerCase()) {
                            return jsonResponse({ ok: false, error: "Không thể tự mua vật phẩm của chính mình!" }, 400);
                        }

                        const now = Date.now();
                        await db.prepare(
                            "UPDATE market_listings SET status = 'sold', buyer = ? WHERE id = ?"
                        ).bind(me, listingId).run();

                        // Thu phí sàn 10% chống lạm phát
                        const netAmount = Math.max(1, Math.floor(item.price * 0.90));
                        const gainCoins = item.currency === "coins" ? netAmount : 0;
                        const gainDiamonds = item.currency === "diamonds" ? netAmount : 0;

                        await db.prepare(`
                            INSERT INTO market_payouts (username, coins, diamonds, note, claimed, created_at)
                            VALUES (?, ?, ?, ?, 0, ?)
                        `).bind(
                            item.seller,
                            gainCoins,
                            gainDiamonds,
                            `[${me}] đã mua [${item.item_name}] (Đã trừ 10% phí sàn)`,
                            now
                        ).run();

                        return jsonResponse({ ok: true, listing: item });
                    }

                    if (action === "cancel") {
                        const listingId = Number(body.listingId);
                        const item = await db.prepare(
                            "SELECT * FROM market_listings WHERE id = ? AND status = 'active' AND LOWER(seller) = LOWER(?)"
                        ).bind(listingId, me).first();
                        if (!item) {
                            return jsonResponse({ ok: false, error: "Không thể hủy vật phẩm này!" }, 404);
                        }
                        await db.prepare("UPDATE market_listings SET status = 'cancelled' WHERE id = ?")
                            .bind(listingId).run();
                        return jsonResponse({ ok: true, listing: item });
                    }

                    if (action === "claim_payouts") {
                        const ids = Array.isArray(body.payoutIds) ? body.payoutIds.map(Number).filter(n => n > 0) : [];
                        for (const pid of ids) {
                            await db.prepare(
                                "UPDATE market_payouts SET claimed = 1 WHERE id = ? AND LOWER(username) = LOWER(?)"
                            ).bind(pid, me).run();
                        }
                        return jsonResponse({ ok: true });
                    }

                    return jsonResponse({ ok: false, error: "Lệnh Chợ Người Chơi không hợp lệ!" }, 400);
                }
            } catch (err) {
                return jsonResponse({ ok: false, error: "Lỗi Market P2P API: " + err.message }, 500);
            }
        }

        // Lớp bảo vệ tự động định tuyến an toàn cho tài nguyên WebP (Assets Fallback Routing)
        if (url.pathname.endsWith('.webp') && !url.pathname.includes('/assets') && env.ASSETS) {
            const filename = url.pathname.replace(/^\/+/, '');
            const primaryRes = await env.ASSETS.fetch(request);
            if (primaryRes.status === 200) return primaryRes;

            const assetUrl = new URL(`/assets/${filename}`, request.url);
            const assetRes = await env.ASSETS.fetch(new Request(assetUrl, request));
            if (assetRes.status === 200) return assetRes;

            const bossUrl = new URL(`/assets_boss/${filename}`, request.url);
            const bossRes = await env.ASSETS.fetch(new Request(bossUrl, request));
            if (bossRes.status === 200) return bossRes;

            const gearUrl = new URL(`/assets_gear/${filename}`, request.url);
            const gearRes = await env.ASSETS.fetch(new Request(gearUrl, request));
            if (gearRes.status === 200) return gearRes;

            return primaryRes;
        }

        return env.ASSETS.fetch(request);
    }
};
