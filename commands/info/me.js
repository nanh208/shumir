const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPlayer, savePlayer } = require('../../utils/db');
const { updateResources, CONFIG } = require('../../utils/gameLogic');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('me')
        .setDescription('Xem thông tin vương quốc'),
    async execute(interaction) {
        let player = getPlayer(interaction.user.id);
        if (!player) return interaction.reply({ content: "Bạn chưa đăng ký! Dùng `/register` trước.", ephemeral: true });

        // Cập nhật tài nguyên theo thời gian thực
        player = updateResources(player);
        savePlayer(player.id, player);

        const embed = new EmbedBuilder()
            .setTitle(`🏰 ${player.kingdomName} (Cấp: ${player.tier})`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: 'Tài Nguyên', value: `💰 Vàng: ${player.resources.gold}\n🌲 Gỗ: ${player.resources.wood}\n🌾 Thực: ${player.resources.food}`, inline: true },
                { name: 'Quân Đội', value: `🛡️ Bộ binh: ${player.units.infantry}\n🏹 Cung thủ: ${player.units.archer}\n🐎 Kỵ binh: ${player.units.cavalry}`, inline: true },
                { name: 'Công Trình', value: `🌾 Ruộng: ${player.buildings.farm}\n💰 Mỏ vàng: ${player.buildings.gold_mine}\n🌲 Xưởng gỗ: ${player.buildings.lumber_mill}\n⚔️ Trại lính: ${player.buildings.barracks}`, inline: false }
            )
            .setColor('Blue');

        await interaction.reply({ embeds: [embed] });
    },
};