const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Tạo một cuộc bình chọn 🗳️')
    .addStringOption(option => option.setName('cauhoi').setDescription('Câu hỏi cho cuộc bình chọn').setRequired(true))
    .addStringOption(option => option.setName('luachon').setDescription('Các lựa chọn, cách nhau bằng dấu phẩy (,)').setRequired(true)),

  async execute(interaction, client, gameStates) {
    const question = interaction.options.getString('cauhoi');
    const choices = interaction.options.getString('luachon').split(',').map(c => c.trim()).filter(c => c.length);

    if (choices.length < 2) {
      return interaction.reply({ content: '❌ Cần ít nhất 2 lựa chọn để tạo bình chọn!', ephemeral: true });
    }

    const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    const pollEmbed = new EmbedBuilder()
      .setColor('Blurple')
      .setTitle('🗳️ Cuộc Bình Chọn Mới')
      .setDescription(`**${question}**\n\n${choices.map((c, i) => `${emojis[i]} ${c}`).join('\n')}`)
      .setFooter({ text: `Tạo bởi ${interaction.user.tag}` });

    const message = await interaction.reply({ embeds: [pollEmbed], fetchReply: true });
    for (let i = 0; i < choices.length && i < emojis.length; i++) await message.react(emojis[i]);
  }
};
