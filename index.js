// index.js — Shumir Bot (MERGED VERSION: Pet + Empire + Others)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url"); 
const {
    Client,
    Collection,
    GatewayIntentBits,
    Events,
    EmbedBuilder, 
    MessageFlags
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

// --- [KEEP] Nối Từ ---
const wordGameStates = new Map(); 
const configPath = path.resolve(__dirname, './data/game-config.json');

// --- [NEW] Cấu hình Game Đế Chế ---
let empireConfig = {}; 
const empireConfigPath = path.resolve(__dirname, './data/empire-config.json');
try {
    if (fs.existsSync(empireConfigPath)) {
        empireConfig = JSON.parse(fs.readFileSync(empireConfigPath, 'utf8'));
        console.log("✅ [Empire] Đã tải cấu hình Game Đế Chế.");
    } else {
        const dir = path.dirname(empireConfigPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(empireConfigPath, JSON.stringify({}, null, 2));
    }
} catch (e) { console.error("❌ Lỗi load config Empire:", e); }
// ----------------------------------------

// --- [KEEP] Ma Sói & Cờ Tỷ Phú ---
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

// --- [KEEP] Pet Game Modules ---
let SpawnModule, BattleModule, CommandModule, StarterPetModule, InventoryModule, DatabaseModule, GachaModule;
let spawner;
let SpawnSystem, handleBattle, handleSlashCommand, handleButtons, setSpawnSystemRef, setRaidManagerRef, handleStarterCommand, handleInventoryInteraction, Database, handleGacha;

// Hàm load module Pet (Giữ nguyên)
async function loadGameModules() {
    try {
        DatabaseModule = await import("./Database.mjs");
        Database = DatabaseModule.Database;
        
        GachaModule = await import("./GachaSystem.mjs");
        handleGacha = GachaModule.handleGacha;

        SpawnModule = await import("./SpawnSystem.mjs");
        BattleModule = await import("./BattleManager.mjs");
        CommandModule = await import("./CommandHandlers.mjs");
        StarterPetModule = await import("./StarterPet.mjs");
        InventoryModule = await import("./InventoryUI.mjs");

        SpawnSystem = SpawnModule.SpawnSystem;
        handleBattle = BattleModule.handleInteraction; 
        setRaidManagerRef = BattleModule.setRaidManagerRef;
        
        handleSlashCommand = CommandModule.handleSlashCommand;
        handleButtons = CommandModule.handleButtons;
        setSpawnSystemRef = CommandModule.setSpawnSystemRef;
        handleStarterCommand = StarterPetModule.handleStarterCommand;
        handleInventoryInteraction = InventoryModule.handleInventoryInteraction;

        console.log("✅ [Pet] Đã tải xong các module Pet Game (ESM).");
    } catch (err) {
        console.error("❌ Lỗi khi tải module Pet Game:", err);
    }
}

// ====== 3. KHỞI TẠO NỐI TỪ (GIỮ NGUYÊN) ======
try {
    if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const channelId = configData.wordGameChannelId;
        if (channelId) {
            wordGameStates.set(channelId, { lastSyllable: null, lastUser: null, usedWords: new Set() });
            console.log(`✅ [Word] Game Nối Từ đã được khởi tạo cho kênh: ${channelId}`);
        }
    } else {
        const dataDir = path.dirname(configPath);
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify({ wordGameChannelId: null }, null, 2));
    }
} catch (e) {}

// ====== 4. LOAD SLASH COMMANDS & EVENTS ======
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");

const loadCommands = async (directoryPath) => {
    if (!fs.existsSync(directoryPath)) return;
    const files = fs.readdirSync(directoryPath).filter(f => f.endsWith(".js") || f.endsWith(".mjs"));

    for (const file of files) {
        try {
            const filePath = path.join(directoryPath, file);
            let cmd;
            if (file.endsWith(".mjs")) {
                const module = await import(pathToFileURL(filePath).href);
                cmd = module.default || module;
            } else {
                cmd = require(filePath);
            }
            
            // [KEEP] Bỏ qua lệnh cũ của Pet nếu cần
            if (['pet_list', 'pet_info'].includes(cmd.data?.name)) continue; 

            if (cmd.data && cmd.execute) {
                client.commands.set(cmd.data.name, cmd);
            }
        } catch (error) {
            console.error(`❌ Lỗi khi tải lệnh ${file}:`, error);
        }
    }
};

if (fs.existsSync(commandsPath)) {
    (async () => {
        await loadCommands(commandsPath);
        // Load thư mục con (bao gồm cả thư mục 'empire' mới tạo)
        const subDirs = fs.readdirSync(commandsPath).filter(name => fs.statSync(path.join(commandsPath, name)).isDirectory());
        for (const folder of subDirs) {
            await loadCommands(path.join(commandsPath, folder));
        }
        console.log(`✅ Đã tải ${client.commands.size} slash commands.`);
    })();
}

// --- EVENTS ---
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
            else client.on(event.name, eventCallback);
        } catch (err) {}
    }
}

