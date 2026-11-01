// js/supabase-config.js
const SUPABASE_URL = 'https://lveucvqnlikepvualuul.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_lDLIKxHJhOIrXHLhsnkTaA_7E8Qha7n';

let db = null;

try {
  if (typeof supabase !== 'undefined') {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    console.log("Supabase client initialized successfully.");
  } else {
    console.warn("Supabase SDK script not loaded in HTML head.");
  }
} catch (err) {
  console.error("Failed to initialize Supabase client:", err);
}

// Audio notification generator using Web Audio API
const AudioFX = {
  playChime: () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.log('Audio playback policy restriction:', e);
    }
  }
};
