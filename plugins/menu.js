const { readEnv } = require('../lib/database');
const { cmd, commands } = require('../command');

cmd(
  {
    pattern: "menu",
    desc: "Get Menu list.",
    category: "main",
    filename: __filename,
  },
  async (
    conn,
    mek,
    m,
    {
      from,
      quoted,
      pushname,
      reply,
    }
  ) => {
    try {
      const config = await readEnv();
      let menu = {
        main: '',
        download: '',
        group: '',
        owner: '',
        convert: '',
        search: ''
      };

      for (let i = 0; i < commands.length; i++) {
        if (commands[i].pattern && !commands[i].dontAddCommandList) {
          menu[commands[i].category] += `${config.PREFIX || '/'}${commands[i].pattern}\n`;
        }
      }

      let madeMenu = `✌️ Helow ${pushname || 'User'}

> Download commands ⬇️
${menu.download || "No commands available."}

> Main commands 🧠
${menu.main || "No commands available."}

> Group commands 🧑🏻‍👩🏻‍👧🏻
${menu.group || "No commands available."}

> Owner commands 🫦
${menu.owner || "No commands available."}

> Convert commands 🤷
${menu.convert || "No commands available."}

> Search commands 👀
${menu.search || "No commands available."}

Powered by Sanidu (●◡●)☣️`;

      await conn.sendMessage(
        from,
        { image: { url: config.ALIVE_IMG || '' }, caption: madeMenu },
        { quoted: mek }
      );
    } catch (e) {
      console.log(e);
      reply(`${e}`);
    }
  }
);
