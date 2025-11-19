const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { readJSON, writeJSON, randomInt, choose } = require('../utils');
const { spawnWildPets, lockPet, removeWildPet } = require('../spawnWildPet');
const { candyTypes } = require('../config');

const petsFile = './data/pets.json';

function ensureUser(data, userId) {
  if (!data.users[userId]) data.users[userId] = { pets: [], inventory: [], xp: 0, coins: 0, candies: {} };
  if (!data.users[userId].candies) data.users[userId].candies = {};
}

// Map pet quality to possible candy qualities
function candyFromQuality(petQuality) {
  const map = {
    Common: ['normal'],
    Uncommon: ['normal','premium'],
    Rare: ['premium','normal'],
    Epic: ['premium','ultra'],
    Legendary: ['ultra','premium'],
    Mythic: ['ultra']
  };
  const arr = map[petQuality] || ['normal'];
  return choose(arr);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spawn')
    .setDescription('Quản lý spawn pet')
    .addSubcommand(sub => sub.setName('register').setDescription('Đăng ký kênh hiện tại làm kênh spawn (admin)'))
    .addSubcommand(sub => sub.setName('unregister').setDescription('Hủy đăng ký kênh spawn (admin)'))
    .addSubcommand(sub => sub.setName('now').setDescription('Bắt đầu spawn ngay (admin)'))
    .addSubcommand(sub => sub.setName('kill').setDescription('Giết pet để nhận kẹo').addStringOption(opt => opt.setName('id').setDescription('ID pet').setRequired(true))),

  async execute(interaction) {
    let sub;
    try {
      sub = interaction.options.getSubcommand();
    } catch (e) {
      return interaction.reply({ content: '❗ Vui lòng chọn một hành động: `register`, `unregister`, `now`, `kill`.', ephemeral: true });
    }

    // permission guard for admin-only subcommands
    const adminOnly = ['register', 'unregister', 'now'];
    if (adminOnly.includes(sub)) {
      if (!interaction.member || !interaction.member.permissions || !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({ content: '❌ Bạn cần quyền `Manage Server` để dùng lệnh này.', ephemeral: true });
      }
    }
    const data = readJSON(petsFile);
    if (!data.spawnChannels) data.spawnChannels = {};

    if (sub === 'register') {
      data.spawnChannels[interaction.guildId] = interaction.channel.id;
      writeJSON(petsFile, data);
      return interaction.reply({ content: `✅ Kênh này đã được đăng ký làm kênh spawn pet. Bot sẽ spawn mỗi 10 phút và khi khởi động.`, ephemeral: true });
    }

    if (sub === 'unregister') {
      delete data.spawnChannels[interaction.guildId];
      writeJSON(petsFile, data);
      return interaction.reply({ content: `✅ Đã hủy đăng ký kênh spawn cho server này.`, ephemeral: true });
    }

    if (sub === 'now') {
      await interaction.deferReply({ ephemeral: true });
      const channelId = interaction.channel.id;
      const spawned = await spawnWildPets(interaction.client, channelId, 10);
      return interaction.editReply({ content: `✅ Đã spawn ${spawned.length} pet ở <#${channelId}>` });
    }

    if (sub === 'kill') {
      const petIdRaw = interaction.options.getString('id');
      const petId = Number(petIdRaw);
      const d = readJSON(petsFile);
      const idx = (d.wildPets || []).findIndex(p => p.id === petId);
      if (idx === -1) return interaction.reply({ content: '❌ Không tìm thấy pet với ID này.', ephemeral: true });

      // Try to lock
      const lock = lockPet(petId, interaction.user.id);
      if (!lock.ok) {
        if (lock.reason === 'locked') return interaction.reply({ content: '⛔ Pet đang bị người khác tấn công, thử lại sau.', ephemeral: true });
        return interaction.reply({ content: '❌ Không thể khoá pet.', ephemeral: true });
      }

      // Kill immediately: remove pet and grant candies
      const pet = removeWildPet(petId);
      if (!pet) return interaction.reply({ content: '❌ Lỗi khi giết pet.', ephemeral: true });

      // Grant random candy quality and random amount
      const candyQuality = candyFromQuality(pet.quality);
      const amount = randomInt(1, 5);
      ensureUser(d, interaction.user.id);
      d.users[interaction.user.id].candies[candyQuality] = (d.users[interaction.user.id].candies[candyQuality] || 0) + amount;
      writeJSON(petsFile, d);

      return interaction.reply({ content: `⚔️ Bạn đã giết **${pet.name}** và nhận được **${amount} x ${candyQuality} candy**.`, ephemeral: false });
    }
  }
}
