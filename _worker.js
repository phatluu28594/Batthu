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
        // 1. API TÀI KHOẢN (/api/auth)
        // ==========================================
        if (url.pathname === "/api/auth" && request.method === "POST") {
            try {
                if (!db) return jsonResponse({ ok: false, error: "Chưa kết nối D1 Database (DB)!" }, 500);
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
                    const player = await db.prepare("SELECT session_token FROM players WHERE username = ?").bind(cleanUser).first();
                    if (!player || player.session_token !== sessionToken) {
                        return jsonResponse({ ok: false, code: "SESSION_EXPIRED" });
                    }
                    return jsonResponse({ ok: true });
                }

               if (action === "sync") {
                    const existing = await db.prepare(
                        "SELECT save_data FROM players WHERE LOWER(username) = LOWER(?) AND pin = ?"
                    ).bind(username, pin).first();
                
                    if (!existing) {
                        return jsonResponse({ ok: false, error: "Sai tài khoản hoặc mã PIN!" }, 401);
                    }
                
                    // Nếu dữ liệu giống hệt bản cũ thì không cần tốn 1 lượt ghi (Write) vào D1
                    if (existing.save_data === saveDataStr) {
                        return jsonResponse({ ok: true, skipped: true });
                    }
                
                    await db.prepare(
                        "UPDATE players SET save_data = ?, updated_at = ? WHERE LOWER(username) = LOWER(?) AND pin = ?"
                    ).bind(saveDataStr, Date.now(), username, pin).run();
                
                    return jsonResponse({ ok: true });
                }

                return jsonResponse({ ok: false, error: "Hành động không hợp lệ!" }, 400);
            } catch (err) {
                return jsonResponse({ ok: false, error: "Lỗi server: " + err.message }, 500);
            }
        }

        // ==========================================
        // 2. API KÊNH CHAT THẾ GIỚI (/api/chat)
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

                    // Chỉ dọn tin cũ khoảng 10% số lần gửi để tiết kiệm 50% lượt ghi D1
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

                // Nếu người chơi thoát game / tắt tab / đăng xuất -> xóa ngay khỏi bản đồ
                if (body.action === "offline" && username) {
                    await env.DB.prepare("DELETE FROM player_presence WHERE username = ?")
                        .bind(username).run();
                    return Response.json({ ok: true });
                }

                if (username && typeof body.lat === "number" && typeof body.lng === "number") {
                    await env.DB.prepare(`
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

                // Giảm xuống 18 giây (18000ms) để rớt mạng cũng biến mất cực nhanh
                const activeThreshold = now - 18000;
                const { results } = await env.DB.prepare(`
                    SELECT username, gender, lat, lng, dir, state, lead_pet, updated_at
                    FROM player_presence
                    WHERE updated_at >= ? AND username != ?
                    ORDER BY updated_at DESC
                    LIMIT 30
                `).bind(activeThreshold, username).all();

                if (Math.random() < 0.1) {
                    await env.DB.prepare("DELETE FROM player_presence WHERE updated_at < ?")
                        .bind(now - 600000).run();
                }

                return Response.json({ ok: true, players: results || [] });
            } catch (err) {
                return Response.json({ ok: false, error: err.message }, { status: 500 });
            }
        }

        // ==========================================
        // API 4: NHẮN TIN RIÊNG & HỘP THƯ ĐẾN (/api/pm)
        // ==========================================
        if (url.pathname === "/api/pm") {
            try {
                if (request.method === "GET") {
                    const mode = url.searchParams.get("mode");

                    // Lấy danh sách tin nhắn gửi tới người chơi (kiểm tra tin mới + hộp thư)
                    if (mode === "inbox") {
                        const me = String(url.searchParams.get("u") || "").trim();
                        if (!me) return Response.json({ ok: false }, { status: 400 });

                        const { results } = await env.DB.prepare(`
                            SELECT id, sender, receiver, text, created_at
                            FROM private_messages
                            WHERE receiver = ? OR sender = ?
                            ORDER BY id DESC
                            LIMIT 30
                        `).bind(me, me).all();

                        return Response.json({ ok: true, messages: results || [] });
                    }

                    const user1 = String(url.searchParams.get("u1") || "").trim();
                    const user2 = String(url.searchParams.get("u2") || "").trim();
                    if (!user1 || !user2) return Response.json({ ok: false, error: "Thiếu người dùng" }, { status: 400 });

                    const { results } = await env.DB.prepare(`
                        SELECT id, sender, receiver, text, created_at
                        FROM private_messages
                        WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)
                        ORDER BY id DESC
                        LIMIT 40
                    `).bind(user1, user2, user2, user1).all();

                    return Response.json({ ok: true, messages: (results || []).reverse() });
                }

                if (request.method === "POST") {
                    const body = await request.json();
                    const sender = String(body.sender || "").trim();
                    const receiver = String(body.receiver || "").trim();
                    const text = String(body.text || "").trim().slice(0, 200);

                    if (!sender || !receiver || !text) {
                        return Response.json({ ok: false, error: "Nội dung không hợp lệ" }, { status: 400 });
                    }

                    const now = Date.now();
                    await env.DB.prepare(`
                        INSERT INTO private_messages (sender, receiver, text, created_at)
                        VALUES (?, ?, ?, ?)
                    `).bind(sender, receiver, text, now).run();

                    if (Math.random() < 0.1) {
                        await env.DB.prepare("DELETE FROM private_messages WHERE created_at < ?")
                            .bind(now - 86400000).run();
                    }

                    return Response.json({ ok: true });
                }
            } catch (err) {
                return Response.json({ ok: false, error: err.message }, { status: 500 });
            }
        }
        return env.ASSETS.fetch(request);
    }
};
