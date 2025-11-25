import { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags
} from 'discord.js';

import { Database } from './Database.mjs';
import { Pet } from './Pet.mjs'; 
import { getSkillById } from './SkillList.mjs'; 
import { 
    EMOJIS, 
    RARITY_CONFIG, 
    CANDIES, 
    ELEMENT_ICONS,
    POKEBALLS 
} from './Constants.mjs';

const ITEMS_PER_PAGE = 5; 
const POINTS_PER_LEVEL = 3;

// ==========================================
// 0. HELPER FUNCTIONS
// ==========================================

async function safeDefer(interaction) {
    try {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferUpdate();
        }
    } catch (e) {
        if (e.code !== 40060 && e.code !== 10062) console.error("Defer Error:", e.message);
    }
}

async function safeResponse(interaction, payload, type = 'update') {
    const data = typeof payload === 'string' ? { content: payload } : payload;
    if (data.flags && data.flags.includes(MessageFlags.Ephemeral)) {
        try { return await interaction.followUp(data); } catch (e) { return; }
    }
    try {
        if (interaction.deferred || interaction.replied) {
            return await interaction.editReply(data);
        }
        if (type === 'update') return await interaction.update(data);
        else return await interaction.reply(data);
    } catch (error) {
        if (error.code === 40060 || error.code === 'InteractionAlreadyReplied') {
            try { return await interaction.editReply(data); } catch (err2) {}
        } else if (error.code !== 10062) {
            console.error("SafeResponse Error:", error.message);
        }
    }
}

async function safeAlert(interaction, message) {
    await safeResponse(interaction, { content: message, flags: [MessageFlags.Ephemeral] }, 'reply');
}

// ==========================================
// 1. GIAO DIỆN CHÍNH: TÚI ĐỒ & KHO PET
// ==========================================

export async function showInventory(interaction, page = 0) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    page = parseInt(page) || 0;
    
    // --- KHỞI TẠO DỮ LIỆU AN TOÀN ---
    if (userData.activePetIndex === undefined) userData.activePetIndex = 0;
    
    // Đảm bảo cấu trúc inventory đầy đủ (bao gồm items và skillBooks)
    if (!userData.inventory) {
        userData.inventory = { 
            candies: {}, 
            skillBooks: [], 
            crates: {}, 
            potions: 0, 
            pokeballs: {},
            items: {} 
        };
    }
    
    // Migration nhẹ: Nếu user cũ chưa có các trường này thì thêm vào
    const inv = userData.inventory;
    if (!inv.skillBooks) inv.skillBooks = [];
    if (!inv.items) inv.items = {};
    if (!inv.candies) inv.candies = {};
    if (!inv.pokeballs) inv.pokeballs = {};

    const pets = userData.pets || [];
    const userGold = userData.gold || 0;

    // --- TẠO NỘI DUNG EMBED (ITEM LIST) ---
    let itemDesc = `💰 **Tài sản:** \`${userGold.toLocaleString()}\` ${EMOJIS.CURRENCY || 'Gold'}\n`;
    itemDesc += `─────────────────\n`;

    // 1. KẸO & THUỐC
    itemDesc += `**${EMOJIS.STAR || '⭐'} VẬT PHẨM TIÊU THỤ:**\n`;
    
    const candyKeys = Object.keys(CANDIES);
    let hasCandy = false;
    candyKeys.forEach(key => {
        const cfg = CANDIES[key];
        const qty = inv.candies[key.toLowerCase()] || 0;
        if (qty > 0) { itemDesc += `${cfg.emoji} **${cfg.name}**: \`${qty}\`\n`; hasCandy = true; }
    });
    if (inv.potions > 0) { itemDesc += `💊 **Thuốc Hồi Phục**: \`${inv.potions}\`\n`; hasCandy = true; }
    if (!hasCandy) itemDesc += "_Trống_\n";
    
    // 2. BÓNG BẮT PET
    itemDesc += `\n**${EMOJIS.BALL_MASTER || '🏐'} BÓNG THU PHỤC:**\n`;
    let hasBalls = false;
    for (const key in POKEBALLS) {
        const ball = POKEBALLS[key];
        const qty = inv.pokeballs?.[key] || 0; 
        if (qty > 0) { itemDesc += `${ball.icon} **${ball.name}**: \`${qty}\`\n`; hasBalls = true; }
    }
    if (!hasBalls) itemDesc += "_Trống_\n";

    // 3. [MỚI] SÁCH KỸ NĂNG (Gom nhóm hiển thị)
    if (inv.skillBooks && inv.skillBooks.length > 0) {
        itemDesc += `\n**📜 SÁCH KỸ NĂNG:**\n`;
        // Logic gom nhóm: Đếm số lượng sách cùng hệ và cùng phẩm chất
        const bookCounts = {};
        inv.skillBooks.forEach(book => {
            // Ví dụ key: "Fire [Rare]"
            const key = `${book.element} [${book.quality}]`;
            bookCounts[key] = (bookCounts[key] || 0) + 1;
        });

        for (const [name, count] of Object.entries(bookCounts)) {
            itemDesc += `📘 **Sách ${name}**: \`${count}\`\n`;
        }
    }

    // 4. [MỚI] VẬT PHẨM KHÁC (Buff, Key...)
    if (inv.items && Object.keys(inv.items).length > 0) {
        let hasItems = false;
        let tempDesc = `\n**🧩 VẬT PHẨM KHÁC:**\n`;
        for (const [itemId, qty] of Object.entries(inv.items)) {
            if (qty > 0) {
                // Làm đẹp tên ID (ví dụ: item_buff_atk -> Item Buff Atk)
                const itemName = itemId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                tempDesc += `🔸 **${itemName}**: \`${qty}\`\n`;
                hasItems = true;
            }
        }
        if (hasItems) itemDesc += tempDesc;
    }

    // --- TẠO NỘI DUNG EMBED (PET LIST) ---
    const totalPages = Math.ceil(pets.length / ITEMS_PER_PAGE);
    if (page >= totalPages && totalPages > 0) page = totalPages - 1;
    if (page < 0) page = 0;
    
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
            const statusIcon = isActive ? '🚩' : (p.deathTime ? '💀' : '');
            
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
        .setFooter({ text: `Trang ${page + 1}/${totalPages || 1} • ID: ${userId}` });

    // Pagination Logic
    const prevPage = Math.max(0, page - 1);
    const nextPage = Math.min((totalPages - 1), page + 1);

    const rows = [];
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`inv_prev_${prevPage}`).setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId('inv_refresh').setEmoji('🔄').setLabel('Làm mới').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`inv_next_${nextPage}`).setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1 || totalPages === 0)
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

    // Xử lý gửi DM (Nếu là slash command /inventory)
    if (!interaction.isButton() && !interaction.isStringSelectMenu() && interaction.guild) {
        try {
            if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
            await interaction.user.send(payload);
            await interaction.editReply({ content: "✅ **Đã gửi túi đồ vào Tin nhắn riêng (DM)!**", embeds: [], components: [] });
        } catch (error) {
            await safeResponse(interaction, { ...payload, flags: [MessageFlags.Ephemeral] }, 'editReply');
        }
        return;
    }

    await safeResponse(interaction, payload, 'update');
}

