// Enhanced logging setup
const logger = P({
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            destination: path.join(logDir, 'bot.log'),
            mkdir: true,
            translateTime: 'SYS:standard'
        }
    }
});

// Improved session management
const ensureSession = async () => {
    const credsPath = path.join(authDir, 'creds.json');
    try {
        if (!fs.existsSync(credsPath)) {
            if (!config.SESSION_ID) {
                logger.error('SESSION_ID not found in environment!');
                process.exit(1);
            }
            await downloadSession(config.SESSION_ID);
        }
    } catch (error) {
        logger.error('Session initialization failed:', error);
        process.exit(1);
    }
};

// Better plugin loading
const loadPlugins = () => {
    const pluginsDir = path.join(__dirname, 'plugins');
    
    if (!fs.existsSync(pluginsDir)) {
        fs.mkdirSync(pluginsDir);
        logger.info('Created plugins directory');
    }

    const pluginFiles = fs.readdirSync(pluginsDir)
        .filter(file => path.extname(file).toLowerCase() === '.js');
    
    logger.info(`Found ${pluginFiles.length} plugins`);

    const loadedPlugins = [];
    const failedPlugins = [];

    pluginFiles.forEach(file => {
        try {
            require(path.join(pluginsDir, file));
            loadedPlugins.push(file);
            logger.info(`✅ Loaded: ${file}`);
        } catch (err) {
            failedPlugins.push({ file, error: err.message });
            logger.error(`❌ Failed to load ${file}:`, err);
        }
    });

    logger.info(`Successfully loaded ${loadedPlugins.length} plugins`);
    if (failedPlugins.length) {
        logger.warn(`Failed to load ${failedPlugins.length} plugins`);
    }
};

// Enhanced connection function
async function connectToWA() {
    try {
        await ensureSession();
        await connectDB();

        const config = await readEnv();
        const prefix = config.PREFIX || '.';

        const { state, saveCreds } = await useMultiFileAuthState(authDir);
        const { version } = await fetchLatestBaileysVersion();

        const conn = makeWASocket({
            logger: P({ level: 'silent' }),
            printQRInTerminal: false,
            browser: Browsers.macOS("chrome"),
            syncFullHistory: true,
            auth: state,
            version,
            connectTimeoutMs: 60000,
            qrTimeout: 40000,
            defaultQueryTimeoutMs: 30000
        });

        // Enhanced connection handling
        conn.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                logger.info(`Connection closed. Reconnecting: ${shouldReconnect}`);
                
                if (shouldReconnect) {
                    setTimeout(connectToWA, 5000);
                }
            } else if (connection === 'open') {
                logger.info('Connection established successfully! 🎉');
                loadPlugins();

                const message = `Bot connected successfully ✅\nPrefix: ${prefix}`;
                await conn.sendMessage(ownerNumber + "@s.whatsapp.net", { 
                    image: { url: 'https://telegra.ph/file/900435c6d3157c98c3c88.jpg' }, 
                    caption: message 
                }).catch(err => logger.error('Failed to send startup message:', err));
            }
        });

        conn.ev.on('creds.update', saveCreds);
        
        require('./message_handler')(conn);

    } catch (err) {
        logger.error('Fatal connection error:', err);
        setTimeout(connectToWA, 10000);
    }
}
