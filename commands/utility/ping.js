const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("ping").setDescription("🏓 Kiểm tra độ trễ!"),
  async execute(interaction) {
    const sent = await interaction.reply({ content: "🏓 Ping...", fetchReply: true });
    interaction.editReply(`Pong! Độ trễ: ${sent.createdTimestamp - interaction.createdTimestamp}ms`);
  },
};
