const play = require("play-dl");

(async () => {
  try {
    const result = await play.authorization();
    console.log("✅ Refresh thành công!");
    console.log(result);
  } catch (e) {
    console.error("❌ Lỗi khi refresh:", e);
  }
})();
