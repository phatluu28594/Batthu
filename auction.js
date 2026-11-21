// ============================================================================
// BẮT THÚ VƯƠNG - MODULE CHỢ GIAO DỊCH / ĐẤU GIÁ NGƯỜI CHƠI (auction.js)
// Rao bán linh thú F1/Hiếm, Trứng F1 & Đá Ngũ Hành (thu phí sàn 10% chống lạm phát)
// ============================================================================

(function () {
    let activeP2pTab = 'browse'; // 'browse' | 'sell'
    let activeMarketCategory = 'all'; // 'all' | 'egg' | 'pet' | 'stone'
    let activePriceSort = 'default'; // 'default' | 'asc' | 'desc'
    let activeRarityFilter = 'all'; // 'all' | 'Thường' | 'Hiếm' | 'Cực Hiếm' | 'Huyền Thoại' | 'Thần Thánh'
    let cachedListings = [];

    window.setMarketCategory = function (cat) {
        activeMarketCategory = cat;
        if (typeof window.openP2pMarketModal === 'function') {
            window.openP2pMarketModal('browse');
        }
    };

    window.setMarketPriceSort = function (sort) {
        activePriceSort = sort;
        if (typeof window.openP2pMarketModal === 'function') {
            window.openP2pMarketModal('browse');
        }
    };

    window.setMarketRarityFilter = function (rarity) {
        activeRarityFilter = rarity;
        if (typeof window.openP2pMarketModal === 'function') {
            window.openP2pMarketModal('browse');
        }
    };

    function getMyUser() {
        return (localStorage.getItem('ar_cloud_user') || '').trim();
    }

    // Tự động nhận tiền bán vật phẩm thành công trên Chợ Người Chơi (kể cả khi bán lúc offline)
    let isClaimingPayouts = false;
    window.checkAndClaimMarketPayouts = async function () {
        if (isClaimingPayouts) return;
        const me = getMyUser();
        if (!me) return;
        isClaimingPayouts = true;
        try {
            const res = await fetch('/api/market-p2p?u=' + encodeURIComponent(me) + '&t=' + Date.now(), { cache: 'no-store' });
            const data = await res.json();
            if (!data.ok || !Array.isArray(data.payouts) || data.payouts.length === 0) return;

            let totalCoins = 0;
            let totalDiamonds = 0;
            const ids = [];
            const notes = [];

            data.payouts.forEach(p => {
                totalCoins += Number(p.coins) || 0;
                totalDiamonds += Number(p.diamonds) || 0;
                ids.push(p.id);
                if (p.note) notes.push('• ' + p.note);
            });

            if (ids.length > 0) {
                window.playerCoins = (Number(window.playerCoins) || 0) + totalCoins;
                window.playerDiamonds = (Number(window.playerDiamonds) || 0) + totalDiamonds;
                if (typeof saveGameData === 'function') saveGameData();

                await fetch('/api/market-p2p', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'claim_payouts', username: me, payoutIds: ids })
                }).catch(() => {});

                if (typeof syncCurrentAccountToCloud === 'function') syncCurrentAccountToCloud();

                const gainParts = [];
                if (totalCoins > 0) gainParts.push(`+${totalCoins.toLocaleString()}🪙 Vàng`);
                if (totalDiamonds > 0) gainParts.push(`+${totalDiamonds.toLocaleString()}💎 Kim Cương`);
                alert(`💰 DOANH THU CHỢ GIAO DỊCH!
Bạn nhận được ${gainParts.join(' & ')}:

${notes.join('\n')}`);
            }
        } catch (e) {
        } finally {
            isClaimingPayouts = false;
        }
    };

    setTimeout(() => window.checkAndClaimMarketPayouts(), 3500);
    // Tần suất dự phòng 35s (Heartbeat tổng hợp 12s đã đảm nhận xử lý chính)
    setInterval(() => {
        if (!document.hidden) window.checkAndClaimMarketPayouts();
    }, 35000);

    window.openP2pMarketModal = async function (tab = activeP2pTab) {
        activeP2pTab = tab;
        const me = getMyUser();
        if (!me) {
            alert('⚠️ Bạn cần đăng nhập Tài Khoản Mây (☁️ Nick) để dùng Chợ Giao Dịch Người Chơi!');
            if (typeof openCloudAccountModal === 'function') openCloudAccountModal();
            return;
        }

        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        if (!modal || !content) return;
        modal.classList.remove('hidden');

        content.innerHTML = `<div class="text-center py-8 text-amber-300 font-bold animate-pulse">🏪 Đang tải gian hàng Chợ Người Chơi...</div>`;

        try {
            const res = await fetch('/api/market-p2p?u=' + encodeURIComponent(me) + '&t=' + Date.now(), { cache: 'no-store' });
            const data = await res.json();
            cachedListings = (data.ok && Array.isArray(data.listings)) ? data.listings : [];
        } catch (e) {
            cachedListings = [];
        }

        const curCoins = (typeof playerCoins !== 'undefined' ? playerCoins : window.playerCoins) || 0;
        const curDiamonds = (typeof playerDiamonds !== 'undefined' ? playerDiamonds : window.playerDiamonds) || 0;
        const tabHeader = `
        <div class="flex justify-between items-center mb-2.5 pb-2 border-b border-amber-500/40">
            <div>
                <h3 class="font-black text-base text-amber-300">🏪 CHỢ GIAO DỊCH NGƯỜI CHƠI</h3>
                <div class="text-[10px] text-zinc-400">Phí sàn giao dịch: <b class="text-rose-300">10%</b> • Vàng: <b class="text-yellow-300">${Number(curCoins).toLocaleString()}🪙</b> • KC: <b class="text-sky-300">${Number(curDiamonds).toLocaleString()}💎</b></div>
            </div>
            <button onclick="closeModal()" class="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full font-bold text-sm cursor-pointer border border-zinc-600">✕</button>
        </div>
        <div class="grid grid-cols-2 gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 mb-3">
            <button onclick="openP2pMarketModal('browse')" class="py-1.5 rounded-lg text-xs font-extrabold cursor-pointer ${activeP2pTab === 'browse' ? 'bg-amber-500 text-black' : 'text-zinc-400'}">
                🛍️ Sàn Đang Bán (${cachedListings.length})
            </button>
            <button onclick="openP2pMarketModal('sell')" class="py-1.5 rounded-lg text-xs font-extrabold cursor-pointer ${activeP2pTab === 'sell' ? 'bg-emerald-600 text-white' : 'text-zinc-400'}">
                📦 Đăng Bán Vật Phẩm
            </button>
        </div>`;

        if (activeP2pTab === 'browse') {
            const totalCount = cachedListings.length;
            const eggCount = cachedListings.filter(i => i.item_type === 'egg').length;
            const petCount = cachedListings.filter(i => i.item_type === 'pet').length;
            const stoneCount = cachedListings.filter(i => i.item_type === 'stone').length;

            let filteredListings = activeMarketCategory === 'all'
                ? [...cachedListings]
                : cachedListings.filter(i => i.item_type === activeMarketCategory);

            // Lọc theo phẩm cấp: Trắng (Thường), Xanh (Hiếm), Vàng (Cực Hiếm), Đỏ (Huyền Thoại), Tím (Thần Thánh)
            if (activeRarityFilter !== 'all') {
                filteredListings = filteredListings.filter(item => {
                    let parsed = {};
                    try { parsed = JSON.parse(item.item_json || '{}'); } catch (e) {}
                    const rName = (item.item_type === 'pet' && parsed.pet?.rarity?.name) ||
                                  (item.item_type === 'egg' && parsed.egg?.rarity?.name) || '';
                    return rName === activeRarityFilter;
                });
            }

            // Sắp xếp theo giá (Thấp ➔ Cao, Cao ➔ Thấp, hoặc Mặc định)
            if (activePriceSort === 'asc') {
                filteredListings.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
            } else if (activePriceSort === 'desc') {
                filteredListings.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
            }

            const rowsHtml = filteredListings.map(item => {
                let parsed = {};
                try { parsed = JSON.parse(item.item_json || '{}'); } catch (e) {}
                const isMine = item.seller.toLowerCase() === me.toLowerCase();
                const curIcon = item.currency === 'coins' ? '🪙' : '💎';

                // Thời gian thu hồi 24 giờ kể từ khi niêm yết
                const createdAtMs = typeof item.created_at === 'number'
                    ? item.created_at
                    : (new Date(item.created_at).getTime() || Date.now());
                const expiresAt = createdAtMs + (24 * 3600 * 1000);
                const remainingMs = expiresAt - Date.now();
                const isExpired = remainingMs <= 0;

                let timeBadge = '';
                if (isExpired) {
                    timeBadge = `<span class="text-[9px] text-rose-300 font-black bg-rose-950/80 border border-rose-500/40 px-1.5 py-0.5 rounded">⚠️ Hết hạn (24h)</span>`;
                } else {
                    const remHours = Math.floor(remainingMs / (3600 * 1000));
                    const remMins = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));
                    timeBadge = `<span class="text-[9px] text-amber-300 font-bold bg-amber-950/70 border border-amber-500/30 px-1.5 py-0.5 rounded">⏳ Còn ${remHours}h${String(remMins).padStart(2, '0')}m</span>`;
                }

                let detailSub = '';
                let inspectBtn = '';
                if (item.item_type === 'pet' && parsed.pet) {
                    const p = parsed.pet;
                    detailSub = `${p.rarity?.badge || ''} • Lv.${Math.floor(p.level || 1)} • Hệ ${p.element} • ATK:${Math.floor(p.atk || 0)} • HP:${p.maxHp || 0}`;
                    inspectBtn = `
                        <button onclick="inspectP2pPetListing(${item.id})" class="text-[10px] font-black text-cyan-300 hover:text-cyan-200 underline cursor-pointer mt-0.5 inline-flex items-center gap-1">
                            👁️ Xem Chi Tiết
                        </button>
                    `;
                } else if (item.item_type === 'egg' && parsed.egg) {
                    detailSub = `${parsed.egg.rarity?.badge || ''} • Hệ ${parsed.egg.element} • Bước: ${parsed.egg.steps}/${parsed.egg.requiredSteps}`;
                } else if (item.item_type === 'stone') {
                    detailSub = `Gói x${parsed.qty || 1} viên Đá Ngũ Hành`;
                }

                return `
                <div class="bg-zinc-800/95 border ${isExpired ? 'border-rose-500/50 bg-rose-950/20' : 'border-zinc-700/80'} p-2.5 rounded-xl flex items-center justify-between gap-2 shadow-sm">
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="text-xs font-black text-yellow-300 truncate">${item.item_name}</span>
                            ${timeBadge}
                        </div>
                        <div class="text-[10px] text-zinc-300 truncate mt-0.5">${detailSub}</div>
                        <div class="flex items-center justify-between gap-2 mt-0.5">
                            <div class="text-[10px] text-sky-300">Người bán: <b>${item.seller}</b></div>
                            ${inspectBtn}
                        </div>
                    </div>
                    <div class="shrink-0 text-right flex flex-col items-end justify-center min-w-[75px]">
                        <div class="text-xs font-black ${item.currency === 'coins' ? 'text-yellow-400' : 'text-cyan-300'} mb-1">
                            ${Number(item.price).toLocaleString()} ${curIcon}
                        </div>
                        ${isMine
                            ? `<button onclick="cancelP2pListing(${item.id})" class="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white cursor-pointer ${isExpired ? 'bg-gradient-to-r from-amber-600 to-rose-600 hover:brightness-110 font-black animate-pulse' : 'bg-zinc-700 hover:bg-red-700'}">${isExpired ? 'Thu Hồi Hết Hạn' : 'Thu Hồi'}</button>`
                            : (isExpired
                                ? `<button disabled class="bg-zinc-800 text-zinc-500 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-not-allowed">Hết hạn</button>`
                                : `<button onclick="buyP2pListing(${item.id})" class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 px-3 py-1 rounded-lg text-[11px] font-extrabold text-white cursor-pointer shadow">Mua Ngay</button>`)
                        }
                    </div>
                </div>`;
            }).join('') || `<div class="text-center text-zinc-400 text-xs py-8">Không có mặt hàng nào phù hợp bộ lọc!</div>`;

            content.innerHTML = `
            ${tabHeader}
            <div class="flex gap-2.5 min-h-[46vh] max-h-[58vh]">
                <!-- CỘT BÊN TRÁI: DANH MỤC HÀNG HÓA -->
                <div class="w-28 sm:w-32 shrink-0 flex flex-col gap-1.5 bg-zinc-950/80 p-1.5 rounded-xl border border-zinc-800">
                    <button onclick="setMarketCategory('all')" class="text-left px-2.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition ${activeMarketCategory === 'all' ? 'bg-amber-500 text-black shadow' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}">
                        <div>🌟 Tất Cả</div>
                        <div class="text-[9px] opacity-75">(${totalCount})</div>
                    </button>
                    <button onclick="setMarketCategory('egg')" class="text-left px-2.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition ${activeMarketCategory === 'egg' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}">
                        <div>🥚 Trứng</div>
                        <div class="text-[9px] opacity-75">(${eggCount})</div>
                    </button>
                    <button onclick="setMarketCategory('pet')" class="text-left px-2.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition ${activeMarketCategory === 'pet' ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}">
                        <div>🐾 Thú F1</div>
                        <div class="text-[9px] opacity-75">(${petCount})</div>
                    </button>
                    <button onclick="setMarketCategory('stone')" class="text-left px-2.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition ${activeMarketCategory === 'stone' ? 'bg-cyan-600 text-white shadow' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}">
                        <div>💎 Đá Quý</div>
                        <div class="text-[9px] opacity-75">(${stoneCount})</div>
                    </button>
                </div>

                <!-- CỘT BÊN PHẢI: MẶT HÀNG ĐANG BÁN LƯỚI 2 CỘT WIDESCREEN & THANH LỌC/SẮP XẾP -->
                <div class="grow flex flex-col min-w-0">
                    <!-- Thanh công cụ Lọc Phẩm Cấp & Sắp Xếp Giá -->
                    <div class="flex items-center justify-between gap-1.5 mb-2 pb-1.5 border-b border-zinc-800 shrink-0">
                        <div class="flex items-center gap-1 min-w-0">
                            <span class="text-[10px] text-zinc-400 font-bold shrink-0">Phẩm:</span>
                            <select onchange="setMarketRarityFilter(this.value)" class="bg-zinc-900 border border-zinc-700 text-[10px] text-amber-300 font-bold rounded-lg px-1.5 py-1 focus:outline-none cursor-pointer max-w-[110px] truncate">
                                <option value="all" ${activeRarityFilter === 'all' ? 'selected' : ''}>🌟 Tất cả</option>
                                <option value="Thường" ${activeRarityFilter === 'Thường' ? 'selected' : ''}>⚪ Trắng</option>
                                <option value="Hiếm" ${activeRarityFilter === 'Hiếm' ? 'selected' : ''}>🟢 Xanh</option>
                                <option value="Cực Hiếm" ${activeRarityFilter === 'Cực Hiếm' ? 'selected' : ''}>🟡 Vàng</option>
                                <option value="Huyền Thoại" ${activeRarityFilter === 'Huyền Thoại' ? 'selected' : ''}>🔴 Đỏ</option>
                                <option value="Thần Thánh" ${activeRarityFilter === 'Thần Thánh' ? 'selected' : ''}>🟣 Tím</option>
                            </select>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            <span class="text-[10px] text-zinc-400 font-bold">Giá:</span>
                            <select onchange="setMarketPriceSort(this.value)" class="bg-zinc-900 border border-zinc-700 text-[10px] text-yellow-300 font-bold rounded-lg px-1.5 py-1 focus:outline-none cursor-pointer">
                                <option value="default" ${activePriceSort === 'default' ? 'selected' : ''}>⏱️ Mới nhất</option>
                                <option value="asc" ${activePriceSort === 'asc' ? 'selected' : ''}>🪙 Thấp ➔ Cao</option>
                                <option value="desc" ${activePriceSort === 'desc' ? 'selected' : ''}>🪙 Cao ➔ Thấp</option>
                            </select>
                        </div>
                    </div>

                    <!-- LƯỚI 2 CỘT MẶT HÀNG TRÊN WIDESCREEN LANDSCAPE -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto max-h-[50vh] pr-1 no-scrollbar">
                        ${rowsHtml}
                    </div>
                </div>
            </div>`;
            return;
        }

        // TAB ĐĂNG BÁN VẬT PHẨM
        const sellableOptions = [];
        if (typeof farm !== 'undefined' && Array.isArray(farm)) {
            farm.forEach((p, idx) => {
                if (!p) return;
                const isF1 = String(p.name).startsWith('F1_');
                const isRarePlus = p.rarity && p.rarity.name !== 'Thường';
                if (isF1 || isRarePlus) {
                    sellableOptions.push({
                        val: `pet:${idx}`,
                        label: `🐾 [Thú Trại] ${p.rarity?.badge || ''} ${p.name} (Lv.${Math.floor(p.level || 1)})`
                    });
                }
            });
        }
        if (typeof eggs !== 'undefined' && Array.isArray(eggs)) {
            eggs.forEach((e, idx) => {
                sellableOptions.push({
                    val: `egg:${idx}`,
                    label: `🥚 [Trứng] ${e.name} (${e.rarity?.badge || ''})`
                });
            });
        }
        const stoneLabels = {
            stoneKim: '⚔️ Đá Kim (Gói 5 viên)',
            stoneMoc: '🌿 Đá Mộc (Gói 5 viên)',
            stoneThuy: '💧 Đá Thủy (Gói 5 viên)',
            stoneHoa: '🔥 Đá Hỏa (Gói 5 viên)',
            stoneTho: '🪨 Đá Thổ (Gói 5 viên)'
        };
        if (typeof inventory !== 'undefined') {
            Object.entries(stoneLabels).forEach(([k, lbl]) => {
                if ((inventory[k] || 0) >= 5) {
                    sellableOptions.push({
                        val: `stone:${k}`,
                        label: `💎 ${lbl} [Đang có: ${inventory[k]}]`
                    });
                }
            });
        }

        const optHtml = sellableOptions.map(o => `<option value="${o.val}">${o.label}</option>`).join('');

        content.innerHTML = `
        ${tabHeader}
        <div class="bg-zinc-800/90 border border-emerald-500/40 rounded-xl p-3 space-y-2.5 text-xs">
            <div class="font-extrabold text-emerald-300">📦 Chọn Vật Phẩm Trong Kho Để Rao Bán:</div>
            <div class="text-[10px] text-zinc-400">
                • Chỉ được bán <b>Linh thú F1 / Hiếm trở lên</b> đang để ở Kho Trại Hộ, <b>Trứng F1</b>, hoặc <b>Gói 5 Đá Ngũ Hành</b>.
            </div>
            ${sellableOptions.length > 0 ? `
                <select id="p2p-sell-item" class="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-2 text-white">
                    ${optHtml}
                </select>
                <div class="grid grid-cols-2 gap-1.5">
                    <select id="p2p-sell-currency" class="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-2 text-white font-bold">
                        <option value="diamonds">💎 Bán lấy Kim Cương</option>
                        <option value="coins">🪙 Bán lấy Vàng</option>
                    </select>
                    <input id="p2p-sell-price" type="number" min="5" value="50" placeholder="Nhập giá bán..."
                        class="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-2 text-yellow-300 font-bold">
                </div>
                <div class="text-[10px] text-amber-300/90">
                    💡 Khi có người mua, hệ thống thu <b>10% phí sàn</b> và chuyển thẳng 90% tiền vào tài khoản của bạn.
                </div>
                <button onclick="submitP2pListing()" class="w-full bg-gradient-to-r from-emerald-600 to-amber-600 hover:brightness-110 py-2.5 rounded-xl font-black text-white cursor-pointer shadow-lg">
                    📢 Niêm Yết Lên Chợ Ngay
                </button>
            ` : `
                <div class="text-center text-zinc-400 py-6">
                    Bạn chưa có Linh thú F1/Hiếm trong Kho Trại, Trứng hoặc đủ 5 Đá Ngũ Hành để rao bán!
                </div>
            `}
        </div>`;
    };

    window.submitP2pListing = async function () {
        const me = getMyUser();
        const sel = document.getElementById('p2p-sell-item')?.value || '';
        const currency = document.getElementById('p2p-sell-currency')?.value || 'diamonds';
        const price = Math.floor(Number(document.getElementById('p2p-sell-price')?.value) || 0);
        if (!me || !sel) return;

        const minP = currency === 'diamonds' ? 5 : 100;
        if (price < minP) return alert(`⚠️ Giá bán tối thiểu là ${minP} ${currency === 'diamonds' ? '💎' : '🪙'}!`);

        const [type, key] = sel.split(':');
        let itemName = '';
        let itemData = {};

        if (type === 'pet') {
            const idx = Number(key);
            const p = farm[idx];
            if (!p) return alert('⚠️ Không tìm thấy linh thú trong Kho Trại!');
            itemName = `${p.rarity?.badge || ''} ${p.name} (Lv.${Math.floor(p.level || 1)})`;
            itemData = { pet: JSON.parse(JSON.stringify(p)) };
        } else if (type === 'egg') {
            const idx = Number(key);
            const e = eggs[idx];
            if (!e) return alert('⚠️ Không tìm thấy trứng!');
            itemName = `${e.name} (${e.rarity?.badge || ''})`;
            itemData = { egg: JSON.parse(JSON.stringify(e)) };
        } else if (type === 'stone') {
            if ((inventory[key] || 0) < 5) return alert('⚠️ Không đủ 5 viên Đá Ngũ Hành!');
            const names = { stoneKim: 'Đá Kim', stoneMoc: 'Đá Mộc', stoneThuy: 'Đá Thủy', stoneHoa: 'Đá Hỏa', stoneTho: 'Đá Thổ' };
            itemName = `Gói 5x ${names[key] || key}`;
            itemData = { stoneKey: key, qty: 5 };
        }

        try {
            const res = await fetch('/api/market-p2p', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'list',
                    username: me,
                    itemType: type,
                    itemName,
                    itemData,
                    price,
                    currency
                })
            });
            const data = await res.json();
            if (!data.ok) return alert('❌ ' + (data.error || 'Không đăng bán được!'));

            // Trừ vật phẩm khỏi kho sau khi đã niêm yết thành công trên Server
            if (type === 'pet') farm.splice(Number(key), 1);
            else if (type === 'egg') eggs.splice(Number(key), 1);
            else if (type === 'stone') {
                inventory[key] -= 5;
                localStorage.setItem('ar_inventory', JSON.stringify(inventory));
            }

            if (typeof saveGameData === 'function') saveGameData();
            if (typeof syncCurrentAccountToCloud === 'function') syncCurrentAccountToCloud();
            alert(`✅ Đã niêm yết [${itemName}] lên Chợ Người Chơi!`);
            openP2pMarketModal('browse');
        } catch (err) {
            alert('❌ Lỗi kết nối: ' + err.message);
        }
    };

    window.buyP2pListing = async function (listingId) {
        const me = getMyUser();
        const item = cachedListings.find(x => x.id === listingId);
        if (!me || !item) return;

        // Kiểm tra hết hạn 24 giờ phía Client
        const createdAtMs = typeof item.created_at === 'number'
            ? item.created_at
            : (new Date(item.created_at).getTime() || Date.now());
        if (Date.now() - createdAtMs >= 24 * 3600 * 1000) {
            return alert('⚠️ Vật phẩm này đã hết hạn niêm yết 24 giờ và đang chờ người bán thu hồi!');
        }

        if (item.currency === 'coins' && playerCoins < item.price) {
            return alert(`⚠️ Bạn không đủ ${item.price.toLocaleString()}🪙 Vàng!`);
        }
        if (item.currency === 'diamonds' && playerDiamonds < item.price) {
            return alert(`⚠️ Bạn không đủ ${item.price.toLocaleString()}💎 Kim Cương!`);
        }
        if (item.item_type === 'pet' && typeof getTotalOwnedPetCount === 'function' && getTotalOwnedPetCount() >= maxPetCapacity) {
            return alert(`⚠️ Kho linh thú đã đầy (${getTotalOwnedPetCount()}/${maxPetCapacity})! Hãy mở rộng thêm chỗ trước khi mua thú.`);
        }

        try {
            const res = await fetch('/api/market-p2p', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'buy', username: me, listingId })
            });
            const data = await res.json();
            if (!data.ok || !data.listing) {
                alert('❌ ' + (data.error || 'Giao dịch thất bại!'));
                openP2pMarketModal('browse');
                return;
            }

            if (item.currency === 'coins') playerCoins -= item.price;
            else playerDiamonds -= item.price;

            let parsed = {};
            try { parsed = JSON.parse(data.listing.item_json || '{}'); } catch (e) {}

            if (data.listing.item_type === 'pet' && parsed.pet) {
                const petObj = typeof sanitizePetsData === 'function' ? sanitizePetsData([parsed.pet])[0] : parsed.pet;
                petObj.id = 'pet_' + Date.now() + '_' + Math.floor(Math.random() * 999);
                farm.push(petObj);
            } else if (data.listing.item_type === 'egg' && parsed.egg) {
                eggs.push(parsed.egg);
            } else if (data.listing.item_type === 'stone' && parsed.stoneKey) {
                inventory[parsed.stoneKey] = (inventory[parsed.stoneKey] || 0) + (Number(parsed.qty) || 5);
                localStorage.setItem('ar_inventory', JSON.stringify(inventory));
            }

            if (typeof saveGameData === 'function') saveGameData();
            if (typeof syncMonsterDexFromOwned === 'function') syncMonsterDexFromOwned();
            if (typeof syncCurrentAccountToCloud === 'function') syncCurrentAccountToCloud();

            alert(`🎉 Giao dịch thành công!
Bạn đã mua [${data.listing.item_name}] từ [${data.listing.seller}]!`);
            openP2pMarketModal('browse');
        } catch (err) {
            alert('❌ Lỗi giao dịch: ' + err.message);
        }
    };

    window.cancelP2pListing = async function (listingId) {
        const me = getMyUser();
        if (!me) return;
        try {
            const res = await fetch('/api/market-p2p', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'cancel', username: me, listingId })
            });
            const data = await res.json();
            if (!data.ok || !data.listing) {
                alert('❌ ' + (data.error || 'Không thu hồi được vật phẩm!'));
                openP2pMarketModal('browse');
                return;
            }

            let parsed = {};
            try { parsed = JSON.parse(data.listing.item_json || '{}'); } catch (e) {}

            if (data.listing.item_type === 'pet' && parsed.pet) {
                farm.push(parsed.pet);
            } else if (data.listing.item_type === 'egg' && parsed.egg) {
                eggs.push(parsed.egg);
            } else if (data.listing.item_type === 'stone' && parsed.stoneKey) {
                inventory[parsed.stoneKey] = (inventory[parsed.stoneKey] || 0) + (Number(parsed.qty) || 5);
                localStorage.setItem('ar_inventory', JSON.stringify(inventory));
            }

            if (typeof saveGameData === 'function') saveGameData();
            alert(`📦 Đã thu hồi [${data.listing.item_name}] về lại kho của bạn!`);
            openP2pMarketModal('browse');
        } catch (e) {}
    };

    // Modal xem thông tin cá nhân / chỉ số chi tiết của Linh Thú đang bán trên chợ P2P
    window.inspectP2pPetListing = function (listingId) {
        const item = cachedListings.find(x => x.id === listingId);
        if (!item) return;

        let parsed = {};
        try { parsed = JSON.parse(item.item_json || '{}'); } catch (e) {}
        const p = parsed.pet;
        if (!p) return alert('⚠️ Không tìm thấy dữ liệu linh thú này!');

        const me = getMyUser();
        const isMine = item.seller.toLowerCase() === me.toLowerCase();
        const curIcon = item.currency === 'coins' ? '🪙' : '💎';

        const createdAtMs = typeof item.created_at === 'number'
            ? item.created_at
            : (new Date(item.created_at).getTime() || Date.now());
        const expiresAt = createdAtMs + (24 * 3600 * 1000);
        const remainingMs = expiresAt - Date.now();
        const isExpired = remainingMs <= 0;

        let timeStr = '';
        if (isExpired) {
            timeStr = '⚠️ Đã hết hạn niêm yết 24h';
        } else {
            const remHours = Math.floor(remainingMs / (3600 * 1000));
            const remMins = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));
            timeStr = `⏳ Còn ${remHours} giờ ${remMins} phút niêm yết`;
        }

        let modal = document.getElementById('p2p-pet-inspect-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'p2p-pet-inspect-modal';
            modal.className = 'fixed inset-0 z-[65] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 text-white';
            document.body.appendChild(modal);
        }

        const rarityBadge = p.rarity?.badge || '⚪ Thường';
        const elementIcon = { Moc: '🌿 Mộc', Hoa: '🔥 Hỏa', Tho: '🪨 Thổ', Kim: '⚔️ Kim', Thuy: '💧 Thủy' }[p.element] || p.element;

        const spriteHtml = typeof getPetSpriteHtml === 'function'
            ? getPetSpriteHtml(p, 'idle', 64)
            : '🐾';

        modal.innerHTML = `
            <div class="relative w-full max-w-2xl bg-gradient-to-b from-zinc-900 to-black rounded-3xl border-2 border-cyan-400 shadow-2xl p-4 flex flex-col gap-3 animate-scale-up">
                <!-- Header -->
                <div class="flex justify-between items-center pb-2 border-b border-white/10 shrink-0">
                    <div>
                        <div class="text-[10px] text-zinc-400 uppercase tracking-wider">Hồ Sơ Linh Thú Chợ P2P</div>
                        <h3 class="text-sm font-black text-amber-300">${p.name}</h3>
                    </div>
                    <button onclick="document.getElementById('p2p-pet-inspect-modal').classList.add('hidden')" class="w-7 h-7 rounded-full bg-zinc-800 text-zinc-300 hover:text-white font-black flex items-center justify-center cursor-pointer">✕</button>
                </div>

                <!-- 2 CỘT WIDESCREEN LANDSCAPE -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0">
                    <!-- CỘT TRÁI: AVATAR & THÔNG TIN CƠ BẢN & NIÊM YẾT -->
                    <div class="flex flex-col gap-2.5">
                        <div class="flex items-center gap-3 bg-zinc-950/80 p-3 rounded-2xl border border-white/10">
                            <div class="w-16 h-16 rounded-2xl bg-zinc-900/90 border border-white/10 flex items-center justify-center shrink-0">
                                ${spriteHtml}
                            </div>
                            <div class="min-w-0 space-y-1">
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <span class="text-xs font-black text-yellow-300">${p.name}</span>
                                    <span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-white/10">${rarityBadge}</span>
                                </div>
                                <div class="text-xs text-zinc-300">
                                    Cấp độ: <b class="text-cyan-300">Lv.${Math.floor(p.level || 1)}</b> • Giới tính: <b>${p.gender || 'Đực'}</b>
                                </div>
                                <div class="text-xs text-zinc-300">
                                    Hệ nguyên tố: <b class="text-amber-300">${elementIcon}</b>
                                </div>
                            </div>
                        </div>

                        <!-- Thông tin người bán, giá niêm yết & thời gian -->
                        <div class="bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800 space-y-1 text-xs">
                            <div class="flex justify-between">
                                <span class="text-zinc-400">Người bán:</span>
                                <b class="text-sky-300">${item.seller}</b>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-zinc-400">Giá niêm yết:</span>
                                <b class="text-yellow-300 text-sm">${Number(item.price).toLocaleString()} ${curIcon}</b>
                            </div>
                            <div class="flex justify-between pt-1 border-t border-white/5 text-[10px]">
                                <span class="text-zinc-400">Thời hạn:</span>
                                <span class="${isExpired ? 'text-rose-400 font-black' : 'text-amber-300 font-bold'}">${timeStr}</span>
                            </div>
                        </div>
                    </div>

                    <!-- CỘT PHẢI: CHỈ SỐ CHI TIẾT & NÚT HÀNH ĐỘNG -->
                    <div class="flex flex-col justify-between gap-2.5">
                        <div class="grid grid-cols-2 gap-2 bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800 text-xs">
                            <div class="flex justify-between p-1.5 bg-zinc-900/60 rounded-xl">
                                <span class="text-zinc-400">⚔️ Công kích:</span>
                                <b class="text-rose-400">${Math.floor(p.atk || 0)}</b>
                            </div>
                            <div class="flex justify-between p-1.5 bg-zinc-900/60 rounded-xl">
                                <span class="text-zinc-400">🛡️ Phòng thủ:</span>
                                <b class="text-sky-400">${Math.floor(p.def || 0)}</b>
                            </div>
                            <div class="flex justify-between p-1.5 bg-zinc-900/60 rounded-xl">
                                <span class="text-zinc-400">❤️ Sinh lực:</span>
                                <b class="text-emerald-400">${Math.floor(p.hp || p.maxHp || 0)} / ${Math.floor(p.maxHp || 100)}</b>
                            </div>
                            <div class="flex justify-between p-1.5 bg-zinc-900/60 rounded-xl">
                                <span class="text-zinc-400">⚡ Tốc độ:</span>
                                <b class="text-yellow-400">${Math.floor(p.spd || p.speed || 10)}</b>
                            </div>
                            <div class="flex justify-between p-1.5 bg-zinc-900/60 rounded-xl col-span-2">
                                <span class="text-zinc-400">💖 Thân thiết:</span>
                                <b class="text-pink-400">${p.hearts || 3} / 5 Trái Tim</b>
                            </div>
                        </div>

                        <!-- Footer nút hành động -->
                        <div class="flex gap-2">
                            <button onclick="document.getElementById('p2p-pet-inspect-modal').classList.add('hidden')" class="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold text-xs cursor-pointer">
                                Đóng
                            </button>
                            ${isMine
                                ? `<button onclick="document.getElementById('p2p-pet-inspect-modal').classList.add('hidden'); cancelP2pListing(${item.id});" class="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-xs cursor-pointer shadow">Thu Hồi</button>`
                                : (isExpired
                                    ? `<button disabled class="flex-1 py-2 bg-zinc-800 text-zinc-500 rounded-xl font-black text-xs cursor-not-allowed">Đã Hết Hạn</button>`
                                    : `<button onclick="document.getElementById('p2p-pet-inspect-modal').classList.add('hidden'); buyP2pListing(${item.id});" class="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-black font-black text-xs rounded-xl cursor-pointer shadow">Mua Ngay</button>`)
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
    };
})();
