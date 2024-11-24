const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const path = require('path');
const P = require('pino');
const config = require('./config');
const express = require('express');

// Logger configuration
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logger = P({
    transport: {
        target: 'pino-pretty',
        options: { colorize: true, destination: path.join(logDir, 'bot.log') }
    }
});

// Directories for sessions and plugins
const authDir = path.join(__dirname, 'auth_info_baileys');
if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
}

const pluginsDir = path.join(__dirname, 'plugins');
if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir);
}

// Ensure session exists
const ensureSession = async () => {
    const credsPath = path.join(authDir, 'creds.json');
    if (!fs.existsSync(credsPath)) {
        logger.error('No session file found. Please configure SESSION_ID.');
        process.exit(1);
    }
};

// Load plugins dynamically
const loadPlugins = () => {
    const pluginFiles = fs.readdirSync(pluginsDir).filter(file => file.endsWith('.js'));

    logger.info(`Loading ${pluginFiles.length} plugins...`);
    pluginFiles.forEach(file => {
        try {
            const pluginPath = path.join(pluginsDir, file);
            require(pluginPath);
            logger.info(`✅ Loaded plugin: ${file}`);
        } catch (error) {
            logger.error(`❌ Failed to load plugin ${file}:`, error);
        }
    });
};

// Express server for health check
const app = express();
app.get('/', (req, res) => res.send('Sanidu Bot is running! 🤖'));

const port = process.env.PORT || 8080;
app.listen(port, () => logger.info(`Server running on port ${port}`));

// Main WhatsApp connection function
const connectToWA = async () => {
    try {
        await ensureSession();

        const { state, saveCreds } = await useMultiFileAuthState(authDir);
        const { version } = await fetchLatestBaileysVersion();

        const conn = makeWASocket({
            logger: P({ level: 'silent' }),
            auth: state,
            browser: Browsers.macOS('Chrome'),
            version
        });

        conn.ev.on('connection.update', update => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                logger.warn(`Connection closed. Reconnecting: ${shouldReconnect}`);
                if (shouldReconnect) connectToWA();
            } else if (connection === 'open') {
                logger.info('WhatsApp connected successfully!');
                loadPlugins();
            }
        });

        conn.ev.on('creds.update', saveCreds);
    } catch (error) {
        logger.error('Error in WhatsApp connection:', error);
        setTimeout(connectToWA, 5000); // Retry connection after 5 seconds
    }
};

connectToWA();

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down...');
    process.exit(0);
});
