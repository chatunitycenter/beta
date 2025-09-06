import { join } from 'path'
import { useMultiFileAuthState, makeWASocket, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } from '@whiskeysockets/baileys'
import pino from 'pino'

const activeBots = new Map()

let handler = async (m, { conn, args, command }) => {
  if (command === 'conectar') {
    if (!args[0]) return m.reply('📱 Inserisci il numero a cui collegare il subbot.\nEsempio: `.conectar 393471234567`')
    const number = args[0].replace(/[^0-9]/g, '')

    try {
      const sessionPath = join(process.cwd(), 'sessioni', number)
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
      const { version } = await fetchLatestBaileysVersion()

      const bot = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        version
      })

      bot.ev.on('creds.update', saveCreds)

      bot.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update

        if (connection === 'open') {
          activeBots.set(number, bot)
          if (!global.conns) global.conns = []
          global.conns.push(bot)
          await conn.sendMessage(m.chat, { text: `✅ Subbot connesso su *${number}*` }, { quoted: m })
        }

        if (connection === 'close') {
          const reason = lastDisconnect?.error?.output?.statusCode
          if (reason !== DisconnectReason.loggedOut) {
            setTimeout(() => handler(m, { conn, args: [number], command: 'conectar' }), 5000)
          } else {
            activeBots.delete(number)
            if (global.conns) {
              const i = global.conns.indexOf(bot)
              if (i !== -1) global.conns.splice(i, 1)
            }
            await conn.sendMessage(m.chat, { text: `❌ Subbot *${number}* disconnesso` }, { quoted: m })
          }
        }
      })
    } catch (e) {
      console.error(e)
      await conn.sendMessage(m.chat, { text: `⚠️ Errore: ${e.message}` }, { quoted: m })
    }
  }

  if (command === 'stopbot') {
    if (!args[0]) return m.reply('📴 Inserisci il numero del subbot da fermare.\nEsempio: `.stopbot 393471234567`')
    const number = args[0].replace(/[^0-9]/g, '')

    if (activeBots.has(number)) {
      const bot = activeBots.get(number)
      try {
        await bot.logout()
      } catch {}
      activeBots.delete(number)
      if (global.conns) {
        const i = global.conns.indexOf(bot)
        if (i !== -1) global.conns.splice(i, 1)
      }
      await conn.sendMessage(m.chat, { text: `✅ Subbot *${number}* disconnesso` }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, { text: `❌ Nessun subbot trovato per *${number}*` }, { quoted: m })
    }
  }
}

handler.command = /^(conectar|stopbot)$/i
export default handler