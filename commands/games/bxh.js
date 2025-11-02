const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const scoresFile = path.resolve(__dirname, "../data/scores.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bxh")
    .setDescription("📊 Hiển thị bảng xếp hạng người chơi trong server này"),

  async execute(interaction) {
    let scores = {};
    try {
      if (fs.existsSync(scoresFile)) {
        scores = JSON.parse(fs.readFileSync(scoresFile, "utf8"));
      }
    } catch (err) {
      console.error("Lỗi đọc scores.json:", err);
      return interaction.reply("⚠️ Không thể đọc dữ liệu điểm!");
    }

    const guildId = interaction.guild.id;
    const guildScores = scores[guildId] || {};

    const sorted = Object.entries(guildScores).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0)
      return interaction.reply("⚠️ Chưa có ai trong bảng xếp hạng của server này!");

    const top = sorted
      .slice(0, 10)
      .map(([id, score], i) => `**${i + 1}.** <@${id}> — 🏆 **${score} điểm**`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`🏆 BẢNG XẾP HẠNG SERVER: ${interaction.guild.name}`)
      .setDescription(top)
      .setColor("Gold")
      .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
