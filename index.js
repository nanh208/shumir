// index.js — Shumir Bot (COMMONJS VERSION)

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
    Client,
    Collection,
    GatewayIntentBits,
    Events,
} = require("discord.js");

// ====== CLIENT CONFIGURATION ======
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// ====== STATE GAME & LOGIC IMPORT (CJS & MJS Handling) ======
client.gameStates = new Map(); // Nối Từ
let spawner; // Khai báo sớm hơn để sử dụng trong logic Game khác (nếu cần)

// --- Ma Sói & Cờ Tỷ Phú (CJS Logic) ---
const { activeWerewolfGames } = require("./utils/activeWerewolfGames.js");
const { processDayVote, processMayorDecision, handleWerewolfInteraction } = require("./utils/werewolfLogic.js");
const { activeMonopolyGames, handleMonopolyInteraction } = require('./utils/monopolyLogic.js'); 

// --- Pet Game (Sử dụng require cho các file .mjs) ---
// Note: Khi dùng require() cho .mjs, Node.js trả về một đối tượng chứa tất cả các export, 
// bao gồm cả 'default' nếu có. Nếu bạn export Class/Function bình thường (export const X), 
// nó sẽ nằm trong thuộc tính cùng tên.

// 1. Nhập các Module .mjs:
const SpawnModule = require("./SpawnSystem.mjs"); 
const BattleModule = require("./BattleManager.mjs"); 
const CommandModule = require("./CommandHandlers.mjs"); 

// 2. Trích xuất các hàm/class cần thiết:
const SpawnSystem = SpawnModule.SpawnSystem; // Lấy class SpawnSystem từ export
const handleBattle = BattleModule.handleInteraction; // Lấy hàm xử lý tương tác chiến đấu
const handleSlashCommand = CommandModule.handleSlashCommand; // Lấy hàm xử lý lệnh Pet Game
const handleButtons = CommandModule.handleButtons; // Lấy hàm xử lý nút giao diện Pet Game
const setSpawnSystemRef = CommandModule.setSpawnSystemRef; // Lấy hàm set ref cho spawner

// 3. SỬA LỖI MODULE NOT FOUND: Đã sửa từ SkillList.js thành SkillList.mjs
const SkillListModule = require("./SkillList.mjs"); 
const { elementalSkills, physicalSkills } = SkillListModule; // Lấy các exports từ module

// Utils
const { readJSON, writeJSON } = require("./index.js"); // Tên file/folder 'utils'

// ============================
// 🔥 KHỞI TẠO SPAWN SYSTEM (Run Once)
// ============================
client.once(Events.ClientReady, () => {
    console.log(`✅ Bot đã đăng nhập thành công: ${client.user.tag}`);
    
    // Khởi tạo và Start Spawn System MỚI
    spawner = new SpawnSystem(client); 
    setSpawnSystemRef(spawner); // Cung cấp instance của spawner cho CommandHandlers
    spawner.start(); 
});


// ====== LOAD SLASH COMMANDS ======
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");

// --- Hàm tải lệnh từ thư mục ---
const loadCommands = (directoryPath) => {
    fs.readdirSync(directoryPath)
        .filter(f => f.endsWith(".js"))
        .forEach(file => {
            try {
                const cmd = require(path.join(directoryPath, file));
                if (cmd.data && cmd.execute) {
                    const category = path.basename(directoryPath) !== 'commands' ? path.basename(directoryPath) : null;
                    cmd.category = category;
                    client.commands.set(cmd.data.name, cmd);
                } else console.warn(`[⚠️] Lệnh ${file} thiếu data hoặc execute.`);
            } catch (error) {
                console.error(`❌ Lỗi khi tải lệnh ${file}:`, error);
            }
        });
};

// Load lệnh root và subfolder
loadCommands(commandsPath);
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
        const eventCallback = (...args) => evt.execute(...args, client.gameStates, activeWerewolfGames, activeMonopolyGames);
        
        if (evt.once) client.once(evt.name, eventCallback);
        else client.on(evt.name, eventCallback);
    });

