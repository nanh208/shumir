// Constants.mjs — TỔNG HỢP CẤU HÌNH GAME

// === 1. VISUALS & EMOJIS ===
export const EMOJIS = {
    PET_ICONS: [
        '<:Rayquaza:1440702434644070533>', '<:kiuri:1440702420094156851>', '<:HuTao:1440702400611618890>',
        '<a:source:1440702357523660820>', '<a:pikachu:1440702320290824364>', '<:Furina:1440702288032436460>',
        '<a:Keqing:1440702273801027695>', '<a:Paimon:1440702251302781040>',
        '<a:baf5c89c099b34decb7f4507b5144366:1440702202762231828>', '<a:hutao:1434904266597732473>',
        '<a:Klee:1434903983323086939>', '<a:Rem:1434903876590637086>'
    ],
    CANDY_NORMAL: '🍬',
    CANDY_HIGH: '🍭',
    CANDY_SUPER: '🍮',
    BOX_COMMON: '📦',
    BOX_MYTHIC: '👑',
    BALL: '🔴',
    SWORD: '⚔️',
    SHIELD: '🛡️',
    HEART: '❤️',
    MANA: '💧',
    SPEED: '⚡',
    STAR: '⭐'
};

// Alias để tương thích code cũ
export const PET_ICONS = EMOJIS.PET_ICONS;

export const RARITY_COLORS = {
    'Common': 0x808080, 'Uncommon': 0x00FF00, 'Rare': 0x0099FF,
    'Epic': 0x9900FF, 'Legendary': 0xFFD700, 'Mythic': 0xFF0000
};

// === 2. RARITY CONFIG (Cấu hình Phẩm chất) ===
export const RARITY = {
    COMMON: 'Common', UNCOMMON: 'Uncommon', RARE: 'Rare',
    EPIC: 'Epic', LEGENDARY: 'Legendary', MYTHIC: 'Mythic'
};

export const RARITY_CONFIG = {
    [RARITY.COMMON]:    { rank: 1, statMultiplier: 1.0, maxLevel: 100, ballRate: 0.50, spawnRate: 0.45, color: RARITY_COLORS.Common, icon: '⚪' },
    [RARITY.UNCOMMON]:  { rank: 2, statMultiplier: 1.2, maxLevel: 100, ballRate: 0.60, spawnRate: 0.25, color: RARITY_COLORS.Uncommon, icon: '🌿' },
    [RARITY.RARE]:      { rank: 3, statMultiplier: 1.5, maxLevel: 100, ballRate: 0.65, spawnRate: 0.15, color: RARITY_COLORS.Rare, icon: '💧' },
    [RARITY.EPIC]:      { rank: 4, statMultiplier: 1.8, maxLevel: 100, ballRate: 0.70, spawnRate: 0.10, color: RARITY_COLORS.Epic, icon: '🔥' },
    [RARITY.LEGENDARY]: { rank: 5, statMultiplier: 2.4, maxLevel: 100, ballRate: 1.00, spawnRate: 0.04, color: RARITY_COLORS.Legendary, icon: '✨', bonusCap: 200 },
    [RARITY.MYTHIC]:    { rank: 6, statMultiplier: 3.2, maxLevel: 100, ballRate: 1.00, spawnRate: 0.01, color: RARITY_COLORS.Mythic, icon: '👑', bonusCap: 200 }
};

export const RARITY_WEIGHTS = Object.entries(RARITY_CONFIG).map(([key, val]) => ({
    rarity: key, weight: val.spawnRate
}));

// Tương thích với logic SpawnSystem cũ (Giữ lại nếu có module cũ sử dụng)
// Tỷ lệ SpawnRate nên được lấy từ RARITY_CONFIG.spawnRate
export const WILD_SPAWN_RATES = {
    [RARITY.COMMON]: RARITY_CONFIG.Common.spawnRate,
    [RARITY.UNCOMMON]: RARITY_CONFIG.Uncommon.spawnRate,
    [RARITY.RARE]: RARITY_CONFIG.Rare.spawnRate,
    [RARITY.EPIC]: RARITY_CONFIG.Epic.spawnRate,
    [RARITY.LEGENDARY]: RARITY_CONFIG.Legendary.spawnRate,
    [RARITY.MYTHIC]: RARITY_CONFIG.Mythic.spawnRate
};

export const HOURLY_SPAWN_CHANCE = {
    [RARITY.LEGENDARY]: 0.70,
    [RARITY.MYTHIC]: 0.30
};

// === 3. ELEMENTS (Hệ Nguyên Tố) ===
export const ELEMENTS = {
    FIRE: 'Fire', WATER: 'Water', GRASS: 'Grass',
    ELECTRIC: 'Electric', ICE: 'Ice', EARTH: 'Earth',
    WIND: 'Wind', LIGHT: 'Light', DARK: 'Dark', DRAGON: 'Dragon', PHYSICAL: 'Physical'
};

