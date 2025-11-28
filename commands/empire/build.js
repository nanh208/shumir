const { SlashCommandBuilder } = require('discord.js');
const loadManager = async () => (await import('../../utils/EmpireManager.mjs')).empireManager;

const BUILDINGS = {
    'farm': { name: 'Ruộng Lúa', cost: { wood: 100 }, limit: 5 },
    'lumber_mill': { name: 'Xưởng Gỗ', cost: { wood: 100, gold: 50 }, limit: 5 },
    'barracks': { name: 'Trại Lính', cost: { wood: 200, food: 100 }, limit: 3 },
    'town_hall': { name: 'Nhà Chính', cost: { wood: 1000, food: 1000, gold: 500 }, limit: 1 },
    // [MỚI]
    'siege_workshop': { name: 'Xưởng Khí Cụ', cost: { wood: 1000, iron: 500, gold: 500 }, limit: 1 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('build')
        .setDescription('Xây dựng công trình')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Loại công trình')
                .setRequired(true)
                .addChoices(
                    { name: '🌾 Ruộng Lúa (100 Gỗ)', value: 'farm' },
                    { name: '🪓 Xưởng Gỗ (100 Gỗ, 50 Vàng)', value: 'lumber_mill' },
                    { name: '⚔️ Trại Lính (200 Gỗ, 100 Thực)', value: 'barracks' },
                    // [MỚI]
                    { name: '🛠️ Xưởng Khí Cụ (Age 3 - 1000 Gỗ/500 Sắt)', value: 'siege_workshop' }
                )),

    async execute(interaction) {
        const manager = await loadManager();
        const player = manager.players[interaction.user.id];
        
        if (!player) return interaction.reply({ content: "Chưa đăng ký!", ephemeral: true });
        if (interaction.channelId !== player.privateChannelId) return interaction.reply({ content: "Về lãnh địa riêng để xây dựng!", ephemeral: true });

        const type = interaction.options.getString('type');
        const buildingInfo = BUILDINGS[type];

        // Check Age cho Xưởng Khí Cụ
        if (type === 'siege_workshop' && player.age < 3) {
            return interaction.reply("⛔ Bạn phải đạt **Kỷ Nguyên Đế Vương (Age 3)** mới có công nghệ xây Xưởng Khí Cụ.");
        }

        // Check giới hạn ô đất
        const totalBuildings = Object.values(player.buildings).reduce((a, b) => a + b, 0);
        if (totalBuildings >= 10 && type !== 'town_hall') {
            return interaction.reply("⛔ Lãnh địa đã hết đất trống (10/10)!");
        }

        // Check tài nguyên
        const cost = buildingInfo.cost;
        if (player.resources.wood < (cost.wood||0) || player.resources.food < (cost.food||0) || player.resources.gold < (cost.gold||0) || player.resources.iron < (cost.iron||0)) {
            return interaction.reply("⛔ Không đủ tài nguyên!");
        }

        // Trừ tiền & Xây
        if (cost.wood) player.resources.wood -= cost.wood;
        if (cost.food) player.resources.food -= cost.food;
        if (cost.gold) player.resources.gold -= cost.gold;
        if (cost.iron) player.resources.iron -= cost.iron;

        player.buildings[type] = (player.buildings[type] || 0) + 1;
        manager.saveData();

        await interaction.reply(`🔨 **Đã xây xong ${buildingInfo.name}!**\nSố lượng hiện tại: ${player.buildings[type]}`);
    }
};