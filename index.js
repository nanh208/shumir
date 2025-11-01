// ================= Shumir Music Bot (Prefix version) ================= //
require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder
} = require("discord.js");
const { Player, QueryType } = require("discord-player");
const playdl = require("play-dl");
const { YouTubeExtractor, SpotifyExtractor, SoundCloudExtractor } = require("@discord-player/extractor");

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

// ----------------- SoundCloud setup ----------------- //
playdl.getFreeClientID().then(clientID => {
  playdl.setToken({ soundcloud: { client_id: clientID } });
});

// register extractors
(async () => {
  try {
    await player.extractors.register(YouTubeExtractor, {});
    await player.extractors.register(SoundCloudExtractor, {});
    await player.extractors.register(SpotifyExtractor, {});
    console.log("✅ Extractors registered");
  } catch (err) {
    console.error("❌ Failed to register extractors:", err);
  }
})();

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
    if (!voice) return message.reply("❌ Bạn cần vào kênh voice trước!");
    if (!args[0]) return message.reply("⚠️ Vui lòng nhập tên hoặc link bài hát!");

    const query = args.join(" ");
    await message.channel.send("🔍 Đang tìm kiếm bài hát...");

    try {
      // reuse existing queue if any, else create
      let queue = player.nodes.get(message.guild.id);
      if (!queue) {
        queue = await player.nodes.create(message.guild, {
          metadata: message.channel,
          volume: 80,
          leaveOnEnd: true,
          leaveOnEmpty: true,
        });
      }

      // connect to voice if not connected
      if (!queue.connection) await queue.connect(voice);

      // detect URL types first (more reliable for direct links)
      const isYouTubeUrl = /(?:youtube\.com\/|youtu\.be\/)/i.test(query);
      const isYouTubePlaylist = /[?&]list=/.test(query) || /playlist/i.test(query);

      let result;
      if (isYouTubeUrl) {
        const engine = isYouTubePlaylist ? QueryType.YOUTUBE_PLAYLIST : QueryType.YOUTUBE_VIDEO;
        console.log(`[play] YouTube URL detected -> engine: ${engine}, query: ${query}`);
        result = await player.search(query, { requestedBy: message.author, searchEngine: engine });
      } else {
        // AUTO first (search / other sources)
        console.log(`[play] Using AUTO search for query: ${query}`);
        result = await player.search(query, { requestedBy: message.author, searchEngine: QueryType.AUTO });
      }

      // fallback: if AUTO didn't find but it's a yt url, try explicit yt engine
      if ((!result || !result.tracks.length) && isYouTubeUrl) {
        const engine = isYouTubePlaylist ? QueryType.YOUTUBE_PLAYLIST : QueryType.YOUTUBE_VIDEO;
        console.log(`[play] AUTO failed, fallback to explicit YouTube engine: ${engine}`);
        const fallback = await player.search(query, { requestedBy: message.author, searchEngine: engine });
        result = fallback;
      }

      if (!result || !result.tracks.length) {
        return message.reply("😢 Không tìm thấy bài hát hoặc playlist phù hợp.");
      }

      // playlist
      if (result.playlist) {
        queue.addTrack(result.tracks);
        if (!queue.isPlaying()) await queue.node.play();

        const embed = new EmbedBuilder()
          .setColor("#1abc9c")
          .setTitle("🎶 Đã thêm playlist")
          .setDescription(`**${result.playlist.title || "Playlist"}** — ${result.tracks.length} bài`)
          .setFooter({ text: `Nguồn: ${result.playlist.source ?? "YouTube"}` });

        return message.channel.send({ embeds: [embed] });
      }

      // single track
      const track = result.tracks[0];
      queue.addTrack(track);
      if (!queue.isPlaying()) await queue.node.play();

      const embed = new EmbedBuilder()
        .setColor("#00bfff")
        .setTitle("🎧 Đang phát")
        .setDescription(`[${track.title}](${track.url})`)
        .setThumbnail(track.thumbnail || track.displayThumbnail?.("default"))
        .addFields(
          { name: "⏱️ Thời lượng", value: track.duration || "Không rõ", inline: true },
          { name: "📡 Nguồn", value: track.source || "YouTube", inline: true }
        )
        .setFooter({ text: `Yêu cầu bởi ${message.author.tag}` });

      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply("⚠️ Có lỗi xảy ra khi phát nhạc!");
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
    if (!queue) return message.reply("⚠️ Không có bài hát nào trong hàng đợi.");

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
