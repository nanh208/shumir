const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fact')
    .setDescription('Lấy một sự thật ngẫu nhiên thú vị 📘'),

  async execute(interaction) {
    // deferred by index.js
    try {
      const res = await fetch('https://uselessfacts.jsph.pl/random.json?language=en');
      const data = await res.json();
      const embed = new EmbedBuilder()
        .setColor('Aqua')
        .setTitle('🧠 Sự thật ngẫu nhiên')
        .setDescription(`**${data.text}**`);
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply('❌ Không lấy được dữ liệu, thử lại sau.');
    }
  }
};
