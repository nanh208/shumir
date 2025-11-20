// CommandHandlers.mjs
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from 'discord.js';
import { Database } from './Database.mjs';
import { activeWildPets } from './SpawnSystem.mjs'; // Đã sửa đường dẫn
import { showInventory } from './InventoryUI.mjs'; // Giả định file này tồn tại và là .mjs

// Logic cũ (BotCommands.js) đã bị loại bỏ/bỏ qua do xung đột Module Type
// import { adventure } from './BotCommands.js'; 

// Biến global lưu spawn system instance (sẽ gán từ index.js)
let spawnSystemRef = null;
export function setSpawnSystemRef(ref) { spawnSystemRef = ref; }

export async function handleSlashCommand(interaction) {
    const { commandName, options } = interaction;

    // --- LỆNH SETUP KÊNH SPAWN ---
    if (commandName === 'setup_spawn') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "🚫 Chỉ Admin mới dùng được lệnh này!", ephemeral: true });
        }

        const channel = options.getChannel('channel');
        Database.setSpawnChannel(channel.id);
        
        if (spawnSystemRef) spawnSystemRef.updateChannel(channel.id);
        return interaction.reply({ content: `✅ Đã cài đặt kênh **${channel.name}** làm khu vực Spawn Pet!`, ephemeral: true });
    }
    // --- LỆNH INVENTORY ---
    if (commandName === 'inventory') { 
        await showInventory(interaction, 0); 
    }
    
    // --- LỆNH ADVENTURE (MENU) ---
    if (commandName === 'adventure') {
        const embed = new EmbedBuilder()
            .setTitle("⚔️ CHỌN ĐỘ KHÓ ẢI")
            .setDescription("Hãy chọn cấp độ thử thách cho Pet của bạn:")
            .setColor(0xFF6600);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('adv_easy').setLabel('🟢 Dễ').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('adv_hard').setLabel('🟡 Khó').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('adv_nightmare').setLabel('🔴 Ác Mộng').setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    // --- LỆNH CODE ---
    if (commandName === 'code') {
        // const code = options.getString('input');
        interaction.reply({ content: "Tính năng Code đang bảo trì (như cũ).", ephemeral: true });
    }
}

export async function handleButtons(interaction) {
    const { customId, user } = interaction;

    // 1. XỬ LÝ INVENTORY (PHÂN TRANG)
    if (customId.startsWith('inv_')) {
        if (customId === 'inv_refresh') return showInventory(interaction, 0);
        
        const action = customId.split('_')[1]; 
        let currentPage = parseInt(customId.split('_')[2]);

        if (action === 'prev') currentPage--;
        if (action === 'next') currentPage++;

        await showInventory(interaction, currentPage);
    }

    // 2. XỬ LÝ CHỌN ĐỘ KHÓ ADVENTURE
    if (customId.startsWith('adv_')) {
        const difficulty = customId.split('_')[1]; 
        
        // Logic Adventure cần được code lại trong file GameLogic.mjs
        
        const resultText = `Đã chọn ải **${difficulty.toUpperCase()}**. (Cần code logic Adventure)`;
        
        await interaction.update({ content: resultText, embeds: [], components: [] });
    }
}