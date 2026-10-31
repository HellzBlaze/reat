// RMS Full Dashboard Engine

let rmsOrders = [];
let rmsMenuItems = [];
let posCart = [];

window.addEventListener('DOMContentLoaded', async () => {
    initDarkMode();
    checkStaffAuth();
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

// STAFF AUTHENTICATION SYSTEM
async function checkStaffAuth() {
    const modal = document.getElementById('staff-auth-modal');
    if (!supabase) {
        modal.classList.add('hidden');
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        modal.classList.add('hidden');
    } else {
        modal.classList.remove('hidden');
    }
}

async function handleStaffSignIn(e) {
    e.preventDefault();
    const email = document.getElementById('staff-email').value;
    const password = document.getElementById('staff-password').value;

    if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert("Sign-in failed: " + error.message);
            return;
        }
    }
    document.getElementById('staff-auth-modal').classList.add('hidden');
}

async function handleStaffSignOut() {
    if (supabase) {
        await supabase.auth.signOut();
    }
    document.getElementById('staff-auth-modal').classList.remove('hidden');
}

function enableDemoMode() {
    document.getElementById('staff-auth-modal').classList.add('hidden');
}

function updateStatusUI() {
    const tag = document.getElementById('rms-status-tag');
    if (!isMockMode) {
        tag.innerText = 'Supabase Realtime';
        tag.className = 'text-[10px] px-2 py-0.5 ml-2 rounded-full font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300';
    } else {
        tag.innerText = 'Demo Mode';
    }
}

