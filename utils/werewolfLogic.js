const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SelectMenuBuilder, ComponentType, EmbedBuilder } = require('discord.js');
// Sửa đường dẫn: cùng thư mục nên dùng './'
const { activeWerewolfGames } = require("./activeWerewolfGames.js"); 

// --- HẰNG SỐ VAI TRÒ & THỜI GIAN ---
const ROLES = {
    // Thêm nightAbility: true cho các vai trò có hành động đêm
    WEREWOLF: { name: "Ma Sói 🐺", team: "Werewolf", description: "Mỗi đêm giết 1 người.", nightAbility: true, order: 10 },
    SEER: { name: "Tiên Tri 🔮", team: "Villager", description: "Mỗi đêm kiểm tra phe của 1 người.", nightAbility: true, order: 20 },
    BODYGUARD: { name: "Bảo Vệ 🛡️", team: "Villager", description: "Mỗi đêm bảo vệ 1 người (không trùng lặp).", nightAbility: true, order: 30 },
    MAYOR: { name: "Thị Trưởng 👑", team: "Villager", description: "Có 2 phiếu bầu và quyền quyết định trong trường hợp hòa.", nightAbility: false, order: 40 }, // Vai trò MỚI
    VILLAGER: { name: "Dân Làng 🧑", team: "Villager", description: "Không có năng lực đặc biệt.", nightAbility: false, order: 99 },
};

const NIGHT_DURATION = 90 * 1000; // 90 giây cho đêm
// ĐÃ SỬA: 60 giây cho thảo luận theo yêu cầu
const DAY_DISCUSSION_DURATION = 60 * 1000; 
const DAY_VOTE_DURATION = 5 * 60 * 1000; // 5 phút cho bỏ phiếu ngày

// --- CHIA VAI TRÒ ---
/**
 * Giả lập logic chia vai trò đơn giản.
 * @param {object} game - Đối tượng game.
 * @returns {Map<string, string> | null} - Map vai trò được gán hoặc null nếu không đủ người.
 */
