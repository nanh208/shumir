// index.js — Shumir Bot (chuẩn hóa, tránh trùng log, hỗ trợ khôi phục Nối Từ)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits, EmbedBuilder, Events } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// --- LOGIC NỐI TỪ ---
const gameStates = new Map();

// 📂 Nạp Commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  if (fs.statSync(folderPath).isDirectory()) {
    const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith(".js"));
    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);
      const command = require(filePath);
      if ("data" in command && "execute" in command) {
        command.category = folder;
        client.commands.set(command.data.name, command);
      } else {
        console.warn(`[⚠️] Lệnh ${file} thiếu "data" hoặc "execute".`);
      }
    }
  }
}
console.log(`✅ Đã tải ${client.commands.size} slash commands.`);

// 📂 Nạp Events
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);

  if (event.name === Events.MessageCreate) {
    client.on(event.name, (...args) => event.execute(...args, gameStates));
  } else if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}
console.log(`✅ Đã tải ${eventFiles.length} events.`);

// --- Khi Bot sẵn sàng ---
const { activeGames, saveGames } = require("./data/activeGames.js");
client.once("ready", async () => {
  console.log(`✅ Bot đã online: ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: "🎉 Giải trí & Nối Từ!", type: 0 }],
    status: "online",
  });

  const configPath = path.resolve(__dirname, "./data/game-config.json");
  if (fs.existsSync(configPath)) {
    const { wordGameChannelId } = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (wordGameChannelId) {
      const channel = await client.channels.fetch(wordGameChannelId).catch(() => null);
      if (channel) {
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
          SendMessages: true,
        });
        channel.send("🔓 Bot đã online — tiếp tục trò chơi nối từ nào!");

        const gameData = activeGames[wordGameChannelId];
        if (gameData && gameData.started) {
          channel.send(`📜 Tiếp tục từ cuối cùng: **${gameData.lastWord}** (người cuối: <@${gameData.lastPlayer}>)`);
        }
      }
    }
  }
});

// --- Slash Commands ---
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    // ⚡ Giữ phiên tương tác (tránh lỗi Unknown Interaction)
    await interaction.deferReply({ ephemeral: false });

    // Pass the client as second arg and gameStates as third so commands
    // that need the client or the shared gameStates can access them.
    await command.execute(interaction, client, gameStates);
  } catch (error) {
    console.error("❌ Lỗi khi xử lý lệnh:", error);
    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("❌ Lỗi khi chạy lệnh!")
      .setDescription("Có vẻ Shumir hơi bối rối... bạn thử lại nhé!");

    // Nếu interaction còn hợp lệ thì chỉnh sửa reply hiện tại
    try {
      await interaction.editReply({ embeds: [embed] });
    } catch {
      console.log("⚠️ Interaction đã hết hạn, bỏ qua lỗi.");
    }
  }
});

client.login(process.env.TOKEN);
