const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("quote")
    .setDescription("💬 Nhận một câu danh ngôn ngẫu nhiên!"),

  async execute(interaction, client, gameStates) {
    // deferred by index.js
    try {
      const res = await fetch("https://api.quotable.io/random");
      const data = await res.json();

      const embed = new EmbedBuilder()
        .setColor("Purple")
        .setTitle("🌟 Danh ngôn hôm nay")
        .setDescription(`*"${data.content}"*\n\n— **${data.author}**`);

      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply("❌ Không lấy được câu danh ngôn, thử lại sau.");
    }
  },
};
