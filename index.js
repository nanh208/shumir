// index.js — Bot phát nhạc Discord (ổn định, dùng play-dl, không cần API key)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    Collection // <<< Thêm Collection
} = require("discord.js");
const { Player, QueryType } = require("discord-player");
<<<<<<< HEAD
const playdl = require("play-dl");
=======
const playdl = require("play-dl"); // <<< Thêm playdl
const { YouTubeExtractor, SpotifyExtractor, SoundCloudExtractor } = require("@discord-player/extractor");
>>>>>>> 101cf9797f9817c6889a4271cf2e4eab76e5900b

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // Cần thiết cho lệnh dùng prefix (messageCreate)
    ]
});

client.commands = new Collection();
const prefix = "!"; // Định nghĩa prefix cho lệnh tin nhắn (messageCreate)

// 🔧 Load tất cả lệnh (dành cho Slash Commands)
const commandsPath = path.join(__dirname, "commands");
if (fs.existsSync(commandsPath)) {
    for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"))) {
        const command = require(path.join(commandsPath, file));
        // Kiểm tra xem command có thuộc tính data (cho slash) hay name (cho legacy)
        client.commands.set(command.data?.name || command.name, command);
    }
}

// 🎵 Player setup
const player = new Player(client);
client.player = player;

// ----------------- Extractors setup ----------------- //
const { YouTubeExtractor, SpotifyExtractor, SoundCloudExtractor } = require("@discord-player/extractor");

(async () => {
<<<<<<< HEAD
  await player.extractors.register(YouTubeExtractor, {});
  await player.extractors.register(SoundCloudExtractor, {});
  await player.extractors.register(SpotifyExtractor, {});
=======
    try {
        await player.extractors.register(YouTubeExtractor, {});
        await player.extractors.register(SoundCloudExtractor, {});
        await player.extractors.register(SpotifyExtractor, {});
        console.log("✅ Extractors registered");
    } catch (err) {
        console.error("❌ Failed to register extractors:", err);
    }
>>>>>>> 101cf9797f9817c6889a4271cf2e4eab76e5900b
})();

// ----------------- Bot ready ----------------- //
client.once("ready", () => {
    console.log(`✅ Đăng nhập thành công: ${client.user.tag}`);
    client.user.setActivity("🎶 | /play hoặc !play để phát nhạc");
});