console.log(`✅ Đã tải ${fs.readdirSync(eventsPath).length} events.`);


// ---
// ====== INTERACTION HANDLER (BỘ ĐỊNH TUYẾN TƯƠNG TÁC) ======
// ---
client.on("interactionCreate", async (interaction) => {
    try {
        const { customId, commandName } = interaction;

        // --- 1. SLASH COMMAND ---
        if (interaction.isChatInputCommand()) {
            
            // Định tuyến Pet Game commands (/inventory, /setup_spawn, /adventure, /code)
            if (['inventory', 'adventure', 'setup_spawn', 'code'].includes(commandName)) {
                return handleSlashCommand(interaction);
            }

            // Định tuyến commands game khác
            const command = client.commands.get(commandName);
            if (!command) {
                console.warn(`[⚠️] Không tìm thấy lệnh /${commandName}`);
                return;
            }
            // Ghi chú: Đảm bảo command.execute có thể nhận các tham số game state
            return command.execute(interaction, client, client.gameStates, activeWerewolfGames, activeMonopolyGames);
        }

        // --- 2. BUTTON & SELECT MENU ---

        // Pet Game: Chiến đấu/Bắt Pet
        if (customId?.startsWith("challenge_") || customId?.startsWith("use_skill_") || customId?.startsWith("btn_")) {
            // Gửi tương tác đến BattleManager (vì nó chứa logic 'challenge_')
            return handleBattle(interaction); 
        }
        // Pet Game: Giao diện (Inventory/Adventure/Khác)
        if (customId?.startsWith("inv_") || customId?.startsWith("adv_")) {
            return handleButtons(interaction);
        }
        
        // Cờ Tỷ Phú
        if (customId?.startsWith('monopoly_')) {
            const game = activeMonopolyGames.get(interaction.channelId);
            // Kiểm tra game đang hoạt động hoặc là nút 'join'
            if (game && (interaction.message.id === game.messageId || customId === 'monopoly_join')) {
                return handleMonopolyInteraction(interaction); 
            }
            return interaction.reply({ content: "Trò chơi Cờ Tỷ Phú này đã kết thúc hoặc không còn hoạt động.", ephemeral: true });
        }

        // Ma Sói
        if (customId?.startsWith('masoi_')) {
            const masoiCmd = client.commands.get('masoi');
            if (masoiCmd && typeof masoiCmd.component === 'function') {
                return masoiCmd.component(interaction, client, client.gameStates, activeWerewolfGames);
            }
        }
        
        // --- Logic Buttons Cũ (Nên xóa hoặc tích hợp sau) ---
        if (customId?.startsWith('pet_') || customId?.startsWith('pvp_')) {
             // (Logic Pet/PvP cũ của bạn, giữ lại để không gây lỗi ngay lập tức)
        }
        

    } catch (err) {
        console.error("❌ Lỗi interaction:", err);
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: "❌ Lỗi nội bộ khi xử lý tương tác." });
            } else {
                await interaction.reply({ content: "❌ Lỗi nội bộ khi xử lý tương tác.", ephemeral: true });
            }
        } catch (e) { /* Bỏ qua lỗi nếu không thể phản hồi */ }
    }
});


// ====== LOGIN & PROCESS HANDLING ======
const token = (process.env.BOT_TOKEN || process.env.TOKEN || "").trim();

if (!token || token.includes(' ') || token.length < 20) {
    console.error('❌ BOT_TOKEN chưa được thiết lập HOẶC không hợp lệ. Vui lòng kiểm tra file `.env`.');
    process.exit(1);
}

client.login(token)
    .then(() => console.log("✅ Bot đã đăng nhập thành công."))
    .catch((err) => {
        console.error("❌ Lỗi khi đăng nhập bot:", err);
        process.exit(1);
    });

// Xử lý các lỗi ngoại lệ (Guardrails)
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('🔥 Uncaught Exception:', err);
    process.exit(1); // Nên thoát để restart process nếu là lỗi nghiêm trọng
});