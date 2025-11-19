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

            // Defer an ephemeral acknowledgement so the command doesn't time out
            await interaction.deferReply({ ephemeral: true }).catch(()=>{});

            const joinButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('monopoly_join')
                    .setLabel('🎮 Tham gia')
                    .setStyle(ButtonStyle.Success)
            );

            // Send a public registration message in the channel and use it for collecting
            const registrationMessage = await interaction.channel.send({ content: `Đã bắt đầu đăng ký! Cần **${numPlayers}** người chơi để bắt đầu Cờ Tỷ Phú. Click nút **Tham gia** để đăng ký.`, components: [joinButton] });

            // Acknowledge to the command user
            await interaction.editReply({ content: `✅ Đã mở đăng ký trong kênh <#${interaction.channel.id}>`, ephemeral: true }).catch(()=>{});

            const collectedPlayers = new Set();
            collectedPlayers.add(interaction.user.id);

            const filter = i => i.customId === 'monopoly_join';
            const collector = registrationMessage.createMessageComponentCollector({ filter, time: 30000 });

            collector.on('collect', async i => {
                try {
                    if (collectedPlayers.has(i.user.id)) {
                        return i.reply({ content: 'Bạn đã tham gia rồi!', ephemeral: true }).catch(()=>{});
                    }
                    collectedPlayers.add(i.user.id);

                    if (collectedPlayers.size === numPlayers) {
                        collector.stop();
                    } else {
                        await i.reply({ content: `Bạn đã tham gia! Cần thêm ${numPlayers - collectedPlayers.size} người nữa.`, ephemeral: true }).catch(()=>{});
                    }
                } catch (err) {
                    console.error('Error in collector.collect:', err);
                }
            });

            collector.on('end', async collected => {
                try {
                    if (collectedPlayers.size < numPlayers) {
                        await registrationMessage.edit({ content: `❌ Đăng ký thất bại. Chỉ có ${collectedPlayers.size}/${numPlayers} người tham gia. Vui lòng thử lại.`, components: [] }).catch(()=>{});
                        return;
                    }

                    // Build player objects with id and username (fetch members)
                    const playerIds = Array.from(collectedPlayers.values());
                    const playerArray = [];
                    for (const id of playerIds) {
                        try {
                            const member = await interaction.guild.members.fetch(id).catch(() => null);
                            const username = member ? (member.displayName || member.user.username) : id;
                            playerArray.push({ id, username });
                        } catch (e) {
                            console.warn('Không thể fetch member', id, e);
                            playerArray.push({ id, username: id });
                        }
                    }

                    const result = createNewGame(interaction.channel, playerArray);

                    if (!result.success) {
                        await registrationMessage.edit({ content: result.message, components: [] }).catch(()=>{});
                        return;
                    }

                    const { embeds, components } = buildGameInterface(result.game, `Bắt đầu Cờ Tỷ Phú với ${playerArray.length} người!`);
                    const gameMessage = await registrationMessage.edit({ content: `Game đã bắt đầu!`, embeds: embeds, components: components }).catch(()=>null);

                    if (gameMessage) result.game.messageId = gameMessage.id;
                } catch (err) {
                    console.error('Error in collector.end:', err);
                }
            });
            
            return;
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