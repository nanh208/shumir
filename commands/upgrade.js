// commands/upgrade.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { readJSON, writeJSON } = require("../utils");
const { levelUpPet } = require("../upgradeSystem");
const petsFile = "./data/pets.json";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("upgrade")
        .setDescription("Nâng cấp pet của bạn")
        .addStringOption(option => option.setName("id").setDescription("ID pet muốn nâng cấp").setRequired(true)),
    async execute(interaction) {
        const petIdRaw = interaction.options.getString("id");
        const petId = Number(petIdRaw);
        const statPoints = { hp:10, mana:5, attack:5, speed:2, armor:1 }; // ví dụ
        const success = levelUpPet(interaction.user.id, petId, statPoints);
        await interaction.reply(success ? `🔺 Pet đã được nâng cấp!` : `⚠️ Pet đã đạt cấp tối đa hoặc không tồn tại!`);
    }
};
