// Constants.mjs

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

// Màu sắc cho Embed theo phẩm chất
export const RARITY_COLORS = {
    'Common': 0x808080,    // Xám
    'Uncommon': 0x00FF00,  // Xanh lá
    'Rare': 0x0099FF,      // Xanh dương
    'Epic': 0x9900FF,      // Tím
    'Legendary': 0xFFD700, // Vàng kim
    'Mythic': 0xFF0000     // Đỏ
};

// === 2. CẤU HÌNH CHỈ SỐ CƠ BẢN ===
export const BASE_CAPS = {
    HP: 1000, MP: 300, ATK: 100, SATK: 200, SPD: 100, DEF: 50
};

export const STAT_PER_LEVEL = 1;
export const MAX_LEVEL_BASE = 100;

// === 3. PHẨM CHẤT (RARITY) ===
export const RARITY = {
    COMMON: 'Common', UNCOMMON: 'Uncommon', RARE: 'Rare',
    EPIC: 'Epic', LEGENDARY: 'Legendary', MYTHIC: 'Mythic'
};

// Tỷ lệ xuất hiện (Dùng cho Spawn Logic)
export const RARITY_WEIGHTS = [
    { rarity: RARITY.MYTHIC, weight: 0.01 },     // 1%
    { rarity: RARITY.LEGENDARY, weight: 0.04 },  // 4%
    { rarity: RARITY.EPIC, weight: 0.10 },       // 10%
    { rarity: RARITY.RARE, weight: 0.15 },       // 15%
    { rarity: RARITY.UNCOMMON, weight: 0.25 },   // 25%
    { rarity: RARITY.COMMON, weight: 0.45 },     // 45%
];

// Cấu hình Bonus theo Rarity
export const RARITY_CONFIG = {
    [RARITY.COMMON]:    { statCapBonus: 0,   maxLv: 100, ballRate: 0.50, spawnRate: 0.60, color: RARITY_COLORS.Common, icon: '⚪' },
    [RARITY.UNCOMMON]:  { statCapBonus: 0,   maxLv: 100, ballRate: 0.60, spawnRate: 0.25, color: RARITY_COLORS.Uncommon, icon: '🌿' },
    [RARITY.RARE]:      { statCapBonus: 0,   maxLv: 100, ballRate: 0.65, spawnRate: 0.10, color: RARITY_COLORS.Rare, icon: '💧' },
    [RARITY.EPIC]:      { statCapBonus: 100, maxLv: 100, ballRate: 0.70, spawnRate: 0.04, color: RARITY_COLORS.Epic, icon: '🔥' },
    [RARITY.LEGENDARY]: { statCapBonus: 200, maxLv: 120, ballRate: 1.00, spawnRate: 0.01, color: RARITY_COLORS.Legendary, icon: '✨' },
    [RARITY.MYTHIC]:    { statCapBonus: 200, maxLv: 120, ballRate: 1.00, spawnRate: 0.001, color: RARITY_COLORS.Mythic, icon: '🌟' }
};

// === 4. TỘC HỆ (RACES) ===
export const RACES = {
    HUMAN: 'Human', DWARF: 'Dwarf', ELF: 'Elf', ORC: 'Orc', 
    DRAGON: 'Dragon', BEAST: 'Beast', ELEMENTAL: 'Elemental'
};

export const RACE_BUFFS = {
    [RACES.HUMAN]: { HP: 0.05, MP: 0.05, SPD: 0.05, ATK: 0, SATK: 0, DEF: 0 },
    [RACES.DWARF]: { DEF: 0.15, HP: 0.10, MP: 0, SPD: -0.05, ATK: 0, SATK: 0 },
    [RACES.ELF]:   { SATK: 0.15, MP: 0.10, SPD: 0.05, HP: -0.05, ATK: 0, DEF: 0 },
    [RACES.ORC]:   { ATK: 0.15, HP: 0.10, DEF: -0.05, MP: 0, SATK: -0.10, SPD: 0 },
    [RACES.DRAGON]: { ATK: 0.1, HP: 0.1, DEF: 0.1, SATK: 0.1, MP: 0, SPD: 0 },
    [RACES.BEAST]: { SPD: 0.15, ATK: 0.1, HP: 0.05, DEF: 0, SATK: -0.1, MP: 0 },
    [RACES.ELEMENTAL]: { SATK: 0.2, MP: 0.1, HP: -0.1, DEF: 0, ATK: -0.1, SPD: 0 }
};

