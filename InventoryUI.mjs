import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } from 'discord.js'; 
import { Database } from './Database.mjs';
import { Pet } from './Pet.mjs'; 
import { getSkillById } from './SkillList.mjs'; 
import { RARITY_CONFIG } from './Constants.mjs';

const ITEMS_PER_PAGE = 5; 
const MAX_PET_LEVEL = 100; 
const POINTS_PER_LEVEL = 3; 
const RESET_COST_CANDY = 5;

const CANDY_CONFIG = {
    'normal': { name: 'Kẹo thường 🍬', exp: 50 },
    'high': { name: 'Kẹo cao cấp 🍭', exp: 200 },
    'super': { name: 'Kẹo siêu cấp 🍮', exp: 2000 }
};

const SKILLBOOK_CONFIG = {
    'S_Fire': { name: 'Sách Lửa 🔥', skillId: 'S2', rarity: 'Rare', icon: '🔥' }, 
    'S_Heal': { name: 'Sách Hồi Máu 💖', skillId: 'S3', rarity: 'Common', icon: '💖' },
    'S_Epic': { name: 'Sách Sử Thi ✨', skillId: 'S4', rarity: 'Epic', icon: '✨' }
};

let geminiAI = null; // Giữ lại biến nhưng không dùng
export function setAIClientRef(ref) { geminiAI = ref; }

// --- HÀM HỖ TRỢ DEFER AN TOÀN ---
async function safeDefer(interaction) {
    if (!interaction.deferred && !interaction.replied) {
        try {
            if (interaction.isChatInputCommand()) {
                // ⚡️ ĐÃ FIX: ephemeral: true -> flags
                await interaction.deferReply({ flags: MessageFlags.Ephemeral }); 
            } else {
                await interaction.deferUpdate();
            }
        } catch (e) { /* Bỏ qua lỗi nếu đã defer rồi */ }
    }
}

// ==========================================
// 1. GIAO DIỆN CHÍNH (TÚI ĐỒ)
// ==========================================

export async function showInventory(interaction, page = 0) {
    await safeDefer(interaction); 

    page = parseInt(page) || 0; 
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const pets = userData.pets;
    const inv = userData.inventory;
    inv.skillbooks = inv.skillbooks || {}; 

    let itemDesc = "—---------------------------------------\n";
    itemDesc += `**KẸO KINH NGHIỆM:**\n`;
    itemDesc += `🍬 Kẹo thường: **${inv.candies.normal}** (Tăng ${CANDY_CONFIG.normal.exp} XP)\n`;
    itemDesc += `🍭 Kẹo cao cấp: **${inv.candies.high}** (Tăng ${CANDY_CONFIG.high.exp} XP)\n`;
    itemDesc += `🍮 Kẹo siêu cấp: **${inv.candies.super || 0}** (Tăng ${CANDY_CONFIG.super.exp} XP)\n`;
    
    itemDesc += `\n**SÁCH KỸ NĂNG:**\n`;
    let hasSkillBook = false;
    for (const key in SKILLBOOK_CONFIG) {
        if (inv.skillbooks[key] > 0) {
            hasSkillBook = true;
            const skillName = getSkillById(SKILLBOOK_CONFIG[key].skillId)?.name || 'Skill';
            itemDesc += `📖 ${SKILLBOOK_CONFIG[key].name} (${skillName}): **${inv.skillbooks[key]}**\n`;
        }
    }
    if (!hasSkillBook) itemDesc += `*Chưa có sách kỹ năng.*\n`;
    
    itemDesc += `\n**VẬT PHẨM KHÁC:**\n`;
    itemDesc += `📦 Hòm Thường: **${inv.crates.common || 0}**\n`;
    itemDesc += `⚪ Bóng Thường: **${inv.balls?.Common || 0}**\n`; 
    itemDesc += "—----------------------------------------\n";

    const totalPages = Math.ceil(pets.length / ITEMS_PER_PAGE);
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const currentPets = pets.slice(start, end);

    let petListDesc = "";
    if (pets.length === 0) {
        petListDesc = "*Bạn chưa có Pet nào.*";
    } else {
        petListDesc = `**DANH SÁCH PET (${pets.length} / 10)**\n`;
        currentPets.forEach((pData, index) => {
            const p = new Pet(pData);
            const shortId = p.id.slice(0, 4); 
            petListDesc += `**[${start + index + 1}.]** ${p.icon} **${p.name}** Lv.${p.level} [Gen: ${p.gen}] - *ID:${shortId}*\n`;
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(`🎒 TÚI ĐỒ CỦA ${interaction.user.username}`)
        .setDescription(itemDesc) 
        .addFields({ name: 'Pets', value: petListDesc, inline: false })
        .setColor(0x0099FF)
        .setFooter({ text: `Trang ${page + 1}/${totalPages || 1}` });

    const rowNav = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`inv_prev_${page}`).setLabel('◀️ Trang trước').setStyle(ButtonStyle.Secondary).setDisabled(page === 0), 
        new ButtonBuilder().setCustomId('inv_refresh').setLabel('🔄 Làm mới').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`inv_next_${page}`).setLabel('Trang sau ▶️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1 || totalPages === 0)
    );
    
    const rowVault = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`inv_menu_vault_${page}`).setLabel('📦 KHO PET (Chọn/Nâng cấp)').setStyle(ButtonStyle.Success).setDisabled(pets.length === 0)
    );

    await interaction.editReply({ embeds: [embed], components: [rowNav, rowVault] });
}

