const config = require('../config');
const { cmd, commands } = require('../command');
const { runtime } = require('../lib/functions');
const os = require('os'); // os module එක import කිරීම අත්‍යවශ්‍යයි

cmd({
    pattern: "system",
    alias: ["status", "botinfo"],
    desc: "Check run time..., ram usage and more..",
    category: "main",
    filename: __filename
}, async (conn, mek, m, {
    from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply
}) => {
    try {
        let status = `*Uptime:* ${runtime(process.uptime())}
*Ram usage:* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB / ${(os.totalmem() / 1024 / 1024).toFixed(2)}MB
*HostName:* ${os.hostname()}
*Owner:* Sanidu Herath ☣️`;

        return reply(status);

    } catch (e) {
        console.log(e);
        reply(String(e));
    }
});
