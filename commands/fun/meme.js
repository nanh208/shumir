const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fetch = require("node-fetch");

module.exports = {
  data: new SlashCommandBuilder().setName("meme").setDescription("📸 Gửi một meme ngẫu nhiên!"),
  async execute(interaction) {
    await interaction.deferReply();
    const res = await fetch("https://meme-api.com/gimme");
    const data = await res.json();
    const embed = new EmbedBuilder()
      .setColor("Random")
      .setTitle(`😂 ${data.title}`)
      .setImage(data.url)
      .setFooter({ text: `Nguồn: ${data.subreddit}` });
    await interaction.editReply({ embeds: [embed] });
  },
};
