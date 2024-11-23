const config = require('../config');
const { cmd, commands } = require('../command');
const fg = require('api-dylux'); 
const yts = require('yt-search'); 
const { yta, ytv } = require('api-dylux'); 

// Song Downloader
cmd({
    pattern: "song",
    desc: "Download song.",
    category: "download",
    filename: __filename
}, async (conn, mek, m, {
    from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply
}) => {
    try {
        if (!q) return reply('Please provide the song name.');
        
        const search = await yts(q);
        const data = search.videos[0];
        const url = data.url;

        let desc = `
🧠 |||| *SANNY-BOT AUDIO DOWNLOADER* |||| 👍
🎵 Title: ${data.title}
📜 Description: ${data.description}
⏱️ Duration: ${data.timestamp}
📅 Uploaded: ${data.ago}
👀 Views: ${data.views}

MADE BY SANIDU 🫦
        `;

        await conn.sendMessage(from, { image: { url: data.thumbnail }, caption: desc }, { quoted: mek });

        // Download audio
        let down = await yta(url);
        let downloadUrl = down.dl_link;

        // Send audio + document
        await conn.sendMessage(from, { audio: { url: downloadUrl }, mimetype: "audio/mpeg" }, { quoted: mek });
        await conn.sendMessage(from, { document: { url: downloadUrl }, mimetype: "audio/mpeg", fileName: `${data.title}.mp3`, caption: "MADE BY SANIDU 🫦" }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply(String(e));
    }
});

// Video Downloader
cmd({
    pattern: "video",
    desc: "Download video.",
    category: "download",
    filename: __filename
}, async (conn, mek, m, {
    from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply
}) => {
    try {
        if (!q) return reply('Please provide the video name.');
        
        const search = await yts(q);
        const data = search.videos[0];
        const url = data.url;

        let desc = `
🧠 |||| *SANNY-BOT VIDEO DOWNLOADER* |||| 👍
🎥 Title: ${data.title}
📜 Description: ${data.description}
⏱️ Duration: ${data.timestamp}
📅 Uploaded: ${data.ago}
👀 Views: ${data.views}

MADE BY SANIDU 🫦
        `;

        await conn.sendMessage(from, { image: { url: data.thumbnail }, caption: desc }, { quoted: mek });

        // Download video
        let down = await ytv(url);
        let downloadUrl = down.dl_link;

        // Send video + document
        await conn.sendMessage(from, { video: { url: downloadUrl }, mimetype: "video/mp4" }, { quoted: mek });
        await conn.sendMessage(from, { document: { url: downloadUrl }, mimetype: "video/mp4", fileName: `${data.title}.mp4`, caption: "MADE BY SANIDU 🫦" }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply(String(e));
    }
});
