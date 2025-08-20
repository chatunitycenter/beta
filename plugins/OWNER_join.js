
const MIN_MEMBERS = 30;

let handler = async (m, { conn, args }) => {
  if (m.isGroup) return m.reply('❌ Questo comando funziona solo in privato.');
  if (!args[0]) return m.reply(`📩 Usa così:\n\n.join <link gruppo>`);

  let invite = args[0];
  let regex = /https:\/\/chat\.whatsapp\.com\/([a-zA-Z0-9]+)/;
  let match = invite.match(regex);

  if (!match) return m.reply('❌ Inserisci un link valido di un gruppo WhatsApp.');

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

handler.command = /^join$/i;
handler.help = ['join <link gruppo>'];
handler.tags = ['group'];

export default handler;