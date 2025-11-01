const { SlashCommandBuilder } = require("discord.js");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require("@discordjs/voice");
const playdl = require("play-dl");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Phát nhạc từ YouTube (link hoặc tên bài hát)")
    .addStringOption(option =>
      option.setName("query")
        .setDescription("Link YouTube hoặc tên bài hát")
        .setRequired(true)
    ),

  async execute(interaction) {
    const query = interaction.options.getString("query");
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel)
      return interaction.reply("❌ Bạn phải vào kênh thoại trước!");

    await interaction.deferReply();

    try {
      let songInfo;
      if (playdl.yt_validate(query) === "video") {
        songInfo = await playdl.video_basic_info(query);
      } else {
        const search = await playdl.search(query, { limit: 1 });
        if (!search.length) return interaction.editReply("❌ Không tìm thấy bài hát nào.");
        songInfo = await playdl.video_basic_info(search[0].url);
      }

      const stream = await playdl.stream(songInfo.video_details.url);
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      const player = createAudioPlayer();
      const resource = createAudioResource(stream.stream, { inputType: stream.type });
      player.play(resource);
      connection.subscribe(player);

      await interaction.editReply(`🎵 Đang phát: **${songInfo.video_details.title}**`);

      player.on(AudioPlayerStatus.Idle, () => connection.destroy());
    } catch (err) {
      console.error(err);
      await interaction.editReply("⚠️ Không thể phát nhạc. Có thể link bị lỗi hoặc video riêng tư.");
    }
  }
};
