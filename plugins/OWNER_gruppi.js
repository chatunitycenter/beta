//Plugin Fatto da Gabs333 Velocizzato
const validateOwnerAccess = (message) => {
    if (!message.fromMe && !global.db.data.users[message.sender]?.owner) {
        throw new Error("Solo il proprietario del bot può usare questo comando.");
    }
};

const validateDatabaseIntegrity = () => {
    if (!global.db?.data?.users) {
        throw new Error("Database utenti non inizializzato correttamente.");
    }
    if (!global.db?.data?.chats) {
        throw new Error("Database chat non inizializzato correttamente.");
    }
};

const validateConnectionState = (conn) => {
    if (!conn || !conn.chats) {
        throw new Error("Connessione WhatsApp non disponibile.");
    }
    if (!conn.user?.jid) {
        throw new Error("Stato bot non valido.");
    }
};

const validateBotConfiguration = () => {
    if (typeof nomebot === 'undefined' || !nomebot.trim()) {
        throw new Error("Nome bot non configurato nelle impostazioni.");
    }
    return nomebot.trim();
};

const extractPhoneFromJid = (jid) => {
    return jid.includes('@') ? jid.split('@')[0] : jid;
};

const createVCardContact = (senderJid) => {
    const phoneNumber = extractPhoneFromJid(senderJid);
    return {
        key: {
            participants: "0@s.whatsapp.net",
            remoteJid: "status@broadcast", 
            fromMe: false,
            id: "Halo"
        },
        message: {
            contactMessage: {
                vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${phoneNumber}:${phoneNumber}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
            }
        },
        participant: "0@s.whatsapp.net"
    };
};

const filterValidGroups = (chatEntries) => {
    return chatEntries.filter(([jid, chat]) => {
        return jid && 
               jid.endsWith('@g.us') && 
               chat && 
               chat.isChats === true;
    });
};

const calculateGroupMessages = (groupJid) => {
    try {
        return global.db.data.chats[groupJid]?.messaggi || 0;
    } catch {
        return 0;
    }
};

const sortGroupsByMessageCount = (groups) => {
    return [...groups].sort((groupA, groupB) => {
        const messagesA = calculateGroupMessages(groupA[0]);
        const messagesB = calculateGroupMessages(groupB[0]);
        return messagesB - messagesA;
    });
};

const safeRetrieveGroupMetadata = async (conn, groupJid) => {
    try {
        const cachedData = conn.chats[groupJid]?.metadata;
        return cachedData || await conn.groupMetadata(groupJid) || {};
    } catch (error) {
        console.error(`[METADATA_ERROR] ${groupJid}:`, error.message);
        return { participants: [] };
    }
};

const identifyBotParticipant = (conn, participants) => {
    if (!Array.isArray(participants)) {
        return { admin: false };
    }
    
    const botJid = conn.user.jid;
    return participants.find(participant => {
        try {
            return conn.decodeJid(participant.id) === botJid;
        } catch {
            return participant.id === botJid;
        }
    }) || { admin: false };
};

const determineBotAdminStatus = (botParticipant) => {
    return Boolean(botParticipant?.admin);
};

const countActiveParticipants = (participants) => {
    return Array.isArray(participants) ? participants.length : 0;
};

const safeRetrieveGroupName = async (conn, groupJid) => {
    try {
        const name = await conn.getName(groupJid);
        return name && name.trim() ? name.trim() : 'Nome non disponibile';
    } catch (error) {
        console.error(`[NAME_ERROR] ${groupJid}:`, error.message);
        return 'Nome non disponibile';
    }
};

const generateInviteLink = async (conn, groupJid, hasAdminRights) => {
    if (!hasAdminRights) {
        return 'Non sono admin';
    }

    try {
        const inviteCode = await conn.groupInviteCode(groupJid);
        return inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : 'Codice non disponibile';
    } catch (error) {
        console.error(`[INVITE_ERROR] ${groupJid}:`, error.message);
        return 'Errore generazione link';
    }
};

