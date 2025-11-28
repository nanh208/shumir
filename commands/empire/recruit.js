const { SlashCommandBuilder } = require('discord.js');
const loadManager = async () => (await import('../../utils/EmpireManager.mjs')).empireManager;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recruit')
        .setDescription('Chiêu mộ quân đội')
        .addStringOption(option =>
            option.setName('unit')
                .setDescription('Loại quân muốn mua')
                .setRequired(true)
                .addChoices(
                    { name: '🛡️ Bộ binh (Cần Trại lính)', value: 'infantry' },
                    { name: '🏹 Cung thủ (Cần Trại lính Lv2)', value: 'archer' },
                    { name: '🐎 Kỵ binh (Cần Trại lính Lv3)', value: 'cavalry' },
                    { name: '🐘 Voi Chiến (Cần Xưởng Khí Cụ)', value: 'elephant' },
                    { name: '🚜 Xe Công Thành (Cần Xưởng Khí Cụ)', value: 'siege_ram' }
                ))
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Số lượng')
                .setMinValue(1)
                .setRequired(true)),

    async execute(interaction) {
        const manager = await loadManager();
        const player = manager.getPlayer(interaction.user.id);
        
        if (!player) return interaction.reply({ content: "Chưa đăng ký!", ephemeral: true });
        if (interaction.channelId !== player.privateChannelId) return interaction.reply({ content: "Về lãnh địa riêng để mua quân!", ephemeral: true });

        const unitType = interaction.options.getString('unit');
        const amount = interaction.options.getInteger('amount');
        const STATS = manager.getUnitStats()[unitType];
        
        // 1. Kiểm tra Điều kiện Công trình
        const barracksLvl = player.buildings.barracks || 0;
        const workshopLvl = player.buildings.siege_workshop || 0; // [CHECK AGE 3]

        if (unitType === 'infantry' && barracksLvl < 1) return interaction.reply("⛔ Bạn cần xây **Trại Lính** trước!");
        if (unitType === 'archer' && barracksLvl < 2) return interaction.reply("⛔ Bạn cần nâng cấp **Trại Lính lên Cấp 2**!");
        if (unitType === 'cavalry' && barracksLvl < 3) return interaction.reply("⛔ Bạn cần nâng cấp **Trại Lính lên Cấp 3**!");

        // Điều kiện cho Voi và Xe
        if ((unitType === 'elephant' || unitType === 'siege_ram') && workshopLvl < 1) {
            return interaction.reply("⛔ Bạn cần xây **Xưởng Khí Cụ** (Yêu cầu Age 3) để mua quân này!");
        }

        // 2. Tính tổng chi phí
        const totalFood = (STATS.cost.food || 0) * amount;
        const totalWood = (STATS.cost.wood || 0) * amount;
        const totalGold = (STATS.cost.gold || 0) * amount;
        const totalIron = (STATS.cost.iron || 0) * amount;

        // 3. Kiểm tra tiền
        if (player.resources.food < totalFood || player.resources.wood < totalWood || player.resources.gold < totalGold || player.resources.iron < totalIron) {
            return interaction.reply({
                content: `⛔ **Không đủ tài nguyên!**\nĐể mua ${amount} ${STATS.name}, bạn cần:\n` +
                         `🍞 ${totalFood} | 🪵 ${totalWood} | 🪙 ${totalGold} | ⛓️ ${totalIron}`,
                ephemeral: true
            });
        }

        // 4. Trừ tiền và Cộng lính
        player.resources.food -= totalFood;
        player.resources.wood -= totalWood;
        player.resources.gold -= totalGold;
        player.resources.iron -= totalIron;

        player.units[unitType] = (player.units[unitType] || 0) + amount;
        manager.saveData();

        await interaction.reply(`⚔️ **Chiêu mộ thành công!**\nBạn đã có thêm **${amount} ${STATS.name}**.\nQuân đội hiện tại: ${player.units[unitType]}`);
    }
};