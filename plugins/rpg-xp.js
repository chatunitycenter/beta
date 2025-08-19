let handler = async (m, { conn, usedPrefix }) => {
    let user = global.db.data.users[m.sender]

    user.exp = Number(user.exp) || 0
    user.level = Number(user.level) || 1


    while (user.level > 1 && user.exp < xpRange(user.level, global.multiplier || 1).min) {
        user.level -= 1
    }


    while (user.exp >= xpRange(user.level, global.multiplier || 1).max) {
        user.level += 1
    }

    let { min, xp, max } = xpRange(user.level, global.multiplier || 1)
    let currentLevelXP = user.exp - min
    let xpNeeded = Math.max(0, max - user.exp)

    let format = num => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")

    let txt = `✨ 𝐈𝐋 𝐓𝐔𝐎 𝐏𝐑𝐎𝐅𝐈𝐋𝐎 𝐗𝐏 ✨\n\n`
    txt += `▸ *𝐔𝐓𝐄𝐍𝐓𝐄*: ${conn.getName(m.sender)}\n`
    txt += `▸ *𝐥𝐢𝐯𝐞𝐥𝐥𝐨 𝐚𝐭𝐭𝐮𝐚𝐥𝐞*: ${user.level}\n`
    txt += `▸  𝐗𝐏 𝐭𝐨𝐭𝐚𝐥𝐢: ${format(user.exp)}\n\n`
    txt += `📈 *𝐩𝐫𝐨𝐠𝐫𝐞𝐬𝐬𝐨*: ${format(currentLevelXP)}/${format(xp)} 𝐗𝐏\n`
    txt += `🎯 𝐌𝐀𝐍𝐂𝐀𝐍𝐎: ${format(xpNeeded)} 𝐗𝐏 𝐩𝐞𝐫 𝐢𝐥 𝐥𝐢𝐯𝐞𝐥𝐥𝐨 ${user.level + 1}\n\n`
    txt += `ℹ️ 𝐮𝐬𝐚 ${usedPrefix}𝐦𝐢𝐧𝐚 𝐩𝐞𝐫 𝐠𝐮𝐚𝐝𝐚𝐠𝐧𝐚𝐫𝐞 𝐩𝐢𝐮 𝐗𝐏!`

    let img = 'https://i.ibb.co/pcjHVvx/Whats-App-Image-2025-04-12-at-00-50-15.jpg'
    try {
        await conn.sendFile(m.chat, img, 'xp.jpg', txt, m)
    } catch {
        await conn.reply(m.chat, txt, m)
    }
}

handler.help = ['xp']
handler.tags = ['rpg']
handler.command = ['xp', 'exp', 'esperienza']
handler.register = true
export default handler

function xpRange(level, multiplier = 1) {
    if(level < 0) level = 0
    let minBase = level === 0 ? 0 : Math.pow(level, 2) * 20
    let maxBase = Math.pow(level + 1, 2) * 20

    let min = Math.floor(minBase * multiplier)
    let max = Math.floor(maxBase * multiplier)
    let xp = max - min

    return { min, xp, max }
}
