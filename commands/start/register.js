const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPlayer, savePlayer } = require('../../utils/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Khai sinh vương triều mới')
        .addStringOption(option => option.setName('name').setDescription('Tên nước').setRequired(true)),
    async execute(interaction) {
        const userId = interaction.user.id;
        const kingdomName = interaction.options.getString('name');

        if (getPlayer(userId)) {
            return interaction.reply({ content: "Bạn đã có vương quốc rồi!", ephemeral: true });
        }

        // Dữ liệu khởi tạo (Giai đoạn 1)
        const newPlayer = {
            id: userId,
            username: interaction.user.username,
            kingdomName: kingdomName,
            tier: 1, // Giai đoạn 1
            role: "Tân Lãnh Chúa",
            lastUpdate: Date.now(),
            resources: {
                gold: 1000,
                wood: 500,
                food: 1000
            },
            buildings: {
                farm: 1,
                gold_mine: 0,
                lumber_mill: 0,
                barracks: 0
            },
            units: {
                infantry: 0,
                archer: 0,
                cavalry: 0
            },
            // Map data (Phase sau sẽ dùng)
            landId: `LAND-${Math.floor(Math.random() * 9999)}` 
        };

        savePlayer(userId, newPlayer);

        const embed = new EmbedBuilder()
            .setTitle(`👑 VƯƠNG TRIỀU ${kingdomName.toUpperCase()} ĐÃ THÀNH LẬP!`)
            .setDescription(`Chào mừng Tân Lãnh Chúa <@${userId}>.\nBạn đã được cấp 1 mảnh đất vùng biên giới.\n\n**Tài nguyên khởi điểm:**\n💰 1000 Vàng\n🌲 500 Gỗ\n🌾 1000 Thực`)
            .setColor('Gold')
            .setFooter({ text: "Dùng /build để xây nhà, /me để xem chỉ số." });

        await interaction.reply({ embeds: [embed] });
    },
};