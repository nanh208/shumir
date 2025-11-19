// skillSystem.js
const skills = {
    elemental: [
        { name: "Fire Blast", element: "Fire", power: 100, manaCost: 50 },
        { name: "Water Wave", element: "Water", power: 80, manaCost: 40 },
        // ... thêm 48 skill nguyên tố
    ],
    physical: [
        { name: "Slash", power: 50, manaCost: 0 },
        { name: "Smash", power: 80, manaCost: 10 }
        // ... thêm 8 skill vật lý
    ]
};

function getRandomSkill(type="elemental") {
    return skills[type][Math.floor(Math.random() * skills[type].length)];
}

module.exports = { skills, getRandomSkill };
