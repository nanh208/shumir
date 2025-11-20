// InventoryUI.js (FINAL VERSION - TÍCH HỢP PET LIST & PET INFO VÀ CHỌN TRỰC TIẾP BẰNG BUTTON)
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { Database } from './Database.mjs';
import { Pet } from './Pet.mjs'; 
import { getSkillById } from './SkillList.mjs'; 
import { RARITY_CONFIG } from './Constants.mjs';

const ITEMS_PER_PAGE = 5; // Số pet hiển thị mỗi trang
const MAX_PET_LEVEL = 100; // Cấp độ Pet tối đa
const POINTS_PER_LEVEL = 3; // 3 điểm Stat Points mỗi level up

// --- CONFIG CÁC LOẠI KẸO VÀ SKILLBOOK ---
const CANDY_CONFIG = {
    'normal': { name: 'Kẹo thường 🍬', exp: 50 },
    'high': { name: 'Kẹo cao cấp 🍭', exp: 200 }
};

const SKILLBOOK_CONFIG = {
    'S_Fire': { name: 'Sách Lửa 🔥', skillId: 'S2', rarity: 'Rare', icon: '🔥' }, 
    'S_Heal': { name: 'Sách Hồi Máu 💖', skillId: 'S3', rarity: 'Common', icon: '💖' },
    'S_Epic': { name: 'Sách Sử Thi ✨', skillId: 'S4', rarity: 'Epic', icon: '✨' }
};

// ==========================================
// 1. GIAO DIỆN CHÍNH (TÚI ĐỒ VÀ DANH SÁCH PET)
// ==========================================

export async function showInventory(interaction, page = 0) {
    // ⚠️ FIX LỖI NAN: Đảm bảo page luôn là số nguyên
    page = parseInt(page) || 0; 
    
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const pets = userData.pets;
    const inv = userData.inventory;
    
    inv.skillbooks = inv.skillbooks || {}; 

    // 1. Xây dựng mô tả Vật phẩm
    let itemDesc = "—---------------------------------------\n";
    itemDesc += `**KẸO KINH NGHIỆM:**\n`;
    itemDesc += `🍬 Kẹo thường: **${inv.candies.normal}** (Tăng ${CANDY_CONFIG.normal.exp} XP)\n`;
    itemDesc += `🍭 Kẹo cao cấp: **${inv.candies.high}** (Tăng ${CANDY_CONFIG.high.exp} XP)\n`;
    
    itemDesc += `\n**SÁCH KỸ NĂNG:**\n`;
    let hasSkillBook = false;
    for (const key in SKILLBOOK_CONFIG) {
        if (inv.skillbooks[key] > 0) {
            hasSkillBook = true;
            const skillName = getSkillById(SKILLBOOK_CONFIG[key].skillId)?.name || 'Skill';
            itemDesc += `📖 ${SKILLBOOK_CONFIG[key].name} (${skillName}): **${inv.skillbooks[key]}**\n`;
        }
    }
    if (!hasSkillBook) {
        itemDesc += `*Chưa có sách kỹ năng.*\n`;
    }
    
    itemDesc += `\n**VẬT PHẨM KHÁC:**\n`;
    itemDesc += `📦 Hòm Thường: **${inv.crates.common || 0}**\n`;
    itemDesc += "—----------------------------------------\n";


    // 2. Thông tin Danh sách Pet (Pet List)
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
            // Hiển thị Pet ID ngắn gọn
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

    // 3. Tạo nút điều hướng và Nút CHỌN PET (Tích hợp)
    
    // 3a. Hàng Điều hướng trang
    const rowNav = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`inv_prev_${page}`)
            .setLabel('◀️ Trang trước')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0), 
        new ButtonBuilder()
            .setCustomId('inv_refresh')
            .setLabel('🔄 Làm mới')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`inv_next_${page}`)
            .setLabel('Trang sau ▶️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1 || totalPages === 0)
    );
    
    // 3b. Hàng nút Pet hiện tại (Mỗi hàng 5 nút)
    let components = [rowNav];

    if (pets.length > 0) {
        const petButtons = new ActionRowBuilder();
        currentPets.forEach((petData, index) => {
            const absoluteIndex = start + index;
            const pet = new Pet(petData);
            
            petButtons.addComponents(
                new ButtonBuilder()
                    .setCustomId(`inv_show_details_${absoluteIndex}`)
                    .setLabel(`${pet.icon} ${pet.name} Lv.${pet.level}`)
                    .setStyle(ButtonStyle.Primary)
            );
        });
        components.push(petButtons);
    }


    const payload = { embeds: [embed], components: components };
    
    // Nếu tương tác là một button trong Inventory, ta update
    if (interaction.message && interaction.customId && (interaction.customId.startsWith('inv_') || interaction.customId === 'inv_refresh')) {
        await interaction.update(payload);
    } else {
        // Nếu là lệnh /inventory mới, ta reply ephemeral
        await interaction.reply({ ...payload, ephemeral: true });
    }
}

