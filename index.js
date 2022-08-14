// Twit
const newClient = require("./twitterClient");

// Twitter API

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});
const appOnlyClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);

const tweeting = async () => {
  // Twitter api v2
  const stream = appOnlyClient.v2.searchStream({
    autoConnect: false,
    "tweet.fields": [
      "referenced_tweets",
      "author_id",
      "in_reply_to_user_id",
      "id",
    ],
    expansions: ["referenced_tweets.id"],
  });

  //   streamer
  stream.on(ETwitterStreamEvent.Data, async (tweet) => {
    console.log("New Request!");
    const isAQRt = tweet.data.referenced_tweets?.some(
      (tweet) => tweet.type === "quoted"
    );
    if (isAQRt) {
      console.log(isAQRt);
      return;
    }
    const meAsUser = await client.v2.me({ expansions: ["pinned_tweet_id"] });

    const user = await client.v2.user(tweet.data.author_id, {
      "tweet.fields": ["id", "text"],
    });

    let text = tweet.data.text;
    let trimmedText = text.trim();
    let confirmText = trimmedText.split(" ");
    let newText = trimmedText.split(" ");
    newText.pop();
    let lastDate = newText.pop();
    let penultimate = newText.pop();
    let queryText = newText.join(" ");

    // seaech tweet function start
    let params;

    if (queryText.slice(0, 2) === "@/") {
      let querySlashText1 = queryText.slice(0, 2).replace("@/", "@");
      let querySlashText2 = queryText.slice(2, queryText.length);
      let querySlashText = querySlashText1 + querySlashText2;
      if (penultimate.slice(4, 5) === "-" && penultimate.slice(7, 8) === "-") {
        params = {
          q: `from:${querySlashText} since:${penultimate} until:${lastDate}`,
        };
      } else {
        params = {
          q: `from:${querySlashText} ${penultimate} since:${lastDate}`,
        };
      }
    } else if (queryText.slice(0, 1) === "@") {
      if (penultimate.slice(4, 5) === "-" && penultimate.slice(7, 8) === "-") {
        params = {
          q: `from:${queryText} since:${penultimate} until:${lastDate}`,
        };
      } else {
        params = {
          q: `from:${queryText} ${penultimate} since:${lastDate}`,
        };
      }
    } else {
      if (penultimate.slice(4, 5) === "-" && penultimate.slice(7, 8) === "-") {
        params = {
          q: `${queryText} since:${penultimate} until:${lastDate}`,
        };
      } else {
        params = {
          q: `${queryText} ${penultimate} since:${lastDate}`,
        };
      }
    }

    const getData = async (err, data, response) => {
      let link = "https://twitter.com/search?q=" + data.search_metadata.query;

      // Ignore RTs or self-sent tweets
      const isARt =
        tweet.data.referenced_tweets?.some(
          (tweet) => tweet.type === "retweeted"
        ) ?? false;

      if (isARt || tweet.data.author_id === meAsUser.data.id) {
        console.log("Try again!");
        return;
      }

      if (!tweet.data.in_reply_to_user_id) {
        // to confirm if convention is followed
        if (confirmText[confirmText.length - 1] === "@tweetdatebot") {
          await client.v2.reply(
            `Hi ${user.data.name}, thank you for using me and here is your link: ${link}.  Please follow me if I served you well and tell your friends about me! Cheers :-)`,
            tweet.data.id
          );
        } else {
          // to confirm if convention is not followed
          await client.v2.reply(
            `Hi ${user.data.name}, it seems you didn't follow the convention :-(. Please check my pinned tweet for instructions and try again. Cheers! :-)`,
            tweet.data.id
          );
        }
      }
    };

    newClient.get("search/tweets", params, getData);
    //   search tweet funtion end
  });

  stream.on(ETwitterStreamEvent.Connected, () =>
    console.log("Stream has started.")
  );

  // Start stream!
  await stream.connect({ autoReconnect: true, autoReconnectRetries: Infinity });

  //   // Add rules
  //   const added = await appOnlyClient.v2.updateStreamRules({
  //     add: [{ value: "@tweetdatebot" }],
  //   });

  //   const deleted = await appOnlyClient.v2.updateStreamRules({
  //     delete: {
  //       ids: ["1549194059507331072"],
  //     },
  //   });

  //   const rules = await appOnlyClient.v2.streamRules();

  //   // Log every rule ID
  //   console.log(rules.data.map((rule) => rule.id));
  //   //   await client.v2.reply("reply to previously created tweet.", createdTweet.id);
};

tweeting();