// ==========================================
// 2. CHI TIẾT PET & CHỌN ĐỒNG HÀNH
// ==========================================

export async function showPetDetails(interaction, petIndex) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const petData = userData.pets[petIndex];

    if (!petData) return safeAlert(interaction, "🚫 Pet không tồn tại.");

    const p = new Pet(petData);
    const stats = p.getStats();
    const rarityCfg = RARITY_CONFIG[p.rarity] || RARITY_CONFIG['Common'];
    const elementIcon = ELEMENT_ICONS[p.element] || '❓';
    const isActive = (userData.activePetIndex === parseInt(petIndex));

    const hpPercent = Math.round((p.currentHP / stats.HP) * 100);
    const mpPercent = Math.round((p.currentMP / stats.MP) * 100);
    const xpMax = p.getExpToNextLevel() || 1; 
    const currentExp = Number(p.currentExp) || 0; 

    const embed = new EmbedBuilder()
        .setTitle(`${rarityCfg.icon} ${p.name.toUpperCase()} [Lv.${p.level}] ${isActive ? '🚩 (ĐỒNG HÀNH)' : ''}`)
        .setDescription(`*${p.getRace()}* • **${p.element}** ${elementIcon}\n` + 
                        `🧬 **Gen:** ${p.gen}/100 | ⭐ **Rank:** ${p.rarity}`)
        .setColor(isActive ? 0x00FF00 : rarityCfg.color)
        .setThumbnail(`https://cdn.discordapp.com/emojis/${p.icon.match(/\d+/)[0]}.png`)
        .addFields(
            { name: '📊 TRẠNG THÁI', value: `${EMOJIS.HEART || '❤️'} HP: ${Math.round(p.currentHP)}/${stats.HP} (${hpPercent}%)\n` + `${EMOJIS.MANA || '✨'} MP: ${Math.round(p.currentMP)}/${stats.MP} (${mpPercent}%)\n` + `✨ XP: ${Math.round(currentExp)}/${xpMax}`, inline: true },
            { name: '⚔️ CHỈ SỐ', value: `ATK: ${stats.ATK} | DEF: ${stats.DEF}\nSPD: ${stats.SPD} | SATK: ${stats.SATK || 0}`, inline: true },
            { name: '🔥 ĐIỂM TIỀM NĂNG', value: `Hiện có: **${p.statPoints || 0}** điểm\n*(Dùng nút Nâng Cấp bên dưới)*`, inline: true }
        );

    const skillTxt = p.skills.map((sid, i) => {
        const s = getSkillById(sid);
        return `\`[${i+1}]\` **${s?.name || sid}**`;
    }).join('\n') || "_Chưa học kỹ năng nào_";
    embed.addFields({ name: '📜 KỸ NĂNG', value: skillTxt, inline: false });

    const rowActions = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`inv_equip_${petIndex}`).setEmoji('🚩').setLabel(isActive ? 'Đang Đồng Hành' : 'Chọn Đồng Hành').setStyle(isActive ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(isActive),
        new ButtonBuilder().setCustomId(`inv_release_confirm_${petIndex}`).setEmoji('🗑️').setLabel('Thả Pet').setStyle(ButtonStyle.Danger)
    );
    
    const rowUpgrade = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`inv_menu_feed_${petIndex}`).setEmoji(EMOJIS.CANDY_NORMAL || '🍬').setLabel('Cho Ăn').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`inv_menu_stats_${petIndex}`).setEmoji('💪').setLabel('Nâng Cấp').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`inv_menu_learn_${petIndex}`).setEmoji('📚').setLabel('Học Skill').setStyle(ButtonStyle.Secondary)
    );

    const rowBack = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('inv_to_main_0').setLabel('🎒 Quay lại').setStyle(ButtonStyle.Secondary));

    await safeResponse(interaction, { content: null, embeds: [embed], components: [rowActions, rowUpgrade, rowBack] }, 'update');
}

