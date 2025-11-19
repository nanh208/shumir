const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SelectMenuBuilder, ComponentType, EmbedBuilder } = require('discord.js');
const { activeWerewolfGames } = require("./activeWerewolfGames.js"); 

// --- CẤU HÌNH VAI TRÒ THEO SỐ NGƯỜI & THỨ TỰ HÀNH ĐỘNG ĐÊM ---

// Cấu hình linh hoạt theo mode và số người chơi (ví dụ cho mode 'classic')
const ROLE_CONFIGS = {
    classic: {
        8: ['WEREWOLF', 'WEREWOLF', 'SEER', 'BODYGUARD', 'MAYOR', 'VILLAGER', 'VILLAGER', 'VILLAGER'],
        10: ['WEREWOLF', 'WEREWOLF', 'WEREWOLF', 'SEER', 'BODYGUARD', 'MAYOR', 'VILLAGER', 'VILLAGER', 'VILLAGER', 'VILLAGER'],
        12: ['WEREWOLF', 'WEREWOLF', 'WEREWOLF', 'SEER', 'BODYGUARD', 'MAYOR', 'VILLAGER', 'VILLAGER', 'VILLAGER', 'VILLAGER', 'VILLAGER', 'VILLAGER'],
    },
};

// --- HẰNG SỐ VAI TRÒ & THỜI GIAN ---
const ROLES = {
    // NIGHT_ORDER: 1 (ưu tiên cao nhất) -> 3 (ưu tiên thấp nhất)
    BODYGUARD: { name: "Bảo Vệ 🛡️", team: "Villager", description: "Mỗi đêm bảo vệ 1 người (không trùng lặp).", nightAbility: true, order: 30, NIGHT_ORDER: 1 }, // Ưu tiên 1
    SEER: { name: "Tiên Tri 🔮", team: "Villager", description: "Mỗi đêm kiểm tra phe của 1 người.", nightAbility: true, order: 20, NIGHT_ORDER: 2 }, // Ưu tiên 2
    WEREWOLF: { name: "Ma Sói 🐺", team: "Werewolf", description: "Mỗi đêm giết 1 người.", nightAbility: true, order: 10, NIGHT_ORDER: 3 }, // Ưu tiên 3
    MAYOR: { name: "Thị Trưởng 👑", team: "Villager", description: "Có 2 phiếu bầu và quyền quyết định trong trường hợp hòa.", nightAbility: false, order: 40 },
    VILLAGER: { name: "Dân Làng 🧑", team: "Villager", description: "Không có năng lực đặc biệt.", nightAbility: false, order: 99 },
};

const NIGHT_DURATION = 90 * 1000; 
const DAY_DISCUSSION_DURATION = 60 * 1000; 
const DAY_VOTE_DURATION = 5 * 60 * 1000; 

// --- CHIA VAI TRÒ (Sử dụng ROLE_CONFIGS) ---
/**
 * Giả lập logic chia vai trò dựa trên mode và số người.
 * @param {object} game - Đối tượng game.
 * @returns {Map<string, string> | null} - Map vai trò được gán hoặc null nếu không đủ người/không có config.
 */
function assignRoles(game) {
    // Khởi tạo/reset trạng thái bỏ phiếu cho game mới
    game.dayVoteCounts = {};
    game.lastProtectedId = null;
    game.threadId = null; 
    game.tieBreakerMessageId = null; 
    // Thêm mode vào game object nếu chưa có (mặc định là 'classic')
    game.mode = game.mode || 'classic'; 

    const config = ROLE_CONFIGS[game.mode]?.[game.players.size];
    
    // Kiểm tra cấu hình
    if (!config) {
        if (game.players.size < 8) {
            console.error(`Không đủ người chơi (min 8) hoặc không tìm thấy config cho ${game.players.size} người.`);
        } else {
            console.error(`Không tìm thấy cấu hình vai trò cho mode: ${game.mode}, người: ${game.players.size}`);
        }
        return null;
    }
    
    const rolesList = [...config]; // Sử dụng cấu hình từ ROLE_CONFIGS
    
    const shuffledRoles = rolesList.sort(() => Math.random() - 0.5);
    const assignedRoles = new Map();
    const playerIds = Array.from(game.players.keys());

    playerIds.forEach((id, index) => {
        assignedRoles.set(id, shuffledRoles[index]);
    });
    
    game.roles = assignedRoles;
    return assignedRoles;
}

