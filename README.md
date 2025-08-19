# Telegram Bot App

This project is a Telegram bot that collects users' birth date, time, and gender, uploads this data daily to a neural network, and sends the results back to users. It also includes a subscription feature for daily updates.

## Features

- Collects user birth date, time, and gender.
- Uploads user data to a neural network (e.g., DeepSeek).
- Sends daily results back to users.
- Subscription management for daily updates.

## Project Structure

```
telegram-bot-app
├── src
│   ├── bot.js             # Main entry point for the Telegram bot
│   ├── db
│   │   └── index.js       # Database connection and operations
│   ├── neural
│   │   └── upload.js      # Logic for uploading data to the neural network
│   ├── subscription
│   │   └── index.js       # Subscription management
│   ├── utils
│   │   └── index.js       # Utility functions
│   └── config.js          # Configuration settings
├── package.json            # npm configuration file
└── README.md               # Project documentation
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```
   cd telegram-bot-app
   ```

3. Install the dependencies:
   ```
   npm install
   ```

## Usage

1. Configure the bot by editing the `env` file according to `env.exm` file with your API keys and database connection strings.

2. Start the bot:
   ```
   node src/bot.js
   ```

3. Interact with the bot on Telegram to provide your birth date, time, and gender.

## Database

This project uses PostgreSQL or SQLite for storing user data. Ensure that your database is set up and configured correctly in `src/db/index.js`.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue for any suggestions or improvements.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.