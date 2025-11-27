// utils/monopolyLogic.js

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");

// Danh sách các ô đất (Đơn giản hóa 20 ô)
const BOARD_PROPERTIES = [
    { id: 1, name: "START", price: 0, rent: 0, group: "Special", emoji: '🏁', color: '#FFFFFF' }, 
    { id: 2, name: "Purple St.", price: 60, rent: 5, group: "Purple", emoji: '🟪', color: '#800080' }, 
    { id: 3, name: "Community Chest", price: 0, rent: 0, group: "Chance", emoji: '❓', color: '#CCCCCC' },
    { id: 4, name: "Purple Lane", price: 60, rent: 5, group: "Purple", emoji: '🟪', color: '#800080' },
    { id: 5, name: "Train Station 1", price: 200, rent: 25, group: "Railroad", emoji: '🚂', color: '#000000' },
    { id: 6, name: "Light Blue St.", price: 100, rent: 6, group: "LightBlue", emoji: '🟦', color: '#ADD8E6' }, 
    { id: 7, name: "Chance", price: 0, rent: 0, group: "Chance", emoji: '🎲', color: '#CCCCCC' },
    { id: 8, name: "Light Blue Ave.", price: 100, rent: 6, group: "LightBlue", emoji: '🟦', color: '#ADD8E6' },
    { id: 9, name: "Light Blue Pk.", price: 120, rent: 8, group: "LightBlue", emoji: '🟦', color: '#ADD8E6' },
    { id: 10, name: "Jail", price: 0, rent: 0, group: "Special", emoji: '🔒', color: '#FF0000' },
    { id: 11, name: "Orange St.", price: 140, rent: 10, group: "Orange", emoji: '🟧', color: '#FFA500' }, 
    { id: 12, name: "Utility - Water", price: 150, rent: 10, group: "Utility", emoji: '💧', color: '#FFFFFF' },
    { id: 13, name: "Orange Ave.", price: 140, rent: 10, group: "Orange", emoji: '🟧', color: '#FFA500' },
    { id: 14, name: "Orange Pk.", price: 160, rent: 12, group: "Orange", emoji: '🟧', color: '#FFA500' },
    { id: 15, name: "Train Station 2", price: 200, rent: 25, group: "Railroad", emoji: '🚂', color: '#000000' },
    { id: 16, name: "Red St.", price: 180, rent: 14, group: "Red", emoji: '🟥', color: '#FF0000' }, 
    { id: 17, name: "Community Chest", price: 0, rent: 0, group: "Chance", emoji: '❓', color: '#CCCCCC' },
    { id: 18, name: "Red Ave.", price: 180, rent: 14, group: "Red", emoji: '🟥', color: '#FF0000' },
    { id: 19, name: "Red Pk.", price: 200, rent: 16, group: "Red", emoji: '🟥', color: '#FF0000' },
    { id: 20, name: "Go To Jail", price: 0, rent: 0, group: "Special", emoji: '👮', color: '#000000' },
];

const activeMonopolyGames = new Map();

// --- HÀM HỖ TRỢ ---

function findOwner(game, property) {
    for (const player of game.players.values()) {
        if (player.properties.has(property.id)) return player;
    }
    return null;
}

// Hàm lấy người chơi đang đứng tại 1 ô (trừ người chơi hiện tại nếu cần)
function getPlayersAt(game, cellId) {
    let tokens = [];
    game.players.forEach(p => {
        if (p.position === cellId) tokens.push(p.token);
    });
    return tokens;
}

// --- HÀM TẠO GIAO DIỆN MỚI (CLEAN UI) ---

function createNearbyMap(game, currentPlayer) {
    const centerPos = currentPlayer.position;
    const totalCells = game.board.length;
    let mapList = "";

    // Hiển thị 5 ô tiếp theo
    for (let i = 1; i <= 5; i++) {
        let actualIndex = (centerPos + i - 1) % totalCells;
        const cell = game.board[actualIndex];
        
        // Tìm chủ sở hữu
        const owner = findOwner(game, cell);
        
        // Icon trạng thái
        let statusIcon = "⬜"; // Mặc định: Trống
        if (cell.group === "Special" || cell.group === "Chance") statusIcon = "✨";
        else if (owner) {
            statusIcon = (owner.id === currentPlayer.id) ? "✅" : "⛔"; // Của mình hoặc Cấm (của người khác)
        } else if (cell.price > 0) {
            statusIcon = "💰"; // Có thể mua
        }

        // Người chơi đang đứng ở đây
        const playersHere = getPlayersAt(game, cell.id).filter(t => t !== currentPlayer.token); // Không hiện bản thân trong list next
        const playerIcons = playersHere.length > 0 ? ` 👤${playersHere.join('')}` : "";

        // Format dòng hiển thị
        let info = "";
        if (owner) info = `| 🏰 ${owner.username.substring(0, 8)}...`;
        else if (cell.price > 0) info = `| 💵 ${cell.price}$`;

        mapList += `\`${i}.\` ${cell.emoji} **${cell.name}** ${statusIcon} ${info}${playerIcons}\n`;
    }

    return mapList;
}

