const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const translate = require('translate-google');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Dịch văn bản sang ngôn ngữ khác 🌍')
    .addStringOption(option => option.setName('vanban').setDescription('Văn bản cần dịch').setRequired(true))
    .addStringOption(option => 
      option.setName('ngonngu')
        .setDescription('Mã ngôn ngữ đích (vd: en, vi, ja, ko, zh, fr...)')
        .setRequired(true)
    ),

  async execute(interaction, client, gameStates) {
    const text = interaction.options.getString('vanban');
    const lang = interaction.options.getString('ngonngu');
    // deferred by index.js

    try {
      const translated = await translate(text, { to: lang });
      const embed = new EmbedBuilder()
        .setColor('Aqua')
        .setTitle('🌍 Kết quả dịch')
        .addFields(
          { name: '🔹 Gốc', value: text },
          { name: `🔸 Dịch sang (${lang})`, value: translated }
        );
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply('❌ Không dịch được văn bản này.');
    }
  }
};
