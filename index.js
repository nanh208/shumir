// index.js — Shumir Bot (COMMONJS PHIÊN BẢN ĐẦY ĐỦ VÀ TỐI ƯU)

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
    Client,
    Collection,
    GatewayIntentBits,
    Events,
    EmbedBuilder, // Giữ lại EmbedBuilder cho xử lý lỗi
} = require("discord.js");

// ====== 1. CLIENT CONFIGURATION ======
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// ====== 2. GAME STATE & LOGIC IMPORTS (KẾT HỢP TẤT CẢ LOGIC GAME) ======

// --- Nối Từ (Lưu trữ trạng thái game) ---
const wordGameStates = new Map(); 
const configPath = path.resolve(__dirname, './data/game-config.json');

// --- Ma Sói & Cờ Tỷ Phú (Logic cũ) ---
const { activeWerewolfGames } = require("./utils/activeWerewolfGames.js");
const { activeMonopolyGames, handleMonopolyInteraction } = require('./utils/monopolyLogic.js'); 
// Giả định bạn đã sửa lỗi require trong events/ready.js
// const { processDayVote, processMayorDecision, handleWerewolfInteraction } = require("./utils/werewolfLogic.js");

// --- Pet Game (Sửa lỗi MJS) ---
const SpawnModule = require("./SpawnSystem.mjs"); 
const BattleModule = require("./BattleManager.mjs"); 
const CommandModule = require("./CommandHandlers.mjs"); 
const SkillListModule = require("./SkillList.mjs"); // Sửa lỗi SkillList.js -> SkillList.mjs

// Trích xuất các hàm/class cần thiết
let spawner; 
const SpawnSystem = SpawnModule.SpawnSystem; 
const handleBattle = BattleModule.handleInteraction; 
const handleSlashCommand = CommandModule.handleSlashCommand; 
const handleButtons = CommandModule.handleButtons; 
const setSpawnSystemRef = CommandModule.setSpawnSystemRef; 
const { elementalSkills, physicalSkills } = SkillListModule; 

// --- Utils (SỬA LỖI MODULE NOT FOUND: Giả định tệp tiện ích là fileUtils.js nằm trong utils/) ---
// NẾU file tiện ích của bạn tên là 'fileUtils.js' và nằm trong thư mục 'utils':
const { readJSON, writeJSON } = require("./utils/fileUtils.js"); 


// ====== 3. KHỞI TẠO NỐI TỪ (TÍCH HỢP LOGIC BỀN VỮNG) ======
try {
    if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const channelId = configData.wordGameChannelId;
        if (channelId) {
            wordGameStates.set(channelId, {
                lastSyllable: null,
                lastUser: null,
                usedWords: new Set()
            });
            console.log(`✅ Game Nối Từ đã được khởi tạo cho kênh: ${channelId}`);
        }
    } else {
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify({ wordGameChannelId: null }, null, 2));
        console.log("File game-config.json đã được tạo.");
    }
} catch (e) {
    console.error("Lỗi khi đọc/tạo config Nối Từ:", e);
}


// ====== 4. LOAD SLASH COMMANDS & EVENTS ======
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");

// --- Hàm tải lệnh (Tối ưu) ---
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
// Thực thi tải lệnh
if (fs.existsSync(commandsPath)) {
    loadCommands(commandsPath);
    fs.readdirSync(commandsPath)
        .filter(name => fs.statSync(path.join(commandsPath, name)).isDirectory())
        .forEach(folder => {
            loadCommands(path.join(commandsPath, folder));
        });
    console.log(`✅ Đã tải ${client.commands.size} slash commands.`);
} else {
    console.warn("⚠️ Thư mục commands không tồn tại:", commandsPath);
}


// --- BỘ NẠP EVENT ---
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            const event = require(filePath);
            
            // Truyền tất cả game state cần thiết
            const eventCallback = (...args) => {
                // SỬA LỖI: Truyền wordGameStates cho MessageCreate
                if (event.name === Events.MessageCreate) {
                    event.execute(...args, wordGameStates);
                } else {
                    // Truyền tất cả state cho các event khác (ví dụ: ready.js cần spawner)
                    event.execute(...args, wordGameStates, activeWerewolfGames, activeMonopolyGames, spawner);
                }
            };
            
            if (event.once) client.once(event.name, eventCallback);
            else client.on(event.name, eventCallback);

        } catch (err) {
            console.error(`[❌] Lỗi khi nạp event ${file}:`, err);
        }
    }
    console.log(`✅ Đã tải ${eventFiles.length} events.`);
} else {
    console.warn("⚠️ Thư mục events không tồn tại:", eventsPath);
}


// ====== 5. READY & SPAWN SYSTEM START ======
client.once(Events.ClientReady, () => {
    console.log(`✅ Bot đã đăng nhập: ${client.user.tag}`);
    client.user.setPresence({
        activities: [{ name: "🎉 Shumir: Các Game Việt Hóa!", type: 0 }],
        status: "online",
    });
    
    // KHỞI ĐỘNG HỆ THỐNG SPAWN PET
    spawner = new SpawnSystem(client); 
    setSpawnSystemRef(spawner); // Cung cấp ref cho CommandHandlers
    spawner.start(); 
});


// ---
// ====== 6. INTERACTION HANDLER (BỘ ĐỊNH TUYẾN TƯƠNG TÁC ĐẦY ĐỦ) ======
// ---
client.on("interactionCreate", async (interaction) => {
    try {
        const { customId, commandName } = interaction;

        // --- SLASH COMMAND ---
        if (interaction.isChatInputCommand()) {
            
            // 1. Định tuyến Pet Game commands
            if (['inventory', 'adventure', 'setup_spawn', 'code'].includes(commandName)) {
                return handleSlashCommand(interaction);
            }

            // 2. Định tuyến commands game khác
            const command = client.commands.get(commandName);
            if (!command) return;
            // Truyền game state đầy đủ: (wordGameStates, activeWerewolfGames, activeMonopolyGames)
            return command.execute(interaction, client, wordGameStates, activeWerewolfGames, activeMonopolyGames);
        }

        // --- BUTTON & SELECT MENU ---

        // 1. Pet Game: Chiến đấu/Bắt Pet
        if (customId?.startsWith("challenge_") || customId?.startsWith("use_skill_") || customId?.startsWith("btn_")) {
            return handleBattle(interaction); 
        }
        // 2. Pet Game: Giao diện (Inventory/Adventure/Khác)
        if (customId?.startsWith("inv_") || customId?.startsWith("adv_")) {
            return handleButtons(interaction);
        }
        
        // 3. Cờ Tỷ Phú
        if (customId?.startsWith('monopoly_')) {
            const game = activeMonopolyGames.get(interaction.channelId);
            if (game && (interaction.message.id === game.messageId || customId === 'monopoly_join')) {
                return handleMonopolyInteraction(interaction); 
            }
            return interaction.reply({ content: "Trò chơi Cờ Tỷ Phú này đã kết thúc hoặc không còn hoạt động.", ephemeral: true });
        }

        // 4. Ma Sói (Sử dụng lệnh /masoi component handler)
        if (customId?.startsWith('masoi_')) {
            const masoiCmd = client.commands.get('masoi');
            if (masoiCmd && typeof masoiCmd.component === 'function') {
                return masoiCmd.component(interaction, client, wordGameStates, activeWerewolfGames);
            }
        }
        
        // Buttons cũ (Giữ lại tạm thời)
        if (customId?.startsWith('pet_') || customId?.startsWith('pvp_')) {
             // Logic cũ
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


// ====== 7. LOGIN & PROCESS HANDLING ======
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
    process.exit(1); 
});