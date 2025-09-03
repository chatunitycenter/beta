let cooldowns = {}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let users = global.db.data.users[m.sender]

    // Se non scrive nulla, di default 20 UC
    let apuesta = args[0] ? parseInt(args[0]) : 20
    if (isNaN(apuesta) || apuesta <= 0) {
        return conn.reply(m.chat, `❌ Devi inserire un numero valido di UC.\nEsempio: *${usedPrefix + command} 100*`, m)
    }

    // Cooldown di 5 minuti (sempre)
    if (cooldowns[m.sender] && Date.now() - cooldowns[m.sender] < 5 * 60 * 1000) {
        let ms = cooldowns[m.sender] + 5 * 60 * 1000 - Date.now();
        let min = Math.floor(ms / 60000);
        let sec = Math.floor((ms % 60000) / 1000);
        return conn.reply(m.chat, `⏳ Devi aspettare ${min}m ${sec}s prima di poter rigiocare!`, m)
    }

    // Esito casuale: 50% vinci, 50% perdi
    let win = Math.random() < 0.5

    let unitycoinsWin = 800
    let expWin = 100
    let expLose = apuesta

    let infoMsg = ''

    if (win) {
        users.limit = (users.limit || 0) + unitycoinsWin
        users.exp += expWin
        infoMsg = `🎉 Hai vinto!\n+${unitycoinsWin} UC\n+${expWin} exp`
    } else {
        users.exp -= expLose
        infoMsg = `🤡 Hai perso!\n-${expLose} exp`
    }

    // Imposta cooldown
    cooldowns[m.sender] = Date.now();

    // Manda sempre lo stesso video (sia vincita che perdita)
    await conn.sendMessage(
        m.chat,
        {
            video: { url: './icone/slot.mp4' },
            gifPlayback: true
        },
        { quoted: m }
    )

    // Dopo 3 secondi manda il messaggio del risultato
    await new Promise(res => setTimeout(res, 3000))

    await conn.sendMessage(
        m.chat,
        { text: infoMsg },
        { quoted: m }
    )
}

handler.help = ['slot <puntata>']
handler.tags = ['game']
handler.command = ['slot']

export default handler
