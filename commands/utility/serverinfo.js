const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Xem thông tin chi tiết về server 🏰'),

  async execute(interaction) {
    const { guild } = interaction;
    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle(`🏰 Thông tin Server: ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: '👑 Chủ server', value: `<@${guild.ownerId}>`, inline: true },
        { name: '🆔 ID', value: guild.id, inline: true },
        { name: '👥 Thành viên', value: `${guild.memberCount}`, inline: true },
        { name: '📅 Tạo ngày', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '🌎 Khu vực', value: guild.preferredLocale, inline: true }
      );
    await interaction.reply({ embeds: [embed] });
  }
};