function getProgressBar(game) {
    // Tạo một thanh hiển thị vị trí tương đối của tất cả người chơi
    // Ví dụ: [START]----A-------B---[JAIL]----C----
    // Nhưng đơn giản hơn: Chỉ liệt kê icon người chơi theo thứ tự vị trí
    
    // Sắp xếp người chơi theo vị trí
    const sortedPlayers = Array.from(game.players.values()).sort((a, b) => a.position - b.position);
    
    let bar = "";
    sortedPlayers.forEach(p => {
        bar += `\`[${p.position.toString().padStart(2, '0')}]\` ${p.token} **${p.username}**\n`;
    });
    return bar;
}

// --- HÀM TẠO GIAO DIỆN CHÍNH ---

function buildGameInterface(game, message = "Chọn hành động của bạn:") {
    const currentPlayerId = game.turnOrder[game.currentPlayerIndex];
    const currentPlayer = game.players.get(currentPlayerId);
    const currentProperty = game.board.find(p => p.id === currentPlayer.position);
    
    // 1. Thông tin ô hiện tại (Hero Section)
    const owner = findOwner(game, currentProperty);
    let propertyStatus = "Khu vực công cộng";
    let propertyColor = currentProperty.color;

    if (currentProperty.price > 0) {
        if (owner) {
            propertyStatus = (owner.id === currentPlayerId) 
                ? "✅ **TÀI SẢN CỦA BẠN**" 
                : `⛔ **SỞ HỮU BỞI:** ${owner.username}\n💸 **Tiền thuê:** ${currentProperty.rent}$`;
        } else {
            propertyStatus = `💰 **CÓ THỂ MUA**\n💵 **Giá:** ${currentProperty.price}$ | 📉 **Thuê:** ${currentProperty.rent}$`;
        }
    } else {
        // Xử lý các ô đặc biệt
        if (currentProperty.name === "START") propertyStatus = "Nhận 200$ khi đi qua.";
        if (currentProperty.name === "Jail") propertyStatus = "Chỉ là đi tham quan thôi.";
        if (currentProperty.name === "Go To Jail") propertyStatus = "Sẽ bị chuyển đến Nhà Tù!";
        if (currentProperty.group === "Chance") propertyStatus = "Thử vận may của bạn!";
    }

    // 2. Danh sách người chơi (Compact)
    const playerStatus = Array.from(game.players.values())
        .map(p => {
            const isTurn = p.id === currentPlayerId ? "▶️ " : "";
            return `${isTurn}\`${p.token}\` **${p.username}**: ${p.money.toLocaleString()}$`;
        })
        .join('\n');

    // 3. Bản đồ lân cận
    const nearbyMap = createNearbyMap(game, currentPlayer);

    const embed = new EmbedBuilder()
        .setTitle(`🎲 Lượt của ${currentPlayer.username} (${currentPlayer.token})`)
        .setColor(propertyColor) // Màu của embed theo màu ô đất
        .setDescription(`### ${message}`)
        .addFields(
            { 
                name: `📍 Vị trí hiện tại: [${currentProperty.id}] ${currentProperty.emoji} ${currentProperty.name}`, 
                value: `${propertyStatus}`, 
                inline: false 
            },
            { 
                name: '🗺️ Các bước tiếp theo', 
                value: nearbyMap, 
                inline: false 
            },
            { 
                name: '👥 Người chơi', 
                value: playerStatus, 
                inline: false 
            }
        )
        .setFooter({ text: `ID Phòng: ${game.channelId} | Game Cờ Tỷ Phú` });

    // --- BUTTONS ---
    const row = new ActionRowBuilder();
    
    if (!game.diceRoll) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('monopoly_roll')
                .setLabel('🎲 Gieo Xúc Xắc')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('monopoly_end') // Nút hủy game nếu cần (chưa implement logic hủy trong button này nhưng để UI cho đẹp)
                .setLabel('🏳️ Đầu hàng')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true) // Tạm khóa
        );
    } else {
        // Logic hiển thị nút Mua / Trả tiền / Kết thúc
        if (currentProperty.price > 0 && !owner && currentPlayer.money >= currentProperty.price) {
             row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`monopoly_buy_${currentProperty.id}`)
                    .setLabel(`Mua ${currentProperty.name} (-${currentProperty.price}$)`)
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


// --- HÀM XỬ LÝ LƯỢT CHƠI ---

async function handleMonopolyInteraction(interaction) {
    if (!interaction.isButton()) return;
    
    const game = activeMonopolyGames.get(interaction.channelId);
    if (!game) return interaction.reply({ content: "Không có game Cờ Tỷ Phú nào đang hoạt động.", flags: [MessageFlags.Ephemeral] });

    const [_, action, propertyId] = interaction.customId.split('_');
    const currentPlayerId = game.turnOrder[game.currentPlayerIndex];
    const currentPlayer = game.players.get(currentPlayerId);

    if (interaction.user.id !== currentPlayerId) {
        return interaction.reply({ content: "❌ Chưa đến lượt của bạn!", flags: [MessageFlags.Ephemeral] });
    }
    
    await interaction.deferUpdate();

    let replyMessage = "đang suy nghĩ...";

    // Logic Roll
    if (action === 'roll') {
        const roll = Math.floor(Math.random() * 6) + 1;
        let newPosition = currentPlayer.position + roll;
        let passedStart = false;
        
        // Xử lý đi qua Start
        if (newPosition > game.board.length) {
            newPosition = newPosition % game.board.length;
            if (newPosition === 0) newPosition = game.board.length; // Sửa lỗi chia hết cho 20 ra 0
            passedStart = true;
        }
        
        currentPlayer.position = newPosition;
        game.diceRoll = roll;
        const currentProperty = game.board.find(p => p.id === newPosition);

        replyMessage = `Đã gieo được **${roll}** nút! \n🏃 Di chuyển đến: **${currentProperty.name}**`;
        
        if (passedStart) {
            currentPlayer.money += 200;
            replyMessage += "\n💰 **Nhận 200$** vì đi qua START!";
        }

        // Xử lý Go To Jail
        if (currentProperty.name === "Go To Jail") {
            currentPlayer.position = 10; // ID của Jail
            replyMessage += "\n👮 **Bị bắt vào tù!**";
            game.diceRoll = null; // Hết lượt luôn
            game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.turnOrder.length;
        } 
        // Xử lý Trả tiền thuê
        else {
            const owner = findOwner(game, currentProperty);
            if (owner && owner.id !== currentPlayerId) {
                const rentAmount = currentProperty.rent;
                // Kiểm tra đủ tiền trả không
                if (currentPlayer.money < rentAmount) {
                    // Logic phá sản đơn giản: Trừ hết tiền đang có
                    owner.money += currentPlayer.money;
                    currentPlayer.money = 0;
                    replyMessage += `\n💸 **Bạn không đủ tiền trả!** Đã trả hết ${currentPlayer.money}$ cho ${owner.username}.`;
                } else {
                    currentPlayer.money -= rentAmount;
                    owner.money += rentAmount;
                    replyMessage += `\n💸 **Đã trả ${rentAmount}$** tiền thuê cho ${owner.username}.`;
                }
                
                game.diceRoll = null; // Tự động hết lượt sau khi trả tiền
                game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.turnOrder.length;
            }
        }
    }
    
    // Logic Buy
    else if (action === 'buy') {
        const propId = parseInt(propertyId);
        const property = game.board.find(p => p.id === propId);

        if (currentPlayer.money < property.price) {
             return interaction.followUp({ content: "❌ Bạn không đủ tiền!", flags: [MessageFlags.Ephemeral] });
        }
        
        currentPlayer.money -= property.price;
        currentPlayer.properties.add(propId);
        
        replyMessage = `🎉 Đã mua **${property.name}** thành công!`;
        
        game.diceRoll = null;
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.turnOrder.length;
    }

    // Logic End Turn
    else if (action === 'endturn') {
        game.diceRoll = null;
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.turnOrder.length;
        replyMessage = `Đã kết thúc lượt.`;
    }

    const { embeds, components } = buildGameInterface(game, replyMessage);
    await interaction.editReply({ embeds: embeds, components: components });
}


// --- HÀM KHỞI TẠO VÀ KẾT THÚC ---

function createNewGame(channel, players) {
    if (activeMonopolyGames.has(channel.id)) {
        return { success: false, message: 'Đã có một game đang diễn ra.' };
    }

    const game = {
        channelId: channel.id,
        players: new Map(players.map(p => [p.id, { 
            id: p.id, 
            username: p.username, 
            money: 1500,
            position: 1, 
            properties: new Set(),
            token: p.username.charAt(0).toUpperCase() // Lấy chữ cái đầu làm token
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