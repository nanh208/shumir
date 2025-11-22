import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags,
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder 
} from 'discord.js';

import { Database } from './Database.mjs';
import { Pet } from './GameLogic.mjs'; 
import { getSkillById } from './SkillList.mjs'; 
import { 
    EMOJIS, 
    RARITY_COLORS, 
    RARITY_CONFIG, 
    CANDIES, // Đã bao gồm ULTRA
    ELEMENT_ICONS,
    SKILLBOOK_CONFIG 
} from './Constants.mjs';

const ITEMS_PER_PAGE = 5; 
const POINTS_PER_LEVEL = 3;

// ==========================================
// 0. HELPER FUNCTIONS (HỖ TRỢ UI)
// ==========================================

function createProgressBar(current, max, totalChars = 10) {
    const percent = Math.max(0, Math.min(current / max, 1));
    const filled = Math.round(percent * totalChars);
    const empty = totalChars - filled;
    return '🟦'.repeat(filled) + '⬜'.repeat(empty); 
}

// Hàm xử lý lỗi chung khi tương tác hết hạn
async function safeUpdate(interaction, payload) {
    try {
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply(payload);
        } else {
            await interaction.update(payload);
        }
    } catch (e) {
        // Xử lý lỗi 10062 (Unknown interaction) và InteractionNotReplied
        if (e.code === 10062 || e.code === 'InteractionNotReplied') {
             await interaction.followUp({ 
                content: "⚠️ Phiên giao diện đã hết hạn (15 phút). Vui lòng sử dụng lệnh `/inventory` để mở lại.", 
                embeds: payload.embeds, 
                components: payload.components, 
                ephemeral: true 
            }).catch(() => {});
        } else {
            console.error(`Lỗi cập nhật UI: ${e.message}`);
        }
    }
}

// ==========================================
// 1. GIAO DIỆN CHÍNH: TÚI ĐỒ & KHO PET (ĐÃ CẬP NHẬT CANDY)
// ==========================================

export async function showInventory(interaction, page = 0) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    page = parseInt(page) || 0;
    
    if (userData.activePetIndex === undefined) userData.activePetIndex = 0;

    if (!userData.inventory) userData.inventory = { candies: {}, skillbooks: {}, crates: {} };
    const inv = userData.inventory;
    const pets = userData.pets || [];

    // --- TẠO NỘI DUNG EMBED (ITEM LIST) ---
    let itemDesc = `**${EMOJIS.STAR} VẬT PHẨM TIÊU THỤ:**\n`;
    
    const candyKeys = Object.keys(CANDIES);
    let hasCandy = false;
    
    candyKeys.forEach(key => {
        const cfg = CANDIES[key];
        const qty = inv.candies[key.toLowerCase()] || 0; // Đảm bảo key inventory là chữ thường
        if (qty > 0) { itemDesc += `${cfg.emoji} **${cfg.name}**: \`${qty}\`\n`; hasCandy = true; }
    });

    if (!hasCandy) itemDesc += "*Không có kẹo nào.*\n";
    itemDesc += `\n**${EMOJIS.BOX_COMMON} VẬT PHẨM KHÁC:**\n💊 Thuốc Hồi Phục: \`${inv.potions || 0}\`\n`;

    // --- TẠO NỘI DUNG EMBED (PET LIST) ---
    const totalPages = Math.ceil(pets.length / ITEMS_PER_PAGE);
    if (page >= totalPages && totalPages > 0) page = totalPages - 1;
    
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const currentPets = pets.slice(start, end);

    let petListDesc = "";
    if (pets.length === 0) {
        petListDesc = "🚫 *Bạn chưa sở hữu Pet nào.*";
    } else {
        currentPets.forEach((pData, index) => {
            const p = new Pet(pData);
            const absoluteIndex = start + index;
            const rIcon = RARITY_CONFIG[p.rarity]?.icon || '⚪';
            const eIcon = ELEMENT_ICONS[p.element] || '';
            
            const isActive = (userData.activePetIndex === absoluteIndex);
            const statusIcon = isActive ? '🚩 **[Đang chọn]**' : (p.deathTime ? '💀' : '');
            
            petListDesc += `**\`[${absoluteIndex + 1}]\`** ${rIcon} **${p.name}** (Lv.${p.level}) ${eIcon} ${statusIcon}\n`;
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(`🎒 TÚI ĐỒ CỦA ${interaction.user.username.toUpperCase()}`)
        .setColor(0xF1C40F)
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
            { name: '📦 KHO VẬT PHẨM', value: itemDesc, inline: true },
            { name: `🐾 DANH SÁCH THÚ CƯNG (${pets.length}/10)`, value: petListDesc, inline: false }
        )
        .setFooter({ text: `Trang ${page + 1}/${totalPages || 1} • (Tương tác trong tin nhắn riêng)` });

    const rows = [];
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`inv_prev_${page}`).setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId('inv_refresh').setEmoji('🔄').setLabel('Làm mới').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`inv_next_${page}`).setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1 || totalPages === 0)
    ));

    if (currentPets.length > 0) {
        const petButtons = new ActionRowBuilder();
        currentPets.forEach((pData, index) => {
            const absoluteIndex = start + index;
            const pName = pData.nickname || pData.name;
            const isActive = (userData.activePetIndex === absoluteIndex);
            
            petButtons.addComponents(
                new ButtonBuilder()
                    .setCustomId(`inv_show_details_${absoluteIndex}`)
                    .setLabel(`${absoluteIndex + 1}. ${pName}`)
                    .setStyle(isActive ? ButtonStyle.Success : (pData.deathTime ? ButtonStyle.Danger : ButtonStyle.Secondary))
            );
        });
        rows.push(petButtons);
    }

    const payload = { content: null, embeds: [embed], components: rows };

    // ==========================================
    // XỬ LÝ GỬI TIN NHẮN AN TOÀN
    // ==========================================

    if (!interaction.isButton() && interaction.guild) {
        if (!interaction.deferred && !interaction.replied) {
            try {
                await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            } catch (e) { return; }
        }
        
        try {
            await interaction.user.send(payload);
            await interaction.editReply({ 
                content: "✅ **Đã gửi túi đồ vào Tin nhắn riêng (DM)!**\nVui lòng kiểm tra hộp thư của bạn.",
                embeds: [], components: [] 
            });
        } catch (error) {
            await interaction.editReply({ 
                content: "🚫 **Không thể gửi tin nhắn riêng.**\nVui lòng mở khóa DM.",
                embeds: [], components: [] 
            });
        }
        return;
    }

    // Logic cho Nút Bấm (Xử lý khi ở trong DM, nơi lỗi 10062 thường xảy ra)
    await safeUpdate(interaction, payload);
}

