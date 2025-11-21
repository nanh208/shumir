// File: commands/admin/LevelServer.js (Sử dụng CommonJS)
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { DIFFICULTY_LEVELS } = require('../../Constants.mjs'); // Giả định đường dẫn đúng
const { Database } = require('../../Database.mjs'); // Giả định đường dẫn đúng

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lvsv')
        .setDescription('Đặt độ khó chiến đấu Pet mặc định cho máy chủ này.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) // Chỉ Admin/Mod
        .addStringOption(option => {
            option.setName('độ_khó')
                .setDescription('Chọn cấp độ khó mới cho các Pet/Boss xuất hiện.')
                .setRequired(true);
            
            // Thêm tất cả các tùy chọn độ khó
            for (const key in DIFFICULTY_LEVELS) {
                option.addChoices({ name: DIFFICULTY_LEVELS[key].name, value: key });
            }
            return option;
        }),

    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({ content: 'Lệnh này chỉ dùng được trong máy chủ.', ephemeral: true });
        }
        
        const difficultyKey = interaction.options.getString('độ_khó');
        const difficulty = DIFFICULTY_LEVELS[difficultyKey];
        
        if (!difficulty) {
            return interaction.reply({ content: 'Cấp độ khó không hợp lệ.', ephemeral: true });
        }

        // Lấy cấu hình bot từ Database (Giả định Database có hàm getBotConfig/updateBotConfig)
        const serverId = interaction.guild.id;
        const serverConfig = Database.getServerConfig(serverId);

        // Cập nhật cấu hình
        serverConfig.difficulty = difficultyKey;
        Database.updateServerConfig(serverId, serverConfig);

        const embed = new EmbedBuilder()
            .setTitle('⚙️ CẬP NHẬT ĐỘ KHÓ SERVER')
            .setDescription(`Đã đặt độ khó mặc định cho máy chủ này là: **${difficulty.name}**!`)
            .addFields(
                { name: 'Hệ số Pet', value: `Pet hoang dã và Boss sẽ được nhân chỉ số với **x${difficulty.multiplier}** so với mức cơ bản.`, inline: false }
            )
            .setColor(0x00FF00);

        await interaction.reply({ embeds: [embed] });
    },
};