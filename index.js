require('dotenv').config();
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

let groupChatIds = [];

if (fs.existsSync("groupChatIds.json")) {
  groupChatIds = JSON.parse(fs.readFileSync("groupChatIds.json", "utf8"));
}

const saveGroupChatIds = () => {
  fs.writeFileSync("groupChatIds.json", JSON.stringify(groupChatIds));
};

bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  if (msg.chat.type === "group" || msg.chat.type === "supergroup") {
    if (!groupChatIds.includes(chatId)) {
      groupChatIds.push(chatId);
      saveGroupChatIds();
    }
  }

  if (msg.chat.type === "private") {
    try {
      const posts = JSON.parse(msg.text);

      if (Array.isArray(posts)) {
        posts.forEach((post) => {
          const message = `
${post.description}\n
Tag: ${post.tag}\n
Read more: ${post.linkToBlog}
`;

          groupChatIds.forEach((groupId) => {
            if (post.image) {
              bot.sendPhoto(groupId, post.image, { caption: message });
            } else {
              bot.sendMessage(groupId, message);
            }
          });

        });
        bot.sendMessage(chatId, "Message sent to groups successfully")
      } else {
        bot.sendMessage(chatId, "Please send a valid JSON array.");
      }
    } catch (error) {
      bot.sendMessage(
        chatId,
        "There was an error processing your message. Please make sure the format is correct."
      );
    }
  }
});


bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Hello! Send me a JSON array of blog posts, and I'll share them with your groups."
  );
});
