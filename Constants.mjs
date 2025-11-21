// Constants.mjs

// === 1. EMOJIS & COLORS ===
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

export const RARITY_COLORS = {
    'Common': 0x808080, 'Uncommon': 0x00FF00, 'Rare': 0x0099FF,
    'Epic': 0x9900FF, 'Legendary': 0xFFD700, 'Mythic': 0xFF0000
};

// === 2. PHẨM CHẤT (RARITY) & SCALING ===
export const RARITY_CONFIG = {
    'Common':    { statMultiplier: 1.0, maxLv: 100, ballRate: 0.50, spawnRate: 0.45,  color: RARITY_COLORS.Common, icon: '⚪' },
    'Uncommon':  { statMultiplier: 1.2, maxLv: 100, ballRate: 0.60, spawnRate: 0.25,  color: RARITY_COLORS.Uncommon, icon: '🌿' },
    'Rare':      { statMultiplier: 1.5, maxLv: 100, ballRate: 0.65, spawnRate: 0.15,  color: RARITY_COLORS.Rare, icon: '💧' },
    'Epic':      { statMultiplier: 1.8, maxLv: 100, ballRate: 0.70, spawnRate: 0.10,  color: RARITY_COLORS.Epic, icon: '🔥' },
    'Legendary': { statMultiplier: 2.4, maxLv: 100, ballRate: 1.00, spawnRate: 0.04,  color: RARITY_COLORS.Legendary, icon: '✨' },
    'Mythic':    { statMultiplier: 3.2, maxLv: 100, ballRate: 1.00, spawnRate: 0.01,  color: RARITY_COLORS.Mythic, icon: '👑' }
};

export const RARITY = {
    COMMON: 'Common', UNCOMMON: 'Uncommon', RARE: 'Rare',
    EPIC: 'Epic', LEGENDARY: 'Legendary', MYTHIC: 'Mythic'
};

export const RARITY_WEIGHTS = Object.entries(RARITY_CONFIG).map(([key, val]) => ({
    rarity: key, weight: val.spawnRate
}));

// === 3. NGUYÊN TỐ ===
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

export const ELEMENT_ADVANTAGE = {
    [ELEMENTS.WATER]: { advantage: ['Fire'], disadvantage: ['Grass', 'Electric'] },
    [ELEMENTS.FIRE]: { advantage: ['Grass', 'Ice'], disadvantage: ['Water', 'Earth'] },
    [ELEMENTS.GRASS]: { advantage: ['Water', 'Earth'], disadvantage: ['Fire', 'Wind'] },
    [ELEMENTS.ELECTRIC]: { advantage: ['Water', 'Wind'], disadvantage: ['Earth'] },
    [ELEMENTS.ICE]: { advantage: ['Dragon', 'Grass'], disadvantage: ['Fire'] },
    [ELEMENTS.EARTH]: { advantage: ['Electric', 'Fire'], disadvantage: ['Water', 'Grass'] },
    [ELEMENTS.WIND]: { advantage: ['Grass'], disadvantage: ['Ice'] },
    [ELEMENTS.LIGHT]: { advantage: ['Dark'], disadvantage: ['Dragon'] },
    [ELEMENTS.DARK]: { advantage: ['Light', 'Psychic'], disadvantage: ['Light'] },
    [ELEMENTS.DRAGON]: { advantage: ['Dragon'], disadvantage: ['Ice', 'Dragon'] },
    [ELEMENTS.PHYSICAL]: { advantage: [], disadvantage: [] }
};

// === 4. CẤU HÌNH LEVEL ===
export const LEVEL_CONFIG = {
    BASE_XP: 100,
    XP_MULTIPLIER: 1.15,
    POINTS_PER_LEVEL: 25 // Mỗi level tặng thêm tổng 25 điểm stat
};

// === 5. TỘC HỆ ===
export const RACES = {
    HUMAN: 'Human', DWARF: 'Dwarf', ELF: 'Elf', ORC: 'Orc', 
    DRAGON: 'Dragon', BEAST: 'Beast', ELEMENTAL: 'Elemental'
};

// === 6. ITEMS ===
export const CANDIES = {
    NORMAL: { name: 'Kẹo Bình Thường', xp: 200, emoji: EMOJIS.CANDY_NORMAL },
    HIGH:   { name: 'Kẹo Cao Cấp', xp: 1000, emoji: EMOJIS.CANDY_HIGH },
    SUPER:  { name: 'Kẹo Siêu Cấp', xp: 2000, emoji: EMOJIS.CANDY_SUPER }
};

