// commands/games/tiphu.js

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { createNewGame, endGame, buildGameInterface, activeMonopolyGames } = require('../../utils/monopolyLogic');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tiphu')
        .setDescription('Quản lý game Cờ Tỷ Phú Discord.')
        .addSubcommand(subcommand => 
            subcommand
                .setName('start')
                .setDescription('Bắt đầu một game Cờ Tỷ Phú mới.')
                .addIntegerOption(option => 
                    option.setName('nguoichoi')
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

            // [FIX] Sử dụng MessageFlags thay cho ephemeral: true để tránh warning
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] }).catch(()=>{});

            const joinButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('monopoly_join')
                    .setLabel('🎮 Tham gia')
                    .setStyle(ButtonStyle.Success)
            );

            const registrationMessage = await interaction.channel.send({ content: `Đã bắt đầu đăng ký! Cần **${numPlayers}** người chơi để bắt đầu Cờ Tỷ Phú. Click nút **Tham gia** để đăng ký.`, components: [joinButton] });

            await interaction.editReply({ content: `✅ Đã mở đăng ký trong kênh <#${interaction.channel.id}>` }).catch(()=>{});

            const collectedPlayers = new Set();
            collectedPlayers.add(interaction.user.id);

            const filter = i => i.customId === 'monopoly_join';
            const collector = registrationMessage.createMessageComponentCollector({ filter, time: 30000 });

            collector.on('collect', async i => {
                try {
                    if (collectedPlayers.has(i.user.id)) {
                        // [FIX] Sử dụng MessageFlags
                        return i.reply({ content: 'Bạn đã tham gia rồi!', flags: [MessageFlags.Ephemeral] }).catch(()=>{});
                    }
                    collectedPlayers.add(i.user.id);

                    if (collectedPlayers.size === numPlayers) {
                        collector.stop();
                    } else {
                        // [FIX] Sử dụng MessageFlags
                        await i.reply({ content: `Bạn đã tham gia! Cần thêm ${numPlayers - collectedPlayers.size} người nữa.`, flags: [MessageFlags.Ephemeral] }).catch(()=>{});
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
                // [FIX] Sử dụng MessageFlags
                await interaction.reply({ content: '✅ Game Cờ Tỷ Phú đã kết thúc.', flags: [MessageFlags.Ephemeral] });
            } else {
                // [FIX] Sử dụng MessageFlags
                await interaction.reply({ content: '❌ Không có game nào đang hoạt động trong kênh này.', flags: [MessageFlags.Ephemeral] });
            }
        }
    },
};