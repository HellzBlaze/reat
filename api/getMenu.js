import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Fetch the global state from Vercel KV
        const state = await kv.get('reatState1_0');
        
        if (!state) {
            return res.status(404).json({ error: 'Menu not found. Store might be offline.' });
        }

        // Calculate active deliveries for the capacity check
        const activeDelCount = state.orders ? state.orders.filter(
            o => o.orderType === 'Delivery' && o.status !== 'Collected' && o.status !== 'Cancelled'
        ).length : 0;

        // ONLY return safe, public-facing data. No PINs, no employee lists.
        const safeMenuData = {
            storeName: state.storeName || "My Restaurant",
            menu: state.menuItems || [],
            cats: state.categories || [],
            tops: state.toppings || [],
            maxDel: state.maxDeliveries || 0,
            activeDel: activeDelCount,
            isOnline: state.isOnline
        };

        return res.status(200).json(safeMenuData);

    } catch (error) {
        console.error("Menu fetch error:", error);
        return res.status(500).json({ error: 'Failed to fetch menu data.' });
    }
}