function assignRoles(game) {
    // Khởi tạo/reset trạng thái bỏ phiếu cho game mới
    game.dayVoteCounts = {};
    game.lastProtectedId = null;
    game.threadId = null; // Reset thread ID
    game.tieBreakerMessageId = null; // Reset message ID quyết định của Thị Trưởng

    if (game.players.size < 8) return null;

    const rolesList = [];
    // Phân bổ vai trò (2 Sói, 1 Tiên Tri, 1 Bảo Vệ, 1 Thị Trưởng, còn lại Dân)
    rolesList.push('WEREWOLF', 'WEREWOLF', 'SEER', 'BODYGUARD', 'MAYOR');
    while (rolesList.length < game.players.size) {
        rolesList.push('VILLAGER');
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
/**
 * Chuyển trạng thái game sang Đêm mới và khóa kênh chat.
 * @param {object} game - Đối tượng game.
 * @param {Client} client - Discord client.
 */
async function advanceToNight(game, client) {
    game.status = 'night';
    game.day += 1; 
    game.dayVotes.clear(); 
    game.nightActions.clear(); 
    game.currentVoteMessageId = null;
    game.dayVoteCounts = {}; // Xóa đếm phiếu
    game.tieBreakerMessageId = null; // Reset message ID quyết định của Thị Trưởng

    const channel = await client.channels.fetch(game.channelId);
    if (!channel) return;

    // Khóa kênh chat
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

    // Gửi DM hành động
    handleNightActions(game, client);
}

// --- XỬ LÝ HÀNH ĐỘNG ĐÊM (Gửi DM Select Menu) ---
/**
 * Gửi Select Menu hành động đêm cho các vai trò có năng lực.
 * @param {object} game - Đối tượng game.
 * @param {Client} client - Discord client.
 */
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
    
    // Thiết lập bộ đếm giờ cho đêm
    setTimeout(async () => {
        // Chỉ xử lý kết quả đêm nếu game vẫn đang ở trạng thái night
        if (game.status === 'night') {
            await processNightResults(game, client);
        }
    }, NIGHT_DURATION);
}


// --- XỬ LÝ KẾT QUẢ ĐÊM ---
/**
 * Xử lý tất cả các hành động đêm sau khi hết thời gian và chuyển sang Ngày.
 * @param {object} game - Đối tượng game.
 * @param {Client} client - Discord client.
 */
async function processNightResults(game, client) {
    const actions = game.nightActions; 
    let killedId = actions.get('WEREWOLF')?.targetId; 
    let protectedId = actions.get('BODYGUARD')?.targetId; 
    let seerTargetId = actions.get('SEER')?.targetId; 
    let seerPerformerId = actions.get('SEER')?.performerId;

    let message = "";
    const channel = await client.channels.fetch(game.channelId);
    let thread = game.threadId ? await client.channels.fetch(game.threadId).catch(() => null) : null;
    
    if (!channel) return;

    // 1. Xử lý Tiên Tri (Gửi kết quả qua DM)
    if (seerTargetId && seerPerformerId) {
        const targetRoleKey = game.roles.get(seerTargetId);
        const targetTeam = ROLES[targetRoleKey]?.team || 'Unknown';
        try {
            const user = await client.users.fetch(seerPerformerId);
            await user.send(`🔮 Kết quả soi người chơi <@${seerTargetId}>: Họ thuộc phe **${targetTeam === 'Werewolf' ? 'Ma Sói' : 'Dân Làng'}**.`);
        } catch (e) { console.error('Lỗi gửi DM kết quả soi:', e); }
    }

    // 2. Xử lý giết và bảo vệ
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

    // 3. Cập nhật trạng thái game và mở kênh
    game.status = 'day';
    game.lastProtectedId = protectedId; // Lưu lại người được bảo vệ lần trước (dùng cho Bodyguard)

    // Mở khóa kênh chat
    if (channel.guild.roles.everyone) {
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { SendMessages: true });
    }
    
    // Gửi thông báo bình minh
    await channel.send(`☀️ **Bình Minh đã tới! Ngày thứ ${game.day} bắt đầu.**\n\n${message}`);
    if (thread) {
        await thread.send(`☀️ **Bình Minh đã tới!** Kẻ xấu số: ${victim ? `<@${victim.id}>` : 'Không có ai'}.`);
    }
    
    // 4. Kiểm tra điều kiện thắng
    if (checkWinCondition(game, channel)) return;

    // 5. Bắt đầu giai đoạn Thảo luận/Vote
    await startDay(game, client);
}

// --- BẮT ĐẦU GIAI ĐOẠN NGÀY (Thảo luận -> Vote) ---
/**
 * Bắt đầu giai đoạn ngày, bao gồm Thảo luận và sau đó là Vote Treo cổ.
 * @param {object} game - Đối tượng game.
 * @param {Client} client - Discord client.
 */
async function startDay(game, client) {
    const channel = await client.channels.fetch(game.channelId);
    
    // Giai đoạn 1: THẢO LUẬN
    const discussionEmbed = new EmbedBuilder()
        .setTitle(`💬 Ngày ${game.day} Bắt Đầu: Thời Gian Thảo Luận`)
        .setDescription("Thời gian để thảo luận, đưa ra nghi ngờ và bảo vệ bản thân. Kênh chat đã được mở khóa.")
        .setFooter({ text: `⏱️ Thời gian thảo luận: ${DAY_DISCUSSION_DURATION / 1000} giây` }) 
        .setColor("#2ECC71");
        
    await channel.send({ embeds: [discussionEmbed] });
    
    // Chờ hết thời gian Thảo luận
    await new Promise(resolve => setTimeout(resolve, DAY_DISCUSSION_DURATION)); 
    
    // Giai đoạn 2: BỎ PHIẾU TREO CỔ
    await channel.send("🗳️ **HẾT THỜI GIAN THẢO LUẬN!** Bắt đầu bỏ phiếu treo cổ. Sử dụng các nút bên dưới!");
    await sendDayVoteOptions(game, channel);
}

