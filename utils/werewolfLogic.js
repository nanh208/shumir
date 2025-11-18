// utils/werewolfLogic.js
const { ActionRowBuilder, SelectMenuBuilder, ComponentType } = require('discord.js');
// Sửa đường dẫn: cùng thư mục nên dùng './'
const { activeWerewolfGames } = require("./activeWerewolfGames.js"); 

// --- HẰNG SỐ VAI TRÒ ---
const ROLES = {
    WEREWOLF: { name: "Ma Sói", team: "Werewolf", description: "Mỗi đêm giết 1 người.", nightAbility: true, order: 10 },
    SEER: { name: "Tiên Tri", team: "Villager", description: "Mỗi đêm kiểm tra vai 1 người.", nightAbility: true, order: 20 },
    BODYGUARD: { name: "Bảo Vệ", team: "Villager", description: "Mỗi đêm bảo vệ 1 người (không trùng lặp).", nightAbility: true, order: 30 },
    VILLAGER: { name: "Dân Làng", team: "Villager", description: "Không có năng lực.", nightAbility: false, order: 99 },
};

// --- CHIA VAI TRÒ ---
function assignRoles(game) {
    if (game.players.size < 8) return null;

    const rolesList = [];
    if (game.players.size >= 8) {
        rolesList.push('WEREWOLF', 'WEREWOLF', 'SEER', 'BODYGUARD');
        while (rolesList.length < game.players.size) {
            rolesList.push('VILLAGER');
        }
    }
    
    const shuffledRoles = rolesList.sort(() => Math.random() - 0.5);
    const assignedRoles = new Map();
    const playerIds = Array.from(game.players.keys());

    playerIds.forEach((id, index) => {
        assignedRoles.set(id, shuffledRoles[index]);
    });
    
    game.roles = assignedRoles;
    return assignedRoles;
}

// --- TIẾN TỚI ĐÊM MỚI ---
async function advanceToNight(game, client) {
    game.status = 'night';
    game.day += 1; 
    game.dayVotes.clear(); 
    game.nightActions.clear(); 

    const channel = await client.channels.fetch(game.channelId);

    await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { SendMessages: false });
    
    await channel.send(`🌑 **ĐÊM THỨ ${game.day} đã đến!** Kênh chat đã bị khóa. Kiểm tra DM để thực hiện hành động.`);

    handleNightActions(game, client);
}

// --- XỬ LÝ HÀNH ĐỘNG ĐÊM (Gửi DM Select Menu) ---
async function handleNightActions(game, client) {
    const alivePlayers = Array.from(game.players.values()).filter(p => p.isAlive);
    const NIGHT_DURATION = 90 * 1000;
    
    const playerOptions = alivePlayers.map(p => ({
        label: p.username,
        value: p.id,
    }));
    
    for (const player of alivePlayers) {
        const roleKey = game.roles.get(player.id);
        const role = ROLES[roleKey];
        
        if (!role.nightAbility) continue;

        try {
            const user = await client.users.fetch(player.id);
            const selectMenu = new SelectMenuBuilder()
                .setCustomId(`ww_action_${game.channelId}_${roleKey}`)
                .setPlaceholder(`Chọn mục tiêu cho ${role.name}...`)
                .addOptions(playerOptions);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            let dmContent = `**${role.name}**! Đêm thứ ${game.day}. Vui lòng chọn mục tiêu của bạn.`;
            
            if (roleKey === 'BODYGUARD' && game.lastProtectedId) {
                 dmContent += ` (Không được bảo vệ <@${game.lastProtectedId}>)`;
            }
            
            await user.send({
                content: dmContent,
                components: [row],
            });
        } catch (error) {
            console.error(`Không gửi được DM cho người chơi ${player.username}:`, error);
        }
    }
    
    setTimeout(async () => {
        if (game.status === 'night') {
             await processNightResults(game, client);
        }
    }, NIGHT_DURATION);
}


// --- XỬ LÝ KẾT QUẢ ĐÊM ---
async function processNightResults(game, client) {
    const actions = game.nightActions; 
    let killedId = actions.get('WEREWOLF')?.targetId; 
    let protectedId = actions.get('BODYGUARD')?.targetId; 
    let seerTargetId = actions.get('SEER')?.targetId; 
    let seerPerformerId = actions.get('SEER')?.performerId;

    let message = "";

    // 1. Xử lý Tiên Tri
    if (seerTargetId) {
        const targetRole = game.roles.get(seerTargetId);
        const targetUser = await client.users.fetch(seerPerformerId);
        await targetUser.send(`🔮 Kết quả soi vai người chơi <@${seerTargetId}>: Họ là **${ROLES[targetRole].team === 'Werewolf' ? 'Ma Sói' : 'Dân Làng'}**.`);
    }

    // 2. Xử lý giết và bảo vệ
    if (killedId) {
        if (killedId === protectedId) {
            message += "🌟 Sáng nay không có ai chết! Có vẻ như một vị thần hộ mệnh đã bảo vệ nạn nhân!\n";
        } else {
            const victimRole = game.roles.get(killedId);
            game.players.get(killedId).isAlive = false;

            message += `💀 Tối qua, **<@${killedId}>** đã bị Ma Sói sát hại! Họ là **${ROLES[victimRole].name}**.\n`;
        }
    } else {
         message += "💤 Ma Sói đã không chọn mục tiêu nào đêm qua. Thật may mắn!\n";
    }

    // 3. Chuyển sang Ngày và mở kênh
    game.status = 'day';
    game.lastProtectedId = protectedId; 

    const channel = await client.channels.fetch(game.channelId);
    await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { SendMessages: true });
    
    await channel.send(`☀️ **Bình Minh đã tới! Ngày thứ ${game.day} bắt đầu.**\n\n${message}\n\n` +
                       `🗣️ Hãy thảo luận và tìm ra ai là Ma Sói! Gõ **/masoi vote @người_chơi** để bỏ phiếu treo cổ.`);
                       
    // 4. Kiểm tra điều kiện thắng
    checkWinCondition(game, channel);
}

// --- KIỂM TRA ĐIỀU KIỆN THẮNG ---
function checkWinCondition(game, channel) {
    const alivePlayers = Array.from(game.players.values()).filter(p => p.isAlive);
    const aliveRoles = alivePlayers.map(p => game.roles.get(p.id));
    
    const wolvesAlive = aliveRoles.filter(role => ROLES[role].team === 'Werewolf').length;
    const villagersAlive = aliveRoles.filter(role => ROLES[role].team === 'Villager').length;
    
    let winMessage = null;

    if (wolvesAlive === 0) {
        winMessage = "🎉 **CHIẾN THẮNG!** Toàn bộ Ma Sói đã bị tiêu diệt! **Phe Dân Làng** thắng cuộc!";
    } else if (wolvesAlive >= villagersAlive) {
        winMessage = "😭 **THẤT BẠI!** Ma Sói đã áp đảo Dân Làng! **Phe Ma Sói** thắng cuộc!";
    }

    if (winMessage) {
        game.status = 'finished';
        activeWerewolfGames.delete(game.channelId); 
        channel.send(`--- **TRÒ CHƠI KẾT THÚC** ---\n${winMessage}`);
        return true;
    }
    return false;
}


// --- EXPORT CÁC HÀM ---
module.exports = {
    ROLES,
    assignRoles,
    advanceToNight,
    handleNightActions,
    processNightResults,
    checkWinCondition,
};