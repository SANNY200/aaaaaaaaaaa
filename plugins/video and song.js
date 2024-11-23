const { cmd } = require('../command');
const yts = require('yt-search');
const { yta, ytv } = require('api-dylux');

// Improved song command
cmd({
    pattern: "song",
    desc: "Download song from YouTube",
    category: "download",
    filename: __filename
},
async(conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply('❌ Please provide a song name');
        
        // Better search handling
        const search = await yts(q);
        if (!search.videos.length) return reply('❌ No results found');
        
        const video = search.videos[0];
        // Improved status message
        const description = `🎵 *${video.title}*
⏱️ ${video.timestamp}
👀 ${video.views} views
📅 ${video.ago}

_Downloading..._`;
        
        // Send thumbnail with info
        await conn.sendMessage(from, {
            image: { url: video.thumbnail },
            caption: description
        }, { quoted: mek });

        // Download and send audio
        const audioData = await yta(video.url);
        await conn.sendMessage(from, {
            audio: { url: audioData.dl_link },
            mimetype: "audio/mpeg",
            fileName: `${video.title}.mp3`
        }, { quoted: mek });
    } catch(e) {
        console.error('Song download error:', e);
        reply(`Error: ${e.message}`);
    }
});

// Similar improvements for video command
cmd({
    pattern: "video",
    desc: "Download video from YouTube",
    category: "download",
    filename: __filename
},
async(conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply('❌ Please provide a video name');
        
        const search = await yts(q);
        if (!search.videos.length) return reply('❌ No results found');
        
        const video = search.videos[0];
        const description = `🎥 *${video.title}*
⏱️ ${video.timestamp}
👀 ${video.views} views
📅 ${video.ago}

_Downloading..._`;
        
        await conn.sendMessage(from, {
            image: { url: video.thumbnail },
            caption: description
        }, { quoted: mek });

        const videoData = await ytv(video.url);
        await conn.sendMessage(from, {
            video: { url: videoData.dl_link },
            mimetype: "video/mp4",
            fileName: `${video.title}.mp4`,
            caption: "Powered by Sanidu 🫦"
        }, { quoted: mek });
    } catch(e) {
        console.error('Video download error:', e);
        reply(`Error: ${e.message}`);
    }
});