// ==========================================
// 2. KHO PET (HIỂN THỊ NÚT CHỌN PET)
// ==========================================

export async function showPetVault(interaction, page = 0) {
    await safeDefer(interaction);

    page = parseInt(page) || 0; 
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const pets = userData.pets;
    
    const totalPages = Math.ceil(pets.length / ITEMS_PER_PAGE);
    const start = page * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const currentPets = pets.slice(start, end);

    let components = [];
    
    if (currentPets.length > 0) {
        const petButtons = new ActionRowBuilder();
        currentPets.forEach((petData, index) => {
            const absoluteIndex = start + index;
            const pet = new Pet(petData);
            petButtons.addComponents(
                new ButtonBuilder().setCustomId(`inv_show_details_${absoluteIndex}`).setLabel(`${pet.icon} ${pet.name} Lv.${pet.level}`).setStyle(ButtonStyle.Primary)
            );
        });
        components.push(petButtons);
    }
    
    const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`inv_vault_prev_${page}`).setLabel('◀️ Trang trước').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId('inv_to_main_0').setLabel('⬅️ Về Túi').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`inv_vault_next_${page}`).setLabel('Trang sau ▶️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1 || totalPages === 0)
    );
    components.push(navRow);

    await interaction.editReply({
        content: `**KHO PET:** Chọn Pet để xem chi tiết và nâng cấp. (Trang ${page + 1}/${totalPages || 1})`,
        embeds: [], components: components
    });
}

