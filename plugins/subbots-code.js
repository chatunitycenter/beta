import { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidNormalizedUser } from '@whiskeysockets/baileys'
import qrcode from 'qrcode'
import fs from 'fs'
import pino from 'pino'
import crypto from 'crypto'
import NodeCache from 'node-cache'
import * as ws from 'ws'
import { makeWASocket } from '../lib/simple.js'

if (!(global.conns instanceof Array)) global.conns = []

let handler = async (m, { conn, args, usedPrefix, command }) => {
  let parentw = args[0] && args[0] == "plz" ? conn : await global.conn

  async function serbot() {
    let serbotFolder = crypto.randomBytes(10).toString('hex').slice(0, 8)
    let folderSub = `./varebot-sub/${serbotFolder}`
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
      printQRInTerminal: true,
      browser: ['Sub-Bot', 'Chrome', '2.0.0'],
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
      },
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: true,
      getMessage: async (chiave) => {
        let jid = jidNormalizedUser(chiave.remoteJid)
        let msg = await store.loadMessage(jid, chiave.id)
        return msg?.message || ""
      },
      msgRetryCounterCache,
      version
    }

    let conn = makeWASocket(connectionOptions)
    conn.isInit = false
    let isInit = true

    async function connectionUpdate(update) {
      const { connection, lastDisconnect, isNewLogin, qr } = update
      if (isNewLogin) conn.isInit = true

      if (qr) {
        let txt = '*S U B B O T*\n\n> Scansiona questo QR per collegarti come Sub-Bot\n\n1️⃣ Apri WhatsApp\n2️⃣ Vai su *Dispositivi Collegati*\n3️⃣ Scansiona il QR\n\n⚠️ Valido per 120 secondi'
        let sendQR = await parentw.sendFile(m.chat, await qrcode.toDataURL(qr, { scale: 8 }), "qrcode.png", txt, m)
        setTimeout(() => {
          parentw.sendMessage(m.chat, { delete: sendQR.key })
        }, 120000) // 120 secondi
      }

      const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode
      if (code && code !== DisconnectReason.loggedOut && conn?.ws.socket == null) {
        let i = global.conns.indexOf(conn)
        if (i >= 0) {
          delete global.conns[i]
          global.conns.splice(i, 1)
        }
        fs.rmdirSync(folderSub, { recursive: true })
        if (code !== DisconnectReason.connectionClosed) {
          await parentw.reply(m.chat, "❌ Connessione persa con il server.", m)
        }
      }

      if (connection == "open") {
        conn.isInit = true
        global.conns.push(conn)
        await parentw.reply(m.chat, '✅ Sub-bot creato con successo!', m)
      }
    }

    conn.ev.on("connection.update", connectionUpdate)
    conn.ev.on("creds.update", saveCreds)
  }

  serbot()
}

handler.command = ["jadibot", "qr", "serbot"]
export default handler

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}