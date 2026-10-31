// Customer Ordering Logic & Realtime Tracking

let menuItems = [];
let customerCart = [];
let selectedCategory = 'All';
let activeCustomerOrderId = null;

window.addEventListener('DOMContentLoaded', async () => {
    updateConnectionStatusUI();
    await fetchMenuItems();
    renderCustomerCategories();
    renderCustomerMenu();
});

function updateConnectionStatusUI() {
    const tag = document.getElementById('connection-status-tag');
    if (!isMockMode) {
        tag.innerText = 'Supabase Realtime';
        tag.className = 'text-xs px-2 py-0.5 ml-2 rounded-full font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300';
    } else {
        tag.innerText = 'Demo Local Mode';
    }
}

async function fetchMenuItems() {
    if (supabase) {
        const { data, error } = await supabase.from('menu_items').select('*');
        if (!error && data.length > 0) {
            menuItems = data;
            return;
        }
    }
    menuItems = fallbackMenuItems;
}

function renderCustomerCategories() {
    const categories = ['All', ...new Set(menuItems.map(i => i.category))];
    const container = document.getElementById('category-filter-container');
    container.innerHTML = categories.map(cat => `
        <button onclick="filterCategory('${cat}')" class="px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${selectedCategory === cat ? 'bg-brand-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}">
            ${cat}
        </button>
    `).join('');
}

function filterCategory(cat) {
    selectedCategory = cat;
    renderCustomerCategories();
    renderCustomerMenu();
}

function renderCustomerMenu() {
    const search = document.getElementById('menu-search').value.toLowerCase();
    const grid = document.getElementById('customer-menu-grid');

    const filtered = menuItems.filter(item => {
        const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
        const matchesSearch = item.title.toLowerCase().includes(search) || item.description.toLowerCase().includes(search);
        return matchesCat && matchesSearch;
    });

    grid.innerHTML = filtered.map(item => `
        <div class="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/60 shadow-sm hover:shadow-lg transition flex flex-col justify-between group">
            <div>
                <div class="h-44 w-full overflow-hidden relative">
                    <img src="${item.image_url}" alt="${item.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" onerror="this.src='https://placehold.co/500x300?text=${encodeURIComponent(item.title)}'">
                    ${!item.is_available ? `<div class="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center text-white font-bold text-xs uppercase">Out of Stock</div>` : ''}
                    <span class="absolute top-3 right-3 bg-slate-900/80 text-white text-xs font-extrabold px-2.5 py-1 rounded-full">$${parseFloat(item.price).toFixed(2)}</span>
                </div>
                <div class="p-5">
                    <div class="text-[10px] font-bold text-brand-500 uppercase tracking-wider mb-1">${item.category}</div>
                    <h3 class="font-bold text-slate-900 dark:text-white text-base leading-snug">${item.title}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">${item.description}</p>
                </div>
            </div>
            <div class="px-5 pb-5 pt-0">
                <button onclick="addToCart('${item.id}')" ${!item.is_available ? 'disabled' : ''} class="w-full py-2.5 rounded-xl ${item.is_available ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-brand-600 dark:hover:bg-brand-500 dark:hover:text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'} font-bold text-xs transition flex items-center justify-center gap-2">
                    <i class="fa-solid fa-plus"></i> Add to Order
                </button>
            </div>
        </div>
    `).join('');
}

function addToCart(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    const existing = customerCart.find(c => c.id === itemId);

    if (existing) {
        existing.quantity++;
    } else {
        customerCart.push({ ...item, quantity: 1 });
    }

    updateCartBadge();
    renderCartModal();
}

function updateCartBadge() {
    const count = customerCart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-badge').innerText = count;
}

function renderCartModal() {
    const container = document.getElementById('cart-modal-items');
    if (customerCart.length === 0) {
        container.innerHTML = `<p class="text-center text-xs text-slate-400 py-8">Your basket is empty.</p>`;
        document.getElementById('cart-total').innerText = '$0.00';
        return;
    }

    let total = 0;
    container.innerHTML = customerCart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700">
                <div>
                    <h4 class="font-bold text-xs text-slate-900 dark:text-white">${item.title}</h4>
                    <span class="text-[11px] text-slate-500">$${parseFloat(item.price).toFixed(2)}</span>
                </div>
                <div class="flex items-center gap-3">
                    <div class="flex items-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600">
                        <button onclick="changeCartQty('${item.id}', -1)" class="px-2 py-0.5 text-xs text-slate-500 font-bold">-</button>
                        <span class="px-2 text-xs font-bold">${item.quantity}</span>
                        <button onclick="changeCartQty('${item.id}', 1)" class="px-2 py-0.5 text-xs text-slate-500 font-bold">+</button>
                    </div>
                    <span class="font-bold text-xs text-slate-900 dark:text-white">$${itemTotal.toFixed(2)}</span>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('cart-total').innerText = `$${total.toFixed(2)}`;
}

function changeCartQty(id, delta) {
    const item = customerCart.find(c => c.id === id);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
        customerCart = customerCart.filter(c => c.id !== id);
    }
    updateCartBadge();
    renderCartModal();
}

function toggleCartModal() {
    document.getElementById('cart-modal').classList.toggle('hidden');
    renderCartModal();
}

async function submitCustomerOrder() {
    if (customerCart.length === 0) return;

    const table = document.getElementById('cart-table-select').value;
    const notes = document.getElementById('cart-notes').value;
    const total = customerCart.reduce((s, i) => s + (i.price * i.quantity), 0);

    let createdOrder = null;

    if (supabase) {
        const { data: orderData, error: orderErr } = await supabase.from('orders').insert([
            { table_number: table, status: 'pending', total_amount: total, special_notes: notes }
        ]).select();

        if (!orderErr && orderData.length > 0) {
            createdOrder = orderData[0];
            const itemsToInsert = customerCart.map(c => ({
                order_id: createdOrder.id,
                menu_item_id: c.id,
                item_title: c.title,
                quantity: c.quantity,
                unit_price: c.price
            }));
            await supabase.from('order_items').insert(itemsToInsert);
        }
    } else {
        createdOrder = {
            id: 'ORD-' + Math.floor(1000 + Math.random() * 9000),
            table_number: table,
            status: 'pending',
            total_amount: total,
            special_notes: notes
        };
    }

    if (createdOrder) {
        activeCustomerOrderId = createdOrder.id;
        customerCart = [];
        updateCartBadge();
        toggleCartModal();

        document.getElementById('active-order-tracker').classList.remove('hidden');
        document.getElementById('tracker-order-id').innerText = `#${createdOrder.id.slice(0, 8)}`;
        document.getElementById('tracker-type-display').innerText = table;

        subscribeToCustomerOrderStatus(createdOrder.id);
    }
}

function subscribeToCustomerOrderStatus(orderId) {
    updateTrackerUI('pending');
    if (!supabase) return;

    supabase
        .channel(`public:orders:id=eq.${orderId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, payload => {
            updateTrackerUI(payload.new.status);
        })
        .subscribe();
}

function updateTrackerUI(status) {
    const steps = ['pending', 'preparing', 'ready', 'completed'];
    const currentIdx = steps.indexOf(status);

    steps.forEach((step, idx) => {
        const el = document.getElementById(`step-${step}`);
        if (idx <= currentIdx) {
            el.className = 'p-2.5 rounded-xl bg-brand-500 text-white font-bold shadow-md transition-all';
        } else {
            el.className = 'p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-400';
        }
    });
}
