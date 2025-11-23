// File: Constants.mjs (FINAL VERSION - Bổ sung Phần thưởng)
import { ButtonStyle } from 'discord.js';
// === 1. EMOJIS & COLORS ===
export const EMOJIS = {
    PET_ICONS: [
        '<a:Rayquaza:1441631570506285166>', '<a:kiuri:1441632663126540459>', '<:HuTao:1440702400611618890>',
        '<a:source:1440702357523660820>', '<a:pikachu:1440702320290824364>', '<:Furina:1440702288032436460>',
        '<a:Keqing:1440702273801027695>', '<a:Paimon:1440702251302781040>',
        '<a:baf5c89c099b34decb7f4507b5144366:1440702202762231828>', '<a:hutao:1434904266597732473>',
        '<a:Klee:1434903983323086939>', '<a:Rem:1434903876590637086>',"<a:Mewtwu:1441834826549170399>"
    ],
    CANDY_NORMAL: '🍬',
    CANDY_HIGH: '🍭',
    CANDY_SUPER: '🍮',
    CANDY_ULTRA: '🌟', 
    BOX_COMMON: '📦',
    BOX_MYTHIC: '👑', // Rương Thần Thoại
    BALL: '🔴',
    SWORD: '⚔️',
    SHIELD: '🛡️',
    HEART: '❤️',
    MANA: '💧',
    SPEED: '⚡',
    STAR: '⭐',
    BALL_POKE: '<:PokeF_Ball:1441656965410455645>',
    BALL_GREAT: '<:Great_Ball:1441657002802544752>',
    BALL_ULTRA: '<:Ultra_Ball:1441657071878799482>',
    BALL_DUSK: '<:Dusk_Ball:1441657029075664998>',
    BALL_MASTER: '<a:Master:1441451727348830460>'
};
export const POKEBALLS = {
    'poke':   { name: 'Poké Ball', multiplier: 1.0, icon: EMOJIS.BALL_POKE, style: ButtonStyle.Primary },
    'great':  { name: 'Great Ball', multiplier: 1.5, icon: EMOJIS.BALL_GREAT, style: ButtonStyle.Primary },
    'ultra':  { name: 'Ultra Ball', multiplier: 2.0, icon: EMOJIS.BALL_ULTRA, style: ButtonStyle.Primary },
    'dusk':   { name: 'Dusk Ball', multiplier: 2.5, icon: EMOJIS.BALL_DUSK, style: ButtonStyle.Secondary, special: { element: 'Dark' } },
    'master': { name: 'Master Ball', multiplier: 999.0, icon: EMOJIS.BALL_MASTER, style: ButtonStyle.Danger }
};
export const RARITY_COLORS = {
    'Common': 0x808080, 'Uncommon': 0x00FF00, 'Rare': 0x0099FF,
    'Epic': 0x9900FF, 'Legendary': 0xFFD700, 'Mythic': 0xFF0000
};
export async function handleSlashCommand(interaction) {
    const { commandName, options } = interaction;

    // --- LỆNH SETUP SPAWN ---
    if (commandName === 'setup_spawn') {
        try {
            // 1. Báo cho Discord biết là đang xử lý (Tránh lỗi 3 giây)
            // flags: [MessageFlags.Ephemeral] thay cho ephemeral: true để hết cảnh báo
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }); 

            const channel = options.getChannel('channel');
            
            // 2. Lưu vào Database (Hành động tốn thời gian)
            if (!channel) {
                return interaction.editReply("❌ Không tìm thấy kênh.");
            }
            
            // Gọi hàm setSpawnChannel (hoặc setArenaChannel tùy bạn dùng cái nào)
            Database.setSpawnChannel(channel.id); 

            // 3. Trả lời sau khi đã xong (Dùng editReply vì đã defer ở trên)
            await interaction.editReply(`✅ Đã cài đặt kênh ${channel.toString()} làm khu vực xuất hiện Pet!`);
            
        } catch (error) {
            console.error(error);
            // Dùng editReply nếu có lỗi
            await interaction.editReply("❌ Có lỗi khi cài đặt."); 
        }
        return;
    }

    // ... các lệnh khác (inventory, adventure...) giữ nguyên ...
    // LƯU Ý: Với các lệnh khác, nếu xử lý lâu cũng nên dùng deferReply -> editReply
}
// === 2. PHẨM CHẤT (RARITY) & SCALING ===
export const RARITY_CONFIG = {
    'Common':    { statMultiplier: 1.0, maxLv: 100, ballRate: 0.40, spawnRate: 0.45,  color: RARITY_COLORS.Common, icon: '⚪' }, // 40%
    'Uncommon':  { statMultiplier: 1.2, maxLv: 100, ballRate: 0.30, spawnRate: 0.25,  color: RARITY_COLORS.Uncommon, icon: '🌿' }, // 30%
    'Rare':      { statMultiplier: 1.5, maxLv: 100, ballRate: 0.20, spawnRate: 0.15,  color: RARITY_COLORS.Rare, icon: '💧' }, // 20%
    'Epic':      { statMultiplier: 1.8, maxLv: 100, ballRate: 0.10, spawnRate: 0.10,  color: RARITY_COLORS.Epic, icon: '🔥' }, // 10%
    'Legendary': { statMultiplier: 2.4, maxLv: 100, ballRate: 0.05, spawnRate: 0.04,  color: RARITY_COLORS.Legendary, icon: '✨' }, // 5%
    'Mythic':    { statMultiplier: 3.2, maxLv: 100, ballRate: 0.02, spawnRate: 0.01,  color: RARITY_COLORS.Mythic, icon: '👑' }  // 2%
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
    POINTS_PER_LEVEL: 25 
};

