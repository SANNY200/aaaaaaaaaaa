const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault;
}

module.exports = {
    // Session Configuration
    SESSION_ID: process.env.SESSION_ID || '',
    
    // MongoDB Configuration
    MONGODB: process.env.MONGODB || '',
    
    // Bot Configuration
    PREFIX: process.env.PREFIX || '.',
    OWNER_NUMBER: process.env.OWNER_NUMBER?.split(',') || ['94706075447'],
    
    // Mode Configuration
    MODE: process.env.MODE || 'public',
    AUTO_READ_STATUS: convertToBool(process.env.AUTO_READ_STATUS, 'true'),
    
    // Alive Configuration
    ALIVE_IMG: process.env.ALIVE_IMG || 'https://telegra.ph/file/6d91fd79aab5663032b97.jpg',
    ALIVE_MSG: process.env.ALIVE_MSG || 'Hello, I am alive now!!',
}