// -------------------------------------------------------------
// *HÀM THAY THẾ CHO SELECT PET VÀ ĐIỀU HƯỚNG*
// -------------------------------------------------------------


export async function showPetDetails(interaction, petIndex) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const pets = userData.pets;
    const petData = pets[petIndex];
    
    if (!petData) {
        return interaction.reply({ content: "🚫 Pet không hợp lệ.", ephemeral: true });
    }
    
    const pet = new Pet(petData);
    const stats = pet.getStats();
    
    // ĐIỂM MỚI: Lượng máu còn lại và Stat Points
    const currentHP = pet.currentHP || stats.HP;
    const currentMP = pet.currentMP || stats.MP;
    const statPoints = pet.statPoints || 0;

    const currentExp = pet.currentExp || 0;
    const expToNextLevel = pet.getExpToNextLevel();
    
    // Lấy rank của Pet (cần RARITY_CONFIG)
    const petRarityInfo = RARITY_CONFIG[pet.rarity];
    const petRarity = petRarityInfo ? petRarityInfo.icon + ' ' + pet.rarity : petRarityInfo.name;

    // 1. Xây dựng Embed thông tin Pet
    const skillList = pet.skills.map(sid => {
        const skill = getSkillById(sid);
        return `\`${sid}\` ${skill?.name || 'Unknown'}`;
    }).join(', ') || '*Chưa có skill nào.*';

    const embed = new EmbedBuilder()
        .setTitle(`✨ [Lv.${pet.level}] ${pet.icon} ${pet.name.toUpperCase()}`)
        .setDescription(
            `**Hạng:** ${petRarity} | **Gen:** ${pet.gen}/100 🧬 | **Hệ:** ${pet.element}\n` +
            `**XP:** ${currentExp} / ${expToNextLevel} (${(currentExp / expToNextLevel * 100).toFixed(1)}%)`
        )
        .addFields(
            { 
                name: '❤️ Máu & MP', 
                value: `HP: **${Math.round(currentHP)}/${stats.HP}** | MP: **${Math.round(currentMP)}/${stats.MP}**`,
                inline: false 
            },
            {
                name: '📊 Chỉ số Chiến đấu', 
                value: `⚔️ ATK: **${stats.ATK}** | 🪄 SATK: **${stats.SATK || stats.MATK || 0}**\n` + 
                       `🛡️ DEF: **${stats.DEF}** | ⚡ SPD: **${stats.SPD}**`,
                inline: true 
            },
            {
                name: '🎓 Kỹ năng',
                value: skillList,
                inline: true
            },
            {
                name: `🔥 Điểm nâng cấp còn lại: ${statPoints}`,
                value: statPoints > 0 ? `*Sử dụng nút "Nâng cấp chỉ số" bên dưới.*` : `*Lên cấp để nhận thêm ${POINTS_PER_LEVEL} điểm.*`,
                inline: false
            }
        )
        .setColor(0x3498DB);

    // 2. Tạo nút hành động chính
    const rowActions = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`inv_menu_feed_${petIndex}`) // Chuyển đến menu cho ăn
            .setLabel('🍬 Cho Pet Ăn (XP)')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`inv_menu_stats_${petIndex}`) // Chuyển đến menu nâng cấp chỉ số
            .setLabel('⬆️ Nâng cấp Chỉ số')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(statPoints === 0), // Chỉ cho phép nâng cấp khi có điểm
        new ButtonBuilder()
            .setCustomId(`inv_menu_learn_${petIndex}`) // Chuyển đến menu học skill
            .setLabel('📚 Học Kỹ năng')
            .setStyle(ButtonStyle.Success)
    );

    // 3. Nút Quay lại
    const rowBack = new ActionRowBuilder().addComponents(
         new ButtonBuilder()
            .setCustomId(`inv_to_main_0`) 
            .setLabel('⬅️ Quay lại Túi đồ')
            .setStyle(ButtonStyle.Secondary)
    );

    const payload = { embeds: [embed], components: [rowActions, rowBack], ephemeral: true };
    
    // Nếu tương tác là nút Pet chi tiết, Feed, Stat, Learn, ta update
    if (interaction.customId.startsWith('inv_show_details_') || interaction.customId.startsWith('inv_menu_')) {
        await interaction.update(payload);
    } else {
        await interaction.reply(payload);
    }
}

