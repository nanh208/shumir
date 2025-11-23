import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags 
} from 'discord.js';

import { Database } from './Database.mjs';
import { POKEBALLS, RARITY_CONFIG } from './Constants.mjs';
import { removePetFromWorld, activeBattles, calculateCatchRate } from './BattleManager.mjs';
function calculateLocalCatchRate(wildPet) {
    const maxHP = wildPet.getStats().HP;
    const currentHP = wildPet.currentHP;
    const rarityInfo = RARITY_CONFIG[wildPet.rarity];
    
    // 1. Tỷ lệ cơ bản theo độ hiếm (Đã chỉnh thấp trong Constants)
    let baseRate = rarityInfo ? rarityInfo.ballRate : 0.1;

    // 2. Bonus theo % Máu đã mất:
    // - Đầy máu (100%): Bonus = 0
    // - Gần chết (1%): Bonus = ~1.0 (Tăng gấp đôi tỷ lệ cơ bản)
    const hpPercent = currentHP / maxHP;
    const hpBonus = (1 - hpPercent); 

    // 3. Công thức: Base * (1 + Bonus Máu * 2)
    // Ví dụ: Mythic (0.02)
    // - Đầy máu: 0.02 * 1 = 2%
    // - 1 Máu: 0.02 * (1 + 1*2) = 0.06 = 6%
    let finalBase = baseRate * (1 + (hpBonus * 2));

    return finalBase;
}
// Hàm hỗ trợ update UI an toàn (Tránh lỗi InteractionNotReplied)
async function safeReply(interaction, payload) {
    try {
        // 1. Nếu đã Defer hoặc đã Reply trước đó -> Bắt buộc dùng editReply
        if (interaction.deferred || interaction.replied) {
            return await interaction.editReply(payload);
        }
        // 2. Nếu chưa, thử Update (cho nút bấm)
        return await interaction.update(payload);
    } catch (e) {
        // 3. Nếu lỗi 40060 (Đã acknowledged ở đâu đó mà biến chưa cập nhật)
        // -> Chuyển sang editReply ngay lập tức
        if (e.code === 40060 || e.code === 'InteractionAlreadyReplied') {
            try {
                return await interaction.editReply(payload);
            } catch (err2) {
                // Nếu vẫn lỗi thì bỏ qua (Interaction có thể đã hết hạn)
                console.error("SafeReply Recover Failed:", err2.message);
            }
        } else if (e.code !== 10062) { // 10062 là lỗi Unknown Interaction (hết hạn), bỏ qua
            console.error("CatchSystem UI Error:", e.message);
        }
    }
}

// ==========================================
// 1. HIỂN THỊ GIAO DIỆN CHỌN BÓNG
// ==========================================
export async function showCatchBallInterface(interaction, battle) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const { wildPet, playerPet } = battle;

    // Tính tỷ lệ bắt cơ bản từ BattleManager (Vẫn tính toán nhưng không hiển thị)
    const baseRate = calculateCatchRate(playerPet, wildPet);

    const embed = new EmbedBuilder()
        .setTitle(`🎒 TÚI BÓNG THU PHỤC`)
        .setDescription(`Mục tiêu: **${wildPet.name}** (Lv.${wildPet.level})\n` +
                        `HP Địch: **${Math.round(wildPet.currentHP)}/${wildPet.getStats().HP}**\n\n` +
                        `*Hãy chọn loại bóng để ném:*`)
        .setColor(0x00AE86);

    const row = new ActionRowBuilder();
    let hasBalls = false;

    // Đảm bảo inventory tồn tại
    if (!userData.inventory.pokeballs) userData.inventory.pokeballs = {};
    
    // Duyệt qua danh sách bóng trong Constants
    for (const [key, ballInfo] of Object.entries(POKEBALLS)) {
        const qty = userData.inventory.pokeballs[key] || 0;
        
        // [FIX LỖI NaN]: Dùng 'multiplier' thay vì 'rate'
        const multiplier = ballInfo.multiplier || 1.0;
        
        // Tính tỷ lệ (Vẫn giữ logic tính để code không lỗi, nhưng không dùng hiển thị)
        let ratePercent = Math.min(baseRate * multiplier, 1.0) * 100;

        // Nút bấm chọn bóng
        // CẬP NHẬT: Đã xóa phần hiển thị % trong setLabel
        const btn = new ButtonBuilder()
            .setCustomId(`ball_${key}_${userId}`)
            .setLabel(`${ballInfo.name} (${qty})`) 
            .setStyle(ballInfo.style || ButtonStyle.Secondary)
            .setDisabled(qty <= 0);

        if (ballInfo.icon) btn.setEmoji(ballInfo.icon);

        // Nếu có bóng thì active biến cờ
        if (qty > 0) hasBalls = true;

        row.addComponents(btn);
    }

    if (!hasBalls) {
        embed.setFooter({ text: "⚠️ Bạn đã hết sạch bóng! Hãy mua thêm trong Shop." });
    }

    // Nút Quay lại / Hủy
    const rowCancel = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`btn_cancel_catch_${userId}`)
            .setLabel('Quay lại trận đấu')
            .setStyle(ButtonStyle.Danger)
    );

    // Nếu row bóng quá dài (>5 nút), Discord sẽ lỗi. 
    // Ở đây giả sử có tối đa 5 loại bóng. Nếu nhiều hơn cần chia row.
    const components = [row, rowCancel];
    
    // [FIX LỖI INTERACTION]: Dùng hàm safeReply
    await safeReply(interaction, { embeds: [embed], components: components });
}

