const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Xem bot đã hoạt động bao lâu 🕐'),

  async execute(interaction) {
    const uptime = formatUptime(interaction.client.uptime);
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('🕐 Thời gian hoạt động')
      .setDescription(`Bot đã hoạt động được: **${uptime}**`);
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