// ==========================================
// 3. CÁC SUB-MENU NÂNG CẤP
// ==========================================

export async function showFeedMenu(interaction, petIndex) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const petData = userData.pets[petIndex];
    const pet = new Pet(petData);
    
    if (pet.level >= MAX_PET_LEVEL) {
        return interaction.reply({ content: `🚫 ${pet.name} đã đạt cấp độ tối đa (${MAX_PET_LEVEL})!`, ephemeral: true });
    }

    const canUseNormalCandy = userData.inventory.candies.normal > 0;
    const canUseHighCandy = userData.inventory.candies.high > 0;

    const rowCandy = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`inv_feed_normal_${petIndex}`)
            .setLabel(`🍬 Kẹo thường (${CANDY_CONFIG.normal.exp} XP)`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(!canUseNormalCandy),
        new ButtonBuilder()
            .setCustomId(`inv_feed_high_${petIndex}`)
            .setLabel(`🍭 Kẹo cao cấp (${CANDY_CONFIG.high.exp} XP)`)
            .setStyle(ButtonStyle.Danger)
            .setDisabled(!canUseHighCandy)
    );
    
    const rowBack = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
           .setCustomId(`inv_show_details_${petIndex}`) 
           .setLabel('⬅️ Quay lại Pet Info')
           .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
        content: `**CHO ${pet.icon} ${pet.name.toUpperCase()} ĂN:**\nXP hiện tại: ${pet.currentExp || 0}/${pet.getExpToNextLevel()}`,
        embeds: [],
        components: [rowCandy, rowBack],
        ephemeral: true
    });
}