// === 5. NGUYÊN TỐ (ELEMENTS) ===
export const ELEMENTS = {
    WATER: 'Water', FIRE: 'Fire', GRASS: 'Grass',
    AIR: 'Air', EARTH: 'Earth', THUNDER: 'Thunder',
    PHYSICAL: 'Physical', PSYCHIC: 'Psychic', ELECTRIC: 'Electric' // Bổ sung cho khớp với logic cũ
};

// Map khắc chế
export const ELEMENT_ADVANTAGE = {
    [ELEMENTS.WATER]: { advantage: ['Fire'], disadvantage: ['Grass', 'Electric'] },
    [ELEMENTS.FIRE]: { advantage: ['Grass'], disadvantage: ['Water'] },
    [ELEMENTS.GRASS]: { advantage: ['Water'], disadvantage: ['Fire'] },
    [ELEMENTS.EARTH]: { advantage: ['Thunder'], disadvantage: ['Grass', 'Water'] },
    [ELEMENTS.THUNDER]: { advantage: ['Air', 'Water'], disadvantage: ['Earth'] },
    [ELEMENTS.AIR]: { advantage: ['Grass'], disadvantage: ['Thunder'] },
    [ELEMENTS.PHYSICAL]: { advantage: [], disadvantage: [] },
    [ELEMENTS.PSYCHIC]: { advantage: ['Physical'], disadvantage: ['Psychic'] },
    [ELEMENTS.ELECTRIC]: { advantage: ['Water'], disadvantage: ['Earth'] }
};

// === 6. ITEMS & REWARDS ===
export const CANDIES = {
    NORMAL: { name: 'Kẹo Bình Thường', xp: 200, emoji: EMOJIS.CANDY_NORMAL },
    HIGH:   { name: 'Kẹo Cao Cấp', xp: 1000, emoji: EMOJIS.CANDY_HIGH },
    SUPER:  { name: 'Kẹo Siêu Cấp', xp: 2000, emoji: EMOJIS.CANDY_SUPER }
};

export const CRATE_TYPES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];

// === 7. PET TEMPLATES (MẪU PET ĐỂ SPAWN) ===
export const PET_TEMPLATES = [
    { name: "Pika-Chu", element: "Electric", race: "Beast", baseHP: 400, baseATK: 50, baseDEF: 20 },
    { name: "Aqua-Mage", element: "Water", race: "Humanoid", baseHP: 500, baseATK: 45, baseDEF: 30 },
    { name: "Ignis", element: "Fire", race: "Elemental", baseHP: 350, baseATK: 60, baseDEF: 25 },
    { name: "Giga-Rock", element: "Earth", race: "Dwarf", baseHP: 600, baseATK: 30, baseDEF: 50 },
    { name: "Windy", element: "Air", race: "Elf", baseHP: 300, baseATK: 40, baseDEF: 15 },
    { name: "Leafy", element: "Grass", race: "Plant", baseHP: 450, baseATK: 35, baseDEF: 35 },
];

// === 8. SKILL LIST (MẪU) ===
export const SKILLS = [
    { id: 'S1', name: 'Tát Nước', element: 'Water', type: 'SATK', power: 25, multiplier: 1 },
    { id: 'S2', name: 'Đốt Cháy', element: 'Fire', type: 'SATK', power: 30, multiplier: 0.9 },
    { id: 'S3', name: 'Hút Năng Lượng', element: 'Grass', type: 'SATK', power: 15, multiplier: 1.2 },
    { id: 'S4', name: 'Đấm Mạnh', element: 'Physical', type: 'ATK', power: 20, multiplier: 1.0 },
    { id: 'S5', name: 'Sấm Sét', element: 'Thunder', type: 'SATK', power: 40, multiplier: 0.8 },
];