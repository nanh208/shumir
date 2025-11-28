const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup_empire')
        .setDescription('Thiết lập kênh Sảnh Chính (Nơi đăng ký & Thông báo)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
        
    async execute(interaction) {
        const configPath = path.resolve('./data/empire-config.json');
        let config = {};
        try { config = JSON.parse(fs.readFileSync(configPath)); } catch {}

        config[interaction.guildId] = interaction.channelId;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        await interaction.reply({
            content: `✅ **Đã thiết lập Sảnh Chính!**\nNgười chơi hãy dùng \`/register\` tại đây để nhận Lãnh địa riêng.`,
        });
    }
};