// CommandHandlers.js (Chuyển đổi hoàn toàn sang CommonJS)

const fs = require('fs');
const path = require('path');
const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    MessageFlags
} = require('discord.js');

// --- Khai báo các biến cho các module ESM (.mjs) ---
let DatabaseModule;
let SpawnModule;
let InventoryUI;
let GameLogicModule;
let PetModule;

// --- Khai báo các biến nội bộ ---
const CODES_FILE = './data/pet-codes.json';
let spawnSystemRef = null;
let geminiAI = null; 

// --- Hàm Setter (Để index.js truyền các module ESM vào) ---
module.exports.initESMModules = (modules) => {
    DatabaseModule = modules.Database;
    SpawnModule = modules.Spawn;
    InventoryUI = modules.InventoryUI;
    GameLogicModule = modules.GameLogic;
    PetModule = modules.Pet; 
    // Gán các module cần thiết khác tại đây nếu có
};

// --- Getters và Setters ---

module.exports.setSpawnSystemRef = function(ref) { spawnSystemRef = ref; };

module.exports.setAIClientRef = function(ref) { 
    geminiAI = ref; 
    console.log("✅ Gemini AI Client đã được thiết lập cho CommandHandlers.");
};


/**
 * Xử lý các Slash Command (/setup_spawn, /inventory, v.v.)
 */
module.exports.handleSlashCommand = async function(interaction) {
    const { commandName, options, user } = interaction;
    const Database = DatabaseModule.Database; 

    // --- 1. LỆNH: /setup_spawn ---
    if (commandName === 'setup_spawn') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            // ⚡️ ĐÃ FIX: ephemeral: true -> flags
            return interaction.reply({ content: "🚫 Cần quyền Administrator! (Administrator permission required)", flags: MessageFlags.Ephemeral });
        }
        const channel = options.getChannel('channel');
        Database.setSpawnChannel(channel.id);
        if (spawnSystemRef) spawnSystemRef.updateChannel(channel.id);
        // ⚡️ ĐÃ FIX: ephemeral: true -> flags
        return interaction.reply({ content: `✅ Đã cài đặt kênh ${channel} làm khu vực Spawn! (Set ${channel} as the Spawn channel!)`, flags: MessageFlags.Ephemeral });
    }

    // --- 2. LỆNH: /inventory ---
    if (commandName === 'inventory') {
        // ⚡️ ĐÃ XÓA TOÀN BỘ LOGIC TẠO LORE BẰNG GEMINI ĐỂ TRÁNH TIMEOUT/NGHẼN
        
        // Gọi hàm từ file InventoryUI.mjs thông qua namespace
        await InventoryUI.showInventory(interaction, 0);
    }
    
    // --- 3. LỆNH: /adventure ---
    if (commandName === 'adventure') {
        const embed = new EmbedBuilder()
            .setTitle("⚔️ CHỌN ĐỘ KHÓ ẢI (Choose Difficulty)")
            .setDescription("Hãy chọn cấp độ thử thách:")
            .setColor(0xFF6600);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('adv_easy').setLabel('🟢 Dễ (Easy)').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('adv_hard').setLabel('🟡 Khó (Hard)').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('adv_nightmare').setLabel('🔴 Ác Mộng (Nightmare)').setStyle(ButtonStyle.Danger)
        );
        // ⚡️ ĐÃ FIX: ephemeral: true -> flags
        await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
    }

    // --- 4. LỆNH: /code ---
    if (commandName === 'code') {
        const inputCode = options.getString('code'); 
        // ⚡️ ĐÃ FIX: ephemeral: true -> flags
        if (!inputCode) return interaction.reply({ content: "Nhập mã code! (Enter code!)", flags: MessageFlags.Ephemeral });

        let codesData = {};
        try {
            if (fs.existsSync(CODES_FILE)) codesData = JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
        // ⚡️ ĐÃ FIX: ephemeral: true -> flags
        } catch (e) { return interaction.reply({ content: "Lỗi đọc dữ liệu. (Data reading error.)", flags: MessageFlags.Ephemeral }); }

        const reward = codesData[inputCode];
        const userData = Database.getUser(user.id);

        // ⚡️ ĐÃ FIX: ephemeral: true -> flags
        if (!reward) return interaction.reply({ content: "🚫 Mã không hợp lệ! (Invalid code!)", flags: MessageFlags.Ephemeral });
        // ⚡️ ĐÃ FIX: ephemeral: true -> flags
        if (userData.codesRedeemed?.includes(inputCode)) return interaction.reply({ content: "⚠️ Đã dùng mã này! (Code already redeemed!)", flags: MessageFlags.Ephemeral });

        let rewardMsg = `🎉 **THÀNH CÔNG! (SUCCESS!)**\n`;
        if (reward.items?.candies) {
            userData.inventory.candies.normal += (reward.items.candies || 0);
            rewardMsg += `- 🍬 ${reward.items.candies} Kẹo thường (Normal Candies)\n`;
        }
        if (reward.pet) {
            const newPet = GameLogicModule.spawnWildPet(true); 
            newPet.ownerId = user.id;
            if (reward.pet.name) newPet.name = reward.pet.name;
            Database.addPetToUser(user.id, newPet.getDataForSave());
            rewardMsg += `- 🐾 Pet: **${newPet.name}**\n`;
        }

        if (!userData.codesRedeemed) userData.codesRedeemed = [];
        userData.codesRedeemed.push(inputCode);
        Database.updateUser(user.id, userData);

        if (reward.limit) {
            reward.limit--;
            if (reward.limit <= 0) delete codesData[inputCode];
            else codesData[inputCode] = reward;
            fs.writeFileSync(CODES_FILE, JSON.stringify(codesData, null, 2), 'utf8');
        }
        // ⚡️ ĐÃ FIX: ephemeral: true -> flags
        return interaction.reply({ content: rewardMsg, flags: MessageFlags.Ephemeral });
    }
};

