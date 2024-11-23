const { updateEnv, readEnv } = require('../lib/database');
const EnvVar = require('../lib/mongodbenv');
const { cmd } = require('../command');

cmd({
    pattern: "update",
    alias: ["updateenv"],
    desc: "Check and update environment variables",
    category: "owner",
    filename: __filename
},
async(conn, mek, m, { from, q, reply, isOwner }) => {
    // Added owner check
    if (!isOwner) return reply("❌ Owner command only!");
    
    // Better input validation
    if (!q) return reply("🔍 Format: .update KEY:VALUE");

    // Improved key-value parsing
    const [key, ...valueParts] = q.split(':');
    if (!key || !valueParts.length) {
        return reply("❌ Invalid format. Use: .update KEY:VALUE");
    }

    const value = valueParts.join(':').trim();
    const validModes = ['public', 'private', 'groups', 'inbox'];
    const [newValue, mode] = value.split(/\s+/);

    // Enhanced validation for specific variables
    if (key === 'MODE' && !validModes.includes(newValue)) {
        return reply(`❌ Invalid mode. Use: ${validModes.join(', ')}`);
    }

    if (key === 'ALIVE_IMG' && !newValue.startsWith('https://')) {
        return reply("❌ Invalid URL. Must start with https://");
    }

    if (key === 'AUTO_READ_STATUS' && !['true', 'false'].includes(newValue)) {
        return reply("❌ Use 'true' or 'false' for AUTO_READ_STATUS");
    }

    try {
        // Check if variable exists
        const envVar = await EnvVar.findOne({ key });
        if (!envVar) {
            // Show available variables if not found
            const allEnvVars = await EnvVar.find({}).limit(10);
            const envList = allEnvVars.map(env => `${env.key}: ${env.value}`).join('\n');
            return reply(`❌ Variable ${key} not found.\n\nAvailable variables:\n${envList}`);
        }

        await updateEnv(key, newValue, mode);
        return reply(`✅ Updated ${key} = ${newValue}${mode ? ` (${mode})` : ''}`);
    } catch(e) {
        console.error('Update env error:', e);
        reply(`Error: ${e.message}`);
    }
});
