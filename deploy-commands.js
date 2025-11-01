require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];
const foldersPath = path.join(__dirname, "commands");

for (const folder of fs.readdirSync(foldersPath)) {
  const folderPath = path.join(foldersPath, folder);
  for (const file of fs.readdirSync(folderPath).filter(f => f.endsWith(".js"))) {
    const command = require(path.join(folderPath, file));
    if (command.data) commands.push(command.data.toJSON());
  }
}

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("🔄 Đang đăng ký slash commands...");
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Slash commands đã được cập nhật!");
  } catch (err) {
    console.error(err);
  }
})();
