const { SlashCommandBuilder } = require('discord.js');
const { getPlayer, savePlayer } = require('../../utils/db');
const { updateResources, CONFIG } = require('../../utils/gameLogic');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('build')
        .setDescription('Xây dựng hoặc nâng cấp công trình')
        .addStringOption(option => 
            option.setName('type')
                .setDescription('Loại công trình')
                .setRequired(true)
                .addChoices(
                    { name: 'Ruộng Lúa (Tăng Thực)', value: 'farm' },
                    { name: 'Mỏ Vàng (Tăng Vàng)', value: 'gold_mine' },
                    { name: 'Xưởng Gỗ (Tăng Gỗ)', value: 'lumber_mill' },
                    { name: 'Trại Lính (Mở khóa mua quân)', value: 'barracks' }
                )),
    async execute(interaction) {
        let player = getPlayer(interaction.user.id);
        if (!player) return interaction.reply("Bạn chưa đăng ký!");

        player = updateResources(player); // Update tiền trước khi mua

        const type = interaction.options.getString('type');
        const buildingConfig = CONFIG.buildings[type];
        
        // Công thức giá tăng dần theo cấp độ: Giá gốc * (1.5 ^ Cấp hiện tại)
        const currentLevel = player.buildings[type];
        const multiplier = Math.pow(1.5, currentLevel);
        
        const costGold = Math.floor((buildingConfig.baseCost.gold || 0) * multiplier);
        const costWood = Math.floor((buildingConfig.baseCost.wood || 0) * multiplier);
        const costFood = Math.floor((buildingConfig.baseCost.food || 0) * multiplier);

        // Kiểm tra đủ tiền không
        if (player.resources.gold < costGold || player.resources.wood < costWood || player.resources.food < costFood) {
            return interaction.reply({ 
                content: `❌ **Không đủ tài nguyên!**\nCần: 💰${costGold} | 🌲${costWood} | 🌾${costFood}\nBạn có: 💰${player.resources.gold} | 🌲${player.resources.wood} | 🌾${player.resources.food}`, 
                ephemeral: true 
            });
        }

        // Trừ tiền và nâng cấp
        player.resources.gold -= costGold;
        player.resources.wood -= costWood;
        player.resources.food -= costFood;
        player.buildings[type]++;

        savePlayer(player.id, player);

        await interaction.reply(`🔨 **Xây dựng thành công!**\nBạn đã nâng cấp **${buildingConfig.name}** lên cấp **${player.buildings[type]}**.`);
    },
};