// === 5. TỘC HỆ & TEMPLATES ===
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

// === 6. ITEMS, CANDIES & SKILLBOOKS ===
export const CANDIES = {
    NORMAL: { name: 'Kẹo Bình Thường', xp: 200, emoji: EMOJIS.CANDY_NORMAL },
    HIGH:   { name: 'Kẹo Cao Cấp', xp: 1000, emoji: EMOJIS.CANDY_HIGH },
    SUPER:  { name: 'Kẹo Siêu Cấp', xp: 2000, emoji: EMOJIS.CANDY_SUPER },
    ULTRA:  { name: 'Kẹo Tối Thượng', xp: 10000, emoji: EMOJIS.CANDY_ULTRA }
};

export const SKILLBOOK_CONFIG = {
    T1: { name: 'Sách Skill Cấp I', emoji: '📖', tier: 1, skills: ['S1', 'S2'] },
    T2: { name: 'Sách Skill Cấp II', emoji: '📘', tier: 2, skills: ['S3', 'S4'] },
    LEGEND: { name: 'Sách Skill Huyền Thoại', emoji: '📜', tier: 3, skills: ['S5'] }
};

// CẤU HÌNH TÊN HIỂN THỊ CỦA CÁC VẬT PHẨM DROP
export const ITEM_CONFIG = {
    'MYTHIC_STONE': { name: 'Đá Thần Thoại', emoji: '💎' },
    'LEGEND_ESSENCE': { name: 'Tinh Hoa Huyền Thoại', emoji: '🌟' },
    'MYTHIC_CHEST': { name: 'Rương Thần Thoại', emoji: EMOJIS.BOX_MYTHIC }, 
    'LEGEND_SKILLBOOK': { name: SKILLBOOK_CONFIG.LEGEND.name, emoji: SKILLBOOK_CONFIG.LEGEND.emoji }, 
    'RARE_CANDY': { name: CANDIES.HIGH.name, emoji: CANDIES.HIGH.emoji },
    'GOLD_COIN': { name: 'Đồng Xu Vàng', emoji: '💰' } 
};

// === 7. HỆ THỐNG NỘI TẠI (PASSIVES) ===
export const PASSIVES = {
    'VAMPIRISM': { id: 'VAMPIRISM', name: '🩸 Huyết Tộc', desc: 'Hồi 10% HP dựa trên sát thương gây ra.', trigger: 'onAttack' },
    'BERSEKER':  { id: 'BERSEKER',  name: '😡 Cuồng Nộ',  desc: 'Khi HP dưới 30%, tăng 50% Sát thương.', trigger: 'onCalcDamage' },
    'REGEN':     { id: 'REGEN',     name: '🌿 Tái Tạo',   desc: 'Hồi 5% HP tối đa mỗi lượt.', trigger: 'onTurnEnd' },
    'THORNS':    { id: 'THORNS',    name: '🌵 Giáp Gai',  desc: 'Phản lại 10% sát thương nhận vào.', trigger: 'onDefend' },
    'EVASION':   { id: 'EVASION',   name: '👻 Bóng Ma',   desc: 'Có 10% cơ hội né hoàn toàn đòn đánh.', trigger: 'onReceiveDamage' },
    'CRIT_MASTER':{ id: 'CRIT_MASTER',name: '🎯 Bách Phát',desc: 'Tăng 20% tỷ lệ chí mạng.', trigger: 'onCritCheck' }
};

