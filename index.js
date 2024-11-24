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

// Create required directories
const createDirs = () => {
    const dirs = ['logs', 'auth_info_baileys'];
    dirs.forEach(dir => {
        const dirPath = path.join(__dirname, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    });
}
createDirs();

// Enhanced logging
const logger = P({
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            destination: path.join(__dirname, 'logs', 'bot.log'),
            mkdir: true
        }
    }
});

const ownerNumber = config.OWNER_NUMBER || ['94706075447']

// Session handling
const downloadSession = async (sessdata) => {
    try {
        const filer = File.fromURL(`https://mega.nz/file/${sessdata}`);
        const data = await new Promise((resolve, reject) => {
            filer.download((err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
        
        await fs.promises.writeFile(path.join(__dirname, 'auth_info_baileys', 'creds.json'), data);
        logger.info("Session downloaded successfully ✅");
    } catch (error) {
        logger.error('Session download error:', error);
        throw error;
    }
};

const ensureSession = async () => {
    const credsPath = path.join(__dirname, 'auth_info_baileys', 'creds.json');
    if (!fs.existsSync(credsPath)) {
        if (!config.SESSION_ID) {
            throw new Error('Please add your session to SESSION_ID env!!');
        }
        await downloadSession(config.SESSION_ID);
    }
};

// Plugin loader
const loadPlugins = () => {
    const pluginsDir = path.join(__dirname, 'plugins');
    if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir);
        logger.info('Created plugins directory');
        return;
    }

    const pluginFiles = fs.readdirSync(pluginsDir)
        .filter(file => file.endsWith('.js'));
    
    logger.info(`Loading ${pluginFiles.length} plugins...`);

    for (const file of pluginFiles) {
        try {
            require(path.join(pluginsDir, file));
            logger.info(`✅ Loaded plugin: ${file}`);
        } catch (err) {
            logger.error(`❌ Error loading plugin ${file}:`, err);
        }
    }
};

// Express server setup
const express = require("express");
const app = express();
const port = process.env.PORT || 8080;

app.get("/", (req, res) => {
    res.status(200).send(`${config.BOT_NAME} is running! 🤖`);
});

// WhatsApp connection
async function connectToWA() {
    try {
        await ensureSession();
        const connectDB = require("./lib/mongodb");
        await connectDB();

        const { readEnv } = require('./lib/database');
        const config = await readEnv(' ');
        const prefix = config.PREFIX || '.';

        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
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
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                logger.info(`Connection closed. Reconnect: ${shouldReconnect}`);
                
                if (shouldReconnect) {
                    setTimeout(connectToWA, 3000);
                }
            } else if (connection === 'open') {
                logger.info('Bot connected successfully! 🎉');
                loadPlugins();

                // Send connection message to owner
                const status = `
${config.BOT_NAME} connected successfully ✅

⚡ PREFIX: ${prefix}
📅 DATE: ${new Date().toLocaleDateString()}
⏰ TIME: ${new Date().toLocaleTimeString()}
                `;

                for (const owner of ownerNumber) {
                    await conn.sendMessage(owner + "@s.whatsapp.net", {
                        image: { url: config.ALIVE_IMAGE || 'https://telegra.ph/file/900435c6d3157c98c3c88.jpg' },
                        caption: status
                    }).catch(err => logger.error('Error sending owner message:', err));
                }
            }
        });

        conn.ev.on('creds.update', saveCreds);
        
        require('./message_handler')(conn);

    } catch (err) {
        logger.error('Fatal error in connectToWA:', err);
        setTimeout(connectToWA, 5000);
    }
}

// Start server and bot
app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
    setTimeout(connectToWA, 3000);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    try {
        // Cleanup tasks here
        process.exit(0);
    } catch (err) {
        logger.error('Error during shutdown:', err);
        process.exit(1);
    }
});

// Command handler classes
class BaseCommand {
    constructor(options = {}) {
        this.pattern = options.pattern || '';
        this.alias = options.alias || [];
        this.desc = options.desc || '';
        this.category = options.category || 'misc';
        this.filename = options.filename || __filename;
        this.cooldown = options.cooldown || 0;
        this.ownerOnly = options.ownerOnly || false;
    }

    async execute(conn, msg, args) {
        throw new Error('Execute method must be implemented');
    }
}

// Core commands
class AliveCommand extends BaseCommand {
    constructor() {
        super({
            pattern: "alive",
            desc: "Check bot status",
            category: "main",
            filename: __filename
        });
    }

