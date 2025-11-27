// index.js — Shumir Bot (UPDATED FOR NEW BATTLE SYSTEM)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
// Thêm pathToFileURL để hỗ trợ import file .mjs trên mọi hệ điều hành
const { pathToFileURL } = require("url"); 
const {
    Client,
    Collection,
    GatewayIntentBits,
    Events,
    EmbedBuilder, 
    MessageFlags // Import MessageFlags để dùng thay cho ephemeral: true
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
// ... (code cũ của Nối Từ) ...

// --- [THÊM ĐOẠN NÀY VÀO] ---
// Cấu hình Game Đế Chế (Load file empire-config.json)
let empireConfig = {}; 
const empireConfigPath = path.resolve(__dirname, './data/empire-config.json');
try {
    if (fs.existsSync(empireConfigPath)) {
        empireConfig = JSON.parse(fs.readFileSync(empireConfigPath, 'utf8'));
        console.log("✅ Đã tải cấu hình Empire Game.");
    } else {
        // Tạo thư mục/file nếu chưa có để tránh lỗi
        const dir = path.dirname(empireConfigPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(empireConfigPath, JSON.stringify({}, null, 2));
    }
} catch (e) { console.error("❌ Lỗi load config Empire:", e); }
// ----------------------------
// --- Ma Sói & Cờ Tỷ Phú (Logic cũ) ---
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
// [FIX] Khai báo thêm GachaModule và handleGacha
let SpawnModule, BattleModule, CommandModule, StarterPetModule, InventoryModule, DatabaseModule, GachaModule;
let spawner;
let SpawnSystem, handleBattle, handleSlashCommand, handleButtons, setSpawnSystemRef, setRaidManagerRef, handleStarterCommand, handleInventoryInteraction, Database, handleGacha;

// Hàm nạp module không đồng bộ (Async Loader)
async function loadGameModules() {
    try {
        // [QUAN TRỌNG] Import Database
        DatabaseModule = await import("./Database.mjs");
        Database = DatabaseModule.Database;
        
        // [FIX] Load Gacha System
        GachaModule = await import("./GachaSystem.mjs");
        handleGacha = GachaModule.handleGacha;

        SpawnModule = await import("./SpawnSystem.mjs");
        BattleModule = await import("./BattleManager.mjs"); // File quản lý chiến đấu chính
        CommandModule = await import("./CommandHandlers.mjs");
        StarterPetModule = await import("./StarterPet.mjs");
        InventoryModule = await import("./InventoryUI.mjs");

        SpawnSystem = SpawnModule.SpawnSystem;
        
        // 👇 CẬP NHẬT MỚI: Lấy hàm xử lý từ BattleManager mới
        handleBattle = BattleModule.handleInteraction; 
        setRaidManagerRef = BattleModule.setRaidManagerRef; // Hàm này giờ nằm ở BattleManager
        
        handleSlashCommand = CommandModule.handleSlashCommand;
        handleButtons = CommandModule.handleButtons;
        setSpawnSystemRef = CommandModule.setSpawnSystemRef;
        handleStarterCommand = StarterPetModule.handleStarterCommand;
        handleInventoryInteraction = InventoryModule.handleInventoryInteraction;

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

// [UPDATED] Hàm loadCommands chuyển sang Async để hỗ trợ dynamic import (.mjs)
const loadCommands = async (directoryPath) => {
    if (!fs.existsSync(directoryPath)) return;
    
    // Lọc cả file .js và .mjs
    const files = fs.readdirSync(directoryPath)
        .filter(f => f.endsWith(".js") || f.endsWith(".mjs"));

    // Dùng vòng lặp for...of để có thể await bên trong
    for (const file of files) {
        try {
            const filePath = path.join(directoryPath, file);
            let cmd;

            // Kiểm tra đuôi file để chọn cách load
            if (file.endsWith(".mjs")) {
                // Dùng dynamic import cho .mjs (convert path sang URL để tránh lỗi trên Windows)
                const module = await import(pathToFileURL(filePath).href);
                cmd = module.default || module;
            } else {
                // Dùng require cho .js như cũ
                cmd = require(filePath);
            }
            
            // Bỏ qua các lệnh cũ nếu cần
            if (['pet_list', 'pet_info'].includes(cmd.data?.name)) continue; 

            if (cmd.data && cmd.execute) {
                client.commands.set(cmd.data.name, cmd);
            } else {
                console.warn(`⚠️ [WARNING] Lệnh ${file} thiếu "data" hoặc "execute".`);
            }
        } catch (error) {
            console.error(`❌ Lỗi khi tải lệnh ${file}:`, error);
        }
    }
};

// [UPDATED] Thực thi loadCommands (cần bọc trong IIFE async vì loadCommands giờ là async)
if (fs.existsSync(commandsPath)) {
    (async () => {
        await loadCommands(commandsPath);
        
        // Load thư mục con
        const subDirs = fs.readdirSync(commandsPath).filter(name => fs.statSync(path.join(commandsPath, name)).isDirectory());
        for (const folder of subDirs) {
            await loadCommands(path.join(commandsPath, folder));
        }
        
        console.log(`✅ Đã tải ${client.commands.size} slash commands (.js & .mjs).`);
    })();
} else {
    console.warn("⚠️ Thư mục commands không tồn tại.");
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
                    event.execute(...args, wordGameStates, activeWerewolfGames, activeMonopolyGames, spawner);
                }
            };
            if (event.once) client.once(event.name, eventCallback);
            // [FIX] Nếu không phải event once, đăng ký đúng event.name
            else client.on(event.name, eventCallback); // Dùng event.name thay vì Events.InteractionCreate
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
        activities: [{ name: "🎉 Shumir đến chơi !", type: 0 }],
        status: "online",
    });
    
    // Đợi load xong các module ESM rồi mới khởi động hệ thống Pet
    await loadGameModules();
    
    if (SpawnSystem) {
        spawner = new SpawnSystem(client); 
        // 👇 CẬP NHẬT: Gửi RaidManager vào BattleManager để hệ thống chiến đấu nhận diện Boss
        if (setRaidManagerRef) {
            setRaidManagerRef(spawner.raidManager);
        }
        spawner.start(); 
    }
});


