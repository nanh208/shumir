// commands/admin/admin.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription("🛠️ Lệnh quản trị — chỉ admin có thể sử dụng")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName("suabxh")
        .setDescription("Điều chỉnh điểm người chơi trong BXH")
        .addUserOption(opt => opt.setName("user").setDescription("Người cần chỉnh").setRequired(true))
        .addIntegerOption(opt => opt.setName("amount").setDescription("Số điểm cộng/trừ").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("resetbxh").setDescription("Xóa toàn bộ bảng xếp hạng (không thể hoàn tác!)")
    )
    .addSubcommand(sub =>
      sub.setName("botstatus").setDescription("Xem trạng thái hoạt động của Shumir Bot")
    )
    .addSubcommand(sub =>
      sub.setName("offgame").setDescription("Tắt toàn bộ mini-game đang hoạt động")
    )
    .addSubcommand(sub =>
      sub.setName("backup").setDescription("Sao lưu dữ liệu BXH & Game ra file JSON")
    ),

  async execute(interaction, client, gameStates) {
    // Kiểm tra quyền admin
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ Lệnh này chỉ dành cho **Admin**!", ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    try {
      switch (sub) {
        // --- Sửa điểm BXH ---
        case "suabxh": {
          const target = interaction.options.getUser("user");
          const amount = interaction.options.getInteger("amount");

          const scoresPath = path.join(__dirname, "../../scores.json");
          const scores = fs.existsSync(scoresPath)
            ? JSON.parse(fs.readFileSync(scoresPath, "utf8"))
            : {};

          scores[target.id] = (scores[target.id] || 0) + amount;
          fs.writeFileSync(scoresPath, JSON.stringify(scores, null, 2));

          return interaction.reply({
            content: `✅ Đã chỉnh **${amount > 0 ? "+" : ""}${amount}** điểm cho **${target.username}**.`,
            ephemeral: true,
          });
        }

        // --- Reset BXH ---
        case "resetbxh": {
          fs.writeFileSync(path.join(__dirname, "../../scores.json"), "{}");
          return interaction.reply({
            content: "⚠️ Đã **reset toàn bộ BXH** về 0.",
            ephemeral: true,
          });
        }

        // --- Kiểm tra trạng thái Bot ---
        case "botstatus": {
          const uptime = Math.floor(process.uptime() / 60);
          const ping = interaction.client.ws.ping;

          const embed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("🤖 Trạng thái Shumir Bot")
            .addFields(
              { name: "⏱ Uptime", value: `${uptime} phút`, inline: true },
              { name: "📶 Ping", value: `${ping}ms`, inline: true },
              { name: "🧩 Server", value: `${interaction.client.guilds.cache.size}`, inline: true },
            )
            .setFooter({ text: "Shumir Bot — Hệ thống quản trị" })
            .setTimestamp();

          return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // --- Tắt toàn bộ game ---
        case "offgame": {
          const activeGamesPath = path.join(__dirname, "../../data/activeGames.json");
          fs.writeFileSync(activeGamesPath, "{}");

          return interaction.reply({
            content: "🛑 Đã **tắt toàn bộ mini-game** (bảo trì).",
            ephemeral: true,
          });
        }

        // --- Sao lưu dữ liệu ---
        case "backup": {
          const now = new Date().toISOString().replace(/[:.]/g, "-");
          const backupDir = path.join(__dirname, "../../data/backups");
          const backupFile = path.join(backupDir, `backup-${now}.json`);

          if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

          const data = {
            scores: fs.existsSync(path.join(__dirname, "../../scores.json"))
              ? JSON.parse(fs.readFileSync(path.join(__dirname, "../../scores.json"), "utf8"))
              : {},
            activeGames: fs.existsSync(path.join(__dirname, "../../data/activeGames.json"))
              ? JSON.parse(fs.readFileSync(path.join(__dirname, "../../data/activeGames.json"), "utf8"))
              : {},
            backupTime: now,
          };

          fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));

          return interaction.reply({
            content: `📦 Đã sao lưu dữ liệu bot: \`${backupFile}\``,
            ephemeral: true,
          });
        }

        default:
          return interaction.reply({ content: "❓ Lệnh không hợp lệ!", ephemeral: true });
      }
    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: "⚠️ Đã xảy ra lỗi trong quá trình xử lý lệnh admin.",
        ephemeral: true,
      });
    }
  },
};
