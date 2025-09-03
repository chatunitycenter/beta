import pkg from 'baileys'
const { generateWAMessageFromContent } = pkg

let handler = async (m, { conn }) => {
  // vCard primo contatto
  let vcard1 = `BEGIN:VCARD
VERSION:3.0
FN: vale
ORG: valep
TEL;type=CELL;type=VOICE;waid=393518419909:+39 351 553 3859
END:VCARD`

  // primo invio -> entrambi i contatti insieme
  await conn.sendMessage(m.chat, {
    contacts: {
      displayName: "Owners",
      contacts: [
        { vcard: vcard1 },
        { vcard: vcard2 }
      ]
    }
  }, { quoted: m })

  // secondo invio -> messaggio CTA URL con più bottoni
  let msg = generateWAMessageFromContent(m.chat, {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          header: { title: "I miei social" },
          body: { text: "Puoi contattarmi anche qua: 👇" },
          footer: { text: nomebot },
          nativeFlowMessage: {
            buttons: [
              },
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "『 📸 』 Instagram",
                  url: "https://instagram.com/yyktv.vale",
                  merchant_url: "https://instagram.com/yyktv.vale"
                })
              }
            ]
          }
        }
      }
    }
  }, { userJid: m.sender })

  await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}
handler.help = ['owner']
handler.tags = ['main']
handler.command = ['creatore'] 
export default handler
