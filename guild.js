// ============================================================================
// BẮT THÚ VƯƠNG - MODULE BANG HỘI / GIA TỘC THỢ SĂN (guild.js)
// Hỗ trợ: Chế độ Tự Duyệt / Chờ Duyệt, Tab Đơn Xin Vào Hội, Phó Hội (tối đa 2 người)
// ============================================================================

(function () {
    let activeGuildTab = 'hall';
    let guildPollTimer = null;

    function getMyUser() {
        return (localStorage.getItem('ar_cloud_user') || '').trim();
    }

    window.getGuildBonusPercent = function () {
        const lv = Number(window._myGuildLevel) || 0;
        return lv > 0 ? lv * 2 : 0; // +2% vàng & tỷ lệ bắt thú mỗi cấp Bang Hội
    };

    window.openGuildModal = async function (tab = activeGuildTab) {
        activeGuildTab = tab;
        const me = getMyUser();
        if (!me) {
            alert('⚠️ Bạn cần đăng nhập Tài Khoản Mây (☁️ Nick) để tham gia Bang Hội!');
            if (typeof openCloudAccountModal === 'function') openCloudAccountModal();
            return;
        }

        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;
        modal.classList.remove('hidden');

        content.innerHTML = `<div class="text-center py-8 text-amber-300 font-bold animate-pulse">🏰 Đang kết nối dữ liệu Bang Hội...</div>`;

        await refreshGuildModalData();
    };

    async function refreshGuildModalData() {
        const me = getMyUser();
        const content = document.getElementById('modal-content');
        if (!me || !content) return;

        let data = { ok: false };
        try {
            const res = await fetch('/api/guild?u=' + encodeURIComponent(me) + '&t=' + Date.now(), { cache: 'no-store' });
            data = await res.json();
        } catch (e) {}

        if (!data.ok) {
            content.innerHTML = `
                <div class="flex justify-between items-center mb-3">
                    <h3 class="font-bold text-base text-red-400">🏰 Bang Hội Thợ Săn</h3>
                    <button onclick="closeGuildModal()" class="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full font-bold text-sm cursor-pointer">✕</button>
                </div>
                <div class="text-center text-xs text-zinc-400 py-6">Không kết nối được máy chủ Bang Hội!</div>`;
            return;
        }

        // CHƯA CÓ BANG HỘI -> HIỆN DANH SÁCH GIA NHẬP & FORM LẬP BANG (CÓ CHECK TỰ DUYỆT)
        if (!data.myGuild || !data.myMembership) {
            window._myGuildLevel = 0;
            const pendingSet = new Set((data.myPendingGuildIds || []).map(Number));

            const listRows = (data.guilds || []).map(g => {
                const maxMem = 15 + ((g.level || 1) - 1) * 5;
                const isAuto = Number(g.auto_approve) === 1;
                const isPending = pendingSet.has(Number(g.id));

                const modeBadge = isAuto
                    ? `<span class="text-[9px] bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-1.5 py-0.5 rounded font-bold">⚡ Tự duyệt</span>`
                    : `<span class="text-[9px] bg-amber-950/80 border border-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded font-bold">🔒 Cần duyệt</span>`;

                let actionBtn = '';
                if (isPending) {
                    actionBtn = `
                    <div class="flex flex-col items-end gap-1 shrink-0">
                        <span class="bg-amber-900/70 border border-amber-400/50 text-amber-200 px-2.5 py-1 rounded-lg text-[10px] font-extrabold">⏳ Chờ duyệt</span>
                        <button onclick="cancelGuildJoinRequest(${g.id})" class="text-[10px] text-rose-400 underline cursor-pointer font-bold">Hủy đơn</button>
                    </div>`;
                } else if (isAuto) {
                    actionBtn = `
                    <button onclick="joinGuildById(${g.id})" class="bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg text-[11px] font-extrabold text-white cursor-pointer shrink-0 shadow">
                        ⚡ Vào Luôn
                    </button>`;
                } else {
                    actionBtn = `
                    <button onclick="joinGuildById(${g.id})" class="bg-sky-600 hover:bg-sky-500 px-3 py-1.5 rounded-lg text-[11px] font-extrabold text-white cursor-pointer shrink-0 shadow">
                        📨 Xin Vào
                    </button>`;
                }

                return `
                <div class="bg-zinc-800/90 border border-zinc-700 p-2.5 rounded-xl flex items-center justify-between gap-2">
                    <div class="min-w-0">
                        <div class="text-xs font-black text-yellow-300 flex items-center gap-1 flex-wrap">
                            <span class="bg-amber-600 text-black px-1.5 py-0.5 rounded text-[10px]">[${g.tag}]</span>
                            <span class="truncate">${g.name}</span>
                            <span class="text-emerald-400 text-[10px]">Lv.${g.level}</span>
                            ${modeBadge}
                        </div>
                        <div class="text-[10px] text-zinc-400 mt-0.5">Bang chủ: ${g.leader} • Thành viên: ${g.member_count}/${maxMem}</div>
                        <div class="text-[10px] text-zinc-300 italic truncate">${g.announcement || ''}</div>
                    </div>
                    ${actionBtn}
                </div>`;
            }).join('') || `<div class="text-center text-xs text-zinc-400 py-4">Chưa có Bang Hội nào trên máy chủ. Hãy là người đầu tiên sáng lập!</div>`;

            content.innerHTML = `
            <div class="flex justify-between items-center mb-3 pb-2 border-b border-amber-500/40 shrink-0">
                <h3 class="font-black text-base text-amber-300">🏰 GIA TỘC & BANG HỘI THỢ SĂN</h3>
                <button onclick="closeGuildModal()" class="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full font-bold text-sm cursor-pointer border border-zinc-600">✕</button>
            </div>

            <!-- BỐ CỤC 2 CỘT WIDESCREEN LANDSCAPE -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0">
                <!-- CỘT TRÁI: SÁNG LẬP BANG HỘI -->
                <div class="bg-zinc-800/90 border border-amber-500/40 rounded-xl p-3 space-y-2 text-xs flex flex-col justify-between">
                    <div class="space-y-2">
                        <div class="font-extrabold text-yellow-300">✨ Sáng Lập Bang Hội Mới (Phí: 3.000🪙)</div>
                        <div class="grid grid-cols-3 gap-1.5">
                            <input id="guild-create-tag" type="text" maxlength="4" placeholder="Huy hiệu" class="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-white uppercase font-bold text-center">
                            <input id="guild-create-name" type="text" maxlength="20" placeholder="Tên Bang Hội (3-20 ký tự)" class="col-span-2 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-white">
                        </div>
                        <label class="flex items-center gap-2 bg-zinc-950/80 border border-zinc-700 rounded-lg px-2.5 py-1.5 cursor-pointer select-none">
                            <input id="guild-create-auto-approve" type="checkbox" checked class="w-4 h-4 accent-emerald-500 cursor-pointer">
                            <span class="text-[11px] text-zinc-200 font-bold">⚡ Tự duyệt vào ngay <span class="text-zinc-400 font-normal">(Bỏ tick = Chờ duyệt)</span></span>
                        </label>
                    </div>
                    <button onclick="createNewGuild()" class="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 py-2.5 rounded-xl font-black text-white cursor-pointer shadow mt-2">
                        🚩 Lập Bang Hội Ngay (-3.000🪙)
                    </button>
                </div>

                <!-- CỘT PHẢI: DANH SÁCH BANG HỘI -->
                <div class="flex flex-col bg-zinc-950/70 p-2.5 rounded-xl border border-zinc-800">
                    <div class="text-xs font-extrabold text-sky-300 mb-1.5 shrink-0">📜 Bang Hội Đang Tuyển Quân:</div>
                    <div class="space-y-2 max-h-[46vh] overflow-y-auto pr-1 no-scrollbar">${listRows}</div>
                </div>
            </div>`;
            return;
        }

        // ĐÃ Ở TRONG BANG HỘI
        const g = data.myGuild;
        const mem = data.myMembership;
        const members = data.members || [];
        const requests = data.requests || [];
        const messages = data.messages || [];
        const boss = data.guildBoss || { boss_name: 'Thần Thú Bang Hội', hp: 40000, max_hp: 40000, defeated: 0 };
        window._myGuildLevel = g.level || 1;

        const reqExp = (g.level || 1) * 1000;
        const expPct = Math.min(100, Math.floor(((g.exp || 0) / reqExp) * 100));
        const bonusPct = (g.level || 1) * 2;
        const isLeader = mem.role === 'leader';
        const isVice = mem.role === 'vice';
        const canManage = isLeader || isVice;
        const isAutoApprove = Number(g.auto_approve) === 1;
        const viceCount = members.filter(m => m.role === 'vice').length;

        const tabs = [
            { key: 'hall',     label: '🏛️ Đại Sảnh' },
            { key: 'chat',     label: '💬 Chat' },
            { key: 'boss',     label: '👹 Boss' },
            { key: 'members',  label: `👥 Hội Viên (${members.length})` },
            { key: 'requests', label: `📋 Xin Vào (${requests.length})`, hasDot: requests.length > 0 }
        ];

        const tabBar = tabs.map(t => `
            <button onclick="activeGuildTab='${t.key}'; openGuildModal('${t.key}');"
                class="relative flex-1 py-1.5 px-1 rounded-lg text-[10px] sm:text-[11px] font-extrabold cursor-pointer transition whitespace-nowrap ${activeGuildTab === t.key ? 'bg-amber-500 text-black shadow' : 'bg-zinc-900 text-zinc-400 hover:text-white'}">
                ${t.label}
                ${t.hasDot ? `<span class="absolute -top-1 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-ping"></span>` : ''}
            </button>
        `).join('');

        let bodyHtml = '';

        if (activeGuildTab === 'hall') {
            bodyHtml = `
            <div class="bg-zinc-800/90 border border-amber-500/40 rounded-xl p-3 space-y-2.5 text-xs">
                <div class="flex justify-between items-center">
                    <span class="font-extrabold text-yellow-300">🏛️ Trụ Bang Hội Cấp ${g.level}/10</span>
                    <span class="text-[11px] text-emerald-400 font-bold">Buff Bang: +${bonusPct}% Vàng</span>
                </div>
                <div>
                    <div class="flex justify-between text-[10px] text-zinc-300 mb-1">
                        <span>Kinh nghiệm Trụ Hội:</span>
                        <span>${g.exp || 0} / ${reqExp} EXP (${expPct}%)</span>
                    </div>
                    <div class="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-700">
                        <div class="bg-gradient-to-r from-amber-500 to-yellow-300 h-full" style="width:${expPct}%"></div>
                    </div>
                </div>

                <!-- Thiết lập Tự Duyệt / Không Tự Duyệt -->
                <div class="bg-zinc-950/85 border border-zinc-700 rounded-lg p-2.5 flex items-center justify-between gap-2">
                    <div>
                        <div class="text-[11px] font-extrabold ${isAutoApprove ? 'text-emerald-300' : 'text-amber-300'}">
                            ${isAutoApprove ? '⚡ Chế độ tuyển quân: TỰ DUYỆT VÀO LUÔN' : '🔒 Chế độ tuyển quân: CHỜ CHỦ HỘI DUYỆT'}
                        </div>
                        <div class="text-[10px] text-zinc-400">
                            ${isAutoApprove ? 'Người chơi bấm xin vào sẽ gia nhập hội ngay lập tức.' : 'Người chơi xin vào sẽ nằm ở tab 📋 Xin Vào đợi duyệt.'}
                        </div>
                    </div>
                    ${canManage ? `
                        <label class="inline-flex items-center gap-1.5 bg-zinc-800 px-2.5 py-1.5 rounded-lg border border-zinc-600 cursor-pointer shrink-0">
                            <input type="checkbox" ${isAutoApprove ? 'checked' : ''} onchange="toggleGuildAutoApprove(this.checked)" class="w-4 h-4 accent-emerald-500 cursor-pointer">
                            <span class="text-[10px] font-black text-white">Tự duyệt</span>
                        </label>
                    ` : ''}
                </div>

                <div class="bg-zinc-950/80 border border-zinc-700 rounded-lg p-2 text-[11px] text-zinc-200">
                    <div class="flex justify-between items-center mb-1">
                        <span class="font-bold text-sky-300">📢 Thông báo Bang:</span>
                        ${canManage ? `<button onclick="editGuildAnnouncement()" class="text-[10px] text-amber-300 underline cursor-pointer">Sửa</button>` : ''}
                    </div>
                    <div>${g.announcement || 'Chào mừng các thành viên!'}</div>
                </div>
                <div class="grid grid-cols-2 gap-2 pt-1">
                    <button onclick="donateToGuild('gold')" class="bg-amber-600 hover:bg-amber-500 py-2 rounded-xl font-extrabold text-white cursor-pointer shadow">
                        🪙 Góp 200 Vàng (+100 EXP)
                    </button>
                    <button onclick="donateToGuild('diamond')" class="bg-cyan-600 hover:bg-cyan-500 py-2 rounded-xl font-extrabold text-white cursor-pointer shadow">
                        💎 Góp 10 KC (+300 EXP)
                    </button>
                </div>
                <div class="flex justify-between items-center pt-1 text-[11px] text-zinc-400">
                    <span>Cống hiến của bạn: <b class="text-emerald-400">${mem.contribution || 0} điểm</b></span>
                    <button onclick="leaveCurrentGuild()" class="text-rose-400 underline cursor-pointer font-bold">Rời Bang</button>
                </div>
            </div>`;
        } else if (activeGuildTab === 'chat') {
            const msgHtml = messages.map(m => {
                const isSys = m.sender.includes('HỆ THỐNG') || m.sender.includes('BOSS');
                return isSys
                    ? `<div class="text-[10px] text-amber-300 bg-amber-950/40 border border-amber-500/30 rounded px-2 py-1 font-bold">${m.text}</div>`
                    : `<div class="text-xs break-words"><b class="text-sky-300">${m.sender}:</b> <span class="text-zinc-100">${m.text}</span></div>`;
            }).join('') || `<div class="text-center text-zinc-500 text-xs py-8">Chưa có tin nhắn nào trong kênh Bang Hội!</div>`;

            bodyHtml = `
            <div class="space-y-2">
                <div id="guild-chat-list" class="h-52 overflow-y-auto bg-zinc-950/90 border border-zinc-800 rounded-xl p-2.5 space-y-1.5">
                    ${msgHtml}
                </div>
                <div class="flex gap-1.5">
                    <input id="guild-chat-input" type="text" maxlength="160"
                        onkeydown="if(event.key==='Enter'){ event.preventDefault(); sendGuildChatMessage(); }"
                        placeholder="Nhắn tin nội bộ Bang Hội..."
                        class="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-400 outline-none">
                    <button onclick="sendGuildChatMessage()" class="bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-xl text-xs font-extrabold text-white cursor-pointer">
                        Gửi
                    </button>
                </div>
            </div>`;
        } else if (activeGuildTab === 'boss') {
            const hpPct = Math.max(0, Math.min(100, Math.floor(((boss.hp || 0) / (boss.max_hp || 1)) * 100)));
            const day = new Date().getDay();
            const isWeekend = (day === 0 || day === 6);

            bodyHtml = `
            <div class="bg-zinc-800/90 border border-red-500/50 rounded-xl p-3.5 text-center space-y-2.5 text-xs">
                <div class="text-4xl">🐲🔥</div>
                <div class="font-black text-sm text-yellow-300">${boss.boss_name || 'Thần Thú Hộ Mệnh Bang Hội'}</div>
                <div class="w-full bg-zinc-950 h-4 rounded-full overflow-hidden border border-red-500/50 relative">
                    <div class="bg-gradient-to-r from-red-600 to-amber-500 h-full" style="width:${hpPct}%"></div>
                    <div class="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white">
                        ${Number(boss.hp || 0).toLocaleString()} / ${Number(boss.max_hp || 0).toLocaleString()} HP
                    </div>
                </div>
                <div class="text-[11px] text-zinc-300">
                    Sự kiện Boss Bang Hội diễn ra vào <b>Thứ 7 & Chủ Nhật</b> hằng tuần (Reset mỗi thứ 2).
                </div>
                ${boss.defeated
                    ? `<div class="bg-emerald-950/80 border border-emerald-400/60 text-emerald-300 py-2 rounded-xl font-black">🎉 Boss Bang Hội tuần này đã bị hạ gục!</div>`
                    : `<button onclick="attackGuildWeekendBoss()" class="w-full bg-gradient-to-r from-red-600 to-amber-600 hover:brightness-110 py-2.5 rounded-xl font-black text-white cursor-pointer shadow-lg">
                           ⚔️ Xuất Chiến Đánh Boss Bang (${isWeekend ? 'Đang Mở' : 'Tập Trận'})
                       </button>`
                }
            </div>`;
        } else if (activeGuildTab === 'members') {
            const headerNote = `
            <div class="bg-zinc-950/80 border border-zinc-800 rounded-xl px-3 py-1.5 mb-2 flex items-center justify-between text-[11px]">
                <span class="text-zinc-300">Ban Quản Trị: <b class="text-amber-300">1 Bang Chủ</b> • <b class="text-sky-300">${viceCount}/2 Phó Hội</b></span>
                ${isLeader ? `<span class="text-[10px] text-emerald-400 font-bold">Bang Chủ có thể bổ nhiệm Phó Hội</span>` : ''}
            </div>`;

            const rows = members.map((m, i) => {
                const safeUser = m.username.replace(/'/g, "\'");
                const roleBadge = m.role === 'leader'
                    ? `<span class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded font-black bg-amber-500 text-black">👑 Bang Chủ</span>`
                    : m.role === 'vice'
                    ? `<span class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded font-black bg-sky-600 text-white">🎖️ Phó Hội</span>`
                    : `<span class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded font-bold bg-zinc-700 text-zinc-300">Thành Viên</span>`;

                let manageBtns = '';
                if (m.username.toLowerCase() !== me.toLowerCase() && m.role !== 'leader') {
                    const btns = [];
                    if (isLeader) {
                        if (m.role === 'vice') {
                            btns.push(`<button onclick="setGuildMemberRole('${safeUser}', 'member')" class="bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-2 py-1 rounded text-[10px] font-bold cursor-pointer">Hạ chức</button>`);
                        } else if (viceCount < 2) {
                            btns.push(`<button onclick="setGuildMemberRole('${safeUser}', 'vice')" class="bg-sky-600 hover:bg-sky-500 text-white px-2 py-1 rounded text-[10px] font-extrabold cursor-pointer">🎖️ Lên Phó</button>`);
                        }
                    }
                    if (isLeader || (isVice && m.role === 'member')) {
                        btns.push(`<button onclick="kickGuildMember('${safeUser}')" class="bg-rose-700 hover:bg-rose-600 text-white px-2 py-1 rounded text-[10px] font-bold cursor-pointer">Mời ra</button>`);
                    }
                    if (btns.length > 0) {
                        manageBtns = `<div class="flex items-center gap-1 mt-1">${btns.join('')}</div>`;
                    }
                }

                return `
                <div class="bg-zinc-800/90 border border-zinc-700 px-3 py-2 rounded-xl flex items-center justify-between gap-2 text-xs">
                    <div class="min-w-0">
                        <div class="flex items-center flex-wrap">
                            <span class="font-black text-white">#${i + 1} ${m.username}</span>
                            ${roleBadge}
                        </div>
                        <div class="text-emerald-400 font-bold text-[10px] mt-0.5">Cống hiến: ${m.contribution || 0} điểm</div>
                    </div>
                    <div class="shrink-0 text-right">
                        ${manageBtns}
                    </div>
                </div>`;
            }).join('');

            bodyHtml = `${headerNote}<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[46vh] overflow-y-auto pr-1">${rows}</div>`;
        } else if (activeGuildTab === 'requests') {
            const reqRows = requests.map((r, i) => {
                const safeUser = r.username.replace(/'/g, "\'");
                const actionHtml = canManage
                    ? `<div class="flex items-center gap-1.5 shrink-0">
                           <button onclick="handleGuildRequest('${safeUser}', 'approve_request')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer shadow">✓ Duyệt</button>
                           <button onclick="handleGuildRequest('${safeUser}', 'reject_request')" class="bg-rose-700 hover:bg-rose-600 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer">✕ Từ chối</button>
                       </div>`
                    : `<span class="text-[10px] text-zinc-400 italic">Đang chờ Bang Chủ / Phó Hội duyệt</span>`;

                return `
                <div class="bg-zinc-800/90 border border-amber-500/40 px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 text-xs">
                    <div class="min-w-0">
                        <div class="font-black text-yellow-300 truncate">#${i + 1} 👤 ${r.username}</div>
                        <div class="text-[10px] text-zinc-400">Xin gia nhập Bang Hội</div>
                    </div>
                    ${actionHtml}
                </div>`;
            }).join('') || `<div class="text-center text-zinc-400 text-xs py-8 bg-zinc-950/60 rounded-xl border border-zinc-800">
                Hiện không có đơn xin gia nhập nào đang chờ duyệt!
            </div>`;

            bodyHtml = `
            <div class="space-y-2">
                <div class="flex items-center justify-between text-[11px] bg-zinc-950/80 border border-zinc-800 px-3 py-1.5 rounded-xl">
                    <span class="text-zinc-300">Chế độ hiện tại: <b class="${isAutoApprove ? 'text-emerald-400' : 'text-amber-300'}">${isAutoApprove ? '⚡ Tự duyệt vào luôn' : '🔒 Cần Chủ Hội / Phó Hội duyệt'}</b></span>
                    ${canManage ? `
                        <label class="inline-flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" ${isAutoApprove ? 'checked' : ''} onchange="toggleGuildAutoApprove(this.checked)" class="w-3.5 h-3.5 accent-emerald-500 cursor-pointer">
                            <span class="text-[10px] font-bold text-zinc-200">Tự duyệt</span>
                        </label>
                    ` : ''}
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[46vh] overflow-y-auto pr-1">${reqRows}</div>
            </div>`;
        }

        const myRoleTag = isLeader ? '👑 Bang Chủ' : isVice ? '🎖️ Phó Hội' : 'Thành Viên';

        content.innerHTML = `
        <div class="flex justify-between items-center mb-2.5 pb-2 border-b border-amber-500/40">
            <div>
                <h3 class="font-black text-base text-yellow-300">
                    <span class="bg-amber-500 text-black px-1.5 py-0.5 rounded text-xs mr-1">[${g.tag}]</span>${g.name}
                </h3>
                <div class="text-[10px] text-zinc-400">Bang Chủ: <b class="text-sky-300">${g.leader}</b> • Cấp ${g.level} • Chức vụ: <b class="text-amber-300">${myRoleTag}</b></div>
            </div>
            <button onclick="closeGuildModal()" class="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full font-bold text-sm cursor-pointer border border-zinc-600">✕</button>
        </div>

        <div class="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 mb-3 overflow-x-auto no-scrollbar">${tabBar}</div>
        ${bodyHtml}`;

        if (activeGuildTab === 'chat') {
            const listEl = document.getElementById('guild-chat-list');
            if (listEl) listEl.scrollTop = listEl.scrollHeight;
        }
    }

    window.closeGuildModal = function () {
        if (guildPollTimer) {
            clearInterval(guildPollTimer);
            guildPollTimer = null;
        }
        if (typeof closeModal === 'function') closeModal();
    };

    window.createNewGuild = async function () {
        const me = getMyUser();
        const tag = document.getElementById('guild-create-tag')?.value.trim().toUpperCase();
        const name = document.getElementById('guild-create-name')?.value.trim();
        const autoApprove = !!document.getElementById('guild-create-auto-approve')?.checked;
        if (!me) return;
        if (!tag || tag.length < 2) return alert('⚠️ Huy hiệu Bang phải từ 2-4 ký tự!');
        if (!name || name.length < 3) return alert('⚠️ Tên Bang Hội phải từ 3-20 ký tự!');
        if (typeof playerCoins !== 'undefined' && playerCoins < 3000) {
            return alert('⚠️ Bạn cần 3.000🪙 Vàng để lập Bang Hội!');
        }

        try {
            const res = await fetch('/api/guild', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', username: me, tag, name, autoApprove })
            });
            const data = await res.json();
            if (!data.ok) return alert('❌ ' + (data.error || 'Không lập được Bang Hội!'));

            if (typeof playerCoins !== 'undefined') playerCoins -= 3000;
            if (typeof saveGameData === 'function') saveGameData();
            alert(`🎉 Sáng lập thành công Bang Hội [${tag}] ${name}!`);
            refreshGuildModalData();
        } catch (e) {
            alert('❌ Lỗi kết nối: ' + e.message);
        }
    };

    window.joinGuildById = async function (guildId) {
        const me = getMyUser();
        if (!me) return;
        try {
            const res = await fetch('/api/guild', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'join', username: me, guildId })
            });
            const data = await res.json();
            if (!data.ok) return alert('❌ ' + (data.error || 'Không thể gia nhập!'));
            if (data.status === 'pending') {
                alert('📨 Đã gửi đơn xin gia nhập Bang Hội! Vui lòng chờ Bang Chủ hoặc Phó Hội phê duyệt.');
            } else {
                alert('🤝 Gia nhập Bang Hội thành công!');
            }
            refreshGuildModalData();
        } catch (e) {}
    };

    window.cancelGuildJoinRequest = async function (guildId) {
        const me = getMyUser();
        if (!me) return;
        try {
            await fetch('/api/guild', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'cancel_request', username: me, guildId })
            });
            refreshGuildModalData();
        } catch (e) {}
    };

    window.toggleGuildAutoApprove = async function (checked) {
        const me = getMyUser();
        if (!me) return;
        try {
            const res = await fetch('/api/guild', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle_auto_approve', username: me, autoApprove: checked })
            });
            const data = await res.json();
            if (!data.ok) {
                alert('❌ ' + (data.error || 'Không đổi được chế độ duyệt!'));
            }
            refreshGuildModalData();
        } catch (e) {}
    };

    window.handleGuildRequest = async function (targetUser, action) {
        const me = getMyUser();
        if (!me || !targetUser) return;
        try {
            const res = await fetch('/api/guild', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, username: me, targetUser })
            });
            const data = await res.json();
            if (!data.ok) {
                alert('❌ ' + (data.error || 'Không xử lý được đơn xin vào hội!'));
            } else if (action === 'approve_request') {
                alert(`✅ Đã duyệt [${targetUser}] gia nhập Bang Hội!`);
            }
            refreshGuildModalData();
        } catch (e) {}
    };

    window.setGuildMemberRole = async function (targetUser, role) {
        const me = getMyUser();
        if (!me || !targetUser) return;
        try {
            const res = await fetch('/api/guild', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'set_role', username: me, targetUser, role })
            });
            const data = await res.json();
            if (!data.ok) {
                alert('❌ ' + (data.error || 'Không thể thay đổi chức vụ!'));
            } else {
                alert(role === 'vice'
                    ? `🎖️ Đã bổ nhiệm [${targetUser}] làm Phó Hội!`
                    : `📋 Đã miễn nhiệm chức Phó Hội của [${targetUser}].`);
            }
            refreshGuildModalData();
        } catch (e) {}
    };

    window.kickGuildMember = function (targetUser) {
        const me = getMyUser();
        if (!me || !targetUser) return;
        const execKick = async () => {
            try {
                const res = await fetch('/api/guild', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'kick_member', username: me, targetUser })
                });
                const data = await res.json();
                if (!data.ok) alert('❌ ' + (data.error || 'Không thể trục xuất thành viên!'));
                refreshGuildModalData();
            } catch (e) {}
        };
        if (typeof showInGameConfirm === 'function') {
            showInGameConfirm(`Bạn có chắc muốn mời [${targetUser}] rời khỏi Bang Hội không?`, execKick);
        } else if (confirm(`Mời [${targetUser}] rời khỏi Bang Hội?`)) {
            execKick();
        }
    };

    window.leaveCurrentGuild = function () {
        const me = getMyUser();
        if (!me) return;
        const execLeave = async () => {
            try {
                await fetch('/api/guild', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'leave', username: me })
                });
                alert('🚪 Bạn đã rời khỏi Bang Hội.');
                refreshGuildModalData();
            } catch (e) {}
        };
        if (typeof showInGameConfirm === 'function') {
            showInGameConfirm('Bạn có chắc muốn rời khỏi Bang Hội hiện tại không?', execLeave);
        } else if (confirm('Bạn có chắc muốn rời khỏi Bang Hội?')) {
            execLeave();
        }
    };

    window.donateToGuild = async function (type) {
        const me = getMyUser();
        if (!me) return;
        if (type === 'gold') {
            if (playerCoins < 200) return alert('⚠️ Không đủ 200🪙 Vàng!');
            playerCoins -= 200;
        } else {
            if (playerDiamonds < 10) return alert('⚠️ Không đủ 10💎 Kim Cương!');
            playerDiamonds -= 10;
        }
        if (typeof saveGameData === 'function') saveGameData();

        try {
            const res = await fetch('/api/guild', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'donate',
                    username: me,
                    expGain: type === 'gold' ? 100 : 300,
                    goldAdd: type === 'gold' ? 200 : 0
                })
            });
            const data = await res.json();
            if (data.ok) {
                alert(`✨ Cống hiến thành công! (+${type === 'gold' ? 100 : 300} EXP Trụ Hội)`);
                refreshGuildModalData();
            }
        } catch (e) {}
    };

    window.editGuildAnnouncement = async function () {
        const me = getMyUser();
        const text = prompt('Nhập thông báo mới cho toàn thể Bang Hội (tối đa 140 ký tự):');
        if (!me || text === null) return;
        try {
            await fetch('/api/guild', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'announcement', username: me, text })
            });
            refreshGuildModalData();
        } catch (e) {}
    };

    window.sendGuildChatMessage = async function () {
        const me = getMyUser();
        const input = document.getElementById('guild-chat-input');
        if (!me || !input) return;
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        try {
            await fetch('/api/guild', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'chat', username: me, text })
            });
            refreshGuildModalData();
        } catch (e) {}
    };

    window.attackGuildWeekendBoss = async function () {
        const me = getMyUser();
        if (!me) return;
        if (!team || team.length === 0) {
            return alert('⚠️ Đội hình của bạn đang trống!');
        }
        const totalAtk = team.reduce((sum, p) => {
            const b = typeof getPetGearBonus === 'function' ? getPetGearBonus(p) : { atk: 0 };
            return sum + (p.atk || 30) + b.atk;
        }, 0);
        const dmg = Math.max(150, Math.floor(totalAtk * (2.5 + Math.random() * 1.2)));

        try {
            const res = await fetch('/api/guild', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'boss_damage', username: me, damage: dmg })
            });
            const data = await res.json();
            if (data.ok) {
                const goldGain = 150 + Math.floor(dmg / 8);
                playerCoins += goldGain;
                if (data.defeated) playerDiamonds += 15;
                if (typeof saveGameData === 'function') saveGameData();
                alert(data.defeated
                    ? `🏆 KẾT LIỄU BOSS BANG HỘI!
Gây ${dmg.toLocaleString()} sát thương, nhận +${goldGain}🪙 & +15💎!`
                    : `⚔️ Đội hình xuất kích gây ${dmg.toLocaleString()} sát thương lên Boss Bang Hội!
Nhận thưởng tham chiến +${goldGain}🪙!`);
                refreshGuildModalData();
            }
        } catch (e) {}
    };
})();
