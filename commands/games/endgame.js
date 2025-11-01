const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

// Bộ nhớ tạm để theo dõi ai đang chơi game
// (nếu bạn đã có object global để lưu game thì có thể dùng chung)
const activeGames = require("../../data/activeGames.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("endgame")
    .setDescription("❌ Thoát khỏi mini game bạn đang chơi"),

  async execute(interaction) {
    const userId = interaction.user.id;

    // Kiểm tra người chơi có đang chơi không
    if (!activeGames[userId]) {
      return interaction.reply({
        content: "⚠️ Bạn hiện không tham gia mini game nào.",
        ephemeral: true,
      });
    }

    // Xóa game của người này khỏi danh sách
    delete activeGames[userId];

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("🚪 Thoát game thành công")
      .setDescription("Bạn đã rời khỏi mini game hiện tại.")
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