export async function showPetDetails(interaction, petIndex) {
    await safeDefer(interaction);

    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const pets = userData.pets;
    const petData = pets[petIndex];
    
    if (!petData) {
        return interaction.editReply({ content: "🚫 Pet không hợp lệ.", embeds: [], components: [] });
    }
    
    const pet = new Pet(petData);
    const stats = pet.getStats();
    
    const currentHP = !isNaN(pet.currentHP) ? pet.currentHP : stats.HP;
    const currentMP = !isNaN(pet.currentMP) ? pet.currentMP : stats.MP;
    const statPoints = pet.statPoints || 0;
    const currentExp = pet.currentExp || 0;
    const expToNextLevel = pet.getExpToNextLevel() || 100;
    
    const petRarityInfo = RARITY_CONFIG[pet.rarity] || RARITY_CONFIG['Common'];
    const petRarity = petRarityInfo.icon + ' ' + pet.rarity;

    let skillDesc = pet.skills.map((sid, index) => { // <-- ĐÃ SỬA LỖI CÚ PHÁP Ở ĐÂY
        const skill = getSkillById(sid);
        return `**[Slot ${index + 1}]** ${skill?.name || 'Unknown'} (\`${sid}\`)`;
    }).join('\n') || '*Chưa có skill nào.*';

    // **********************************
    // ⚡️ TỐI ƯU: Thêm Pet Lore vào mô tả nếu có
    // **********************************
    const petLore = pet.lore ? `\n\n📜 **Lore:** _${pet.lore}_` : '';

    const embed = new EmbedBuilder()
        .setTitle(`✨ [Lv.${pet.level}] ${pet.icon} ${pet.name.toUpperCase()}`)
        .setDescription(`**Hạng:** ${petRarity} | **Gen:** ${pet.gen}/100 🧬 | **Hệ:** ${pet.element}\n**XP:** ${currentExp} / ${expToNextLevel} (${((currentExp/expToNextLevel)*100).toFixed(1)}%)${petLore}`)
        .addFields(
            { name: '❤️ Máu & MP', value: `HP: **${Math.round(currentHP)}/${stats.HP}** | MP: **${Math.round(currentMP)}/${stats.MP}**`, inline: false },
            { name: '📊 Chỉ số', value: `⚔️ ATK: **${stats.ATK}** | 🪄 SATK: **${stats.SATK || stats.MATK || 0}**\n🛡️ DEF: **${stats.DEF}** | ⚡ SPD: **${stats.SPD}**`, inline: true },
            { name: '🎓 Kỹ năng', value: skillDesc, inline: true },
            { name: `🔥 Điểm nâng cấp: ${statPoints}`, value: statPoints > 0 ? `*Dùng nút "Nâng cấp" bên dưới.*` : `*Lên cấp để nhận thêm.*`, inline: false }
        )
        .setColor(0x3498DB);

    const rowActions = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`inv_menu_feed_${petIndex}`).setLabel('🍬 Cho Ăn').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`inv_menu_stats_${petIndex}`).setLabel('⬆️ Nâng Cấp').setStyle(ButtonStyle.Secondary).setDisabled(statPoints === 0),
        new ButtonBuilder().setCustomId(`inv_menu_learn_${petIndex}`).setLabel('📚 Skill').setStyle(ButtonStyle.Success)
    );

    const rowBack = new ActionRowBuilder().addComponents(
         new ButtonBuilder().setCustomId(`inv_menu_vault_0`).setLabel('⬅️ Quay lại Kho').setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({ content: null, embeds: [embed], components: [rowActions, rowBack] });
}

export async function showFeedMenu(interaction, petIndex) {
    await safeDefer(interaction);
    
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const petData = userData.pets[petIndex];
    const pet = new Pet(petData);
    
    if (pet.level >= MAX_PET_LEVEL) {
        return interaction.editReply({ content: `🚫 ${pet.name} đã đạt cấp độ tối đa!`, embeds: [], components: [] });
    }

    const canUseNormalCandy = userData.inventory.candies.normal > 0;
    const canUseHighCandy = userData.inventory.candies.high > 0;
    const canUseSuperCandy = (userData.inventory.candies.super || 0) > 0;

    const rowCandy = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`inv_feed_normal_${petIndex}`).setLabel(`🍬 Thường (${CANDY_CONFIG.normal.exp} XP)`).setStyle(ButtonStyle.Primary).setDisabled(!canUseNormalCandy),
        new ButtonBuilder().setCustomId(`inv_feed_high_${petIndex}`).setLabel(`🍭 Cao cấp (${CANDY_CONFIG.high.exp} XP)`).setStyle(ButtonStyle.Danger).setDisabled(!canUseHighCandy),
        new ButtonBuilder().setCustomId(`inv_feed_super_${petIndex}`).setLabel(`🍮 Siêu cấp (${CANDY_CONFIG.super.exp} XP)`).setStyle(ButtonStyle.Success).setDisabled(!canUseSuperCandy)
    );
    
    const rowBack = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`inv_show_details_${petIndex}`).setLabel('⬅️ Quay lại').setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({
        content: `**CHO ${pet.icon} ${pet.name.toUpperCase()} ĂN:**\nXP hiện tại: ${pet.currentExp || 0}/${pet.getExpToNextLevel()}`,
        embeds: [],
        components: [rowCandy, rowBack]
    });
}

