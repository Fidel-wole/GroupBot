require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const fs = require("fs");
const cron = require("node-cron");
const express = require("express");

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const JOB_API_ENDPOINT = "https://remoteworldwide.net/api/jobs/bot";
const PORT = process.env.PORT || 3000;

let groupChatIds = [];
const postedJobIds = new Set();

if (fs.existsSync("groupChatIds.json")) {
  groupChatIds = JSON.parse(fs.readFileSync("groupChatIds.json", "utf8"));
}

const saveGroupChatIds = () => {
  fs.writeFileSync("groupChatIds.json", JSON.stringify(groupChatIds, null, 2));
};

bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  if (["group", "supergroup"].includes(msg.chat.type)) {
    if (!groupChatIds.includes(chatId)) {
      groupChatIds.push(chatId);
      saveGroupChatIds();
      console.log(`Added new group: ${chatId}`);
    }
  }
});

const fetchAndPostJobs = async () => {
  try {
    const { data: jobs } = await axios.get(JOB_API_ENDPOINT);

    for (const job of jobs) {
      if (postedJobIds.has(job.id) || !job.isActive) continue; // Skip already posted or inactive jobs

      const jobMessage = `
📌 *${job.title}*
💼 *Company*: ${job.company.name}
📍 *Region*: ${job.region}
🕒 *Job Type*: ${job.jobType} | *Seniority*: ${job.seniority}
🏷 *Category*: ${job.category}
🔗 [Apply Here](${job.applicationUrl})
🗓 *Posted On*: ${new Date(job.createdAt).toLocaleDateString()}
      `;

      for (const groupId of groupChatIds) {
        try {
          await bot.sendMessage(groupId, jobMessage, {
            parse_mode: "Markdown",
          });
        } catch (err) {
          console.error(`Failed to send job to group ${groupId}:`, err.message);
        }
      }

      // Mark the job as posted
      postedJobIds.add(job.id);
    }
  } catch (error) {
    console.error("Error fetching jobs:", error.message);
  }
};

// Schedule job fetching every 5 minutes
cron.schedule("*/5 * * * *", () => {
  console.log("Fetching and posting jobs...");
  fetchAndPostJobs();
});

const app = express();
app.get("/", (req, res) => res.send("Bot is running."));
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
