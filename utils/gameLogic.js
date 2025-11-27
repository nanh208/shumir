// Cấu hình giá tiền và sản lượng
const CONFIG = {
    buildings: {
        farm: { name: "🌾 Ruộng Lúa", baseCost: { gold: 100, wood: 50 }, production: 50 }, // 50 Thực/giờ
        gold_mine: { name: "💰 Mỏ Vàng", baseCost: { wood: 100, food: 100 }, production: 30 }, // 30 Vàng/giờ
        lumber_mill: { name: "🌲 Xưởng Gỗ", baseCost: { gold: 50, food: 50 }, production: 40 }, // 40 Gỗ/giờ
        barracks: { name: "⚔️ Trại Lính", baseCost: { gold: 500, wood: 300, food: 200 }, production: 0 }
    },
    units: {
        infantry: { name: "🛡️ Bộ Binh", cost: { gold: 20, food: 10 }, upkeep: 1 }, // Ăn 1 thực/giờ
        archer: { name: "🏹 Cung Thủ", cost: { gold: 40, wood: 20, food: 15 }, upkeep: 2 },
        cavalry: { name: "🐎 Kỵ Binh", cost: { gold: 80, food: 40 }, upkeep: 4 }
    }
};

// Hàm tính tài nguyên thụ động (Passive Income)
function updateResources(player) {
    const now = Date.now();
    const lastUpdate = player.lastUpdate || now;
    const hoursPassed = (now - lastUpdate) / (1000 * 60 * 60); // Đổi ra giờ

    // Tính sản lượng mỗi giờ
    const goldProd = (player.buildings.gold_mine * CONFIG.buildings.gold_mine.production) + 10; // +10 cơ bản
    const woodProd = (player.buildings.lumber_mill * CONFIG.buildings.lumber_mill.production) + 10;
    const foodProd = (player.buildings.farm * CONFIG.buildings.farm.production) + 20;

    // Tính tiêu thụ lương thực (Nuôi quân)
    const foodUpkeep = (player.units.infantry * CONFIG.units.infantry.upkeep) +
                       (player.units.archer * CONFIG.units.archer.upkeep) +
                       (player.units.cavalry * CONFIG.units.cavalry.upkeep);
    
    // Cộng dồn tài nguyên
    player.resources.gold += Math.floor(goldProd * hoursPassed);
    player.resources.wood += Math.floor(woodProd * hoursPassed);
    
    let realFoodChange = (foodProd - foodUpkeep) * hoursPassed;
    player.resources.food += Math.floor(realFoodChange);

    // Xử lý nếu hết lương thực (Đói) -> Quân chết (Logic Phase sau sẽ thêm)
    if (player.resources.food < 0) player.resources.food = 0;

    player.lastUpdate = now;
    return player;
}

module.exports = { CONFIG, updateResources };