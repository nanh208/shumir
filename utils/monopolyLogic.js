// utils/monopolyLogic.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

// Danh sách các ô đất (Đơn giản hóa 20 ô)
// Sử dụng màu ANSI để tô màu nhóm đất trong code block
const BOARD_PROPERTIES = [
    { id: 1, name: "START", price: 0, rent: 0, group: "Special", emoji: '🟢', color: '\x1b[37m' }, // Trắng
    { id: 2, name: "Purple St.", price: 60, rent: 5, group: "Purple", emoji: '🟣', color: '\x1b[35m' }, // Tím
    { id: 3, name: "Community Chest", price: 0, rent: 0, group: "Chance", emoji: '❓', color: '\x1b[37m' },
    { id: 4, name: "Purple Lane", price: 60, rent: 5, group: "Purple", emoji: '🟣', color: '\x1b[35m' },
    { id: 5, name: "Train Station 1", price: 200, rent: 25, group: "Railroad", emoji: '🚂', color: '\x1b[37m' },
    { id: 6, name: "Light Blue St.", price: 100, rent: 6, group: "LightBlue", emoji: '🔵', color: '\x1b[36m' }, // Xanh Cyan
    { id: 7, name: "Chance", price: 0, rent: 0, group: "Chance", emoji: '🎲', color: '\x1b[37m' },
    { id: 8, name: "Light Blue Ave.", price: 100, rent: 6, group: "LightBlue", emoji: '🔵', color: '\x1b[36m' },
    { id: 9, name: "Light Blue Pk.", price: 120, rent: 8, group: "LightBlue", emoji: '🔵', color: '\x1b[36m' },
    { id: 10, name: "Jail", price: 0, rent: 0, group: "Special", emoji: '🔒', color: '\x1b[37m' },
    { id: 11, name: "Orange St.", price: 140, rent: 10, group: "Orange", emoji: '🟠', color: '\x1b[33m' }, // Vàng
    { id: 12, name: "Utility - Water", price: 150, rent: 10, group: "Utility", emoji: '💧', color: '\x1b[37m' },
    { id: 13, name: "Orange Ave.", price: 140, rent: 10, group: "Orange", emoji: '🟠', color: '\x1b[33m' },
    { id: 14, name: "Orange Pk.", price: 160, rent: 12, group: "Orange", emoji: '🟠', color: '\x1b[33m' },
    { id: 15, name: "Train Station 2", price: 200, rent: 25, group: "Railroad", emoji: '🚂', color: '\x1b[37m' },
    { id: 16, name: "Red St.", price: 180, rent: 14, group: "Red", emoji: '🔴', color: '\x1b[31m' }, // Đỏ
    { id: 17, name: "Community Chest", price: 0, rent: 0, group: "Chance", emoji: '❓', color: '\x1b[37m' },
    { id: 18, name: "Red Ave.", price: 180, rent: 14, group: "Red", emoji: '🔴', color: '\x1b[31m' },
    { id: 19, name: "Red Pk.", price: 200, rent: 16, group: "Red", emoji: '🔴', color: '\x1b[31m' },
    { id: 20, name: "Go To Jail", price: 0, rent: 0, group: "Special", emoji: '🛑', color: '\x1b[37m' },
];

const activeMonopolyGames = new Map(); // Global state (sẽ được import từ file activeGames.js hoặc utils/activeMonopolyGames.js nếu có)

// --- HÀM HỖ TRỢ ---

function findOwner(game, property) {
    for (const player of game.players.values()) {
        if (player.properties.has(property.id)) return player;
    }
    return null;
}

// --- HÀM TẠO GIAO DIỆN TEXT ART BOARD (Tối ưu giao diện) ---

