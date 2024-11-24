const { cmd } = require('../command');

cmd({
    pattern: "test",
    desc: "Simple test command",
    category: "main",
    filename: __filename,
}, async (conn, mek, { reply }) => {
    reply("✅ Test plugin is working perfectly!");
});