    async execute(conn, mek, { from, reply }) {
        try {
            const config = await readEnv();
            const uptime = runtime(process.uptime());
            
            const aliveMessage = `
🤖 *Bot Status:* Online
⚡ *Version:* ${process.env.VERSION || '2.0.0'}
⏱️ *Uptime:* ${uptime}
👑 *Owner:* ${config.OWNER_NAME || 'Sanidu'}

${config.ALIVE_MESSAGE || ''}`;

            await conn.sendMessage(from, {
                image: { url: config.ALIVE_IMAGE || 'https://telegra.ph/file/900435c6d3157c98c3c88.jpg' },
                caption: aliveMessage
            }, { quoted: mek });
            
        } catch (error) {
            logger.error('Alive command error:', error);
            reply('❌ Error: ' + error.message);
        }
    }
}

class MenuCommand extends BaseCommand {
    constructor() {
        super({
            pattern: "menu",
            desc: "Show command list",
            category: "main",
            filename: __filename
        });
    }

    async execute(conn, mek, { from, pushname, reply }) {
        try {
            const config = await readEnv();
            const categories = {
                main: '🧠 Main',
                download: '⬇️ Download',
                group: '👥 Group',
                owner: '👑 Owner',
                convert: '🔄 Convert',
                search: '🔍 Search'
            };

            let menu = {};
            Object.keys(categories).forEach(cat => menu[cat] = '');

            // Organize commands
            commands.forEach(cmd => {
                if (cmd.pattern && !cmd.dontAddCommandList) {
                    const category = cmd.category || 'misc';
                    menu[category] += `\n${config.PREFIX || '.'}${cmd.pattern} - ${cmd.desc || 'No description'}`;
                }
            });

            let menuText = `Hello ${pushname || 'User'} 👋\n\n`;
            
            Object.entries(categories).forEach(([category, title]) => {
                if (menu[category]) {
                    menuText += `${title}\n${menu[category]}\n\n`;
                }
            });

            menuText += `\n*${config.BOT_NAME}* by ${config.OWNER_NAME}`;

            await conn.sendMessage(from, {
                image: { url: config.MENU_IMAGE || config.ALIVE_IMAGE },
                caption: menuText
            }, { quoted: mek });

        } catch (error) {
            logger.error('Menu command error:', error);
            reply('❌ Error: ' + error.message);
        }
    }
}

class SystemCommand extends BaseCommand {
    constructor() {
        super({
            pattern: "system",
            alias: ["status", "info"],
            desc: "System information",
            category: "main",
            filename: __filename
        });
    }

    async execute(conn, mek, { reply }) {
        try {
            const os = require('os');
            const formatBytes = (bytes) => {
                const units = ['B', 'KB', 'MB', 'GB'];
                let i = 0;
                while (bytes >= 1024 && i < units.length - 1) {
                    bytes /= 1024;
                    i++;
                }
                return `${bytes.toFixed(2)} ${units[i]}`;
            };

            const status = `*${config.BOT_NAME} System Status*

🕒 Uptime: ${runtime(process.uptime())}
💻 Platform: ${os.platform()}
💾 Memory: ${formatBytes(process.memoryUsage().heapUsed)}
🔄 Version: ${process.env.VERSION || '2.0.0'}
👑 Owner: ${config.OWNER_NAME}`;

            reply(status);

        } catch (error) {
            logger.error('System command error:', error);
            reply('❌ Error: ' + error.message);
        }
    }
}

class RestartCommand extends BaseCommand {
    constructor() {
        super({
            pattern: "restart",
            desc: "Restart bot",
            category: "owner",
            filename: __filename,
            ownerOnly: true
        });
    }

    async execute(conn, mek, { reply }) {
        try {
            await reply("🔄 Restarting...");
            await sleep(1500);

            const { exec } = require("child_process");
            exec("pm2 restart all", (error, stdout, stderr) => {
                if (error) {
                    logger.error('Restart error:', error);
                    reply('❌ Error: ' + error.message);
                    return;
                }
                logger.info('Bot restarted successfully');
            });

        } catch (error) {
            logger.error('Restart command error:', error);
            reply('❌ Error: ' + error.message);
        }
    }
}

// Register commands
const registerCommands = () => {
    return [
        new AliveCommand(),
        new MenuCommand(),
        new SystemCommand(),
        new RestartCommand()
    ];
};

module.exports = {
    BaseCommand,
    registerCommands,
    connectToWA,
    app
};
