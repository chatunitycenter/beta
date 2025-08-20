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

    let membri = res.size || 0;
    let nomeGruppo = res.subject || 'Gruppo Sconosciuto';

    if (res.joinApprovalRequired) {
      if (membri >= MIN_MEMBERS) {
        await conn.groupRequestJoin(code); // manda richiesta di ingresso
        return m.reply(`✅ Richiesta inviata per entrare in *${nomeGruppo}* (${membri} membri).`);
      } else {
        return m.reply(`❌ Il gruppo *${nomeGruppo}* ha solo ${membri} membri, richiesta non inviata.`);
      }
    }

    let groupId = await conn.groupAcceptInvite(code);
    let metadata = await conn.groupMetadata(groupId);
    let membriAttuali = metadata.participants.length;

    if (membriAttuali < MIN_MEMBERS) {
      await conn.groupLeave(groupId);
      return m.reply(`❌ Il gruppo *${nomeGruppo}* ha solo ${membriAttuali} membri, il bot è uscito.`);
    } else {
      return m.reply(`✅ Il bot è entrato in *${nomeGruppo}* (${membriAttuali} membri).`);
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