// rankSystem.js
function getMaxLevel(quality){
    switch(quality){
        case "Common": return 50;
        case "Uncommon": return 60;
        case "Rare": return 70;
        case "Epic": return 100;
        case "Legendary":
        case "Mythic": return 200;
        default: return 50;
    }
}

function rankStatsByQuality(pet){
    const add = {Common:0, Uncommon:0, Rare:0, Epic:100, Legendary:200, Mythic:200}[pet.quality] || 0;
    for(const key in pet.stats){
        if(key !== "gene") pet.stats[key] += add;
    }
    return pet;
}

module.exports = { getMaxLevel, rankStatsByQuality };
