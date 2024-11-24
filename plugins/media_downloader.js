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
        if (!q) return reply('Please provide the song name!');
        
        reply('⏳ *Searching...*'); // Searching indicator

        const search = await yts(q);
        if(!search.videos.length) return reply('Song not found!');
        
        const data = search.videos[0];
        const url = data.url;

        let desc = `
🎵 *${config.BOT_NAME} SONG DOWNLOADER* 
        
📝 Title: ${data.title}
⌚ Duration: ${data.timestamp} 
📅 Upload: ${data.ago}
👀 Views: ${data.views}
👤 Author: ${data.author.name}

⏳ *Downloading your song...*`;

        await conn.sendMessage(from, { 
            image: { url: data.thumbnail }, 
            caption: desc 
        }, { quoted: mek });

        try {
            const audioData = await yta(url);
            const dlLink = audioData.dl_link;
            
            // Send as audio
            await conn.sendMessage(from, { 
                audio: { url: dlLink }, 
                mimetype: "audio/mpeg",
                fileName: `${data.title}.mp3`
            }, { quoted: mek });
            
            // Send as document 
            await conn.sendMessage(from, {
                document: { url: dlLink },
                mimetype: "audio/mpeg",
                fileName: `${data.title}.mp3`
            }, { quoted: mek });

        } catch (err) {
            reply('Error downloading audio: ' + err.message);
        }

    } catch (e) {
        console.log(e);
        reply('Error: ' + e.message);
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
        if (!q) return reply('Please provide the video name!');

        reply('⏳ *Searching...*'); // Searching indicator
        
        const search = await yts(q);
        if(!search.videos.length) return reply('Video not found!');
        
        const data = search.videos[0];
        const url = data.url;

        // Check video duration (10 minute limit)
        if(data.seconds > 600) {
            return reply('❌ Video duration exceeds 10 minutes limit!');
        }

        let desc = `
🎥 *${config.BOT_NAME} VIDEO DOWNLOADER*
        
📝 Title: ${data.title}
⌚ Duration: ${data.timestamp}
📅 Upload: ${data.ago}
👀 Views: ${data.views}
👤 Author: ${data.author.name}

⏳ *Downloading your video...*`;

        await conn.sendMessage(from, { 
            image: { url: data.thumbnail }, 
            caption: desc 
        }, { quoted: mek });

        try {
            const videoData = await ytv(url);
            const dlLink = videoData.dl_link;

            // Send as video
            await conn.sendMessage(from, {
                video: { url: dlLink },
                caption: `🎥 ${data.title}`,
                mimetype: "video/mp4"
            }, { quoted: mek });

            // Send as document
            await conn.sendMessage(from, {
                document: { url: dlLink },
                mimetype: "video/mp4",
                fileName: `${data.title}.mp4`
            }, { quoted: mek });

        } catch (err) {
            reply('Error downloading video: ' + err.message);
        }

    } catch (e) {
        console.log(e);
        reply('Error: ' + e.message);
    }
});
