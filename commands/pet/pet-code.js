// commands/pet/pet-code.js
const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const codesFile = path.resolve(__dirname, "../../data/pet-codes.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pet")
    .setDescription("Hệ thống thú nuôi")
    .addSubcommand(sub =>
      sub
        .setName("code")
        .setDescription("Nhập giftcode để nhận quà")
        .addStringOption(opt =>
          opt
            .setName("giftcode")
            .setDescription("Nhập mã code bạn có")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    if (interaction.options.getSubcommand() !== "code") return;

    const userId = interaction.user.id;
    const inputCode = interaction.options.getString("giftcode").toUpperCase();

    // Load codes file
    let codes = {};
    try {
      codes = JSON.parse(fs.readFileSync(codesFile, "utf8"));
    } catch {
      return interaction.reply({
        content: "❌ Hệ thống code đang lỗi. (Không đọc được file)",
        ephemeral: true
      });
    }

    // Check code tồn tại
    const gift = codes[inputCode];
    if (!gift)
      return interaction.reply({
        content: "❌ Giftcode không tồn tại.",
        ephemeral: true
      });

    // Check hết hạn
    if (gift.expires && Date.now() > gift.expires) {
      return interaction.reply({
        content: "⏰ Giftcode đã hết hạn!",
        ephemeral: true
      });
    }

    // Check đã dùng chưa
    gift.usedBy = gift.usedBy || [];

    if (gift.usedBy.includes(userId)) {
      return interaction.reply({
        content: "⚠️ Bạn đã dùng code này rồi!",
        ephemeral: true
      });
    }

    // Đánh dấu đã dùng code
    gift.usedBy.push(userId);
    fs.writeFileSync(codesFile, JSON.stringify(codes, null, 2));

    // Bắt đầu xử lý phần thưởng
    let rewardText = "🎁 **Nhập mã thành công! Bạn nhận được:**\n";
    const reward = gift.reward;

    // 1. Kẹo hiếm
    if (reward.rareCandy) {
      rewardText += `🍬 +${reward.rareCandy} Kẹo Hiếm\n`;
      // TODO: lưu vào data người chơi
    }

    // 2. Random Pet (Không Legendary, Mythic)
    if (reward.randomPet) {
      const excluded = reward.randomPet.exclude || [];

      // Tạm danh sách pet đơn giản
      const allPets = [
        { name: "Wolf", tier: "normal" },
        { name: "Fox", tier: "normal" },
        { name: "Bear", tier: "rare" },
        { name: "SlimeBlue", tier: "normal" },
        { name: "SlimeGreen", tier: "normal" },
        { name: "Tiger", tier: "rare" },
        { name: "Eagle", tier: "rare" },
        { name: "MiniDragon", tier: "epic" },
        { name: "Cat", tier: "normal" },
        { name: "Dog", tier: "normal" }
      ];

      const filteredPets = allPets.filter(
        p => !excluded.includes(p.tier)
      );

      const randomPet =
        filteredPets[Math.floor(Math.random() * filteredPets.length)];

      rewardText += `🐾 Pet ngẫu nhiên: **${randomPet.name}** (Tier: ${randomPet.tier})\n`;

      // TODO: addPetToUser(userId, randomPet)
    }

    // 3. Bóng random
    if (reward.randomBalls) {
      rewardText += `🔮 +${reward.randomBalls} Bóng Ngẫu Nhiên\n`;
      // TODO: lưu vào data user
    }

    // 4. Cuộn skill random
    if (reward.randomSkillScrolls) {
      rewardText += `📜 +${reward.randomSkillScrolls} Cuộn Skill Ngẫu Nhiên\n`;
      // TODO: add scroll vào user
    }

    return interaction.reply({
      content: rewardText
    });
  },
};
