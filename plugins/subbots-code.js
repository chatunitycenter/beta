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
import * as ws from 'ws'
import { makeWASocket } from '../lib/simple.js'
import { Boom } from '@hapi/boom'

if (!(global.conns instanceof Array)) global.conns = []

// FUNZIONE BASE AVVIO SUBBOT
async function startSubBot(m, conn, mode = "qr", args = []) {
  let folder = m.sender.split('@')[0]
  let folderPath = `./sessioni/${folder}`
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true })

  if (args[0]) {
    fs.writeFileSync(`${folderPath}/creds.json`, Buffer.from(args[0], 'base64').toString('utf-8'))
  }

  const { state, saveCreds } = await useMultiFileAuthState(folderPath)
  const { version } = await fetchLatestBaileysVersion()
  const msgRetryCounterCache = new NodeCache()

  let sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['SubBot', 'Chrome', '2.0.0'],
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
      let txt = `*📌 SubBot collegamento via QR*\n\n1. Apri WhatsApp\n2. Vai su "Dispositivi collegati"\n3. Scansiona questo QR`
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
      await conn.sendMessage(m.chat, { text: `✅ Sub-bot creato con successo!`, mentions: [m.sender] }, { quoted: m })
    }

    if (connection === 'close') {
      if (code !== DisconnectReason.loggedOut) {
        setTimeout(() => startSubBot(m, conn, mode, args), 5000)
      } else {
        await conn.sendMessage(m.chat, { text: `❌ Sub-bot disconnesso.`, mentions: [m.sender] }, { quoted: m })
        try { fs.rmSync(folderPath, { recursive: true, force: true }) } catch {}
      }
    }
  })
}

// ===== SERBOT (QR) =====
let handler = async (m, { conn, args }) => {
  startSubBot(m, conn, "qr", args)
}
handler.command = ['serbot', 'jadibot', 'qr']
export default handler

// ===== SERBOT (CODE) =====
export const pairingCode = {
  command: ['code'],
  handler: async (m, { conn, args }) => {
    startSubBot(m, conn, "code", args)
  }
}

// ===== BYEBOT =====
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

// ===== LISTA BOTS =====
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

// ===== DELETE SESSION =====
export const delSerbot = {
  command: ['delserbot', 'logout', 'deletesession', 'delsession'],
  handler: async (m, { conn }) => {
    let folder = m.sender.split('@')[0]
    let folderPath = `./sessioni/${folder}`
    if (fs.existsSync(folderPath)) {
      fs.rmSync(folderPath, { recursive: true, force: true })
      await conn.reply(m.chat, `🗑️ Sessione Subbot eliminata con successo.`, m)
    } else {
      await conn.reply(m.chat, `⚠️ Nessuna sessione trovata.`, m)
    }
  }
}

// ===== SET PRIMARY BOT =====
export const setPrimary = {
  command: ['setprimary'],
  handler: async (m, { conn, usedPrefix, args }) => {
    const users = [...new Set([...global.conns.filter((c) => c.user && c.ws.socket && c.ws.socket.readyState !== ws.CLOSED)])]

    let botJid
    let selectedBot

    if (m.mentionedJid && m.mentionedJid.length > 0) {
      botJid = m.mentionedJid[0]
    } else if (m.quoted) {
      botJid = m.quoted.sender
    } else {
      botJid = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    }

    if (botJid === conn.user.jid || botJid === global.conn.user.jid) {
      selectedBot = conn
    } else {
      selectedBot = users.find(c => c.user.jid === botJid)
    }

    if (!selectedBot) {
      return conn.reply(m.chat, `⚠️ @${botJid.split`@`[0]} non è un bot della stessa sessione, usa *${usedPrefix}bots* per verificare.`, m, { mentions: [botJid] })
    }

    let chat = global.db.data.chats[m.chat]
    chat.primaryBot = botJid
    conn.sendMessage(m.chat, { text: `✅ Il bot @${botJid.split('@')[0]} è stato impostato come primario in questo gruppo.`, mentions: [botJid] }, { quoted: m })
  }
}