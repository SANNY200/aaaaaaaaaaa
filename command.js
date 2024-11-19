const fs = require('fs');
const path = require('path');

// Global commands array
let commands = [];

// Command registration function
function cmd(info, func) {
    // Validate and set default values
    const data = {
        pattern: info.pattern || '',
        alias: info.alias || [],
        desc: info.desc || 'No description',
        category: info.category || 'misc',
        filename: info.filename || 'Unknown',
        fromMe: info.fromMe || false,
        dontAddCommandList: info.dontAddCommandList || false,
        function: func
    };

    // Add command to global commands array
    commands.push(data);
    return data;
}

// Plugin loader function
function loadPlugins(pluginDir) {
    try {
        const pluginFiles = fs.readdirSync(pluginDir)
            .filter(file => path.extname(file).toLowerCase() === '.js');

        pluginFiles.forEach(file => {
            try {
                const pluginPath = path.join(pluginDir, file);
                require(pluginPath);
                console.log(`✅ Loaded plugin: ${file}`);
            } catch (pluginError) {
                console.error(`❌ Error loading plugin ${file}:`, pluginError);
            }
        });
    } catch (error) {
        console.error('❌ Error reading plugins directory:', error);
    }
}

module.exports = {
    cmd,
    AddCommand: cmd,
    Function: cmd,
    Module: cmd,
    commands,
    loadPlugins
};
