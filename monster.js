// ============================================================================
// BẮT THÚ VƯƠNG - MODULE LINH THÚ, QUÁI, TRANG BỊ, ĐẶC KỸ & SPRITE (monster.js)
// Tách trực tiếp từ index.html để quản lý tập trung toàn bộ dữ liệu thú & quái
// ============================================================================

// 1. HỆ THỐNG NGŨ HÀNH & TƯƠNG KHẮC
        const elementCounterMap = {
            'Kim': 'Moc', 'Moc': 'Tho', 'Tho': 'Thuy', 'Thuy': 'Hoa', 'Hoa': 'Kim'
        };
        const elementNames = {
            'Kim': { label: 'Kim ⚔️', color: 'text-yellow-200' },
            'Moc': { label: 'Mộc 🌿', color: 'text-emerald-400' },
            'Tho': { label: 'Thổ 🪨', color: 'text-amber-500' },
            'Thuy': { label: 'Thủy 💧', color: 'text-blue-400' },
            'Hoa': { label: 'Hỏa 🔥', color: 'text-red-400' }
        };


// 2. ĐẶC KỸ, PHẨM CHẤT & CHUẨN HÓA DỮ LIỆU LINH THÚ
        const possibleTraits = [
            { name: 'Khả năng Làm choáng', icon: '💫 Choáng', type: 'stun', chance: 20 },
            { name: 'Đòn đánh Trúng độc', icon: '🟢 Độc', type: 'poison', chance: 25 },
            { name: 'Thiêu đốt diện rộng', icon: '🔥 Cháy', type: 'burn', chance: 25 },
            { name: 'Làm chậm đối thủ', icon: '❄️ Chậm', type: 'slow', chance: 25 },
            { name: 'Hộ thân Buff Giáp', icon: '🛡️ Buff', type: 'shield', chance: 30 },
            { name: 'Hồi Phục Linh Hồn', icon: '💚 Hồi Máu', type: 'heal', chance: 30 }
        ];

        const rarities = [
            { name: 'Thường', color: 'text-zinc-300', bg: 'border-zinc-600', badge: '⚪ Trắng', rate: 59, statMultiplier: 1.0 },     // 54% (44% + 10% bù tròn 100%)
            { name: 'Hiếm', color: 'text-emerald-400', bg: 'border-emerald-500', badge: '🟢 Xanh', rate: 33, statMultiplier: 1.3 },     // 30%
            { name: 'Cực Hiếm', color: 'text-yellow-400', bg: 'border-yellow-500', badge: '🟡 Vàng', rate: 5, statMultiplier: 1.6 }, // 10%
            { name: 'Huyền Thoại', color: 'text-red-500', bg: 'border-red-500', badge: '🔴 Đỏ', rate: 2, statMultiplier: 2.0 },      // 5%
            { name: 'Thần Thánh', color: 'text-purple-400', bg: 'border-purple-500', badge: '🟣 Tím', rate: 1, statMultiplier: 2.5 }    // 1%
        ];

        function getRandomRarity() {
            let roll = Math.random() * 100;
            let cumulative = 0;
            for (let r of rarities) {
                cumulative += r.rate;
                if (roll <= cumulative) return r;
            }
            return rarities[0];
        }

        const elementList = ['Kim', 'Moc', 'Thuy', 'Hoa', 'Tho'];
        function sanitizePetsData(petList) {
            if (!Array.isArray(petList)) return [];
            return petList.map(p => {
                if (!p) return null;
                let rarity = p.rarity || getRandomRarity();
                let multi = rarity.statMultiplier || 1.0;
                let element = p.element || elementList[Math.floor(Math.random() * elementList.length)];
                return {
                    ...p,
                    element: element,
                    maxHp: p.maxHp || p.hp || 150,
                    hp: (p.hp !== undefined && p.hp >= 0) ? p.hp : (p.maxHp || 150),
                    level: p.level || 1,
                    atk: p.atk || 40,
                    hearts: p.hearts !== undefined ? p.hearts : 3,
                    gender: p.gender || (Math.random() < 0.5 ? 'Đực' : 'Cái'),
                    rarity: rarity,
                    critRate: (p.critRate && p.critRate > 0) ? p.critRate : Math.floor(15 + Math.random() * 20 * multi),
                    dodgeRate: (p.dodgeRate && p.dodgeRate > 0) ? p.dodgeRate : Math.floor(10 + Math.random() * 15 * multi),
                    accuracy: (p.accuracy && p.accuracy > 0) ? p.accuracy : Math.floor(80 + Math.random() * 15),
                    blockRate: (p.blockRate && p.blockRate > 0) ? p.blockRate : Math.floor(10 + Math.random() * 20 * multi),
                    armorBreak: (p.armorBreak && p.armorBreak > 0) ? p.armorBreak : Math.floor(10 + Math.random() * 18 * multi),
                    slowResist: (p.slowResist && p.slowResist > 0) ? p.slowResist : Math.floor(10 + Math.random() * 15),
                    speed: (p.speed && p.speed > 0) ? p.speed : Math.floor(40 + Math.random() * 30 * multi),
                    comboRate: (p.comboRate && p.comboRate > 0) ? p.comboRate : Math.min(65, Math.floor(15 + Math.random() * 18 * multi)),
                    trait: p.trait || possibleTraits[Math.floor(Math.random() * possibleTraits.length)],
                    hunger: p.hunger !== undefined ? p.hunger : 90,
                    happiness: p.happiness !== undefined ? p.happiness : 90
                };
            }).filter(p => p !== null);
        }


