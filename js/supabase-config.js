
// Configuration & Client Initialization for REat

// REPLACE THESE WITH YOUR SUPABASE PROJECT CREDENTIALS
const SUPABASE_URL = localStorage.getItem('reat_sb_url') || 'https://lveucvqnlikepvualuul.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = localStorage.getItem('reat_sb_key') || 'sb_publishable_lDLIKxHJhOIrXHLhsnkTaA_7E8Qha7n';

let supabase = null;
let isMockMode = true;

// Initialize Supabase Client
if (window.supabase && SUPABASE_URL.startsWith('http') && SUPABASE_ANON_KEY.length > 20) {
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        isMockMode = false;
        console.log("REat: Connected to Supabase Live Realtime Database.");
    } catch (e) {
        console.warn("REat: Failed to initialize Supabase, falling back to local mode.", e);
    }
} else {
    console.log("REat: Running in local mock mode.");
}

// Global Default Mock Menu Items
let fallbackMenuItems = [
    { id: '1', title: 'Truffle Mushroom Burger', description: 'Aged beef patty, black truffle aioli, wild mushrooms, swiss cheese.', price: 18.50, category: 'Mains', image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80', is_available: true },
    { id: '2', title: 'Wood-Fired Margherita Pizza', description: 'San Marzano tomatoes, fresh mozzarella, organic basil, EVOO.', price: 16.00, category: 'Mains', image_url: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=500&q=80', is_available: true },
    { id: '3', title: 'Crispy Calamari Rings', description: 'Served with roasted garlic aioli and lemon wedges.', price: 12.50, category: 'Appetizers', image_url: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=500&q=80', is_available: true },
    { id: '4', title: 'Matcha Green Tea Latte', description: 'Organic ceremonial grade matcha with steamed oat milk.', price: 6.50, category: 'Drinks', image_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=500&q=80', is_available: true },
    { id: '5', title: 'Artisanal Chocolate Lava Cake', description: 'Warm molten chocolate cake with vanilla bean ice cream.', price: 9.50, category: 'Desserts', image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=500&q=80', is_available: true }
];

// Audio Alert Synthesizer for Kitchen Notifications
function playOrderAlertSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
    } catch (e) {
        console.log("Audio alert blocked by browser context.");
    }
}
