// commands/fun/roast.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const roasts = [
  "Bạn thông minh đến mức mà Siri cũng không hiểu nổi!",
  "Tôi thấy bạn đang cố gắng — tiếc là không ai nhận ra điều đó 😆",
  "Bạn có thể không hoàn hảo, nhưng ít nhất cũng... không hoàn toàn vô dụng!",
  "Nếu lười là một môn thể thao, bạn chắc chắn đoạt huy chương vàng 🥇",
  "Bạn sáng chói như màn hình điện thoại giữa đêm vậy 🌙",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roast")
    .setDescription("Châm chọc vui một ai đó hoặc chính bạn")
    .addUserOption(option =>
      option.setName("target").setDescription("Người bạn muốn châm chọc").setRequired(false)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("target") || interaction.user;
    const roast = roasts[Math.floor(Math.random() * roasts.length)];

    const embed = new EmbedBuilder()
      .setColor("Random")
      .setTitle("🔥 Một chút cà khịa vui 🔥")
      .setDescription(`${target} ${roast}`)
      .setFooter({ text: "Đừng giận nha 😆" });

    await interaction.reply({ embeds: [embed] });
  },
};
