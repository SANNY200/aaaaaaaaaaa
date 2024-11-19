const { getContentType } = require('@whiskeysockets/baileys')
const { sms } = require('./lib/msg')
const { commands } = require('./command')
const config = require('./config')

module.exports = (conn) => {
    conn.ev.on('messages.upsert', async (mek) => {
        try {
            mek = mek.messages[0]
            if (!mek.message) return	

            // Normalize message
            mek.message = (getContentType(mek.message) === 'ephemeralMessage') 
                ? mek.message.ephemeralMessage.message 
                : mek.message

            // Status broadcast auto-read
            if (mek.key && mek.key.remoteJid === 'status@broadcast' && 
                config.AUTO_READ_STATUS === "true") {
                await conn.readMessages([mek.key])
            }

            const m = sms(conn, mek)
            const type = getContentType(mek.message)
            const body = (type === 'conversation') ? mek.message.conversation : 
                        (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : 
                        (type == 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption : 
                        (type == 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption : ''

            // Read prefix from config
            const { readEnv } = require('./lib/database')
            const botConfig = await readEnv(' ')
            const prefix = botConfig.PREFIX || '.'

            const isCmd = body.startsWith(prefix)
            const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''
            const args = body.trim().split(/ +/).slice(1)
            const q = args.join(' ')

            // Basic context for command handling
            const context = {
                conn,
                mek,
                m,
                from: m.chat,
                quoted: m.quoted,
                body,
                isCmd,
                command,
                args,
                q,
                prefix
            }

            // Command handler
            if (isCmd) {
                const cmd = commands.find(
                    cmd => cmd.pattern === command || 
                    (cmd.alias && cmd.alias.includes(command))
                )

                if (cmd) {
                    try {
                        await cmd.function(conn, mek, m, context)
                    } catch (cmdError) {
                        console.error(`[COMMAND ERROR] ${command}:`, cmdError)
                        m.reply(`An error occurred while processing the command: ${cmdError.message}`)
                    }
                }
            }

            // Event-based handlers
            commands.forEach(async (commandHandler) => {
                try {
                    if (commandHandler.on === "body" && body) {
                        await commandHandler.function(conn, mek, m, context)
                    } else if (commandHandler.on === "image" && type === "imageMessage") {
                        await commandHandler.function(conn, mek, m, context)
                    } else if (commandHandler.on === "sticker" && type === "stickerMessage") {
                        await commandHandler.function(conn, mek, m, context)
                    }
                } catch (handlerError) {
                    console.error(`[EVENT HANDLER ERROR]:`, handlerError)
                }
            })
        } catch (mainError) {
            console.error('Main message processing error:', mainError)
        }
    })
}
