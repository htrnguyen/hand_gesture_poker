import { SUITS, RANKS } from './config.js';

export function generateDeck() {
    const deck = [];
    
    const suitMap = {
        SPADES: 'spades',
        CLUBS: 'clubs',
        DIAMONDS: 'diamonds',
        HEARTS: 'hearts'
    };

    Object.entries(SUITS).forEach(([suitKey, suitData]) => {
        RANKS.forEach(rank => {
            let value = 0;
            if (['10', 'J', 'Q', 'K'].includes(rank)) value = 10;
            else if (rank === 'A') value = 1;
            else value = parseInt(rank);

            let filenameRank = rank;
            let currentSuit = suitMap[suitKey];
            let suffix = "";

            if (rank === 'A') filenameRank = 'ace';
            else if (rank === 'J') { filenameRank = 'jack'; suffix = '2'; }
            else if (rank === 'Q') { filenameRank = 'queen'; suffix = '2'; }
            else if (rank === 'K') { filenameRank = 'king'; suffix = '2'; }
            
            const imageUrl = `images/${filenameRank.toLowerCase()}_of_${currentSuit}${suffix}.png`;

            deck.push({
                suit: suitData,
                rank: rank,
                value: value,
                isWestern: ['J', 'Q', 'K'].includes(rank),
                fullName: `${rank} ${suitData.name}`,
                imageUrl: imageUrl
            });
        });
    });

    return deck;
}
