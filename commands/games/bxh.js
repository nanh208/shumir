const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const scoresFile = "./scores.json";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bxh")
    .setDescription("📊 Hiển thị bảng xếp hạng người chơi"),

  async execute(interaction) {
    let scores = {};
    try {
      scores = JSON.parse(fs.readFileSync(scoresFile, "utf8"));
    } catch {
      return interaction.reply("⚠️ Chưa có dữ liệu điểm nào!");
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0)
      return interaction.reply("⚠️ Chưa có ai trong bảng xếp hạng!");

    const top = sorted
      .slice(0, 10)
      .map(([id, score], i) => `**${i + 1}.** <@${id}> — 🏆 **${score} điểm**`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("🏆 BẢNG XẾP HẠNG NGƯỜI CHƠI")
      .setDescription(top)
      .setColor("Gold")
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
