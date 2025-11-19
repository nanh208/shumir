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
      .setColor("#ff9ce6")
      .setTitle("⋆｡‧˚ʚ♡ɞ˚‧｡⋆ PET GAME - HƯỚNG DẪN CHI TIẾT ⋆｡‧˚ʚ♡ɞ˚‧｡⋆")
      .setDescription(`
◇─◇──◇─────◇──◇─◇
│   ✧･ﾟ:* ✧･ﾟ:* PET SYSTEM V2 *:･ﾟ✧*:･ﾟ✧   │
◇─◇──◇─────◇──◇─◇

˗ˏˋ ★ ˎˊ˗ Hệ thống thú nuôi chiến đấu, tiến hóa, kỹ năng và PvP 1v1 cực cuốn! ✦ ˗ˏˋ ★ ˎˊ˗


◆ ━━━━━━ ◦ ❖ ◦ ━━━━━━ ◆ Cú pháp cơ bản ◆ ━━━━━━ ◦ ❖ ◦ ━━━━━━ ◆
\`\`\`
/pet [subcommand] [options]
\`\`\`


⋆｡‧˚ʚ♡ɞ˚‧｡⋆ Lưu ý quan trọng ⋆｡‧˚ʚ♡ɞ˚‧｡⋆  
✧ Bot cần quyền gửi embed & button để hoạt động tốt nhất.


╭─────────────────────────────────────╮
│        ★ ☆ ★ LỆNH CON ★ ☆ ★        │
╰─────────────────────────────────────╯

**+ spawn** → Gọi thú rừng ngẫu nhiên  
**+ catch** → Bắt thú bằng Capsule  
**+ info** → Xem thông tin thú của bạn  
**+ inventory** → Xem toàn bộ thú  
**+ upgrade** → Nâng cấp / tiến hóa  
**+ skills** → Xem kỹ năng nguyên tố & vật lý  
**+ pvp** → Thách đấu người chơi khác  
**+ team** → Gán thú làm thú chính  
**+ help** → Hiện hướng dẫn này  


✧･ﾟ: ✧･ﾟ: ♡ ︎HỆ THỐNG GAME ♡ :･ﾟ✧:･ﾟ✧
┌─・°*。✧･ﾟ: *✧･ﾟ:*────*:･ﾟ✧*:･ﾟ✧。*°・─┐
│             VAI TRÒ & CẤU TRÚC PET GAME          │
└─・°*。✧･ﾟ: *✧･ﾟ:*────*:･ﾟ✧*:･ﾟ✧。*°・─┘

**[★] Wild Pet System** → Pet xuất hiện ngẫu nhiên  
**[★] Capture System** → Capsule có tỉ lệ bắt khác nhau  
**[★] Battle System** → Đánh theo lượt, dùng skill  
**[★] Element System** → Nước, Lửa, Cỏ, Sét, Bóng Tối, Ánh Sáng  
**[★] Gene System** → Tăng chỉ số theo gen  
**[★] Evolution** → Pet lên cấp để tiến hóa  
**[★] PvP Mode** → Đấu 1v1 giữa người chơi  


✧･ﾟ:* ✧･ﾟ:* ♡ CÁCH CHƠI CHO NGƯỜI MỚI ♡ *:･ﾟ✧*:･ﾟ✧

🐣 **Bước 1 → Gọi pet rừng**  
\`\`\`
/pet spawn
\`\`\`

🪄 **Bước 2 → Bắt pet**  
Dùng Capsule để bắt:  
\`\`\`
/pet catch
\`\`\`

📘 **Bước 3 → Kiểm tra pet vừa bắt**  
\`\`\`
/pet info
\`\`\`

🌱 **Bước 4 → Train và nâng cấp**  
\`\`\`
/pet upgrade
\`\`\`

⚔️ **Bước 5 → Đặt pet chiến đấu chính**  
\`\`\`
/pet team
\`\`\`

🎮 **Bước 6 → PvP cùng bạn bè!**  
\`\`\`
/pet pvp @User
\`\`\`

💡 **TIP quan trọng:**  
• Dùng pet hệ khắc chế để thắng dễ hơn  
• Gen cao → damage mạnh  
• Pet hiếm → nhiều skill hơn  
• Đừng quên mở túi để xem pet hiếm mới bắt được  


˚₊·͟͟͟͟͟➳❥ Ví dụ sử dụng ˚₊·͟͟͟͟͟➳❥
╔═══════════════════════════════════╗
║             💫 VÍ DỤ 💫           ║
╚═══════════════════════════════════╝

🐾 **Bắt pet rừng**  
\`\`\`
/pet spawn
/pet catch
\`\`\`

🐾 **Xem pet của bạn**  
\`\`\`
/pet info
/pet inventory
\`\`\`

🐾 **Nâng cấp & tiến hóa**  
\`\`\`
/pet upgrade
\`\`\`

🐾 **Thách PvP**  
\`\`\`
/pet pvp @User
\`\`\`


✧｡٩(ˊᗜˋ)و✧｡ Mẹo hay & Tricks ✧｡٩(ˊᗜˋ)و✧｡

🌿 Dùng pet hệ khắc chế để thắng PvP  
🔥 Lên cấp tăng mạnh stats và mở skill mới  
⚡ Pet càng hiếm → chỉ số càng cao  
💎 Gen cao → damage lớn và nhiều hiệu ứng hơn  
🎯 Mỗi pet có set skill riêng biệt  
📦 Kiểm tra túi để không bỏ sót pet hiếm  



⋆౨ৎ˚⟡˖ ࣪ Guidelines & Rules ⋆౨ৎ˚⟡˖ ࣪

+ ⚔️ Không spam bắt pet  
+ 🎮 Không dùng bug để farm  
+ 💕 Tôn trọng người chơi khác  
+ 📜 Tuân thủ luật server  

         ♡ ENJOY THE GAME ♡
`);

    await interaction.reply({ embeds: [embed] });
  },
};
