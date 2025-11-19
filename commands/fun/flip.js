const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('flip')
    .setDescription('Tung đồng xu 🪙'),

  async execute(interaction, client, gameStates) {
    const result = Math.random() < 0.5 ? '🪙 Mặt Ngửa!' : '🪙 Mặt Sấp!';
    const embed = new EmbedBuilder()
      .setColor('Gold')
      .setTitle('Tung đồng xu 🎲')
      .setDescription(result);
    await interaction.reply({ embeds: [embed] });
  }
};
