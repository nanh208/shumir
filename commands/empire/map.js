// commands/empire/map.js
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const loadManager = async () => (await import('../../utils/EmpireManager.mjs')).empireManager;
const loadRenderer = async () => (await import('../../utils/MapRenderer.js'));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('map')
        .setDescription('Xem bản đồ thế giới (Yêu cầu Kỷ Nguyên Chiến Tranh)'),

    async execute(interaction) {
        await interaction.deferReply(); // Vì vẽ ảnh hơi lâu nên cần defer

        const manager = await loadManager();
        const player = manager.getPlayer(interaction.user.id);

        if (!player) return interaction.editReply("Bạn chưa đăng ký!");

        // Điều kiện: Phải là Giai đoạn 2 (Feudal Age) trở lên mới xem được Map
        if (player.age < 2) {
            return interaction.editReply({
                content: `⛔ **Tầm nhìn bị hạn chế!**\nBạn đang ở **Kỷ Nguyên Khai Hoang**.\nBạn cần nâng cấp **Nhà Chính lên Cấp 5** để mở khóa Bản đồ Thế giới.`
            });
        }

        try {
            const renderer = await loadRenderer();
            const players = manager.getAllPlayers();
            
            // Gọi hàm vẽ map
            const imageBuffer = await renderer.renderWorldMap(players, interaction.user.id);
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'world-map.png' });

            await interaction.editReply({
                content: `🗺️ **Bản Đồ Thế Giới**\nVị trí của bạn: [${player.position.x}, ${player.position.y}] (Màu xanh lá)`,
                files: [attachment]
            });
        } catch (error) {
            console.error(error);
            await interaction.editReply("❌ Lỗi khi vẽ bản đồ. Hãy chắc chắn Server đã cài `canvas`.");
        }
    }
};