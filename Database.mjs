// Database.mjs
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data'); 
const USER_FILE = path.join(DATA_DIR, 'users.json');
const MARKET_FILE = path.join(DATA_DIR, 'market.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const SERVERS_FILE = path.join(DATA_DIR, 'servers.json'); 

// Cấu trúc dữ liệu mặc định
const DEFAULT_USER_DATA = {
    pets: [],
    inventory: {
        candies: { normal: 0, high: 0, super: 0, ultra: 0 }, 
        potions: 0, 
        crates: { common: 0, mythic: 0 },
        skillBooks: [], // Mảng chứa sách kỹ năng
        pokeballs: { poke: 0, great: 0, ultra: 0, dusk: 0, master: 0 },
        items: {} // [MỚI] Chứa các item hỗ trợ khác (Buff, Ticket, v.v.)
    },
    gold: 1000, // Tiền mặc định
    codesRedeemed: [],
    hasClaimedStarter: false,
    activePetIndex: 0,
    createdAt: 0
};

// Cấu hình Server mặc định
const DEFAULT_SERVER_CONFIG = {
    spawnChannelId: null,
    arenaChannelId: null,
    difficulty: 'dễ'
};

// --- HÀM HỖ TRỢ ĐỌC/GHI ---

const ensureDbFile = (filePath, defaultData = {}) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
};

const readJson = (filePath) => {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        console.error(`Lỗi đọc file ${path.basename(filePath)}:`, e.message);
        return {};
    }
};

const writeJson = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(`Lỗi ghi file ${path.basename(filePath)}:`, e.message);
    }
};

// Đảm bảo thư mục và file tồn tại khi khởi động
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
ensureDbFile(USER_FILE, {});
ensureDbFile(MARKET_FILE, []);
ensureDbFile(CONFIG_FILE, { spawnChannelId: null });
ensureDbFile(SERVERS_FILE, {}); 

// ==========================================
// Bắt đầu Class Database
// ==========================================

export class Database {
    
    // --- USER DATA ---
    static getAllUserData() {
        return readJson(USER_FILE);
    }

    static saveAllUserData(data) {
        writeJson(USER_FILE, data);
    }

