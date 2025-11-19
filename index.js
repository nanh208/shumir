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
      await interaction.deferReply({ ephemeral: false }).catch(() => {});
      return command.execute(interaction, client, client.gameStates);
    }

    // --- BUTTON & SELECT MENU ---
    const { customId, user } = interaction;

    // 1. BỎ PHIẾU NGÀY
    if (customId?.startsWith("masoi_day_vote_")) {
      const targetId = customId.replace("masoi_day_vote_", "");
      const game = activeWerewolfGames.get(interaction.channelId);
      if (!game) return interaction.reply({ content: "❌ Không tìm thấy game Ma Sói.", ephemeral: true });
      return processDayVote(game, user.id, targetId, client, interaction);
    }

    // 2. HÀNH ĐỘNG ĐÊM (SelectMenu)
    else if (customId?.startsWith("masoi_action_")) {
      // masoi_action_<channelId>_<roleKey>
      const parts = customId.split("_");
      const channelId = parts[2];
      const roleKey = parts[3];
      const game = activeWerewolfGames.get(channelId);
      if (!game) return interaction.reply({ content: "❌ Không tìm thấy game Ma Sói.", ephemeral: true });

      const selectedTargetId = interaction.values?.[0];
      if (!selectedTargetId) return interaction.reply({ content: "❌ Bạn chưa chọn mục tiêu.", ephemeral: true });

      game.nightActions.set(roleKey, { performerId: user.id, targetId: selectedTargetId });
      return interaction.reply({ content: `✅ Bạn đã chọn <@${selectedTargetId}>`, ephemeral: true });
    }

    // 3. THỊ TRƯỞNG QUYẾT ĐỊNH
    else if (customId?.startsWith("masoi_mayor_")) {
      // masoi_mayor_<channelId>_<targetId>
      const parts = customId.split("_");
      const channelId = parts[2];
      const hangedId = parts[3];
      const game = activeWerewolfGames.get(channelId);
      if (!game) return interaction.reply({ content: "❌ Không tìm thấy game Ma Sói.", ephemeral: true });

      return processMayorDecision(game, hangedId, client, interaction);
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
