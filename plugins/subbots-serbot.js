import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import qrcode from 'qrcode'
import pino from 'pino'
import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys'

const activeBots = new Map()

const handler = async (m, { conn }) => {
  try {
    const sender = m.sender.split('@')[0]
    const botSessionPath = join(process.cwd(), 'sessioni', sender)

    if (!existsSync(join(process.cwd(), 'sessioni'))) {
      mkdirSync(join(process.cwd(), 'sessioni'), { recursive: true })
    }

    if (!existsSync(botSessionPath)) {
      mkdirSync(botSessionPath, { recursive: true })
    }

    const { state, saveCreds } = await useMultiFileAuthState(botSessionPath)

    const newBot = makeWASocket({
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
      },
      browser: ['SubBot', 'Chrome', '1.0.0']
    })

    let qrSent = false

    newBot.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr && !qrSent) {
        qrSent = true
        const qrImage = await qrcode.toDataURL(qr, { scale: 8 })
        await conn.sendMessage(m.chat, {
          image: Buffer.from(qrImage.split(',')[1], 'base64'),
          caption: `📲 Scansiona questo QR per collegare il tuo sub-bot\nSessione: ${sender}`
        }, { quoted: m })
      }

      if (connection === 'open') {
        activeBots.set(sender, newBot)
        await conn.sendMessage(m.chat, {
          text: `✅ SubBot attivo per ${sender}`
        }, { quoted: m })
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

        if (!shouldReconnect) {
          activeBots.delete(sender)
          await conn.sendMessage(m.chat, {
            text: `❌ SubBot disconnesso per ${sender}`
          }, { quoted: m })
        }
      }
    })

    newBot.ev.on('creds.update', saveCreds)

  } catch (e) {
    console.error('Errore SubBot:', e)
    await conn.sendMessage(m.chat, {
      text: '❌ Errore: ' + e.message
    }, { quoted: m })
  }
}

handler.command = ['subbot', 'serbot']
handler.help = ['subbot']
handler.tags = ['tools']

export default handler