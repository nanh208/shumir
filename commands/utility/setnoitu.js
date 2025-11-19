// commands/admin/setnoitu.js
const { SlashCommandBuilder, PermissionsBitField } = require("discord.js");
const fs = require("fs");
const path = require("path");
const configPath = path.resolve(__dirname, "../../data/game-config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setnoitu")
    .setDescription("[ADMIN]: Chỉ định kênh này là kênh duy nhất để chơi Nối Từ.")
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.Administrator | PermissionsBitField.Flags.ManageGuild
    ),

  async execute(interaction, client, gameStates) {
    try {
      const channelId = interaction.channel.id;
      let configData = {};
      if (fs.existsSync(configPath)) {
        configData = JSON.parse(fs.readFileSync(configPath, "utf8"));
      }

      configData.wordGameChannelId = channelId;
      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

      await interaction.reply({
        content: `✅ Đã đặt kênh này (<#${channelId}>) làm **kênh chơi Nối Từ duy nhất.**`,
        ephemeral: true,
      });
    } catch (err) {
      console.error("❌ Lỗi khi thiết lập kênh Nối Từ:", err);
      await interaction.reply({
        content: "⚠️ Đã xảy ra lỗi khi thiết lập kênh.",
        ephemeral: true,
      });
    }
  },
};
