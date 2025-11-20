// Constants.js

// === 1. EMOJI & HÌNH ẢNH ===
export const EMOJIS = {
    // Pet Icons (Random pool)
    PET_ICONS: [
        '<:Rayquaza:1440702434644070533>', '<:kiuri:1440702420094156851>', '<:HuTao:1440702400611618890>',
        '<a:source:1440702357523660820>', '<a:pikachu:1440702320290824364>', '<:Furina:1440702288032436460>',
        '<a:Keqing:1440702273801027695>', '<a:Paimon:1440702251302781040>',
        '<a:baf5c89c099b34decb7f4507b5144366:1440702202762231828>', '<a:hutao:1434904266597732473>',
        '<a:Klee:1434903983323086939>', '<a:Rem:1434903876590637086>'
    ],
    // Items
    CANDY_NORMAL: '🍬',
    CANDY_HIGH: '🍭',
    CANDY_SUPER: '🍮',
    BOX_COMMON: '📦',
    BOX_MYTHIC: '👑',
    BALL: '🔴',
    // UI
    SWORD: '⚔️',
    SHIELD: '🛡️',
    HEART: '❤️',
    MANA: '💧',
    SPEED: '⚡',
    STAR: '⭐'
};
export const RARITY_COLORS = {
    'Common': 0x808080,    // Xám
    'Uncommon': 0x00FF00,  // Xanh lá
    'Rare': 0x0099FF,      // Xanh dương
    'Epic': 0x9900FF,      // Tím
    'Legendary': 0xFFD700, // Vàng kim
    'Mythic': 0xFF0000     // Đỏ
};
// === 2. CẤU HÌNH CHỈ SỐ CƠ BẢN ===
// Giới hạn gốc (Trước khi cộng Rank)
export const BASE_CAPS = {
    HP: 1000, MP: 300, ATK: 100, SATK: 200, SPD: 100, DEF: 50
};

export const STAT_PER_LEVEL = 1; // Mỗi cấp được 1 điểm
export const MAX_LEVEL_BASE = 100;

// === 3. PHẨM CHẤT (RARITY) ===
export const RARITY = {
    COMMON: 'Common', UNCOMMON: 'Uncommon', RARE: 'Rare',
    EPIC: 'Epic', LEGENDARY: 'Legendary', MYTHIC: 'Mythic'
};

// Cấu hình Bonus theo Rarity
export const RARITY_CONFIG = {
    [RARITY.COMMON]:    { statCapBonus: 0,   maxLv: 100, ballRate: 0.50, spawnRate: 0.60 },
    [RARITY.UNCOMMON]:  { statCapBonus: 0,   maxLv: 100, ballRate: 0.60, spawnRate: 0.25 },
    [RARITY.RARE]:      { statCapBonus: 0,   maxLv: 100, ballRate: 0.65, spawnRate: 0.10 },
    [RARITY.EPIC]:      { statCapBonus: 100, maxLv: 100, ballRate: 0.70, spawnRate: 0.04 },
    [RARITY.LEGENDARY]: { statCapBonus: 200, maxLv: 120, ballRate: 1.00, spawnRate: 0.01 }, // Ví dụ Legendary cấp cao hơn xíu
    [RARITY.MYTHIC]:    { statCapBonus: 200, maxLv: 120, ballRate: 1.00, spawnRate: 0.001 }
};

// === 4. TỘC HỆ (RACES) ===
export const RACES = {
    HUMAN: 'Human', DWARF: 'Dwarf', ELF: 'Elf', ORC: 'Orc'
};
// Buff % theo tộc
export const RACE_BUFFS = {
    [RACES.HUMAN]: { HP: 0.05, MP: 0.05, SPD: 0.05, ATK: 0, SATK: 0, DEF: 0 },
    [RACES.DWARF]: { DEF: 0.15, HP: 0.10, MP: 0, SPD: -0.05, ATK: 0, SATK: 0 },
    [RACES.ELF]:   { SATK: 0.15, MP: 0.10, SPD: 0.05, HP: -0.05, ATK: 0, DEF: 0 },
    [RACES.ORC]:   { ATK: 0.15, HP: 0.10, DEF: -0.05, MP: 0, SATK: -0.10, SPD: 0 }
};

// === 5. NGUYÊN TỐ (ELEMENTS) ===
export const ELEMENTS = {
    WATER: 'Water', FIRE: 'Fire', GRASS: 'Grass',
    AIR: 'Air', EARTH: 'Earth', THUNDER: 'Thunder',
    PHYSICAL: 'Physical'
};

// Map khắc chế: Key thắng Value (Dame x1.5)
export const ELEMENT_ADVANTAGE = {
    [ELEMENTS.WATER]: [ELEMENTS.FIRE],
    [ELEMENTS.FIRE]: [ELEMENTS.GRASS],
    [ELEMENTS.GRASS]: [ELEMENTS.EARTH],
    [ELEMENTS.EARTH]: [ELEMENTS.THUNDER],
    [ELEMENTS.THUNDER]: [ELEMENTS.AIR],
    [ELEMENTS.AIR]: [ELEMENTS.WATER],
    [ELEMENTS.PHYSICAL]: [] // Vật lý trung tính
};

// === 6. ITEMS & REWARDS ===
export const CANDIES = {
    NORMAL: { name: 'Kẹo Bình Thường', xp: 200, emoji: EMOJIS.CANDY_NORMAL },
    HIGH:   { name: 'Kẹo Cao Cấp', xp: 1000, emoji: EMOJIS.CANDY_HIGH },
    SUPER:  { name: 'Kẹo Siêu Cấp', xp: 2000, emoji: EMOJIS.CANDY_SUPER }
};

export const CRATE_TYPES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];