// --- GỬI TÙY CHỌN BỎ PHIẾU TREO CỔ (BUTTON) ---
/**
 * Gửi message với các nút cho phép người chơi bỏ phiếu treo cổ.
 * @param {object} game - Đối tượng game.
 * @param {Channel} channel - Kênh game.
 */
async function sendDayVoteOptions(game, channel) {
    const alivePlayers = Array.from(game.players.values()).filter(p => p.isAlive);
    const totalAlive = alivePlayers.length;
    const neededVotes = Math.floor(totalAlive / 2) + 1;
    
    // Reset phiếu bầu cho ngày mới
    game.dayVotes = new Map();
    game.dayVoteCounts = {};

    let voteMessage = `🗳️ **THỜI GIAN BỎ PHIẾU TREO CỔ!**\n` +
                        `Thời gian còn lại: **${DAY_VOTE_DURATION / 60000} phút**.\n` +
                        `Cần **${neededVotes}** phiếu để treo cổ.`;

    const playerButtons = alivePlayers.map(p => 
        new ButtonBuilder()
            .setCustomId(`masoi_day_vote_${p.id}`) // masoi_day_vote_<targetId>
            .setLabel(p.username)
            .setStyle(ButtonStyle.Secondary)
    );

    const rows = [];
    // Chia nút thành các hàng (mỗi hàng tối đa 5 nút)
    for (let i = 0; i < playerButtons.length; i += 5) {
        const row = new ActionRowBuilder().addComponents(playerButtons.slice(i, i + 5));
        rows.push(row);
    }
    
    // Gửi message và lưu ID để cập nhật số phiếu
    const voteMsg = await channel.send({ 
        content: voteMessage, 
        components: rows 
    });
    
    // Lưu ID của message bỏ phiếu vào game state để cập nhật sau
    game.currentVoteMessageId = voteMsg.id; 
    
    const initialEmbed = new EmbedBuilder()
        .setTitle('⚖️ Kết Quả Bỏ Phiếu Hiện Tại')
        .setColor('#FFA500')
        .setDescription(`Cần **${neededVotes}** phiếu để treo cổ một người chơi. (Tổng người còn sống: ${totalAlive})`)
        .addFields({ name: 'Chưa có phiếu bầu', value: 'Hãy bỏ phiếu bằng các nút bên trên!' });

    await voteMsg.edit({ embeds: [initialEmbed] });


    // Thiết lập bộ đếm giờ kết thúc Ngày nếu không đủ phiếu treo cổ
    setTimeout(async () => {
        // Chỉ chạy nếu game vẫn đang ở trạng thái 'day'
        if (game.status === 'day') {
            const highestVotes = Math.max(...Object.values(game.dayVoteCounts), 0);
            if (highestVotes < neededVotes) {
                // Nếu số phiếu cao nhất không đạt ngưỡng, kết thúc ngày
                await endDayNoLynch(game, channel, voteMsg.client); 
            }
        }
    }, DAY_VOTE_DURATION);
}


// --- XỬ LÝ BỎ PHIẾU NGÀY (BUTTON INTERACTION) ---
/**
 * Xử lý khi một người chơi bỏ phiếu treo cổ bằng nút.
 * @param {object} game - Đối tượng game.
 * @param {string} voterId - ID của người bỏ phiếu.
 * @param {string} targetId - ID của người bị bỏ phiếu.
 * @param {Client} client - Discord client.
 * @param {Interaction} interaction - Tương tác button.
 */
