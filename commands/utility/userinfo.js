const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Xem thông tin chi tiết của một người dùng 👤')
    .addUserOption(option => option.setName('user').setDescription('Người cần xem')),

  async execute(interaction, client, gameStates) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id);
    const embed = new EmbedBuilder()
      .setColor('Aqua')
      .setTitle(`👤 Thông tin người dùng: ${user.username}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Tên đầy đủ', value: user.tag, inline: true },
        { name: 'ID', value: user.id, inline: true },
        { name: 'Tham gia server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
        { name: 'Tạo tài khoản', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Vai trò', value: member.roles.cache.map(r => r).slice(0, 10).join(' ') || 'Không có', inline: false }
      );
    await interaction.reply({ embeds: [embed] });
  }
};
