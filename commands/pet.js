// commands/pet.js
const { SlashCommandBuilder } = require("discord.js");
const { generatePet, addPetToUser, spawnWildPet } = require("../petSystem");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pet")
        .setDescription("Quản lý pet"),
    async execute(interaction) {
        const pet = generatePet();
        addPetToUser(interaction.user.id, pet);
        await interaction.reply(`Bạn đã nhận được pet: ${pet.icon} **${pet.name}**`);
    }
};
