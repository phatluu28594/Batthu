function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8" }
    });
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

                // Tự động bổ sung cột nếu bảng players được tạo từ phiên bản cũ bị thiếu cột
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
                    if (!/^\d{8}$/.test(pin || "")) {
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
                    const petInfo = String(body.petInfo || "").slice(0, 60);
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
        // API 3: ĐỒNG BỘ VỊ TRÍ NGƯỜI CHƠI TRÊN BẢN ĐỒ (/api/presence)
        // ==========================================
        if (url.pathname === "/api/presence" && request.method === "POST") {
            try {
                const body = await request.json();
                const now = Date.now();
                const username = String(body.username || "").trim();

                if (body.action === "offline" && username) {
                    await db.prepare("DELETE FROM player_presence WHERE username = ?")
                        .bind(username).run();
                    return jsonResponse({ ok: true });
                }

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
                    WHERE username != ? AND updated_at >= ?
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
        // API 6: BẢNG ĐIỀU KHIỂN QUẢN TRỊ VIÊN (/api/admin)
        // ==========================================
        if (url.pathname === "/api/admin" && request.method === "POST") {
            try {
                if (!db) return jsonResponse({ ok: false, error: "Chưa kết nối D1!" }, 500);

                const body = await request.json();
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

                const targetRow = await db.prepare("SELECT username, game_data FROM players WHERE LOWER(username) = LOWER(?)")
                    .bind(targetUser).first();
                if (!targetRow) {
                    return jsonResponse({
