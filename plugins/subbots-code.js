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
import NodeCache from 'node-cache'
import * as ws from 'ws'
import crypto from 'crypto'
import { makeWASocket } from '../lib/simple.js'
import { Boom } from '@hapi/boom'

if (!(global.conns instanceof Array)) global.conns = []

async function startSubBot(m, conn, mode = "qr") {
  const authFolder = m.sender.split('@')[0]
  const userFolderPath = `./sessioni/${authFolder}`

  if (!fs.existsSync(userFolderPath)) fs.mkdirSync(userFolderPath, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(userFolderPath)
  const { version } = await fetchLatestBaileysVersion()
  const msgRetryCounterCache = new NodeCache()

  let sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['ChatUnity SubBot', 'Chrome', '2.0.0'],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
    },
    msgRetryCounterCache
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update
    const code = lastDisconnect?.error?.output?.statusCode || new Boom(lastDisconnect?.error)?.output?.statusCode

    if (qr && mode === "qr") {
      let txt = `📌 *Scansiona questo QR per collegare il SubBot*\n\n1. Apri WhatsApp\n2. Vai su "Dispositivi collegati"\n3. Scansiona questo QR`
      let qrCode = await qrcode.toDataURL(qr, { scale: 8 })
      let msg = await conn.sendFile(m.chat, qrCode, 'qrcode.png', txt, m)
      setTimeout(() => conn.sendMessage(m.chat, { delete: msg.key }), 30000)
    }

    if (mode === "code" && !sock.authState.creds.registered) {
      let number = m.sender.split('@')[0].replace(/[^0-9]/g, '')
      let codeBot = await sock.requestPairingCode(number)
      codeBot = codeBot?.match(/.{1,4}/g)?.join("-") || codeBot
      let txt = `📲 *Pairing Code generato*\n\n1. Vai su WhatsApp\n2. "Dispositivi collegati"\n3. "Collega con numero di telefono"\n4. Inserisci questo codice:\n\n👉 ${codeBot}`
      await conn.reply(m.chat, txt, m)
    }

    if (connection === 'open') {
      global.conns.push(sock)
      await conn.sendMessage(m.chat, { text: `✅ Sub-bot creato con successo: @${authFolder}`, mentions: [m.sender] }, { quoted: m })
    }

    if (connection === 'close') {
      if (code !== DisconnectReason.loggedOut) {
        setTimeout(() => startSubBot(m, conn, mode), 5000)
      } else {
        await conn.sendMessage(m.chat, { text: `❌ Sub-bot disconnesso: @${authFolder}`, mentions: [m.sender] }, { quoted: m })
        try { fs.rmSync(userFolderPath, { recursive: true, force: true }) } catch {}
      }
    }
  })
}

// ──────────────── SERBOT (QR) ────────────────
let handler = async (m, { conn }) => {
  startSubBot(m, conn, "qr")
}
handler.command = ['serbot', 'jadibot']
export default handler

// ──────────────── SERBOT (CODE) ────────────────
export const pairingCode = {
  command: ['code'],
  handler: async (m, { conn }) => {
    startSubBot(m, conn, "code")
  }
}

// ──────────────── BYEBOT ────────────────
export const byebot = {
  command: ['byebot'],
  handler: async (m, { conn }) => {
    if (global.conn.user.jid == conn.user.jid) {
      return conn.reply(m.chat, `⚠️ Il bot principale non può essere disattivato.`, m)
    } else {
      await conn.reply(m.chat, `😐 Subbot disattivato.`, m)
      conn.ws.close()
    }
  }
}

// ──────────────── LISTA BOTS ────────────────
export const listBots = {
  command: ['bots'],
  handler: async (m, { conn }) => {
    let uniqueUsers = new Map()
    global.conns.forEach((c) => {
      if (c.user && c.ws?.socket?.readyState !== ws.CLOSED) {
        uniqueUsers.set(c.user.jid, c)
      }
    })
    let txt = `🍭 Subbots attivi: *${uniqueUsers.size}*`
    await conn.reply(m.chat, txt, m)
  }
}

// ──────────────── DELETE SESSION ────────────────
export const delSerbot = {
  command: ['delserbot', 'logout'],
  handler: async (m, { conn }) => {
    let authFolder = m.sender.split('@')[0]
    let userFolderPath = `./sessioni/${authFolder}`
    if (fs.existsSync(userFolderPath)) {
      fs.rmSync(userFolderPath, { recursive: true, force: true })
      await conn.reply(m.chat, `🗑️ Sessione Subbot eliminata con successo.`, m)
    } else {
      await conn.reply(m.chat, `⚠️ Nessuna sessione trovata.`, m)
    }
  }
}