const buildGroupInformation = async (conn, groupJid, chat, index) => {
    try {
        const metadata = await safeRetrieveGroupMetadata(conn, groupJid);
        const participants = metadata.participants || [];
        const botInfo = identifyBotParticipant(conn, participants);
        const isAdmin = determineBotAdminStatus(botInfo);
        const participantCount = countActiveParticipants(participants);
        const groupName = await safeRetrieveGroupName(conn, groupJid);
        const messageCount = calculateGroupMessages(groupJid);
        const inviteLink = await generateInviteLink(conn, groupJid, isAdmin);

        return formatGroupEntry(index, groupName, participantCount, messageCount, isAdmin, groupJid, inviteLink);
    } catch (error) {
        console.error(`[GROUP_PROCESSING_ERROR] ${groupJid}:`, error);
        return formatFallbackEntry(index, groupJid);
    }
};

const formatGroupEntry = (index, name, participants, messages, admin, jid, link) => {
    const lines = [
        `➣ 𝐆𝐑𝐔𝐏𝐏Ꮻ 𝐍𝐔𝐌𝚵𝐑Ꮻ: ${index + 1}`,
        `➣ 𝐆𝐑𝐔𝐏𝐏Ꮻ: ${name}`,
        `➣ 𝐏𝚲𝐑𝐓𝚵𝐂𝕀𝐏𝚲𝐍𝐓𝕐: ${participants}`,
        `➣ 𝐌𝚵𝐒𝐒𝚲𝐆𝐆𝕀: ${messages}`,
        `➣ 𝚲𝐃𝐌𝕀𝐍: ${admin ? '✓' : '☓'}`,
        `➣ 𝕀𝐃: ${jid}`,
        `➣ 𝐋𝕀𝐍𝐊: ${link}`,
        '',
        '══════ ೋೋ══════'
    ];
    
    return lines.join('\n') + '\n';
};

const formatFallbackEntry = (index, jid) => {
    return formatGroupEntry(index, 'Errore recupero dati', 0, 0, false, jid, 'Non disponibile');
};

const generateListHeader = (botName, totalCount) => {
    const headerLines = [
        `𝐋𝐈𝐒𝐓𝐀 𝐃𝐄𝐈 𝐆𝐑𝐔𝐏𝐏𝐈 𝐃𝐈 ${botName}`,
        '',
        `➣ 𝐓𝐨𝐭𝐚𝐥𝐞 𝐆𝐫𝐮𝐩𝐩𝐢: ${totalCount}`,
        '',
        '══════ ೋೋ══════'
    ];
    
    return headerLines.join('\n') + '\n';
};

const processAllGroups = async (conn, sortedGroups) => {
    const processedGroups = [];
    
    for (let i = 0; i < sortedGroups.length; i++) {
        const [groupJid, chat] = sortedGroups[i];
        const groupInfo = await buildGroupInformation(conn, groupJid, chat, i);
        processedGroups.push(groupInfo);
    }
    
    return processedGroups.join('');
};

const handler = async (message, { conn }) => {
    try {
        validateDatabaseIntegrity();
        validateConnectionState(conn);
        
        const botName = validateBotConfiguration();
        const allChatEntries = getAllGroups(conn);
        const validGroups = filterValidGroups(allChatEntries);
        
        if (validGroups.length === 0) {
            return message.reply("Il bot non partecipa a nessun gruppo attivo.");
        }
        
        const groupsSortedByActivity = sortGroupsByMessageCount(validGroups);
        
        console.log(`[LISTGRUPPI] Elaborazione ${groupsSortedByActivity.length} gruppi...`);
        
        const headerText = generateListHeader(botName, groupsSortedByActivity.length);
        const groupsData = await processAllGroups(conn, groupsSortedByActivity);
        const completeResponse = headerText + groupsData;
        
        console.log(`[LISTGRUPPI] Lista generata con successo (${completeResponse.length} caratteri)`);
        
        return message.reply(completeResponse.trim());
        
    } catch (error) {
        const knownErrors = [
            "Database",
            "Connessione", 
            "Nome bot",
            "Lista chat"
        ];
        
        const isKnownError = knownErrors.some(keyword => 
            error.message && error.message.includes(keyword)
        );
        
        if (isKnownError) {
            return message.reply(`Configurazione non valida: ${error.message}`);
        }
        
        console.error('[LISTGRUPPI_CRITICAL_ERROR]', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        
        return message.reply("Errore critico durante l'elaborazione. Controlla i log del sistema.");
    }
};

handler.command = /^(listgruppi)$/i;
handler.owner = true;

export default handler;