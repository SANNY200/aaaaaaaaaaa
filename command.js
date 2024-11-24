const fs = require('fs');
const path = require('path');
const logger = require('./lib/logger');

// Global commands array
let commands = [];

// Enhanced command registration function
function cmd(info, func) {
    // Validate required info
    if (!info.pattern) {
        logger.error('Command pattern is required');
        return;
    }

    // Validate and set default values
    const data = {
        pattern: info.pattern,
        alias: info.alias || [],
        desc: info.desc || 'No description provided',
        category: info.category || 'misc',
        filename: info.filename || 'Unknown',
        usage: info.usage || '',
        fromMe: info.fromMe || false,
        dontAddCommandList: info.dontAddCommandList || false,
        owner: info.owner || false,
        group: info.group || false,
        function: func
    };

    // Prevent duplicate commands
    const existingCmd = commands.find(cmd => cmd.pattern === data.pattern);
    if (existingCmd) {
        logger.warn(`Command ${data.pattern} already exists. Skipping...`);
        return;
    }

    // Add command to global commands array
    commands.push(data);
    logger.info(`Registered command: ${data.pattern}`);
    return data;
}

// Enhanced plugin loader function
function loadPlugins(pluginDir) {
    try {
        if (!fs.existsSync(pluginDir)) {
            fs.mkdirSync(pluginDir, { recursive: true });
            logger.info('Created plugins directory');
        }

        const pluginFiles = fs.readdirSync(pluginDir)
            .filter(file => file.endsWith('.js'));

        let loadedCount = 0;
        let errorCount = 0;

        pluginFiles.forEach(file => {
            try {
                const pluginPath = path.join(pluginDir, file);
                require(pluginPath);
                loadedCount++;
                logger.info(`✅ Loaded plugin: ${file}`);
            } catch (error) {
                errorCount++;
                logger.error(`❌ Error loading plugin ${file}:`, error);
            }
        });

        logger.info(`📝 Plugin loading complete. Success: ${loadedCount}, Failed: ${errorCount}`);

    } catch (error) {
        logger.error('❌ Critical error reading plugins directory:', error);
    }
}

// Utility function to get command list
function getCommandList(category = null) {
    if (category) {
        return commands.filter(cmd => cmd.category === category && !cmd.dontAddCommandList);
    }
    return commands.filter(cmd => !cmd.dontAddCommandList);
}

module.exports = {
    cmd,
    AddCommand: cmd, // Alias for backward compatibility
    Function: cmd,   // Alias for backward compatibility
    Module: cmd,     // Alias for backward compatibility
    commands,
    loadPlugins,
    getCommandList
};
