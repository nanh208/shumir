const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const loadManager = async () => (await import('../../utils/EmpireManager.mjs')).empireManager;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('scout')
        .setDescription('Do thám vùng đất khác')
        .addIntegerOption(opt => opt.setName('x').setDescription('Tọa độ X').setRequired(true))
        .addIntegerOption(opt => opt.setName('y').setDescription('Tọa độ Y').setRequired(true)),

    async execute(interaction) {
        const manager = await loadManager();
        const player = manager.getPlayer(interaction.user.id);
        
        // Check điều kiện
        if (!player) return interaction.reply({ content: "Chưa đăng ký!", ephemeral: true });
        if (player.age < 2) return interaction.reply({ content: "🔒 Cần **Kỷ Nguyên Chiến Tranh** (Nhà chính Lv5) để do thám!", ephemeral: true });

        const x = interaction.options.getInteger('x');
        const y = interaction.options.getInteger('y');

        // Tìm mục tiêu
        const target = manager.getPlayerAt(x, y);

        if (!target) {
            return interaction.reply({ content: `🌫️ Vùng đất [${x}, ${y}] là hoang địa, không có ai ở đây.`, ephemeral: true });
        }
        if (target.id === player.id) {
            return interaction.reply({ content: "Đây là nhà bạn mà?", ephemeral: true });
        }

        // Trừ phí do thám (Ví dụ: 50 Vàng)
        if (player.resources.gold < 50) return interaction.reply("⛔ Cần 50 Vàng để trả cho điệp viên.");
        player.resources.gold -= 50;
        manager.saveData();

        // Kết quả
        const embed = new EmbedBuilder()
            .setTitle(`🕵️ Báo cáo Do thám: [${x}, ${y}]`)
            .setColor(0x3498db)
            .setDescription(`Chủ sở hữu: **${target.username}**`)
            .addFields(
                { name: '💰 Tài nguyên ước tính', value: `Thực: ~${target.resources.food}\nVàng: ~${target.resources.gold}`, inline: true },
                { name: '⚔️ Quân lực', value: `Bộ binh: ${target.units.infantry}\nCung thủ: ${target.units.archer}\nKỵ binh: ${target.units.cavalry}`, inline: true },
                { name: '🛡️ Phòng thủ', value: `Tường thành: Lv${target.buildings.wall || 0}`, inline: false }
            )
            .setFooter({ text: 'Thông tin có thể thay đổi bất cứ lúc nào.' });

        await interaction.reply({ embeds: [embed] });
    }
};