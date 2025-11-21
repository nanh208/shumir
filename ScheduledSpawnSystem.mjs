import { SCHEDULED_SPAWN_HOURS, SCHEDULED_RARITIES, RARITY } from './Constants.mjs';
// Cần import các hàm tạo Pet và áp dụng độ khó từ GameLogic
import { spawnWildPet, applyDifficultyMultiplier } from './GameLogic.mjs'; 

const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Biến toàn cục (nên được lưu vào database hoặc config nếu server restart)
// Dùng để đảm bảo Pet chỉ spawn 1 lần duy nhất trong mỗi khung giờ sự kiện.
let lastSpawnHour = -1; 

/**
 * Kiểm tra xem có cần kích hoạt sự kiện spawn Pet hiếm theo lịch không.
 * * @param {number} serverDifficultyMultiplier Hệ số độ khó hiện tại của server (từ lệnh /lvsv).
 * @returns {object | null} Trả về Pet và thông báo nếu spawn thành công, ngược lại trả về null.
 */
export function checkScheduledSpawn(serverDifficultyMultiplier = 1.0) {
    const now = new Date();
    const currentHour = now.getHours(); // Lấy giờ thực (0-23)

    // 1. Kiểm tra điều kiện: Đúng giờ theo lịch VÀ chưa spawn trong giờ này
    if (SCHEDULED_SPAWN_HOURS.includes(currentHour) && currentHour !== lastSpawnHour) {
        
        lastSpawnHour = currentHour; 

        // --- LỌC VÀ CHỌN PET ---
        
        // 2. Chọn độ hiếm ngẫu nhiên trong khoảng Legendary - Mythic
        const forcedRarity = randomElement(SCHEDULED_RARITIES); 

        // 3. Tạo Pet theo độ hiếm đã chọn
        let scheduledPet = spawnWildPet(forcedRarity); 
        
        // 4. CẤP CHỈ SỐ NỔI TRỘI (Gen cao)
        // Đặt Gen Pet từ 95-100 (Gen tối đa) để đảm bảo chỉ số nổi trội hơn hẳn Pet thường
        scheduledPet.gen = 95 + Math.random() * 5; 
        
        // 5. Áp dụng độ khó server (từ GameLogic.mjs)
        scheduledPet = applyDifficultyMultiplier(scheduledPet, serverDifficultyMultiplier);
        
        // Cập nhật lại stats (quan trọng sau khi thay đổi gen và áp dụng multiplier)
        scheduledPet.currentStats = scheduledPet.calculateStats();
        scheduledPet.currentHP = scheduledPet.currentStats.HP;
        scheduledPet.currentMP = scheduledPet.currentStats.MP;
        
        return {
            pet: scheduledPet,
            time: `${currentHour}:00`,
            message: `🎉 **SỰ KIỆN GIỜ VÀNG!** Pet cấp **${scheduledPet.rarity}** (Gen ${Math.floor(scheduledPet.gen)}%) đã xuất hiện vào lúc ${currentHour}:00! Hãy tìm kiếm ngay!`
        };
    }
    
    // Nếu không phải giờ spawn, reset lastSpawnHour để cho phép Pet spawn ở giờ sự kiện tiếp theo
    if (!SCHEDULED_SPAWN_HOURS.includes(currentHour) && lastSpawnHour !== -1) {
        lastSpawnHour = -1;
    }

    return null; 
}