// ==========================================
// 3. CÁC MENU PHỤ
// ==========================================

export async function showFeedMenu(interaction, petIndex) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const p = new Pet(userData.pets[petIndex]);
    const inv = userData.inventory.candies;
    const maxLv = RARITY_CONFIG[p.rarity]?.maxLv || 100;
    const xpMax = p.getExpToNextLevel() || 1;
    const currentExp = Number(p.currentExp) || 0;

    const embed = new EmbedBuilder()
        .setTitle(`🍽️ CHO ${p.name.toUpperCase()} ĂN`)
        .setDescription(`Cấp độ: **${p.level}/${maxLv}** | XP: \`${currentExp}/${xpMax}\``)
        .setColor(0x00FF00); 

    const rowCandies = new ActionRowBuilder();
    Object.keys(CANDIES).forEach(key => {
        const cfg = CANDIES[key];
        const qty = inv[key.toLowerCase()] || 0;
        embed.addFields({ name: `${cfg.emoji} ${cfg.name}`, value: `Còn: **${qty}** | XP: +${cfg.xp}`, inline: true });
        rowCandies.addComponents(new ButtonBuilder().setCustomId(`inv_feed_${key.toLowerCase()}_${petIndex}`).setLabel(`Dùng ${cfg.name}`).setStyle(ButtonStyle.Primary).setDisabled(qty <= 0));
    });

    const rowBack = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`inv_show_details_${petIndex}`).setLabel('Quay lại').setStyle(ButtonStyle.Secondary));
    await safeResponse(interaction, { embeds: [embed], components: [rowCandies, rowBack] }, 'update');
}

export async function showStatUpgradeMenu(interaction, petIndex) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const p = new Pet(userData.pets[petIndex]);
    const stats = p.getStats();

    const embed = new EmbedBuilder().setTitle(`💪 NÂNG CẤP: ${p.name}`).setDescription(`Điểm tiềm năng: **${p.statPoints || 0}**`).setColor(0xE67E22)
        .addFields(
            { name: `HP: ${stats.HP}`, value: ' ', inline: true }, { name: `ATK: ${stats.ATK}`, value: ' ', inline: true },
            { name: `DEF: ${stats.DEF}`, value: ' ', inline: true }, { name: `SPD: ${stats.SPD}`, value: ' ', inline: true }
        );

    const rowStats = new ActionRowBuilder();
    ['hp', 'atk', 'def', 'spd', 'satk'].forEach(key => {
        rowStats.addComponents(new ButtonBuilder().setCustomId(`inv_upgrade_stat_${key}_${petIndex}`).setLabel(`+1 ${key.toUpperCase()}`).setStyle(ButtonStyle.Success).setDisabled((p.statPoints || 0) <= 0));
    });
    const rowBack = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`inv_show_details_${petIndex}`).setLabel('Quay lại').setStyle(ButtonStyle.Secondary));
    await safeResponse(interaction, { embeds: [embed], components: [rowStats, rowBack] }, 'update');
}