export async function showStatUpgradeMenu(interaction, petIndex) {
    await safeDefer(interaction);

    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const petData = userData.pets[petIndex];
    const pet = new Pet(petData);
    const statPoints = pet.statPoints || 0;
    const stats = pet.getStats();

    if (statPoints <= 0) {
        return showPetDetails(interaction, petIndex);
    }
    
    const fields = [
        { emoji: '❤️', stat: 'HP', current: stats.HP, key: 'hp' },
        { emoji: '⚔️', stat: 'ATK', current: stats.ATK, key: 'atk' },
        { emoji: '🪄', stat: 'SATK', current: stats.SATK || stats.MATK || 0, key: 'satk' },
        { emoji: '🛡️', stat: 'DEF', current: stats.DEF, key: 'def' },
        { emoji: '⚡', stat: 'SPD', current: stats.SPD, key: 'spd' }
    ];

    const statButtons1 = new ActionRowBuilder();
    const statButtons2 = new ActionRowBuilder();
    
    let description = `**ĐIỂM CÒN LẠI: ${statPoints}**\n\n`;
    
    fields.forEach((f, i) => {
        description += `${f.emoji} ${f.stat}: **${f.current}**\n`;
        const btn = new ButtonBuilder().setCustomId(`inv_upgrade_stat_${f.key}_${petIndex}`).setLabel(`+1 ${f.stat}`).setStyle(ButtonStyle.Primary).setDisabled(statPoints === 0);
        if (i < 3) statButtons1.addComponents(btn);
        else statButtons2.addComponents(btn);
    });

    const resetRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`inv_reset_stats_${petIndex}`).setLabel(`🔄 Reset Chỉ số (${RESET_COST_CANDY} 🍭)`).setStyle(ButtonStyle.Danger).setDisabled(userData.inventory.candies.high < RESET_COST_CANDY)
    );

    const rowBack = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`inv_show_details_${petIndex}`).setLabel('⬅️ Quay lại').setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({
        content: `**NÂNG CẤP CHỈ SỐ CHO ${pet.icon} ${pet.name.toUpperCase()}**\n\n${description}`,
        embeds: [],
        components: [statButtons1, statButtons2, resetRow, rowBack]
    });
}

