// RMS Staff Dashboard Script (Kitchen OMS, POS, Menu Editor)

let rmsOrders = [];
let rmsMenuItems = [];
let posCart = [];

window.addEventListener('DOMContentLoaded', async () => {
    updateStatusUI();
    await fetchMenuItems();
    await fetchOrders();

    renderKitchenOMS();
    renderPOSMenu();
    renderMenuTable();

    if (supabase) {
        subscribeRealtimeOrders();
    }
});

function updateStatusUI() {
    const tag = document.getElementById('rms-status-tag');
    if (!isMockMode) {
        tag.innerText = 'Supabase Realtime';
        tag.className = 'text-xs px-2 py-0.5 ml-2 rounded-full font-semibold bg-emerald-100 text-emerald-700';
    } else {
        tag.innerText = 'Demo Mode';
    }
}

function switchTab(tab) {
    ['oms', 'pos', 'menu'].forEach(t => {
        document.getElementById(`sub-${t}`).classList.add('hidden');
        document.getElementById(`tab-${t}`).className = 'px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400';
    });

    document.getElementById(`sub-${tab}`).classList.remove('hidden');
    document.getElementById(`tab-${tab}`).className = 'px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold';
}

async function fetchMenuItems() {
    if (supabase) {
        const { data, error } = await supabase.from('menu_items').select('*');
        if (!error && data.length > 0) {
            rmsMenuItems = data;
            return;
        }
    }
    rmsMenuItems = fallbackMenuItems;
}

async function fetchOrders() {
    if (supabase) {
        const { data, error } = await supabase
            .from('orders')
            .select(`*, order_items(*)`)
            .order('created_at', { ascending: false });

        if (!error && data) {
            rmsOrders = data.map(o => ({
                id: o.id,
                table_number: o.table_number,
                status: o.status,
                total_amount: o.total_amount,
                special_notes: o.special_notes,
                created_at: o.created_at,
                items: (o.order_items || []).map(i => ({ title: i.item_title, quantity: i.quantity }))
            }));
            return;
        }
    }

    // Default Local Demo Orders
    rmsOrders = [
        {
            id: 'ORD-101',
            table_number: 'Table 4',
            status: 'pending',
            total_amount: 34.50,
            special_notes: 'No onions on burger',
            created_at: new Date().toISOString(),
            items: [{ title: 'Truffle Mushroom Burger', quantity: 1 }, { title: 'Wood-Fired Margherita', quantity: 1 }]
        }
    ];
}

function subscribeRealtimeOrders() {
    supabase
        .channel('public:orders')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
            fetchOrders().then(() => {
                playOrderAlertSound();
                renderKitchenOMS();
            });
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
            fetchOrders().then(() => {
                renderKitchenOMS();
            });
        })
        .subscribe();
}

function renderKitchenOMS() {
    const statuses = ['pending', 'preparing', 'ready', 'completed'];

    statuses.forEach(st => {
        const list = rmsOrders.filter(o => o.status === st);
        document.getElementById(`count-${st}`).innerText = list.length;

        const col = document.getElementById(`col-${st}`);
        col.innerHTML = list.map(ord => `
            <div class="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="text-xs font-bold text-brand-600">${ord.table_number}</span>
                        <div class="text-[10px] font-mono text-slate-400">#${ord.id.slice(0,8)}</div>
                    </div>
                </div>

                <div class="space-y-1 py-1 border-t border-b border-slate-100 dark:border-slate-700/60">
                    ${(ord.items || []).map(i => `<div class="text-xs font-semibold">${i.quantity}x ${i.title}</div>`).join('')}
                </div>

                <div class="flex gap-1.5">
                    ${st === 'pending' ? `<button onclick="changeStatus('${ord.id}', 'preparing')" class="flex-1 py-1 bg-blue-600 text-white rounded text-xs font-bold">Cook</button>` : ''}
                    ${st === 'preparing' ? `<button onclick="changeStatus('${ord.id}', 'ready')" class="flex-1 py-1 bg-emerald-600 text-white rounded text-xs font-bold">Ready</button>` : ''}
                    ${st === 'ready' ? `<button onclick="changeStatus('${ord.id}', 'completed')" class="flex-1 py-1 bg-slate-900 text-white rounded text-xs font-bold">Serve</button>` : ''}
                </div>
            </div>
        `).join('');
    });
}

async function changeStatus(id, newStatus) {
    const target = rmsOrders.find(o => o.id === id);
    if (target) target.status = newStatus;

    if (supabase) {
        await supabase.from('orders').update({ status: newStatus }).eq('id', id);
    }

    renderKitchenOMS();
}

function renderPOSMenu() {
    const grid = document.getElementById('pos-menu-grid');
    grid.innerHTML = rmsMenuItems.map(item => `
        <button onclick="addTOPOSTicket('${item.id}')" class="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-left hover:border-brand-500">
            <div class="font-bold text-xs">${item.title}</div>
            <div class="font-black text-brand-600 text-sm mt-2">$${parseFloat(item.price).toFixed(2)}</div>
        </button>
    `).join('');
}

function addTOPOSTicket(id) {
    const item = rmsMenuItems.find(i => i.id === id);
    posCart.push(item);
    renderPOSTicket();
}

function renderPOSTicket() {
    const container = document.getElementById('pos-cart-items');
    let total = 0;
    container.innerHTML = posCart.map(i => {
        total += parseFloat(i.price);
        return `<div class="flex justify-between text-xs py-1 border-b"><span>${i.title}</span><span class="font-bold">$${parseFloat(i.price).toFixed(2)}</span></div>`;
    }).join('');

    document.getElementById('pos-total').innerText = `$${total.toFixed(2)}`;
}

async function submitPOSOrder() {
    if (posCart.length === 0) return;
    const total = posCart.reduce((s, i) => s + parseFloat(i.price), 0);

    const newOrd = {
        id: 'POS-' + Math.floor(1000 + Math.random() * 9000),
        table_number: 'Takeaway Counter',
        status: 'preparing',
        total_amount: total,
        created_at: new Date().toISOString(),
        items: posCart.map(i => ({ title: i.title, quantity: 1 }))
    };

    if (supabase) {
        const { data } = await supabase.from('orders').insert([
            { table_number: 'Takeaway Counter', status: 'preparing', total_amount: total }
        ]).select();
    }

    rmsOrders.unshift(newOrd);
    posCart = [];
    renderPOSTicket();
    renderKitchenOMS();
}

function renderMenuTable() {
    const tbody = document.getElementById('rms-menu-table-body');
    tbody.innerHTML = rmsMenuItems.map(item => `
        <tr class="border-b dark:border-slate-700">
            <td class="p-4 font-bold">${item.title}</td>
            <td class="p-4 text-xs">${item.category}</td>
            <td class="p-4 font-bold">$${parseFloat(item.price).toFixed(2)}</td>
            <td class="p-4"><span class="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">Available</span></td>
        </tr>
    `).join('');
}

function simulateOrder() {
    const fake = {
        id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
        table_number: 'Table 2',
        status: 'pending',
        total_amount: 18.50,
        items: [{ title: 'Truffle Mushroom Burger', quantity: 1 }]
    };

    rmsOrders.unshift(fake);
    playOrderAlertSound();
    renderKitchenOMS();
}
