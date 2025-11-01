const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const os = require('os');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Xem thông tin về bot 🤖'),

  async execute(interaction) {
    const uptime = formatUptime(interaction.client.uptime);
    const embed = new EmbedBuilder()
      .setColor('Blurple')
      .setTitle('🤖 Thông tin Bot')
      .addFields(
        { name: 'Tên bot', value: interaction.client.user.username, inline: true },
        { name: 'Người tạo', value: '✨ Bạn đó 😎', inline: true },
        { name: 'Thời gian hoạt động', value: uptime, inline: true },
        { name: 'Server đang tham gia', value: `${interaction.client.guilds.cache.size}`, inline: true },
        { name: 'Ngôn ngữ', value: 'Node.js (discord.js v14)', inline: true },
        { name: 'RAM sử dụng', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
        { name: 'Hệ điều hành', value: `${os.type()} ${os.release()}`, inline: true }
      )
      .setThumbnail(interaction.client.user.displayAvatarURL());
    await interaction.reply({ embeds: [embed] });
  }
};

function formatUptime(ms) {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${m}m ${s}s`;
}