// === 8. CẤU HÌNH TIẾN HÓA ===
export const EVOLUTION_CHAINS = {
    'Pika-Chu': { target: 'Raichu-God', level: 20, material: 'Thunder Stone' },
    'Slime':    { target: 'King Slime', level: 15, material: null },
    'Dragonoid':{ target: 'Bahamut',    level: 30, material: 'Dragon Scale' }
};

// === 9. CẤU HÌNH ĐỘ KHÓ SERVER (LEVEL SERVER) ===
export const DIFFICULTY_LEVELS = {
    'dễ': { 
        name: 'Dễ', 
        multiplier: 1.0, 
        description: 'Mặc định, chỉ số Pet được giữ nguyên.' 
    },
    'bth': { 
        name: 'Bình Thường', 
        multiplier: 3.0, 
        description: 'Thử thách vừa phải (x3.0).',
    },
    'khó': { 
        name: 'Khó', 
        multiplier: 10.0, 
        description: 'Chỉ số Pet nhân x10.0 so với gốc.',
    },
    'siêu khó': { 
        name: 'Siêu Khó', 
        multiplier: 50.0, 
        description: 'Thử thách cực đại (x50.0).',
    },
    'ác quỷ': { 
        name: 'Ác Quỷ', 
        multiplier: 250.0, 
        description: 'Độ khó cực cao (x250.0).',
    },
    'kẻ hủy diệt': { 
        name: 'Kẻ Hủy Diệt', 
        multiplier: 1000.0, 
        description: 'Thử thách tối thượng (x1000.0).',
    }
};

// === 10. CẤU HÌNH BOSS RAID & THƯỞNG ===

export const RAID_BOSS_HOURS = [1, 4, 7, 10, 13, 16, 19, 22]; 
export const RAID_BOSS_MINUTE = 30;                             

export const BOSS_REWARD_TIERS = {
    'TOP_1': { minDamage: 0.80, guaranteed: 2, rare_drop_bonus: 0.50 }, 
    'TIER_S': { minDamage: 0.50, guaranteed: 1, rare_drop_bonus: 0.30 }, 
    'TIER_A': { minDamage: 0.20, guaranteed: 0, rare_drop_bonus: 0.15 }, 
    'TIER_B': { minDamage: 0.05, guaranteed: 0, rare_drop_bonus: 0.05 }, 
    'PARTICIPANT': { minDamage: 0.0001, guaranteed: 0, rare_drop_bonus: 0.01 }, 
};

// ĐÃ CẬP NHẬT: THÊM RƯƠNG VÀ SÁCH SKILL VÀO DROP LIST
export const BOSS_DROPS = [
    { item_id: 'MYTHIC_CHEST', rarity: 'Mythic', chance: 0.005 },          // Rương Thần Thoại (0.5%)
    { item_id: 'LEGEND_SKILLBOOK', rarity: 'Legendary', chance: 0.03 },    // Sách Skill Huyền Thoại (3%)
    { item_id: 'MYTHIC_STONE', rarity: 'Mythic', chance: 0.01 }, 
    { item_id: 'LEGEND_ESSENCE', rarity: 'Legendary', chance: 0.05 }, 
    { item_id: 'RARE_CANDY', rarity: 'Rare', chance: 0.20 }, 
    { item_id: 'GOLD_COIN', rarity: 'Common', chance: 1.00 }
];

// === 11. CẤU HÌNH SPAWN PET HIẾM THEO LỊCH ===
export const SCHEDULED_SPAWN_HOURS = [0, 3, 6, 9, 12, 15, 18, 21]; 
export const SCHEDULED_RARITIES = [
    RARITY.LEGENDARY, 
    RARITY.MYTHIC 
];