let cooldowns = {}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = global.db.data.users[m.sender]
    let bet = args[0] ? parseInt(args[0]) : 20
    
    if (isNaN(bet) || bet <= 0) {
        return conn.reply(m.chat, `❌ Puntata non valida.\nEsempio: *${usedPrefix + command} 100*`, m)
    }

    if ((user.limit || 0) < bet) {
        return conn.reply(m.chat, `🚫 UC insufficienti! Ti servono ${bet} UC.`, m)
    }

    if (cooldowns[m.sender] && Date.now() - cooldowns[m.sender] < 300000) {
        let timeLeft = cooldowns[m.sender] + 300000 - Date.now()
        let min = Math.floor(timeLeft / 60000)
        let sec = Math.floor((timeLeft % 60000) / 1000)
        return conn.reply(m.chat, `⏳ Aspetta ${min}m ${sec}s prima di giocare again.`, m)
    }

    let win = Math.random() < 0.5
    let resultMsg, videoFile

    if (win) {
        user.limit = (user.limit || 0) + 800
        user.exp = (user.exp || 0) + 100
        resultMsg = `🎉 Hai vinto!\n+800 UC\n+100 exp`
        videoFile = './icone/perdita.mp4'
    } else {
        user.limit = (user.limit || 0) - bet
        user.exp = Math.max(0, (user.exp || 0) - bet)
        resultMsg = `🤡 Hai perso!\n-${bet} UC\n-${bet} exp`
        videoFile = './icone/vincita.mp4'
    }g

    // Invia SEMPRE il video
    await conn.sendMessage(m.chat, { 
        video: { url: videoFile }, 
        gifPlayback: true 
    }, { quoted: m })

    cooldowns[m.sender] = Date.now()
    
    // Aspetta 3 secondi e manda il risultato
    await new Promise(resolve => setTimeout(resolve, 3000))
    await conn.reply(m.chat, resultMsg, m)
}

handler.help = ['slot <puntata>']
handler.tags = ['game']
handler.command = ['slot']

export default handler

