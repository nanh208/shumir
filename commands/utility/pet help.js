const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pet")
    .setDescription("Hệ thống thú nuôi")
    .addSubcommand(sub =>
      sub
        .setName("help")
        .setDescription("Xem hướng dẫn chơi Pet Game")
    ),

  async execute(interaction) {
    if (interaction.options.getSubcommand() !== "help")
      return interaction.reply({ content: "Lệnh không hợp lệ.", ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor("#ff85a2") // Màu hồng đào, hài hòa hơn
      .setTitle("⋆｡‧˚ʚ♡ɞ˚‧｡⋆ PET GAME - HƯỚNG DẪN CHI TIẾT ⋆｡‧˚ʚ♡ɞ˚‧｡⋆")
      .setDescription(`
◇─◇──◇─────◇──◇─◇
│   ✧･ﾟ:* ✧･ﾟ:* PET SYSTEM V2 *:･ﾟ✧*:･ﾟ✧   │
◇─◇──◇─────◇──◇─◇

˗ˏˋ ★ ˎˊ˗ Hệ thống thú nuôi chiến đấu, tiến hóa, kỹ năng và PvP 1v1 cực cuốn! ✦ ˗ˏˋ ★ ˎˊ˗
`)
    .addFields(
        {
            name: "◆ ━━━━━━ ◦ ❖ ◦ ━━━━━━ ◆ LỆNH CHÍNH ◆ ━━━━━━ ◦ ❖ ◦ ━━━━━━ ◆",
            value: `
            **[🎒] /inventory**  → Quản lý Pet (chọn Đồng Hành, Cho Ăn, nâng Stats).
            **[⚔️] /adventure**  → Bắt đầu trận đấu Dungeons/Boss (Farm EXP).
            **[🥊] /pvp**         → Thách đấu người chơi khác (dùng Pet Đồng Hành).
            **[⚙️] /setup_spawn** → Cài đặt kênh xuất hiện Pet ngẫu nhiên (Admin).
            **[📜] /pet help**   → Hiện hướng dẫn này.
            `,
            inline: false
        },
        {
            name: "✧･ﾟ: ✧･ﾟ: ♡ HỆ THỐNG CỐT LÕI ♡ :･ﾟ✧:･ﾟ✧",
            value: `
            **[🌟] Wild Pet System**  → Pet xuất hiện ngẫu nhiên.
            **[💎] Capture System**  → Bắt Pet sau khi chiến thắng trận đấu.
            **[🧬] Gene System**      → Ảnh hưởng trực tiếp đến chỉ số Pet (ATK, DEF, SPD...).
            **[💧🔥🌿] Elements**    → 6 hệ nguyên tố khắc chế, yêu cầu chiến thuật.
            **[🔄] Evolution**       → Pet lên cấp để tiến hóa và mở khóa kỹ năng mới.
            `,
            inline: false
        },
        {
            name: "⚔️ VÍ DỤ & HƯỚNG DẪN CHƠI ⚔️",
            value: `
            **1️⃣ Thu thập & Chọn Đồng Hành:** - Chờ Pet Wild Spawn hoặc dùng lệnh Starter.
            - Chọn Pet chính trong \`/inventory\`.
            
            **2️⃣ Huấn Luyện:**
            - Dùng \`/inventory\` để **Cho Ăn** (tăng XP) và **Nâng Cấp** (cộng điểm tiềm năng).
            
            **3️⃣ Chiến Đấu:**
            - Đánh Boss/Dungeons: \` /adventure \`
            - Thách đấu PvP: \` /pvp @User \`
            `,
            inline: false
        },
        {
            name: "✨ TIP QUAN TRỌNG ✨",
            value: `
            • Gen cao và Pet hiếm có chỉ số mạnh mẽ hơn.
            • Hồi phục HP/MP cho Pet trong \`/inventory\` bằng Thuốc Hồi Phục.
            • Tận dụng hệ khắc chế trong PvP để thắng dễ dàng.
            `,
            inline: false
        }
    )
    .setFooter({ text: "⋆౨ৎ˚⟡˖ ࣪ Enjoy the game! ⋆౨ৎ˚⟡˖ ࣪" });

    await interaction.reply({ embeds: [embed] });
  },
};