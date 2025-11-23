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
    const { commandName, options, user, guildId } = interaction;
    // Đã được defer ở index.js

    // --- 1. LỆNH: /setup_spawn <channel> ---
    if (commandName === 'setup_spawn') {
        // Kiểm tra quyền Admin
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: "🚫 Bạn cần quyền **Administrator** để dùng lệnh này!", ephemeral: true });
        }

        const channel = options.getChannel('channel');
        
        // 1. Lưu vào Database
        Database.setSpawnChannel(channel.id);
        
        // 2. Cập nhật hệ thống đang chạy (nếu có)
        if (spawnSystemRef) {
            spawnSystemRef.updateChannel(channel.id);
        }

        return interaction.editReply({ content: `✅ Đã cài đặt kênh ${channel} làm khu vực xuất hiện Pet!`, ephemeral: true });
    }

    // --- LỆNH: /arena <channel> (ĐÃ FIX: Dùng editReply) ---
    if (commandName === 'arena') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: "🚫 Bạn cần quyền **Administrator** để dùng lệnh này!", ephemeral: true });
        }
        if (!guildId) {
            return interaction.editReply({ content: "Lệnh này chỉ dùng trong Server.", ephemeral: true });
        }

        const channel = options.getChannel('channel');

        if (!channel) {
            return interaction.editReply({ content: "❌ Không tìm thấy kênh.", ephemeral: true });
        }
        
        // 0 là ChannelType.GuildText
        if (channel.type !== 0) { 
             return interaction.editReply({ content: "❌ Kênh Đấu trường phải là Kênh Văn bản!", ephemeral: true });
        }

        Database.setArenaChannel(guildId, channel.id); 
        return interaction.editReply({ content: `✅ Đã cài đặt kênh ${channel} làm **Khu vực Đấu trường (Arena)** cho các sự kiện PVP Boss!`, ephemeral: true });
    }
    
    // --- 2. LỆNH: /inventory ---
    if (commandName === 'inventory') {
        // showInventory sẽ tự dùng safeUpdate/editReply
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

        // Dùng editReply vì đã defer ở index.js
        await interaction.editReply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // --- 4. LỆNH: /code <code> ---
    if (commandName === 'code') {
        const inputCode = options.getString('code'); 
        
        // Sửa tất cả lỗi reply
        if (!inputCode) return interaction.editReply({ content: "Vui lòng nhập mã code!", ephemeral: true });

        let codesData = {};
        try {
            if (fs.existsSync(CODES_FILE)) {
                codesData = JSON.parse(fs.readFileSync(CODES_FILE, 'utf8'));
            }
        } catch (e) {
            return interaction.editReply({ content: "❌ Lỗi đọc dữ liệu Code.", ephemeral: true });
        }

        const reward = codesData[inputCode];
        
        if (!reward) {
            return interaction.editReply({ content: "🚫 Mã code không hợp lệ hoặc đã hết hạn!", ephemeral: true });
        }

        const userData = Database.getUser(user.id);

        if (userData.codesRedeemed && userData.codesRedeemed.includes(inputCode)) {
            return interaction.editReply({ content: "⚠️ Bạn đã nhập mã này rồi!", ephemeral: true });
        }

        // --- TRAO THƯỞNG ---
        let rewardMsg = `🎉 **NHẬP CODE THÀNH CÔNG!**\nPhần thưởng:\n`;

        // ... (Logic trao thưởng) ...
        
        return interaction.editReply({ content: rewardMsg, ephemeral: true });
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
        const action = parts[1]; 
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