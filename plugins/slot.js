// Sistema di cooldown globale
let cooldowns = {}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let users = global.db.data.users[m.sender]

    // Puntata di default = 20
    let apuesta = args[0] ? parseInt(args[0]) : 20
    
    // Validazione della puntata
    if (isNaN(apuesta) || apuesta <= 0) {
        return conn.reply(m.chat, `❌ Devi inserire una puntata valida.\nEsempio: *${usedPrefix + command} 100*`, m)
    }

    // Controllo saldo minimo UC
    if ((users.limit || 0) < apuesta) {
        return conn.reply(m.chat, `🚫 Non hai abbastanza UC per giocare!\nTi servono almeno ${apuesta} UC.`, m)
    }

    // Cooldown di 5 minuti (300000 millisecondi)
    if (cooldowns[m.sender] && Date.now() - cooldowns[m.sender] < 300000) {
        let ms = cooldowns[m.sender] + 300000 - Date.now();
        let min = Math.floor(ms / 60000);
        let sec = Math.floor((ms % 60000) / 1000);
        return conn.reply(m.chat, `⏳ Devi aspettare ${min}m ${sec}s prima di poter rigiocare!`, m)
    }

    // Esito casuale: 50% vinci, 50% perdi
    let win = Math.random() < 0.5

    let unitycoinsWin = 800
    let expWin = 100
    let expLose = apuesta

    let infoMsg
    let videoFile

    if (win) {
        // Vittoria - aggiungi premi
        users.limit = (users.limit || 0) + unitycoinsWin
        users.exp = (users.exp || 0) + expWin
        infoMsg = `🎉 Hai vinto!\n+${unitycoinsWin} UC\n+${expWin} exp`
        videoFile = './icone/vincita.mp4'
    } else {
        // Sconfitta - sottrai puntata
        users.limit = (users.limit || 0) - apuesta
        users.exp = Math.max(0, (users.exp || 0) - expLose) // Previeni exp negativo
        infoMsg = `🤡 Hai perso!\n-${apuesta} UC\n-${expLose} exp`
        videoFile = './icone/perdita.mp4'
    }

    // Imposta cooldown
    cooldowns[m.sender] = Date.now();

    // Invia il video corretto
    try {
        await conn.sendMessage(
            m.chat,
            {
                video: { url: videoFile },
                gifPlayback: true
            },
            { quoted: m }
        )

        // Dopo 3 secondi invia il messaggio del risultato
        await new Promise(res => setTimeout(res, 3000))

        await conn.reply(m.chat, infoMsg, m)
    } catch (error) {
        console.error('Errore nell\'invio del video:', error)
        // Fallback: invia solo il messaggio se il video non viene trovato
        await conn.reply(m.chat, `${infoMsg}\n\n⚠️ Impossibile caricare l'animazione`, m)
    }
}

handler.help = ['slot <puntata>']
handler.tags = ['game']
handler.command = ['slot']

export default handler
