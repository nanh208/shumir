// index.js (ĐÃ CHUYỂN HOÀN TOÀN SANG ES MODULES)
import 'dotenv/config'; 
import {
    Client,
    Collection,
    GatewayIntentBits,
    Events,
    EmbedBuilder, 
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    MessageFlags
} from "discord.js";

import { GoogleGenAI } from "@google/genai"; 
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Lấy __dirname tương đương trong môi trường ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ====== 1. CLIENT CONFIGURATION ======
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// **********************************
// ⚡️ Khởi tạo Gemini Client (ESM)
// **********************************
let ai = null;
const GEMINI_PREFIX = "!ai"; 

try {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey && geminiKey.length > 0) {
        ai = new GoogleGenAI({}); 
        console.log("✅ Đã khởi tạo Gemini Client.");
    } else {
        console.warn("⚠️ Thiếu GEMINI_API_KEY trong .env. Tính năng AI sẽ bị vô hiệu hóa.");
    }
} catch (e) {
    console.error("❌ Lỗi khi khởi tạo Gemini Client:", e);
}


// ====== 2. GAME STATE & LOGIC IMPORTS ======

// --- Nối Từ (Lưu trữ trạng thái game) ---
const wordGameStates = new Map(); 
const configPath = path.resolve(__dirname, './data/game-config.json');

// --- Ma Sói & Cờ Tỷ Phú (Logic cũ - Cần đổi tên file tiện ích thành .mjs) ---
let activeWerewolfGames = new Map();
let activeMonopolyGames = new Map(); 
let handleMonopolyInteraction = null;

// --- Pet Game (Dynamic Import cho ES Modules) ---
let SpawnModule, BattleModule, CommandModule, StarterPetModule;
let spawner;
let SpawnSystem, handleBattle, handleSlashCommand, handleButtons, setSpawnSystemRef, handleStarterCommand, setAIClientRef;

// Hàm nạp module không đồng bộ (Async Loader)
async function loadGameModules() {
    try {
        // Nạp các module Pet Game (ESM)
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
        
        // ⚡️ XỬ LÝ SETTERS AI
        if (CommandModule.setAIClientRef) {
            setAIClientRef = (ai) => {
                CommandModule.setAIClientRef(ai);
                if (BattleModule.setAIClientRef) BattleModule.setAIClientRef(ai);
            };
        }

        console.log("✅ Đã tải xong các module Pet Game (ESM).");
    } catch (err) {
        console.error("❌ Lỗi khi tải module Pet Game:", err);
    }
    
    // Tải các module game cũ (chúng phải là .mjs)
    try {
        // YÊU CẦU: Đổi tên file này thành activeWerewolfGames.mjs
        const werewolfModule = await import("./utils/activeWerewolfGames.mjs"); 
        activeWerewolfGames = werewolfModule.activeWerewolfGames;
    } catch (e) { console.warn("⚠️ Werewolf Module not found or error."); }
    
    try {
        // YÊU CẦU: Đổi tên file này thành monopolyLogic.mjs
        const monopolyModule = await import('./utils/monopolyLogic.mjs'); 
        activeMonopolyGames = monopolyModule.activeMonopolyGames;
        handleMonopolyInteraction = monopolyModule.handleMonopolyInteraction;
    } catch (e) { console.warn("⚠️ Monopoly Module not found."); }
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
    console.error("❌ Lỗi khi đọc/tạo config Nối Từ:", e);
}


// ====== 4. LOAD SLASH COMMANDS & EVENTS ======
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");

const loadCommands = (directoryPath) => {
    if (!fs.existsSync(directoryPath)) return;
    fs.readdirSync(directoryPath)
        .filter(f => f.endsWith(".js") || f.endsWith(".mjs")) // Chỉ nạp ESM
        .forEach(async file => {
            const filePath = path.join(directoryPath, file);
            const moduleUrl = new URL(`file:///${filePath}`);
            
            try {
                const commandModule = await import(moduleUrl);
                // Các lệnh ESM thường dùng export default
                const cmd = commandModule.default || commandModule; 

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
    // 💡 LƯU Ý: Nếu events của bạn là CJS, bạn cần đổi tên chúng thành .cjs và sửa code này
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            // Nạp event CJS/JS bằng require()
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
            console.error(`❌ Lỗi tải event ${file}:`, err);
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
        
        // ⚡️ TRUYỀN AI (Gemini Client) vào CommandModule/BattleModule
        if (setAIClientRef && ai) {
            setAIClientRef(ai);
            console.log("✅ Đã truyền Gemini Client vào các module Pet Game.");
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

            // 1. Định tuyến Pet Game commands
            const petCommands = ['inventory', 'adventure', 'setup_spawn', 'code'];

            if (petCommands.includes(commandName)) {
                // 💡 LƯU Ý: Đổi 'ephemeral: true' thành flags: MessageFlags.Ephemeral trong interaction.reply
                if (!handleSlashCommand) return interaction.reply({ content: "⏳ Hệ thống Pet đang khởi động...", flags: MessageFlags.Ephemeral });

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
            const msg = { content: "❌ Lỗi nội bộ.", flags: MessageFlags.Ephemeral }; // FIX ephemeral
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