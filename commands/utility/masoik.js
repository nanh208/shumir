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
    .setDescription('Kích hoạt Ma Sói: mỗi server có 1 kênh chơi (tùy chọn tự tạo).')
    .addChannelOption(opt => opt.setName('kênh').setDescription('Kênh text để bot hoạt động (bỏ trống để tạo/tìm kênh mặc định "ma-soi")').addChannelTypes(ChannelType.GuildText).setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client, gameStates) {
    await interaction.deferReply({ ephemeral: true }).catch(()=>{});

    if (!interaction.guild) return interaction.editReply({ content: 'Lệnh này chỉ có thể được sử dụng trong server (guild).' });

    let channel = interaction.options.getChannel('kênh');
    const cfg = loadConfig();
    const prev = cfg[interaction.guildId];

    // If no channel provided, try to find an existing default channel named 'ma-soi' or create one
    if (!channel) {
      // Try to find an existing channel by common names
      channel = interaction.guild.channels.cache.find(c => c.type === ChannelType.GuildText && ['ma-soi', 'ma-soi-game', 'masoi'].includes(c.name.toLowerCase()));
      if (!channel) {
        // Attempt to create a dedicated channel for this guild
        try {
          channel = await interaction.guild.channels.create({ name: 'ma-soi', type: ChannelType.GuildText, reason: 'Tạo kênh Ma Sói riêng cho server' });
        } catch (e) {
          console.error('Không thể tạo kênh Ma Sói:', e);
          return interaction.editReply({ content: '❌ Không thể tạo kênh tự động. Vui lòng cấp quyền Manage Channels cho bot hoặc chỉ định kênh thủ công.' });
        }
      }
    }

    // Save per-guild mapping
    cfg[interaction.guildId] = channel.id;
    if (!saveConfig(cfg)) return interaction.editReply({ content: 'Lưu cấu hình thất bại.' });

    if (prev && prev !== channel.id) {
      return interaction.editReply({ content: `✅ Đã cập nhật kênh Ma Sói cho server này sang <#${channel.id}> (thay cho <#${prev}>).` });
    }

    return interaction.editReply({ content: `✅ Đã kích hoạt Ma Sói trên <#${channel.id}> cho server này. Mỗi server sẽ có 1 kênh Ma Sói riêng.` });
  }
};
