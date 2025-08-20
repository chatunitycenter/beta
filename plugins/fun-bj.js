import { createCanvas } from 'canvas';

const CARD_WIDTH = 80;
const CARD_HEIGHT = 120;
const CARD_RADIUS = 10;
const TABLE_WIDTH = 600;
const TABLE_HEIGHT = 400;

class BlackjackGame {
    constructor(playerId) {
        this.playerId = playerId;
        this.deck = this.createDeck();
        this.shuffleDeck();
        this.playerHand = [];
        this.dealerHand = [];
        this.playerScore = 0;
        this.dealerScore = 0;
        this.gameState = 'betting';
        this.betAmount = 0;
        this.playerBalance = 1000;
        this.winner = null;
        this.message = "💵 Fai la tua puntata!";
        this.startTime = Date.now();
    }

    createDeck() {
        const suits = ['♥', '♦', '♣', '♠'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const deck = [];
        
        for (const suit of suits) {
            for (const value of values) {
                deck.push({ suit, value });
            }
        }
        return deck;
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCard(hand) {
        if (this.deck.length === 0) {
            this.deck = this.createDeck();
            this.shuffleDeck();
        }
        const card = this.deck.pop();
        hand.push(card);
        return card;
    }

    calculateScore(hand) {
        let score = 0;
        let aces = 0;

        for (const card of hand) {
            if (['J', 'Q', 'K'].includes(card.value)) {
                score += 10;
            } else if (card.value === 'A') {
                aces++;
                score += 11;
            } else {
                score += parseInt(card.value);
            }
        }

        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }

        return score;
    }

    startGame(bet) {
        if (bet > this.playerBalance) {
            return { error: "💰 Fondi insufficienti!" };
        }

        this.betAmount = bet;
        this.playerBalance -= bet;
        this.playerHand = [];
        this.dealerHand = [];
        
        this.dealCard(this.playerHand);
        this.dealCard(this.dealerHand);
        this.dealCard(this.playerHand);
        this.dealCard(this.dealerHand);

        this.playerScore = this.calculateScore(this.playerHand);
        this.dealerScore = this.calculateScore([this.dealerHand[0]]);

        this.gameState = 'player-turn';
        this.message = "📋 Il tuo turno! Chiedi o Stai?";

        return { success: true };
    }

    playerHit() {
        if (this.gameState !== 'player-turn') {
            return { error: "❌ Non è il tuo turno!" };
        }

        this.dealCard(this.playerHand);
        this.playerScore = this.calculateScore(this.playerHand);

        if (this.playerScore > 21) {
            this.gameState = 'game-over';
            this.winner = 'dealer';
            this.message = "💥 Sballato! Hai superato 21!";
            return { bust: true };
        }

        this.message = `📋 Il tuo punteggio: ${this.playerScore}`;
        return { success: true, score: this.playerScore };
    }

    playerStand() {
        if (this.gameState !== 'player-turn') {
            return { error: "❌ Non è il tuo turno!" };
        }

        this.gameState = 'dealer-turn';
        this.dealerPlay();
        return { success: true };
    }

    dealerPlay() {
        this.dealerScore = this.calculateScore(this.dealerHand);
        
        while (this.dealerScore < 17) {
            this.dealCard(this.dealerHand);
            this.dealerScore = this.calculateScore(this.dealerHand);
        }

        this.determineWinner();
    }

    determineWinner() {
        this.gameState = 'game-over';
        
        if (this.dealerScore > 21) {
            this.winner = 'player';
            this.playerBalance += this.betAmount * 2;
            this.message = "🎉 Dealer sballato! Hai vinto!";
        } else if (this.playerScore > this.dealerScore) {
            this.winner = 'player';
            this.playerBalance += this.betAmount * 2;
            this.message = "🎉 Hai vinto!";
        } else if (this.playerScore < this.dealerScore) {
            this.winner = 'dealer';
            this.message = "😔 Dealer vince!";
        } else {
            this.winner = 'push';
            this.playerBalance += this.betAmount;
            this.message = "🤝 Pareggio!";
        }
    }

    async generateTableImage() {
        const canvas = createCanvas(TABLE_WIDTH, TABLE_HEIGHT);
        const ctx = canvas.getContext('2d');

        // Sfondo tavolo
        const gradient = ctx.createLinearGradient(0, 0, TABLE_WIDTH, TABLE_HEIGHT);
        gradient.addColorStop(0, '#0d5e2c');
        gradient.addColorStop(1, '#1a7a40');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

        // Bordo tavolo
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, TABLE_WIDTH - 10, TABLE_HEIGHT - 10);

        // Testo centrale
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BLACKJACK', TABLE_WIDTH / 2, TABLE_HEIGHT / 2);

        // Disegna mano giocatore
        this.drawHand(ctx, this.playerHand, TABLE_WIDTH / 2, TABLE_HEIGHT - 100, 'Giocatore');

        // Disegna mano dealer
        const showAllCards = this.gameState !== 'player-turn';
        this.drawHand(ctx, this.dealerHand, TABLE_WIDTH / 2, 100, 'Dealer', showAllCards);

        // Punteggi
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Arial';
        
        if (this.gameState !== 'betting') {
            ctx.fillText(`Punteggio: ${this.playerScore}`, TABLE_WIDTH / 2, TABLE_HEIGHT - 130);
            
            if (showAllCards) {
                ctx.fillText(`Punteggio: ${this.dealerScore}`, TABLE_WIDTH / 2, 170);
            } else if (this.dealerHand.length > 0) {
                const visibleScore = this.calculateScore([this.dealerHand[0]]);
                ctx.fillText(`Punteggio: ${visibleScore}+`, TABLE_WIDTH / 2, 170);
            }
        }

        // Info gioco
        ctx.font = '16px Arial';
        ctx.fillText(this.message, TABLE_WIDTH / 2, TABLE_HEIGHT / 2 + 50);
        ctx.fillText(`Saldo: €${this.playerBalance} | Puntata: €${this.betAmount}`, TABLE_WIDTH / 2, 30);

        return canvas.toBuffer('image/png');
    }

