const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Đường dẫn tuyệt đối đến file config
const configPath = path.resolve(__dirname, '../../data/game-config.json');

module.exports = {
    // 1. Định nghĩa lệnh
    data: new SlashCommandBuilder()
        .setName('setnoitu')
        // SỬA LẠI: Mô tả rõ hơn cho Quản lý (QL)
        .setDescription('[QL/ADMIN]: Chỉ định kênh này là kênh duy nhất để chơi Nối Từ.')
        
        // --- SỬA LẠI DÒNG NÀY ---
        // Thêm quyền 'ManageGuild' (Quản lý máy chủ)
        // Dấu | có nghĩa là "HOẶC"
        .setDefaultMemberPermissions(
            PermissionsBitField.Flags.Administrator | 
            PermissionsBitField.Flags.ManageGuild
        ),
        // --- KẾT THÚC SỬA ---

    // 2. Hàm thực thi (Giữ nguyên)
    async execute(interaction) {
        try {
            const channelId = interaction.channel.id;
            
            // Đọc file config (hoặc tạo nếu chưa có)
            let configData = {};
            if (fs.existsSync(configPath)) {
                configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }

            configData.wordGameChannelId = channelId;
            fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

            await interaction.reply({
                content: `✅ Đã thiết lập kênh này (<#${channelId}>) làm kênh chơi Nối Từ.`,
                ephemeral: true 
            });

        } catch (error) {
            console.error('Lỗi khi set kênh Nối Từ:', error);
            await interaction.reply({
                content: '❌ Đã xảy ra lỗi khi thiết lập kênh.',
                ephemeral: true
            });
        }
    },
};