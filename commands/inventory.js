// commands/inventory.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { readJSON } = require("../utils");
const petsFile = "./data/pets.json";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("inventory")
        .setDescription("Xem pet và đồ trong inventory"),
    async execute(interaction) {
        const data = readJSON(petsFile);
        const user = data.users[interaction.user.id];
        if(!user) return interaction.reply("❌ Bạn chưa có pet hay đồ nào!");
        const row = new ActionRowBuilder();
        user.pets.forEach(p => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`pet_${p.id}`)
                    .setLabel(`${p.icon} ${p.name} (Lv ${p.level})`)
                    .setStyle(ButtonStyle.Primary)
            );
        });
        await interaction.reply({ content: "🐾 Pets của bạn:", components: [row] });
    }
};
