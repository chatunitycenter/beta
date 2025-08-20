import { createCanvas } from 'canvas';

const SLOT_WIDTH = 400;
const SLOT_HEIGHT = 300;
const REEL_WIDTH = 80;
const SYMBOL_SIZE = 70;
const SYMBOL_SPACING = 10;

class SlotMachine {
    constructor(userId, userData) {
        this.userId = userId;
        this.userData = userData;
        this.reels = [[], [], []];
        this.spinning = false;
        this.result = null;
        this.betAmount = 0;
        this.winAmount = 0;
        this.symbols = this.createSymbols();
        this.initializeReels();
    }

    createSymbols() {
        return [
            { emoji: '🍒', name: 'Cherry', value: 2, color: '#FF0000' },
            { emoji: '🍋', name: 'Lemon', value: 3, color: '#FFD700' },
            { emoji: '🍊', name: 'Orange', value: 4, color: '#FFA500' },
            { emoji: '💎', name: 'Diamond', value: 10, color: '#1E90FF' },
            { emoji: '7️⃣', name: 'Seven', value: 7, color: '#00FF00' },
            { emoji: '⭐', name: 'Star', value: 5, color: '#FFFF00' },
            { emoji: '🔔', name: 'Bell', value: 6, color: '#FF69B4' },
            { emoji: '🎰', name: 'Slot', value: 8, color: '#8A2BE2' }
        ];
    }

    initializeReels() {
        for (let i = 0; i < 3; i++) {
            this.reels[i] = [];
            for (let j = 0; j < 20; j++) { // Reel più lungo per effetto di scorrimento
                const randomSymbol = this.symbols[Math.floor(Math.random() * this.symbols.length)];
                this.reels[i].push(randomSymbol);
            }
        }
    }

    spin(betAmount) {
        if (this.spinning) return { error: "🎰 Le slot sono già in movimento!" };
        if (betAmount > this.userData.limit) return { error: "💰 Fondi insufficienti!" };

        this.betAmount = betAmount;
        this.userData.limit -= betAmount;
        this.spinning = true;
        this.result = null;
        this.winAmount = 0;

        // Mescola i rulli
        for (let i = 0; i < 3; i++) {
            this.initializeReels();
        }

        // Simula lo spinning e determina il risultato
        setTimeout(() => {
            this.determineResult();
        }, 2000);

        return { success: true, spinning: true };
    }

    determineResult() {
        this.spinning = false;
        
        // Prendi i simboli centrali di ogni rullo
        const resultSymbols = [
            this.reels[0][10], // Simbolo centrale del primo rullo
            this.reels[1][10],
            this.reels[2][10]
        ];

        // Controlla le vincite
        let winMultiplier = 0;
        let winType = 'nessuna';

        // Jackpot - tutti e 3 uguali
        if (resultSymbols[0] === resultSymbols[1] && resultSymbols[1] === resultSymbols[2]) {
            winMultiplier = resultSymbols[0].value * 5;
            winType = 'JACKPOT';
        }
        // Doppia combinazione
        else if (resultSymbols[0] === resultSymbols[1] || resultSymbols[1] === resultSymbols[2] || resultSymbols[0] === resultSymbols[2]) {
            winMultiplier = resultSymbols.find(s => resultSymbols.filter(x => x === s).length >= 2).value * 2;
            winType = 'doppia';
        }

        this.winAmount = this.betAmount * winMultiplier;
        
        if (winMultiplier > 0) {
            this.userData.limit += this.winAmount;
            this.result = { win: true, amount: this.winAmount, type: winType, symbols: resultSymbols };
        } else {
            this.result = { win: false, symbols: resultSymbols };
        }
    }

