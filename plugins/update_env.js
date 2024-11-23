const { updateEnv, readEnv } = require('../lib/database');
const EnvVar = require('../lib/mongodbenv');
const { cmd } = require('../command');

cmd({
    pattern: "update",
    alias: ["updateenv"],
    desc: "Check and update environment variables",
    category: "owner",
    filename: __filename,
},
async(conn, mek, m, { from, q, reply, isOwner }) => {
    if (!isOwner) return;

    if (!q) {
        return reply("🙇‍♂️ *Please provide the environment variable and its new value.* \n\nExample: `.update ALIVE_MSG: hello i am SANIDU");
    }

    const delimiterIndex = q.indexOf(':');
    if (delimiterIndex === -1) {
        return reply("🫠 *Invalid format. Please use the format:* `.update KEY:VALUE`");
    }

    const key = q.substring(0, delimiterIndex).trim();
    const value = q.substring(delimiterIndex + 1).trim();

    const validModes = ['public', 'private', 'groups', 'inbox'];
    const parts = value.split(/\s+/);
    const newValue = parts[0];
    const mode = parts[1] && validModes.includes(parts[1]) ? parts[1] : '';

    if (!key || !newValue) {
        return reply("🫠 *Invalid format. Please use the format:* `.update KEY:VALUE`");
    }

    if (key === 'MODE' && !validModes.includes(newValue)) {
        return reply(`😒 *Invalid mode. Valid modes are: ${validModes.join(', ')}*`);
    }

    if (key === 'ALIVE_IMG' && !newValue.startsWith('https://')) {
        return reply("😓 *Invalid URL format. PLEASE GIVE ME IMAGE URL*");
    }

    if (key === 'AUTO_READ_STATUS' && !['true', 'false'].includes(newValue)) {
        return reply("😓 *Invalid value for AUTO_READ_STATUS. Please use `true` or `false`.*");
    }

    try {
        const envVar = await EnvVar.findOne({ key: key });

        if (!envVar) {
            const allEnvVars = await EnvVar.find({}).limit(10);
            const envList = allEnvVars.map(env => `${env.key}: ${env.value}`).join('\n');
            return reply(`❌ *The environment variable ${key} does not exist.*\n\n*Here are some existing environment variables:*\n\n${envList}`);
        }

        await updateEnv(key, newValue, mode);
        reply(`✅ *Environment variable updated.*\n\n🗃️ *${key}* ➠ ${newValue} ${mode ? `\n*Mode:* ${mode}` : ''}`);
        
    } catch (err) {
        console.error('Error updating environment variable: ' + err.message);
        reply("🙇‍♂️ *Failed to update the environment variable. Please try again.*\nError: " + err.message);
    }
});
