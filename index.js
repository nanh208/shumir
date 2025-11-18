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
  try {
    // --- Slash commands ---
    if (interaction.isChatInputCommand && interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      // keep a global defer to allow commands to use editReply
      await interaction.deferReply({ ephemeral: false }).catch(() => {});
      await command.execute(interaction, client, gameStates);
      return;
    }

    // --- Component interactions (buttons, select menus) ---
    if (interaction.isButton && interaction.isButton() || interaction.isSelectMenu && interaction.isSelectMenu()) {
      const customId = interaction.customId || '';

      // convention: customId prefix is '<commandName>_' e.g. 'masoi_join' or 'masoi_vote_...'
      const prefix = customId.split('_')[0];
      const command = client.commands.get(prefix);
      if (command && typeof command.component === 'function') {
        await command.component(interaction, client, gameStates);
        return;
      }
      // fallback: ignore if no handler
      return;
    }
  } catch (error) {
    console.error('❌ Lỗi khi xử lý interaction:', error);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: '❌ Lỗi nội bộ khi xử lý tương tác.' }).catch(() => {});
      } else {
        await interaction.reply({ content: '❌ Lỗi nội bộ khi xử lý tương tác.', ephemeral: true }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }
});

client.login(process.env.TOKEN);
