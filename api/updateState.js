import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const newState = req.body;
        
        // Save the updated state to Vercel KV
        await kv.set('reatState1_0', newState);
        
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to update store state.' });
    }
}
