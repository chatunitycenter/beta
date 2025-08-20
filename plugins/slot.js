import { createCanvas } from 'canvas';

const SLOT_WIDTH = 500;
const SLOT_HEIGHT = 350;
const REEL_WIDTH = 90;
const SYMBOL_SIZE = 80;
const SYMBOL_SPACING = 15;
const FRAMES = 10; // Numero di frame per l'animazione

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
        this.currentFrame = 0;
        this.animationFrames = [];
        this.initializeReels();
    }

    createSymbols() {
        return [
            { emoji: '🍒', name: 'Cherry', value: 2, color: '#FF6B6B', bgColor: '#FFE2E2' },
            { emoji: '🍋', name: 'Lemon', value: 3, color: '#FFD93D', bgColor: '#FFF6BF' },
            { emoji: '🍊', name: 'Orange', value: 4, color: '#FF9F45', bgColor: '#FFE8D4' },
            { emoji: '💎', name: 'Diamond', value: 10, color: '#6BCB77', bgColor: '#D4F4DD' },
            { emoji: '7️⃣', name: 'Seven', value: 7, color: '#4D96FF', bgColor: '#D6E4FF' },
            { emoji: '⭐', name: 'Star', value: 5, color: '#FFE569', bgColor: '#FFF9D7' },
            { emoji: '🔔', name: 'Bell', value: 6, color: '#FF78C4', bgColor: '#FFE4F3' },
            { emoji: '🎰', name: 'Slot', value: 8, color: '#9B5DE5', bgColor: '#E6D7F2' }
        ];
    }

    initializeReels() {
        for (let i = 0; i < 3; i++) {
            this.reels[i] = [];
            for (let j = 0; j < 30; j++) {
                const randomSymbol = this.symbols[Math.floor(Math.random() * this.symbols.length)];
                this.reels[i].push(randomSymbol);
            }
        }
    }

    async spin(betAmount) {
        if (this.spinning) return { error: "🎰 Le slot sono già in movimento!" };
        if (betAmount > this.userData.limit) return { error: "💰 Fondi insufficienti!" };

        this.betAmount = betAmount;
        this.userData.limit -= betAmount;
        this.spinning = true;
        this.result = null;
        this.winAmount = 0;
        this.currentFrame = 0;
        this.animationFrames = [];

        // Genera i frame dell'animazione
        await this.generateAnimationFrames();

        return { success: true, spinning: true, frames: this.animationFrames.length };
    }

    async generateAnimationFrames() {
        this.animationFrames = [];
        
        for (let frame = 0; frame < FRAMES; frame++) {
            // Sposta i rulli per ogni frame
            for (let i = 0; i < 3; i++) {
                // Rimuovi il primo elemento e aggiungine uno nuovo alla fine
                this.reels[i].shift();
                const newSymbol = this.symbols[Math.floor(Math.random() * this.symbols.length)];
                this.reels[i].push(newSymbol);
            }

            const frameImage = await this.generateFrameImage(frame);
            this.animationFrames.push(frameImage);
        }

        // Genera il frame finale con il risultato
        this.determineResult();
        const finalFrame = await this.generateFrameImage(FRAMES, true);
        this.animationFrames.push(finalFrame);
    }

    determineResult() {
        this.spinning = false;
        
        const resultSymbols = [
            this.reels[0][10],
            this.reels[1][10],
            this.reels[2][10]
        ];

        let winMultiplier = 0;
        let winType = 'nessuna';

        if (resultSymbols[0] === resultSymbols[1] && resultSymbols[1] === resultSymbols[2]) {
            winMultiplier = resultSymbols[0].value * 5;
            winType = 'JACKPOT';
        }
        else if (resultSymbols[0] === resultSymbols[1] || resultSymbols[1] === resultSymbols[2] || resultSymbols[0] === resultSymbols[2]) {
            const winningSymbol = resultSymbols.find(s => 
                resultSymbols.filter(x => x === s).length >= 2
            );
            winMultiplier = winningSymbol.value * 2;
            winType = 'doppia';
        }

        this.winAmount = this.betAmount * winMultiplier;
        
        if (winMultiplier > 0) {
            this.userData.limit += this.winAmount;
            this.result = { 
                win: true, 
                amount: this.winAmount, 
                type: winType, 
                symbols: resultSymbols,
                multiplier: winMultiplier
            };
        } else {
            this.result = { 
                win: false, 
                symbols: resultSymbols 
            };
        }
    }

    async generateFrameImage(frameNumber, isFinal = false) {
        const canvas = createCanvas(SLOT_WIDTH, SLOT_HEIGHT);
        const ctx = canvas.getContext('2d');

        // Sfondo macchinetta con gradiente
        const gradient = ctx.createLinearGradient(0, 0, SLOT_WIDTH, SLOT_HEIGHT);
        gradient.addColorStop(0, '#2c3e50');
        gradient.addColorStop(0.5, '#34495e');
        gradient.addColorStop(1, '#2c3e50');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, SLOT_WIDTH, SLOT_HEIGHT);

        // Cornice metallica con effetto 3D
        ctx.strokeStyle = '#ecf0f1';
        ctx.lineWidth = 3;
        ctx.strokeRect(15, 15, SLOT_WIDTH - 30, SLOT_HEIGHT - 30);
        
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 8;
        ctx.strokeRect(10, 10, SLOT_WIDTH - 20, SLOT_HEIGHT - 20);

        // Luci LED decorative
        ctx.fillStyle = frameNumber % 2 === 0 ? '#e74c3c' : '#f39c12';
        for (let i = 0; i < 24; i++) {
            ctx.beginPath();
            ctx.arc(25 + i * 20, 25, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(25 + i * 20, SLOT_HEIGHT - 25, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Area rulli con effetto vetro
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(60, 60, SLOT_WIDTH - 120, SLOT_HEIGHT - 120);

        // Riflessi vetro
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(60, 60);
        ctx.lineTo(120, 60);
        ctx.lineTo(60, 120);
        ctx.fill();

        // Disegna i rulli
        const reelStartX = 80;
        const reelStartY = 80;
        
        for (let i = 0; i < 3; i++) {
            this.drawReel(ctx, reelStartX + i * (REEL_WIDTH + 30), reelStartY, i, frameNumber);
        }

        // Linee vincenti
        ctx.strokeStyle = isFinal && this.result.win ? '#f39c12' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = isFinal && this.result.win ? 3 : 2;
        ctx.setLineDash(isFinal && this.result.win ? [] : [5, 5]);
        
        // Linee orizzontali
        for (let i = 0; i < 3; i++) {
            const lineY = reelStartY + (i * (SYMBOL_SIZE + SYMBOL_SPACING)) + SYMBOL_SIZE / 2;
            ctx.beginPath();
            ctx.moveTo(60, lineY);
            ctx.lineTo(SLOT_WIDTH - 60, lineY);
            ctx.stroke();
        }

        ctx.setLineDash([]);

        // Header con animazione
        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        
        if (!isFinal) {
            const spinText = '🎰 SPINNING' + '.'.repeat(frameNumber % 4);
            ctx.fillText(spinText, SLOT_WIDTH / 2, 40);
        } else {
            if (this.result.win) {
                ctx.fillStyle = '#f39c12';
                ctx.font = 'bold 24px Arial';
                ctx.fillText(`🎉 ${this.result.type.toUpperCase()}!`, SLOT_WIDTH / 2, 40);
            } else {
                ctx.fillStyle = '#e74c3c';
                ctx.fillText('🎯 RITENTA!', SLOT_WIDTH / 2, 40);
            }
        }

        // Footer con info
        ctx.fillStyle = '#bdc3c7';
        ctx.font = '14px Arial';
        ctx.fillText(`💶 PUNTATA: ${this.formatNumber(this.betAmount)} UC`, SLOT_WIDTH / 4, SLOT_HEIGHT - 20);
        ctx.fillText(`💰 SALDO: ${this.formatNumber(this.userData.limit)} UC`, SLOT_WIDTH * 3/4, SLOT_HEIGHT - 20);

        // Messaggio di vincita nel frame finale
        if (isFinal && this.result.win) {
            ctx.fillStyle = '#27ae60';
            ctx.font = 'bold 18px Arial';
            ctx.fillText(`+${this.formatNumber(this.winAmount)} UC (x${this.result.multiplier})`, SLOT_WIDTH / 2, SLOT_HEIGHT - 40);
        }

        return canvas.toBuffer('image/png');
    }

    drawReel(ctx, x, y, reelIndex, frameNumber) {
        // Sfondo rullo con effetto profondità
        const reelGradient = ctx.createLinearGradient(x, y, x + REEL_WIDTH, y + SYMBOL_SIZE * 3);
        reelGradient.addColorStop(0, '#2d3436');
        reelGradient.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = reelGradient;
        ctx.fillRect(x, y, REEL_WIDTH, SYMBOL_SIZE * 3 + SYMBOL_SPACING * 2);

        // Simboli visibili (3 centrali)
        const startIndex = 10 + (frameNumber % 3); // Animazione dello scorrimento
        const visibleSymbols = this.reels[reelIndex].slice(startIndex, startIndex + 3);

        for (let i = 0; i < 3; i++) {
            const symbol = visibleSymbols[i];
            if (!symbol) continue;

            const symbolY = y + i * (SYMBOL_SIZE + SYMBOL_SPACING);
            
            // Sfondo simbolo con effetto 3D
            ctx.fillStyle = symbol.bgColor;
            ctx.beginPath();
            ctx.roundRect(x + 5, symbolY + 5, REEL_WIDTH - 10, SYMBOL_SIZE - 10, 10);
            ctx.fill();

            // Bordo simbolo
            ctx.strokeStyle = symbol.color;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Simbolo emoji
            ctx.font = 'bold 50px Segoe UI Emoji, Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = symbol.color;
            ctx.fillText(symbol.emoji, x + REEL_WIDTH / 2, symbolY + SYMBOL_SIZE / 2);

            // Effetto highlight per simboli vincenti
            if (this.result && this.result.win && this.result.symbols.includes(symbol)) {
                ctx.strokeStyle = '#f39c12';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.roundRect(x + 2, symbolY + 2, REEL_WIDTH - 4, SYMBOL_SIZE - 4, 8);
                ctx.stroke();

                // Effetto glow
                ctx.shadowColor = '#f39c12';
                ctx.shadowBlur = 15;
                ctx.fillStyle = 'rgba(243, 156, 18, 0.1)';
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        // Cornice rullo
        ctx.strokeStyle = '#636e72';
        ctx.lineWidth = 3;
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

    if (cooldowns[userId] && Date.now() - cooldowns[userId] < 3000) {
        const remaining = Math.ceil((cooldowns[userId] + 3000 - Date.now()) / 1000);
        return conn.reply(m.chat, `⏰ Aspetta ${remaining} secondi prima di giocare di nuovo!`, m);
    }

    cooldowns[userId] = Date.now();

    let betAmount = parseInt(text);
    if (isNaN(betAmount) || betAmount < 10 || betAmount > user.limit) {
        return conn.reply(m.chat, `❌ Puntata non valida! Inserisci un importo tra 10 e ${user.limit} UC`, m);
    }

    if (!global.slotMachines[userId]) {
        global.slotMachines[userId] = new SlotMachine(userId, user);
    }

    const slotMachine = global.slotMachines[userId];
    const result = await slotMachine.spin(betAmount);

    if (result.error) return conn.reply(m.chat, result.error, m);

    // Invia i frame dell'animazione
    for (let i = 0; i < slotMachine.animationFrames.length; i++) {
        const frame = slotMachine.animationFrames[i];
        const isFinal = i === slotMachine.animationFrames.length - 1;
        
        let caption = `🎰 *SLOT MACHINE*`;
        if (!isFinal) {
            caption += `\n⏳ Frame ${i + 1}/${slotMachine.animationFrames.length}`;
        } else {
            if (slotMachine.result.win) {
                caption += `\n🎉 *${slotMachine.result.type.toUpperCase()}!*`;
                caption += `\n💰 Vincita: ${slotMachine.formatNumber(slotMachine.result.amount)} UC`;
                caption += `\n✨ Moltiplicatore: x${slotMachine.result.multiplier}`;
            } else {
                caption += `\n😔 Ritenta!`;
            }
            caption += `\n🎯 Combinazione: ${slotMachine.result.symbols.map(s => s.emoji).join(' ')}`;
        }

        caption += `\n💶 Puntata: ${slotMachine.formatNumber(betAmount)} UC`;
        caption += `\n📊 Saldo: ${slotMachine.formatNumber(user.limit)} UC`;

        await conn.sendMessage(chat, {
            image: frame,
            caption: caption,
            footer: 'Slot Machine 🎰'
        });

        // Aspetta tra i frame (più veloce all'inizio, più lento alla fine)
        const delay = isFinal ? 1000 : 200 + (i * 50);
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Pulsanti per giocare ancora
    const buttons = [
        { buttonId: `${usedPrefix}slot 100`, buttonText: { displayText: "🎰 100 UC" }, type: 1 },
        { buttonId: `${usedPrefix}slot 500`, buttonText: { displayText: "🎰 500 UC" }, type: 1 },
        { buttonId: `${usedPrefix}slot ${Math.floor(user.limit/2)}`, buttonText: { displayText: "🎰 Metà saldo" }, type: 1 }
    ];

    await conn.sendMessage(chat, {
        text: '💡 Vuoi giocare ancora?',
        footer: 'Slot Machine 🎰',
        buttons: buttons
    });
};

handler.help = ['slot <puntata>'];
handler.tags = ['games'];
handler.command = /^slot$/i;
handler.group = true;
handler.register = true;

export default handler;
