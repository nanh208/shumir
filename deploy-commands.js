// deploy-commands.js (MERGED VERSION)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

// --- CẤU HÌNH ---
const TOKEN = process.env.BOT_TOKEN || process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = "1308052869559222272"; // ID Server Test
const IS_GLOBAL = false; 

if (!TOKEN || !CLIENT_ID) {
    console.error("❌ Lỗi: Thiếu TOKEN hoặc CLIENT_ID trong file .env");
    process.exit(1);
}

const commands = [];
const commandNames = new Set();

// =====================================================
// 1. [KEEP] LỆNH PET GAME & SYSTEM (GIỮ NGUYÊN)
// =====================================================
const manualCommands = [
    new SlashCommandBuilder().setName('pet').setDescription('Hệ thống Thú Cưng')
        .addSubcommand(sub => sub.setName('random').setDescription('🎁 Nhận Pet khởi đầu'))
        .addSubcommand(sub => sub.setName('info').setDescription('ℹ️ Xem thông tin Pet'))
        .addSubcommand(sub => sub.setName('list').setDescription('📜 Danh sách Pet'))
        .addSubcommand(sub => sub.setName('help').setDescription('📜 Hướng dẫn'))
        .addSubcommand(sub => sub.setName('evolve').setDescription('🧬 Tiến hóa Pet').addIntegerOption(op => op.setName('slot').setDescription('Vị trí').setRequired(false)))
        .addSubcommand(sub => sub.setName('gacha').setDescription('🎰 Quay Pet (500 Gold)')),
    new SlashCommandBuilder().setName('inventory').setDescription('🎒 Xem túi đồ'),
    new SlashCommandBuilder().setName('adventure').setDescription('⚔️ PvE (Đi ải)'),
    new SlashCommandBuilder().setName('pvp').setDescription('🥊 PvP (Thách đấu)').addUserOption(op => op.setName('opponent').setDescription('Đối thủ').setRequired(true)),
    new SlashCommandBuilder().setName('arena').setDescription('🏟️ Setup Đấu Trường (Admin)').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels).addChannelOption(op => op.setName('channel').setDescription('Kênh').setRequired(true)),
    new SlashCommandBuilder().setName('code').setDescription('🎁 Nhập Giftcode').addStringOption(op => op.setName('code').setDescription('Mã code').setRequired(true)),
    new SlashCommandBuilder().setName('rank').setDescription('🏆 Bảng xếp hạng').addStringOption(op => op.setName('type').setDescription('Loại').addChoices({name:'Level',value:'level'},{name:'Gold',value:'gold'})),
    new SlashCommandBuilder().setName('lvsv').setDescription('⚙️ Độ khó Server (Admin)').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild).addStringOption(op => op.setName('độ_khó').setDescription('Mức độ').setRequired(true).addChoices({name:'Dễ',value:'dễ'},{name:'Bình thường',value:'bth'},{name:'Khó',value:'khó'}, {name:'Siêu Khó',value:'siêu khó'}, {name:'Ác Quỷ',value:'ác quỷ'})),
    new SlashCommandBuilder().setName('setup_spawn').setDescription('⚙️ Setup Spawn (Admin)').setDefaultMemberPermissions(PermissionFlagsBits.Administrator).addChannelOption(op => op.setName('channel').setDescription('Kênh').setRequired(true)),
    // Lưu ý: Lệnh market của Pet có thể trùng tên với Empire. 
    // Nếu trùng, Discord sẽ chỉ nhận 1 cái. Ưu tiên lệnh trong file commands nếu tên giống nhau.
];

manualCommands.forEach(cmd => {
    commands.push(cmd.toJSON());
    commandNames.add(cmd.name);
    console.log(`🔹 Đã thêm lệnh thủ công: /${cmd.name}`);
});

// =====================================================
// 2. [NEW] QUÉT LỆNH TỪ FOLDER (BAO GỒM ĐẾ CHẾ)
// =====================================================
const getAllCommandFiles = (dirPath, arrayOfFiles = []) => {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllCommandFiles(filePath, arrayOfFiles);
        } else if (file.endsWith(".js") || file.endsWith(".mjs")) {
            arrayOfFiles.push(filePath);
        }
    }
    return arrayOfFiles;
};

const commandsPath = path.join(__dirname, "commands");

// Bọc trong async để dùng Dynamic Import
(async () => {
    if (fs.existsSync(commandsPath)) {
        console.log("📦 Đang quét thư mục commands/...");
        const commandFiles = getAllCommandFiles(commandsPath);
        
        for (const file of commandFiles) {
            try {
                // Dùng import() thay vì require() để hỗ trợ cả .mjs và .js
                const module = await import(pathToFileURL(file).href);
                const cmdData = module.default?.data || module.data;

                if (cmdData) {
                    // Kiểm tra trùng tên
                    if (commandNames.has(cmdData.name)) {
                        console.warn(`⚠️ Bỏ qua file ${path.basename(file)} vì trùng lệnh /${cmdData.name} (Đã có lệnh thủ công).`);
                        continue;
                    }
                    commands.push(cmdData.toJSON());
                    commandNames.add(cmdData.name);
                    console.log(`🔹 Load file lệnh: /${cmdData.name}`);
                }
            } catch (err) {
                console.error(`❌ Lỗi file ${path.basename(file)}:`, err.message);
            }
        }
    }

    console.log(`✅ Tổng cộng: ${commands.length} lệnh sẵn sàng deploy.`);

    // =====================================================
    // 3. DEPLOY
    // =====================================================
    const rest = new REST({ version: "10" }).setToken(TOKEN);

    try {
        console.log(`🔄 Đang gửi lệnh lên Discord...`);
        if (IS_GLOBAL) {
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
            console.log(`✅ Đã reload GLOBAL thành công!`);
        } else {
            await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
            console.log(`✅ Đã reload GUILD thành công!`);
        }
    } catch (error) {
        console.error("❌ Lỗi Deploy:", error);
    }
})();