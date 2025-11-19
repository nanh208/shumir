// commands/games/codebreaker.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

function genCode(len = 4) {
  const digits = '0123456789'.split('');
  // generate with possible repeated digits? choose no-repeat to increase difficulty
  const arr = [];
  while (arr.length < len) {
    const idx = Math.floor(Math.random() * digits.length);
    const d = digits.splice(idx,1)[0];
    arr.push(d);
  }
  return arr.join('');
}

function scoreGuess(code, guess) {
  // returns {black, white}
  let black = 0, white = 0;
  const codeArr = code.split('');
  const guessArr = guess.split('');

  const codeMap = {};
  for (let i=0;i<codeArr.length;i++) {
    if (codeArr[i] === guessArr[i]) black++;
    else {
      codeMap[codeArr[i]] = (codeMap[codeArr[i]] || 0) + 1;
    }
  }
  for (let i=0;i<guessArr.length;i++) {
    if (codeArr[i] !== guessArr[i]) {
      if (codeMap[guessArr[i]]) {
        white++;
        codeMap[guessArr[i]]--;
      }
    }
  }
  return { black, white };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('codebreaker')
    .setDescription('🔐 Mastermind 4 chữ số — đoán số 4 chữ số không lặp.')
    .addIntegerOption(o => o.setName('tries').setDescription('Số lượt thử (mặc định 8)').setMinValue(3).setMaxValue(20)),

  cooldown: 10,
  async execute(interaction, client, gameStates) {
    // deferred by index.js
    const tries = interaction.options.getInteger('tries') || 8;
    const code = genCode(4); // bot random code, sẽ không tiết lộ
    const msg = await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🔐 CodeBreaker bắt đầu').setDescription(`Mình đã sinh 1 mã 4 chữ số không trùng. Bạn có **${tries}** lượt để đoán. Gõ đoán dưới dạng 4 chữ số (ví dụ: 1234).`).setColor('Purple').setFooter({ text: 'Bot sẽ trả về số đúng đúng vị trí (black) và đúng nhưng sai vị trí (white). Mình sẽ không tiết lộ mã.' })] });

    const filter = m => m.channelId === interaction.channelId && !m.author.bot;
    const collector = interaction.channel.createMessageCollector({ filter, time: 120000 });

    let attempts = 0;
    collector.on('collect', m => {
      const g = m.content.trim();
      if (!/^\d{4}$/.test(g)) {
        m.reply({ content: '❗ Gõ đúng 4 chữ số (ví dụ: 1234).', ephemeral: true }).catch(()=>{});
        return;
      }
      attempts++;
      const sc = scoreGuess(code, g);
      if (sc.black === 4) {
        m.reply({ content: `🏆 ${m.author} đoán đúng mã trong ${attempts} lượt!`, ephemeral: false }).catch(()=>{});
        collector.stop('win');
        return;
      } else {
        m.reply({ content: `🔎 Kết quả: black=${sc.black}, white=${sc.white} — (${attempts}/${tries})`, ephemeral: true }).catch(()=>{});
      }
      if (attempts >= tries) {
        m.reply({ content: `❌ Đã dùng hết ${tries} lượt. Bạn thua. Mình sẽ không tiết lộ mã.`, ephemeral: false }).catch(()=>{});
        collector.stop('lost');
      }
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'win') {
        msg.edit({ embeds: [new EmbedBuilder().setTitle('🏆 Thắng!').setDescription('Bạn đã phá mã!').setColor('Green')] }).catch(()=>{});
      } else if (reason === 'lost' || reason === 'time') {
        msg.edit({ embeds: [new EmbedBuilder().setTitle('✖ Kết thúc').setDescription('Bạn không giải mã được — theo luật mình sẽ không tiết lộ đáp án.').setColor('DarkRed')] }).catch(()=>{});
      } else {
        msg.edit({ embeds: [new EmbedBuilder().setTitle('Kết thúc').setDescription('Trò chơi dừng lại.').setColor('Grey')] }).catch(()=>{});
      }
    });
  }
};