export const ELEMENT_ICONS = {
    [ELEMENTS.FIRE]: '🔥', [ELEMENTS.WATER]: '💧', [ELEMENTS.GRASS]: '🍃',
    [ELEMENTS.ELECTRIC]: '⚡', [ELEMENTS.ICE]: '❄️', [ELEMENTS.EARTH]: '🪨',
    [ELEMENTS.WIND]: '💨', [ELEMENTS.LIGHT]: '☀️', [ELEMENTS.DARK]: '🌑',
    [ELEMENTS.DRAGON]: '🐲', [ELEMENTS.PHYSICAL]: '👊'
};

// Bảng lợi thế (Advantage)
export const ELEMENT_ADVANTAGE = {
    [ELEMENTS.WATER]: { advantage: ['Fire'], disadvantage: ['Grass', 'Electric'] },
    [ELEMENTS.FIRE]: { advantage: ['Grass', 'Ice'], disadvantage: ['Water', 'Earth'] },
    [ELEMENTS.GRASS]: { advantage: ['Water', 'Earth'], disadvantage: ['Fire', 'Wind'] },
    [ELEMENTS.ELECTRIC]: { advantage: ['Water', 'Wind'], disadvantage: ['Earth'] },
    [ELEMENTS.ICE]: { advantage: ['Dragon', 'Grass'], disadvantage: ['Fire'] },
    [ELEMENTS.EARTH]: { advantage: ['Electric', 'Fire'], disadvantage: ['Water', 'Grass'] },
    [ELEMENTS.WIND]: { advantage: ['Grass'], disadvantage: ['Ice'] },
    [ELEMENTS.LIGHT]: { advantage: ['Dark'], disadvantage: ['Dragon'] },
    [ELEMENTS.DARK]: { advantage: ['Light'], disadvantage: ['Light'] },
    [ELEMENTS.DRAGON]: { advantage: ['Dragon'], disadvantage: ['Ice', 'Dragon'] },
    // ⚡️ CHUẨN HÓA: Thêm Physical vào Element Advantage (mặc định trung lập)
    [ELEMENTS.PHYSICAL]: { advantage: [], disadvantage: [] }
};

// Tự động tạo bảng Multipliers để tương thích với BattleManager
export const ELEMENT_MULTIPLIERS = {};
for (const atk of Object.values(ELEMENTS)) {
    ELEMENT_MULTIPLIERS[atk] = {};
    if (ELEMENT_ADVANTAGE[atk]) {
        ELEMENT_ADVANTAGE[atk].advantage?.forEach(def => ELEMENT_MULTIPLIERS[atk][def] = 1.5);
        ELEMENT_ADVANTAGE[atk].disadvantage?.forEach(def => ELEMENT_MULTIPLIERS[atk][def] = 0.5);
    }
}

// === 4. LEVEL & STATS ===
export const LEVEL_CONFIG = {
    BASE_XP: 100,
    XP_MULTIPLIER: 1.15,
    POINTS_PER_LEVEL: 3 // Cập nhật dựa trên Pet.mjs
};

export const STAT_LIMITS = {
    HP_MAX: 10000, MP_MAX: 5000, ATK_MAX: 2000, SATK_MAX: 2000, SPD_MAX: 1000, DEF_MAX: 1000,
    HP_START: 200, MP_START: 50, XP_BASE: 100, XP_MULTIPLIER: 1.15,
    PET_ICONS: EMOJIS.PET_ICONS
};

// === 5. RACES (Tộc Hệ) ===
export const RACES = {
    HUMAN: { name: 'Human', buff: { hp: 0.10, mp: 0.10 } },
    DWARF: { name: 'Dwarf', buff: { def: 0.20, hp: 0.05 } },
    ELF:   { name: 'Elf', buff: { satk: 0.15, spd: 0.05 } },
    ORC:   { name: 'Orc', buff: { atk: 0.15, hp: 0.05 } },
    DRAGON: { name: 'Dragon', buff: { atk: 0.15, satk: 0.10 } },
    BEAST: { name: 'Beast', buff: { spd: 0.10, atk: 0.10 } },
    ELEMENTAL: { name: 'Elemental', buff: { satk: 0.20 } },
    UNKNOWN: { name: 'Unknown', buff: {} }
};

