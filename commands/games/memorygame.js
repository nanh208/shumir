// commands/games/memorygame.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const EMOJIS = ['🍎','🍌','🍇','🍒','🍓','🍑','🍍','🥝','🍋','🍉','🍐','🥭'];

function genSeq(len) {
  let s = [];
  for (let i=0;i<len;i++) s.push(EMOJIS[Math.floor(Math.random()*EMOJIS.length)]);
  return s;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('memorygame')
    .setDescription('🧠 Memory — nhớ chuỗi emoji trong vài giây và gõ lại')
    .addIntegerOption(o => o.setName('length').setDescription('Độ dài chuỗi (mặc định 5)').setMinValue(3).setMaxValue(8)),

  cooldown: 10,
  async execute(interaction) {
    // deferred by index.js
    const len = interaction.options.getInteger('length') || 5;
    const seq = genSeq(len);
    const show = seq.join(' ');
    const embedShow = new EmbedBuilder()
      .setTitle('🧠 Memory Game')
      .setDescription(`Hãy nhớ chuỗi emoji sau (hiển thị 5s):\n\n${show}`)
      .setColor('Purple');

    const msg = await interaction.editReply({ embeds: [embedShow] });

    // show 5s then hide
    setTimeout(async () => {
      const embedHide = new EmbedBuilder()
        .setTitle('🧠 Memory Game')
        .setDescription('Chuỗi đã bị ẩn. Gõ lại chuỗi chính xác (các emoji cách nhau bằng dấu cách). Bạn có 12s.')
        .setColor('Grey');
      await msg.edit({ embeds: [embedHide] });

      const filter = m => m.channelId === interaction.channelId && !m.author.bot;
      const collector = interaction.channel.createMessageCollector({ filter, time: 12000, max: 1 });

      collector.on('collect', m => {
        if (m.content.trim() === seq.join(' ')) {
          m.reply({ content: `🎉 Chính xác! ${m.author} nhớ tốt đó.`, ephemeral: false }).catch(()=>{});
          collector.stop('win');
        } else {
          m.reply({ content: `❌ Sai rồi — bạn thua (Bot không tiết lộ chuỗi).`, ephemeral: false }).catch(()=>{});
          collector.stop('lose');
        }
      });

      collector.on('end', (collected, reason) => {
        if (reason === 'win') {
          msg.edit({ embeds: [new EmbedBuilder().setTitle('🏆 Thắng!').setDescription('Bạn đã nhớ đúng chuỗi.').setColor('Green')] }).catch(()=>{});
        } else if (reason === 'lose') {
          msg.edit({ embeds: [new EmbedBuilder().setTitle('💀 Thua').setDescription('Bạn không nhớ chính xác. Mình sẽ không tiết lộ chuỗi.').setColor('DarkRed')] }).catch(()=>{});
        } else {
          msg.edit({ embeds: [new EmbedBuilder().setTitle('⌛ Hết thời gian').setDescription('Không có câu trả lời.').setColor('Orange')] }).catch(()=>{});
        }
      });
    }, 5000);
  }
};
