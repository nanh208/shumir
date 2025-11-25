// AdventureManager.mjs
import { EmbedBuilder } from 'discord.js';

// Danh sách các hệ (Element) cho sách Skill
const ELEMENTS = ['Fire', 'Water', 'Grass', 'Electric', 'Ice', 'Earth', 'Wind', 'Light', 'Dark'];

// Cấu hình phần thưởng theo độ khó
const DIFFICULTY_SETTINGS = {
    adv_easy: {
        name: "🟢 Dễ (Easy)",
        chestTier: "Common",
        candy: { min: 1, max: 10, chance: 0.9 }, // 90% ra 1-10 kẹo thường
        premium_candy: { min: 1, max: 5, chance: 0.3 }, // 30% ra kẹo cao cấp
        balls: { 
            guaranteed: { id: 'ball_common', min: 1, max: 3 }, // 100% ra 1-3 bóng thường
            lucky: { id: 'ball_legendary', chance: 0.01 } // 1% ra bóng Legendary
        },
        books: { max_qty: 1, max_quality: 'Common', chance: 0.5 }, // 50% ra 1 sách
        buffs: { min: 0, max: 1, chance: 0.1 }
    },
    adv_hard: {
        name: "🟡 Khó (Hard)",
        chestTier: "Rare",
        candy: { min: 5, max: 20, chance: 1.0 },
        premium_candy: { min: 2, max: 8, chance: 0.5 },
        balls: { 
            guaranteed: { id: 'ball_common', min: 2, max: 4 },
            lucky: { id: 'ball_legendary', chance: 0.03 } // 3%
        },
        books: { max_qty: 2, max_quality: 'Rare', chance: 0.7 }, 
        buffs: { min: 1, max: 2, chance: 0.3 }
    },
    adv_nightmare: {
        name: "🔴 Ác Mộng (Nightmare)",
        chestTier: "Legendary",
        candy: { min: 10, max: 30, chance: 1.0 },
        premium_candy: { min: 5, max: 15, chance: 0.8 },
        balls: { 
            guaranteed: { id: 'ball_common', min: 3, max: 5 },
            lucky: { id: 'ball_legendary', chance: 0.049 } // < 5% (~4.9%)
        },
        books: { max_qty: 4, max_quality: 'Epic', chance: 1.0 }, // 100% ra sách, tối đa 4 cuốn
        buffs: { min: 1, max: 3, chance: 0.5 }
    }
};

// Hàm random số nguyên từ min đến max
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Hàm lấy ngẫu nhiên một phần tử trong mảng
function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Tính toán phần thưởng dựa trên độ khó
 */
export function calculateAdventureRewards(difficultyId) {
    const config = DIFFICULTY_SETTINGS[difficultyId];
    const rewards = [];
    const logMessages = [];

    // 1. Bóng (Balls) - Cơ chế Guaranteed & Lucky
    // Common Ball: 100% rơi 1-3 quả (tùy config)
    const commonBallQty = randomInt(config.balls.guaranteed.min, config.balls.guaranteed.max);
    rewards.push({ id: config.balls.guaranteed.id, qty: commonBallQty, type: 'ball' });
    logMessages.push(`+ ${commonBallQty}x Bóng Thường`);

    // Legendary Ball: < 5% tùy ải
    if (Math.random() < config.balls.lucky.chance) {
        rewards.push({ id: config.balls.lucky.id, qty: 1, type: 'ball' });
        logMessages.push(`🌟 **MAY MẮN CỰC ĐỘ: +1 Bóng Huyền Thoại!**`);
    }

    // 2. Kẹo thường (Exp Candy)
    if (Math.random() < config.candy.chance) {
        const qty = randomInt(config.candy.min, config.candy.max);
        rewards.push({ id: 'candy_exp', qty: qty, type: 'item' });
        logMessages.push(`+ ${qty}x Kẹo Exp`);
    }

    // 3. Kẹo cao cấp (Premium Candy)
    if (Math.random() < config.premium_candy.chance) {
        const qty = randomInt(config.premium_candy.min, config.premium_candy.max);
        rewards.push({ id: 'candy_premium', qty: qty, type: 'item' });
        logMessages.push(`+ ${qty}x Kẹo Cao Cấp`);
    }

    // 4. Sách Skill (Skill Books) - Cơ chế phẩm chất
    if (Math.random() < config.books.chance) {
        // Số lượng sách rơi ra (từ 1 đến max_qty)
        const bookQty = randomInt(1, config.books.max_qty);
        
        for (let i = 0; i < bookQty; i++) {
            // Random hệ (9 hệ)
            const element = randomElement(ELEMENTS);
            // Random phẩm chất (đơn giản hóa: thấp hơn hoặc bằng tier của hòm)
            // Ở đây demo trả về string phẩm chất
            const quality = config.books.max_quality; 
            
            const bookId = `book_${element.toLowerCase()}_${quality.toLowerCase()}`;
            rewards.push({ id: bookId, qty: 1, type: 'book', quality: quality, element: element });
            logMessages.push(`+ 1x Sách Kỹ Năng ${element} [${quality}]`);
        }
    }

    // 5. Buff Items (Kẹo Buff)
    if (Math.random() < config.buffs.chance) {
        const qty = randomInt(config.buffs.min, config.buffs.max);
        rewards.push({ id: 'item_buff_atk', qty: qty, type: 'item' }); // Demo 1 loại buff
        logMessages.push(`+ ${qty}x Kẹo Tăng Lực`);
    }

    return { rewards, logMessages, config };
}