function switchTab(tab) {
    ['oms', 'pos', 'menu', 'settings'].forEach(t => {
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

    rmsOrders = [
        {
            id: 'ORD-101',
            table_number: 'Table 4',
            status: 'pending',
            total_amount: 34.50,
            items: [{ title: 'Truffle Mushroom Burger', quantity: 1 }, { title: 'Wood-Fired Margherita', quantity: 1 }]
        }
    ];
}

function subscribeRealtimeOrders() {
    supabase
        .channel('public:orders')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
            fetchOrders().then(() => {
                playOrderAlertSound();
                renderKitchenOMS();
            });
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
            fetchOrders().then(() => { renderKitchenOMS(); });
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
                        <span class="text-xs font-bold text-brand-600 dark:text-brand-400">${ord.table_number}</span>
                        <div class="text-[10px] font-mono text-slate-400">#${ord.id.slice(0,8)}</div>
                    </div>
                </div>

                <div class="space-y-1 py-1 border-t border-b border-slate-100 dark:border-slate-700/60 text-slate-800 dark:text-slate-200">
                    ${(ord.items || []).map(i => `<div class="text-xs font-semibold">${i.quantity}x ${i.title}</div>`).join('')}
                </div>

                <div class="flex gap-1.5">
                    ${st === 'pending' ? `<button onclick="changeStatus('${ord.id}', 'preparing')" class="flex-1 py-1 bg-blue-600 text-white rounded text-xs font-bold">Cook</button>` : ''}
                    ${st === 'preparing' ? `<button onclick="changeStatus('${ord.id}', 'ready')" class="flex-1 py-1 bg-emerald-600 text-white rounded text-xs font-bold">Ready</button>` : ''}
                    ${st === 'ready' ? `<button onclick="changeStatus('${ord.id}', 'completed')" class="flex-1 py-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded text-xs font-bold">Serve</button>` : ''}
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
            <div class="font-bold text-xs text-slate-900 dark:text-white">${item.title}</div>
            <div class="font-black text-brand-600 dark:text-brand-400 text-sm mt-2">$${parseFloat(item.price).toFixed(2)}</div>
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
        return `<div class="flex justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200"><span>${i.title}</span><span class="font-bold">$${parseFloat(i.price).toFixed(2)}</span></div>`;
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
        await supabase.from('orders').insert([
            { table_number: 'Takeaway Counter', status: 'preparing', total_amount: total }
        ]);
    }

    rmsOrders.unshift(newOrd);
    posCart = [];
    renderPOSTicket();
    renderKitchenOMS();
}

// MENU CRUD LOGIC
function renderMenuTable() {
    const tbody = document.getElementById('rms-menu-table-body');
    tbody.innerHTML = rmsMenuItems.map(item => `
        <tr class="border-b dark:border-slate-700 text-slate-900 dark:text-white">
            <td class="p-4 font-bold">
                ${item.title}
                <div class="text-xs font-normal text-slate-500">${item.description}</div>
            </td>
            <td class="p-4 text-xs">${item.category}</td>
            <td class="p-4 font-bold">$${parseFloat(item.price).toFixed(2)}</td>
            <td class="p-4">
                <button onclick="toggleStockAvailability('${item.id}')" class="px-2.5 py-1 text-xs font-bold rounded-full ${item.is_available ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'}">
                    ${item.is_available ? 'In Stock' : 'Out of Stock'}
                </button>
            </td>
            <td class="p-4 text-right space-x-2">
                <button onclick="openEditMenuItemModal('${item.id}')" class="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline">Edit</button>
                <button onclick="deleteMenuItem('${item.id}')" class="text-xs text-rose-600 dark:text-rose-400 font-bold hover:underline">Delete</button>
            </td>
        </tr>
    `).join('');
}

function openAddMenuItemModal() {
    document.getElementById('edit-item-id').value = '';
    document.getElementById('modal-menu-title').innerText = 'Add Menu Item';
    document.getElementById('item-title-input').value = '';
    document.getElementById('item-price-input').value = '';
    document.getElementById('item-desc-input').value = '';
    document.getElementById('menu-modal').classList.remove('hidden');
}

function openEditMenuItemModal(id) {
    const item = rmsMenuItems.find(i => i.id === id);
    if (!item) return;
    document.getElementById('edit-item-id').value = item.id;
    document.getElementById('modal-menu-title').innerText = 'Edit Menu Item';
    document.getElementById('item-title-input').value = item.title;
    document.getElementById('item-category-input').value = item.category;
    document.getElementById('item-price-input').value = item.price;
    document.getElementById('item-desc-input').value = item.description;
    document.getElementById('menu-modal').classList.remove('hidden');
}

function closeMenuModal() {
    document.getElementById('menu-modal').classList.add('hidden');
}

async function saveMenuItem() {
    const id = document.getElementById('edit-item-id').value;
    const title = document.getElementById('item-title-input').value;
    const category = document.getElementById('item-category-input').value;
    const price = parseFloat(document.getElementById('item-price-input').value);
    const description = document.getElementById('item-desc-input').value;

    if (id) {
        // Edit existing
        const item = rmsMenuItems.find(i => i.id === id);
        if (item) {
            item.title = title;
            item.category = category;
            item.price = price;
            item.description = description;
            if (supabase) {
                await supabase.from('menu_items').update({ title, category, price, description }).eq('id', id);
            }
        }
    } else {
        // Create new
        const newItem = {
            id: 'item-' + Date.now(),
            title, category, price, description,
            image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80',
            is_available: true
        };
        rmsMenuItems.unshift(newItem);
        if (supabase) {
            await supabase.from('menu_items').insert([{ title, category, price, description, image_url: newItem.image_url, is_available: true }]);
        }
    }

    closeMenuModal();
    renderMenuTable();
    renderPOSMenu();
}

async function toggleStockAvailability(id) {
    const item = rmsMenuItems.find(i => i.id === id);
    if (!item) return;
    item.is_available = !item.is_available;
    if (supabase) {
        await supabase.from('menu_items').update({ is_available: item.is_available }).eq('id', id);
    }
    renderMenuTable();
}

async function deleteMenuItem(id) {
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    rmsMenuItems = rmsMenuItems.filter(i => i.id !== id);
    if (supabase) {
        await supabase.from('menu_items').delete().eq('id', id);
    }
    renderMenuTable();
    renderPOSMenu();
}

function saveRestaurantCustomization() {
    const name = document.getElementById('setting-name').value;
    const title = document.getElementById('setting-banner-title').value;
    const sub = document.getElementById('setting-banner-sub').value;

    localStorage.setItem('reat_custom_name', name);
    localStorage.setItem('reat_custom_title', title);
    localStorage.setItem('reat_custom_sub', sub);
    alert("Restaurant branding updated!");
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