export async function showStatUpgradeMenu(interaction, petIndex) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const petData = userData.pets[petIndex];
    const pet = new Pet(petData);
    const statPoints = pet.statPoints || 0;
    const stats = pet.getStats();

    if (statPoints <= 0) {
        // Nếu không còn điểm, chuyển về menu Pet Info
        await interaction.update({ content: `🚫 ${pet.name} không có điểm nâng cấp.`, embeds: [], components: [], ephemeral: true });
        return showPetDetails(interaction, petIndex);
    }
    
    const fields = [
        { emoji: '❤️', stat: 'HP', current: stats.HP, key: 'hp' },
        { emoji: '⚔️', stat: 'ATK', current: stats.ATK, key: 'atk' },
        { emoji: '🪄', stat: 'SATK', current: stats.SATK || stats.MATK || 0, key: 'satk' },
        { emoji: '🛡️', stat: 'DEF', current: stats.DEF, key: 'def' },
        { emoji: '⚡', stat: 'SPD', current: stats.SPD, key: 'spd' }
    ];

    const statButtons = new ActionRowBuilder();
    
    let description = `**ĐIỂM CÒN LẠI: ${statPoints}**\n\n`;
    
    fields.forEach(f => {
        description += `${f.emoji} ${f.stat}: **${f.current}**\n`;
        statButtons.addComponents(
            new ButtonBuilder()
                .setCustomId(`inv_upgrade_stat_${f.key}_${petIndex}`)
                .setLabel(`+1 ${f.stat}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(statPoints === 0)
        );
    });

    const rowBack = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
           .setCustomId(`inv_show_details_${petIndex}`) 
           .setLabel('⬅️ Quay lại Pet Info')
           .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
        content: `**NÂNG CẤP CHỈ SỐ CHO ${pet.icon} ${pet.name.toUpperCase()}**\n\n${description}`,
        embeds: [],
        components: [statButtons, rowBack],
        ephemeral: true
    });
}

export async function showSkillLearnMenu(interaction, petIndex) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const petData = userData.pets[petIndex];
    const pet = new Pet(petData);
    
    const invSkillBooks = userData.inventory.skillbooks || {};
    // Lấy Rank của Pet (giả định RARITY_CONFIG có rank số)
    const petRarityRank = RARITY_CONFIG[pet.rarity].rank; 
    const petRarity = RARITY_CONFIG[pet.rarity].icon + ' ' + pet.rarity;

    // 1. Hiển thị Skill hiện tại
    let skillDesc = pet.skills.map((sid, index) => {
        const skill = getSkillById(sid);
        return `**[Slot ${index + 1}]** ${skill?.name || 'Unknown'} (\`${sid}\`)`;
    }).join('\n');
    
    skillDesc = `**SKILL ĐANG CÓ (Slot ${pet.skills.length}/4):**\n${skillDesc}`;
    if (pet.skills.length < 4) {
        skillDesc += `\n**[Slot ${pet.skills.length + 1}]** *Slot trống...*`;
    }
    
    let bookOptions = [];
    
    // 2. Tạo nút cho Sách Skill
    for (const key in SKILLBOOK_CONFIG) {
        const book = SKILLBOOK_CONFIG[key];
        const count = invSkillBooks[key] || 0;
        const bookRarityRank = RARITY_CONFIG[book.rarity].rank;
        
        // RÀNG BUỘC: Không thể học sách rank cao hơn Pet
        const canUse = count > 0 && petRarityRank >= bookRarityRank;
        const isTooHighRank = petRarityRank < bookRarityRank;
        
        if (count > 0) {
            bookOptions.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${book.icon} ${book.name} (${book.rarity}) [Còn ${count}]`)
                    .setValue(key)
                    .setDescription(isTooHighRank ? `Rank Pet (${pet.rarity}) quá thấp!` : `Sử dụng để học skill`)
                    .setDisabled(!canUse)
            );
        }
    }
    
    // 3. Tạo Menu Chọn Sách
    const rowSelectBook = new ActionRowBuilder();
    if (bookOptions.length > 0) {
        rowSelectBook.addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`inv_select_book_${petIndex}`)
                .setPlaceholder('1. Chọn Sách Skill muốn dùng...')
                .addOptions(bookOptions)
        );
    } else {
         skillDesc += `\n\n*🚫 Bạn không có sách kỹ năng nào phù hợp.*`;
    }
    
    // 4. Tạo Nút Chọn Slot
    const slotOptions = pet.skills.map((sid, index) => {
        const skill = getSkillById(sid);
        return new StringSelectMenuOptionBuilder()
            .setLabel(`Slot ${index + 1}: ${skill?.name || 'Unknown'} (Thay thế)`)
            .setValue(`${index}`); // Lưu index (0-3)
    }).concat(pet.skills.length < 4 ? [new StringSelectMenuOptionBuilder().setLabel(`Slot ${pet.skills.length + 1}: (Học mới)`).setValue(`${pet.skills.length}`)] : []);
    
    const rowSelectSlot = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`inv_select_slot_${petIndex}`)
            .setPlaceholder('2. Chọn Vị trí Skill muốn thay thế/học...')
            .addOptions(slotOptions)
    );

    const rowBack = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
           .setCustomId(`inv_show_details_${petIndex}`) 
           .setLabel('⬅️ Quay lại Pet Info')
           .setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({
        content: `**HỌC KỸ NĂNG CHO ${pet.icon} ${pet.name.toUpperCase()}** (Rank Pet: ${petRarity})\n\n${skillDesc}`,
        embeds: [],
        components: [rowSelectBook, rowSelectSlot, rowBack],
        ephemeral: true
    });
}

// ==========================================
// 4. LOGIC XỬ LÝ HÀNH ĐỘNG
// ==========================================

// Hàm xử lý cho ăn (XP)
export async function handleFeed(interaction, petIndex, candyType) {
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
        // TRỪ ITEM VÀ THỰC HIỆN NÂNG CẤP
        userData.inventory.candies[candyType]--;
        
        const leveledUp = pet.addExp(candyConfig.exp, POINTS_PER_LEVEL);
        
        userData.pets[petIndex] = pet.getDataForSave(); 
        Database.updateUser(userId, userData);

        successMessage = `✅ Đã cho ${pet.icon} **${pet.name}** ăn ${candyConfig.name}.\nĐạt được **+${candyConfig.exp} XP**.`;
        if (leveledUp) {
            successMessage += `\n🎉 **${pet.name}** đã lên cấp **Lv.${pet.level}!** (Nhận ${POINTS_PER_LEVEL} điểm)`;
        }
    }

    await interaction.followUp({ content: successMessage, ephemeral: true });
    // Quay lại menu Pet Info sau khi cho ăn
    await showPetDetails(interaction, petIndex); 
}

// Hàm xử lý nâng cấp chỉ số
export async function handleStatUpgrade(interaction, petIndex, statKey) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const petData = userData.pets[petIndex];
    const pet = new Pet(petData);
    
    if ((pet.statPoints || 0) <= 0) {
        return interaction.reply({ content: `🚫 ${pet.name} không có điểm nâng cấp.`, ephemeral: true });
    }
    
    // THỰC HIỆN NÂNG CẤP
    pet.incrementStat(statKey); 
    pet.statPoints -= 1;
    
    // Cập nhật Pet Data
    userData.pets[petIndex] = pet.getDataForSave(); 
    Database.updateUser(userId, userData);

    await interaction.reply({ content: `✅ Đã nâng **+1 ${statKey.toUpperCase()}** cho ${pet.name}.`, ephemeral: true });
    // Quay lại menu nâng cấp chỉ số để tiếp tục dùng điểm
    await showStatUpgradeMenu(interaction, petIndex); 
}

// Hàm xử lý học skill (Sử dụng Select Menu cho cả Book và Slot)
export async function handleSkillLearn(interaction, petIndex, bookKey, slotIndex) {
    const userId = interaction.user.id;
    const userData = Database.getUser(userId);
    const petData = userData.pets[petIndex];
    const pet = new Pet(petData);
    
    const bookConfig = SKILLBOOK_CONFIG[bookKey];
    const skillId = bookConfig.skillId;
    const invSkillBooks = userData.inventory.skillbooks || {};

    let successMessage = "";
    
    // Kiểm tra Rank
    const petRarityRank = RARITY_CONFIG[pet.rarity].rank; 
    const bookRarityRank = RARITY_CONFIG[bookConfig.rarity].rank;
    
    if (invSkillBooks[bookKey] <= 0) {
        successMessage = `🚫 Bạn không có ${bookConfig.name}.`;
    } else if (pet.skills.includes(skillId) && slotIndex < pet.skills.length) {
        successMessage = `🚫 ${pet.name} đã học skill này ở slot khác.`;
    } else if (slotIndex >= 4) { 
        successMessage = `🚫 Vị trí skill không hợp lệ (Max 4 slots).`;
    } else if (petRarityRank < bookRarityRank) {
        successMessage = `🚫 Rank Pet (${pet.rarity}) quá thấp để học sách ${bookConfig.rarity}.`;
    } else {
        // THỰC HIỆN HỌC SKILL
        userData.inventory.skillbooks[bookKey]--;
        pet.learnSkill(skillId, slotIndex); // Giả định Pet.learnSkill(id, index)
        
        userData.pets[petIndex] = pet.getDataForSave(); 
        Database.updateUser(userId, userData);

        const slotName = slotIndex < pet.skills.length ? `Slot ${slotIndex + 1} (Thay thế)` : `Slot ${slotIndex + 1} (Mới)`;
        successMessage = `✅ **${pet.name}** đã học thành công Skill: **${bookConfig.name}** vào ${slotName}!`;
    }

    await interaction.followUp({ content: successMessage, ephemeral: true });
    // Quay lại menu học skill
    await showSkillLearnMenu(interaction, petIndex); 
}