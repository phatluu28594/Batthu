// ============================================================================
// BẮT THÚ VƯƠNG - MODULE CHỢ GIAO DỊCH / ĐẤU GIÁ NGƯỜI CHƠI (auction.js)
// Rao bán linh thú F1/Hiếm, Trứng F1 & Đá Ngũ Hành (thu phí sàn 10% chống lạm phát)
// ============================================================================

(function () {
    let activeP2pTab = 'browse'; // 'browse' | 'sell'
    let cachedListings = [];

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
                if (typeof playerCoins !== 'undefined') playerCoins += totalCoins;
                if (typeof playerDiamonds !== 'undefined') playerDiamonds += totalDiamonds;
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
    setInterval(() => window.checkAndClaimMarketPayouts(), 15000);

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

        const tabHeader = `
        <div class="flex justify-between items-center mb-2.5 pb-2 border-b border-amber-500/40">
            <div>
                <h3 class="font-black text-base text-amber-300">🏪 CHỢ GIAO DỊCH NGƯỜI CHƠI</h3>
                <div class="text-[10px] text-zinc-400">Phí sàn giao dịch: <b class="text-rose-300">10%</b> • Vàng: <b class="text-yellow-300">${playerCoins}🪙</b> • KC: <b class="text-sky-300">${playerDiamonds}💎</b></div>
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
            const rowsHtml = cachedListings.map(item => {
                let parsed = {};
                try { parsed = JSON.parse(item.item_json || '{}'); } catch (e) {}
                const isMine = item.seller.toLowerCase() === me.toLowerCase();
                const curIcon = item.currency === 'coins' ? '🪙' : '💎';

                let detailSub = '';
                if (item.item_type === 'pet' && parsed.pet) {
                    const p = parsed.pet;
                    detailSub = `${p.rarity?.badge || ''} • Lv.${Math.floor(p.level || 1)} • Hệ ${p.element} • ATK:${Math.floor(p.atk || 0)} • HP:${p.maxHp || 0}`;
                } else if (item.item_type === 'egg' && parsed.egg) {
                    detailSub = `${parsed.egg.rarity?.badge || ''} • Hệ ${parsed.egg.element} • Bước: ${parsed.egg.steps}/${parsed.egg.requiredSteps}`;
                } else if (item.item_type === 'stone') {
                    detailSub = `Gói x${parsed.qty || 1} viên Đá Ngũ Hành cường hóa`;
                }

                return `
                <div class="bg-zinc-800/95 border border-zinc-700 p-2.5 rounded-xl flex items-center justify-between gap-2">
                    <div class="min-w-0">
                        <div class="text-xs font-black text-yellow-300 truncate">${item.item_name}</div>
                        <div class="text-[10px] text-zinc-300 truncate">${detailSub}</div>
                        <div class="text-[10px] text-sky-300 mt-0.5">Người bán: <b>${item.seller}</b></div>
                    </div>
                    <div class="shrink-0 text-right">
                        <div class="text-xs font-black ${item.currency === 'coins' ? 'text-yellow-400' : 'text-cyan-300'} mb-1">
                            ${Number(item.price).toLocaleString()} ${curIcon}
                        </div>
                        ${isMine
                            ? `<button onclick="cancelP2pListing(${item.id})" class="bg-zinc-700 hover:bg-red-700 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white cursor-pointer">Thu Hồi</button>`
                            : `<button onclick="buyP2pListing(${item.id})" class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 px-3 py-1 rounded-lg text-[11px] font-extrabold text-white cursor-pointer shadow">Mua Ngay</button>`
                        }
                    </div>
                </div>`;
            }).join('') || `<div class="text-center text-zinc-400 text-xs py-8">Hiện chưa có vật phẩm nào được rao bán trên sàn!</div>`;

            content.innerHTML = `${tabHeader}<div class="space-y-2 max-h-[54vh] overflow-y-auto pr-1">${rowsHtml}</div>`;
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
})();