// ====== 6. INTERACTION HANDLER ======
client.on("interactionCreate", async (interaction) => { 
    try {
        const { customId, commandName } = interaction;

        // --- SLASH COMMAND ---
        if (interaction.isChatInputCommand()) {
            const empireCommands = ['register', 'build', 'recruit', 'me', 'map', 'attack', 'scout', 'move', 'market'];
            if (empireCommands.includes(commandName)) {
                // Lấy ID kênh đã setup cho server này
                const allowedChannelId = empireConfig[interaction.guildId];
                
                // Nếu chưa setup
                if (!allowedChannelId) {
                    return interaction.reply({ 
                        content: "⚠️ Server này chưa thiết lập kênh chơi game!\nVui lòng nhờ Admin dùng lệnh `/setup_empire` tại kênh muốn chơi.", 
                        ephemeral: true // Chỉ người dùng thấy
                    });
                }

                // Nếu sai kênh
                if (interaction.channelId !== allowedChannelId) {
                    return interaction.reply({ 
                        content: `⛔ **Sai địa bàn!**\nVui lòng di chuyển sang kênh <#${allowedChannelId}> để điều hành vương quốc.`, 
                        ephemeral: true 
                    });
                }
            }

            // 2. Logic Game Đế Chế: Xử lý lệnh setup
            if (commandName === 'setup_empire') {
                const cmd = client.commands.get('setup_empire');
                if (cmd) {
                    // Truyền biến empireConfig vào để lệnh cập nhật và lưu file
                    return cmd.execute(interaction, client, null, null, null, empireConfig);
                }
            }
            // [FIX 1: IMMEDIATE DEFERRAL for ALL Slash Commands]
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            // ============ XỬ LÝ LỆNH CONFIG ============
            if (commandName === 'arena') {
                const channel = interaction.options.getChannel('channel');
                const serverId = interaction.guildId;
                if (!interaction.member.permissions.has('ManageChannels')) {
                    // FIX 40060: Use editReply after defer
                    return interaction.editReply({ content: "🚫 Bạn không có quyền quản lý kênh!", ephemeral: true });
                }
                if (Database) {
                    try {
                        Database.setArenaChannel(serverId, channel.id);
                        // FIX 40060: Use editReply after defer
                        await interaction.editReply(`🏟️ **Cài đặt thành công!**\nKênh đấu trường PvP đã được thiết lập tại: ${channel.toString()}\nCác lệnh \`/pvp\` chỉ có hiệu lực tại đây.`);
                    } catch (error) {
                        console.error(error);
                        // FIX 40060: Use editReply after defer
                        await interaction.editReply({ content: "❌ Có lỗi khi lưu dữ liệu.", ephemeral: true });
                    }
                } else {
                    // FIX 40060: Use editReply after defer
                    await interaction.editReply({ content: "❌ Database chưa sẵn sàng.", ephemeral: true });
                }
                return; 
            }

            if (commandName === 'lvsv') {
                const difficulty = interaction.options.getString('độ_khó');
                const serverId = interaction.guildId;
                if (!interaction.member.permissions.has('ManageGuild')) {
                    // FIX 40060: Use editReply after defer
                    return interaction.editReply({ content: "🚫 Bạn không có quyền quản lý Server!", ephemeral: true });
                }
                if (Database) {
                    const config = Database.getServerConfig(serverId);
                    config.difficulty = difficulty;
                    Database.updateServerConfig(serverId, config);
                    // FIX 40060: Use editReply after defer
                    await interaction.editReply(`⚙️ Độ khó của Server đã được chỉnh thành: **${difficulty.toUpperCase()}**`);
                }
                return;
            }
            // ==========================================================================

            // 2. Định tuyến Pet Game commands
            const petCommands = ['inventory', 'adventure', 'setup_spawn', 'code'];
            if (petCommands.includes(commandName)) {
                if (!handleSlashCommand) return interaction.editReply({ content: "⏳ Hệ thống Pet đang khởi động...", ephemeral: true });
                // handleSlashCommand sẽ dùng editReply/followUp bên trong
                return handleSlashCommand(interaction);
            }
            
            // Xử lý lệnh Starter Pet (/pet random) và Gacha
            if (commandName === 'pet') {
                 const sub = interaction.options.getSubcommand();
                 
                 // [FIX] Lệnh random starter
                 if (sub === 'random') {
                     if (handleStarterCommand) return handleStarterCommand(interaction);
                 }
                 // [FIX] Lệnh Gacha (Thêm mới)
                 else if (sub === 'gacha') {
                     if (handleGacha) return handleGacha(interaction);
                     else return interaction.editReply({ content: "⏳ Hệ thống Gacha đang tải...", ephemeral: true });
                 }
                 // [FIX] Các lệnh thông tin khác (đã xóa gacha khỏi list này)
                 else if (['info', 'list', 'help', 'evolve'].includes(sub)) { 
                     if (handleSlashCommand) return handleSlashCommand(interaction);
                 }
            }

            // 3. Định tuyến commands game khác
            const command = client.commands.get(commandName);
            if (!command) return;
return command.execute(interaction, client, wordGameStates, activeWerewolfGames, activeMonopolyGames, empireConfig);        }

        // --- BUTTON & SELECT MENU ---
        // ... (Giữ nguyên logic xử lý Buttons) ...
        
        // 1. Pet Game - Battle, Skills & CATCH SYSTEM (QUAN TRỌNG)
        // 👇 CẬP NHẬT: Đã thêm customId.startsWith("ball_") để bắt sự kiện chọn bóng
        if (customId?.startsWith("challenge_") || 
            customId?.startsWith("use_skill_") || 
            customId?.startsWith("btn_") || 
            customId?.startsWith("pvp_") ||
            customId?.startsWith("ball_")) { // <--- MỚI
            
            if (handleBattle) return handleBattle(interaction); 
        }

        // [FIX] Xử lý nút quay tiếp Gacha
        if (customId === 'gacha_roll_again') {
            if (handleGacha) return handleGacha(interaction);
        }

        // 2. Pet Game - Inventory Router
        if (customId?.startsWith("inv_")) {
            if (handleInventoryInteraction) return handleInventoryInteraction(interaction);
        }

        // 3. Pet Game - Adventure
        if (customId?.startsWith("adv_")) {
             if (handleButtons) return handleButtons(interaction);
        }
        
        // 4. Cờ Tỷ Phú
        if (customId?.startsWith('monopoly_') && handleMonopolyInteraction) {
             return handleMonopolyInteraction(interaction); 
        }

        // 5. Ma Sói
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
    console.log('⚠️ Lỗi chưa được xử lý (Unhandled Rejection):', reason);
});

client.on('error', (error) => {
    console.error('❌ Discord Client Error:', error);
});

process.on('uncaughtException', (err) => {
    console.error('💀 Lỗi nghiêm trọng (Uncaught Exception):', err);
});