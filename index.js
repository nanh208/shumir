// index.js — Shumir Bot (Đã sửa lỗi trùng lặp và thêm Event Handler)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits, EmbedBuilder, Events } = require("discord.js"); // <-- THÊM 'Events'

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// --- LOGIC NỐI TỪ (THÊM MỚI) ---
// Biến toàn cục để lưu trạng thái game (lưu trong RAM)
// Sẽ được truyền vào cả Command Handler và Event Handler
const gameStates = new Map();
// --- KẾT THÚC THÊM MỚI ---


// 📂 Load Commands (Giữ lại bộ nạp thứ 2 của bạn, vì nó có gán category)
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(commandsPath); // <--- Sửa lại tên biến cho nhất quán

for (const folder of commandFolders) {
    // Thêm kiểm tra, chỉ đọc nếu là thư mục
    const folderPath = path.join(commandsPath, folder);
    if (fs.statSync(folderPath).isDirectory()) { 
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
}
console.log(`✅ Đã tải ${client.commands.size} slash commands.`);


// --- THÊM MỚI: BỘ NẠP EVENT (EVENT HANDLER) ---
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	
    // Đây là mấu chốt: Truyền 'gameStates' vào event 'messageCreate'
    // (Giả sử file event/messageCreate.js của bạn dùng 'name: Events.MessageCreate')
    if (event.name === Events.MessageCreate) {
        client.on(event.name, (...args) => event.execute(...args, gameStates));
    }
    // Các event khác (nếu có)
    else if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}
console.log(`✅ Đã tải ${eventFiles.length} events (bao gồm Nối Từ).`);
// --- KẾT THÚC THÊM MỚI ---


// --- Bot Ready ---
client.once("ready", () => {
  console.log(`✅ Bot đã đăng nhập: ${client.user.tag}`);
  client.user.setPresence({
    activities: [{ name: "🎉 Giải trí & Nối Từ!", type: 0 }], // Cập nhật tên game
    status: "online",
  });
});


// --- Xử lý Lệnh Slash Command (Cập nhật để truyền gameStates) ---
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    // --- SỬA LỖI & THÊM MỚI (Logic Nối Từ) ---
    // Truyền 'gameStates' vào cho các lệnh game
    if (command.category === 'games') {
        await command.execute(interaction, gameStates); 
    } else {
        await command.execute(interaction);
    }
    // --- KẾT THÚC SỬA LỖI ---
  } catch (error) {
    console.error(error);
    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("❌ Lỗi khi chạy lệnh!")
      .setDescription("Có vẻ Shumir hơi bối rối... bạn thử lại nhé!");
    
    // Thêm kiểm tra 'replied' hoặc 'deferred' (rất quan trọng)
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [embed], ephemeral: true });
    } else {
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
});

// (Phần code nạp lệnh trùng lặp thứ 2 đã bị XÓA)

client.login(process.env.TOKEN);