    static getUser(userId) {
        const allData = this.getAllUserData();
        let needsSave = false;
        
        if (!allData[userId]) {
            // User mới: Khởi tạo với DEFAULT_USER_DATA
            allData[userId] = JSON.parse(JSON.stringify(DEFAULT_USER_DATA));
            allData[userId].createdAt = Date.now();
            needsSave = true;
        }
        
        // --- Migration & Cleanup cho User cũ ---
        const user = allData[userId];

        // Migration 1: Đảm bảo các fields Candy/Inventory tồn tại
        if (!user.inventory || !user.inventory.candies) {
             user.inventory = { ...DEFAULT_USER_DATA.inventory, ...user.inventory };
             needsSave = true;
        }
        if (user.inventory.candies.ultra === undefined) { user.inventory.candies.ultra = 0; needsSave = true; }
        
        // Migration 2: Đảm bảo trường Pokeballs tồn tại và có đủ key
        if (!user.inventory.pokeballs) {
            user.inventory.pokeballs = JSON.parse(JSON.stringify(DEFAULT_USER_DATA.inventory.pokeballs));
            needsSave = true;
        } else {
            // Đảm bảo user cũ có đủ các loại bóng
            for (const key in DEFAULT_USER_DATA.inventory.pokeballs) {
                if (user.inventory.pokeballs[key] === undefined) {
                    user.inventory.pokeballs[key] = DEFAULT_USER_DATA.inventory.pokeballs[key];
                    needsSave = true;
                }
            }
        }
        
        // Migration 3: Đảm bảo activePetIndex tồn tại
        if (user.activePetIndex === undefined) { user.activePetIndex = 0; needsSave = true; } 

        // Migration 4: Đảm bảo GOLD tồn tại cho người chơi cũ
        if (user.gold === undefined) { 
            user.gold = 1000; 
            needsSave = true; 
        }

        // Migration 5: Đảm bảo trường Items (cho Buff/Vật phẩm phụ) tồn tại
        if (!user.inventory.items) {
            user.inventory.items = {};
            needsSave = true;
        }
        
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

    // --- [MỚI] HỆ THỐNG THÊM VẬT PHẨM (Dùng cho Adventure/Shop) ---
    /**
     * Thêm vật phẩm vào túi đồ người chơi
     * @param {string} userId - ID người chơi
     * @param {string} itemId - ID vật phẩm (vd: 'ball_common', 'candy_exp', 'book_fire_rare')
     * @param {number} quantity - Số lượng
     * @param {object} metadata - Dữ liệu phụ (cho sách skill, item đặc biệt)
     */
    static addItem(userId, itemId, quantity, metadata = {}) {
        const user = this.getUser(userId);
        const inv = user.inventory;

        // 1. XỬ LÝ BÓNG (Pokeballs)
        // Mapping ID từ Adventure sang key trong Inventory
        if (itemId.startsWith('ball_')) {
            let ballType = 'poke'; // Mặc định
            if (itemId === 'ball_common') ballType = 'poke';
            if (itemId === 'ball_great') ballType = 'great'; // Dự phòng
            if (itemId === 'ball_legendary') ballType = 'master'; // Bóng Legend = Master Ball

            if (inv.pokeballs[ballType] !== undefined) {
                inv.pokeballs[ballType] += quantity;
            }
        }

        // 2. XỬ LÝ KẸO (Candies)
        else if (itemId.startsWith('candy_')) {
            if (itemId === 'candy_exp') inv.candies.normal += quantity;
            else if (itemId === 'candy_premium') inv.candies.high += quantity;
            else if (itemId === 'candy_super') inv.candies.super += quantity;
        }

        // 3. XỬ LÝ SÁCH KỸ NĂNG (Skill Books)
        else if (itemId.startsWith('book_')) {
            // Sách không cộng dồn số lượng đơn giản, mà thêm vào danh sách
            // Metadata sẽ chứa thông tin hệ (element) và phẩm chất (quality)
            for (let i = 0; i < quantity; i++) {
                inv.skillBooks.push({
                    id: itemId,
                    element: metadata.element || 'Normal',
                    quality: metadata.quality || 'Common',
                    obtainedAt: Date.now()
                });
            }
        }

        // 4. CÁC ITEM KHÁC (Buff, Key, v.v.)
        else {
            if (!inv.items) inv.items = {};
            if (!inv.items[itemId]) inv.items[itemId] = 0;
            inv.items[itemId] += quantity;
        }

        this.updateUser(userId, user);
    }

    // --- MARKET SYSTEM ---
    static getMarket() {
        return readJson(MARKET_FILE);
    }

    static saveMarket(data) {
        writeJson(MARKET_FILE, data);
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

    // --- SERVER CONFIGURATION ---

    /**
     * Lấy cấu hình của Server theo ID.
     */
    static getServerConfig(serverId) {
        const servers = readJson(SERVERS_FILE);
        const serverData = servers[serverId] || {};
        
        return { ...DEFAULT_SERVER_CONFIG, ...serverData };
    }

    /**
     * Cập nhật cấu hình của Server.
     */
    static updateServerConfig(serverId, serverData) {
        const servers = readJson(SERVERS_FILE);
        servers[serverId] = serverData;
        writeJson(SERVERS_FILE, servers);
    }

    // --- CÁC HÀM CHO ARENA ---

    /**
     * Thiết lập kênh đấu trường cho server
     */
    static setArenaChannel(serverId, channelId) {
        const config = this.getServerConfig(serverId);
        config.arenaChannelId = channelId;
        this.updateServerConfig(serverId, config);
    }

    /**
     * Lấy ID kênh đấu trường hiện tại
     */
    static getArenaChannel(serverId) {
        const config = this.getServerConfig(serverId);
        return config.arenaChannelId;
    }

    // --- CONFIG FUNCTIONS (Global/Deprecated) ---
    static getConfig() {
        return readJson(CONFIG_FILE); 
    }

    static setSpawnChannel(channelId) {
        const config = this.getConfig();
        config.spawnChannelId = channelId;
        writeJson(CONFIG_FILE, config);
    }
    
}