function createMonopolyTextBoard(game) {
    // 1. Tối ưu: Hiển thị 10 ô xung quanh vị trí hiện tại (5 trước, 5 sau)
    const currentPlayerId = game.turnOrder[game.currentPlayerIndex];
    const currentPlayer = game.players.get(currentPlayerId);
    const centerPos = currentPlayer.position;
    const totalCells = game.board.length;

    let boardString = '```ansi\n';
    boardString += 'BẢN ĐỒ MINI (Vị trí hiện tại: ' + centerPos + '):\n';
    boardString += '-------------------------------------------\n';
    
    // Tạo cấu trúc 3 dòng: ID/Tên, Emoji/Màu, Token
    let idNameRow = 'ID/Tên:  ';
    let emojiRow = 'Màu/Ký: ';
    let tokenRow = 'Quân cờ: ';

    // Duyệt qua 10 ô xung quanh (Hoặc toàn bộ nếu game nhỏ)
    for (let i = -5; i <= 5; i++) {
        let actualIndex = (centerPos + i - 1);
        if (actualIndex < 0) actualIndex += totalCells;
        actualIndex = actualIndex % totalCells;
        
        const cell = game.board[actualIndex];

        // Mã màu ANSI: Đỏ/Xanh cho sở hữu, hoặc màu nhóm đất
        let owner = findOwner(game, cell);
        let tokenColor = cell.color;
        
        // Tô màu ô đất
        if (owner) {
             // Đỏ cho đối thủ (31m) / Xanh lá cho chính mình (32m)
            tokenColor = owner.id === currentPlayerId ? '\x1b[32m' : '\x1b[31m'; 
        }

        // Tên (Căn chỉnh 6 ký tự)
        let nameChunk = cell.name.substring(0, 6).padEnd(6, ' ');
        idNameRow += `[${cell.id.toString().padStart(2, '0')}] ${nameChunk} |`;

        // Ký hiệu Emoji và Màu
        emojiRow += tokenColor + cell.emoji + '      \x1b[0m|'; // 6 ký tự trống sau emoji

        // Token
        const tokens = (playerLocations[cell.id] || []).join('');
        const tokenChunk = tokens.padEnd(7, ' ');
        tokenRow += tokenChunk + '|';
    }

    boardString += '```\n'; // Kết thúc Code Block vì bàn cờ 40 ô rất dài

    // 2. Chuyển sang hiển thị trực tiếp trong Field (ít bị giới hạn hơn)
    
    let boardList = '';
    const start = Math.max(1, centerPos - 5);
    const end = Math.min(totalCells, centerPos + 5);

    boardList += `**Khu vực hiện tại (${start} -> ${end})**:\n`;
    for (let i = start; i <= end; i++) {
        const cell = game.board.find(c => c.id === i);
        const owner = findOwner(game, cell);
        let prefix = cell.emoji;
        let suffix = '';

        if (i === centerPos) {
            prefix = '🏠 ' + prefix; // Đánh dấu vị trí quân cờ
        }

        if (owner) {
            suffix = ` - 🟥 SỞ HỮU BỞI ${owner.username}`;
            if (owner.id === currentPlayerId) suffix = ` - ✅ SỞ HỮU BỞI BẠN`;
        } else if (cell.price > 0) {
            suffix = ` - 🟢 CHƯA CÓ CHỦ (${cell.price}$)`;
        }

        boardList += `${prefix} [${cell.id.toString().padStart(2, '0')}] ${cell.name}${suffix}\n`;
    }
    
    return boardList; // Trả về dạng List chi tiết
}


// --- HÀM TẠO GIAO DIỆN CHÍNH (EMBED VÀ BUTTONS) ---

function buildGameInterface(game, message = "Chọn hành động của bạn:") {
    const currentPlayerId = game.turnOrder[game.currentPlayerIndex];
    const currentPlayer = game.players.get(currentPlayerId);
    const currentProperty = game.board.find(p => p.id === currentPlayer.position);
    
    const boardList = createMonopolyTextBoard(game);

    const playerStatus = Array.from(game.players.values())
        .map(p => `\`${p.token}\` **${p.username}** (${p.money.toLocaleString()}$) | Vị trí: [${p.position}] ${game.board.find(b => b.id === p.position).name}`)
        .join('\n');

    const embed = new EmbedBuilder()
        .setTitle(`💰 Cờ Tỷ Phú Discord - Lượt của ${currentPlayer.username}`)
        .setColor('#2ECC71')
        .setDescription(message)
        .addFields(
            { name: 'Trạng thái người chơi', value: playerStatus, inline: false },
            { name: 'Vị trí & Bản đồ', value: boardList, inline: false }, // Đưa bản đồ vào đây
            { name: 'Lượt vừa qua', value: game.diceRoll ? `🎲 **${game.diceRoll}** | ${currentPlayer.username} tiến tới ô **${currentProperty.name}**` : "Chưa gieo xúc xắc.", inline: false }
        );

    const row = new ActionRowBuilder();
    
    if (!game.diceRoll) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('monopoly_roll')
                .setLabel('🎲 Gieo Xúc Xắc')
                .setStyle(ButtonStyle.Primary)
        );
    } else {
        const owner = findOwner(game, currentProperty);
        
        if (currentProperty.price > 0 && !owner) {
             row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`monopoly_buy_${currentProperty.id}`)
                    .setLabel(`Mua ${currentProperty.name} (${currentProperty.price.toLocaleString()}$)`)
                    .setStyle(ButtonStyle.Success)
            );
        }
        
         row.addComponents(
            new ButtonBuilder()
                .setCustomId('monopoly_endturn')
                .setLabel('Kết thúc lượt')
                .setStyle(ButtonStyle.Secondary)
        );
    }

    return { embeds: [embed], components: [row] };
}