// 3. HỆ THỐNG 3 ẤN KÝ / BẢO VẬT BẢN MỆNH & ĐỘT PHÁ ĐỒNG BỘ
        // ==========================================
        // HỆ THỐNG 3 ẤN KÝ / TRANG BỊ + ĐỘT PHÁ ĐỒNG BỘ (1 TẤM GEARS.PNG 9x6)
        // ==========================================
        const GEAR_SHEET_URL = 'assets_gear/gears.webp';
        const GEAR_SHEET_COLS = 9;
        const GEAR_SHEET_ROWS = 6;

        const GEAR_TIER_COORDS = [
            { group: 0, row: 0 }, // Bậc 0
            { group: 0, row: 1 }, // Bậc 1
            { group: 0, row: 2 }, // Bậc 2
            { group: 0, row: 3 }, // Bậc 3
            { group: 0, row: 4 }, // Bậc 4
            { group: 1, row: 1 }, // Bậc 5
            { group: 1, row: 3 }, // Bậc 6
            { group: 1, row: 4 }, // Bậc 7
            { group: 2, row: 2 }, // Bậc 8
            { group: 1, row: 5 }, // Bậc 9
            { group: 2, row: 5 }  // Bậc 10
        ];

        const gearConfigs = {
            claw: {
                key: 'claw',
                baseName: 'Nanh Vuốt',
                fallbackEmoji: '🗡️',
                tiers: [
                    'Nanh Sắt Mòn', 'Vuốt Đồng Đen', 'Trảo Bạc Sáng', 'Liệt Hỏa Trảo', 'Huyết Lang Trảo',
                    'Bạch Hổ Thần Trảo', 'Kim Cương Phá Giáp', 'Thiên Lôi Thần Trảo', 'Thái Cổ Long Trảo', 'Truyền Thuyết Ma Trảo', 'Vô Cực Thần Trảo'
                ]
            },
            armor: {
                key: 'armor',
                baseName: 'Giáp Vảy',
                fallbackEmoji: '🛡️',
                tiers: [
                    'Vảy Da Thô', 'Giáp Đồng Rỉ', 'Lân Giáp Bạc', 'Huyền Thiết Giáp', 'Băng Tâm Thần Giáp',
                    'Huyền Vũ Trọng Giáp', 'Hoàng Kim Thánh Giáp', 'Phượng Hoàng Vũ Giáp', 'Thái Cổ Long Lân', 'Bất Diệt Ma Giáp', 'Vô Cực Thần Giáp'
                ]
            },
            orb: {
                key: 'orb',
                baseName: 'Linh Châu',
                fallbackEmoji: '🔮',
                tiers: [
                    'Đá Mờ Đục', 'Ngọc Lục Bảo', 'Lam Thủy Châu', 'Xích Hỏa Châu', 'Tử Lôi Linh Châu',
                    'Nhật Nguyệt Tinh Châu', 'Thiên Hà Thần Châu', 'Hỗn Độn Linh Châu', 'Thái Cổ Long Châu', 'Vĩnh Hằng Ma Châu', 'Vô Cực Thần Châu'
                ]
            }
        };

        function ensurePetGears(pet) {
            if (!pet) return;
            if (!pet.gears) {
                pet.gears = { claw: 0, armor: 0, orb: 0 };
            } else {
                pet.gears.claw = pet.gears.claw ?? 0;
                pet.gears.armor = pet.gears.armor ?? 0;
                pet.gears.orb = pet.gears.orb ?? 0;
            }
            if (pet.gearTier === undefined) {
                let minLv = Math.min(pet.gears.claw, pet.gears.armor, pet.gears.orb);
                pet.gearTier = Math.min(10, Math.floor(minLv / 10));
            }
        }

        function getGearTierInfo(slotKey, tier) {
            const cfg = gearConfigs[slotKey];
            const safeTier = Math.max(0, Math.min(10, tier || 0));
            const coord = GEAR_TIER_COORDS[safeTier];
            const slotOffset = slotKey === 'claw' ? 0 : (slotKey === 'armor' ? 1 : 2);

            const colIndex = coord.group * 3 + slotOffset;
            const rowIndex = coord.row;

            const posX = GEAR_SHEET_COLS > 1 ? (colIndex / (GEAR_SHEET_COLS - 1)) * 100 : 0;
            const posY = GEAR_SHEET_ROWS > 1 ? (rowIndex / (GEAR_SHEET_ROWS - 1)) * 100 : 0;

            return {
                tier: safeTier,
                name: cfg.tiers[safeTier] || cfg.baseName,
                bgStyle: `background-image: url('${GEAR_SHEET_URL}'); background-size: ${GEAR_SHEET_COLS * 100}% ${GEAR_SHEET_ROWS * 100}%; background-position: ${posX}% ${posY}%; background-repeat: no-repeat;`,
                fallbackEmoji: cfg.fallbackEmoji
            };
        }

        function getPetGearBonus(pet) {
            ensurePetGears(pet);
            const g = pet.gears;
            const tier = pet.gearTier || 0;
            return {
                atk: g.claw * 6 + tier * 15,
                armorBreak: Math.floor(g.claw * 0.35) + tier,
                maxHp: g.armor * 25 + tier * 60,
                blockRate: Math.floor(g.armor * 0.35) + tier,
                speed: Math.floor(g.orb * 1.2) + tier * 3,
                critRate: Math.floor(g.orb * 0.35) + tier
            };
        }


