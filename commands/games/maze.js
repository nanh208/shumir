// commands/games/maze.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

function makeMaze(n=5) {
  // create grid with walls; use simple randomized DFS to carve paths
  const W = n, H = n;
  const maze = Array.from({length:H}, () => Array.from({length:W}, () => '#'));
  const dirs = [[0,1],[1,0],[0,-1],[-1,0]];
  function inBounds(x,y){return x>=0 && x<W && y>=0 && y<H;}
  // start at 0,0
  const stack = [[0,0]];
  maze[0][0] = ' ';
  while(stack.length){
    const [x,y] = stack[stack.length-1];
    const neighbors = [];
    for(const [dx,dy] of dirs){
      const nx = x + dx*2, ny = y + dy*2;
      if(inBounds(nx,ny) && maze[ny][nx] === '#') neighbors.push([nx,ny,dx,dy]);
    }
    if(neighbors.length){
      const [nx,ny,dx,dy] = neighbors[Math.floor(Math.random()*neighbors.length)];
      maze[y+dy][x+dx] = ' ';
      maze[ny][nx] = ' ';
      stack.push([nx,ny]);
    } else stack.pop();
  }
  return maze;
}

function renderMaze(maze, px, py) {
  // show only starting view? We'll render entire maze but with emojis: wall=⬛, path=⬜, player=🙂, end=🏁
  return maze.map((row,y)=> row.map((c,x)=>{
    if (x===px && y===py) return '🙂';
    if (x===maze[0].length-1 && y===maze.length-1) return '🏁';
    return c === '#' ? '⬛' : '⬜';
  }).join('')).join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('maze')
    .setDescription('🌀 Đi mê cung 5x5 — dùng lệnh text up/down/left/right để di chuyển (60s).'),
  cooldown: 10,
  async execute(interaction) {
    // deferred by index.js
    const n = 5;
    const maze = makeMaze(n);
    let px = 0, py = 0;
    const msg = await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('🌀 Mê cung bắt đầu').setDescription(renderMaze(maze, px, py)).setColor('Purple').setFooter({ text: 'Gõ up/down/left/right để di chuyển. Mục tiêu: tới 🏁 (góc phải dưới).' })] });

    const filter = m => m.channelId === interaction.channelId && !m.author.bot;
    const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });

    collector.on('collect', m => {
      const cmd = m.content.trim().toLowerCase();
      const moves = { up: [0,-1], down: [0,1], left: [-1,0], right: [1,0] };
      if (!moves[cmd]) {
        m.reply({ content: '❗ Lệnh di chuyển không hợp lệ. Dùng: up, down, left, right', ephemeral: true }).catch(()=>{});
        return;
      }
      const [dx,dy] = moves[cmd];
      const nx = px + dx, ny = py + dy;
      if (nx<0 || ny<0 || nx>=n || ny>=n) {
        m.reply({ content: '❗ Bạn không thể đi ra ngoài mê cung.', ephemeral: true }).catch(()=>{});
        return;
      }
      if (maze[ny][nx] === '#') {
        m.reply({ content: '❗ Đường bị chặn, không đi được.', ephemeral: true }).catch(()=>{});
        return;
      }
      px = nx; py = ny;
      if (px === n-1 && py === n-1) {
        m.reply({ content: `🏁 ${m.author} đã chiến thắng — đến đích!`, ephemeral: false }).catch(()=>{});
        collector.stop('win');
        return;
      } else {
        m.reply({ content: `➡️ Di chuyển thành công. Vị trí hiện tại: (${px},${py})`, ephemeral: true }).catch(()=>{});
      }
      msg.edit({ embeds: [new EmbedBuilder().setTitle('🌀 Mê cung').setDescription(renderMaze(maze, px, py)).setColor('Purple').setFooter({ text: 'Gõ up/down/left/right để di chuyển.' })] }).catch(()=>{});
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'win') {
        msg.edit({ embeds: [new EmbedBuilder().setTitle('🏆 Thắng!').setDescription('Bạn đã đến đích. Chúc mừng!').setColor('Green')] }).catch(()=>{});
      } else if (reason === 'time') {
        msg.edit({ embeds: [new EmbedBuilder().setTitle('⌛ Hết thời gian').setDescription('Bạn không tới đích trong thời gian. Mình sẽ không tiết lộ bản đồ đầy đủ.').setColor('Orange')] }).catch(()=>{});
      } else {
        msg.edit({ embeds: [new EmbedBuilder().setTitle('Kết thúc').setDescription('Trò chơi dừng lại.').setColor('Grey')] }).catch(()=>{});
      }
    });
  }
};