async function processDayVote(game, voterId, targetId, client, interaction) {
    const channel = await client.channels.fetch(game.channelId);
    
    // 1. Kiểm tra tính hợp lệ của người bỏ phiếu và mục tiêu
    if (!game.players.has(voterId) || !game.players.get(voterId).isAlive) {
        return interaction.reply({ content: "❌ Bạn đã chết hoặc không tham gia game này.", ephemeral: true });
    }
    if (!game.players.has(targetId) || !game.players.get(targetId).isAlive) {
        // Điều này không nên xảy ra nếu nút được tạo đúng
        return interaction.reply({ content: "❌ Người chơi này đã chết hoặc không có trong game.", ephemeral: true });
    }

    const voterRole = game.roles.get(voterId);
    const voteWeight = voterRole === 'MAYOR' ? 2 : 1; // Thị Trưởng có 2 phiếu

    // 2. Lưu phiếu bầu
    const oldTargetId = game.dayVotes.get(voterId);
    
    // Nếu người chơi bỏ phiếu cho cùng một người, bỏ phiếu bị hủy (tức là rút lại phiếu)
    if (oldTargetId === targetId) {
        game.dayVoteCounts[oldTargetId] = (game.dayVoteCounts[oldTargetId] || voteWeight) - voteWeight;
        if (game.dayVoteCounts[oldTargetId] < 0) game.dayVoteCounts[oldTargetId] = 0; 
        game.dayVotes.delete(voterId);
        await interaction.reply({ content: `✅ Bạn đã **rút lại** phiếu bầu cho **<@${targetId}>**.`, ephemeral: true });
    } else {
        // Nếu có phiếu cũ, giảm đếm
        if (oldTargetId) {
            game.dayVoteCounts[oldTargetId] = (game.dayVoteCounts[oldTargetId] || voteWeight) - voteWeight;
            if (game.dayVoteCounts[oldTargetId] < 0) game.dayVoteCounts[oldTargetId] = 0; 
        }
        
        // Lưu phiếu mới và tăng đếm
        game.dayVotes.set(voterId, targetId);
        game.dayVoteCounts[targetId] = (game.dayVoteCounts[targetId] || 0) + voteWeight;
        await interaction.reply({ content: `✅ Bạn đã bỏ phiếu cho **<@${targetId}>** (${voteWeight} phiếu).`, ephemeral: true });
    }

    // 3. Chuẩn bị dữ liệu kiểm tra lynch
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

    // Lọc ra người chơi còn sống đang có phiếu bầu 
    const sortedVotes = Object.entries(game.dayVoteCounts)
        .filter(([id]) => game.players.get(id)?.isAlive && game.dayVoteCounts[id] > 0) // Chỉ hiển thị người còn sống và có phiếu > 0
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
            // Trường hợp hòa -> GỌI THỊ TRƯỞNG QUYẾT ĐỊNH
            const mayorEntry = Array.from(game.roles.entries()).find(([, roleKey]) => roleKey === 'MAYOR');
            const mayorId = mayorEntry ? mayorEntry[0] : null;
            const mayorIsAlive = mayorId && game.players.get(mayorId)?.isAlive;

            if (mayorIsAlive) {
                // Gửi tùy chọn quyết định cho Thị Trưởng
                await sendTieBreakerOptions(game, channel, tiedVotedIds, mayorId);
                return; // Dừng processDayVote, chờ quyết định của Thị Trưởng
            } else {
                // Không có Thị Trưởng còn sống hoặc không có Thị Trưởng
                await channel.send(`🗳️ **Vote Hòa!** Các ứng viên: ${tiedVotedIds.map(id => `<@${id}>`).join(', ')}. Do **Thị Trưởng đã chết** hoặc không có, không ai bị treo cổ. Mọi người được tha!`);
                await endDayNoLynch(game, channel, client); 
                return;
            }
        }

        // Trường hợp THẮNG TUYỆT ĐỐI (Logic cũ)
        const hangedId = highestVotedId;
        const hangedRoleKey = game.roles.get(hangedId);
        const hangedRole = ROLES[hangedRoleKey] || { name: 'Vai trò ẩn', team: 'Unknown' };

        // Cập nhật trạng thái người chơi
        if (game.players.has(hangedId)) {
            game.players.get(hangedId).isAlive = false;
        }
        
        await channel.send(
            `🔨 **Đã có đủ ${neededVotes} phiếu!** Người bị treo cổ là **<@${hangedId}>**!\n` +
            `😭 Họ là **${hangedRole.name}**. ` + 
            (hangedRole.team === 'Werewolf' ? 'MA SÓI ĐÃ BỊ LOẠI! 🎉' : 'DÂN LÀNG ĐÃ BỊ GIẾT NHẦM! 💔')
        );
        
        // Vô hiệu hóa nút bỏ phiếu
        if (game.currentVoteMessageId) {
            try {
                const voteMsg = await channel.messages.fetch(game.currentVoteMessageId);
                const disabledComponents = voteMsg.components.map(row => {
                    const r = row.toJSON();
                    r.components = r.components.map(c => ({
                           ...c,
                           disabled: true,
                           style: (c.custom_id && String(c.custom_id).endsWith(hangedId)) ? ButtonStyle.Danger : ButtonStyle.Secondary
                    }));
                    return r;
                });
                voteEmbed.setDescription(`Người bị treo cổ: **<@${hangedId}>** - **${hangedRole.name}**.`);
                await voteMsg.edit({ embeds: [voteEmbed], components: disabledComponents }).catch(()=>{});
            } catch (err) {
                console.error('Lỗi khi vô hiệu hóa nút bỏ phiếu:', err);
            }
        }
        
        // 6. Kết thúc Ngày và chuyển sang Đêm
        game.dayVotes.clear(); 
        game.dayVoteCounts = {}; 

        // Kiểm tra thắng thua
        if (!checkWinCondition(game, channel)) {
            await advanceToNight(game, client); 
        }

    }
}

