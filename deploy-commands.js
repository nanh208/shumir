require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const commands = [];
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
    } else {
      console.warn(`⚠️  File ${filePath} thiếu "data" hoặc "execute"!`);
    }
  }
}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("🔄 Đang cập nhật slash commands...");

    if (process.env.GUILD_ID) {
      // ⚡ Deploy nhanh cho 1 server test
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Đã đăng ký ${commands.length} lệnh cho GUILD_ID (${process.env.GUILD_ID})!`);
    } else {
      // 🌍 Deploy toàn cầu (mất 1–2 tiếng để đồng bộ)
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
      console.log(`🌎 Đã đăng ký ${commands.length} lệnh global!`);
    }
  } catch (error) {
    console.error("❌ Lỗi khi deploy:", error);
  }
})();
