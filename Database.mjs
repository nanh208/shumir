// Database.mjs
import fs from 'fs';
import path from 'path';

const DATA_DIR = './data';
const USER_FILE = path.join(DATA_DIR, 'users.json');
const MARKET_FILE = path.join(DATA_DIR, 'market.json'); // [MỚI] File lưu chợ
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Cấu trúc dữ liệu mặc định
const DEFAULT_USER_DATA = {
    pets: [],
    inventory: {
        candies: { normal: 0, high: 0, super: 0 },
        potions: 0, // [MỚI] Thuốc hồi phục
        crates: { common: 0, mythic: 0 },
        skillBooks: []
    },
    gold: 1000, // [MỚI] Tiền vàng khởi đầu
    codesRedeemed: [],
    hasClaimedStarter: false,
    createdAt: 0
};

// Đảm bảo thư mục và file tồn tại
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(USER_FILE)) fs.writeFileSync(USER_FILE, JSON.stringify({}, null, 2));
if (!fs.existsSync(MARKET_FILE)) fs.writeFileSync(MARKET_FILE, JSON.stringify([], null, 2)); // [MỚI]
if (!fs.existsSync(CONFIG_FILE)) fs.writeFileSync(CONFIG_FILE, JSON.stringify({ spawnChannelId: null }, null, 2));

export class Database {
    // --- USER DATA ---
    static getAllUserData() {
        try {
            return JSON.parse(fs.readFileSync(USER_FILE, 'utf8'));
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
        
        // 1. Tạo user mới
        if (!allData[userId]) {
            allData[userId] = JSON.parse(JSON.stringify(DEFAULT_USER_DATA));
            allData[userId].createdAt = Date.now();
            needsSave = true;
        }
        
        // 2. Migration (Cập nhật dữ liệu cũ)
        const user = allData[userId];

        if (user.hasClaimedStarter === undefined) { user.hasClaimedStarter = false; needsSave = true; }
        if (!user.inventory) { user.inventory = JSON.parse(JSON.stringify(DEFAULT_USER_DATA.inventory)); needsSave = true; }
        
        // [MỚI] Thêm Gold nếu chưa có
        if (user.gold === undefined) { user.gold = 1000; needsSave = true; }
        // [MỚI] Thêm Potions nếu chưa có
        if (user.inventory.potions === undefined) { user.inventory.potions = 0; needsSave = true; }
        
        if (needsSave) this.saveAllUserData(allData);
        
        return allData[userId];
    }

    static updateUser(userId, newData) {
        const allData = this.getAllUserData();
        allData[userId] = newData;
        this.saveAllUserData(allData);
    }

    static addPetToUser(userId, petData) {
        const user = this.getUser(userId);
        const petToSave = (petData.getDataForSave && typeof petData.getDataForSave === 'function') 
            ? petData.getDataForSave() 
            : petData;
        user.pets.push(petToSave);
        this.updateUser(userId, user);
    }

    // --- [MỚI] MARKET SYSTEM ---
    static getMarket() {
        try {
            return JSON.parse(fs.readFileSync(MARKET_FILE, 'utf8'));
        } catch (err) {
            return [];
        }
    }

    static saveMarket(data) {
        try {
            fs.writeFileSync(MARKET_FILE, JSON.stringify(data, null, 2));
        } catch (err) { console.error("Lỗi lưu market:", err); }
    }

    static addListing(listing) {
        const market = this.getMarket();
        market.push(listing);
        this.saveMarket(market);
    }

    static removeListing(listingId) {
        let market = this.getMarket();
        market = market.filter(item => item.id !== listingId);
        this.saveMarket(market);
    }

    // --- CONFIG FUNCTIONS ---
    static getConfig() {
        try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } 
        catch (e) { return { spawnChannelId: null }; }
    }

    static setSpawnChannel(channelId) {
        const config = this.getConfig();
        config.spawnChannelId = channelId;
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    }
}