const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Đặt lời nhắc cho chính bạn ⏰')
    .addStringOption(option => option.setName('thoigian').setDescription('Ví dụ: 10m, 2h, 1d').setRequired(true))
    .addStringOption(option => option.setName('noidung').setDescription('Nội dung lời nhắc').setRequired(true)),

  async execute(interaction) {
    const timeStr = interaction.options.getString('thoigian');
    const message = interaction.options.getString('noidung');

    const timeMs = parseTime(timeStr);
    if (!timeMs) return interaction.reply({ content: '❌ Định dạng thời gian không hợp lệ! Dùng ví dụ: `10m`, `2h`, `1d`.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor('Gold')
      .setTitle('⏰ Lời nhắc đã được tạo!')
      .setDescription(`**Nội dung:** ${message}\n**Thời gian:** ${timeStr}`)
      .setFooter({ text: `Tôi sẽ nhắc bạn sau ${timeStr}` });
    await interaction.reply({ embeds: [embed], ephemeral: true });

    setTimeout(() => {
      interaction.user.send(`🔔 **Lời nhắc của bạn:** ${message} (sau ${timeStr})`).catch(() => null);
    }, timeMs);
  }
};

function parseTime(str) {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2];
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * map[unit];
}