// ✅ FIX ERROR 50035 Ở ĐÂY - CHỈ CẦN 1 STRING SELECT MENU ĐỂ CHỌN SÁCH VÀ SLOT
export async function showSkillLearnMenu(interaction, petIndex) {
    await safeDefer(interaction);

    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const petData = userData.pets[petIndex];
    const pet = new Pet(petData);
    const invSkillBooks = userData.inventory.skillbooks || {};
    const petRarityInfo = RARITY_CONFIG[pet.rarity] || RARITY_CONFIG['Common'];
    const petRarity = petRarityInfo.icon + ' ' + pet.rarity;

    let skillDesc = pet.skills.map((sid, index) => { // <-- ĐÃ SỬA LỖI CÚ PHÁP Ở ĐÂY
        const skill = getSkillById(sid);
        return `**[Slot ${index + 1}]** ${skill?.name || 'Unknown'} (\`${sid}\`)`;
    }).join('\n') || '*Chưa có skill nào.*';
    
    skillDesc = `**SKILL ĐANG CÓ (Slot ${pet.skills.length}/4):**\n${skillDesc}`;
    if (pet.skills.length < 4) skillDesc += `\n**[Slot ${pet.skills.length + 1}]** *Slot trống...*`;
    
    // *****************************************************************
    // ⚡️ TỐI ƯU/FIX: Gộp Select Menu để tránh lỗi Invalid Form Body
    // Dùng 1 Select Menu duy nhất với format value: bookKey-slotIndex
    // *****************************************************************
    let learnOptions = [];
    let hasValidBook = false;

    // Lặp qua các sách skill người chơi có
    for (const key in SKILLBOOK_CONFIG) {
        const book = SKILLBOOK_CONFIG[key];
        const count = invSkillBooks[key] || 0;
        
        if (count > 0) {
            const petRank = RARITY_CONFIG[pet.rarity]?.rank || 1;
            const bookRank = RARITY_CONFIG[book.rarity]?.rank || 1;
            const canUse = petRank >= bookRank;
            
            if (canUse) hasValidBook = true;

            // Lặp qua các slot của Pet (tối đa 4 slot)
            const availableSlots = pet.skills.length < 4 ? pet.skills.length + 1 : 4;

            for (let i = 0; i < availableSlots; i++) {
                const isNewSlot = i === pet.skills.length;
                const skillToReplace = pet.skills[i] ? getSkillById(pet.skills[i])?.name : 'Trống';
                
                const label = isNewSlot 
                    ? `Học mới (${book.rarity}) [Còn ${count}]`
                    : `Thay thế Slot ${i+1} (${skillToReplace}) [Còn ${count}]`;
                
                const description = canUse
                    ? `Dùng sách ${book.name} để ${isNewSlot ? 'học skill mới' : 'thay thế skill cũ'}.`
                    : `Rank Pet quá thấp (${pet.rarity})!`;

                learnOptions.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${book.icon} ${book.name} - ${label}`)
                        .setValue(`${key}-${i}`) // Format: bookKey-slotIndex
                        .setDescription(description)
                        .setDisabled(!canUse || (book.skillId === pet.skills[i] && !isNewSlot)) // Không học skill đang có
                );
            }
        }
    }
    
    let components = [];

    if (learnOptions.length > 0 && hasValidBook) {
        const rowSelectLearn = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`inv_learn_select_${petIndex}`) // ID chung cho Select Menu
                .setPlaceholder('Chọn Sách và Vị trí Skill để Học/Thay thế...')
                .addOptions(learnOptions)
        );
        components.push(rowSelectLearn);
    } else {
         skillDesc += `\n\n*🚫 Bạn không có sách kỹ năng nào phù hợp trong túi đồ.*`;
    }

    const rowBack = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`inv_show_details_${petIndex}`).setLabel('⬅️ Quay lại').setStyle(ButtonStyle.Secondary)
    );
    components.push(rowBack);

    await interaction.editReply({
        content: `**HỌC KỸ NĂNG CHO ${pet.icon} ${pet.name.toUpperCase()}** (Rank Pet: ${petRarity})\n\n${skillDesc}`,
        embeds: [],
        components: components
    });
}

// ==========================================
// 4. LOGIC XỬ LÝ HÀNH ĐỘNG
// ==========================================

export async function handleFeed(interaction, petIndex, candyType) {
    await safeDefer(interaction);
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const petData = userData.pets[petIndex];
    const pet = new Pet(petData);
    let successMessage = "";
    const candyConfig = CANDY_CONFIG[candyType];
    
    if (userData.inventory.candies[candyType] <= 0) {
        successMessage = `🚫 Bạn không còn ${candyConfig.name}.`;
    } else if (pet.level >= MAX_PET_LEVEL) {
         successMessage = `🚫 ${pet.name} đã đạt cấp độ tối đa!`;
    } else {
        userData.inventory.candies[candyType]--;
        const leveledUp = pet.addExp(candyConfig.exp, POINTS_PER_LEVEL);
        userData.pets[petIndex] = pet.getDataForSave(); 
        Database.updateUser(userId, userData);
        successMessage = `✅ Đã cho ${pet.icon} **${pet.name}** ăn ${candyConfig.name}.\nĐạt được **+${candyConfig.exp} XP**.`;
        if (leveledUp) successMessage += `\n🎉 **${pet.name}** đã lên cấp **Lv.${pet.level}!** (Nhận ${POINTS_PER_LEVEL} điểm)`;
    }
    // ⚡️ ĐÃ FIX: ephemeral: true -> flags
    await interaction.followUp({ content: successMessage, flags: MessageFlags.Ephemeral });
    await showPetDetails(interaction, petIndex); 
}

export async function handleStatUpgrade(interaction, petIndex, statKey) {
    await safeDefer(interaction);
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const petData = userData.pets[petIndex];
    const pet = new Pet(petData);
    
    if ((pet.statPoints || 0) <= 0) {
        // ⚡️ ĐÃ FIX: ephemeral: true -> flags
        await interaction.followUp({ content: `🚫 ${pet.name} không có điểm nâng cấp.`, flags: MessageFlags.Ephemeral });
        return showStatUpgradeMenu(interaction, petIndex);
    }
    
    pet.incrementStat(statKey); 
    pet.statPoints -= 1;
    userData.pets[petIndex] = pet.getDataForSave(); 
    Database.updateUser(userId, userData);

    // ⚡️ ĐÃ FIX: ephemeral: true -> flags
    await interaction.followUp({ content: `✅ Đã nâng **+1 ${statKey.toUpperCase()}** cho ${pet.name}.`, flags: MessageFlags.Ephemeral });
    await showStatUpgradeMenu(interaction, petIndex); 
}

export async function handleStatReset(interaction, petIndex) {
    await safeDefer(interaction);
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const petData = userData.pets[petIndex];
    const pet = new Pet(petData);

    if (userData.inventory.candies.high < RESET_COST_CANDY) {
        // ⚡️ ĐÃ FIX: ephemeral: true -> flags
        await interaction.followUp({ content: `🚫 Bạn cần ${RESET_COST_CANDY} 🍭 Kẹo cao cấp để đặt lại!`, flags: MessageFlags.Ephemeral });
        return showStatUpgradeMenu(interaction, petIndex);
    }
    
    const pointsReturned = pet.resetStats(); 
    userData.inventory.candies.high -= RESET_COST_CANDY;
    pet.statPoints += pointsReturned; 
    
    userData.pets[petIndex] = pet.getDataForSave(); 
    Database.updateUser(userId, userData);

    // ⚡️ ĐÃ FIX: ephemeral: true -> flags
    await interaction.followUp({ content: `🔄 **ĐẶT LẠI THÀNH CÔNG!** Hoàn lại **${pointsReturned}** điểm.`, flags: MessageFlags.Ephemeral });
    await showStatUpgradeMenu(interaction, petIndex);
}

// ⚡️ CHỈNH SỬA TÊN HÀM NÀY ĐỂ TRÁNH TRÙNG LẶP LOGIC Ở CommandHandlers
export async function processLearnSkillSelection(interaction, petIndex, selectionValue) {
    // SelectionValue có format: bookKey-slotIndex
    const [bookKey, slotIndexStr] = selectionValue.split('-');
    const slotIndex = parseInt(slotIndexStr);
    
    // Gọi hàm logic chính
    await handleSkillLearn(interaction, petIndex, bookKey, slotIndex);
}

export async function handleSkillLearn(interaction, petIndex, bookKey, slotIndex) {
    await safeDefer(interaction);
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const petData = userData.pets[petIndex];
    const pet = new Pet(petData);
    const bookConfig = SKILLBOOK_CONFIG[bookKey];
    const skillId = bookConfig.skillId;
    const invSkillBooks = userData.inventory.skillbooks || {};
    let successMessage = "";
    
    const petRarityRank = RARITY_CONFIG[pet.rarity]?.rank || 1; 
    const bookRarityRank = RARITY_CONFIG[bookConfig.rarity]?.rank || 1;
    
    if (invSkillBooks[bookKey] <= 0) {
        successMessage = `🚫 Bạn không có ${bookConfig.name}.`;
    } else if (pet.skills.includes(skillId) && slotIndex < pet.skills.length && pet.skills[slotIndex] === skillId) {
        // Kiểm tra xem skill đã học có phải là skill đang cố gắng thay thế không
        successMessage = `🚫 ${pet.name} đã học skill này ở Slot ${slotIndex + 1}.`;
    } else if (slotIndex > pet.skills.length || slotIndex >= 4 || slotIndex < 0) { 
        successMessage = `🚫 Vị trí skill không hợp lệ.`;
    } else if (petRarityRank < bookRarityRank) {
        successMessage = `🚫 Rank Pet (${pet.rarity}) quá thấp để học sách ${bookConfig.rarity} này.`;
    } else {
        userData.inventory.skillbooks[bookKey]--;
        pet.learnSkill(skillId, slotIndex); 
        userData.pets[petIndex] = pet.getDataForSave(); 
        Database.updateUser(userId, userData);
        
        const action = slotIndex < pet.skills.length ? 'thay thế' : 'học mới';
        successMessage = `✅ **${pet.name}** đã ${action} Skill: **${bookConfig.name}** ở Slot ${slotIndex + 1}!`;
    }
    // ⚡️ ĐÃ FIX: ephemeral: true -> flags
    await interaction.followUp({ content: successMessage, flags: MessageFlags.Ephemeral });
    await showSkillLearnMenu(interaction, petIndex); 
}