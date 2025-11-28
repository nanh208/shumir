const { SlashCommandBuilder } = require('discord.js');
const loadManager = async () => (await import('../../utils/EmpireManager.mjs')).empireManager;

const BUILDINGS = {
    'farm': 'Ruộng Lúa',
    'lumber_mill': 'Xưởng Gỗ',
    'gold_mine': 'Mỏ Vàng',
    'iron_mine': 'Mỏ Sắt',
    'town_hall': 'Nhà Chính'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upgrade')
        .setDescription('Nâng cấp công trình để tăng năng suất')
        .addStringOption(option =>
            option.setName('target')
                .setDescription('Công trình muốn nâng')
                .setRequired(true)
                .addChoices(
                    { name: '🌾 Ruộng Lúa', value: 'farm' },
                    { name: '🪓 Xưởng Gỗ', value: 'lumber_mill' },
                    { name: '🪙 Mỏ Vàng', value: 'gold_mine' },
                    { name: '🏰 Nhà Chính (Lên đời)', value: 'town_hall' }
                )),

    async execute(interaction) {
        const manager = await loadManager();
        const player = manager.getPlayer(interaction.user.id);
        
        if (!player) return interaction.reply({ content: "Chưa đăng ký!", ephemeral: true });
        if (interaction.channelId !== player.privateChannelId) return interaction.reply({ content: "Về lãnh địa riêng để nâng cấp!", ephemeral: true });

        const target = interaction.options.getString('target');
        const currentLvl = player.buildings[target] || 0;
        
        if (currentLvl === 0 && target !== 'town_hall') return interaction.reply("⚠️ Bạn chưa xây công trình này. Hãy dùng `/build` trước.");

        // Lấy bảng giá
        const COSTS = manager.getUpgradeCosts();
        const baseCost = COSTS[target];
        
        // Công thức giá: Giá gốc * Level hiện tại
        // Ví dụ: Lên Lv2 tốn 100, Lên Lv3 tốn 200...
        const nextLvl = currentLvl + 1;
        const woodCost = (baseCost.wood || 0) * currentLvl;
        const foodCost = (baseCost.food || 0) * currentLvl;
        const goldCost = (baseCost.gold || 0) * currentLvl;

        // Kiểm tra tiền
        if (player.resources.wood < woodCost || player.resources.food < foodCost || player.resources.gold < goldCost) {
            return interaction.reply({ 
                content: `⛔ **Không đủ tài nguyên để lên Cấp ${nextLvl}!**\nCần: 🪵 ${woodCost} | 🍞 ${foodCost} | 🪙 ${goldCost}\nBạn có: 🪵 ${player.resources.wood} | 🍞 ${player.resources.food} | 🪙 ${player.resources.gold}`,
                ephemeral: true 
            });
        }

        // Trừ tiền & Up cấp
        player.resources.wood -= woodCost;
        player.resources.food -= foodCost;
        player.resources.gold -= goldCost;
        player.buildings[target] = nextLvl;

        // Logic đặc biệt: Lên đời (Nhà Chính Lv5 -> Giai đoạn 2)
        let extraMsg = "";
        if (target === 'town_hall' && nextLvl === 5) {
            player.age = 2;
            await manager.assignAgeRole(interaction.member, 2);
            extraMsg = "\n🎉 **CHÚC MỪNG! BẠN ĐÃ BƯỚC SANG KỶ NGUYÊN CHIẾN TRANH!**\nĐã mở khóa: Bản đồ thế giới, Quân đội, Do thám.";
        }

        manager.saveData();

        await interaction.reply(`🔨 **Nâng cấp thành công!**\n${BUILDINGS[target]} đã lên **Cấp ${nextLvl}**.\nSản lượng đã tăng!${extraMsg}`);
    }
};