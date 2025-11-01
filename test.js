const play = require("play-dl");

(async () => {
  const yt = await play.search("Alan Walker Faded", { limit: 1 });
  console.log(yt);
})();