// --- HÀM XỬ LÝ LƯỢT CHƠI (ROLL, BUY, ENDTURN) ---

async function handleMonopolyInteraction(interaction) {
    if (!interaction.isButton()) return;
    
    const game = activeMonopolyGames.get(interaction.channelId);
    if (!game) return interaction.reply({ content: "Không có game Cờ Tỷ Phú nào đang hoạt động.", ephemeral: true });

    const [_, action, propertyId] = interaction.customId.split('_');
    const currentPlayerId = game.turnOrder[game.currentPlayerIndex];
    const currentPlayer = game.players.get(currentPlayerId);

    if (interaction.user.id !== currentPlayerId) {
        return interaction.reply({ content: "❌ Chưa đến lượt của bạn!", ephemeral: true });
    }
    
    await interaction.deferUpdate();

    let replyMessage = "Lượt chơi được xử lý.";

    // Logic Roll (Gieo Xúc Xắc)
    if (action === 'roll') {
        // ... (Logic tương tự file demo trước)
        const roll = Math.floor(Math.random() * 6) + 1;
        let newPosition = currentPlayer.position + roll;
        let passedStart = false;
        
        if (newPosition > game.board.length) {
            newPosition = newPosition % game.board.length;
            if (newPosition === 0) newPosition = game.board.length;
            passedStart = true;
        }
        
        currentPlayer.position = newPosition;
        game.diceRoll = roll;
        const currentProperty = game.board.find(p => p.id === newPosition);

        replyMessage = `🎲 **${currentPlayer.username}** gieo được **${roll}** và tiến tới ô **${currentProperty.name}**!`;
        
        if (passedStart) {
            currentPlayer.money += 200;
            replyMessage += " **(+200$ khi đi qua START)**.";
        }
        
        const owner = findOwner(game, currentProperty);
        if (owner && owner.id !== currentPlayerId) {
            const rentAmount = currentProperty.rent;
            currentPlayer.money -= rentAmount;
            owner.money += rentAmount;
            
            replyMessage += `\n**💸 Bạn phải trả ${owner.username} ${rentAmount}$ tiền thuê nhà!**`;
            
            game.diceRoll = null;
            game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.turnOrder.length;
        }
    }
    
    // Logic Buy (Mua Nhà)
    else if (action === 'buy') {
        const propId = parseInt(propertyId);
        const property = game.board.find(p => p.id === propId);

        if (currentPlayer.money < property.price) {
             return interaction.followUp({ content: "❌ Bạn không đủ tiền để mua ô này!", ephemeral: true });
        }
        
        currentPlayer.money -= property.price;
        currentPlayer.properties.add(propId);
        
        game.diceRoll = null;
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.turnOrder.length;

        replyMessage = `✅ **${currentPlayer.username}** đã mua **${property.name}** với giá **${property.price.toLocaleString()}$**! Lượt tiếp theo là của ${game.players.get(game.turnOrder[game.currentPlayerIndex]).username}.`;
    }

    // Logic End Turn (Kết thúc lượt)
    else if (action === 'endturn') {
        game.diceRoll = null;
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.turnOrder.length;
        
        // TODO: Thêm logic kiểm tra người thắng cuộc
        
        replyMessage = `✅ Kết thúc lượt. Lượt tiếp theo là của **${game.players.get(game.turnOrder[game.currentPlayerIndex]).username}**`;
    }

    const { embeds, components } = buildGameInterface(game, replyMessage);
    await interaction.editReply({ embeds: embeds, components: components });
}


// --- HÀM KHỞI TẠO VÀ KẾT THÚC ---

function createNewGame(channel, players) {
    if (activeMonopolyGames.has(channel.id)) {
        return { success: false, message: 'Đã có một game Cờ Tỷ Phú đang diễn ra trong kênh này.' };
    }

    const game = {
        channelId: channel.id,
        players: new Map(players.map(p => [p.id, { 
            id: p.id, 
            username: p.username, 
            money: 1500,
            position: 1, 
            properties: new Set(),
            token: p.username.charAt(0).toUpperCase()
        }])),
        board: BOARD_PROPERTIES,
        turnOrder: players.map(p => p.id),
        currentPlayerIndex: 0,
        diceRoll: null,
        messageId: null,
    };
    activeMonopolyGames.set(channel.id, game);
    return { success: true, game: game };
}

function endGame(channelId) {
    activeMonopolyGames.delete(channelId);
}


module.exports = {
    createNewGame,
    endGame,
    buildGameInterface,
    handleMonopolyInteraction,
    activeMonopolyGames
};