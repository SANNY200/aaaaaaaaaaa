const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys');

const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions');
const fs = require('fs-extra');
const path = require('path');
const P = require('pino');
const config = require('./config');
const qrcode = require('qrcode-terminal');
const util = require('util');
const { sms, downloadMediaMessage } = require('./lib/msg');
const axios = require('axios');
const { File } = require('megajs');
const { cmd, loadPlugins } = require('./command');

// Enhanced logging setup
const logDir = path.join(__dirname, 'logs');
fs.ensureDirSync(logDir);

const logger = P({
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            destination: path.join(logDir, `bot-${new Date().toISOString().split('T')[0]}.log`),
            mkdir: true,
            timestamp: () => `,"time":"${new Date().toISOString()}"`,
            ignore: 'pid,hostname'
        }
    }
});

// Bot owner number(s)
const ownerNumber = ['94706075447'];

// Auth directory setup
const authDir = path.join(__dirname, 'auth_info_baileys');
fs.ensureDirSync(authDir);

// Enhanced session download function
const downloadSession = async (sessdata) => {
    try {
        const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
        const data = await new Promise((resolve, reject) => {
            filer.download((err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });

        await fs.writeFile(path.join(authDir, 'creds.json'), data);
        logger.info("Session downloaded successfully ✅");
    } catch (error) {
        logger.error('Session download error:', error);
        throw error;
    }
};

// Enhanced session check
const ensureSession = async () => {
    const credsPath = path.join(authDir, 'creds.json');
    if (!fs.existsSync(credsPath)) {
        if (!config.SESSION_ID) {
            throw new Error('SESSION_ID not found in environment variables');
        }
        await downloadSession(config.SESSION_ID);
    }
};

// Main connection function
async function connectToWA() {
    try {
        // Initialize essentials
        await ensureSession();
        const connectDB = require("./lib/mongodb");
        await connectDB();

        // Read environment config
        const { readEnv } = require('./lib/database');
        const botConfig = await readEnv();
        const prefix = botConfig.PREFIX || '.';

        // Initialize WhatsApp connection
        const { state, saveCreds } = await useMultiFileAuthState(authDir);
        const { version } = await fetchLatestBaileysVersion();

        const conn = makeWASocket({
            logger: P({ level: 'silent' }),
            printQRInTerminal: true,
            browser: Browsers.macOS("Chrome"),
            auth: state,
            version
        });

        // Connection update handler
        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                logger.info('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
                
                if (shouldReconnect) {
                    await connectToWA();
                }
            } else if (connection === 'open') {
                logger.info('Bot connected successfully! 🎉');
                
                // Load plugins
                loadPlugins(path.join(__dirname, 'plugins'));

                // Send connection message to owner
                const message = `${config.BOT_NAME} connected successfully ✅\n\nPrefix: ${prefix}\nTime: ${new Date().toLocaleString()}`;
                
                for (const owner of ownerNumber) {
                    await conn.sendMessage(owner + "@s.whatsapp.net", {
                        image: { url: config.ALIVE_LOGO },
                        caption: message
                    });
                }
            }
        });

        // Credentials update handler
        conn.ev.on('creds.update', saveCreds);

        // Load message handler
        require('./message_handler')(conn);

        return conn;

    } catch (error) {
        logger.error('Fatal error in connectToWA:', error);
        
        // Attempt reconnection after delay
        setTimeout(connectToWA, 10000);
    }
}

// Express server setup
const express = require("express");
const app = express();
const port = process.env.PORT || 8080;

app.get("/", (req, res) => {
    res.status(200).send(`${config.BOT_NAME} is running! 🤖\nUptime: ${runtime(process.uptime())}`);
});

// Initialize server and bot
app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
    setTimeout(connectToWA, 2000);
});

// Graceful shutdown handler
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Performing graceful shutdown...');
    
    // Cleanup code here if needed
    
    process.exit(0);
});

module.exports = app;
