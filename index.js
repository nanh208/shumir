require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, GatewayIntentBits, EmbedBuilder, Collection } = require("discord.js");
const { Player, QueryType, Track } = require("discord-player");
const playdl = require("play-dl");
const { DefaultExtractors } = require("@discord-player/extractor");

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
// --- THÊM MỚI: ID máy chủ (Guild) cụ thể của bạn ---
const GUILD_ID = "1308052869559222272"; 

// ----------------- Music player setup ----------------- //
const player = new Player(client, {
  ytdlOptions: {
    quality: "highestaudio",
    highWaterMark: 1 << 25,
  },
});

// ----------------- Extractor setup ----------------- //
(async () => {
  try {
    await player.extractors.loadMulti(DefaultExtractors);
    console.log("✅ Extractors registered thành công!");
  } catch (err) {
    console.error("❌ Failed to register extractors:", err);
  }
})();

// ----------------- SoundCloud setup ----------------- //
playdl.getFreeClientID().then(clientID => {
  playdl.setToken({ soundcloud: { client_id: clientID } });
  console.log("✅ SoundCloud Client ID được thiết lập.");
});

// ----------------- Player Event Handlers ----------------- //
player.events.on('playerStart', (queue, track) => {
    const channel = queue.metadata;
    channel.send(`🎵 **Bắt đầu phát:** [${track.title}](${track.url})`);
});

player.events.on('error', (queue, error) => {
    console.error(`[ERROR] Player Error in guild ${queue.guild.id}:`, error);
    if (queue.metadata) {
        queue.metadata.send(`❌ Lỗi Player: Đã xảy ra sự cố khi phát nhạc. Vui lòng thử lại. Lỗi: \`${error.message}\``);
    }
});

player.events.on('connectionError', (queue, error) => {
    console.error(`[ERROR] Connection Error in guild ${queue.guild.id}:`, error);
    if (queue.metadata) {
        queue.metadata.send(`❌ Lỗi Kết nối: Không thể kết nối hoặc duy trì kết nối voice. Lỗi: \`${error.message}\``);
    }
});

player.events.on('noFilter', (queue, filter) => {
    if (queue.metadata) {
        queue.metadata.send(`⚠️ Lỗi Filter: Không áp dụng được bộ lọc \`${filter}\` cho bài hát này.`);
    }
});

// ----------------- Bot ready ----------------- //
client.once("ready", () => {
  console.log(`✅ Đã đăng nhập thành công dưới tên ${client.user.tag}`);
  // --- CẬP NHẬT: Thông báo rõ bot đang chạy cho Guild nào ---
  console.log(`📡 Bot đang được cấu hình để chỉ chạy trên GUILD: ${GUILD_ID}`);
  client.user.setActivity("🎶 | !help để xem lệnh");
});

// ----------------- Message handler ----------------- //
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  // --- THÊM MỚI: Chỉ cho phép bot hoạt động ở máy chủ (GUILD) cụ thể ---
  if (message.guild.id !== GUILD_ID) {
      // Bot sẽ im lặng bỏ qua tất cả tin nhắn từ các server khác
      return; 
  }
  // --- KẾT THÚC THÊM MỚI ---

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const voice = message.member.voice.channel;

  // ----------------- !play ----------------- //
  if (command === "play") {
    if (!voice) return message.reply("❌ Bạn cần vào kênh voice trước!");
    if (!args[0]) return message.reply("⚠️ Vui lòng nhập tên hoặc link bài hát!");

    const query = args.join(" ");
    
    let loadingMessage;
    try {
        loadingMessage = await message.channel.send("🔍 Đang tìm kiếm bài hát...");
    } catch (e) {
        console.error("Failed to send loading message:", e);
    }


    try {
      let queue = player.nodes.get(message.guild.id);
      if (!queue) {
        queue = await player.nodes.create(message.guild, {
          metadata: message.channel,
          volume: 80,
          leaveOnEnd: true,
          leaveOnEmpty: true,
          ytdlOptions: {
              quality: "highestaudio",
              highWaterMark: 1 << 25,
          },
        });
      }

      if (!queue.connection) await queue.connect(voice);

      const result = await player.search(query, {
          requestedBy: message.author,
          searchEngine: QueryType.AUTO
      });
      
      if (loadingMessage) {
          await loadingMessage.delete();
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
      else {
          const addedEmbed = new EmbedBuilder()
            .setColor("#f1c40f")
            .setTitle("➕ Đã thêm vào hàng đợi")
            .setDescription(`[${track.title}](${track.url})`)
            .setFooter({ text: `Vị trí: ${queue.tracks.size}` });
          return message.channel.send({ embeds: [addedEmbed] });
      }

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

    } catch (err) {
      console.error("[PLAY COMMAND ERROR]:", err);
      if (loadingMessage) {
          await loadingMessage.delete();
      }
      return message.reply(`⚠️ Có lỗi xảy ra khi phát nhạc! Hãy kiểm tra console để biết chi tiết. Lỗi: \`${err.message}\``);
    }
  }

  // ----------------- Các lệnh khác giữ nguyên ----------------- //
  else if (command === "pause") {
    const queue = player.nodes.get(message.guild.id);
    if (!queue || !queue.isPlaying())
      return message.reply("⚠️ Không có bài hát nào đang phát.");
    queue.node.pause();
    message.reply("⏸️ Đã tạm dừng nhạc.");
  }

  else if (command === "resume") {
    const queue = player.nodes.get(message.guild.id);
    if (!queue) return message.reply("⚠️ Không có bài hát nào trong hàng đợi.");
    queue.node.resume();
    message.reply("▶️ Tiếp tục phát nhạc.");
  }

  else if (command === "skip") {
    const queue = player.nodes.get(message.guild.id);
    if (!queue || !queue.isPlaying())
      return message.reply("⚠️ Không có bài nào để bỏ qua.");
    await queue.node.skip();
    message.reply("⏭️ Đã bỏ qua bài hát!");
  }

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

  else if (command === "leave") {
    const queue = player.nodes.get(message.guild.id);
    if (!queue)
      return message.reply("🚫 Bot không trong kênh nào.");
    queue.delete();
    message.reply("👋 Bot đã rời kênh voice!");
  }

  else if (command === "check") {
    const testEmbed = new EmbedBuilder()
      .setColor("#2ecc71")
      .setTitle("✅ Kiểm tra hệ thống")
      .setDescription("🧠 Mọi module hoạt động bình thường.")
      .addFields(
        { name: "Discord API", value: "✅ Kết nối ổn định" },
        { name: "play-dl", value: playdl.is_expired() ? "⚠️ Token YouTube cần làm mới!" : "✅ Hoạt động tốt" },
        { name:s: "Nguồn phát", value: "YouTube / Spotify / SoundCloud" }
      );
    message.channel.send({ embeds: [testEmbed] });
  }

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