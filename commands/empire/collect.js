const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const loadManager = async () => (await import('../../utils/EmpireManager.mjs')).empireManager;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('collect')
        .setDescription('Thu hoạch tài nguyên tích lũy từ các công trình'),

    async execute(interaction) {
        const manager = await loadManager();
        const player = manager.getPlayer(interaction.user.id);

        if (!player) return interaction.reply({ content: "Bạn chưa đăng ký!", ephemeral: true });
        if (interaction.channelId !== player.privateChannelId) return interaction.reply({ content: "Về lãnh địa riêng để thu hoạch!", ephemeral: true });

        const result = manager.harvestResources(interaction.user.id);

        if (!result || !result.success) {
            return interaction.reply({ content: "⏳ Kho chưa có gì mới. Hãy quay lại sau vài phút!", ephemeral: true });
        }

        const recv = result.received;
        // Format thời gian hiển thị (VD: 0.5 giờ -> 30 phút)
        const timeDisplay = recv.hours < 1 
            ? `${Math.floor(recv.hours * 60)} phút` 
            : `${recv.hours.toFixed(1)} giờ`;

        const embed = new EmbedBuilder()
            .setTitle(`🌾 Thu Hoạch Thành Công!`)
            .setDescription(`Tích lũy trong: **${timeDisplay}**`)
            .setColor(0xF1C40F)
            .addFields(
                { name: '🍞 Thực', value: `+${recv.food}`, inline: true },
                { name: '🪵 Gỗ', value: `+${recv.wood}`, inline: true },
                { name: '🪙 Vàng', value: `+${recv.gold}`, inline: true },
                { name: '⛓️ Sắt', value: `+${recv.iron}`, inline: true }
            )
            .setFooter({ text: 'Hãy nâng cấp nhà để tăng sản lượng!' });

        await interaction.reply({ embeds: [embed] });
    }
};