// 4. DANH SÁCH THÚ / QUÁI, SPRITESHEET THÚ & BOSS, HÀO QUANG & TRẬN PHÁP ĐỘI HÌNH
        const allMonsters = [
            { id: 101, name: 'Gà Lửa', emoji: '🐔', element: 'Hoa', hp: 110, maxHp: 110, atk: 42, speed: 62 },
            { id: 102, name: 'Heo Hồng', emoji: '🐖', element: 'Tho', hp: 155, maxHp: 155, atk: 38, speed: 45 },
            { id: 103, name: 'Chuột Xám', emoji: '🐭', element: 'Thuy', hp: 100, maxHp: 100, atk: 44, speed: 88 },
            { id: 104, name: 'Kiến Lửa', emoji: '🐜', element: 'Hoa', hp: 105, maxHp: 105, atk: 48, speed: 76 },
            { id: 105, name: 'Ong Vàng', emoji: '🐝', element: 'Moc', hp: 100, maxHp: 100, atk: 50, speed: 92 },
            { id: 201, name: 'Chó Husky', emoji: '🐕', element: 'Thuy', hp: 145, maxHp: 145, atk: 56, speed: 74 },
            { id: 202, name: 'Rùa Xanh', emoji: '🐢', element: 'Thuy', hp: 190, maxHp: 190, atk: 45, speed: 40 },
            { id: 203, name: 'Bướm Lam', emoji: '🦋', element: 'Thuy', hp: 125, maxHp: 125, atk: 58, speed: 95 },
            { id: 301, name: 'Đại Bàng', emoji: '🦅', element: 'Kim', hp: 175, maxHp: 175, atk: 72, speed: 90 },
            { id: 302, name: 'Sói Tuyết', emoji: '🐺', element: 'Thuy', hp: 185, maxHp: 185, atk: 76, speed: 86 },
            { id: 303, name: 'Hồ Ly', emoji: '🦊', element: 'Hoa', hp: 185, maxHp: 185, atk: 76, speed: 86 }
      
        ];
        
        let currentWildMonster = null;

        // ==========================================
        // CẤU HÌNH 10 LINH THÚ SPRITE SHEET 5x8 (40 FRAMES)
        // ==========================================
        const petSpriteAssets = {};
        const spriteConfigs = {
            'Gà Lửa': {
                facing: 'right',
                singleSheet: true,
                sheet: 'assets/ga.webp',
                cols: 8, totalRows: 5,
                rowMap: { idle: 0, walk: 1, attack: 2, hit: 3, death: 4 },
                scale: 1.55
            },
            'Heo Hồng': {
                facing: 'right',
                singleSheet: true,
                sheet: 'assets/heo.webp',
                cols: 8, totalRows: 5,
                rowMap: { idle: 0, walk: 1, attack: 2, hit: 3, death: 4 },
                scale: 1.55
            },
            'Chuột Xám': {
                facing: 'right',
                singleSheet: true,
                sheet: 'assets/chuot.webp',
                cols: 8, totalRows: 5,
                rowMap: { idle: 0, walk: 1, attack: 2, hit: 3, death: 4 },
                scale: 1.5
            },
            'Kiến Lửa': {
                facing: 'right',
                singleSheet: true,
                sheet: 'assets/kien.webp',
                cols: 8, totalRows: 5,
                rowMap: { idle: 0, walk: 1, attack: 2, hit: 3, death: 4 },
                scale: 1.5
            },
            'Ong Vàng': {
                facing: 'right',
                singleSheet: true,
                sheet: 'assets/ong.webp',
                cols: 8, totalRows: 5,
                rowMap: { idle: 0, walk: 1, attack: 2, hit: 3, death: 4 },
                scale: 1.5
            },
            'Chó Husky': {
                facing: 'right',
                singleSheet: true,
                sheet: 'assets/cho.webp',
                cols: 8, totalRows: 5,
                rowMap: { idle: 0, walk: 1, attack: 2, hit: 3, death: 4 },
                scale: 1.65
            },
            'Rùa Xanh': {
                facing: 'right',
                singleSheet: true,
                sheet: 'assets/rua.webp',
                cols: 8, totalRows: 5,
                rowMap: { idle: 0, walk: 1, attack: 2, hit: 3, death: 4 },
                scale: 1.55
            },
            'Bướm Lam': {
                facing: 'right',
                singleSheet: true,
                sheet: 'assets/buom.webp',
                cols: 8, totalRows: 5,
                rowMap: { idle: 0, walk: 1, attack: 2, hit: 3, death: 4 },
                scale: 1.6
            },
            'Đại Bàng': {
                facing: 'right',
                singleSheet: true,
                sheet: 'assets/daibang.webp',
                cols: 8, totalRows: 5,
                rowMap: { idle: 0, walk: 1, attack: 2, hit: 3, death: 4 },
                scale: 1.7
            },
            'Hồ Ly': {
                facing: 'right',
                singleSheet: true,
                sheet: 'assets/holy.webp',
                cols: 8, totalRows: 5,
                rowMap: { idle: 0, walk: 1, attack: 2, hit: 3, death: 4 },
                scale: 1.7
            },
            'Sói Tuyết': {
                facing: 'right',
                singleSheet: true,
                sheet: 'assets/meo.webp',
                cols: 8, totalRows: 5,
                rowMap: { idle: 0, walk: 1, attack: 2, hit: 3, death: 4 },
                scale: 1.7
            }
        };

        function preloadPetSprites() {
            for (let petName in spriteConfigs) {
                petSpriteAssets[petName] = {};
                let cfg = spriteConfigs[petName];
                if (cfg.singleSheet && cfg.sheet) {
                    let img = new Image();
                    img.src = cfg.sheet;
                    petSpriteAssets[petName].sheet = img;
                }
            }
        }
        preloadPetSprites();

        // ==========================================
        // CẤU HÌNH PNG SPRITE CHO BOSS & THỦ VỆ THÁP
        // ==========================================
        const bossSpriteAssets = {};
        const bossSpriteConfigs = {
            'Hydra': {
                displayName: 'Hydra',
                element: 'Moc',
                facing: 'left',
                singleSheet: true,
                sheet: 'assets_boss/Hydra.webp',
                cols: 8, totalRows: 5,
                rowMap: { idle: 0, walk: 1, attack: 2, hit: 3, death: 4 },
                scale: 2.0
            },
            'Cerberus': {
                displayName: 'Cerberus',
                element: 'Tho',
                facing: 'left',
                singleSheet: true,
                sheet: 'assets_boss/Cerberus.webp',
                cols: 8, totalRows: 5,
                rowMap: { idle: 0, walk: 1, attack: 2, hit: 3, death: 4 },
                scale: 2.0
            },
            'Chupacabra': {
                displayName: 'Chupacabra',
                element: 'Moc',
                facing: 'left',
                singleSheet: true,
                sheet: 'assets_boss/Chupacabra.webp',
                cols: 8, totalRows: 5,
                rowMap: { idle: 0, walk: 1, attack: 2, hit: 3, death: 4 },
                scale: 2.0
            },
            'Muỗi địa ngục': {
                displayName: 'Quái Vật muỗi',
                element: 'Thuy',
                facing: 'left',
                singleSheet: true,
                sheet: 'assets_boss/muoidianguc.webp',
                cols: 8, totalRows: 5,
                rowMap: { idle: 0, walk: 1, attack: 2, hit: 3, death: 4 },
                scale: 2.0
            },
            'Golem': {
                displayName: 'Golem',
                element: 'Thuy',
                facing: 'left',
                singleSheet: true,
                sheet: 'assets_boss/golem.webp',
                cols: 10, totalRows: 5,
                rowMap: { idle: 0, walk: 1, attack: 2, hit: 3, death: 4 },
                scale: 2.0
            },
            'Rồng Lửa': {
                displayName: 'Quái Vật Rồng Lửa',
                element: 'Thuy',
                facing: 'left',
                singleSheet: true,
                sheet: 'assets_boss/ronglua.webp',
                cols: 10, totalRows: 5,
                rowMap: { idle: 0, walk: 1, attack: 2, hit: 3, death: 4 },
                scale: 2.0
            },
            'Dingonek': {
                displayName: 'Dingonek',
                element: 'Thuy',
                facing: 'right',
                singleSheet: true,
                sheet: 'assets_boss/Dingonek.webp',
                cols: 8, totalRows: 5,
                rowMap: { idle: 0, walk: 1, attack: 2, hit: 3, death: 4 },
                scale: 2.0
            }
        };

        // Tự động phân tích khung hình đầu tiên của Boss xem mặt đang hướng trái hay phải
        function detectBossFacingDirection(img, cfg) {
            try {
                const totalRows = cfg.totalRows || 5;
                const cols = cfg.cols || (Math.round((img.naturalWidth / img.naturalHeight) * totalRows) >= 9 ? 10 : 8);
                const fw = Math.floor(img.naturalWidth / cols);
                const fh = Math.floor(img.naturalHeight / totalRows);

                const tmpCanvas = document.createElement('canvas');
                tmpCanvas.width = fw;
                tmpCanvas.height = fh;
                const tmpCtx = tmpCanvas.getContext('2d', { willReadFrequently: true });
                tmpCtx.drawImage(img, 0, 0, fw, fh, 0, 0, fw, fh);

                const data = tmpCtx.getImageData(0, 0, fw, fh).data;
                let leftMass = 0, rightMass = 0;
                const midX = fw / 2;

                // Quét nửa trên khung hình (vùng đầu & thân trên của Boss)
                const scanMaxY = Math.floor(fh * 0.65);
                for (let y = 0; y < scanMaxY; y++) {
                    for (let x = 0; x < fw; x++) {
                        const alpha = data[(y * fw + x) * 4 + 3];
                        if (alpha > 40) {
                            const dist = Math.abs(x - midX);
                            if (x < midX) leftMass += dist;
                            else rightMass += dist;
                        }
                    }
                }
                // Phần đầu/mõm nhô ra xa tâm hơn -> Boss đang hướng về phía đó
                return leftMass > rightMass ? 'left' : 'right';
            } catch (e) {
                return cfg.facing || 'right';
            }
        }

        function preloadBossSprites() {
            for (let bossKey in bossSpriteConfigs) {
                bossSpriteAssets[bossKey] = {};
                let cfg = bossSpriteConfigs[bossKey];
                if (cfg.singleSheet && cfg.sheet) {
                    let img = new Image();
                    img.onload = () => {
                        if (!cfg.lockFacing) {
                            cfg.detectedFacing = detectBossFacingDirection(img, cfg);
                        }
                    };
                    img.src = cfg.sheet;
                    bossSpriteAssets[bossKey].sheet = img;
                } else {
                    ['idle', 'walk', 'attack', 'hit', 'death'].forEach(state => {
                        if (cfg[state]) {
                            let img = new Image();
                            img.src = cfg[state];
                            bossSpriteAssets[bossKey][state] = img;
                        }
                    });
                }
            }
        }
        preloadBossSprites();

        // ==========================================
        // HỆ THỐNG HIỆU ỨNG TRẠNG THÁI (assets/magic.jpg - 5x8)
        // ==========================================
        const statusFxImg = new Image();
        statusFxImg.src = 'assets/magic.webp';

        const statusFxRowMap = {
            stun: 0,    // Hàng 1: Choáng (Sao vàng xoay)
            poison: 1,  // Hàng 2: Trúng Độc (Bong bóng tím xanh)
            burn: 2,    // Hàng 3: Thiêu Đốt (Lửa cháy)
            slow: 3,    // Hàng 4: Làm Chậm (Băng tuyết)
            shield: 4   // Hàng 5: Buff Giáp (Khiên lục giác xanh)
        };

        function drawSpriteStatusFX(ctx, st, x, y, tick, size = 140) {
            if (!st || !statusFxImg.complete || statusFxImg.naturalWidth === 0) return;

            const cols = 8;
            const totalRows = 5;
            const fw = statusFxImg.naturalWidth / cols;
            const fh = statusFxImg.naturalHeight / totalRows;
            const col = Math.floor(tick * 2.5) % cols;

            ['shield', 'slow', 'burn', 'poison', 'stun'].forEach(type => {
                if (st[type] > 0) {
                    const row = statusFxRowMap[type];
                    let offsetY = 0;
                    let drawSize = size;
                    if (type === 'stun') {
                        offsetY = -size * 0.18; // Hạ nhẹ xuống để vòng sao nằm vừa khít trên đỉnh đầu nhân vật
                        drawSize = size * 0.95;
                    } else if (type === 'slow' || type === 'burn') {
                        offsetY = size * 0.12;
                    }

                    ctx.save();
                    ctx.globalCompositeOperation = 'screen';
                    ctx.drawImage(
                        statusFxImg,
                        col * fw, row * fh, fw, fh,
                        x - drawSize / 2, (y + offsetY) - drawSize / 2, drawSize, drawSize
                    );
                    ctx.restore();
                }
            });
        }

        function drawBossEntity(ctx, enemy, state, frameIndex, x, y, size = 90) {
            let bossKey = enemy.spriteKey;
            let cfg = bossKey ? bossSpriteConfigs[bossKey] : null;
            if (!cfg) return;

            // Ưu tiên hướng tự động nhận diện; nếu ảnh hướng phải ('right') thì tự lật sang trái ('left') để đối mặt với đội hình
            const actualFacing = cfg.detectedFacing || cfg.facing || 'right';
            let needFlip = (actualFacing !== 'left');
            let drawW = size * (cfg.scale || 1);
            let drawH = size * (cfg.scale || 1);

            if (cfg.singleSheet) {
                let img = bossSpriteAssets[bossKey]?.sheet;
                if (img && img.complete && img.naturalWidth > 0) {
                    let totalRows = cfg.totalRows || 5;
                    let cols = cfg.cols || (Math.round((img.naturalWidth / img.naturalHeight) * totalRows) >= 9 ? 10 : 8);
                    let row = (cfg.rowMap && cfg.rowMap[state] !== undefined) ? cfg.rowMap[state] : 0;
                    let col = frameIndex % cols;

                    let fw = img.naturalWidth / cols;
                    let fh = img.naturalHeight / totalRows;

                    // Chỉ cắt gọt nhẹ nếu cấu hình có khai báo riêng, mặc định lấy trọn vẹn 100% ô
                    let padTop = fh * (cfg.padTop ?? 0);
                    let padBottom = fh * (cfg.padBottom ?? 0);
                    let padX = fw * (cfg.padX ?? 0);

                    let sx = col * fw + padX;
                    let sy = row * fh + padTop;
                    let sw = fw - padX * 2;
                    let sh = fh - padTop - padBottom;

                    // Giữ đúng tỷ lệ gốc của ô frame để không bao giờ bị mất đuôi hay mất tia phép
                    let aspect = sw / sh;
                    let finalH = size * (cfg.scale || 1);
                    let finalW = finalH * aspect;

                    ctx.save();
                    ctx.translate(x, y);
                    if (needFlip) ctx.scale(-1, 1);
                    ctx.drawImage(img, sx, sy, sw, sh, -finalW / 2, -finalH / 2, finalW, finalH);
                    ctx.restore();
                    return;
                }
            }

            let actualState = state;
            let img = bossSpriteAssets[bossKey]?.[actualState];
            if (!img || !img.complete || img.naturalWidth === 0) {
                actualState = cfg.idle ? 'idle' : 'walk';
                img = bossSpriteAssets[bossKey]?.[actualState];
            }

            if (img && img.complete && img.naturalWidth > 0) {
                let grid = getSpriteGrid(cfg, actualState);
                let safeFrame = frameIndex % grid.totalFrames;
                let col = safeFrame % grid.cols;
                let row = Math.floor(safeFrame / grid.cols);

                let fw = img.naturalWidth / grid.cols;
                let fh = img.naturalHeight / grid.rows;
                let sx = col * fw;
                let sy = row * fh;

                ctx.save();
                ctx.translate(x, y);
                if (needFlip) ctx.scale(-1, 1);
                ctx.drawImage(img, sx, sy, fw, fh, -drawW / 2, -drawH / 2, drawW, drawH);
                ctx.restore();
            } else {
                ctx.save();
                ctx.translate(x, y);
                ctx.font = "65px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(enemy.emoji || '👹', 0, 0);
                ctx.restore();
            }
        }

        let globalSpriteFrame = 0;
        setInterval(() => {
            globalSpriteFrame = (globalSpriteFrame + 1) % 120;
            document.querySelectorAll('.animated-sprite-box').forEach(el => {
                let cols = parseInt(el.dataset.cols) || 4;
                let rows = parseInt(el.dataset.rows) || 4;
                let total = parseInt(el.dataset.total) || 16;
                let fixedRow = el.dataset.fixedRow !== undefined ? parseInt(el.dataset.fixedRow) : -1;

                let f = globalSpriteFrame % total;
                let col = f % cols;
                let row = fixedRow >= 0 ? fixedRow : Math.floor(f / cols);
                let posX = cols > 1 ? (col / (cols - 1)) * 100 : 0;
                let posY = rows > 1 ? (row / (rows - 1)) * 100 : 0;
                el.style.backgroundPosition = `${posX}% ${posY}%`;
            });
        }, 85);

        function getSpriteGrid(cfg, state) {
            if (cfg && cfg.singleSheet) {
                return {
                    cols: cfg.cols || 8,
                    rows: cfg.totalRows || 5,
                    totalFrames: cfg.cols || 8,
                    fixedRow: (cfg.rowMap && cfg.rowMap[state] !== undefined) ? cfg.rowMap[state] : 0
                };
            }
            if (cfg && cfg.grids && cfg.grids[state]) {
                return cfg.grids[state];
            }
            return {
                cols: cfg.cols || 4,
                rows: cfg.rows || 4,
                totalFrames: cfg.totalFrames || 16
            };
        }

        function isPetSpriteReady(petName) {
            let baseName = petName.replace('F1_', '');
            let cfg = spriteConfigs[baseName];
            if (!cfg || !petSpriteAssets[baseName]) return false;
            if (cfg.singleSheet) {
                let img = petSpriteAssets[baseName].sheet;
                return !!(img && img.complete && img.naturalWidth > 0);
            }
            return ['idle', 'walk', 'attack'].some(st => {
                let img = petSpriteAssets[baseName][st];
                return img && img.complete && img.naturalWidth > 0;
            });
        }

        function getPetSpriteHtml(pet, state = 'walk', sizePx = 56, extraClass = '') {
            let baseName = pet.name.replace('F1_', '');
            let cfg = spriteConfigs[baseName];
            if (cfg && isPetSpriteReady(baseName)) {
                let actualState = cfg.singleSheet ? state : (cfg[state] ? state : (cfg.walk ? 'walk' : (cfg.idle ? 'idle' : 'attack')));
                let imgUrl = cfg.singleSheet ? cfg.sheet : cfg[actualState];
                let grid = getSpriteGrid(cfg, actualState);
                let rowAttr = grid.fixedRow !== undefined ? `data-fixed-row="${grid.fixedRow}"` : '';
                return `<div class="animated-sprite-box ${extraClass}" data-cols="${grid.cols}" data-rows="${grid.rows}" data-total="${grid.totalFrames}" ${rowAttr} style="width:${sizePx}px; height:${sizePx}px; display:inline-block; background-image:url('${imgUrl}'); background-size:${grid.cols * 100}% ${grid.rows * 100}%; background-position:0% 0%; background-repeat:no-repeat; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.8));"></div>`;
            }
            return `<span class="${extraClass}" style="font-size:${Math.floor(sizePx * 0.72)}px; line-height:1;">${pet.emoji}</span>`;
        }

        // ==========================================
        // NẠP & VẼ HÀO QUANG 8 FRAME TỪ assets/auras.webp (5 HÀNG x 8 CỘT)
        // ==========================================
        const auraSheetImg = new Image();
        let auraSheetLoaded = false;
        auraSheetImg.onload = () => { auraSheetLoaded = true; };
        auraSheetImg.src = 'assets/auras.webp';

        // Ánh xạ tên phẩm chất sang vị trí HÀNG (row 0 -> 4) trong tấm auras.png
        const RARITY_AURA_ROW = {
            'Thường': 0,       // Hàng 0: Trắng Bạc
            'Hiếm': 1,         // Hàng 1: Xanh Ngọc
            'Cực Hiếm': 2,     // Hàng 2: Vàng Kim
            'Huyền Thoại': 3,  // Hàng 3: Đỏ Huyết Long
            'Thần Thánh': 4    // Hàng 4: Tím Vô Cực
        };

        const RARITY_AURA_FALLBACK = {
            'Thường': '#e2e8f0',
            'Hiếm': '#10b981',
            'Cực Hiếm': '#f59e0b',
            'Huyền Thoại': '#ef4444',
            'Thần Thánh': '#a855f7'
        };

        function drawRarityAura(ctx, pet, x, footY, tick, radiusX = 42) {
            if (!pet) return;
            const rarityName = pet.rarity?.name || 'Thường';
            const row = RARITY_AURA_ROW[rarityName] ?? 0;

            ctx.save();
            ctx.globalCompositeOperation = 'source-over';

            if (auraSheetLoaded && auraSheetImg.naturalWidth > 0) {
                const rows = 5;
                const cols = 8;
                const frameW = auraSheetImg.naturalWidth / cols;
                const frameH = auraSheetImg.naturalHeight / rows;

                // Chạy tuần tự 8 frame (cột 0 -> 7) theo nhịp tick của trận đấu
                const col = Math.floor(tick * 3.5) % cols;

                const drawW = radiusX * 2.3;
                const drawH = drawW * (frameH / frameW);

                ctx.drawImage(
                    auraSheetImg,
                    col * frameW, row * frameH, frameW, frameH, // Cắt đúng (hàng phẩm chất, cột frame 0..7)
                    x - drawW / 2, footY - drawH * 0.55, drawW, drawH
                );
            } else {
                // Dự phòng khi ảnh chưa load xong
                const pulse = 1 + Math.sin(tick * 2.5) * 0.06;
                const color = RARITY_AURA_FALLBACK[rarityName] || '#e2e8f0';
                ctx.beginPath();
                ctx.ellipse(x, footY, radiusX * pulse, radiusX * 0.36 * pulse, 0, 0, Math.PI * 2);
                ctx.strokeStyle = color;
                ctx.lineWidth = 2.5;
                ctx.stroke();
            }

            ctx.restore();
        }

        // ==========================================
        // CỘNG HƯỞNG ĐỘI HÌNH 3 THÚ (TEAM SYNERGY)
        // ==========================================
        function getTeamSynergy(teamList) {
            if (!teamList || teamList.length < 3) return null;
            const elems = teamList.slice(0, 3).map(p => p.element);
            const uniqueElems = new Set(elems);

            // 1. Thuần Hệ Cuồng Nộ (3 thú cùng 1 hệ)
            if (uniqueElems.size === 1) {
                return {
                    id: 'pure',
                    name: '🔥 Thuần Hệ Cuồng Nộ',
                    desc: '+30% Sát thương toàn đội',
                    color: '#f97316',
                    glow: 'rgba(249, 115, 22, 0.25)'
                };
            }

            // 2. Kiểm tra Ngũ Hành Tương Sinh (Kim->Thủy->Mộc->Hỏa->Thổ->Kim)
           const genMap = { 'Kim': 'Thuy', 'Thuy': 'Moc', 'Moc': 'Hoa', 'Hoa': 'Tho', 'Tho': 'Kim' };
            let genLinks = 0;
            for (let i = 0; i < elems.length; i++) {
                for (let j = 0; j < elems.length; j++) {
                    if (i !== j && genMap[elems[i]] === elems[j]) genLinks++;
                }
            }
            if (genLinks >= 2) {
                return {
                    id: 'sheng',
                    name: '♻️ Ngũ Hành Tương Sinh',
                    desc: 'Hồi 8% HP mỗi hiệp cho cả đội',
                    color: '#10b981',
                    glow: 'rgba(16, 185, 129, 0.25)'
                };
            }

            // 3. Tam Hoa Tụ Đỉnh (3 thú thuộc 3 hệ khác nhau)
            if (uniqueElems.size === 3) {
                return {
                    id: 'triad',
                    name: '🌈 Tam Hoa Tụ Đỉnh',
                    desc: '+15% Tốc độ & +15% Chí mạng',
                    color: '#38bdf8',
                    glow: 'rgba(56, 189, 248, 0.25)'
                };
            }

            return null;
        }

        function drawTeamSynergyField(ctx, synergy, positions, tick) {
            if (!synergy || !positions || positions.length < 3) return;
            ctx.save();
            ctx.globalCompositeOperation = 'screen';

            // Vẽ tia năng lượng nối liền chân 3 linh thú thành tam giác trận pháp
            ctx.beginPath();
            ctx.moveTo(positions[0].x, positions[0].y + 34);
            ctx.lineTo(positions[1].x, positions[1].y + 34);
            ctx.lineTo(positions[2].x, positions[2].y + 34);
            ctx.closePath();

            ctx.fillStyle = synergy.glow;
            ctx.fill();

            ctx.strokeStyle = synergy.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 6]);
            ctx.lineDashOffset = -tick * 12;
            ctx.stroke();

            ctx.restore();
        }
        
        function drawPetEntity(ctx, pet, state, frameIndex, x, y, size = 85, flipLeft = false) {
            let baseName = pet.name.replace('F1_', '');
            let cfg = spriteConfigs[baseName];
            let drawW = size * (cfg?.scale || 1);
            let drawH = size * (cfg?.scale || 1);

            let shouldFlip = cfg ? (flipLeft ? (cfg.facing !== 'left') : (cfg.facing === 'left')) : flipLeft;

            if (cfg && cfg.singleSheet) {
                let img = petSpriteAssets[baseName]?.sheet;
                if (img && img.complete && img.naturalWidth > 0) {
                    let cols = cfg.cols || 8;
                    let totalRows = cfg.totalRows || 5;
                    let row = (cfg.rowMap && cfg.rowMap[state] !== undefined) ? cfg.rowMap[state] : 0;
                    let col = frameIndex % cols;

                    let fw = img.naturalWidth / cols;
                    let fh = img.naturalHeight / totalRows;
                    let sx = col * fw;
                    let sy = row * fh;

                    ctx.save();
                    ctx.translate(x, y);
                    if (shouldFlip) ctx.scale(-1, 1);
                    ctx.drawImage(img, sx, sy, fw, fh, -drawW / 2, -drawH / 2, drawW, drawH);
                    ctx.restore();
                    return;
                }
            }

            let actualState = state;
            let img = petSpriteAssets[baseName] ? petSpriteAssets[baseName][actualState] : null;

            if (cfg && (!img || !img.complete || img.naturalWidth === 0)) {
                actualState = cfg.idle ? 'idle' : (cfg.walk ? 'walk' : 'attack');
                img = petSpriteAssets[baseName] ? petSpriteAssets[baseName][actualState] : null;
            }

            if (cfg && img && img.complete && img.naturalWidth > 0) {
                let grid = getSpriteGrid(cfg, actualState);
                let safeFrame = frameIndex % grid.totalFrames;
                let col = safeFrame % grid.cols;
                let row = Math.floor(safeFrame / grid.cols);

                let fw = img.naturalWidth / grid.cols;
                let fh = img.naturalHeight / grid.rows;
                let sx = col * fw;
                let sy = row * fh;

                ctx.save();
                ctx.translate(x, y);
                if (shouldFlip) ctx.scale(-1, 1);
                ctx.drawImage(img, sx, sy, fw, fh, -drawW / 2, -drawH / 2, drawW, drawH);
                ctx.restore();
            } else {
                ctx.save();
                ctx.translate(x, y);
                if (flipLeft) ctx.scale(-1, 1);
                ctx.font = `${Math.floor(size * 0.65)}px sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(pet.emoji, 0, 0);
                ctx.restore();
            }
        }


// 5. HÀM BỔ TRỢ TÍNH GIÁ BÁN & HỒI PHỤC LINH THÚ
window.PET_SELL_PRICE_BY_RARITY = {
    'Thường': 50,
    'Hiếm': 100,
    'Cực Hiếm': 150,
    'Huyền Thoại': 200,
    'Thần Thánh': 350
};

window.getPetSellPrice = function(pet) {
    const rarityName = pet?.rarity?.name || 'Thường';
    return window.PET_SELL_PRICE_BY_RARITY[rarityName] ?? 50;
};
