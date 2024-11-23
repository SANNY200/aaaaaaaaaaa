const config = require('../config')
const {cmd} = require('../command')
const {fetchJson} = require('../lib/functions')

cmd({
    pattern: "ai",
    desc: "ai chat",
    category: "main",
    filename: __filename
},
async(conn, mek, m,{from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
    try{
        if (!q) return reply('Please provide a question for the AI.');
        
        // Using template literal correctly
        let data = await fetchJson(`https://chatgptforprabath-md.vercel.app/api/gptv1?q=${encodeURIComponent(q)}`)
        return reply(data.data)
    }catch(e){
        console.log(e)
        reply(`${e}`)
    }
})
