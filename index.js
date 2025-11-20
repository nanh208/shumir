// index.js — Shumir Bot (COMMONJS PHIÊN BẢN ĐẦY ĐỦ VÀ TỐI ƯU)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
    Client,
    Collection,
    GatewayIntentBits,
    Events,
    EmbedBuilder, 
} = require("discord.js");

// ====== 1. CLIENT CONFIGURATION ======
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// ====== 2. GAME STATE & LOGIC IMPORTS ======

// --- Nối Từ (Lưu trữ trạng thái game) ---
const wordGameStates = new Map(); 
const configPath = path.resolve(__dirname, './data/game-config.json');

// --- Ma Sói & Cờ Tỷ Phú (Logic cũ) ---
// Kiểm tra file tồn tại trước khi require để tránh crash
let activeWerewolfGames = new Map();
try {
    const werewolfModule = require("./utils/activeWerewolfGames.js");
    activeWerewolfGames = werewolfModule.activeWerewolfGames;
} catch (e) { console.warn("⚠️ Werewolf Module not found or error."); }

let activeMonopolyGames = new Map(); 
let handleMonopolyInteraction = null;
try {
    const monopolyModule = require('./utils/monopolyLogic.js');
    activeMonopolyGames = monopolyModule.activeMonopolyGames;
    handleMonopolyInteraction = monopolyModule.handleMonopolyInteraction;
} catch (e) { console.warn("⚠️ Monopoly Module not found."); }

// --- Pet Game (Dynamic Import cho ES Modules) ---
let SpawnModule, BattleModule, CommandModule, StarterPetModule;
let spawner;
let SpawnSystem, handleBattle, handleSlashCommand, handleButtons, setSpawnSystemRef, handleStarterCommand;

// Hàm nạp module không đồng bộ (Async Loader)
async function loadGameModules() {
    try {
        SpawnModule = await import("./SpawnSystem.mjs");
        BattleModule = await import("./BattleManager.mjs");
        CommandModule = await import("./CommandHandlers.mjs");
        StarterPetModule = await import("./StarterPet.mjs"); 

        SpawnSystem = SpawnModule.SpawnSystem;
        handleBattle = BattleModule.handleInteraction;
        handleSlashCommand = CommandModule.handleSlashCommand;
        handleButtons = CommandModule.handleButtons;
        setSpawnSystemRef = CommandModule.setSpawnSystemRef;
        handleStarterCommand = StarterPetModule.handleStarterCommand;

        console.log("✅ Đã tải xong các module Pet Game (ESM).");
    } catch (err) {
        console.error("❌ Lỗi khi tải module Pet Game:", err);
    }
}


// ====== 3. KHỞI TẠO NỐI TỪ ======
try {
    if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const channelId = configData.wordGameChannelId;
        if (channelId) {
            wordGameStates.set(channelId, {
                lastSyllable: null, lastUser: null, usedWords: new Set()
            });
            console.log(`✅ Game Nối Từ đã được khởi tạo cho kênh: ${channelId}`);
        }
    } else {
        const dataDir = path.dirname(configPath);
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        
        fs.writeFileSync(configPath, JSON.stringify({ wordGameChannelId: null }, null, 2));
        console.log("File game-config.json đã được tạo.");
    }
} catch (e) {
    console.error("Lỗi khi đọc/tạo config Nối Từ:", e);
}


// ====== 4. LOAD SLASH COMMANDS & EVENTS ======
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");

const loadCommands = (directoryPath) => {
    if (!fs.existsSync(directoryPath)) return;
    fs.readdirSync(directoryPath)
        .filter(f => f.endsWith(".js"))
        .forEach(file => {
            try {
                const cmd = require(path.join(directoryPath, file));
                
                // --- BỎ QUA LỆNH CŨ (pet_list, pet_info) ---
                if (['pet_list', 'pet_info'].includes(cmd.data?.name)) {
                    console.log(`[🗑️] Đã bỏ qua lệnh cũ: ${cmd.data.name}`);
                    return; 
                }
                // ------------------------------------------

                if (cmd.data && cmd.execute) {
                    client.commands.set(cmd.data.name, cmd);
                } else console.warn(`[⚠️] Lệnh ${file} thiếu data hoặc execute.`);
            } catch (error) {
                console.error(`❌ Lỗi khi tải lệnh ${file}:`, error);
            }
        });
};

