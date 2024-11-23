const config = require('../config');
const { cmd } = require('../command');
const { runtime } = require('../lib/functions');
const os = require('os');

cmd({
    pattern: "system",
    alias: ["status", "botinfo"],
    desc: "Check run time, ram usage and more..",
    category: "main",
    filename: __filename
},
async(conn, mek, m, {from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
    try {
        // Format bytes to MB
        const formatMB = (bytes) => (bytes / 1024 / 1024).toFixed(2);
        
        // Get system information
        const ramUsed = formatMB(process.memoryUsage().heapUsed);
        const ramTotal = formatMB(os.totalmem());
        const cpuModel = os.cpus()[0].model;
        const cpuCores = os.cpus().length;
        
        let status = `*🤖 System Status*

*⏱️ Uptime:* ${runtime(process.uptime())}
*💾 RAM Usage:* ${ramUsed}MB / ${ramTotal}MB
*💻 CPU:* ${cpuModel}
*⚡ CPU Cores:* ${cpuCores}
*🖥️ Platform:* ${os.platform()}
*🏠 Hostname:* ${os.hostname()}
*👑 Owner:* Sanidu Herath ☣️`;

        return reply(status);

    } catch (e) {
        console.log(e)
        reply(String(e))
    }
});
