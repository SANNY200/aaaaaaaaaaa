const { readEnv } = require('../lib/database');
const { cmd, commands } = require('../command');

cmd({
    pattern: "menu",
    desc: "Get Menu list.",
    category: "main",
    filename: __filename
},
async(conn, mek, m, { from, pushname, reply }) => {
    try {
        const config = await readEnv();
        // Organized categories with arrays for better structure
        const categories = {
            main: [],
            download: [],
            group: [],
            owner: [],
            convert: [],
            search: []
        };

        // Improved command organization
        for (const command of commands) {
            if (command.pattern && !command.dontAddCommandList) {
                const category = command.category || 'main';
                if (categories[category]) {
                    categories[category].push({
                        pattern: command.pattern,
                        desc: command.desc || ''
                    });
                }
            }
        }

        // Better formatted menu text
        let menuText = `✨ Hello ${pushname || 'User'}\n\n`;
        
        // Dynamic category display
        for (const [category, cmds] of Object.entries(categories)) {
            if (cmds.length > 0) {
                menuText += `*${category.toUpperCase()} COMMANDS*\n`;
                cmds.forEach(cmd => {
                    menuText += `${config.PREFIX || '/'}${cmd.pattern}${cmd.desc ? ` - ${cmd.desc}` : ''}\n`;
                });
                menuText += '\n';
            }
        }

        menuText += '\nPowered by Sanidu (●◡●)☣️';

        await conn.sendMessage(from, {
            image: { url: config.ALIVE_IMG || '' },
            caption: menuText
        }, { quoted: mek });
    } catch(e) {
        console.error('Menu command error:', e);
        reply(`Error: ${e.message}`);
    }
});
