const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys')

const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions')
const fs = require('fs')
const path = require('path')
const P = require('pino')
const config = require('./config')
const qrcode = require('qrcode-terminal')
const util = require('util')
const { sms, downloadMediaMessage } = require('./lib/msg')
const axios = require('axios')
const { File } = require('megajs')

// Ensure logs directory exists
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)){
    fs.mkdirSync(logDir);
}

// Enhanced logging
const logger = P({
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            destination: path.join(logDir, 'bot.log'),
            mkdir: true
        }
    }
});

const ownerNumber = ['94706075447']

// Create auth directory if not exists
const authDir = path.join(__dirname, 'auth_info_baileys');
if (!fs.existsSync(authDir)){
    fs.mkdirSync(authDir, { recursive: true });
}

// Session download function
const downloadSession = (sessdata) => {
    return new Promise((resolve, reject) => {
        const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
        filer.download((err, data) => {
            if (err) {
                logger.error('Session download error:', err);
                reject(err);
            } else {
                fs.writeFile(path.join(authDir, 'creds.json'), data, (writeErr) => {
                    if (writeErr) {
                        logger.error('Session write error:', writeErr);
                        reject(writeErr);
                    } else {
                        logger.info("Session downloaded successfully ✅");
                        resolve();
                    }
                });
            }
        });
    });
};

// Ensure session exists
const ensureSession = async () => {
    const credsPath = path.join(authDir, 'creds.json');
    if (!fs.existsSync(credsPath)) {
        if (!config.SESSION_ID) {
            logger.error('Please add your session to SESSION_ID env!!');
            process.exit(1);
        }
        await downloadSession(config.SESSION_ID);
    }
};

// Plugin loader with error handling
const loadPlugins = () => {
    const pluginsDir = path.join(__dirname, 'plugins');
    
    // Ensure plugins directory exists
    if (!fs.existsSync(pluginsDir)){
        fs.mkdirSync(pluginsDir);
    }

    const pluginFiles = fs.readdirSync(pluginsDir)
        .filter(file => path.extname(file).toLowerCase() === '.js');
    
    logger.info(`Loading ${pluginFiles.length} plugins...`);

    pluginFiles.forEach(file => {
        try {
            const pluginPath = path.join(pluginsDir, file);
            const plugin = require(pluginPath);
            logger.info(`✅ Loaded plugin: ${file}`);
        } catch (err) {
            logger.error(`❌ Error loading plugin ${file}:`, err);
        }
    });
};

// Express setup for render
const express = require("express");
const app = express();
const port = process.env.PORT || 8080;

// Health check endpoint
app.get("/", (req, res) => {
    res.status(200).send("Sanidu Bot is running! 🤖");
});

// Main connection function
async function connectToWA() {
    try {
        // Ensure session and database
        await ensureSession();
        const connectDB = require("./lib/mongodb");
        await connectDB();

        // Read environment config
        const { readEnv } = require('./lib/database');
        const config = await readEnv(' ');
        const prefix = await config.PREFIX || '.';

        // Baileys connection
        const { state, saveCreds } = await useMultiFileAuthState(authDir);
        const { version } = await fetchLatestBaileysVersion();

        const conn = makeWASocket({
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
            browser: Browsers.macOS("chrome"),
            syncFullHistory: true,
            auth: state,
            version
        });

        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                const shouldReconnect = 
                    lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
                
                logger.info(`Connection closed. Reconnect: ${shouldReconnect}`);
                
                if (shouldReconnect) {
                    await connectToWA();
                }
            } else if (connection === 'open') {
                logger.info('Bot connected successfully! 🎉');
                
                // Load plugins
                loadPlugins();

                // Send connection message to owner
                const up = `Sanidu-BOT connected successful ✅\n\nPREFIX: ${prefix}`;
                conn.sendMessage(ownerNumber + "@s.whatsapp.net", { 
                    image: { url: `https://telegra.ph/file/900435c6d3157c98c3c88.jpg` }, 
                    caption: up 
                });
            }
        });

        conn.ev.on('creds.update', saveCreds);

        // Message handling logic remains the same as in your original code
        require('./message_handler')(conn);

    } catch (err) {
        logger.error('Fatal error in connectToWA:', err);
        setTimeout(connectToWA, 5000); // Retry after 5 seconds
    }
}

// Server startup
app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
    
    // Connect to WhatsApp after a short delay
    setTimeout(connectToWA, 3000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully.');
    process.exit(0);
});

module.exports = app;
