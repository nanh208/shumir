  // index.js — Shumir Bot (Fun & Utility Only, Tiếng Việt)
  require("dotenv").config();
  const fs = require("fs");
  const path = require("path");
  const { Client, Collection, GatewayIntentBits, EmbedBuilder } = require("discord.js");

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.commands = new Collection();

  // 🧭 Load toàn bộ slash command từ /commands
  const foldersPath = path.join(__dirname, "commands");
  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
      } else {
        console.log(`[⚠️] Lệnh ${file} bị thiếu "data" hoặc "execute"!`);
      }
    }
  }

  client.once("ready", () => {
    console.log(`✅ Bot đã đăng nhập: ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: "🎉 Giải trí cùng bạn!", type: 0 }],
      status: "online",
    });
  });

  client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("❌ Lỗi khi chạy lệnh!")
        .setDescription("Có vẻ Shumir hơi bối rối... bạn thử lại nhé!");
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  });
// 📂 Load Commands (tự động gán category cho /help)
const commandsPath = path.join(__dirname, "commands");
client.commands = new Collection();

for (const folder of fs.readdirSync(commandsPath)) {
  const folderPath = path.join(commandsPath, folder);
  const commandFiles = fs.readdirSync(folderPath).filter(f => f.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      command.category = folder; // 🏷️ Gán nhóm tự động
      client.commands.set(command.data.name, command);
    } else {
      console.warn(`[⚠️] Lệnh ${file} bị thiếu "data" hoặc "execute"`);
    }
  }
}

  client.login(process.env.TOKEN);
