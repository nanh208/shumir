const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const scoresFile = "./scores.json";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("suabxh")
    .setDescription("🛠️ Quản lý bảng xếp hạng (chỉ admin dùng)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName("add")
        .setDescription("➕ Thêm điểm cho người chơi")
        .addUserOption(opt =>
          opt.setName("user").setDescription("Người chơi").setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName("amount").setDescription("Số điểm cộng").setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName("remove")
        .setDescription("➖ Xóa điểm của người chơi")
        .addUserOption(opt =>
          opt.setName("user").setDescription("Người chơi").setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName("amount").setDescription("Số điểm trừ").setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");

    let scores = {};
    try {
      scores = JSON.parse(fs.readFileSync(scoresFile, "utf8"));
    } catch {
      scores = {};
    }

    if (sub === "add") {
      scores[user.id] = (scores[user.id] || 0) + amount;
      fs.writeFileSync(scoresFile, JSON.stringify(scores, null, 2));
      await interaction.reply(`✅ Đã cộng **${amount} điểm** cho **${user.username}**!`);
    } else if (sub === "remove") {
      scores[user.id] = Math.max((scores[user.id] || 0) - amount, 0);
      fs.writeFileSync(scoresFile, JSON.stringify(scores, null, 2));
      await interaction.reply(`🗑️ Đã trừ **${amount} điểm** của **${user.username}**.`);
    }
  },
};
