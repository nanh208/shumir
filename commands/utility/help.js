const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("📚 Xem danh sách lệnh hoặc thông tin chi tiết về các nhóm lệnh"),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor("#6CDBFF")
      .setTitle("📖 Danh sách lệnh Shumir — Tổng hợp")
      .setDescription(
        "✨ **Shumir Bot** — Bot giải trí, tiện ích, và mini-game hoàn toàn bằng tiếng Việt.\n" +
        "Dưới đây là danh mục lệnh được chia nhóm rõ ràng. Gõ `/help <tên_lệnh>` để xem hướng dẫn chi tiết hơn!\n"
      )
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setTimestamp();

    embed.addFields(
      {
        name: "🎭 Fun — Giải trí & tương tác",
        value:
          "`/meme` — Gửi meme ngẫu nhiên\n" +
          "`/joke` — Kể chuyện cười\n" +
          "`/8ball` — Hỏi đáp tiên tri vui\n" +
          "`/hug [user]` — Ôm ai đó bằng ảnh GIF\n" +
          "`/slap [user]` — Tát vui (GIF)\n" +
          "`/say [text]` — Bot nói lại bằng embed\n" +
          "`/avatar [user]` — Xem avatar của người dùng\n" +
          "`/roast [user]` — Châm chọc vui\n" +
          "`/compliment [user]` — Khen ngợi ngẫu nhiên\n" +
          "`/flip` — Tung đồng xu\n" +
          "`/roll [sides]` — Tung xúc xắc tùy chọn\n",
        inline: false,
      },
      {
        name: "🌐 Social — Kết nối & giao tiếp",
        value:
          "`/poll` — Tạo bình chọn bằng reaction\n" +
          "`/quote` — Lấy câu danh ngôn ngẫu nhiên\n" +
          "`/weather [địa điểm]` — Xem thời tiết từ wttr.in\n" +
          "`/horoscope [cung]` — Xem tử vi hôm nay\n" +
          "`/translate [text][lang]` — Dịch văn bản\n",
        inline: false,
      },
      {
        name: "⚙️ Utility — Công cụ & hỗ trợ",
        value:
          "`/help [command]` — Xem hướng dẫn lệnh\n" +
          "`/ping` — Kiểm tra độ trễ\n" +
          "`/userinfo [user]` — Thông tin người dùng\n" +
          "`/serverinfo` — Thông tin server\n" +
          "`/botinfo` — Thông tin bot\n" +
          "`/uptime` — Thời gian hoạt động bot\n" +
          "`/afk [lydo]` — Đặt trạng thái AFK\n" +
          "`/reminder [time][text]` — Đặt nhắc nhở\n",
        inline: false,
      },
      {
        name: "🎮 Games — Mini-game & thử thách",
        value:
          "`/rps [búa|bao|kéo]` — Oẳn tù tì\n" +
          "`/guessnumber` — Đoán số bí mật\n" +
          "`/slot` — Máy quay may mắn\n" +
          "`/trivia` — Câu hỏi kiến thức tổng hợp\n" +
          "`/wordguess [attempts]` — Đoán chữ (Hangman)\n" +
          "`/mathquiz` — Đố toán ngẫu nhiên\n" +
          "`/typebattle [length]` — Thi gõ nhanh\n" +
          "`/memorygame [length]` — Ghi nhớ chuỗi emoji\n" +
          "`/maze` — Mê cung 5x5\n" +
          "`/codebreaker [tries]` — Giải mã 4 chữ số\n" +
          "`/endgame` — Thoát mini-game đang chơi\n",
        inline: false,
      },
      {
        name: "🧠 Ghi chú quan trọng",
        value:
          "- Một số mini-game yêu cầu **trả lời bằng tin nhắn** sau khi bot hiển thị đề.\n" +
          "- Dùng `/offgame` (admin) để tạm tắt tất cả mini-game.\n" +
          "- `/endgame` cho phép người chơi dừng trò cá nhân.\n" +
          "- Khi test bot, có thể thêm `GUILD_ID` vào `.env` để deploy nhanh.\n",
        inline: false,
      }
    );

    embed.setFooter({
      text: "📘 Gõ /help <tên_lệnh> để xem hướng dẫn chi tiết từng lệnh — Shumir Bot™",
    });

    await interaction.reply({ embeds: [embed], ephemeral: false });
  },
};