// --- LOGIC GIẢI QUYẾT HÒA CỦA THỊ TRƯỞNG ---

/**
 * Gửi tùy chọn quyết định cho Thị Trưởng khi xảy ra hòa.
 * @param {object} game - Đối tượng game.
 * @param {Channel} channel - Kênh game.
 * @param {string[]} tiedVotedIds - Mảng ID người bị hòa phiếu.
 * @param {string} mayorId - ID của Thị Trưởng.
 */
async function sendTieBreakerOptions(game, channel, tiedVotedIds, mayorId) {
    
    // Vô hiệu hóa nút bỏ phiếu cũ để không ai vote nữa
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
        .setDescription(`Các người chơi sau có cùng số phiếu cao nhất:\n${tiedVotedIds.map(id => `• <@${id}>`).join('\n')}\n\n👑 **Thị Trưởng** <@${mayorId}>: Hãy chọn người duy nhất bị treo cổ.`)
        .setColor('#FFA500');

    const tieRow = new ActionRowBuilder().addComponents(
        tiedVotedIds.map(id => 
            new ButtonBuilder()
                // customId: masoi_mayor_tie_<channelId>_<targetId>
                // ĐÃ SỬA: Thêm channelId vào customId để xử lý trong component handler
                .setCustomId(`masoi_mayor_${game.channelId}_${id}`) 
                .setLabel(game.players.get(id)?.username || id)
                .setStyle(ButtonStyle.Danger)
        )
    );
    
    // Gửi tin nhắn quyết định cho Thị Trưởng
    const tieMsg = await channel.send({ 
        content: `👑 **CHỈ THỊ TRƯỞNG** <@${mayorId}> mới có thể quyết định!`, 
        embeds: [tieEmbed], 
        components: [tieRow] 
    });
    game.tieBreakerMessageId = tieMsg.id; // Lưu ID để xử lý tương tác
}