/**
 * Xử lý các Nút bấm (Buttons)
 */
module.exports.handleButtons = async function(interaction) {
    const { customId } = interaction;
    const isSelectMenu = interaction.isStringSelectMenu();

    // Xử lý các nút Inventory (bắt đầu bằng inv_)
    if (customId.startsWith('inv_')) {
        const parts = customId.split('_');
        // Lấy phần tử cuối cùng làm index hoặc page
        let petIndex = parseInt(parts[parts.length - 1]); 
        if (isNaN(petIndex)) petIndex = 0; 

        const actionType = parts[1]; // prev, next, menu, feed, upgrade, show, vault...

        // 1. Điều hướng trang chính (inv_prev_*, inv_next_*, inv_refresh, inv_to_main_0)
        if (actionType === 'prev' || actionType === 'next' || customId === 'inv_refresh' || customId === 'inv_to_main_0') {
            let page = 0;
            if (actionType === 'prev') page = Math.max(0, petIndex - 1); 
            if (actionType === 'next') page = petIndex + 1;
            
            return InventoryUI.showInventory(interaction, page);
        }
        
        // 2. Mở Kho Pet (Vault)
        if (customId.startsWith('inv_menu_vault_')) {
            // Đây là nút chuyển menu, dùng update
            return InventoryUI.showPetVault(interaction, petIndex); 
        }
        
        // 3. Điều hướng trong Kho Pet (inv_vault_prev/next_*)
        if (customId.startsWith('inv_vault_')) {
            const subAction = parts[2]; // prev, next
            let page = 0;
            if (subAction === 'prev') page = Math.max(0, petIndex - 1); 
            if (subAction === 'next') page = petIndex + 1;
            return InventoryUI.showPetVault(interaction, page);
        }

        // 4. Xem chi tiết Pet
        if (customId.startsWith('inv_show_details_')) {
            // Nút Pet Name, chuyển sang Details
            return InventoryUI.showPetDetails(interaction, petIndex);
        }

        // 5. Chuyển các Menu phụ (Feed, Stats, Learn)
        if (actionType === 'menu') {
            const menuType = parts[2];
            if (menuType === 'feed') return InventoryUI.showFeedMenu(interaction, petIndex);
            if (menuType === 'stats') return InventoryUI.showStatUpgradeMenu(interaction, petIndex);
            if (menuType === 'learn') return InventoryUI.showSkillLearnMenu(interaction, petIndex);
        }
        
        // 6. Thực hiện hành động (Handle Action)
        if (actionType === 'feed') {
            const candyType = parts[2]; 
            return InventoryUI.handleFeed(interaction, petIndex, candyType);
        }

        if (actionType === 'upgrade' && parts[2] === 'stat') {
            const statKey = parts[3]; 
            return InventoryUI.handleStatUpgrade(interaction, petIndex, statKey);
        }

        if (actionType === 'reset') {
            return InventoryUI.handleStatReset(interaction, petIndex);
        }
        
        // 7. Xử lý Select Menu (Học Skill)
        // ⚡️ FIX LỖI: Sửa logic Select Menu theo cách mới (dùng 1 menu)
        if (isSelectMenu && customId.startsWith('inv_learn_select_')) {
            const petIndex = parseInt(customId.split('_').pop()); 
            const selectionValue = interaction.values[0]; 
            
            // Hàm xử lý chính nằm trong InventoryUI.mjs (cần import đúng)
            return InventoryUI.processLearnSkillSelection(interaction, petIndex, selectionValue);
        }
    }
    
    // Xử lý Adventure
    if (customId.startsWith('adv_')) {
        const difficulty = customId.split('_')[1]; 
        await interaction.update({ content: `🗺️ Đã chọn độ khó: ${difficulty}`, embeds: [], components: [] });
    }
}