export async function showSkillLearnMenu(interaction, petIndex) {
    const embed = new EmbedBuilder().setTitle(`📚 HỌC KỸ NĂNG`).setDescription("Tính năng đang phát triển.").setColor(0x9B59B6);
    const rowBack = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`inv_show_details_${petIndex}`).setLabel('Quay lại').setStyle(ButtonStyle.Secondary));
    await safeResponse(interaction, { embeds: [embed], components: [rowBack] }, 'update');
}

// ==========================================
// 4. HANDLERS (LOGIC XỬ LÝ)
// ==========================================

export async function handleReleasePet(interaction, petIndex) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);

    if (!userData.pets[petIndex]) return;

    // Logic chặn xóa pet đang dùng
    if (userData.activePetIndex === parseInt(petIndex)) {
        return safeAlert(interaction, "🚫 **Không thể thả Pet đang đồng hành!**");
    }

    const removedName = userData.pets[petIndex].name;
    userData.pets.splice(petIndex, 1);
    if (userData.activePetIndex > petIndex) userData.activePetIndex--;
    Database.updateUser(userId, userData);

    await safeAlert(interaction, `👋 Bạn đã thả **${removedName}** về tự nhiên!`);
    await showInventory(interaction, 0);
}

export async function handleEquipPet(interaction, petIndex) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    userData.activePetIndex = parseInt(petIndex);
    Database.updateUser(userId, userData);
    await safeAlert(interaction, `✅ Đã chọn **${userData.pets[petIndex].name}** làm đồng hành!`);
    await showPetDetails(interaction, petIndex);
}

export async function handleFeed(interaction, petIndex, candyType) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const p = new Pet(userData.pets[petIndex]);
    const candyCfg = CANDIES[candyType.toUpperCase()];

    if (!userData.inventory.candies[candyType] || userData.inventory.candies[candyType] <= 0) {
        return safeAlert(interaction, `🚫 Hết ${candyCfg?.name}!`);
    }

    userData.inventory.candies[candyType]--;
    const leveledUp = p.addExp(candyCfg.xp, POINTS_PER_LEVEL);
    userData.pets[petIndex] = p.getDataForSave();
    Database.updateUser(userId, userData);

    let msg = `✅ **${p.name}** ăn ${candyCfg.name} (+${candyCfg.xp} XP)!`;
    if (leveledUp) msg += `\n🆙 **LÊN CẤP!** (Lv.${p.level})`;

    await safeAlert(interaction, msg);
    await showFeedMenu(interaction, petIndex); 
}

export async function handleStatUpgrade(interaction, petIndex, statKey) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const p = new Pet(userData.pets[petIndex]);

    if (p.statPoints > 0) {
        p.incrementStat(statKey);
        userData.pets[petIndex] = p.getDataForSave();
        Database.updateUser(userId, userData);
        await safeAlert(interaction, `✅ Tăng ${statKey.toUpperCase()} thành công!`);
        await showStatUpgradeMenu(interaction, petIndex);
    } else {
        await safeAlert(interaction, "🚫 Không đủ điểm tiềm năng!");
    }
}

// ==========================================
// 5. ROUTER
// ==========================================

export async function handleInventoryInteraction(interaction) {
    const { customId } = interaction;
    
    // Defer an toàn (sẽ không crash nếu đã defer rồi)
    if (interaction.isButton && (interaction.isButton() || (interaction.isStringSelectMenu && interaction.isStringSelectMenu()))) {
        await safeDefer(interaction);
    }
    
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
    else if (customId.startsWith('inv_release_confirm_')) {
        const index = parseInt(customId.split('_').pop());
        await handleReleasePet(interaction, index);
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
        const parts = customId.split('_');
        const index = parseInt(parts.pop());
        const type = parts[2];
        await handleFeed(interaction, index, type);
    }
    else if (customId.startsWith('inv_upgrade_stat_')) {
        const parts = customId.split('_');
        const index = parseInt(parts.pop());
        const key = parts[3]; 
        await handleStatUpgrade(interaction, index, key);
    }
}