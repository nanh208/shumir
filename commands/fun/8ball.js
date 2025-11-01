const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const answers = [
  "Có chứ!",
  "Không đời nào 😆",
  "Chắc chắn rồi!",
  "Tui không chắc đâu...",
  "Câu hỏi khó quá, cho Shumir nghỉ chút!",
  "Ừm... có thể đấy!",
  "Không nha 🫣",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("🎱 Hỏi quả cầu tiên tri Shumir!")
    .addStringOption(opt => opt.setName("câu_hỏi").setDescription("Câu hỏi của bạn").setRequired(true)),

  async execute(interaction) {
    const question = interaction.options.getString("câu_hỏi");
    const reply = answers[Math.floor(Math.random() * answers.length)];
    const embed = new EmbedBuilder()
      .setColor("Purple")
      .setTitle("🎱 Quả cầu tiên tri Shumir")
      .addFields(
        { name: "❓ Câu hỏi:", value: question },
        { name: "✨ Trả lời:", value: reply }
      );
    await interaction.reply({ embeds: [embed] });
  },
};