// === 6. ITEMS & CATCH BALLS (Quan trọng cho hệ thống bắt) ===
export const CANDIES = {
    NORMAL: { name: 'Kẹo Bình Thường', xp: 50, emoji: EMOJIS.CANDY_NORMAL }, // ⚡️ CHUẨN HÓA XP
    HIGH:   { name: 'Kẹo Cao Cấp', xp: 200, emoji: EMOJIS.CANDY_HIGH },  // ⚡️ CHUẨN HÓA XP
    SUPER:  { name: 'Kẹo Siêu Cấp', xp: 2000, emoji: EMOJIS.CANDY_SUPER } // ⚡️ CHUẨN HÓA XP
};

// Đảm bảo tên biến CATCH_BALLS khớp với BattleManager import
export const CATCH_BALLS = {
    Common: { name: 'Bóng Thường', successRate: 0.50, dropRate: 1.00, icon: EMOJIS.BALL },
    Uncommon: { name: 'Bóng Tốt', successRate: 0.60, dropRate: 0.50, icon: '🟢' },
    Rare:   { name: 'Bóng Hiếm', successRate: 0.65, dropRate: 0.20, icon: '🔵' },
    Epic:   { name: 'Bóng Sử Thi', successRate: 0.70, dropRate: 0.10, icon: '🟣' },
    Legendary: { name: 'Bóng Huyền Thoại', successRate: 1.00, dropRate: 0.05, icon: '🟠' }
};

// === 7. PET TEMPLATES ===
export const PET_TEMPLATES = [
    { name: "Pika-Chu", race: "BEAST", element: "ELECTRIC", baseHP: 1000, baseMP: 500, baseATK: 105, baseSATK: 110, baseDEF: 100, baseSPD: 120 },
    { name: "Dragonoid", race: "DRAGON", element: "DRAGON", baseHP: 1200, baseMP: 600, baseATK: 125, baseSATK: 125, baseDEF: 110, baseSPD: 100 },
    { name: "Slime", race: "ELEMENTAL", element: "WATER", baseHP: 1500, baseMP: 400, baseATK: 95, baseSATK: 95, baseDEF: 100, baseSPD: 80 },
    { name: "Knight", race: "HUMAN", element: "PHYSICAL", baseHP: 1100, baseMP: 450, baseATK: 115, baseSATK: 90, baseDEF: 105, baseSPD: 95 },
    { name: "Spirit", race: "ELF", element: "WIND", baseHP: 900, baseMP: 800, baseATK: 100, baseSATK: 130, baseDEF: 95, baseSPD: 110 },
    { name: "Golem", race: "DWARF", element: "EARTH", baseHP: 1800, baseMP: 300, baseATK: 90, baseSATK: 90, baseDEF: 150, baseSPD: 50 },
    { name: "Wisp", race: "ELEMENTAL", element: "FIRE", baseHP: 800, baseMP: 700, baseATK: 120, baseSATK: 130, baseDEF: 85, baseSPD: 130 },
    { name: "Shadow", race: "UNKNOWN", element: "DARK", baseHP: 1000, baseMP: 500, baseATK: 130, baseSATK: 110, baseDEF: 100, baseSPD: 115 }
];

// === 8. SKILLS ===
export const SKILLS = [
    // ⚡️ CHUẨN HÓA: Bỏ trường 'type' và chỉ dùng 'damageType'
    { id: 'S1', name: 'Tát Nước', element: 'Water', damageType: 'MAGICAL', power: 25, multiplier: 1, manaCost: 10, rarity: 'Common' },
    { id: 'S2', name: 'Đốt Cháy', element: 'Fire', damageType: 'MAGICAL', power: 30, multiplier: 0.9, manaCost: 15, rarity: 'Common' },
    { id: 'S3', name: 'Hút Năng Lượng', element: 'Grass', damageType: 'MAGICAL', power: 15, multiplier: 1.2, manaCost: 20, rarity: 'Rare' },
    { id: 'S4', name: 'Đấm Mạnh', element: 'Physical', damageType: 'PHYSICAL', power: 20, multiplier: 1.0, manaCost: 5, rarity: 'Common' },
    { id: 'S5', name: 'Sấm Sét', element: 'Electric', damageType: 'MAGICAL', power: 40, multiplier: 0.8, manaCost: 25, rarity: 'Epic' },
    // ⚡️ THÊM: Skill Hồi máu (HEAL) và Skill Buff (BUFF)
    { id: 'S6', name: 'Sống Bền', element: 'Grass', damageType: 'HEAL', power: 0, multiplier: 1.0, manaCost: 20, rarity: 'Rare', effect: { type: 'HEAL', percent: 0.20 } }, // Hồi 20% HP
    { id: 'S7', name: 'Thiết Giáp', element: 'Physical', damageType: 'BUFF', power: 0, multiplier: 1.0, manaCost: 15, rarity: 'Rare', effect: { type: 'BUFF', name: 'Def Buff', stat: 'DEF', value: 0.25, turns: 3 } }, // Buff 25% DEF trong 3 lượt
];