// ==========================================
// 2. XỬ LÝ HÀNH ĐỘNG NÉM BÓNG
// ==========================================
export async function handleCatchAction(interaction, battle) {
    const userId = interaction.user.id;
    const { customId } = interaction;
    
    // Parse: ball_poke_userId
    const parts = customId.split('_');
    const ballType = parts[1]; 
    
    const userData = Database.getUser(userId);
    const ballConfig = POKEBALLS[ballType];

    // Kiểm tra dữ liệu an toàn
    if (!ballConfig) {
        return safeReply(interaction, { content: "❌ Loại bóng không hợp lệ.", flags: [MessageFlags.Ephemeral] });
    }

    // Kiểm tra số lượng bóng
    if (!userData.inventory.pokeballs[ballType] || userData.inventory.pokeballs[ballType] <= 0) {
        // Nếu hết bóng mà lỡ bấm, quay lại giao diện chọn
        return showCatchBallInterface(interaction, battle);
    }

    // --- TRỪ BÓNG ---
    userData.inventory.pokeballs[ballType]--;
    Database.updateUser(userId, userData);

    const { wildPet, playerPet, wildPetId } = battle;
    
    // Tính toán tỷ lệ bắt thực tế
    const baseRate = calculateCatchRate(playerPet, wildPet);
    // [FIX LỖI NaN]: Dùng multiplier
    const multiplier = ballConfig.multiplier || 1.0;
    let finalRate = baseRate * multiplier;

    // Bonus cho Dusk Ball (nếu Pet hệ Dark)
    if (ballType === 'dusk' && wildPet.element === 'Dark') {
        finalRate *= 1.5;
    }

    // CẬP NHẬT: Xóa log hiển thị tỷ lệ % để người chơi không biết
    const catchLog = [
        `🎾 **${interaction.user.username}** ném **${ballConfig.name}**!`,
        `... Chiếc bóng đang lắc lư ...` 
    ];

    // --- LOGIC RNG ---
    if (Math.random() < finalRate) {
        // === BẮT THÀNH CÔNG ===
        catchLog.push(`✨ **THU PHỤC THÀNH CÔNG!**`);
        catchLog.push(`🎉 **${wildPet.name}** đã vào đội hình.`);
        
        // Chuẩn bị dữ liệu lưu
        const newPetData = wildPet.getDataForSave();
        
        // Hồi phục đầy máu/mana cho Pet mới bắt
        const maxStats = wildPet.getStats();
        newPetData.currentHP = maxStats.HP;
        newPetData.currentMP = maxStats.MP;
        
        userData.pets.push(newPetData);
        
        // Thưởng thêm kẹo
        userData.inventory.candies.normal = (userData.inventory.candies.normal || 0) + 3;
        Database.updateUser(userId, userData);

        // Xóa Battle & Spawn
        activeBattles.delete(userId);
        if (wildPetId) await removePetFromWorld(wildPetId, interaction.client);

        // Hiển thị kết quả
        const embed = new EmbedBuilder()
            .setTitle(`🎉 CHÚC MỪNG!`)
            .setDescription(catchLog.join('\n'))
            .setColor(0xFFFF00);
        
        if(wildPet.icon) {
             const match = wildPet.icon.match(/\d+/);
             if (match) embed.setThumbnail(`https://cdn.discordapp.com/emojis/${match[0]}.png`);
        }
            
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_claim').setLabel('Tuyệt vời!').setStyle(ButtonStyle.Success)
        );

        await safeReply(interaction, { embeds: [embed], components: [row] });

    } else {
        // === BẮT THẤT BẠI ===
        catchLog.push(`💢 **${wildPet.name}** đã thoát ra!`);
        
        // Cập nhật log để hiển thị dòng ném bóng thất bại
        battle.logs = catchLog; 
        
        // Gọi lại BattleManager để Pet hoang dã tấn công lại người chơi
        // Dùng dynamic import để tránh lỗi vòng lặp (Circular Dependency)
        const { processEnemyTurn } = await import('./BattleManager.mjs');
        await processEnemyTurn(interaction, battle);
    }
}