// commands/games/tiphu.js

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createNewGame, endGame, buildGameInterface, activeMonopolyGames } = require('../../utils/monopolyLogic'); // Thay đổi đường dẫn

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tiphu')
        .setDescription('Quản lý game Cờ Tỷ Phú Discord.')
        .addSubcommand(subcommand => 
            subcommand
                .setName('start')
                .setDescription('Bắt đầu một game Cờ Tỷ Phú mới.')
                .addIntegerOption(option => 
                    option.setName('nguoichoi') // Đổi tên option sang tiếng Việt
                        .setDescription('Số lượng người chơi (2-4).')
                        .setRequired(true)
                        .setMinValue(2)
                        .setMaxValue(4)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('Kết thúc game Cờ Tỷ Phú hiện tại trong kênh.')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'start') {
            const numPlayers = interaction.options.getInteger('nguoichoi');

            await interaction.reply({ content: `Đã bắt đầu đăng ký! Cần **${numPlayers}** người chơi để bắt đầu Cờ Tỷ Phú. Click nút **Tham gia** để đăng ký.`, fetchReply: true });
            
            const joinButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('monopoly_join')
                    .setLabel('🎮 Tham gia')
                    .setStyle(ButtonStyle.Success)
            );
            
            const registrationMessage = await interaction.editReply({ components: [joinButton] });
            
            const collectedPlayers = new Set();
            collectedPlayers.add(interaction.user); 

            const filter = i => i.customId === 'monopoly_join';
            const collector = registrationMessage.createMessageComponentCollector({ filter, time: 30000 }); 

            collector.on('collect', async i => {
                if (collectedPlayers.has(i.user)) {
                    return i.reply({ content: 'Bạn đã tham gia rồi!', ephemeral: true });
                }
                collectedPlayers.add(i.user);
                
                if (collectedPlayers.size === numPlayers) {
                    collector.stop();
                } else {
                    await i.reply({ content: `Bạn đã tham gia! Cần thêm ${numPlayers - collectedPlayers.size} người nữa.`, ephemeral: true });
                }
            });

            collector.on('end', async collected => {
                if (collectedPlayers.size < numPlayers) {
                    return interaction.editReply({ content: `❌ Đăng ký thất bại. Chỉ có ${collectedPlayers.size}/${numPlayers} người tham gia. Vui lòng thử lại.`, components: [] });
                }
                
                const playerArray = Array.from(collectedPlayers.values());
                const result = createNewGame(interaction.channel, playerArray);
                
                if (!result.success) {
                    return interaction.editReply({ content: result.message, components: [] });
                }

                const { embeds, components } = buildGameInterface(result.game, `Bắt đầu Cờ Tỷ Phú với ${playerArray.length} người!`);
                const gameMessage = await interaction.editReply({ content: `Game đã bắt đầu!`, embeds: embeds, components: components });
                
                result.game.messageId = gameMessage.id;
            });
            
        } else if (subcommand === 'end') {
            if (activeMonopolyGames.has(interaction.channelId)) {
                endGame(interaction.channelId);
                await interaction.reply({ content: '✅ Game Cờ Tỷ Phú đã kết thúc.', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ Không có game nào đang hoạt động trong kênh này.', ephemeral: true });
            }
        }
    },
};