// --- TIẾN TỚI ĐÊM MỚI (Giữ nguyên) ---
async function advanceToNight(game, client) {
    game.status = 'night';
    game.day += 1; 
    game.dayVotes.clear(); 
    game.nightActions.clear(); 
    game.currentVoteMessageId = null;
    game.dayVoteCounts = {}; 
    game.tieBreakerMessageId = null; 

    const channel = await client.channels.fetch(game.channelId);
    if (!channel) return;

    if (channel.guild.roles.everyone) {
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { SendMessages: false });
    }

    let thread = null;
    try {
        if (game.threadId) {
            thread = await client.channels.fetch(game.threadId);
        }
        if (!thread) {
            const threadName = `Ma Sói • Ngày ${game.day}`;
            thread = await channel.threads.create({ name: threadName, autoArchiveDuration: 1440, reason: 'Tạo thread cho game Ma Sói' }).catch(e => { throw e; });
            game.threadId = thread.id;
            await thread.send(`🔔 **Thread thông báo game** đã được tạo. Các thông báo ngày/đêm sẽ ở đây.`);
        } else {
            await thread.send(`🌑 **ĐÊM THỨ ${game.day} đã đến!** Kênh chat đã bị khóa. Kiểm tra DM để thực hiện hành động.`);
        }
    } catch (threadErr) {
        console.warn('Không thể tạo/truy cập thread:', threadErr.message);
        await channel.send(`🌑 **ĐÊM THỨ ${game.day} đã đến!** Kênh chat đã bị khóa. Kiểm tra DM để thực hiện hành động. (⚠️ Không thể tạo Thread)`);
    }

    handleNightActions(game, client);
}