// ==========================================
// 2. CHI TIẾT PET & CHỌN ĐỒNG HÀNH
// ==========================================

export async function showPetDetails(interaction, petIndex) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const petData = userData.pets[petIndex];

    if (!petData) return interaction.reply({ content: "🚫 Pet không tồn tại.", flags: [MessageFlags.Ephemeral] });

    const p = new Pet(petData);
    const stats = p.getStats();
    const rarityCfg = RARITY_CONFIG[p.rarity] || RARITY_CONFIG['Common'];
    const elementIcon = ELEMENT_ICONS[p.element] || '❓';

    const hpPercent = Math.round((p.currentHP / stats.HP) * 100);
    const mpPercent = Math.round((p.currentMP / stats.MP) * 100);
    const xpMax = p.getExpToNextLevel();
    const isActive = (userData.activePetIndex === parseInt(petIndex));

    const embed = new EmbedBuilder()
        .setTitle(`${rarityCfg.icon} ${p.name.toUpperCase()} [Lv.${p.level}] ${isActive ? '🚩 (ĐỒNG HÀNH)' : ''}`)
        .setDescription(`*${p.getRace()}* • **${p.element}** ${elementIcon}\n` + 
                        `🧬 **Gen:** ${p.gen}/100 | ⭐ **Rank:** ${p.rarity}`)
        .setColor(isActive ? 0x00FF00 : rarityCfg.color)
        .setThumbnail(`https://cdn.discordapp.com/emojis/${p.icon.match(/\d+/)[0]}.png`)
        .addFields(
            { name: '📊 TRẠNG THÁI', value: `${EMOJIS.HEART} HP: ${Math.round(p.currentHP)}/${stats.HP} (${hpPercent}%)\n` + `${EMOJIS.MANA} MP: ${Math.round(p.currentMP)}/${stats.MP} (${mpPercent}%)\n` + `✨ XP: ${Math.round(p.currentExp)}/${xpMax}`, inline: true },
            { name: '⚔️ CHỈ SỐ', value: `ATK: ${stats.ATK} | DEF: ${stats.DEF}\nSPD: ${stats.SPD} | SATK: ${stats.SATK || 0}`, inline: true },
            { name: '🔥 ĐIỂM TIỀM NĂNG', value: `Hiện có: **${p.statPoints || 0}** điểm\n*(Dùng nút Nâng Cấp bên dưới)*`, inline: true }
        );

    const skillTxt = p.skills.map((sid, i) => {
        const s = getSkillById(sid);
        return `\`[${i+1}]\` **${s?.name || sid}**`;
    }).join('\n') || "_Chưa học kỹ năng nào_";
    embed.addFields({ name: '📜 KỸ NĂNG', value: skillTxt, inline: false });

    const rowActions = new ActionRowBuilder();
    rowActions.addComponents(
        new ButtonBuilder().setCustomId(`inv_equip_${petIndex}`).setEmoji('🚩').setLabel(isActive ? 'Đang Đồng Hành' : 'Chọn Đồng Hành').setStyle(isActive ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(isActive)
    );
    rowActions.addComponents(
        new ButtonBuilder().setCustomId(`inv_menu_feed_${petIndex}`).setEmoji(EMOJIS.CANDY_NORMAL).setLabel('Cho Ăn').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`inv_menu_stats_${petIndex}`).setEmoji('💪').setLabel('Nâng Cấp').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`inv_menu_learn_${petIndex}`).setEmoji('📚').setLabel('Học Skill').setStyle(ButtonStyle.Secondary)
    );
    const rowBack = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('inv_to_main_0').setLabel('🎒 Quay lại').setStyle(ButtonStyle.Secondary));

    const payload = { content: null, embeds: [embed], components: [rowActions, rowBack] };
    
    await safeUpdate(interaction, payload);
}

