const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const jokes = [
  "Tại sao máy tính hay mệt? Vì nó luôn phải chạy!",
  "Lập trình viên mất ngủ vì lỗi còn dang dở.",
  "Cà phê đắng, nhưng lỗi còn đắng hơn.",
  "Shumir bảo: 'Đừng lo, lỗi là tính năng chưa hoàn thiện thôi!'",
];

module.exports = {
  data: new SlashCommandBuilder().setName("joke").setDescription("🤣 Nghe một câu chuyện cười!"),
  async execute(interaction, client, gameStates) {
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    const embed = new EmbedBuilder().setColor("Yellow").setTitle("☕ Truyện cười").setDescription(joke);
    await interaction.reply({ embeds: [embed] });
  },
};
