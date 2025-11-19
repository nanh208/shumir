// node deploy-commands.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const commands = [];

// ✅ Hàm đệ quy đọc tất cả file .js trong thư mục /commands và các thư mục con
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

const commandFiles = getAllCommandFiles(path.join(__dirname, "commands"));

// ✅ Nạp tất cả lệnh vào mảng `commands`
for (const file of commandFiles) {
  const command = require(file);
  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
    console.log(`✅ Đã tải lệnh: ${path.basename(file)}`);
  } else {
    console.warn(`⚠️  File ${file} thiếu "data" hoặc "execute"!`);
  }
}

// ✅ Kiểm tra TOKEN và CLIENT_ID trước khi tiếp tục
if (!process.env.TOKEN || !process.env.CLIENT_ID) {
  console.error("❌ Lỗi: TOKEN hoặc CLIENT_ID chưa được thiết lập trong file .env");
  process.exit(1);
}

// ✅ Khởi tạo REST client
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

// ✅ ID server test chính
const mainGuildId = "1308052869559222272";

(async () => {
  try {
    console.log("🔄 Đang cập nhật slash commands...");

    // --- XÓA HẾT LỆNH CŨ TRÊN SERVER TRƯỚC ---
    const existingCommands = await rest.get(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, mainGuildId)
    );
    if (existingCommands.length > 0) {
      console.log(`⚠️ Xóa ${existingCommands.length} lệnh cũ trên server ${mainGuildId}...`);
      for (const cmd of existingCommands) {
        await rest.delete(
          Routes.applicationGuildCommand(process.env.CLIENT_ID, mainGuildId, cmd.id)
        );
      }
      console.log("✅ Đã xóa xong tất cả lệnh cũ trên server test!");
    }

    // --- ĐĂNG KÝ LỆNH MỚI CHO SERVER ---
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, mainGuildId),
      { body: commands }
    );
    console.log(`✅ Đã đăng ký ${commands.length} lệnh cho server test ${mainGuildId}!`);

    // --- ĐĂNG KÝ LỆNH GLOBAL ---
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log(`🌎 Đã đăng ký ${commands.length} lệnh global (toàn bộ server)!`);

    console.log("✅ Hoàn tất cập nhật lệnh!");
  } catch (error) {
    console.error("❌ Lỗi khi deploy:", error);
  }
})();
