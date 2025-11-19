// utils.js
const fs = require("fs");
const path = require("path");

function readJSON(file) {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function choose(array) {
    return array[randomInt(0, array.length - 1)];
}

module.exports = { readJSON, writeJSON, randomInt, choose };
