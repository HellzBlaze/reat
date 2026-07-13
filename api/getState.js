import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    try {
        // Fetch the global state from Vercel KV
        let state = await kv.get('reatState1_0');
        
        // If the database is empty (first time deployment), initialize it
        if (!state) {
            state = {
                storeName: "My Restaurant",
                categories: ['Mains', 'Sides', 'Beverages', 'Desserts'],
                menuItems: [],
                toppings: [],
                employees: [{internalId: 1, id: '001', name: 'Admin', sector: 'Administration', role: 'Owner'}],
                orders: [], 
                orderCounter: 100, 
                adminPin: '1234', 
                managerPin: '5678', 
                isOnline: true, 
                maxDeliveries: 0
            };
            await kv.set('reatState1_0', state);
        }
        
        return res.status(200).json(state);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to fetch restaurant data.' });
    }
}
