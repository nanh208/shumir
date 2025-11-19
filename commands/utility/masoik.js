const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.resolve(__dirname, '../../data/masoi-channel.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) || {};
  } catch (e) { console.error('Failed to read masoi-channel.json', e); }
  return {};
}
function saveConfig(cfg) {
  try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2)); return true; } catch (e) { console.error('Failed to write masoi-channel.json', e); return false; }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('masoik')
    .setDescription('Kích hoạt Ma Sói trên kênh được chỉ định (chỉ 1 kênh).')
    .addChannelOption(opt => opt.setName('kênh').setDescription('Kênh text để bot hoạt động').addChannelTypes(ChannelType.GuildText).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client, gameStates) {
    await interaction.deferReply({ ephemeral: true }).catch(()=>{});
    const channel = interaction.options.getChannel('kênh');
    if (!channel) return interaction.editReply({ content: 'Không tìm thấy kênh.' });

    if (!interaction.guildId) return interaction.editReply({ content: 'Lệnh này chỉ có thể được sử dụng trong server (guild).' });

    const cfg = loadConfig();
    const prev = cfg[interaction.guildId];

    cfg[interaction.guildId] = channel.id;
    if (!saveConfig(cfg)) return interaction.editReply({ content: 'Lưu cấu hình thất bại.' });

    if (prev && prev !== channel.id) {
      return interaction.editReply({ content: `✅ Đã cập nhật kênh Ma Sói cho server này sang <#${channel.id}> (thay cho <#${prev}>).` });
    }

    return interaction.editReply({ content: `✅ Đã kích hoạt Ma Sói trên <#${channel.id}> cho server này. Chỉ kênh này sẽ sử dụng tính năng Ma Sói.` });
  }
};