    async generateSlotImage() {
        const canvas = createCanvas(SLOT_WIDTH, SLOT_HEIGHT);
        const ctx = canvas.getContext('2d');

        // Sfondo macchinetta
        const gradient = ctx.createLinearGradient(0, 0, SLOT_WIDTH, SLOT_HEIGHT);
        gradient.addColorStop(0, '#2c3e50');
        gradient.addColorStop(1, '#34495e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, SLOT_WIDTH, SLOT_HEIGHT);

        // Cornice metallica
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 8;
        ctx.strokeRect(10, 10, SLOT_WIDTH - 20, SLOT_HEIGHT - 20);

        // Luci decorative
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.arc(20 + i * 20, 20, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(20 + i * 20, SLOT_HEIGHT - 20, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Area rulli
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(50, 50, SLOT_WIDTH - 100, SLOT_HEIGHT - 100);

        // Disegna i rulli
        const reelStartX = 60;
        const reelStartY = 60;
        
        for (let i = 0; i < 3; i++) {
            this.drawReel(ctx, reelStartX + i * (REEL_WIDTH + 20), reelStartY, i);
        }

        // Linee vincenti
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.lineWidth = 2;
        
        // Linea orizzontale centrale
        ctx.beginPath();
        ctx.moveTo(50, reelStartY + SYMBOL_SIZE + SYMBOL_SPACING);
        ctx.lineTo(SLOT_WIDTH - 50, reelStartY + SYMBOL_SIZE + SYMBOL_SPACING);
        ctx.stroke();

        // Info gioco
        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        
        if (this.spinning) {
            ctx.fillText('🎰 SPINNING...', SLOT_WIDTH / 2, 40);
        } else if (this.result) {
            if (this.result.win) {
                ctx.fillStyle = '#f39c12';
                ctx.font = 'bold 20px Arial';
                ctx.fillText(`🎉 ${this.result.type}! VINTO: ${this.formatNumber(this.result.amount)} UC`, SLOT_WIDTH / 2, 40);
            } else {
                ctx.fillStyle = '#e74c3c';
                ctx.fillText('😔 Ritenta!', SLOT_WIDTH / 2, 40);
            }
        }

        // Puntata e saldo
        ctx.fillStyle = '#bdc3c7';
        ctx.font = '14px Arial';
        ctx.fillText(`PUNTATA: ${this.formatNumber(this.betAmount)} UC`, SLOT_WIDTH / 2, SLOT_HEIGHT - 25);
        ctx.fillText(`SALDO: ${this.formatNumber(this.userData.limit)} UC`, SLOT_WIDTH / 2, SLOT_HEIGHT - 10);

        return canvas.toBuffer('image/png');
    }

    drawReel(ctx, x, y, reelIndex) {
        // Sfondo rullo
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x, y, REEL_WIDTH, SYMBOL_SIZE * 3 + SYMBOL_SPACING * 2);

        // Simboli del rullo
        const visibleSymbols = this.reels[reelIndex].slice(10, 13); // Mostra 3 simboli centrali

        for (let i = 0; i < 3; i++) {
            const symbol = visibleSymbols[i];
            const symbolY = y + i * (SYMBOL_SIZE + SYMBOL_SPACING);
            
            // Sfondo simbolo
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(x + 5, symbolY + 5, REEL_WIDTH - 10, SYMBOL_SIZE - 10);

            // Simbolo
            ctx.font = 'bold 40px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = symbol.color;
            ctx.fillText(symbol.emoji, x + REEL_WIDTH / 2, symbolY + SYMBOL_SIZE / 2);

            // Effetto luci
            if (this.result && this.result.win && this.result.symbols.includes(symbol)) {
                ctx.strokeStyle = '#f39c12';
                ctx.lineWidth = 3;
                ctx.strokeRect(x + 3, symbolY + 3, REEL_WIDTH - 6, SYMBOL_SIZE - 6);
            }
        }

        // Cornice rullo
        ctx.strokeStyle = '#7f8c8d';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, REEL_WIDTH, SYMBOL_SIZE * 3 + SYMBOL_SPACING * 2);
    }

    formatNumber(num) {
        return new Intl.NumberFormat('it-IT').format(num);
    }
}

global.slotMachines = global.slotMachines || {};

let cooldowns = {};

let handler = async (m, { conn, usedPrefix, text }) => {
    const chat = m.chat;
    const userId = m.sender;
    const user = global.db.data.users[userId];

    if (!user) return conn.reply(m.chat, '❌ Utente non trovato nel database!', m);

    // Cooldown di 3 secondi tra le spin
    if (cooldowns[userId] && Date.now() - cooldowns[userId] < 3000) {
        const remaining = Math.ceil((cooldowns[userId] + 3000 - Date.now()) / 1000);
        return conn.reply(m.chat, `⏰ Aspetta ${remaining} secondi prima di giocare di nuovo!`, m);
    }

    cooldowns[userId] = Date.now();

    let betAmount = parseInt(text);
    if (isNaN(betAmount) || betAmount < 10 || betAmount > user.limit) {
        return conn.reply(m.chat, `❌ Puntata non valida! Inserisci un importo tra 10 e ${user.limit} UC`, m);
    }

    // Crea o recupera la slot machine
    if (!global.slotMachines[userId]) {
        global.slotMachines[userId] = new SlotMachine(userId, user);
    }

    const slotMachine = global.slotMachines[userId];
    const result = slotMachine.spin(betAmount);

    if (result.error) return conn.reply(m.chat, result.error, m);

    // Genera l'immagine iniziale (spinning)
    const spinningImage = await slotMachine.generateSlotImage();
    
    let initialCaption = `🎰 *SLOT MACHINE*\n`;
    initialCaption += `💶 Puntata: ${slotMachine.formatNumber(betAmount)} UC\n`;
    initialCaption += `📊 Saldo: ${slotMachine.formatNumber(user.limit)} UC\n\n`;
    initialCaption += `⏳ Le slot stanno girando...`;

    await conn.sendMessage(chat, {
        image: spinningImage,
        caption: initialCaption,
        footer: 'Slot Machine 🎰'
    }, { quoted: m });

    // Aspetta 2 secondi per l'effetto di spinning
    setTimeout(async () => {
        const finalImage = await slotMachine.generateSlotImage();
        let finalCaption = `🎰 *SLOT MACHINE*\n`;
        finalCaption += `💶 Puntata: ${slotMachine.formatNumber(betAmount)} UC\n`;
        finalCaption += `📊 Saldo: ${slotMachine.formatNumber(user.limit)} UC\n\n`;

        if (slotMachine.result.win) {
            finalCaption += `🎉 *${slotMachine.result.type}!*\n`;
            finalCaption += `💰 Vincita: ${slotMachine.formatNumber(slotMachine.result.amount)} UC\n`;
            finalCaption += `✨ Combinazione: ${slotMachine.result.symbols.map(s => s.emoji).join(' ')}`;
        } else {
            finalCaption += `😔 Ritenta!\n`;
            finalCaption += `🎯 Combinazione: ${slotMachine.result.symbols.map(s => s.emoji).join(' ')}`;
        }

        const buttons = [
            { buttonId: `${usedPrefix}slot 100`, buttonText: { displayText: "🎰 Gioca 100 UC" }, type: 1 },
            { buttonId: `${usedPrefix}slot 500`, buttonText: { displayText: "🎰 Gioca 500 UC" }, type: 1 },
            { buttonId: `${usedPrefix}slot ${Math.floor(user.limit/2)}`, buttonText: { displayText: "🎰 Metà saldo" }, type: 1 }
        ];

        await conn.sendMessage(chat, {
            image: finalImage,
            caption: finalCaption,
            footer: 'Slot Machine 🎰',
            buttons: buttons
        }, { quoted: m });

    }, 2000);
};

handler.help = ['slot <puntata>'];
handler.tags = ['games'];
handler.command = /^slot$/i;
handler.group = true;
handler.register = true;

export default handler;