// === 7. HỆ THỐNG NỘI TẠI (PASSIVES) ===
export const PASSIVES = {
    'VAMPIRISM': { id: 'VAMPIRISM', name: '🩸 Huyết Tộc', desc: 'Hồi 10% HP dựa trên sát thương gây ra.', trigger: 'onAttack' },
    'BERSEKER':  { id: 'BERSEKER',  name: '😡 Cuồng Nộ',  desc: 'Khi HP dưới 30%, tăng 50% Sát thương.', trigger: 'onCalcDamage' },
    'REGEN':     { id: 'REGEN',     name: '🌿 Tái Tạo',   desc: 'Hồi 5% HP tối đa mỗi lượt.', trigger: 'onTurnEnd' },
    'THORNS':    { id: 'THORNS',    name: '🌵 Giáp Gai',  desc: 'Phản lại 10% sát thương nhận vào.', trigger: 'onDefend' },
    'EVASION':   { id: 'EVASION',   name: '👻 Bóng Ma',   desc: 'Có 10% cơ hội né hoàn toàn đòn đánh.', trigger: 'onReceiveDamage' },
    'CRIT_MASTER':{ id: 'CRIT_MASTER',name: '🎯 Bách Phát',desc: 'Tăng 20% tỷ lệ chí mạng.', trigger: 'onCritCheck' }
};

// === 8. CẤU HÌNH TIẾN HÓA ===
export const EVOLUTION_CHAINS = {
    'Pika-Chu': { target: 'Raichu-God', level: 20, material: 'Thunder Stone' },
    'Slime':    { target: 'King Slime', level: 15, material: null },
    'Dragonoid':{ target: 'Bahamut',    level: 30, material: 'Dragon Scale' }
};

// === 9. PET TEMPLATES ===
export const PET_TEMPLATES = [
    { name: "Pika-Chu", race: "Beast", baseHP: 1000, baseMP: 500, baseATK: 1050, baseSATK: 1100, baseDEF: 1000, baseSPD: 120 },
    { name: "Dragonoid", race: "Dragon", baseHP: 1200, baseMP: 600, baseATK: 1250, baseSATK: 1250, baseDEF: 1100, baseSPD: 100 },
    { name: "Slime", race: "Elemental", baseHP: 1500, baseMP: 400, baseATK: 950, baseSATK: 950, baseDEF: 1000, baseSPD: 80 },
    { name: "King Slime", race: "Elemental", baseHP: 3500, baseMP: 1200, baseATK: 2800, baseSATK: 2500, baseDEF: 3000, baseSPD: 110, passive: 'VAMPIRISM' }, 
    { name: "Knight", race: "Human", baseHP: 1100, baseMP: 450, baseATK: 1150, baseSATK: 900, baseDEF: 1050, baseSPD: 95 },
    { name: "Spirit", race: "Elf", baseHP: 900, baseMP: 800, baseATK: 1000, baseSATK: 1300, baseDEF: 950, baseSPD: 110 },
    { name: "Golem", race: "Dwarf", baseHP: 1800, baseMP: 300, baseATK: 900, baseSATK: 900, baseDEF: 1500, baseSPD: 50 },
    { name: "Wisp", race: "Elemental", baseHP: 800, baseMP: 700, baseATK: 1200, baseSATK: 1300, baseDEF: 850, baseSPD: 130 },
    { name: "Shadow", race: "Unknown", baseHP: 1000, baseMP: 500, baseATK: 1300, baseSATK: 1100, baseDEF: 1000, baseSPD: 115 }
];

// === 10. SKILLS ===
export const SKILLS = [
    { id: 'S1', name: 'Tát Nước', element: 'Water', type: 'SATK', power: 25, multiplier: 1 },
    { id: 'S2', name: 'Đốt Cháy', element: 'Fire', type: 'SATK', power: 30, multiplier: 0.9 },
    { id: 'S3', name: 'Hút Năng Lượng', element: 'Grass', type: 'SATK', power: 15, multiplier: 1.2 },
    { id: 'S4', name: 'Đấm Mạnh', element: 'Physical', type: 'ATK', power: 20, multiplier: 1.0 },
    { id: 'S5', name: 'Sấm Sét', element: 'Thunder', type: 'SATK', power: 40, multiplier: 0.8 },
];

// 💡 BỔ SUNG: SKILLBOOK CONFIG ĐỂ SỬA LỖI
export const SKILLBOOK_CONFIG = {
    'S_Fire': { name: 'Sách Lửa 🔥', skillId: 'S2', rarity: 'Rare', icon: '🔥' }, 
    'S_Heal': { name: 'Sách Hồi Máu 💖', skillId: 'S3', rarity: 'Common', icon: '💖' },
    'S_Epic': { name: 'Sách Sử Thi ✨', skillId: 'S4', rarity: 'Epic', icon: '✨' }
};