    drawHand(ctx, hand, centerX, y, label, showAll = true) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, centerX, y - 40);

        const totalWidth = (hand.length * CARD_WIDTH) + ((hand.length - 1) * 20);
        let x = centerX - totalWidth / 2;

        for (let i = 0; i < hand.length; i++) {
            if (!showAll && i === 1 && label === 'Dealer' && this.gameState === 'player-turn') {
                this.drawCardBack(ctx, x, y);
            } else {
                this.drawCard(ctx, x, y, hand[i]);
            }
            x += CARD_WIDTH + 20;
        }
    }

    drawCard(ctx, x, y, card) {
        // Sfondo carta
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(x, y, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Colore in base al seme
        ctx.fillStyle = ['♥', '♦'].includes(card.suit) ? '#FF0000' : '#000000';

        // Valore
        ctx.font = 'bold 20px Arial';
        ctx.fillText(card.value, x + 15, y + 25);

        // Seme
        ctx.font = '30px Arial';
        ctx.fillText(card.suit, x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2 + 10);

        // Angolo inferiore
        ctx.font = 'bold 20px Arial';
        ctx.fillText(card.value, x + CARD_WIDTH - 15, y + CARD_HEIGHT - 15);
        ctx.font = '20px Arial';
        ctx.fillText(card.suit, x + CARD_WIDTH - 15, y + CARD_HEIGHT - 35);
    }

    drawCardBack(ctx, x, y) {
        // Sfondo
        ctx.fillStyle = '#1a237e';
        ctx.beginPath();
        ctx.roundRect(x, y, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
        ctx.fill();
        
        // Bordo
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Pattern
        ctx.fillStyle = '#3949ab';
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 6; j++) {
                ctx.beginPath();
                ctx.arc(x + 15 + j * 14, y + 20 + i * 25, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('?', x + CARD_WIDTH / 2, y + CARD_HEIGHT / 2);
    }
}

global.blackjackGame = global.blackjackGame || {};

async function handleBlackjackTimeout(conn, chat, gameId) {
    const game = global.blackjackGame?.[chat];
    if (!game || game.id !== gameId) return;

    try {
        game.message = "⏰ Tempo scaduto! Partita annullata.";
        const image = await game.generateTableImage();
        
        await conn.sendMessage(chat, {
            image: image,
            caption: `⏰ Tempo scaduto!\nSaldo attuale: €${game.playerBalance}`,
            footer: 'Blackjack Bot'
        });
        
        delete global.blackjackGame[chat];
    } catch (error) {
        console.error('[BLACKJACK] Errore timeout:', error);
        delete global.blackjackGame[chat];
    }
}

async function startBlackjack(conn, m, bet) {
    const chat = m.chat;

    if (global.blackjackGame?.[chat]) {
        return conn.reply(m.chat, '🎰 Partita di blackjack già in corso!', m);
    }

    try {
        const game = new BlackjackGame(m.sender);
        const betAmount = parseInt(bet);

        if (isNaN(betAmount) || betAmount < 10 || betAmount > game.playerBalance) {
            return conn.reply(m.chat, `❌ Puntata non valida! Inserisci un importo tra 10 e ${game.playerBalance}`, m);
        }

        const result = game.startGame(betAmount);
        if (result.error) return conn.reply(m.chat, result.error, m);

        const image = await game.generateTableImage();
        const caption = `🎰 Blackjack iniziato!\nPuntata: €${betAmount}\nSaldo: €${game.playerBalance}\n\nUsa .hit .stand .double`;

        const msg = await conn.sendMessage(chat, {
            image: image,
            caption: caption,
            footer: 'Blackjack Bot'
        }, { quoted: m });

        game.id = msg.key.id;
        global.blackjackGame[chat] = game;

        game.timeoutId = setTimeout(() => {
            handleBlackjackTimeout(conn, chat, msg.key.id);
        }, 120000);

    } catch (error) {
        console.error('Errore blackjack:', error);
        await conn.reply(m.chat, '❌ Errore nell\'avvio del gioco', m);
    }
}

let handler = async (m, { conn, command, usedPrefix, text }) => {
    const chat = m.chat;
    const game = global.blackjackGame?.[chat];

    if (command === 'blackjack') {
        await startBlackjack(conn, m, text || '100');
        return;
    }

    if (command === 'hit' && game) {
        const result = game.playerHit();
        if (result.error) return conn.reply(m.chat, result.error, m);

        const image = await game.generateTableImage();
        let caption = `📋 Punteggio: ${game.playerScore}`;
        if (result.bust) caption += "\n💥 Sballato!";

        await conn.sendMessage(chat, { image: image, caption: caption });
        
        if (game.gameState === 'game-over') {
            delete global.blackjackGame[chat];
        }
        return;
    }

    if (command === 'stand' && game) {
        const result = game.playerStand();
        if (result.error) return conn.reply(m.chat, result.error, m);

        const image = await game.generateTableImage();
        const caption = `🎯 Stai a ${game.playerScore}\n${game.message}`;

        await conn.sendMessage(chat, { image: image, caption: caption });
        delete global.blackjackGame[chat];
        return;
    }

    if (command === 'double' && game) {
        if (game.playerHand.length !== 2) {
            return conn.reply(m.chat, '❌ Puoi raddoppiare solo con 2 carte!', m);
        }

        if (game.playerBalance < game.betAmount) {
            return conn.reply(m.chat, '❌ Fondi insufficienti per raddoppiare!', m);
        }

        game.playerBalance -= game.betAmount;
        game.betAmount *= 2;

        game.playerHit();
        if (game.playerScore <= 21) {
            game.playerStand();
        }

        const image = await game.generateTableImage();
        await conn.sendMessage(chat, { image: image, caption: game.message });
        
        if (game.gameState === 'game-over') {
            delete global.blackjackGame[chat];
        }
        return;
    }

    if (!game) {
        return conn.reply(m.chat, '❌ Nessuna partita in corso! Usa .blackjack [puntata]', m);
    }
};

handler.help = ['blackjack [puntata]', 'hit', 'stand', 'double'];
handler.tags = ['games'];
handler.command = /^(blackjack|hit|stand|double)$/i;
handler.group = true;
handler.register = true;

export default handler;
