// Original version had issues with error handling and structure
const { readEnv } = require('../lib/database');
const { cmd } = require('../command');
const { runtime } = require('../lib/functions'); // Added for uptime tracking

cmd({
    pattern: "alive",
    desc: "Check bot online or no.",
    category: "main",
    filename: __filename
},
async(conn, mek, m, { from, reply }) => {
    try {
        const config = await readEnv();
        const uptime = runtime(process.uptime()); // Added uptime tracking
        
        // Improved message formatting with status indicators
        const aliveMessage = `🤖 *Bot Status: Online*
⏱️ Uptime: ${uptime}

${config.ALIVE_MSG || 'I am alive!'}`; // Added fallback message
        
        return await conn.sendMessage(from, {
            image: { url: config.ALIVE_IMG || 'https://placeholder.com/400x300' }, // Added fallback image
            caption: aliveMessage
        }, { quoted: mek });
    } catch(e) {
        console.error('Alive command error:', e); // Added error logging
        reply(`Error: ${e.message}`); // User-friendly error message
    }
});