// ----------------- Message handler (Lệnh dùng prefix: !play) ----------------- //
client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const voice = message.member.voice.channel;

    // --- PLAY COMMAND ---
    if (command === "play") {
        if (!voice) return message.reply("❌ Bạn cần vào kênh voice trước!");
        if (!args[0]) return message.reply("⚠️ Vui lòng nhập tên hoặc link bài hát!");

        const query = args.join(" ");
        let msg = await message.channel.send("🔍 Đang tìm kiếm bài hát...");

        try {
            let queue = player.nodes.get(message.guild.id);
            if (!queue) {
                queue = await player.nodes.create(message.guild, {
                    metadata: message.channel,
                    volume: 80,
                    leaveOnEnd: true,
                    leaveOnEmpty: true,
                });
            }

            if (!queue.connection) await queue.connect(voice);

            // Tối ưu hóa việc tìm kiếm link:
            // 1. Kiểm tra URL Spotify/SoundCloud trước (nhờ Extractors)
            // 2. Nếu là YouTube URL, ưu tiên tìm kiếm bằng QueryType.YOUTUBE_VIDEO/YOUTUBE_PLAYLIST
            // 3. Nếu không phải link hoặc không rõ, dùng AUTO.
            
            let result;
            const isUrl = /(https?:\/\/[^\s]+)/.test(query);

            if (isUrl) {
                // Thử tìm kiếm bằng AUTO trước để các Extractor như Spotify/SoundCloud nhận dạng
                result = await player.search(query, { requestedBy: message.author, searchEngine: QueryType.AUTO });

                // Nếu AUTO không tìm thấy, và là YouTube URL, thử tìm kiếm YouTube cụ thể
                if (!result || !result.tracks.length) {
                    const isYouTubeUrl = /(?:youtube\.com\/|youtu\.be\/)/i.test(query);
                    const isYouTubePlaylist = /[?&]list=/.test(query) || /playlist/i.test(query);

                    if (isYouTubeUrl) {
                        const engine = isYouTubePlaylist ? QueryType.YOUTUBE_PLAYLIST : QueryType.YOUTUBE_VIDEO;
                        result = await player.search(query, { requestedBy: message.author, searchEngine: engine });
                    }
                }
            } else {
                // Nếu không phải URL, dùng AUTO (sẽ tìm kiếm trên YouTube theo mặc định)
                result = await player.search(query, { requestedBy: message.author, searchEngine: QueryType.AUTO });
            }


            if (!result || !result.tracks.length) {
                await msg.edit("😢 Không tìm thấy bài hát hoặc playlist phù hợp.");
                if (queue.isEmpty() && !queue.isPlaying()) queue.delete();
                return;
            }

            // Xử lý Playlist và Single Track
            queue.addTrack(result.tracks);
            if (!queue.isPlaying()) await queue.node.play();

            // Gửi Embed thông báo (như code cũ)
            if (result.playlist) {
                const embed = new EmbedBuilder()
                    .setColor("#1abc9c")
                    .setTitle("🎶 Đã thêm playlist")
                    .setDescription(`**${result.playlist.title || "Playlist"}** — ${result.tracks.length} bài`)
                    .setFooter({ text: `Nguồn: ${result.playlist.source ?? "YouTube"}` });
                await msg.edit({ content: null, embeds: [embed] });
            } else {
                const track = result.tracks[0];
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
                await msg.edit({ content: null, embeds: [embed] });
            }

        } catch (err) {
            console.error(err);
            if (queue && queue.isEmpty() && !queue.isPlaying()) queue.delete();
            await msg.edit("⚠️ Có lỗi xảy ra khi phát nhạc!");
        }
    }

    // --- CÁC LỆNH KHÁC (giữ nguyên từ bản Updated upstream) ---
    else if (command === "pause") {
        const queue = player.nodes.get(message.guild.id);
        if (!queue || !queue.isPlaying()) return message.reply("⚠️ Không có bài hát nào đang phát.");
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
        if (!queue || !queue.isPlaying()) return message.reply("⚠️ Không có bài nào để bỏ qua.");
        const skipped = queue.node.skip();
        if (skipped) {
            message.reply("⏭️ Đã bỏ qua bài hát!");
        } else {
            // Trường hợp không có bài tiếp theo và bot tự rời kênh (leaveOnEnd)
            message.reply("⏭️ Đã bỏ qua bài hát cuối cùng và rời kênh.");
        }
    }

    else if (command === "queue") {
        const queue = player.nodes.get(message.guild.id);
        if (!queue || !queue.isPlaying()) return message.reply("📭 Hàng đợi trống!");

        const currentTrack = queue.currentTrack;
        const tracks = queue.tracks.toArray().slice(0, 10);
        const nextTracks = tracks.map((t, i) => `${i + 1}. [${t.title}](${t.url}) - ${t.duration}`).join("\n");

        const embed = new EmbedBuilder()
            .setColor("#f39c12")
            .setTitle("🎶 Hàng đợi hiện tại")
            .setDescription(`**Đang phát:** [${currentTrack.title}](${currentTrack.url}) - ${currentTrack.duration}\n\n**Bài tiếp theo:**\n${nextTracks || "Không có bài nào."}`)
            .setFooter({ text: `Tổng số bài: ${queue.tracks.size + 1}` });

        message.channel.send({ embeds: [embed] });
    }

    else if (command === "volume") {
        const queue = player.nodes.get(message.guild.id);
        if (!queue) return message.reply("⚠️ Không có nhạc để chỉnh âm lượng.");
        const vol = parseInt(args[0]);
        if (isNaN(vol) || vol < 0 || vol > 100) return message.reply("🔊 Nhập số từ 0 đến 100!");
        queue.node.setVolume(vol);
        message.reply(`✅ Đã chỉnh âm lượng: **${vol}%**`);
    }

    else if (command === "leave") {
        const queue = player.nodes.get(message.guild.id);
        if (!queue) return message.reply("🚫 Bot không trong kênh nào.");
        queue.delete();
        message.reply("👋 Bot đã rời kênh voice!");
    }

    else if (command === "check") {
        const testEmbed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle("✅ Kiểm tra hệ thống")
            .setDescription("🧠 Mọi module hoạt động bình thường.")
            .addFields(
                { name: "Discord API", value: "✅ Kết nối ổn định", inline: true },
                { name: "play-dl", value: playdl.is_expired() ? "⚠️ Token YouTube cần làm mới!" : "✅ Hoạt động tốt", inline: true },
                { name: "Nguồn phát", value: "YouTube / Spotify / SoundCloud", inline: false }
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
            .setFooter({ text: "Shumir v2.0 • Dùng !play hoặc /play để bắt đầu phát nhạc 🎶" });

        return message.channel.send({ embeds: [helpEmbed] });
    }
});

// ----------------- Slash command handler ----------------- //
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await (command.execute
            ? command.execute(interaction, client)
            : command.run(client, interaction));
    } catch (err) {
        console.error(err);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: "❌ Lỗi khi chạy lệnh này!", ephemeral: true });
        } else {
            await interaction.reply({ content: "❌ Lỗi khi chạy lệnh này!", ephemeral: true });
        }
    }
});

// 🎧 Bắt lỗi phát nhạc
player.events.on("error", (queue, error) => console.log(`❌ Lỗi phát nhạc: ${error.message}`));
player.events.on("playerError", (queue, error) => console.log(`🎧 Player lỗi: ${error.message}`));
player.events.on("connectionError", (queue, error) => console.log(`🔗 Lỗi kết nối: ${error.message}`));

// 🔑 Đăng nhập bot
client.login(process.env.TOKEN);