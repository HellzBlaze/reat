import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const newOrder = req.body;
        let state = await kv.get('reatState1_0');

        if (!state) {
            return res.status(500).json({ error: 'Restaurant database not found.' });
        }

        // Increment the global order counter
        state.orderCounter++;
        newOrder.id = 'C' + state.orderCounter;
        newOrder.internalId = Date.now();

        // Push to the orders array
        state.orders.push(newOrder);

        // Save back to Vercel KV
        await kv.set('reatState1_0', state);

        return res.status(200).json({ 
            success: true, 
            orderId: newOrder.id, 
            message: 'Order secured in cloud database.' 
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to submit order.' });
    }
}
