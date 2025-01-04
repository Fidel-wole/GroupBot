require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const fs = require("fs");
const cron = require("node-cron");
const express = require("express");

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const JOB_API_ENDPOINT = `${process.env.JOB_API_URL}`;
const PORT = process.env.PORT || 3000;

let groupChatIds = [];
let jobMessageMap = {}; // Tracks job IDs and message details

// Load data from JSON files if available
if (fs.existsSync("groupChatIds.json")) {
  groupChatIds = JSON.parse(fs.readFileSync("groupChatIds.json", "utf8"));
}
if (fs.existsSync("jobMessageMap.json")) {
  jobMessageMap = JSON.parse(fs.readFileSync("jobMessageMap.json", "utf8"));
}

// Save data to JSON files
const saveGroupChatIds = () => {
  fs.writeFileSync("groupChatIds.json", JSON.stringify(groupChatIds, null, 2));
};
const saveJobMessageMap = () => {
  fs.writeFileSync(
    "jobMessageMap.json",
    JSON.stringify(jobMessageMap, null, 2)
  );
};

// Track new group IDs
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

// Fetch and post or update jobs
const fetchAndPostJobs = async () => {
  try {
    const response = await axios.get(JOB_API_ENDPOINT, {
      headers: {
        Authorization: `Bearer - ${process.env.BEARER_TOKEN}`,
      },
    });

    const jobs = response.data.data;
    console.log(jobs);

    for (const job of jobs) {
      if (!job.isActive) continue;

      const generateHashtags = (job) => {
        const hashtags = [];
        
        // Generate a hashtag from the first three words of the job title
        if (job.title) {
          const titleWords = job.title.split(" ").slice(0, 2).join("").toLowerCase();
          hashtags.push(`#${titleWords}`);
        }
      
        // Add hashtags for the region and job type
        if (job.region) 
          hashtags.push(`#${job.region.toLowerCase().replace(/ /g, "")}`);
        if (job.jobType) 
          hashtags.push(`#${job.jobType.toLowerCase().replace(/ /g, "")}`);
        
        return hashtags.join(" ");
      };
      
      const jobMessage = `
      [${job.title}](${job.applicationUrl}) at *${job.company.name}*
      
🌍 *#Remote* ${job.region}
    
📍 Anywhere in the world
      
#wordwideremote 
#remoteworldwide
${generateHashtags(job)}
      `;
      
      if (jobMessageMap[job.id]) {
        // Update existing messages if content has changed
        if (jobMessageMap[job.id].content !== jobMessage) {
          for (const [groupId, messageId] of Object.entries(
            jobMessageMap[job.id].groups
          )) {
            try {
              await bot.editMessageText(jobMessage, {
                chat_id: groupId,
                message_id: messageId,
                parse_mode: "Markdown",
              });
            } catch (err) {
              console.error(
                `Failed to update message in group ${groupId}:`,
                err.message
              );
            }
          }
          jobMessageMap[job.id].content = jobMessage;
          saveJobMessageMap();
        }
      } else {
        // Post new job to all groups
        jobMessageMap[job.id] = { content: jobMessage, groups: {} };

        for (const groupId of groupChatIds) {
          try {
            const sentMessage = await bot.sendMessage(groupId, jobMessage, {
              parse_mode: "Markdown",
            });
            jobMessageMap[job.id].groups[groupId] = sentMessage.message_id;
          } catch (err) {
            console.error(
              `Failed to send job to group ${groupId}:`,
              err.message
            );
          }
        }
        saveJobMessageMap();
      }
    }
  } catch (error) {
    console.error("Error fetching jobs:", error.message);
  }
};

// Schedule job fetching every minute
cron.schedule("0 0 * * *", () => {
  console.log("Fetching and posting jobs...");
  fetchAndPostJobs();
});

const app = express();
app.get("/", (req, res) => res.send("Bot is running."));
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
