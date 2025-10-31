// ================= Shumir Music Bot (Prefix version) ================= //
require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");
const { Player, QueryType } = require("discord-player");
const playdl = require("play-dl");

// ----------------- Client setup ----------------- //
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
});

const prefix = "!";

// ----------------- Music player setup ----------------- //
const player = new Player(client, {
  ytdlOptions: {
    quality: "highestaudio",
    highWaterMark: 1 << 25,
  },
});

// ----------------- Bot ready ----------------- //
client.once("ready", () => {
  console.log(`✅ Đã đăng nhập thành công dưới tên ${client.user.tag}`);
  client.user.setActivity("🎶 | !help để xem lệnh");
});

// ----------------- Message handler ----------------- //
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const voice = message.member.voice.channel;

  // ----------------- !play ----------------- //
  if (command === "play") {
    if (!voice)
      return message.reply("❌ Bạn cần vào kênh voice trước!");
    if (!args[0])
      return message.reply("⚠️ Vui lòng nhập tên hoặc link bài hát!");

    const query = args.join(" ");
    await message.channel.send("🔍 Đang tìm kiếm bài hát...");

    let result;
    let source = "YouTube";

    try {
      // --- Tự phát hiện link ---
      if (playdl.yt_validate(query) === "video" || playdl.yt_validate(query) === "playlist") {
        source = "YouTube";
        result = await player.search(query, {
          requestedBy: message.author,
          searchEngine:
            playdl.yt_validate(query) === "playlist"
              ? QueryType.YOUTUBE_PLAYLIST
              : QueryType.YOUTUBE_VIDEO,
        });
      } else if (playdl.sp_validate(query) === "track" || playdl.sp_validate(query) === "playlist") {
        source = "Spotify";
        result = await player.search(query, {
          requestedBy: message.author,
          searchEngine:
            playdl.sp_validate(query) === "playlist"
              ? QueryType.SPOTIFY_PLAYLIST
              : QueryType.SPOTIFY_SONG,
        });
      } else if (playdl.so_validate(query) === "track" || playdl.so_validate(query) === "playlist") {
        source = "SoundCloud";
        result = await player.search(query, {
          requestedBy: message.author,
          searchEngine:
            playdl.so_validate(query) === "playlist"
              ? QueryType.SOUNDCLOUD_PLAYLIST
              : QueryType.SOUNDCLOUD_TRACK,
        });
      } else {
        // Nếu không phải link
        source = "YouTube Search";
        result = await player.search(query, {
          requestedBy: message.author,
          searchEngine: QueryType.AUTO,
        });
      }

      if (!result || !result.tracks.length)
        return message.reply("😢 Không tìm thấy bài hát hoặc playlist phù hợp.");

      const queue = await player.nodes.create(message.guild, {
        metadata: message.channel,
        volume: 80,
        leaveOnEnd: true,
        leaveOnEmpty: true,
      });

      if (!queue.connection) await queue.connect(voice);

      if (result.playlist) {
        queue.addTrack(result.tracks);
        if (!queue.isPlaying()) await queue.node.play();
        const embed = new EmbedBuilder()
          .setColor("#1abc9c")
          .setTitle("🎶 Đã thêm playlist")
          .setDescription(`**${result.playlist.title}** (${result.tracks.length} bài)`)
          .setFooter({ text: `Nguồn: ${source}` });
        return message.channel.send({ embeds: [embed] });
      } else {
        const track = result.tracks[0];
        queue.addTrack(track);
        if (!queue.isPlaying()) await queue.node.play();

        const embed = new EmbedBuilder()
          .setColor("#00bfff")
          .setTitle("🎧 Đang phát")
          .setDescription(`[${track.title}](${track.url})`)
          .setThumbnail(track.thumbnail)
          .addFields(
            { name: "⏱️ Thời lượng", value: track.duration, inline: true },
            { name: "📡 Nguồn", value: source, inline: true }
          )
          .setFooter({ text: `Yêu cầu bởi ${message.author.tag}` });

        return message.channel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error(err);
      message.reply("⚠️ Có lỗi xảy ra khi phát nhạc!");
    }
  }

  // ----------------- !pause ----------------- //
  else if (command === "pause") {
    const queue = player.nodes.get(message.guild.id);
    if (!queue || !queue.isPlaying())
      return message.reply("⚠️ Không có bài hát nào đang phát.");
    queue.node.pause();
    message.reply("⏸️ Đã tạm dừng nhạc.");
  }

  // ----------------- !resume ----------------- //
  else if (command === "resume") {
    const queue = player.nodes.get(message.guild.id);
    if (!queue)
      return message.reply("⚠️ Không có bài hát nào trong hàng đợi.");
    queue.node.resume();
    message.reply("▶️ Tiếp tục phát nhạc.");
  }

  // ----------------- !skip ----------------- //
  else if (command === "skip") {
    const queue = player.nodes.get(message.guild.id);
    if (!queue || !queue.isPlaying())
      return message.reply("⚠️ Không có bài nào để bỏ qua.");
    await queue.node.skip();
    message.reply("⏭️ Đã bỏ qua bài hát!");
  }

  // ----------------- !queue ----------------- //
  else if (command === "queue") {
    const queue = player.nodes.get(message.guild.id);
    if (!queue || !queue.isPlaying())
      return message.reply("📭 Hàng đợi trống!");

    const tracks = queue.tracks.toArray().slice(0, 10);
    const desc = tracks.map((t, i) => `${i + 1}. [${t.title}](${t.url})`).join("\n");

    const embed = new EmbedBuilder()
      .setColor("#f39c12")
      .setTitle("🎶 Hàng đợi hiện tại")
      .setDescription(desc || "Không có bài nào.")
      .setFooter({ text: `Tổng số bài: ${queue.tracks.size}` });

    message.channel.send({ embeds: [embed] });
  }

  // ----------------- !volume ----------------- //
  else if (command === "volume") {
    const queue = player.nodes.get(message.guild.id);
    if (!queue)
      return message.reply("⚠️ Không có nhạc để chỉnh âm lượng.");
    const vol = parseInt(args[0]);
    if (isNaN(vol) || vol < 0 || vol > 100)
      return message.reply("🔊 Nhập số từ 0 đến 100!");
    queue.node.setVolume(vol);
    message.reply(`✅ Đã chỉnh âm lượng: **${vol}%**`);
  }

  // ----------------- !leave ----------------- //
  else if (command === "leave") {
    const queue = player.nodes.get(message.guild.id);
    if (!queue)
      return message.reply("🚫 Bot không trong kênh nào.");
    queue.delete();
    message.reply("👋 Bot đã rời kênh voice!");
  }

  // ----------------- !check ----------------- //
  else if (command === "check") {
    const testEmbed = new EmbedBuilder()
      .setColor("#2ecc71")
      .setTitle("✅ Kiểm tra hệ thống")
      .setDescription("🧠 Mọi module hoạt động bình thường.")
      .addFields(
        { name: "Discord API", value: "✅ Kết nối ổn định" },
        { name: "play-dl", value: playdl.is_expired() ? "⚠️ Token YouTube cần làm mới!" : "✅ Hoạt động tốt" },
        { name: "Nguồn phát", value: "YouTube / Spotify / SoundCloud" }
      );
    message.channel.send({ embeds: [testEmbed] });
  }

  // ----------------- !help ----------------- //
  else if (command === "help") {
    const helpEmbed = new EmbedBuilder()
      .setColor("#9b59b6")
      .setTitle("🎵 Shumir Music Bot — Danh sách lệnh")
      .setDescription("✨ Dưới đây là tất cả lệnh bạn có thể dùng:")
      .addFields(
        {
          name: "🎧 Phát nhạc",
          value: "`!play <tên hoặc link>` — Phát bài hát\n`!pause` — Tạm dừng\n`!resume` — Tiếp tục\n`!skip` — Bỏ qua bài hiện tại\n`!leave` — Bot rời kênh",
          inline: false,
        },
        {
          name: "📜 Hàng đợi",
          value: "`!queue` — Xem danh sách bài trong hàng đợi",
          inline: false,
        },
        {
          name: "🎚️ Âm lượng",
          value: "`!volume <0-100>` — Chỉnh âm lượng",
          inline: false,
        },
        {
          name: "🧠 Khác",
          value: "`!check` — Kiểm tra kết nối hệ thống\n`!help` — Hiển thị hướng dẫn",
          inline: false,
        }
      )
      .setFooter({ text: "Shumir v2.0 • Dùng !play để bắt đầu phát nhạc 🎶" });

    return message.channel.send({ embeds: [helpEmbed] });
  }
});

// ----------------- Login ----------------- //
client.login(process.env.TOKEN);
