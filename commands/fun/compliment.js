const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('compliment')
    .setDescription('Khen ai đó một cách dễ thương 💖')
    .addUserOption(option => option.setName('target').setDescription('Người được khen').setRequired(true)),

  async execute(interaction, client, gameStates) {
    const target = interaction.options.getUser('target');
    const compliments = [
      "Bạn là người khiến Discord sáng bừng lên ✨",
      "Bạn tuyệt vời hơn cả emoji 💫",
      "Nếu nụ cười là phép màu, bạn chính là cả thế giới 🌎",
      "Bạn khiến mọi thứ trở nên tốt hơn 💐",
      "Nếu có huy chương dễ thương, bạn chắc chắn đoạt vàng 🥇"
    ];
    const compliment = compliments[Math.floor(Math.random() * compliments.length)];
    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('💖 Lời Khen Ngọt Ngào 💖')
      .setDescription(`${interaction.user} gửi đến ${target}:\n\n**"${compliment}"**`);
    await interaction.reply({ embeds: [embed] });
  }
};
