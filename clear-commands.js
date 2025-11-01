require("dotenv").config();
const { REST, Routes } = require("discord.js");

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("🧹 Đang xóa toàn bộ slash commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
    console.log("✅ Đã xóa tất cả lệnh global!");
  } catch (error) {
    console.error("❌ Lỗi khi xóa lệnh:", error);
  }
})();

