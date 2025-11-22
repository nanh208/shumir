// node deploy-commands.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

// --- CẤU HÌNH ---
const TOKEN = process.env.BOT_TOKEN || process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = "1308052869559222272"; // ID Server Test

// ⚠️ Đặt là TRUE nếu muốn deploy Global (Cho mọi server)
// Lưu ý: Global update có thể mất tới 1 giờ, Guild update thì ngay lập tức.
const IS_GLOBAL = false; 

if (!TOKEN || !CLIENT_ID) {
    console.error("❌ Lỗi: Thiếu TOKEN hoặc CLIENT_ID trong file .env");
    process.exit(1);
}

const commands = [];
const commandNames = new Set();

// =====================================================
// 1. ĐỊNH NGHĨA THỦ CÔNG CÁC LỆNH PET GAME
// =====================================================
const petCommands = [
    // --- NHÓM LỆNH PET ---
    new SlashCommandBuilder()
        .setName('pet')
        .setDescription('Hệ thống Thú Cưng')
        .addSubcommand(sub => sub.setName('random').setDescription('🎁 Nhận Pet khởi đầu ngẫu nhiên'))
        .addSubcommand(sub => sub.setName('info').setDescription('ℹ️ Xem thông tin chi tiết Pet của bạn'))
        .addSubcommand(sub => sub.setName('list').setDescription('📜 Xem danh sách tất cả Pet trong kho'))
        .addSubcommand(sub => sub.setName('help').setDescription('📜 Xem hướng dẫn chơi Pet Game'))
        .addSubcommand(sub => 
            sub.setName('evolve')
            .setDescription('🧬 Tiến hóa Pet khi đủ cấp độ')
            .addIntegerOption(op => op.setName('slot').setDescription('Vị trí Pet muốn tiến hóa').setRequired(false))
        )
        .addSubcommand(sub => sub.setName('gacha').setDescription('🎰 Quay Pet may mắn (Giá: 500 Gold)')), 

    // --- KHO ĐỒ ---
    new SlashCommandBuilder().setName('inventory').setDescription('🎒 Xem túi đồ và danh sách Pet'),
    
    // --- PVE (ẢI) ---
    new SlashCommandBuilder().setName('adventure').setDescription('⚔️ Đưa Pet đi ải (PvE)'),

    // --- PVP (ĐẤU TRƯỜNG) ---
    new SlashCommandBuilder().setName('pvp').setDescription('🥊 Thách đấu PvP với người chơi khác')
        .addUserOption(option => option.setName('opponent').setDescription('Người chơi bạn muốn thách đấu').setRequired(true)),

    // --- [MỚI] CÀI ĐẶT ĐẤU TRƯỜNG (ADMIN) ---
    new SlashCommandBuilder().setName('arena').setDescription('🏟️ Thiết lập kênh Đấu Trường (Nơi duy nhất được PvP)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels) // Chỉ Admin/Mod
        .addChannelOption(option => option.setName('channel').setDescription('Chọn kênh làm đấu trường').setRequired(true)),

    // --- GIFTCODE ---
    new SlashCommandBuilder().setName('code').setDescription('🎁 Nhập mã Giftcode')
        .addStringOption(op => op.setName('code').setDescription('Mã code').setRequired(true)),

    // --- [MỚI] BẢNG XẾP HẠNG ---
    new SlashCommandBuilder().setName('rank').setDescription('🏆 Xem bảng xếp hạng Server')
        .addStringOption(op => 
            op.setName('type')
            .setDescription('Loại xếp hạng')
            .addChoices(
                { name: 'Level Cao Nhất', value: 'level' },
                { name: 'Đại Gia (Gold)', value: 'gold' }
            )
        ),

    // --- CÀI ĐẶT SERVER (ADMIN) ---
    new SlashCommandBuilder().setName('lvsv').setDescription('⚙️ Cài đặt độ khó Server (Admin)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option => 
            option.setName('độ_khó')
                .setDescription('Chọn mức độ khó')
                .setRequired(true)
                .addChoices(
                    { name: 'Dễ (x1)', value: 'dễ' },
                    { name: 'Bình Thường (x3)', value: 'bth' },
                    { name: 'Khó (x10)', value: 'khó' },
                    { name: 'Siêu Khó (x50)', value: 'siêu khó' },
                    { name: 'Ác Quỷ (x250)', value: 'ác quỷ' },
                    { name: 'Kẻ Hủy Diệt (x1000)', value: 'kẻ hủy diệt' }
                )
        ),

    new SlashCommandBuilder().setName('setup_spawn').setDescription('⚙️ Cài đặt kênh Spawn Pet tự nhiên (Chỉ Admin)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(op => op.setName('channel').setDescription('Chọn kênh').setRequired(true)),

    // --- MARKET (CHỢ) ---
    new SlashCommandBuilder()
        .setName('market')
        .setDescription('🏪 Chợ mua bán Pet')
        .addSubcommand(sub => sub.setName('list').setDescription('📜 Xem danh sách Pet đang bán'))
        .addSubcommand(sub => 
            sub.setName('sell')
                .setDescription('💰 Bán Pet lấy Gold')
                .addIntegerOption(op => op.setName('slot').setDescription('Vị trí Pet trong túi (1, 2...)').setRequired(true))
                .addIntegerOption(op => op.setName('price').setDescription('Giá bán (Gold)').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('buy')
                .setDescription('🛒 Mua Pet từ người khác')
                .addStringOption(op => op.setName('pet_id').setDescription('ID Pet muốn mua').setRequired(true))
        ),
];

// Nạp lệnh vào danh sách
petCommands.forEach(cmd => {
    commands.push(cmd.toJSON());
    commandNames.add(cmd.name);
    console.log(`🔹 Đã thêm lệnh Pet Game: /${cmd.name}`);
});

// =====================================================
// 2. TỰ ĐỘNG QUÉT LỆNH TỪ THƯ MỤC COMMANDS (NẾU CÓ)
// =====================================================
const getAllCommandFiles = (dirPath, arrayOfFiles = []) => {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllCommandFiles(filePath, arrayOfFiles);
        } else if (file.endsWith(".js")) {
            arrayOfFiles.push(filePath);
        }
    }
    return arrayOfFiles;
};

console.log("📦 Đang quét thư mục commands/...");
const commandsPath = path.join(__dirname, "commands");

if (fs.existsSync(commandsPath)) {
    const commandFiles = getAllCommandFiles(commandsPath);
    for (const file of commandFiles) {
        try {
            const command = require(file);
            const cmdData = command.default?.data || command.data; 
            if (cmdData) {
                // Bỏ qua nếu trùng tên với lệnh thủ công
                if (commandNames.has(cmdData.name)) {
                     console.warn(`⚠️  Bỏ qua file ${path.basename(file)} vì trùng lệnh /${cmdData.name}.`);
                     continue;
                }
                commands.push(cmdData.toJSON());
                commandNames.add(cmdData.name);
            }
        } catch (err) {
            console.error(`❌ Lỗi file ${path.basename(file)}:`, err.message);
        }
    }
} else {
    console.warn("⚠️ Không tìm thấy thư mục 'commands', chỉ deploy các lệnh thủ công.");
}

console.log(`✅ Tổng cộng: ${commands.length} lệnh sẵn sàng deploy.`);

// =====================================================
// 3. DEPLOY
// =====================================================
const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
    try {
        console.log(`🔄 Bắt đầu làm mới lệnh ứng dụng...`);
        if (IS_GLOBAL) {
            console.log("🌎 Đang deploy GLOBAL...");
            // Reset lệnh Guild để tránh trùng lặp khi chuyển sang Global
            await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [] });
            const data = await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
            console.log(`✅ Đã reload ${data.length} lệnh GLOBAL thành công!`);
        } else {
            console.log(`🏠 Đang deploy GUILD (${GUILD_ID})...`);
            // Deploy riêng cho Guild (Update ngay lập tức để test)
            const data = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
            console.log(`✅ Đã reload ${data.length} lệnh cho SERVER TEST thành công!`);
        }
    } catch (error) {
        console.error("❌ Lỗi khi deploy:", error);
    }
})();