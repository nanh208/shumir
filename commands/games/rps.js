const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rps")
    .setDescription("✊ Oẳn tù tì cùng Shumir!")
    .addStringOption(opt =>
      opt.setName("chọn").setDescription("Kéo, búa, bao").setRequired(true)
        .addChoices(
          { name: "🪨 Búa", value: "búa" },
          { name: "📄 Bao", value: "bao" },
          { name: "✂️ Kéo", value: "kéo" }
        )),

  async execute(interaction, client, gameStates) {
    const userChoice = interaction.options.getString("chọn");
    const botChoice = ["búa", "bao", "kéo"][Math.floor(Math.random() * 3)];

    let result = "";
    if (userChoice === botChoice) result = "⚖️ Hòa nhau!";
    else if (
      (userChoice === "búa" && botChoice === "kéo") ||
      (userChoice === "bao" && botChoice === "búa") ||
      (userChoice === "kéo" && botChoice === "bao")
    ) result = "🎉 Bạn thắng rồi!";
    else result = "😎 Shumir thắng nha!";

    const embed = new EmbedBuilder()
      .setColor("Random")
      .setTitle("✊ Kết quả oẳn tù tì")
      .setDescription(`**Bạn:** ${userChoice}\n**Shumir:** ${botChoice}\n\n${result}`);
    await interaction.reply({ embeds: [embed] });
  },
};
