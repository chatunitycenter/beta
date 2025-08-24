const MIN_MEMBERS = 30;

let handler = async (m, { conn, args }) => {
  if (m.isGroup) return;
  
  // Controlla se il messaggio contiene un link di gruppo WhatsApp
  let text = m.text || '';
  let regex = /https:\/\/chat\.whatsapp\.com\/([a-zA-Z0-9]+)/;
  let match = text.match(regex);
  
  // Se non è un link di gruppo, esci
  if (!match) return;
  
  let code = match[1];

  try {
    let res = await conn.groupGetInviteInfo(code);
    if (!res) return m.reply('❌ Link non valido o scaduto.');

    let nome = res.subject || "Gruppo sconosciuto";
    let membri = res.size || 0;

    if (res.joinApprovalRequired) {
      if (membri >= MIN_MEMBERS) {
        await conn.groupAcceptInvite(code);
        return m.reply(`📩 Richiesta inviata al gruppo *${nome}* (${membri} membri).`);
      } else {
        return m.reply(`❌ Il gruppo *${nome}* ha solo ${membri} membri (minimo richiesto: ${MIN_MEMBERS}).`);
      }
    }

    if (membri >= MIN_MEMBERS) {
      await conn.groupAcceptInvite(code);
      return m.reply(`✅ Il bot è entrato nel gruppo *${nome}* (${membri} membri).`);
    } else {
      return m.reply(`❌ Il gruppo *${nome}* ha solo ${membri} membri (minimo richiesto: ${MIN_MEMBERS}).`);
    }

  } catch (e) {
    console.error(e);
    m.reply(`⚠️ Errore durante il join: ${e.message || e}`);
  }
};

// Rimuovi il comando specifico e ascolta tutti i messaggi privati
handler.command = /^/;
handler.help = ['Invia un link gruppo per far entrare il bot'];
handler.tags = ['group'];

export default handler;
