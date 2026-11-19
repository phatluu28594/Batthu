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
                        "SELECT game_data FROM players WHERE LOWER(username) = LOWER(?) AND pin = ?"
                    ).bind(cleanUser, pin).first();

                    if (!existing) {
                        return jsonResponse({ ok: false, error: "Sai tài khoản hoặc mã PIN!" }, 401);
                    }

                    const saveDataStr = JSON.stringify(gameData || {});
                    if (existing.game_data === saveDataStr) {
                        return jsonResponse({ ok: true, skipped: true });
                    }

                    await db.prepare(
                        "UPDATE players SET game_data = ?, updated_at = ? WHERE LOWER(username) = LOWER(?) AND pin = ?"
                    ).bind(saveDataStr, Date.now(), cleanUser, pin).run();

                    return jsonResponse({ ok: true });
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

                const activeThreshold = now - 25000;
                const { results } = await db.prepare(`
                    SELECT username, gender, lat, lng, dir, state, lead_pet
                    FROM player_presence
                    WHERE LOWER(username) != LOWER(?) AND state NOT LIKE 'wb:%' AND updated_at >= ?
                    LIMIT 100
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

                const nearbyPlayers = (results || []).filter(p => {
                    if (typeof body.lat !== "number" || typeof body.lng !== "number") return false;
                    if (typeof p.lat !== "number" || typeof p.lng !== "number") return false;
                    return calcDistMeters(body.lat, body.lng, p.lat, p.lng) <= 200;
                });

                return jsonResponse({ ok: true, players: nearbyPlayers });
            } catch (err) {
                return jsonResponse({ ok: false, error: err.message }, 500);
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
        // API 8: ĐỒNG BỘ TRẠNG THÁI BOSS 3 MIỀN (/api/world-boss)
        // ==========================================
        if (url.pathname === "/api/world-boss") {
            try {
                if (!db) return jsonResponse({ ok: false, error: "Chưa kết nối D1!" }, 500);

                await db.prepare(`
                    CREATE TABLE IF NOT EXISTS world_boss_state (
                        region_key TEXT PRIMARY KEY,
                        active INTEGER NOT NULL DEFAULT 0,
                        boss_name TEXT DEFAULT '',
                        hp INTEGER DEFAULT 0,
                        max_hp INTEGER DEFAULT 0,
                        opened_by TEXT DEFAULT '',
                        updated_at INTEGER NOT NULL
                    )
                `).run();

                if (request.method === "GET") {
                    const { results } = await db.prepare(
                        "SELECT region_key, active, boss_name, hp, max_hp, opened_by, updated_at FROM world_boss_state"
                    ).all();
                    return new Response(JSON.stringify({ ok: true, bosses: results || [] }), {
                        status: 200,
                        headers: {
                            "Content-Type": "application/json; charset=utf-8",
                            "Cache-Control": "no-store, no-cache, must-revalidate"
                        }
                    });
                }

                if (request.method === "POST") {
                    const body = await request.json();

                    // Người chơi báo cáo sát thương lên Boss Thế Giới
                    if (body.action === "damage") {
                        const regionKey = String(body.regionKey || "").trim();
                        const dmg = Math.max(0, Math.floor(Number(body.damage) || 0));
                        if (regionKey && dmg > 0) {
                            const row = await db.prepare("SELECT active, hp FROM world_boss_state WHERE region_key = ?")
                                .bind(regionKey).first();
                            if (row && Number(row.active) === 1) {
                                const nextHp = Math.max(0, (Number(row.hp) || 0) - dmg);
                                const nextActive = nextHp > 0 ? 1 : 0;
                                await db.prepare("UPDATE world_boss_state SET hp = ?, active = ?, updated_at = ? WHERE region_key = ?")
                                    .bind(nextHp, nextActive, Date.now(), regionKey).run();
                            }
                        }
                        const { results } = await db.prepare(
                            "SELECT region_key, active, boss_name, hp, max_hp, opened_by, updated_at FROM world_boss_state"
                        ).all();
                        return jsonResponse({ ok: true, bosses: results || [] });
                    }

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
                    for (const r of regions) {
                        const key = String(r.regionKey || "").trim();
                        if (!key) continue;
                        await db.prepare(`
                            INSERT INTO world_boss_state (region_key, active, boss_name, hp, max_hp, opened_by, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT(region_key) DO UPDATE SET
                                active = excluded.active,
                                boss_name = excluded.boss_name,
                                hp = excluded.hp,
                                max_hp = excluded.max_hp,
                                opened_by = excluded.opened_by,
                                updated_at = excluded.updated_at
                        `).bind(
                            key,
                            r.active ? 1 : 0,
                            String(r.bossName || ""),
                            Number(r.hp) || 0,
                            Number(r.maxHp) || 0,
                            adminUser,
                            now
                        ).run();
                    }

                    const { results } = await db.prepare(
                        "SELECT region_key, active, boss_name, hp, max_hp, opened_by, updated_at FROM world_boss_state"
                    ).all();
                    return jsonResponse({ ok: true, bosses: results || [] });
                }
            } catch (err) {
                return jsonResponse({ ok: false, error: "Lỗi World Boss API: " + err.message }, 500);
            }
        }

        return env.ASSETS.fetch(request);
    }
};
