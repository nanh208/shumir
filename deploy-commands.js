require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

if (!process.env.TOKEN || !process.env.CLIENT_ID) {
  console.error("❌ Thiếu TOKEN hoặc CLIENT_ID trong .env");
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, "commands");

for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"))) {
  const command = require(path.join(commandsPath, file));
  if (command.data?.toJSON) commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("🔄 Đang deploy slash commands...");
    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log("✅ Đã deploy lệnh vào GUILD (test nhanh).");
    } else {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
      console.log("✅ Đã deploy slash commands (global).");
    }
    console.log("📜 Lệnh:", commands.map(c => c.name).join(", "));
  } catch (err) {
    console.error("❌ Lỗi deploy:", err);
  }
})();