/**
 * Xử lý hành động quyết định treo cổ của Thị Trưởng sau khi hòa.
 * @param {object} game - Đối tượng game.
 * @param {string} hangedId - ID người bị Thị Trưởng chọn treo cổ.
 * @param {Client} client - Discord client.
 * @param {Interaction} interaction - Tương tác button.
 */
async function processMayorDecision(game, hangedId, client, interaction) {
    const channel = await client.channels.fetch(game.channelId);
    
    // 1. Cập nhật trạng thái người chơi
    if (game.players.has(hangedId)) {
        game.players.get(hangedId).isAlive = false;
    }
    
    const hangedRoleKey = game.roles.get(hangedId);
    const hangedRole = ROLES[hangedRoleKey] || { name: 'Vai trò ẩn', team: 'Unknown' };

    // 2. Vô hiệu hóa nút quyết định của Thị Trưởng
    await interaction.update({ 
        content: `👑 **THỊ TRƯỞNG ĐÃ QUYẾT ĐỊNH!** Người bị treo cổ: **<@${hangedId}>**.`,
        components: [] 
    });
    
    // 3. Thông báo kết quả
    await channel.send(
        `🔨 **QUYẾT ĐỊNH CUỐI CÙNG CỦA THỊ TRƯỞNG!** Người bị treo cổ là **<@${hangedId}>**!\n` +
        `😭 Họ là **${hangedRole.name}**. ` + 
        (hangedRole.team === 'Werewolf' ? 'MA SÓI ĐÃ BỊ LOẠI! 🎉' : 'DÂN LÀNG ĐÃ BỊ GIẾT NHẦM! 💔')
    );
    
    // 4. Reset trạng thái
    game.dayVotes.clear(); 
    game.dayVoteCounts = {}; 
    game.tieBreakerMessageId = null;

    // 5. Kiểm tra thắng thua và chuyển đêm
    if (!checkWinCondition(game, channel)) {
        await advanceToNight(game, client); 
    }
}


// --- KIỂM TRA ĐIỀU KIỆN THẮNG ---
/**
 * Kiểm tra điều kiện thắng thua và thông báo kết thúc game.
 * @param {object} game - Đối tượng game.
 * @param {Channel} channel - Kênh game.
 * @returns {boolean} - true nếu game kết thúc.
 */
function checkWinCondition(game, channel) {
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

/**
 * Vô hiệu hóa các nút bỏ phiếu và chuyển sang đêm mới.
 * Sử dụng khi hết giờ hoặc có hòa mà không lynch được ai.
 * @param {object} game - Đối tượng game.
 * @param {Channel} channel - Kênh game.
 * @param {Client} client - Discord client.
 */
async function endDayNoLynch(game, channel, client) {
    if (game.status !== 'day' || !game.currentVoteMessageId) return;

    try {
        const voteMsg = await channel.messages.fetch(game.currentVoteMessageId);
        
        // Vô hiệu hóa tất cả các nút
        const disabledComponents = voteMsg.components.map(row => {
            const r = row.toJSON();
            r.components = r.components.map(c => ({ ...c, disabled: true, style: ButtonStyle.Secondary }));
            return r;
        });

        const noLynchEmbed = new EmbedBuilder()
            .setTitle('⏳ HẾT GIỜ BỎ PHIẾU!')
            .setColor('#4A4A4A')
            .setDescription('Thời gian đã hết! Không có người chơi nào đạt đủ số phiếu để bị treo cổ.');

        // Gửi thông báo kết thúc ngày
        await channel.send('😴 **Buổi bỏ phiếu kết thúc.** Không có ai bị treo cổ. Đêm lại đến!');
        await voteMsg.edit({ embeds: [noLynchEmbed], components: disabledComponents });

    } catch (e) {
        console.error('Lỗi khi kết thúc ngày không lynch:', e);
    }
    
    // Kiểm tra lại lần cuối trước khi chuyển đêm
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
    // Hàm mới được export:
    startDay,
    sendTieBreakerOptions,
    processMayorDecision,
};