if (fs.existsSync(commandsPath)) {
    loadCommands(commandsPath);
    // Load thư mục con nếu có
    const subDirs = fs.readdirSync(commandsPath).filter(name => fs.statSync(path.join(commandsPath, name)).isDirectory());
    subDirs.forEach(folder => loadCommands(path.join(commandsPath, folder)));
    
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
            const eventCallback = (...args) => {
                if (event.name === Events.MessageCreate) {
                    event.execute(...args, wordGameStates);
                } else {
                    // Truyền spawner vào ready event nếu cần
                    event.execute(...args, wordGameStates, activeWerewolfGames, activeMonopolyGames, spawner);
                }
            };
            if (event.once) client.once(event.name, eventCallback);
            else client.on(event.name, eventCallback);
        } catch (err) {
            console.error(`Lỗi tải event ${file}:`, err);
        }
    }
    console.log(`✅ Đã tải ${eventFiles.length} events.`);
}


// ====== 5. READY & SPAWN SYSTEM START ======
client.once(Events.ClientReady, async () => {
    console.log(`✅ Bot đã đăng nhập: ${client.user.tag}`);
    client.user.setPresence({
        activities: [{ name: "🎉 Shumir: Pet & Games!", type: 0 }],
        status: "online",
    });
    
    // Đợi load xong các module ESM rồi mới khởi động hệ thống Pet
    await loadGameModules();
    
    if (SpawnSystem) {
        spawner = new SpawnSystem(client); 
        if (setSpawnSystemRef) setSpawnSystemRef(spawner); 
        spawner.start(); 
    }
});


// ====== 6. INTERACTION HANDLER ======
client.on("interactionCreate", async (interaction) => {
    try {
        const { customId, commandName } = interaction;

        // --- SLASH COMMAND ---
        if (interaction.isChatInputCommand()) {
            
            // 1. Định tuyến Pet Game commands
            // Giữ lại 'inventory', 'adventure', 'setup_spawn', 'code'. 
            // Giả sử lệnh 'pet' đã được thay thế bằng /inventory
            const petCommands = ['inventory', 'adventure', 'setup_spawn', 'code'];

            if (petCommands.includes(commandName)) {
                if (!handleSlashCommand) return interaction.reply({ content: "⏳ Hệ thống Pet đang khởi động...", ephemeral: true });
                
                // Xử lý đặc biệt cho lệnh /pet random (Nếu bạn đã đổi nó thành /starter hoặc giữ /pet)
                // Kể từ khi bạn muốn xóa các lệnh Pet cũ, tôi sẽ giả định 'pet' không còn tồn tại 
                // và /inventory là lệnh chính để xem Pet.
                
                return handleSlashCommand(interaction);
            }
            // Xử lý lệnh Starter Pet nếu nó vẫn dùng tên 'pet'
            if (commandName === 'pet' && interaction.options.getSubcommand() === 'random') {
                if (handleStarterCommand) return handleStarterCommand(interaction);
            }

            // 2. Định tuyến commands game khác
            const command = client.commands.get(commandName);
            if (!command) return;
            return command.execute(interaction, client, wordGameStates, activeWerewolfGames, activeMonopolyGames);
        }

        // --- BUTTON & SELECT MENU ---

        // 1. Pet Game
        if (customId?.startsWith("challenge_") || customId?.startsWith("use_skill_") || customId?.startsWith("btn_") || customId?.startsWith("pvp_")) {
            if (handleBattle) return handleBattle(interaction); 
        }
        // inv_ là đủ cho tất cả các nút và select menu của Inventory/Pet Info/Upgrade
        if (customId?.startsWith("inv_") || customId?.startsWith("adv_")) {
            if (handleButtons) return handleButtons(interaction);
        }
        
        // 2. Cờ Tỷ Phú
        if (customId?.startsWith('monopoly_') && handleMonopolyInteraction) {
             return handleMonopolyInteraction(interaction); 
        }

        // 3. Ma Sói
        if (customId?.startsWith('masoi_')) {
            const masoiCmd = client.commands.get('masoi');
            if (masoiCmd && typeof masoiCmd.component === 'function') {
                return masoiCmd.component(interaction, client, wordGameStates, activeWerewolfGames);
            }
        }

    } catch (err) {
        console.error("❌ Lỗi interaction:", err);
        try {
            const msg = { content: "❌ Lỗi nội bộ.", ephemeral: true };
            if (interaction.replied || interaction.deferred) await interaction.editReply(msg);
            else await interaction.reply(msg);
        } catch (e) {}
    }
});


// ====== 7. LOGIN ======
const token = (process.env.BOT_TOKEN || process.env.TOKEN || "").trim();
if (!token || token.length < 20) {
    console.error('❌ Token lỗi. Kiểm tra .env');
    process.exit(1);
}

client.login(token).catch(err => {
    console.error("❌ Login thất bại:", err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Unhandled Rejection:', reason);
});