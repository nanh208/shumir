const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const afkUsers = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Đánh dấu bạn đang AFK 💤')
    .addStringOption(option =>
      option.setName('lydo')
        .setDescription('Lý do bạn AFK (tùy chọn)')
    ),

  async execute(interaction) {
    const reason = interaction.options.getString('lydo') || 'Không có lý do cụ thể.';
    afkUsers.set(interaction.user.id, { reason, time: Date.now() });

    const embed = new EmbedBuilder()
      .setColor('Grey')
      .setTitle('💤 Bạn đã bật chế độ AFK')
      .setDescription(`**Lý do:** ${reason}\n\nKhi ai đó nhắc bạn, họ sẽ thấy thông báo AFK.`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  checkMentionAFK(message) {
    if (!message.mentions.users.size) return;
    message.mentions.users.forEach(user => {
      const afk = afkUsers.get(user.id);
      if (afk) {
        const diff = Math.floor((Date.now() - afk.time) / 60000);
        message.reply(`💤 **${user.tag}** đang AFK: ${afk.reason} *(đã ${diff} phút)*`);
      }
    });

    if (afkUsers.has(message.author.id)) {
      afkUsers.delete(message.author.id);
      message.reply('👋 Chào mừng bạn trở lại! AFK đã được tắt.');
    }
  }
};
