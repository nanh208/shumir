// index.js — Shumir Bot (Ma Sói + Nối Từ + Cờ Tỷ Phú)

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
client.gameStates = new Map();          // Nối Từ
// Logic Ma Sói
const { activeWerewolfGames } = require("./utils/activeWerewolfGames.js");
const { processDayVote, processMayorDecision, handleWerewolfInteraction } = require("./utils/werewolfLogic.js"); // Thêm handleWerewolfInteraction nếu có
// Logic Cờ Tỷ Phú MỚI
const { activeMonopolyGames, handleMonopolyInteraction } = require('./utils/monopolyLogic'); 


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
                // Gán category dựa trên thư mục cha (nếu có)
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
    // Truyền tất cả trạng thái game cần thiết
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
      // Truyền các state games cần thiết
      return command.execute(interaction, client, client.gameStates, activeWerewolfGames, activeMonopolyGames);
    }

    // --- BUTTON & SELECT MENU ---
    const { customId } = interaction;
    
    // 1. Xử lý tương tác Cờ Tỷ Phú (monopoly_*)
    if (customId?.startsWith('monopoly_')) {
        // Kiểm tra xem tương tác có thuộc về tin nhắn game Cờ Tỷ Phú đang hoạt động không
        const game = activeMonopolyGames.get(interaction.channelId);
        if (game && interaction.message.id === game.messageId || customId === 'monopoly_join') {
            // Logic JOIN và các nút ROLL/BUY/ENDTURN được xử lý trong monopolyLogic
            return handleMonopolyInteraction(interaction); 
        }
        // Nếu không thuộc game đang hoạt động, trả lời bằng tin nhắn tạm thời
        return interaction.reply({ content: "Trò chơi Cờ Tỷ Phú này đã kết thúc hoặc không còn hoạt động.", ephemeral: true });
    }

    // 2. Xử lý tương tác Ma Sói (masoi_*)
    if (customId?.startsWith('masoi_')) {
      const masoiCmd = client.commands.get('masoi');
      if (masoiCmd && typeof masoiCmd.component === 'function') {
        // Truyền các state games cần thiết
        return masoiCmd.component(interaction, client, client.gameStates, activeWerewolfGames);
      }
    }
    
    // 3. Xử lý các tương tác khác nếu có...

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