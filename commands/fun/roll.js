const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Lắc xúc xắc 🎲')
    .addIntegerOption(option => 
      option.setName('sides')
        .setDescription('Số mặt của xúc xắc (mặc định: 6)')
        .setMinValue(2)
        .setMaxValue(100)
    ),

  async execute(interaction, client, gameStates) {
    const sides = interaction.options.getInteger('sides') || 6;
    const roll = Math.floor(Math.random() * sides) + 1;
    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('🎲 Kết quả xúc xắc 🎲')
      .setDescription(`${interaction.user} tung ra **${roll}** (1–${sides})`);
    await interaction.reply({ embeds: [embed] });
  }
};
