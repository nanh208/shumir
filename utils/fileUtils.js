// utils/fileUtils.js
const fs = require('fs');
const path = require('path');

/**
 * Reads and parses a JSON file synchronously.
 * @param {string} filePath - Path to the JSON file.
 * @returns {Object} Parsed JSON data or an empty object on error/missing file.
 */
function readJSON(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error(`[FileUtil] Error reading JSON file ${filePath}:`, e.message);
    }
    return {};
}

/**
 * Writes an object to a JSON file synchronously.
 * @param {string} filePath - Path to the JSON file.
 * @param {Object} data - JavaScript object to write.
 */
function writeJSON(filePath, data) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error(`[FileUtil] Error writing JSON file ${filePath}:`, e.message);
    }
}

module.exports = {
    readJSON,
    writeJSON
};