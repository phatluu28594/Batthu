function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json; charset=utf-8" }
    });
}

// LẤY 25 TIN NHẮN MỚI NHẤT
export async function onRequestGet({ env }) {
    try {
        const db = env.DB;
        if (!db) return jsonResponse({ ok: false, error: "Chưa kết nối D1!" }, 500);

        const { results } = await db.prepare(
            "SELECT id, sender, gender, pet_info, text, is_system, created_at FROM world_chat ORDER BY id DESC LIMIT 25"
        ).all();

        return jsonResponse({
            ok: true,
            messages: (results || []).reverse()
        });
    } catch (err) {
        return jsonResponse({ ok: false, error: err.message }, 500);
    }
}

// GỬI TIN NHẮN MỚI & TỰ ĐỘNG DỌN TIN CŨ (GIỮ TỐI ĐA 100 TIN ĐỂ NHẸ DB)
export async function onRequestPost({ request, env }) {
    try {
        const db = env.DB;
        if (!db) return jsonResponse({ ok: false, error: "Chưa kết nối D1!" }, 500);

        const body = await request.json();
        const sender = String(body.sender || "Thợ Săn Ẩn Danh").slice(0, 32);
        const gender = body.gender === "Nữ" ? "Nữ" : "Nam";
        const petInfo = String(body.petInfo || "").slice(0, 60);
        const text = String(body.text || "").trim().slice(0, 180);
        const isSystem = body.isSystem ? 1 : 0;

        if (!text) {
            return jsonResponse({ ok: false, error: "Nội dung trống!" }, 400);
        }

        await db.prepare(
            "INSERT INTO world_chat (sender, gender, pet_info, text, is_system, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(sender, gender, petInfo, text, isSystem, Date.now()).run();

        // Xóa bớt các tin nhắn quá cũ ngoài top 100
        await db.prepare(
            "DELETE FROM world_chat WHERE id NOT IN (SELECT id FROM world_chat ORDER BY id DESC LIMIT 100)"
        ).run();

        return jsonResponse({ ok: true });
    } catch (err) {
        return jsonResponse({ ok: false, error: err.message }, 500);
    }
}