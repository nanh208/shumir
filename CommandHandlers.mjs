// CommandHandlers.mjs
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from 'discord.js';
import { Database } from './Database.mjs';
import { activeWildPets, SpawnSystem } from './SpawnSystem.mjs'; 
import { showInventory } from './InventoryUI.mjs';
import { spawnWildPet } from './GameLogic.mjs'; 
import { Pet } from './Pet.mjs';
import fs from 'fs';
import path from 'path';

// Đường dẫn file chứa danh sách code
const CODES_FILE = './data/pet-codes.json';

// Biến global lưu spawn system instance (sẽ gán từ index.js)
let spawnSystemRef = null;
export function setSpawnSystemRef(ref) { spawnSystemRef = ref; }

/**
 * Xử lý các Slash Command của Pet Game
 */
export async function handleSlashCommand(interaction) {
    const { commandName, options, user } = interaction;

    // --- 1. LỆNH: /setup_spawn <channel> ---
    if (commandName === 'setup_spawn') {
        // Kiểm tra quyền Admin
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "🚫 Bạn cần quyền **Administrator** để dùng lệnh này!", ephemeral: true });
        }

        const channel = options.getChannel('channel');
        
        // 1. Lưu vào Database
        Database.setSpawnChannel(channel.id);
        
        // 2. Cập nhật hệ thống đang chạy (nếu có)
        if (spawnSystemRef) {
            spawnSystemRef.updateChannel(channel.id);
        }

        return interaction.reply({ content: `✅ Đã cài đặt kênh ${channel} làm khu vực xuất hiện Pet!`, ephemeral: true });
    }

    // --- 2. LỆNH: /inventory ---
    if (commandName === 'inventory') {
        // Gọi hàm hiển thị giao diện túi đồ
        await showInventory(interaction, 0);
    }
    
    // --- 3. LỆNH: /adventure ---
    if (commandName === 'adventure') {
        const embed = new EmbedBuilder()
            .setTitle("⚔️ CHỌN ĐỘ KHÓ ẢI")
            .setDescription("Hãy chọn cấp độ thử thách cho Pet của bạn:")
            .setColor(0xFF6600)
            .setThumbnail("https://media.tenor.com/NbS4jT_Q-P4AAAAi/adventure-map.gif");

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('adv_easy').setLabel('🟢 Dễ').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('adv_hard').setLabel('🟡 Khó').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('adv_nightmare').setLabel('🔴 Ác Mộng').setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // --- 4. LỆNH: /code <code> ---
    if (commandName === 'code') {
        const inputCode = options.getString('code'); 
        if (!inputCode) return interaction.reply({ content: "Vui lòng nhập mã code!", ephemeral: true });

        // Đọc dữ liệu code từ file
        let codesData = {};
        try {
            if (fs.existsSync(CODES_FILE)) {
                codesData = JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
            }
        } catch (e) {
            return interaction.reply({ content: "❌ Lỗi đọc dữ liệu Code.", ephemeral: true });
        }

        const reward = codesData[inputCode];
        
        // Kiểm tra Code có tồn tại không
        if (!reward) {
            return interaction.reply({ content: "🚫 Mã code không hợp lệ hoặc đã hết hạn!", ephemeral: true });
        }

        const userData = Database.getUser(user.id);

        // Kiểm tra người dùng đã nhập chưa
        if (userData.codesRedeemed && userData.codesRedeemed.includes(inputCode)) {
            return interaction.reply({ content: "⚠️ Bạn đã nhập mã này rồi!", ephemeral: true });
        }

        // --- TRAO THƯỞNG ---
        let rewardMsg = `🎉 **NHẬP CODE THÀNH CÔNG!**\nPhần thưởng:\n`;

        // 1. Cộng Item (Kẹo)
        if (reward.items) {
            if (reward.items.candies) {
                userData.inventory.candies.normal += (reward.items.candies || 0);
                rewardMsg += `- 🍬 ${reward.items.candies} Kẹo thường\n`;
            }
        }

        // 2. Cộng Pet
        if (reward.pet) {
            // Tạo Pet mới (Random hoặc theo config)
            const newPet = spawnWildPet(true); // Mặc định tạo pet xịn cho code
            newPet.ownerId = user.id;
            if (reward.pet.name) newPet.name = reward.pet.name;
            
            // Lưu Pet vào DB
            Database.addPetToUser(user.id, newPet.getDataForSave());
            rewardMsg += `- 🐾 Pet: **${newPet.name}** (${newPet.rarity})\n`;
        }

        // Lưu lịch sử nhập code
        if (!userData.codesRedeemed) userData.codesRedeemed = [];
        userData.codesRedeemed.push(inputCode);
        Database.updateUser(user.id, userData);

        // Xử lý giới hạn lượt dùng (Limit)
        if (reward.limit && reward.limit > 0) {
            reward.limit -= 1;
            if (reward.limit <= 0) {
                delete codesData[inputCode]; // Xóa code nếu hết lượt
            } else {
                codesData[inputCode] = reward; // Cập nhật số lượng
            }
            fs.writeFileSync(CODES_FILE, JSON.stringify(codesData, null, 2), 'utf8');
        }

        return interaction.reply({ content: rewardMsg, ephemeral: true });
    }
}

/**
 * Xử lý các Nút bấm (Buttons) của giao diện
 */
export async function handleButtons(interaction) {
    const { customId, user } = interaction;

    // 1. XỬ LÝ INVENTORY (PHÂN TRANG)
    if (customId.startsWith('inv_')) {
        if (customId === 'inv_refresh') return showInventory(interaction, 0);
        
        const parts = customId.split('_');
        const action = parts[1]; // prev hoặc next
        let currentPage = parseInt(parts[2]);

        if (action === 'prev') currentPage--;
        if (action === 'next') currentPage++;

        await showInventory(interaction, currentPage);
    }

    // 2. XỬ LÝ CHỌN ĐỘ KHÓ ADVENTURE
    if (customId.startsWith('adv_')) {
        const difficulty = customId.split('_')[1]; 
        
        const resultText = `🗺️ Bạn đã chọn độ khó **${difficulty.toUpperCase()}**.\n*(Tính năng đi ải đang được phát triển tiếp...)*`;
        
        await interaction.update({ content: resultText, embeds: [], components: [] });
    }
}