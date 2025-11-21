// CommandHandlers.mjs (ĐÃ FIX LỖI IMPORT VÀ ĐỊNH TUYẾN CHÍNH XÁC CHO INVENTORY)
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from 'discord.js';

// --- Sử dụng Wildcard Import cho TẤT CẢ ES Modules ---
import * as DatabaseModule from './Database.mjs';
import * as SpawnModule from './SpawnSystem.mjs'; 
import * as InventoryUI from './InventoryUI.mjs';  // ✅ Đảm bảo file này tên là InventoryUI.mjs
import * as GameLogicModule from './GameLogic.mjs'; 
import * as PetModule from './Pet.mjs';

import fs from 'fs';
import path from 'path';

// Đường dẫn file chứa danh sách code
const CODES_FILE = './data/pet-codes.json';

// Biến global lưu spawn system instance
let spawnSystemRef = null;
export function setSpawnSystemRef(ref) { spawnSystemRef = ref; }

/**
 * Xử lý các Slash Command (/setup_spawn, /inventory, v.v.)
 */
export async function handleSlashCommand(interaction) {
    const { commandName, options, user } = interaction;
    const Database = DatabaseModule.Database; 

    // --- 1. LỆNH: /setup_spawn ---
    if (commandName === 'setup_spawn') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "🚫 Cần quyền Administrator!", ephemeral: true });
        }
        const channel = options.getChannel('channel');
        Database.setSpawnChannel(channel.id);
        if (spawnSystemRef) spawnSystemRef.updateChannel(channel.id);
        return interaction.reply({ content: `✅ Đã cài đặt kênh ${channel} làm khu vực Spawn!`, ephemeral: true });
    }

    // --- 2. LỆNH: /inventory ---
    if (commandName === 'inventory') {
        // Gọi hàm từ file InventoryUI.mjs thông qua namespace
        await InventoryUI.showInventory(interaction, 0);
    }
    
    // --- 3. LỆNH: /adventure ---
    if (commandName === 'adventure') {
        const embed = new EmbedBuilder()
            .setTitle("⚔️ CHỌN ĐỘ KHÓ ẢI")
            .setDescription("Hãy chọn cấp độ thử thách:")
            .setColor(0xFF6600);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('adv_easy').setLabel('🟢 Dễ').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('adv_hard').setLabel('🟡 Khó').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('adv_nightmare').setLabel('🔴 Ác Mộng').setStyle(ButtonStyle.Danger)
        );
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // --- 4. LỆNH: /code ---
    if (commandName === 'code') {
        const inputCode = options.getString('code'); 
        if (!inputCode) return interaction.reply({ content: "Nhập mã code!", ephemeral: true });

        let codesData = {};
        try {
            if (fs.existsSync(CODES_FILE)) codesData = JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
        } catch (e) { return interaction.reply({ content: "Lỗi đọc dữ liệu.", ephemeral: true }); }

        const reward = codesData[inputCode];
        const userData = Database.getUser(user.id);

        if (!reward) return interaction.reply({ content: "🚫 Mã không hợp lệ!", ephemeral: true });
        if (userData.codesRedeemed?.includes(inputCode)) return interaction.reply({ content: "⚠️ Đã dùng mã này!", ephemeral: true });

        let rewardMsg = `🎉 **THÀNH CÔNG!**\n`;
        if (reward.items?.candies) {
            userData.inventory.candies.normal += (reward.items.candies || 0);
            rewardMsg += `- 🍬 ${reward.items.candies} Kẹo thường\n`;
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
        return interaction.reply({ content: rewardMsg, ephemeral: true });
    }
}

/**
 * Xử lý các Nút bấm (Buttons)
 */
export async function handleButtons(interaction) {
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
        if (isSelectMenu && actionType === 'select') {
            // Để đơn giản, ta chỉ cần xử lý khi cả Sách và Slot được chọn
            const bookKey = interaction.values[0]; 
            const slotIndex = parseInt(interaction.values[1]);

            // NOTE: Cần thêm logic xác định bookKey và slotIndex khi sử dụng 2 select menu 
            // Hiện tại chỉ là defer để tránh crash.
            return interaction.deferUpdate(); 
        }
    }
    
    // Xử lý Adventure
    if (customId.startsWith('adv_')) {
        const difficulty = customId.split('_')[1]; 
        await interaction.update({ content: `🗺️ Đã chọn độ khó: ${difficulty}`, embeds: [], components: [] });
    }
}