// ====== 5. READY ======
client.once(Events.ClientReady, async () => {
    console.log(`✅ Bot đã đăng nhập: ${client.user.tag}`);
    client.user.setPresence({ activities: [{ name: "🎉 Shumir đến chơi !", type: 0 }], status: "online" });
    await loadGameModules();
    if (SpawnSystem) {
        spawner = new SpawnSystem(client); 
        if (setRaidManagerRef) setRaidManagerRef(spawner.raidManager);
        spawner.start(); 
    }
});

// ====== 6. INTERACTION HANDLER (ĐÃ CẬP NHẬT) ======
client.on("interactionCreate", async (interaction) => { 
    try {
        const { customId, commandName } = interaction;

        // --- SLASH COMMAND ---
        if (interaction.isChatInputCommand()) {
            
            // [NEW] 1. Kiểm tra Lệnh Game Đế Chế
            const empireCommands = ['register', 'build', 'recruit', 'me', 'map', 'attack', 'scout', 'move', 'market', 'alliance', 'upgrade'];
            if (empireCommands.includes(commandName)) {
                // Lấy ID kênh đã setup
                const allowedChannelId = empireConfig[interaction.guildId];
                
                // Nếu chưa setup
                if (!allowedChannelId) {
                    return interaction.reply({ 
                        content: "⚠️ Server chưa setup game Đế Chế! Admin hãy dùng `/setup_empire`.", 
                        ephemeral: true 
                    });
                }
                // (Tùy chọn) Check đúng kênh - hiện tại ta để lệnh con tự xử lý logic private channel
            }

            // [NEW] Xử lý lệnh setup_empire riêng (để truyền config)
            if (commandName === 'setup_empire') {
                const cmd = client.commands.get('setup_empire');
                if (cmd) return cmd.execute(interaction, client, null, null, null, empireConfig);
            }

            // [KEEP] Defer logic (Chống timeout)
            if (!interaction.deferred && !interaction.replied) {
                 await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            }

            // [KEEP] Các lệnh Config cũ (Arena, Lvsv)
            if (commandName === 'arena') {
                const channel = interaction.options.getChannel('channel');
                if (!interaction.member.permissions.has('ManageChannels')) return interaction.editReply("🚫 Thiếu quyền!");
                if (Database) {
                    Database.setArenaChannel(interaction.guildId, channel.id);
                    await interaction.editReply(`🏟️ Đã set Đấu Trường: ${channel.toString()}`);
                }
                return;
            }
            if (commandName === 'lvsv') {
                const diff = interaction.options.getString('độ_khó');
                if (!interaction.member.permissions.has('ManageGuild')) return interaction.editReply("🚫 Thiếu quyền!");
                if (Database) {
                    const cfg = Database.getServerConfig(interaction.guildId);
                    cfg.difficulty = diff;
                    Database.updateServerConfig(interaction.guildId, cfg);
                    await interaction.editReply(`⚙️ Độ khó: **${diff.toUpperCase()}**`);
                }
                return;
            }

            // [KEEP] Pet Game Routing
            if (['inventory', 'adventure', 'setup_spawn', 'code'].includes(commandName)) {
                if (handleSlashCommand) return handleSlashCommand(interaction);
            }
            if (commandName === 'pet') {
                 const sub = interaction.options.getSubcommand();
                 if (sub === 'random' && handleStarterCommand) return handleStarterCommand(interaction);
                 else if (sub === 'gacha' && handleGacha) return handleGacha(interaction);
                 else if (handleSlashCommand) return handleSlashCommand(interaction);
            }

            // [MERGE] CHẠY LỆNH CHUNG (Pet, Đế Chế, Ma Sói...)
            // Tìm lệnh trong Collection
            const command = client.commands.get(commandName);
            if (command) {
                // Truyền empireConfig vào cuối để lệnh Đế Chế dùng
                // Truyền wordGameStates, activeWerewolfGames để lệnh cũ dùng
                return command.execute(interaction, client, wordGameStates, activeWerewolfGames, activeMonopolyGames, empireConfig);
            }
        }

        // --- BUTTON & SELECT MENU (GIỮ NGUYÊN) ---
        if (customId?.startsWith("challenge_") || customId?.startsWith("use_skill_") || customId?.startsWith("btn_") || customId?.startsWith("pvp_") || customId?.startsWith("ball_")) {
            if (handleBattle) return handleBattle(interaction); 
        }
        if (customId === 'gacha_roll_again' && handleGacha) return handleGacha(interaction);
        if (customId?.startsWith("inv_") && handleInventoryInteraction) return handleInventoryInteraction(interaction);
        if (customId?.startsWith("adv_") && handleButtons) return handleButtons(interaction);
        if (customId?.startsWith('monopoly_') && handleMonopolyInteraction) return handleMonopolyInteraction(interaction);
        
        if (customId?.startsWith('masoi_')) {
            const masoiCmd = client.commands.get('masoi');
            if (masoiCmd?.component) return masoiCmd.component(interaction, client, wordGameStates, activeWerewolfGames);
        }

    } catch (err) {
        console.error("❌ Lỗi interaction:", err);
        try {
            if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: "❌ Lỗi nội bộ.", ephemeral: true });
            else await interaction.editReply({ content: "❌ Lỗi nội bộ." });
        } catch (e) {}
    }
});

// ====== 7. LOGIN ======
const token = (process.env.BOT_TOKEN || process.env.TOKEN || "").trim();
client.login(token).catch(err => console.error("❌ Login thất bại:", err));