// ==========================================
// 3. CÁC MENU PHỤ (ĐÃ CẬP NHẬT CANDY)
// ==========================================

export async function showFeedMenu(interaction, petIndex) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const p = new Pet(userData.pets[petIndex]);
    const inv = userData.inventory.candies;
    const maxLv = RARITY_CONFIG[p.rarity]?.maxLv || 100;

    const embed = new EmbedBuilder()
        .setTitle(`🍽️ CHO ${p.name.toUpperCase()} ĂN`)
        .setDescription(`Cấp độ hiện tại: **${p.level}/${maxLv}**\nXP hiện tại: \`${p.currentExp}/${p.getExpToNextLevel()}\`\n\n**Chọn loại kẹo muốn sử dụng:**`)
        .setColor(0x00FF00); 

    const rowCandies = new ActionRowBuilder();
    
    const candyKeys = Object.keys(CANDIES);
    
    candyKeys.forEach(key => {
        const cfg = CANDIES[key];
        const qty = inv[key.toLowerCase()] || 0;
        const keyLower = key.toLowerCase();

        // Tạo Field
        embed.addFields({ 
            name: `${cfg.emoji} ${cfg.name}`, 
            value: `Còn: **${qty}**\nXP: +${cfg.xp}`, 
            inline: true 
        });

        // Tạo Button
        rowCandies.addComponents(
            new ButtonBuilder()
                .setCustomId(`inv_feed_${keyLower}_${petIndex}`)
                .setLabel(`Dùng ${cfg.name.split(' ').pop()}`) // Dùng tên cuối (Thường, Cấp, Tối Thượng)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(qty <= 0)
        );
    });

    const rowBack = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`inv_show_details_${petIndex}`).setLabel('Quay lại').setStyle(ButtonStyle.Secondary));

    const payload = { embeds: [embed], components: [rowCandies, rowBack] };
    await safeUpdate(interaction, payload);
}

export async function showStatUpgradeMenu(interaction, petIndex) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const p = new Pet(userData.pets[petIndex]);
    const stats = p.getStats();
    const points = p.statPoints || 0;

    const embed = new EmbedBuilder()
        .setTitle(`💪 NÂNG CẤP CHỈ SỐ: ${p.name}`)
        .setDescription(`Điểm tiềm năng: **${points}**\n\nChọn chỉ số muốn cộng (Tốn 1 điểm/lần):`)
        .setColor(0xE67E22)
        .addFields(
            { name: `${EMOJIS.HEART} HP`, value: `${stats.HP}`, inline: true },
            { name: `${EMOJIS.SWORD} ATK`, value: `${stats.ATK}`, inline: true },
            { name: `${EMOJIS.SHIELD} DEF`, value: `${stats.DEF}`, inline: true },
            { name: `${EMOJIS.SPEED} SPD`, value: `${stats.SPD}`, inline: true },
            { name: `🔮 SATK`, value: `${stats.SATK || stats.MATK || 0}`, inline: true }
        );

    const rowStats = new ActionRowBuilder();
    ['hp', 'atk', 'def', 'spd', 'satk'].forEach(key => {
        rowStats.addComponents(new ButtonBuilder().setCustomId(`inv_upgrade_stat_${key}_${petIndex}`).setLabel(`+1 ${key.toUpperCase()}`).setStyle(ButtonStyle.Success).setDisabled(points <= 0));
    });
    const rowBack = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`inv_show_details_${petIndex}`).setLabel('Quay lại').setStyle(ButtonStyle.Secondary));

    const payload = { embeds: [embed], components: [rowStats, rowBack] };
    await safeUpdate(interaction, payload);
}

export async function showSkillLearnMenu(interaction, petIndex) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const p = new Pet(userData.pets[petIndex]);
    
    const embed = new EmbedBuilder().setTitle(`📚 HỌC KỸ NĂNG: ${p.name}`).setDescription("Tính năng này đang được phát triển (Cần thêm sách kỹ năng vào kho trước).").setColor(0x9B59B6);
    const rowBack = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`inv_show_details_${petIndex}`).setLabel('Quay lại').setStyle(ButtonStyle.Secondary));
    
    const payload = { embeds: [embed], components: [rowBack] };
    await safeUpdate(interaction, payload);
}

