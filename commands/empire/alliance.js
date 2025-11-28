const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const loadManager = async () => (await import('../../utils/EmpireManager.mjs')).empireManager;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alliance')
        .setDescription('Hệ thống Liên Minh')
        .addSubcommand(sub => 
            sub.setName('create')
            .setDescription('Thành lập Liên Minh (Tốn 1000 Vàng)')
            .addStringOption(op => op.setName('name').setDescription('Tên Liên Minh').setRequired(true)))
        .addSubcommand(sub => 
            sub.setName('join')
            .setDescription('Gia nhập Liên Minh bằng Mã ID')
            .addStringOption(op => op.setName('id').setDescription('Mã ID Liên Minh').setRequired(true)))
        .addSubcommand(sub => 
            sub.setName('leave')
            .setDescription('Rời khỏi Liên Minh hiện tại'))
        .addSubcommand(sub => 
            sub.setName('info')
            .setDescription('Xem thông tin Liên Minh của mình')),

    async execute(interaction) {
        const manager = await loadManager();
        const player = manager.getPlayer(interaction.user.id);
        if (!player) return interaction.reply({ content: "Chưa đăng ký!", ephemeral: true });

        const sub = interaction.options.getSubcommand();

        // 1. TẠO LIÊN MINH
        if (sub === 'create') {
            const name = interaction.options.getString('name');
            const result = manager.createAlliance(player.id, name);

            if (!result.success) return interaction.reply({ content: `❌ ${result.msg}`, ephemeral: true });

            return interaction.reply({ 
                content: `🎉 **Thành lập Liên Minh thành công!**\nTên: **${name}**\nMã ID: \`${result.id}\` (Gửi mã này cho bạn bè để họ gia nhập).` 
            });
        }

        // 2. GIA NHẬP
        if (sub === 'join') {
            const id = interaction.options.getString('id');
            const result = manager.joinAlliance(player.id, id);

            if (!result.success) return interaction.reply({ content: `❌ ${result.msg}`, ephemeral: true });

            return interaction.reply(`🤝 Bạn đã gia nhập Liên Minh **${result.name}**!`);
        }

        // 3. RỜI
        if (sub === 'leave') {
            const result = manager.leaveAlliance(player.id);
            if (!result.success) return interaction.reply({ content: `❌ ${result.msg}`, ephemeral: true });
            return interaction.reply("👋 Bạn đã rời khỏi Liên Minh.");
        }

        // 4. XEM THÔNG TIN
        if (sub === 'info') {
            if (!player.allianceId) return interaction.reply("Bạn đang là lính đánh thuê tự do (Chưa vào Liên Minh nào).");
            
            const alliance = manager.getAlliance(player.allianceId);
            if (!alliance) return interaction.reply("Lỗi dữ liệu liên minh.");

            const leaderName = manager.players[alliance.leaderId]?.username || "Unknown";
            const membersList = alliance.members.map(id => `- ${manager.players[id]?.username || id}`).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`🛡️ Liên Minh: ${alliance.name}`)
                .setColor(0x9B59B6)
                .addFields(
                    { name: '🆔 Mã gia nhập', value: `\`${alliance.id}\``, inline: true },
                    { name: '👑 Minh Chủ', value: leaderName, inline: true },
                    { name: `👥 Thành viên (${alliance.members.length}/10)`, value: membersList }
                );

            return interaction.reply({ embeds: [embed] });
        }
    }
};