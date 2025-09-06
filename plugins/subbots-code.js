import {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser
} from '@whiskeysockets/baileys'
import qrcode from 'qrcode'
import fs from 'fs'
import pino from 'pino'
import crypto from 'crypto'
import NodeCache from 'node-cache'
import { makeWASocket } from '../lib/simple.js'

if (!(global.conns instanceof Array)) global.conns = []

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const bot = global.db.data.settings[conn.user.jid] || {}
  if (!bot.jadibotmd) return m.reply('⚠️ Questo comando è disattivato dal mio creatore.')

  let parentw = args[0] && args[0] == "plz" ? conn : await global.conn
  if (!(args[0] && args[0] == 'plz' || (await global.conn).user.jid == conn.user.jid)) {
    return conn.reply(m.chat, `⚠️ Usa questo comando solo sul bot principale.\n\n• Wa.me/${global.conn.user.jid.split`@`[0]}?text=${usedPrefix + command}`, m)
  }

  async function serbot() {
    let serbotFolder = crypto.randomBytes(10).toString('hex').slice(0, 8)
    let folderSub = `./sessioni/${serbotFolder}`
    if (!fs.existsSync(folderSub)) {
      fs.mkdirSync(folderSub, { recursive: true })
    }

    if (args[0]) {
      fs.writeFileSync(`${folderSub}/creds.json`, Buffer.from(args[0], 'base64').toString('utf-8'))
    }

    const { state, saveCreds } = await useMultiFileAuthState(folderSub)
    const msgRetryCounterCache = new NodeCache()
    const { version } = await fetchLatestBaileysVersion()

    const connectionOptions = {
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['Sub-Bot', 'Edge', '2.0.0'],
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
      },
      markOnlineOnConnect: true,
      msgRetryCounterCache,
      version
    }

    let subconn = makeWASocket(connectionOptions)

    async function connectionUpdate(update) {
      const { connection, lastDisconnect, isNewLogin, qr } = update

      if (qr) {
        let txt = '*S U B B O T*\n\n> Scansiona questo QR per collegarti.'
        await parentw.sendFile(m.chat, await qrcode.toDataURL(qr, { scale: 8 }), "qrcode.png", txt, m)
      }

      if (connection === 'close') {
        let reasonCode = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode
        let reasonText = Object.keys(DisconnectReason).find(key => DisconnectReason[key] === reasonCode) || "Sconosciuto"
        await parentw.sendMessage(m.chat, { text: `❌ Sub-bot disconnesso: ${reasonCode} (${reasonText})` }, { quoted: m })
        try { subconn.ws.close() } catch { }
        subconn.ev.removeAllListeners()
        let i = global.conns.indexOf(subconn)
        if (i >= 0) {
          delete global.conns[i]
          global.conns.splice(i, 1)
        }
        fs.rmSync(folderSub, { recursive: true, force: true })
      }

      if (connection === 'open') {
        global.conns.push(subconn)
        await parentw.reply(m.chat, '✅ Sub-bot creato con successo!', m)
      }
    }

    subconn.ev.on("connection.update", connectionUpdate)
    subconn.ev.on("creds.update", saveCreds)
  }

  serbot()
}

handler.command = ["serbot", "qr", "code"]
export default handler