// ==========================================
// 4. HANDLERS
// ==========================================

export async function handleEquipPet(interaction, petIndex) {
    await interaction.deferUpdate();

    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    
    userData.activePetIndex = parseInt(petIndex);
    Database.updateUser(userId, userData);

    const pName = userData.pets[petIndex].name;
    
    await interaction.followUp({ 
        content: `✅ Đã chọn **${pName}** làm bạn đồng hành chiến đấu!`, 
        flags: [MessageFlags.Ephemeral] 
    });
    
    await showPetDetails(interaction, petIndex);
}

// Xử lý cho ăn (ĐÃ CẬP NHẬT LOGIC CANDY)
export async function handleFeed(interaction, petIndex, candyType) {
    await interaction.deferUpdate();

    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const pData = userData.pets[petIndex];
    const p = new Pet(pData);
    
    const candyKey = candyType.toUpperCase();
    const candyCfg = CANDIES[candyKey];

    // Kiểm tra kho dựa trên key chữ thường
    if (!userData.inventory.candies[candyType]) {
        return interaction.followUp({ content: `🚫 Hết ${candyCfg?.name || 'kẹo'}!`, flags: [MessageFlags.Ephemeral] });
    }

    userData.inventory.candies[candyType]--;
    
    // Thêm XP (Giả định candyCfg.xp tồn tại)
    const leveledUp = p.addExp(candyCfg.xp, POINTS_PER_LEVEL);
    
    userData.pets[petIndex] = p.getDataForSave();
    Database.updateUser(userId, userData);

    let msg = `✅ **${p.name}** đã ăn ${candyCfg.name} (+${candyCfg.xp} XP)!`;
    if (leveledUp) msg += `\n🆙 **LÊN CẤP!** Hiện tại Lv.${p.level}`;

    await interaction.followUp({ content: msg, flags: [MessageFlags.Ephemeral] });
    await showFeedMenu(interaction, petIndex); 
}

// Xử lý nâng stats
export async function handleStatUpgrade(interaction, petIndex, statKey) {
    await interaction.deferUpdate();

    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const p = new Pet(userData.pets[petIndex]);

    if (p.statPoints > 0) {
        p.incrementStat(statKey);
        
        userData.pets[petIndex] = p.getDataForSave();
        Database.updateUser(userId, userData);
        
        await interaction.followUp({ content: `✅ Đã tăng ${statKey.toUpperCase()}!`, flags: [MessageFlags.Ephemeral] });
        await showStatUpgradeMenu(interaction, petIndex);
    } else {
        await interaction.followUp({ content: "🚫 Không đủ điểm tiềm năng!", flags: [MessageFlags.Ephemeral] });
    }
}

// ==========================================
// 5. ROUTER
// ==========================================

export async function handleInventoryInteraction(interaction) {
    const { customId } = interaction;
    
    // Router logic

    if (customId === 'inv_refresh') {
        await showInventory(interaction, 0);
    } 
    else if (customId.startsWith('inv_prev_') || customId.startsWith('inv_next_') || customId.startsWith('inv_to_main_')) {
        const page = parseInt(customId.split('_').pop());
        await showInventory(interaction, page);
    }
    else if (customId.startsWith('inv_show_details_')) {
        const index = parseInt(customId.split('_').pop());
        await showPetDetails(interaction, index);
    }
    else if (customId.startsWith('inv_equip_')) {
        const index = parseInt(customId.split('_').pop());
        await handleEquipPet(interaction, index);
    }
    else if (customId.startsWith('inv_menu_feed_')) {
        const index = parseInt(customId.split('_').pop());
        await showFeedMenu(interaction, index);
    }
    else if (customId.startsWith('inv_menu_stats_')) {
        const index = parseInt(customId.split('_').pop());
        await showStatUpgradeMenu(interaction, index);
    }
    else if (customId.startsWith('inv_menu_learn_')) {
        const index = parseInt(customId.split('_').pop());
        await showSkillLearnMenu(interaction, index);
    }
    else if (customId.startsWith('inv_feed_')) {
        // Xử lý inv_feed_KEY_INDEX
        const parts = customId.split('_');
        const index = parseInt(parts.pop());
        const type = parts[2]; // Lấy key chữ thường (normal, high, super, ultra)
        await handleFeed(interaction, index, type);
    }
    else if (customId.startsWith('inv_upgrade_stat_')) {
        const parts = customId.split('_');
        const index = parseInt(parts.pop());
        const key = parts[3]; 
        await handleStatUpgrade(interaction, index, key);
    }
}