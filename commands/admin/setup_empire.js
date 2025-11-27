const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup_empire')
        .setDescription('Thiết lập kênh hiện tại làm Vùng Đất Game Đế Chế')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels), // Chỉ người quản lý mới dùng được
    
    async execute(interaction, client, wordGameStates, activeWerewolfGames, activeMonopolyGames, empireConfig) {
        // empireConfig được truyền từ index.js sang
        
        const guildId = interaction.guildId;
        const channelId = interaction.channelId;

        // Cập nhật cấu hình trong bộ nhớ RAM
        empireConfig[guildId] = channelId;

        // Lưu vào file JSON để bot restart không bị mất
        const configPath = path.resolve(__dirname, '../../data/empire-config.json');
        
        // Đảm bảo thư mục tồn tại
        const dirPath = path.dirname(configPath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        try {
            fs.writeFileSync(configPath, JSON.stringify(empireConfig, null, 2));
            
            // Thông báo thành công (Công khai)
            await interaction.reply({ 
                content: `✅ **Thành công!**\nKênh <#${channelId}> đã được thiết lập làm chiến trường chính thức cho **Đế Chế Vạn Dặm**.\nCác lệnh game (register, build, map...) chỉ hoạt động tại đây.`
            });
        } catch (error) {
            console.error(error);
            // Thông báo lỗi (Ẩn)
            await interaction.reply({ 
                content: '❌ Có lỗi khi lưu cấu hình vào file hệ thống.', 
                flags: [MessageFlags.Ephemeral] 
            });
        }
    },
};