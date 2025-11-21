// Database.mjs
import fs from 'fs';
import path from 'path';

const DATA_DIR = './data';
const USER_FILE = path.join(DATA_DIR, 'users.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json'); // File cấu hình riêng

// Cấu trúc dữ liệu mặc định cho người chơi mới
const DEFAULT_USER_DATA = {
    pets: [],
    inventory: {
        candies: { normal: 0, high: 0, super: 0 },
        crates: { common: 0, mythic: 0 },
        skillBooks: []
    },
    codesRedeemed: [],
    hasClaimedStarter: false, // <--- [MỚI] Cờ đánh dấu đã nhận Pet khởi đầu
    createdAt: 0 // <--- [MỚI] Thời gian tạo tài khoản
};

// Đảm bảo thư mục và file tồn tại khi khởi động
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}
if (!fs.existsSync(USER_FILE)) {
    fs.writeFileSync(USER_FILE, JSON.stringify({}, null, 2));
}
if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ spawnChannelId: null }, null, 2));
}

export class Database {
    static getAllUserData() {
        try {
            const data = fs.readFileSync(USER_FILE, 'utf8');
            return JSON.parse(data || '{}');
        } catch (err) {
            console.error("Lỗi đọc user data:", err);
            return {};
        }
    }

    static saveAllUserData(data) {
        try {
            fs.writeFileSync(USER_FILE, JSON.stringify(data, null, 2));
        } catch (err) {
            console.error("Lỗi lưu user data:", err);
        }
    }

    static getUser(userId) {
        const allData = this.getAllUserData();
        let needsSave = false;
        
        // 1. Tạo user mới nếu chưa tồn tại
        if (!allData[userId]) {
            allData[userId] = JSON.parse(JSON.stringify(DEFAULT_USER_DATA));
            allData[userId].createdAt = Date.now(); // Set thời gian tạo thực tế
            needsSave = true;
        }
        
        // 2. Migration: Cập nhật user cũ nếu thiếu trường mới
        const user = allData[userId];

        // Kiểm tra trường hasClaimedStarter
        if (user.hasClaimedStarter === undefined) {
            user.hasClaimedStarter = false;
            needsSave = true;
        }

        // Kiểm tra trường inventory (đề phòng user cũ thiếu field con)
        if (!user.inventory) {
            user.inventory = JSON.parse(JSON.stringify(DEFAULT_USER_DATA.inventory));
            needsSave = true;
        }
        
        if (needsSave) {
            this.saveAllUserData(allData);
        }
        
        return allData[userId];
    }

    static updateUser(userId, newData) {
        const allData = this.getAllUserData();
        allData[userId] = newData;
        this.saveAllUserData(allData);
    }

    static addPetToUser(userId, petData) {
        const user = this.getUser(userId);
        // Sử dụng hàm getDataForSave() từ Class Pet (nếu có) hoặc dùng raw data
        // Điều này quan trọng để tránh lưu các function/circular reference vào JSON
        const petToSave = (petData.getDataForSave && typeof petData.getDataForSave === 'function') 
            ? petData.getDataForSave() 
            : petData;
            
        user.pets.push(petToSave);
        this.updateUser(userId, user);
    }
    
    // ⚡️ THÊM HÀM updatePet: Dùng để cập nhật Pet cụ thể (như Lore)
    static updatePet(userId, petId, updates) {
        const allData = this.getAllUserData();
        const user = allData[userId];

        if (!user) return; // User không tồn tại

        const petIndex = user.pets.findIndex(p => p.id === petId);
        
        if (petIndex !== -1) {
            // Cập nhật từng trường trong Pet
            const petData = user.pets[petIndex];
            // Sử dụng Object.assign để merge updates vào petData
            user.pets[petIndex] = Object.assign(petData, updates);
            this.saveAllUserData(allData);
        }
    }


    // CONFIG FUNCTIONS
    static getConfig() {
        try { 
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); 
        } 
        catch (e) { 
            return { spawnChannelId: null }; 
        }
    }

    static setSpawnChannel(channelId) {
        const config = this.getConfig();
        config.spawnChannelId = channelId;
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    }
}