// --- XỬ LÝ HÀNH ĐỘNG ĐÊM (Giữ nguyên) ---
async function handleNightActions(game, client) {
    const alivePlayers = Array.from(game.players.values()).filter(p => p.isAlive);
    
    const playerOptions = alivePlayers.map(p => ({
        label: p.username,
        value: p.id,
    }));
    
    for (const player of alivePlayers) {
        const roleKey = game.roles.get(player.id);
        const role = ROLES[roleKey];
        
        if (!role || !role.nightAbility) continue;

        try {
            const user = await client.users.fetch(player.id);
            
            let currentOptions = playerOptions;
            if (roleKey !== 'WEREWOLF') {
                currentOptions = playerOptions.filter(opt => opt.value !== player.id);
            }

            // Lọc người bị cấm bảo vệ nếu là Bodyguard
            if (roleKey === 'BODYGUARD' && game.lastProtectedId) {
                currentOptions = currentOptions.filter(opt => opt.value !== game.lastProtectedId);
            }

            if (currentOptions.length === 0) {
                await user.send({ content: `**${role.name}**! Đêm thứ ${game.day}. Bạn không có mục tiêu hợp lệ để chọn đêm nay.` });
                // Lưu hành động mặc định là không hành động
                game.nightActions.set(roleKey, { performerId: player.id, targetId: null, order: role.NIGHT_ORDER }); 
                continue;
            }

            const selectMenu = new SelectMenuBuilder()
                .setCustomId(`masoi_action_${game.channelId}_${roleKey}`)
                .setPlaceholder(`Chọn mục tiêu cho ${role.name}...`)
                .addOptions(currentOptions);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            
            let dmContent = `**${role.name}**! Đêm thứ ${game.day}. Vui lòng chọn mục tiêu của bạn.`;
            
            if (roleKey === 'BODYGUARD' && game.lastProtectedId) {
                dmContent += `\n*⚠️ Lưu ý: Bạn không thể bảo vệ <@${game.lastProtectedId}> đêm nay.*`;
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


// --- XỬ LÝ KẾT QUẢ ĐÊM (CÓ THỨ TỰ) ---
async function processNightResults(game, client) {
    // Lọc và sắp xếp hành động theo NIGHT_ORDER
    const orderedActions = Array.from(game.nightActions.values())
        .filter(action => action.targetId !== null)
        .sort((a, b) => {
            const roleA = ROLES[Array.from(game.roles.entries()).find(([, r]) => r === a.roleKey)?.[0]] || {};
            const roleB = ROLES[Array.from(game.roles.entries()).find(([, r]) => r === b.roleKey)?.[0]] || {};
            return (roleA.NIGHT_ORDER || 99) - (roleB.NIGHT_ORDER || 99);
        });

    let killedId = null;
    let protectedId = null; 
    let seerTargetId = null; 
    let seerPerformerId = null;

    // Duyệt qua hành động theo thứ tự ưu tiên
    for (const action of orderedActions) {
        const roleKey = Array.from(game.roles.entries()).find(([, r]) => r === action.roleKey)?.[1] || action.roleKey;
        
        // 1. Bảo Vệ (Ưu tiên 1)
        if (roleKey === 'BODYGUARD') {
            protectedId = action.targetId;
        }
        
        // 2. Tiên Tri (Ưu tiên 2) - Luôn xử lý nhưng kết quả gửi DM
        if (roleKey === 'SEER') {
            seerTargetId = action.targetId;
            seerPerformerId = action.performerId;
            // Gửi kết quả qua DM ngay lập tức (hoặc sau khi tất cả hành động được ghi lại)
        }
        
        // 3. Ma Sói (Ưu tiên 3)
        if (roleKey === 'WEREWOLF') {
            killedId = action.targetId;
        }
    }
    
    let message = "";
    const channel = await client.channels.fetch(game.channelId);
    let thread = game.threadId ? await client.channels.fetch(game.threadId).catch(() => null) : null;
    
    if (!channel) return;

    // Xử lý Tiên Tri (Gửi kết quả qua DM)
    if (seerTargetId && seerPerformerId) {
        const targetRoleKey = game.roles.get(seerTargetId);
        const targetTeam = ROLES[targetRoleKey]?.team || 'Unknown';
        try {
            const user = await client.users.fetch(seerPerformerId);
            await user.send(`🔮 Kết quả soi người chơi <@${seerTargetId}>: Họ thuộc phe **${targetTeam === 'Werewolf' ? 'Ma Sói' : 'Dân Làng'}**.`);
        } catch (e) { console.error('Lỗi gửi DM kết quả soi:', e); }
    }

    // Xử lý giết và bảo vệ
    let victim = null;
    if (killedId) {
        if (killedId === protectedId) {
            message += "🌟 Sáng nay không có ai chết! Có vẻ như một vị thần hộ mệnh đã bảo vệ nạn nhân!\n";
        } else {
            victim = game.players.get(killedId);
            if (victim && victim.isAlive) {
                const victimRole = game.roles.get(killedId);
                victim.isAlive = false;

                message += `💀 Tối qua, **<@${killedId}>** đã bị Ma Sói sát hại! Họ là **${ROLES[victimRole]?.name || 'Vai trò ẩn'}**.\n`;
            }
        }
    } else {
        message += "💤 Ma Sói đã không chọn mục tiêu nào đêm qua hoặc bị cản trở. Thật may mắn!\n";
    }

    // Cập nhật trạng thái game và mở kênh
    game.status = 'day';
    game.lastProtectedId = protectedId; 

    if (channel.guild.roles.everyone) {
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { SendMessages: true });
    }
    
    await channel.send(`☀️ **Bình Minh đã tới! Ngày thứ ${game.day} bắt đầu.**\n\n${message}`);
    if (thread) {
        await thread.send(`☀️ **Bình Minh đã tới!** Kẻ xấu số: ${victim ? `<@${victim.id}>` : 'Không có ai'}.`);
    }
    
    if (checkWinCondition(game, channel)) return;

    await startDay(game, client);
}

// --- BẮT ĐẦU GIAI ĐOẠN NGÀY (Thảo luận -> Vote) (Giữ nguyên) ---
async function startDay(game, client) {
    const channel = await client.channels.fetch(game.channelId);
    
    const discussionEmbed = new EmbedBuilder()
        .setTitle(`💬 Ngày ${game.day} Bắt Đầu: Thời Gian Thảo Luận`)
        .setDescription("Thời gian để thảo luận, đưa ra nghi ngờ và bảo vệ bản thân. Kênh chat đã được mở khóa.")
        .setFooter({ text: `⏱️ Thời gian thảo luận: ${DAY_DISCUSSION_DURATION / 1000} giây` }) 
        .setColor("#2ECC71");
        
    await channel.send({ embeds: [discussionEmbed] });
    
    await new Promise(resolve => setTimeout(resolve, DAY_DISCUSSION_DURATION)); 
    
    await channel.send("🗳️ **HẾT THỜI GIAN THẢO LUẬN!** Bắt đầu bỏ phiếu treo cổ. Sử dụng menu thả xuống!");
    await sendDayVoteOptions(game, channel);
}

// --- GỬI TÙY CHỌN BỎ PHIẾU TREO CỔ (SELECT MENU - ĐÃ CHUYỂN TỪ BUTTON) ---
async function sendDayVoteOptions(game, channel) {
    const alivePlayers = Array.from(game.players.values()).filter(p => p.isAlive);
    const totalAlive = alivePlayers.length;
    const neededVotes = Math.floor(totalAlive / 2) + 1;
    
    game.dayVotes = new Map();
    game.dayVoteCounts = {};

    let voteMessage = `🗳️ **THỜI GIAN BỎ PHIẾU TREO CỔ!**\n` +
                        `Thời gian còn lại: **${DAY_VOTE_DURATION / 60000} phút**.\n` +
                        `Cần **${neededVotes}** phiếu để treo cổ.`;
                        
    // Tạo options cho Select Menu
    const voteOptions = alivePlayers.map(p => ({
        label: p.username,
        value: p.id,
        description: `Bỏ phiếu treo cổ ${p.username}`
    }));
    
    const voteSelect = new SelectMenuBuilder()
        .setCustomId('masoi_day_vote_select') // ID chung
        .setPlaceholder('Chọn người chơi để bỏ phiếu...')
        .addOptions(voteOptions);
        
    const row = new ActionRowBuilder().addComponents(voteSelect);

    const voteMsg = await channel.send({ 
        content: voteMessage, 
        components: [row] // CHỈ GỬI SELECT MENU
    });
    
    game.currentVoteMessageId = voteMsg.id; 

    const initialEmbed = new EmbedBuilder()
        .setTitle('⚖️ Kết Quả Bỏ Phiếu Hiện Tại')
        .setColor('#FFA500')
        .setDescription(`Cần **${neededVotes}** phiếu để treo cổ một người chơi. (Tổng người còn sống: ${totalAlive})`)
        .addFields({ name: 'Chưa có phiếu bầu', value: 'Hãy bỏ phiếu bằng menu thả xuống!' });

    await voteMsg.edit({ embeds: [initialEmbed] });

    setTimeout(async () => {
        if (game.status === 'day') {
            const highestVotes = Math.max(...Object.values(game.dayVoteCounts), 0);
            if (highestVotes < neededVotes) {
                await endDayNoLynch(game, channel, voteMsg.client); 
            }
        }
    }, DAY_VOTE_DURATION);
}


// --- XỬ LÝ BỎ PHIẾU NGÀY (CŨNG DÙNG CHO SELECT MENU) ---
// *LƯU Ý*: Hàm này cần được gọi từ `interaction.isStringSelectMenu()` handler
async function processDayVote(game, voterId, targetId, client, interaction) {
    const channel = await client.channels.fetch(game.channelId);
    
    if (!game.players.has(voterId) || !game.players.get(voterId).isAlive) {
        return interaction.reply({ content: "❌ Bạn đã chết hoặc không tham gia game này.", ephemeral: true });
    }
    if (!game.players.has(targetId) || !game.players.get(targetId).isAlive) {
        return interaction.reply({ content: "❌ Người chơi này đã chết hoặc không có trong game.", ephemeral: true });
    }

    const voterRole = game.roles.get(voterId);
    const voteWeight = voterRole === 'MAYOR' ? 2 : 1; 

    const oldTargetId = game.dayVotes.get(voterId);
    
    // Logic: Vote là thay đổi phiếu, không có rút lại phiếu bằng cách chọn lại.
    // Nếu muốn rút lại phiếu, cần thêm một option đặc biệt "Không vote" vào Select Menu.
    
    if (oldTargetId === targetId) {
        // Nếu vote cùng người, bỏ qua hoặc gửi cảnh báo
        return interaction.reply({ content: `Bạn đã bỏ phiếu cho **<@${targetId}>** rồi.`, ephemeral: true });
    }

    // Nếu có phiếu cũ, giảm đếm
    if (oldTargetId) {
        game.dayVoteCounts[oldTargetId] = (game.dayVoteCounts[oldTargetId] || voteWeight) - voteWeight;
        if (game.dayVoteCounts[oldTargetId] < 0) game.dayVoteCounts[oldTargetId] = 0; 
    }
    
    // Lưu phiếu mới và tăng đếm
    game.dayVotes.set(voterId, targetId);
    game.dayVoteCounts[targetId] = (game.dayVoteCounts[targetId] || 0) + voteWeight;
    await interaction.reply({ content: `✅ Bạn đã bỏ phiếu cho **<@${targetId}>** (${voteWeight} phiếu).`, ephemeral: true });
    

    // --- Cập nhật kết quả bỏ phiếu và kiểm tra lynch (Giữ nguyên) ---
    const alivePlayers = Array.from(game.players.values()).filter(p => p.isAlive);
    const totalAlive = alivePlayers.length;
    const neededVotes = Math.floor(totalAlive / 2) + 1; 
    
    let highestVotes = 0;
    let highestVotedId = null;
    let tiedVotedIds = []; 

    for (const [id, count] of Object.entries(game.dayVoteCounts)) {
        if (count > highestVotes) {
            highestVotes = count;
            highestVotedId = id;
            tiedVotedIds = [id];
        } else if (count === highestVotes && highestVotes > 0) {
            tiedVotedIds.push(id);
        }
    }
    
    // 4. Cập nhật message bỏ phiếu (embed)
    const voteEmbed = new EmbedBuilder()
        .setTitle('⚖️ Kết Quả Bỏ Phiếu Hiện Tại')
        .setColor('#FFA500')
        .setDescription(`Cần **${neededVotes}** phiếu để treo cổ một người chơi.`);

    const sortedVotes = Object.entries(game.dayVoteCounts)
        .filter(([id]) => game.players.get(id)?.isAlive && game.dayVoteCounts[id] > 0)
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count);

    if (sortedVotes.length > 0) {
        const voteText = sortedVotes.map(vote => 
            `**<@${vote.id}>**: ${vote.count} phiếu`
        ).join('\n');
        
        voteEmbed.addFields({ name: `Danh sách phiếu bầu (Tổng người còn sống: ${totalAlive})`, value: voteText });
    } else {
        voteEmbed.addFields({ name: 'Chưa có phiếu bầu', value: 'Hãy bỏ phiếu!' });
    }
    
    if (game.currentVoteMessageId) {
        try {
            const voteMsg = await channel.messages.fetch(game.currentVoteMessageId);
            await voteMsg.edit({ embeds: [voteEmbed] });
        } catch (e) {
            console.error('Lỗi khi cập nhật message bỏ phiếu:', e);
        }
    }
    
    // 5. Kiểm tra đủ phiếu để treo cổ
    if (highestVotedId && highestVotes >= neededVotes) {
        
        if (tiedVotedIds.length > 1) {
            const mayorEntry = Array.from(game.roles.entries()).find(([, roleKey]) => roleKey === 'MAYOR');
            const mayorId = mayorEntry ? mayorEntry[0] : null;
            const mayorIsAlive = mayorId && game.players.get(mayorId)?.isAlive;

            if (mayorIsAlive) {
                await sendTieBreakerOptions(game, channel, tiedVotedIds, mayorId);
                return; 
            } else {
                await channel.send(`🗳️ **Vote Hòa!** Các ứng viên: ${tiedVotedIds.map(id => `<@${id}>`).join(', ')}. Do **Thị Trưởng đã chết** hoặc không có, không ai bị treo cổ. Mọi người được tha!`);
                await endDayNoLynch(game, channel, client); 
                return;
            }
        }

        // Trường hợp THẮNG TUYỆT ĐỐI (Logic cũ)
        const hangedId = highestVotedId;
        const hangedRoleKey = game.roles.get(hangedId);
        const hangedRole = ROLES[hangedRoleKey] || { name: 'Vai trò ẩn', team: 'Unknown' };

        if (game.players.has(hangedId)) {
            game.players.get(hangedId).isAlive = false;
        }
        
        await channel.send(
            `🔨 **Đã có đủ ${neededVotes} phiếu!** Người bị treo cổ là **<@${hangedId}>**!\n` +
            `😭 Họ là **${hangedRole.name}**. ` + 
            (hangedRole.team === 'Werewolf' ? 'MA SÓI ĐÃ BỊ LOẠI! 🎉' : 'DÂN LÀNG ĐÃ BỊ GIẾT NHẦM! 💔')
        );
        
        // Vô hiệu hóa Select Menu
        if (game.currentVoteMessageId) {
            try {
                const voteMsg = await channel.messages.fetch(game.currentVoteMessageId);
                const disabledComponents = voteMsg.components.map(row => {
                    const r = row.toJSON();
                    r.components = r.components.map(c => ({ ...c, disabled: true }));
                    return r;
                });
                voteEmbed.setDescription(`Người bị treo cổ: **<@${hangedId}>** - **${hangedRole.name}**.`);
                await voteMsg.edit({ embeds: [voteEmbed], components: disabledComponents }).catch(()=>{});
            } catch (err) {
                console.error('Lỗi khi vô hiệu hóa Select Menu:', err);
            }
        }
        
        game.dayVotes.clear(); 
        game.dayVoteCounts = {}; 

        if (!checkWinCondition(game, channel)) {
            await advanceToNight(game, client); 
        }

    }
}

// --- LOGIC GIẢI QUYẾT HÒA CỦA THỊ TRƯỞNG (THÊM NÚT 'THA') ---
async function sendTieBreakerOptions(game, channel, tiedVotedIds, mayorId) {
    
    // Vô hiệu hóa Select Menu cũ
    try {
        const voteMsg = await channel.messages.fetch(game.currentVoteMessageId);
        const disabledComponents = voteMsg.components.map(row => {
            const r = row.toJSON();
            r.components = r.components.map(c => ({ ...c, disabled: true }));
            return r;
        });
        await voteMsg.edit({ components: disabledComponents });
    } catch (e) {
        console.error('Lỗi vô hiệu hóa tin nhắn vote:', e);
    }
    
    const tieEmbed = new EmbedBuilder()
        .setTitle('⚡ Vote Hòa - Thị Trưởng Quyết Định!')
        .setDescription(`Các người chơi sau có cùng số phiếu cao nhất:\n${tiedVotedIds.map(id => `• <@${id}>`).join('\n')}\n\n👑 **Thị Trưởng** <@${mayorId}>: Hãy chọn người duy nhất bị treo cổ, **hoặc tha cho tất cả**.`)
        .setColor('#FFA500');

    // Nút "Tha cho tất cả" được thêm vào
    const tieRowComponents = tiedVotedIds.map(id => 
        new ButtonBuilder()
            .setCustomId(`masoi_mayor_${game.channelId}_${id}`) 
            .setLabel(game.players.get(id)?.username || id)
            .setStyle(ButtonStyle.Danger)
    );

    tieRowComponents.push(
        new ButtonBuilder()
            .setCustomId(`masoi_mayor_${game.channelId}_NO_LYNCH`) // ID đặc biệt cho "Tha"
            .setLabel('Tha cho tất cả (No Lynch)')
            .setStyle(ButtonStyle.Success)
    );
    
    const tieRow = new ActionRowBuilder().addComponents(tieRowComponents);
    
    const tieMsg = await channel.send({ 
        content: `👑 **CHỈ THỊ TRƯỞNG** <@${mayorId}> mới có thể quyết định!`, 
        embeds: [tieEmbed], 
        components: [tieRow] 
    });
    game.tieBreakerMessageId = tieMsg.id; 
}

/**
 * Xử lý hành động quyết định treo cổ của Thị Trưởng sau khi hòa (Xử lý NO_LYNCH).
 */
async function processMayorDecision(game, hangedId, client, interaction) {
    const channel = await client.channels.fetch(game.channelId);

    // Xử lý trường hợp "Tha cho tất cả"
    if (hangedId === 'NO_LYNCH') {
        await interaction.update({ 
            content: `👑 **THỊ TRƯỞNG ĐÃ QUYẾT ĐỊNH: THA CHO TẤT CẢ.**`,
            components: [] 
        });
        await channel.send(`⚖️ **QUYẾT ĐỊNH CUỐI CÙNG CỦA THỊ TRƯỞNG!** Không ai bị treo cổ ngày hôm nay!`);
        
        game.dayVotes.clear(); 
        game.dayVoteCounts = {}; 
        game.tieBreakerMessageId = null;

        if (!checkWinCondition(game, channel)) {
            await advanceToNight(game, client); 
        }
        return;
    }

    // Xử lý trường hợp treo cổ người chơi cụ thể
    if (game.players.has(hangedId)) {
        game.players.get(hangedId).isAlive = false;
    }
    
    const hangedRoleKey = game.roles.get(hangedId);
    const hangedRole = ROLES[hangedRoleKey] || { name: 'Vai trò ẩn', team: 'Unknown' };

    await interaction.update({ 
        content: `👑 **THỊ TRƯỞNG ĐÃ QUYẾT ĐỊNH!** Người bị treo cổ: **<@${hangedId}>**.`,
        components: [] 
    });
    
    await channel.send(
        `🔨 **QUYẾT ĐỊNH CUỐI CÙNG CỦA THỊ TRƯỞNG!** Người bị treo cổ là **<@${hangedId}>**!\n` +
        `😭 Họ là **${hangedRole.name}**. ` + 
        (hangedRole.team === 'Werewolf' ? 'MA SÓI ĐÃ BỊ LOẠI! 🎉' : 'DÂN LÀNG ĐÃ BỊ GIẾT NHẦM! 💔')
    );
    
    game.dayVotes.clear(); 
    game.dayVoteCounts = {}; 
    game.tieBreakerMessageId = null;

    if (!checkWinCondition(game, channel)) {
        await advanceToNight(game, client); 
    }
}


// --- CÁC HÀM KHÁC (Giữ nguyên) ---
function checkWinCondition(game, channel) {
    // ... (Giữ nguyên logic) ...
    const alivePlayers = Array.from(game.players.values()).filter(p => p.isAlive);
    const aliveRoles = alivePlayers.map(p => game.roles.get(p.id));
    
    const wolvesAlive = aliveRoles.filter(role => ROLES[role]?.team === 'Werewolf').length;
    const villagersAlive = aliveRoles.filter(role => ROLES[role]?.team === 'Villager').length;
    
    let winMessage = null;

    if (wolvesAlive === 0) {
        winMessage = "🎉 **CHIẾN THẮNG!** Toàn bộ Ma Sói đã bị tiêu diệt! **Phe Dân Làng** thắng cuộc!";
    } else if (wolvesAlive >= villagersAlive) {
        winMessage = "😭 **THẤT BẠI!** Ma Sói đã áp đảo Dân Làng! **Phe Ma Sói** thắng cuộc!";
    }

    if (winMessage) {
        game.status = 'finished';
        activeWerewolfGames.delete(game.channelId); 
        channel.send(`--- **TRÒ CHƠI KẾT THÚC** ---\n${winMessage}\n\n/masoi help để xem lại hướng dẫn!`);
        return true;
    }
    return false;
}

async function endDayNoLynch(game, channel, client) {
    if (game.status !== 'day' || !game.currentVoteMessageId) return;

    try {
        const voteMsg = await channel.messages.fetch(game.currentVoteMessageId);
        
        // Vô hiệu hóa tất cả các Select Menu
        const disabledComponents = voteMsg.components.map(row => {
            const r = row.toJSON();
            r.components = r.components.map(c => ({ ...c, disabled: true }));
            return r;
        });

        const noLynchEmbed = new EmbedBuilder()
            .setTitle('⏳ HẾT GIỜ BỎ PHIẾU!')
            .setColor('#4A4A4A')
            .setDescription('Thời gian đã hết! Không có người chơi nào đạt đủ số phiếu để bị treo cổ.');

        await channel.send('😴 **Buổi bỏ phiếu kết thúc.** Không có ai bị treo cổ. Đêm lại đến!');
        await voteMsg.edit({ embeds: [noLynchEmbed], components: disabledComponents });

    } catch (e) {
        console.error('Lỗi khi kết thúc ngày không lynch:', e);
    }
    
    if (!checkWinCondition(game, channel)) {
        await advanceToNight(game, client);
    }
}


// --- EXPORT CÁC HÀM ---
module.exports = {
    ROLES,
    assignRoles,
    advanceToNight,
    handleNightActions,
    processNightResults,
    checkWinCondition,
    sendDayVoteOptions,
    processDayVote,
    endDayNoLynch,
    startDay,
    sendTieBreakerOptions,
    processMayorDecision,
};