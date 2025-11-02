require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const commands = [];

// ✅ Hàm đệ quy để đọc tất cả file .js trong thư mục /commands và các thư mục con
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

// ✅ Khởi tạo REST client
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("🔄 Đang cập nhật slash commands...");

    if (process.env.GUILD_ID) {
      // ⚡ Deploy nhanh cho server test
      await rest.put(
        Routes.applicationGuildCommands(
          process.env.CLIENT_ID,
          process.env.GUILD_ID
        ),
        { body: commands }
      );
      console.log(
        `✅ Đã đăng ký ${commands.length} lệnh cho GUILD_ID (${process.env.GUILD_ID})!`
      );  
    } else {
      // 🌍 Deploy toàn cầu (mất 1–2 tiếng để đồng bộ)
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
        body: commands,
      });
      console.log(`🌎 Đã đăng ký ${commands.length} lệnh global!`);
    }
  } catch (error) {
    console.error("❌ Lỗi khi deploy:", error);
  }
})();
