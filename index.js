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


// commandHandler.js - Base command handler class
class BaseCommand {
    constructor(options) {
        this.pattern = options.pattern;
        this.alias = options.alias || [];
        this.desc = options.desc;
        this.category = options.category;
        this.filename = options.filename;
        this.cooldown = options.cooldown || 0;
        this.ownerOnly = options.ownerOnly || false;
    }

    async execute(conn, msg, args) {
        throw new Error('Execute method must be implemented');
    }
}

// alive.js - Enhanced alive command
class AliveCommand extends BaseCommand {
    constructor() {
        super({
            pattern: "alive",
            desc: "Check bot online status",
            category: "main",
            filename: __filename
        });
    }

    async execute(conn, mek, { from, reply }) {
        try {
            const config = await readEnv();
            const uptime = runtime(process.uptime());
            
            const aliveMessage = `
🤖 *Bot Status: Online*
⏱️ Uptime: ${uptime}
🔄 Version: ${process.env.VERSION || '1.0.0'}
${config.ALIVE_MSG || 'I am alive!'}`;

            await conn.sendMessage(from, {
                image: { url: config.ALIVE_IMG || 'https://placeholder.com/400x300' },
                caption: aliveMessage
            }, { quoted: mek });
            
        } catch (error) {
            logger.error('Alive command error:', error);
            reply('❌ Error checking status: ' + error.message);
        }
    }
}

// menu.js - Enhanced menu command
class MenuCommand extends BaseCommand {
    constructor() {
        super({
            pattern: "menu",
            desc: "Get command list",
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

            let menu = Object.keys(categories).reduce((acc, cat) => {
                acc[cat] = '';
                return acc;
            }, {});

            // Organize commands by category
            for (const cmd of commands) {
                if (cmd.pattern && !cmd.dontAddCommandList) {
                    const category = cmd.category || 'misc';
                    menu[category] += `\n${config.PREFIX || '/'}${cmd.pattern}${cmd.desc ? ` - ${cmd.desc}` : ''}`;
                }
            }

            // Build menu message
            let menuText = `Hello ${pushname || 'User'} 👋\n\n`;
            
            for (const [category, title] of Object.entries(categories)) {
                if (menu[category]) {
                    menuText += `${title}\n${menu[category]}\n\n`;
                }
            }

            menuText += `\nPowered by Sanidu Bot v${process.env.VERSION || '1.0.0'}`;

            await conn.sendMessage(from, {
                image: { url: config.ALIVE_IMG || '' },
                caption: menuText
            }, { quoted: mek });

        } catch (error) {
            logger.error('Menu command error:', error);
            reply('❌ Error displaying menu: ' + error.message);
        }
    }
}

// system.js - Enhanced system command
class SystemCommand extends BaseCommand {
    constructor() {
        super({
            pattern: "system",
            alias: ["status", "botinfo"],
            desc: "Check system status",
            category: "main",
            filename: __filename
        });
    }

    async execute(conn, mek, { reply }) {
        try {
            const formatBytes = (bytes) => {
                const units = ['B', 'KB', 'MB', 'GB'];
                let i = 0;
                while (bytes >= 1024 && i < units.length - 1) {
                    bytes /= 1024;
                    i++;
                }
                return `${bytes.toFixed(2)} ${units[i]}`;
            };

            const systemInfo = {
                uptime: runtime(process.uptime()),
                memory: {
                    used: formatBytes(process.memoryUsage().heapUsed),
                    total: formatBytes(os.totalmem()),
                    free: formatBytes(os.freemem())
                },
                cpu: {
                    model: os.cpus()[0].model,
                    cores: os.cpus().length,
                    speed: `${os.cpus()[0].speed} MHz`
                },
                os: {
                    platform: os.platform(),
                    version: os.version(),
                    hostname: os.hostname()
                }
            };

            const status = `*System Status*
🕒 Uptime: ${systemInfo.uptime}
💾 Memory: ${systemInfo.memory.used} / ${systemInfo.memory.total}
💻 CPU: ${systemInfo.cpu.model} (${systemInfo.cpu.cores} cores)
🖥️ Platform: ${systemInfo.os.platform}
🏠 Hostname: ${systemInfo.os.hostname}
👑 Owner: Sanidu Herath ☣️`;

            reply(status);

        } catch (error) {
            logger.error('System command error:', error);
            reply('❌ Error getting system info: ' + error.message);
        }
    }
}

// restart.js - Enhanced restart command
class RestartCommand extends BaseCommand {
    constructor() {
        super({
            pattern: "restart",
            desc: "Restart the bot",
            category: "owner",
            filename: __filename,
            ownerOnly: true
        });
    }

    async execute(conn, mek, { reply }) {
        try {
            const { exec } = require("child_process");
            
            await reply("🔄 Restarting bot...");
            await sleep(1500);

            // Graceful shutdown
            await conn.sendPresenceUpdate('unavailable');
            await conn.sendMessage(mek.key.remoteJid, {
                text: '⚡ Bot is restarting. Please wait...'
            });

            // Execute restart
            exec("pm2 restart all", (error, stdout, stderr) => {
                if (error) {
                    logger.error('Restart error:', error);
                    reply('❌ Error restarting bot: ' + error.message);
                    return;
                }
                logger.info('Bot restarted successfully');
            });

        } catch (error) {
            logger.error('Restart command error:', error);
            reply('❌ Error during restart: ' + error.message);
        }
    }
}

// Command registration
const registerCommands = () => {
    return [
        new AliveCommand(),
        new MenuCommand(),
        new SystemCommand(),
        new RestartCommand()
    ];
};

module.exports = { BaseCommand, registerCommands };
