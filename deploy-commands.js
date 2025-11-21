// deploy-commands.js (ĐÃ CHUYỂN HOÀN TOÀN SANG ES MODULES)
import 'dotenv/config'; // Thay thế require("dotenv").config();
import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url'; // Cần thiết cho __dirname trong ESM

// Lấy __dirname tương đương trong môi trường ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CẤU HÌNH ---
const TOKEN = process.env.BOT_TOKEN || process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = "1308052869559222272"; // ID Server Test

// ⚠️ Đặt là TRUE nếu muốn deploy Global, FALSE để test nhanh trên Server
const IS_GLOBAL = false; 

if (!TOKEN || !CLIENT_ID) {
  console.error("❌ Lỗi: Thiếu TOKEN hoặc CLIENT_ID trong file .env");
  process.exit(1);
}

const commands = [];
const commandNames = new Set(); // Dùng để kiểm tra trùng lặp tên lệnh

// =====================================================
// 1. ĐỊNH NGHĨA THỦ CÔNG CÁC LỆNH PET GAME (HỆ THỐNG MỚI)
// =====================================================
const petCommands = [
    // LỆNH MỚI: /pet (Subcommands: random, info, list)
    new SlashCommandBuilder()
        .setName('pet')
        .setDescription('Hệ thống Thú Cưng')
        .addSubcommand(subcommand =>
            subcommand
                .setName('random')
                .setDescription('🎁 Nhận Pet khởi đầu ngẫu nhiên (Chỉ 1 lần duy nhất)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('ℹ️ Xem thông tin chi tiết Pet của bạn')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('📜 Xem danh sách tất cả Pet trong kho')
        ),

    new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('🎒 Xem túi đồ và danh sách Pet của bạn'),

    new SlashCommandBuilder()
        .setName('adventure')
        .setDescription('⚔️ Đưa Pet đi ải (PvE)'),

    new SlashCommandBuilder()
        .setName('code')
        .setDescription('🎁 Nhập mã Giftcode nhận thưởng')
        .addStringOption(option => 
            option.setName('code')
                .setDescription('Nhập mã code của bạn')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('setup_spawn')
        .setDescription('⚙️ Cài đặt kênh xuất hiện Pet (Chỉ Admin)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Chọn kênh để Pet xuất hiện')
                .setRequired(true)),
    
    // ⚡️ THÊM: LỆNH /ai CHO CHAT GEMINI TỔNG QUÁT (PREFIX !ai)
    new SlashCommandBuilder()
        .setName('ai')
        .setDescription('🧠 Trò chuyện với Gemini AI (Sử dụng prefix !ai trong chat thường)'),
];

// Nạp lệnh Pet vào danh sách
petCommands.forEach(cmd => {
    commands.push(cmd.toJSON());
    commandNames.add(cmd.name);
    console.log(`🔹 Đã thêm lệnh Pet Game: /${cmd.name}`);
});

// =====================================================
// 2. TỰ ĐỘNG QUÉT LỆNH TỪ THƯ MỤC COMMANDS (HỆ THỐNG CŨ)
// =====================================================
// Chuyển getAllCommandFiles sang CJS (dùng path.join)
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

console.log("📦 Đang quét thư mục commands/...");
const commandsPath = path.join(__dirname, "commands");

if (fs.existsSync(commandsPath)) {
    const commandFiles = getAllCommandFiles(commandsPath);

    for (const file of commandFiles) {
      try {
        // 💡 FIX Dynamic Import (Chỉ chạy được sau khi bot chuyển sang ESM)
        // Dynamic import cần đường dẫn URL
        const commandUrl = new URL(`file:///${file}`);
        
        // Dynamic import trả về Promise, ta dùng await
        // VÌ require() không còn tồn tại, ta phải dùng import()
        const commandModule = await import(commandUrl);
        
        // Lấy module đã export (thường là default export trong ESM, hoặc gán trực tiếp)
        const command = commandModule.default || commandModule; 

        const cmdData = command.data; 
        const cmdExecute = command.execute;

        if (cmdData && cmdExecute) {
          // Kiểm tra trùng lặp: Nếu tên lệnh đã có trong Pet Game thì bỏ qua file cũ
          if (commandNames.has(cmdData.name)) {
              console.warn(`⚠️  Bỏ qua file ${path.basename(file)} vì lệnh /${cmdData.name} đã được định nghĩa thủ công.`);
              continue;
          }

          commands.push(cmdData.toJSON());
          commandNames.add(cmdData.name);
          // console.log(`   ➝ Tải thành công: ${cmdData.name}`);
        } else {
        //   console.warn(`⚠️  File ${path.basename(file)} thiếu "data" hoặc "execute"!`);
        }
      } catch (err) {
        console.error(`❌ Lỗi cú pháp/tải file ${path.basename(file)}:`, err.message);
      }
    }
} else {
    console.warn("⚠️ Không tìm thấy thư mục 'commands', chỉ deploy các lệnh thủ công.");
}

console.log(`✅ Tổng cộng: ${commands.length} lệnh sẵn sàng deploy.`);

// =====================================================
// 3. GỬI LỆNH LÊN DISCORD (REST API)
// =====================================================
const rest = new REST({ version: "10" }).setToken(TOKEN);

// Chạy Async IIFE để sử dụng await
(async () => {
  try {
    console.log(`🔄 Bắt đầu làm mới lệnh ứng dụng...`);

    if (IS_GLOBAL) {
      // --- DEPLOY GLOBAL (Toàn bộ server) ---
      console.log("🌎 Đang deploy chế độ GLOBAL...");
      
      // Xóa lệnh cục bộ cũ ở server test để tránh trùng lặp hiển thị
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [] });
      console.log("   ↳ Đã xóa lệnh cục bộ tại server test.");

      // Cập nhật Global
      const data = await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
      );
      console.log(`✅ Đã reload thành công ${data.length} lệnh GLOBAL!`);
      
    } else {
      // --- DEPLOY GUILD (Chỉ server test - Cập nhật ngay lập tức) ---
      console.log(`🏠 Đang deploy chế độ GUILD (Server ID: ${GUILD_ID})...`);

      const data = await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Đã reload thành công ${data.length} lệnh cho SERVER TEST!`);
    }

  } catch (error) {
    console.error("❌ Lỗi khi deploy:", error);
  }
})();