import { createCanvas } from 'canvas';

const SLOT_WIDTH = 500;
const SLOT_HEIGHT = 350;
const REEL_WIDTH = 90;
const SYMBOL_SIZE = 80;
const SYMBOL_SPACING = 15;
const FRAMES = 8; // Ridotto il numero di frame per maggiore stabilità

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
        this.animationFrames = []; // Inizializza come array vuoto
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
            for (let j = 0; j < 20; j++) { // Ridotto a 20 per performance
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
        this.animationFrames = []; // Reset array

        try {
            await this.generateAnimationFrames();
            return { success: true, spinning: true, frames: this.animationFrames.length };
        } catch (error) {
            console.error('Errore nella generazione animazione:', error);
            return { error: "❌ Errore nell'animazione delle slot!" };
        }
    }

    async generateAnimationFrames() {
        // Genera frame di animazione
        for (let frame = 0; frame < FRAMES; frame++) {
            for (let i = 0; i < 3; i++) {
                // Simula movimento rulli
                this.reels[i].push(this.symbols[Math.floor(Math.random() * this.symbols.length)]);
                this.reels[i].shift();
            }

            const frameImage = await this.generateFrameImage(frame);
            this.animationFrames.push(frameImage);
        }

        // Genera frame finale con risultato
        this.determineResult();
        const finalFrame = await this.generateFrameImage(FRAMES, true);
        this.animationFrames.push(finalFrame);
    }

    determineResult() {
        this.spinning = false;
        
        // Assicurati che i rulli abbiano abbastanza simboli
        if (this.reels[0].length < 11 || this.reels[1].length < 11 || this.reels[2].length < 11) {
            this.initializeReels(); // Reinizializza se necessario
        }

        const resultSymbols = [
            this.reels[0][10],
            this.reels[1][10], 
            this.reels[2][10]
        ];

        let winMultiplier = 0;
        let winType = 'nessuna';

        // Controlla se i simboli esistono prima di confrontarli
        if (resultSymbols[0] && resultSymbols[1] && resultSymbols[2]) {
            if (resultSymbols[0] === resultSymbols[1] && resultSymbols[1] === resultSymbols[2]) {
                winMultiplier = resultSymbols[0].value * 5;
                winType = 'JACKPOT';
            }
            else if (resultSymbols[0] === resultSymbols[1] || resultSymbols[1] === resultSymbols[2] || resultSymbols[0] === resultSymbols[2]) {
                const winningSymbol = resultSymbols.find(s => 
                    resultSymbols.filter(x => x === s).length >= 2
                );
                if (winningSymbol) {
                    winMultiplier = winningSymbol.value * 2;
                    winType = 'doppia';
                }
            }
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

        // Sfondo
        const gradient = ctx.createLinearGradient(0, 0, SLOT_WIDTH, SLOT_HEIGHT);
        gradient.addColorStop(0, '#2c3e50');
        gradient.addColorStop(1, '#34495e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, SLOT_WIDTH, SLOT_HEIGHT);

        // Cornice
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 8;
        ctx.strokeRect(10, 10, SLOT_WIDTH - 20, SLOT_HEIGHT - 20);

        // Area rulli
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(60, 60, SLOT_WIDTH - 120, SLOT_HEIGHT - 120);

        // Disegna i rulli
        const reelStartX = 80;
        const reelStartY = 80;
        
        for (let i = 0; i < 3; i++) {
            this.drawReel(ctx, reelStartX + i * (REEL_WIDTH + 30), reelStartY, i, frameNumber);
        }

        // Header
        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        
        if (!isFinal) {
            ctx.fillText('🎰 SPINNING...', SLOT_WIDTH / 2, 40);
        } else if (this.result) {
            if (this.result.win) {
                ctx.fillStyle = '#f39c12';
                ctx.font = 'bold 24px Arial';
                ctx.fillText(`🎉 ${this.result.type.toUpperCase()}!`, SLOT_WIDTH / 2, 40);
            } else {
                ctx.fillStyle = '#e74c3c';
                ctx.fillText('🎯 RITENTA!', SLOT_WIDTH / 2, 40);
            }
        }

        // Footer
        ctx.fillStyle = '#bdc3c7';
        ctx.font = '14px Arial';
        ctx.fillText(`💶 PUNTATA: ${this.formatNumber(this.betAmount)} UC`, SLOT_WIDTH / 4, SLOT_HEIGHT - 20);
        ctx.fillText(`💰 SALDO: ${this.formatNumber(this.userData.limit)} UC`, SLOT_WIDTH * 3/4, SLOT_HEIGHT - 20);

        return canvas.toBuffer('image/png');
    }

    drawReel(ctx, x, y, reelIndex, frameNumber) {
        // Sfondo rullo
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(x, y, REEL_WIDTH, SYMBOL_SIZE * 3 + SYMBOL_SPACING * 2);

        // Simboli visibili (assicurati che il reel abbia abbastanza elementi)
        if (this.reels[reelIndex].length < 3) {
            this.initializeReels(); // Reinizializza se necessario
            return;
        }

        const startIndex = Math.min(10 + (frameNumber % 3), this.reels[reelIndex].length - 3);
        const visibleSymbols = this.reels[reelIndex].slice(startIndex, startIndex + 3);

        for (let i = 0; i < 3; i++) {
            const symbol = visibleSymbols[i];
            if (!symbol) continue;

            const symbolY = y + i * (SYMBOL_SIZE + SYMBOL_SPACING);
            
            // Sfondo simbolo
            ctx.fillStyle = symbol.bgColor;
            ctx.beginPath();
            ctx.roundRect(x + 5, symbolY + 5, REEL_WIDTH - 10, SYMBOL_SIZE - 10, 10);
            ctx.fill();

            // Simbolo emoji
            ctx.font = 'bold 45px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = symbol.color;
            ctx.fillText(symbol.emoji, x + REEL_WIDTH / 2, symbolY + SYMBOL_SIZE / 2);
        }

        // Cornice rullo
        ctx.strokeStyle = '#636e72';
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

    if (cooldowns[userId] && Date.now() - cooldowns[userId] < 3000) {
        const remaining = Math.ceil((cooldowns[userId] + 3000 - Date.now()) / 1000);
        return conn.reply(m.chat, `⏰ Aspetta ${remaining} secondi prima di giocare di nuovo!`, m);
    }

    cooldowns[userId] = Date.now();

    let betAmount = parseInt(text);
    if (isNaN(betAmount) || betAmount < 10 || betAmount > user.limit) {
        return conn.reply(m.chat, `❌ Puntata non valida! Inserisci un importo tra 10 e ${user.limit} UC`, m);
    }

    try {
        if (!global.slotMachines[userId]) {
            global.slotMachines[userId] = new SlotMachine(userId, user);
        }

        const slotMachine = global.slotMachines[userId];
        const result = await slotMachine.spin(betAmount);

        if (result.error) return conn.reply(m.chat, result.error, m);

        // CONTROLLO DI SICUREZZA - verifica che animationFrames esista e sia un array
        if (!slotMachine.animationFrames || !Array.isArray(slotMachine.animationFrames)) {
            console.error('Animation frames non definiti:', slotMachine.animationFrames);
            return conn.reply(m.chat, '❌ Errore nelle animazioni delle slot!', m);
        }

        console.log(`Generati ${slotMachine.animationFrames.length} frame di animazione`);

        // Invia i frame dell'animazione
        for (let i = 0; i < slotMachine.animationFrames.length; i++) {
            const frame = slotMachine.animationFrames[i];
            const isFinal = i === slotMachine.animationFrames.length - 1;
            
            let caption = `🎰 *SLOT MACHINE*\n`;
            caption += `💶 Puntata: ${slotMachine.formatNumber(betAmount)} UC\n`;
            caption += `📊 Saldo: ${slotMachine.formatNumber(user.limit)} UC\n`;

            if (!isFinal) {
                caption += `⏳ Animazione... ${i + 1}/${slotMachine.animationFrames.length}`;
            } else if (slotMachine.result) {
                if (slotMachine.result.win) {
                    caption += `🎉 *${slotMachine.result.type.toUpperCase()}!*\n`;
                    caption += `💰 Vincita: ${slotMachine.formatNumber(slotMachine.result.amount)} UC\n`;
                    caption += `✨ Moltiplicatore: x${slotMachine.result.multiplier}\n`;
                    caption += `🎯 Combinazione: ${slotMachine.result.symbols.map(s => s.emoji).join(' ')}`;
                } else {
                    caption += `😔 Ritenta!\n`;
                    caption += `🎯 Combinazione: ${slotMachine.result.symbols.map(s => s.emoji).join(' ')}`;
                }
            }

            await conn.sendMessage(chat, {
                image: frame,
                caption: caption,
                footer: 'Slot Machine 🎰'
            });

            // Delay tra i frame
            await new Promise(resolve => setTimeout(resolve, isFinal ? 1000 : 300));
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

    } catch (error) {
        console.error('Errore nelle slot machine:', error);
        await conn.reply(m.chat, '❌ Errore durante il gioco delle slot!', m);
    }
};

handler.help = ['slot <puntata>'];
handler.tags = ['games'];
handler.command = /^slot$/i;
handler.group = true;
handler.register = true;

export default handler;
