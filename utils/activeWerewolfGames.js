// utils/activeWerewolfGames.js

// Map lưu trữ trạng thái các game Ma Sói đang hoạt động, khóa bằng channelId.
// Giá trị lưu trữ là Object game state.
const activeWerewolfGames = new Map();

/**
 * Bắt đầu một game mới trong kênh cụ thể và đặt trạng thái ban đầu (LOBBY).
 * @param {string} channelId ID của kênh chơi game.
 * @param {string} gameMasterId ID của người bắt đầu game.
 * @returns {object} Đối tượng trạng thái game ban đầu.
 */
function startGame(channelId, gameMasterId) {
    if (activeWerewolfGames.has(channelId)) {
        throw new Error(`A game is already active in channel ${channelId}.`);
    }

    const initialGameState = {
        channelId,
        status: 'LOBBY', // LOBBY, IN_PROGRESS, ENDED, night, day
        gameMaster: gameMasterId,
        
        // Cần dùng Map để đồng bộ với logic game (sử dụng .get(), .set(), .values())
        players: new Map(), // Key: userId, Value: { id, username, isAlive, ... }
        roles: new Map(), // Key: userId, Value: roleKey (e.g., 'WEREWOLF')
        
        // Các biến trạng thái game
        day: 0, 
        lastProtectedId: null,
        currentVoteMessageId: null,
        dayVotes: new Map(), // Key: voterId, Value: targetId
        nightActions: new Map(), // Key: roleKey, Value: { performerId, targetId }
        dayVoteCounts: {}, // Object để đếm số phiếu dễ dàng hơn
        
        settings: {
            minPlayers: 5,
        },
    };

    activeWerewolfGames.set(channelId, initialGameState);
    return initialGameState;
}

/**
 * Truy xuất trạng thái hiện tại của một game.
 * @param {string} channelId ID của kênh.
 * @returns {object | undefined} Trạng thái game hoặc undefined nếu không tìm thấy.
 */
function getGame(channelId) {
    return activeWerewolfGames.get(channelId);
}

/**
 * Cập nhật trạng thái của một game hiện có.
 * @param {string} channelId ID của kênh.
 * @param {object} newState Một đối tượng chứa trạng thái mới muốn hợp nhất.
 * @returns {object | undefined} Trạng thái game đã cập nhật hoặc undefined nếu không tìm thấy.
 */
function updateGame(channelId, newState) {
    const currentState = activeWerewolfGames.get(channelId);
    if (!currentState) {
        return undefined;
    }
    // Hợp nhất (merge) các thuộc tính mới
    const updatedState = { ...currentState, ...newState };
    activeWerewolfGames.set(channelId, updatedState);
    return updatedState;
}

/**
 * Kết thúc và xóa một game khỏi danh sách.
 * @param {string} channelId ID của kênh.
 * @returns {boolean} True nếu game đã bị xóa, false nếu không tìm thấy.
 */
function deleteGame(channelId) {
    return activeWerewolfGames.delete(channelId);
}

module.exports = {
    activeWerewolfGames,
    startGame,
    getGame,
    updateGame,
    deleteGame,
};