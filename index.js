// index.js — Shumir Bot (Ma Sói + Nối Từ)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
  Client,
  Collection,
  GatewayIntentBits,
  Events,
} = require("discord.js");

// ====== CLIENT ======
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ====== STATE GAME ======
client.gameStates = new Map();          // Nối Từ
const { activeWerewolfGames } = require("./utils/activeWerewolfGames.js");

// ====== LOAD SLASH COMMANDS ======
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");

// Load lệnh root
fs.readdirSync(commandsPath)
  .filter(f => f.endsWith(".js"))
  .forEach(file => {
    const cmd = require(path.join(commandsPath, file));
    if (cmd.data && cmd.execute) client.commands.set(cmd.data.name, cmd);
    else console.warn(`[⚠️] Lệnh ${file} thiếu data hoặc execute.`);
});

// Load lệnh trong subfolder
fs.readdirSync(commandsPath)
  .filter(name => fs.statSync(path.join(commandsPath, name)).isDirectory())
  .forEach(folder => {
    const folderPath = path.join(commandsPath, folder);
    fs.readdirSync(folderPath)
      .filter(f => f.endsWith(".js"))
      .forEach(file => {
        const cmd = require(path.join(folderPath, file));
        if (cmd.data && cmd.execute) {
          cmd.category = folder;
          client.commands.set(cmd.data.name, cmd);
        } else console.warn(`[⚠️] Lệnh ${file} thiếu data hoặc execute.`);
      });
  });

console.log(`✅ Đã tải ${client.commands.size} slash commands.`);

// ====== LOAD EVENTS ======
const eventsPath = path.join(__dirname, "events");
fs.readdirSync(eventsPath)
  .filter(f => f.endsWith(".js"))
  .forEach(file => {
    const evt = require(path.join(eventsPath, file));
    if (evt.once) client.once(evt.name, (...args) => evt.execute(...args));
    else client.on(evt.name, (...args) => evt.execute(...args, client.gameStates));
  });

console.log(`✅ Đã tải ${fs.readdirSync(eventsPath).length} events.`);

// NOTE: Ready handling (presence & restore) is implemented in `events/ready.js`.
// The ready event there will run once and restore any saved games.

// ====== INTERACTION HANDLER ======
const { processDayVote, processMayorDecision } = require("./utils/werewolfLogic.js");

client.on("interactionCreate", async (interaction) => {
  try {
    // --- SLASH COMMAND ---
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      // Let individual command handlers decide when/if to defer/reply.
      return command.execute(interaction, client, client.gameStates);
    }

    // --- BUTTON & SELECT MENU ---
    const { customId } = interaction;
    // Delegate any masoi_* interactions to the masoi command component handler
    if (customId?.startsWith('masoi_')) {
      const masoiCmd = client.commands.get('masoi');
      if (masoiCmd && typeof masoiCmd.component === 'function') {
        return masoiCmd.component(interaction, client, client.gameStates);
      }
    }

  } catch (err) {
    console.error("❌ Lỗi interaction:", err);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: "❌ Lỗi nội bộ khi xử lý interaction." });
      } else {
        await interaction.reply({ content: "❌ Lỗi nội bộ khi xử lý interaction.", ephemeral: true });
      }
    } catch {}
  }
});

// ====== LOGIN ======
client.login(process.env.TOKEN);
