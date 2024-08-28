# Telegram Bot for Group Posting

This project is a Node.js-based Telegram bot that allows users to send a JSON array of blog posts to multiple Telegram groups. The bot uses polling to receive messages and integrates with Express to provide a basic health check endpoint.

## Features

- Receive and process JSON arrays of blog posts.
- Send messages and photos to multiple Telegram groups.
- Provide a basic health check endpoint via Express.

## Installation

Follow these steps to set up the project on your local machine:

1. **Clone the Repository**

   ```bash
   git clone https://github.com/Fidel-wole/GroupBot
   cd GroupBot
2. **Install Dependencies**
Make sure you have Node.js installed. Then, install the required npm packages:
   ```bash
   npm install
3. **Set Up Environment Variables**
Create a `.env` file in the root directory of the project and add your Telegram bot token:
   ```plaintext
   TELEGRAM_BOT_TOKEN=your-telegram-bot-token
4. **Running the Bot**
      ```bash
      npm start
