const { SlashCommandBuilder } = require('discord.js');
const { getPlayer, savePlayer } = require('../../utils/db');
const { updateResources, CONFIG } = require('../../utils/gameLogic');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recruit')
        .setDescription('Chiêu mộ binh lính')
        .addStringOption(option => 
            option.setName('unit')
                .setDescription('Loại quân')
                .setRequired(true)
                .addChoices(
                    { name: 'Bộ Binh (Rẻ, Máu trâu)', value: 'infantry' },
                    { name: 'Cung Thủ (Thủ nhà tốt)', value: 'archer' },
                    { name: 'Kỵ Binh (Tốc độ cao)', value: 'cavalry' }
                ))
        .addIntegerOption(option => option.setName('amount').setDescription('Số lượng').setRequired(true)),
    async execute(interaction) {
        let player = getPlayer(interaction.user.id);
        if (!player) return interaction.reply("Bạn chưa đăng ký!");

        // Điều kiện tiên quyết: Phải có Trại Lính
        if (player.buildings.barracks < 1) {
            return interaction.reply({ content: "⛔ Bạn cần xây **Trại Lính** trước khi tuyển quân!", ephemeral: true });
        }

        player = updateResources(player);

        const unitType = interaction.options.getString('unit');
        const amount = interaction.options.getInteger('amount');
        if (amount <= 0) return interaction.reply("Số lượng phải lớn hơn 0");

        const unitConfig = CONFIG.units[unitType];
        
        const totalGold = (unitConfig.cost.gold || 0) * amount;
        const totalWood = (unitConfig.cost.wood || 0) * amount;
        const totalFood = (unitConfig.cost.food || 0) * amount;

        if (player.resources.gold < totalGold || player.resources.wood < totalWood || player.resources.food < totalFood) {
            return interaction.reply({ content: `❌ Không đủ tài nguyên để tuyển ${amount} quân!`, ephemeral: true });
        }

        // Trừ tiền và thêm lính
        player.resources.gold -= totalGold;
        player.resources.wood -= totalWood;
        player.resources.food -= totalFood;
        player.units[unitType] += amount;

        savePlayer(player.id, player);

        await interaction.reply(`⚔️ **Chiêu mộ thành công!**\nBạn đã có thêm **${amount} ${unitConfig.name}**.\nLưu ý: Quân đội tiêu thụ Lương thực mỗi giờ.`);
    },
};