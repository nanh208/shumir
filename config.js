// config.js
module.exports = {
    prefix: "!",
    token: process.env.BOT_TOKEN,
    dataDir: "./data",
    spawnIntervals: [0, 3, 6, 9, 12, 15, 18, 21], // giờ spawn pet đặc biệt
    petIcons: [
        "<:Rayquaza:1440702434644070533>",
        "<:kiuri:1440702420094156851>",
        "<:HuTao:1440702400611618890>",
        "<a:source:1440702357523660820>",
        "<a:pikachu:1440702320290824364>",
        "<:Furina:1440702288032436460>",
        "<a:Keqing:1440702273801027695>",
        "<a:Paimon:1440702251302787>",
        "<a:baf5c89c099b34decb7f4507b5144366:1440702202762231828>",
        "<a:hutao:1434904266597732473>",
        "<a:Klee:1434903983323086939>",
        "<a:Rem:1434903876590637086>"
    ],
    elements: ["Fire", "Water", "Earth", "Wind", "Lightning", "Ice"],
    tribes: ["Human", "Dwarf", "Elf", "Orc"],
    candyTypes: {
        normal: 200,
        premium: 1000,
        ultra: 2000
    },
    chestRarity: ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"]
};
