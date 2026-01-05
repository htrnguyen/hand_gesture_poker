export const RITUAL_STATE = {
    IDLE: 'idle',
    PREPARING: 'preparing',
    SHUFFLING: 'shuffling',
    STOPPING: 'stopping',
    WAITING_FOR_NEXT: 'waiting',
    FINISHED: 'finished'
};

export const CARD_CONFIG = {
    cardWidth: 1.0,
    cardHeight: 1.5,
    tiers: [
        { count: 12, radius: 5.0 },
        { count: 18, radius: 8.0 },
        { count: 22, radius: 11.0 }
    ]
};

export const SUITS = {
    SPADES: { symbol: '♠', color: '#000000', name: 'Bích' },
    CLUBS: { symbol: '♣', color: '#000000', name: 'Chuồn' },
    DIAMONDS: { symbol: '♦', color: '#FF0000', name: 'Rô' },
    HEARTS: { symbol: '♥', color: '#FF0000', name: 'Cơ' }
};

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
