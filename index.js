// index.js — Shumir Bot (Ma Sói + Nối Từ + Cờ Tỷ Phú + Pet Game)

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

// ====== STATE GAME & LOGIC IMPORT ======
client.gameStates = new Map(); // Nối Từ

// --- Ma Sói ---
const { activeWerewolfGames } = require("./utils/activeWerewolfGames.js");
const { processDayVote, processMayorDecision, handleWerewolfInteraction } = require("./utils/werewolfLogic.js");

// --- Cờ Tỷ Phú ---
const { activeMonopolyGames, handleMonopolyInteraction } = require('./utils/monopolyLogic'); 

// --- Pet Game ---
const { spawnWildPets } = require("./spawnWildPet");
const { catchPet } = require("./catchSystem");
const { levelUpPet, applyGeneBuff } = require("./upgradeSystem");
const { elementalSkills, physicalSkills } = require("./skillList");
const { readJSON, writeJSON } = require("./utils");

// ====== LOAD SLASH COMMANDS ======
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");

// --- Hàm tải lệnh từ thư mục ---
const loadCommands = (directoryPath) => {
  fs.readdirSync(directoryPath)
    .filter(f => f.endsWith(".js"))
    .forEach(file => {
      const cmd = require(path.join(directoryPath, file));
      if (cmd.data && cmd.execute) {
        const category = path.basename(directoryPath) !== 'commands' ? path.basename(directoryPath) : null;
        cmd.category = category;
        client.commands.set(cmd.data.name, cmd);
      } else console.warn(`[⚠️] Lệnh ${file} thiếu data hoặc execute.`);
    });
};

// Load lệnh root
loadCommands(commandsPath);

// Load lệnh trong subfolder
fs.readdirSync(commandsPath)
  .filter(name => fs.statSync(path.join(commandsPath, name)).isDirectory())
  .forEach(folder => {
    loadCommands(path.join(commandsPath, folder));
  });

console.log(`✅ Đã tải ${client.commands.size} slash commands.`);

// ====== LOAD EVENTS ======
const eventsPath = path.join(__dirname, "events");
fs.readdirSync(eventsPath)
  .filter(f => f.endsWith(".js"))
  .forEach(file => {
    const evt = require(path.join(eventsPath, file));
    if (evt.once) client.once(evt.name, (...args) => evt.execute(...args));
    else client.on(evt.name, (...args) => evt.execute(...args, client.gameStates, activeWerewolfGames, activeMonopolyGames));
  });

console.log(`✅ Đã tải ${fs.readdirSync(eventsPath).length} events.`);

// ====== INTERACTION HANDLER ======
client.on("interactionCreate", async (interaction) => {
  try {
    // --- SLASH COMMAND ---
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      return command.execute(interaction, client, client.gameStates, activeWerewolfGames, activeMonopolyGames);
    }

    // --- BUTTON & SELECT MENU ---
    const { customId } = interaction;
    
    // 1. Cờ Tỷ Phú
    if (customId?.startsWith('monopoly_')) {
      const game = activeMonopolyGames.get(interaction.channelId);
      if (game && (interaction.message.id === game.messageId || customId === 'monopoly_join')) {
        return handleMonopolyInteraction(interaction); 
      }
      return interaction.reply({ content: "Trò chơi Cờ Tỷ Phú này đã kết thúc hoặc không còn hoạt động.", ephemeral: true });
    }

    // 2. Ma Sói
    if (customId?.startsWith('masoi_')) {
      const masoiCmd = client.commands.get('masoi');
      if (masoiCmd && typeof masoiCmd.component === 'function') {
        return masoiCmd.component(interaction, client, client.gameStates, activeWerewolfGames);
      }
    }

    // 3. Pet Game & PvP buttons (ví dụ: pet_*, pvp_*)
    if (customId?.startsWith('pet_')) {
      // logic chọn pet từ inventory
      const petId = customId.split("_")[1];
      const data = readJSON("./data/pets.json");
      const userPet = data.users[interaction.user.id]?.pets.find(p => p.id == petId);
      if (userPet) {
        await interaction.reply({ content: `🐾 Bạn đã chọn pet: ${userPet.icon} ${userPet.name}`, ephemeral: true });
      }
    }

    if (customId?.startsWith('pvp_')) {
      // logic PvP button, tương tác với pvpSystem.js
      const action = customId.split("_")[1];
      // xử lý PvP tương ứng...
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
// Validate token (supports either BOT_TOKEN or legacy TOKEN env var)
const token = (process.env.BOT_TOKEN || process.env.TOKEN || "").trim();
if (!token) {
  console.error('❌ BOT_TOKEN chưa được thiết lập. Thêm `BOT_TOKEN=your_token_here` vào file `.env` hoặc thiết lập biến môi trường.');
  process.exit(1);
}
if (token.includes(' ') || token.length < 20) {
  console.warn('⚠️ Token có vẻ không hợp lệ (có khoảng trắng hoặc quá ngắn). Vui lòng kiểm tra lại giá trị trong `.env`.');
}

client.login(token)
  .then(() => console.log("✅ Bot đã đăng nhập thành công."))
  .catch((err) => {
    console.error("❌ Lỗi khi đăng nhập bot:", err);
    process.exit(1);
  });

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
