function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8" }
    });
}

export async function onRequestPost({ request, env }) {
    try {
        const db = env.DB;
        if (!db) {
            return jsonResponse({ ok: false, error: "Chưa liên kết D1 Database (biến DB) trong Cloudflare Pages!" }, 500);
        }

        const body = await request.json();
        const { action, username, pin, gender, sessionToken, gameData } = body;

        if (!username || typeof username !== "string") {
            return jsonResponse({ ok: false, error: "Thiếu ID Game!" }, 400);
        }
        const cleanUser = username.trim();

        // 1. ĐĂNG KÝ TÀI KHOẢN MỚI
        if (action === "register") {
            if (cleanUser.length < 3 || cleanUser.length > 16) {
                return jsonResponse({ ok: false, error: "ID Game phải từ 3 đến 16 ký tự!" }, 400);
            }
            if (!/^\d{8}$/.test(pin || "")) {
                return jsonResponse({ ok: false, error: "Mã PIN phải gồm đúng 8 chữ số!" }, 400);
            }

            const existing = await db.prepare("SELECT username FROM players WHERE LOWER(username) = LOWER(?)")
                .bind(cleanUser)
                .first();
            if (existing) {
                return jsonResponse({ ok: false, error: "ID Game này đã có người sử dụng!" }, 409);
            }

            const newToken = crypto.randomUUID();
            const safeGender = gender === "Nữ" ? "Nữ" : "Nam";
            const now = Date.now();

            await db.prepare(
                "INSERT INTO players (username, pin, gender, session_token, game_data, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(cleanUser, pin, safeGender, newToken, JSON.stringify(gameData || {}), now).run();

            return jsonResponse({
                ok: true,
                username: cleanUser,
                gender: safeGender,
                sessionToken: newToken
            });
        }

        // 2. ĐĂNG NHẬP (CẤP TOKEN MỚI ĐỂ ĐÁ VĂNG MÁY CŨ)
        if (action === "login") {
            const player = await db.prepare("SELECT * FROM players WHERE LOWER(username) = LOWER(?)")
                .bind(cleanUser)
                .first();
            if (!player) {
                return jsonResponse({ ok: false, error: "Không tìm thấy ID Game này!" }, 404);
            }
            if (player.pin !== pin) {
                return jsonResponse({ ok: false, error: "Sai mã PIN bảo mật!" }, 401);
            }

            const newToken = crypto.randomUUID();
            await db.prepare("UPDATE players SET session_token = ?, updated_at = ? WHERE username = ?")
                .bind(newToken, Date.now(), player.username)
                .run();

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

        // 3. KIỂM TRA PHIÊN ĐĂNG NHẬP (PHÁT HIỆN ĐĂNG NHẬP Ở MÁY KHÁC)
        if (action === "verify_session") {
            const player = await db.prepare("SELECT session_token FROM players WHERE username = ?")
                .bind(cleanUser)
                .first();
            if (!player || player.session_token !== sessionToken) {
                return jsonResponse({ ok: false, code: "SESSION_EXPIRED" });
            }
            return jsonResponse({ ok: true });
        }

        // 4. ĐỒNG BỘ DỮ LIỆU LÊN MÂY
        if (action === "sync") {
            const player = await db.prepare("SELECT pin, session_token FROM players WHERE username = ?")
                .bind(cleanUser)
                .first();
            if (!player) {
                return jsonResponse({ ok: false, error: "Tài khoản không tồn tại!" }, 404);
            }
            if (player.session_token !== sessionToken) {
                return jsonResponse({ ok: false, code: "SESSION_EXPIRED" });
            }
            if (player.pin !== pin) {
                return jsonResponse({ ok: false, error: "Sai mã PIN!" }, 401);
            }

            await db.prepare("UPDATE players SET game_data = ?, updated_at = ? WHERE username = ?")
                .bind(JSON.stringify(gameData || {}), Date.now(), cleanUser)
                .run();

            return jsonResponse({ ok: true });
        }

        return jsonResponse({ ok: false, error: "Hành động không hợp lệ!" }, 400);
    } catch (err) {
        return jsonResponse({ ok: false, error: "Lỗi server: " + err.message }, 500);
    }
}