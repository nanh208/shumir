const { SlashCommandBuilder } = require('discord.js');
// Import động vì Manager là file .mjs
const loadManager = async () => (await import('../../utils/EmpireManager.mjs')).empireManager;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Đăng ký tham gia Đế Chế Vạn Dặm'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        const manager = await loadManager();
        const result = await manager.registerUser(interaction);

        if (result.status === 'exist') {
            const channel = interaction.guild.channels.cache.get(result.data.privateChannelId);
            return interaction.editReply(`⛔ Bạn đã có lãnh địa rồi! Hãy quay về ${channel ? channel.toString() : 'kênh cũ'} để điều hành.`);
        }

        if (result.status === 'error') {
            return interaction.editReply(`❌ Lỗi: ${result.msg}`);
        }

        const channel = interaction.guild.channels.cache.get(result.channelId);
        await interaction.editReply(`🎉 **Khởi tạo thành công!**\nLãnh địa của bạn đã sẵn sàng tại: ${channel.toString()}\n(Chỉ bạn mới nhìn thấy kênh đó).`);
    }
};