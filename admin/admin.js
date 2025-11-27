import { supabase } from '../js/supabase.js';

const adminContent = document.getElementById('adminContent');
const authSection = document.getElementById('authSection');
const adminAuthStatus = document.getElementById('admin-auth-status');
const signOutBtn = document.getElementById('signOutBtn');
const loginForm = document.getElementById('loginForm');
const authMessage = document.getElementById('authMessage');

const addForm = document.getElementById('addProductForm');
const productsList = document.getElementById('productsList');
const ordersList = document.getElementById('ordersList'); 
const messageDisplay = document.getElementById('message');

const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const categorySelect = document.getElementById('productCategory');
const stockQtyContainer = document.getElementById('stockQtyContainer');
const stockQtyInput = document.getElementById('stockQty'); 
const pendingOrdersCount = document.getElementById('pendingOrdersCount'); 

const itemIdToEdit = document.getElementById('itemIdToEdit');
const itemTableToEdit = document.getElementById('itemTableToEdit');

const isOfferCheckbox = document.getElementById('isOffer');
const offerPriceInput = document.getElementById('offerPrice');


const PC_PART_CATEGORIES = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case', 'cooling'];
const ALL_TABLES = ['products', 'pc_parts']; 

const ORDER_STATUSES = {
    pending: 'في انتظار المراجعة',
    processing: 'قيد التجهيز',
    delivered: 'تم التوصيل',
    canceled: 'ملغى'
};

const CATEGORY_NAMES = {
    desktop_pc: 'حواسيب مكتبية',
    all_in_one: 'الكل في واحد',
    laptop: 'أجهزة محمولة',
    prebuilt_pc: 'أجهزة مجمعة مسبقاً',
    monitor: 'شاشات عرض',
    accessory: 'ملحقات طرفية',
    software: 'برمجيات',
    network: 'شبكات',
    cpu: 'قطع: معالجات (CPU)',
    gpu: 'قطع: كروت شاشة (GPU)',
    motherboard: 'قطع: لوحات أم (Motherboard)',
    ram: 'قطع: ذاكرة عشوائية (RAM)',
    storage: 'قطع: تخزين (Storage)',
    psu: 'قطع: مزودات طاقة (PSU)',
    case: 'قطع: صناديق (Case)',
    cooling: 'قطع: تبريد (Cooling)',
};

function displayMessage(element, text, type) {
    element.textContent = text;
    switch (type) {
        case 'success':
            element.style.color = 'green';
            break;
        case 'error':
            element.style.color = 'red';
            break;
        case 'info':
        default:
            element.style.color = 'gray';
            break;
    }
}

function toggleProductFields() {
    stockQtyContainer.style.display = 'block';
    stockQtyInput.required = true;
}

async function updateUI(user) {
    if (user) {
        authSection.style.display = 'none';
        adminContent.style.display = 'block';
        signOutBtn.style.display = 'block';
        adminAuthStatus.textContent = `مرحبا: ${user.email}`;
        loadAllItems(); 
        loadOrders(); 
    } else {
        authSection.style.display = 'block';
        adminContent.style.display = 'none';
        signOutBtn.style.display = 'none';
        adminAuthStatus.textContent = 'لم يتم تسجيل الدخول';
        productsList.innerHTML = '';
        ordersList.innerHTML = '';
        displayMessage(authMessage, '', 'info');
        displayMessage(messageDisplay, '', 'info');
    }
}

async function checkUserStatus() {
    const { data: { user } } = await supabase.auth.getUser();
    updateUI(user);
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    displayMessage(authMessage, 'جاري تسجيل الدخول...', 'info');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        displayMessage(authMessage, `خطأ في تسجيل الدخول: ${error.message}`, 'error');
        return;
    }
    displayMessage(authMessage, 'تم تسجيل الدخول بنجاح!', 'success');
    updateUI(data.user);
});

signOutBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert('خطأ في تسجيل الخروج: ' + error.message);
        return;
    }
    alert('تم تسجيل الخروج بنجاح.');
    updateUI(null);
});

supabase.auth.onAuthStateChange((event, session) => {
    updateUI(session?.user ?? null);
});


categorySelect.addEventListener('change', toggleProductFields);

addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        displayMessage(messageDisplay, '❌ يجب عليك تسجيل الدخول لإضافة/تعديل العناصر.', 'error');
        return;
    }

    messageDisplay.textContent = '...جاري المعالجة';
    messageDisplay.style.color = 'gray';
    
    const id = itemIdToEdit.value;
    const table = itemTableToEdit.value;
    const name = document.getElementById('productName').value;
    const category = categorySelect.value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const image = document.getElementById('productImage').value; 
    const description = document.getElementById('productDesc').value;
    
    const isOffer = isOfferCheckbox.checked;
    const offerPrice = isOffer ? (parseFloat(offerPriceInput.value) || null) : null;

    const stockQty = parseInt(stockQtyInput.value) || 0; 

    let targetTable;
    let insertionData;
    
    const isPcPart = PC_PART_CATEGORIES.includes(category);

    if (category === "") {
        displayMessage(messageDisplay, '❌ الرجاء تحديد فئة المنتج.', 'error');
        return;
    }

    if (isPcPart) {
        targetTable = 'pc_parts';
        insertionData = {
            name,
            type: category, 
            price,
            image_url: image,
            description,
            stock_qty: stockQty,
            is_offer: isOffer,
            offer_price: offerPrice
        };
    } else {
        targetTable = 'products';
        insertionData = { 
            name, category, price, 
            image_url: image,
            description,
            stock_qty: stockQty,
            is_offer: isOffer,
            offer_price: offerPrice
        };
    }

    let error;
    
    if (id && table) {
        const response = await supabase.from(table).update(insertionData).eq('id', id);
        error = response.error;
    } else {
        const response = await supabase.from(targetTable).insert([insertionData]);
        error = response.error;
    }

    if (error) {
        displayMessage(messageDisplay, `خطأ في العملية على جدول ${targetTable}: ` + error.message, 'error');
        return;
    }

    if (id && table) {
        displayMessage(messageDisplay, `✅ تم تعديل المنتج بنجاح في جدول ${table}!`, 'success');
    } else {
        displayMessage(messageDisplay, `✅ تمت إضافة المنتج بنجاح إلى جدول ${targetTable}!`, 'success');
    }
    
    addForm.reset();
    cancelEditMode();
    toggleProductFields();
    loadAllItems();
});

async function editItem(e) {
    const id = e.target.getAttribute('data-id');
    const table = e.target.getAttribute('data-table');
    
    addForm.scrollIntoView({ behavior: 'smooth', block: 'start' }); 

    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
    
    if (error || !data) {
        alert('خطأ في جلب تفاصيل العنصر: ' + error.message);
        return;
    }

    itemIdToEdit.value = data.id;
    itemTableToEdit.value = table;
    document.getElementById('productName').value = data.name;
    document.getElementById('productPrice').value = data.price;
    document.getElementById('productImage').value = data.image_url || ''; 
    document.getElementById('productDesc').value = data.description || '';
    
    const categoryValue = table === 'products' ? data.category : data.type;
    categorySelect.value = categoryValue;
    
    if (data.stock_qty !== undefined) {
        stockQtyInput.value = data.stock_qty;
    } else {
        stockQtyInput.value = 0; 
    }

    isOfferCheckbox.checked = data.is_offer || false;
    offerPriceInput.value = data.offer_price !== null ? data.offer_price : '';


    toggleProductFields();

    formTitle.textContent = `✍️ تعديل العنصر ID: ${data.id} (${categoryValue})`;
    submitBtn.textContent = 'تحديث العنصر';
    submitBtn.style.backgroundColor = '#ffc107'; 
    submitBtn.style.color = '#333';
    cancelEditBtn.style.display = 'inline-block';
    
    displayMessage(messageDisplay, `جاري تعديل العنصر: ${data.name}`, 'info');
}

function cancelEditMode() {
    itemIdToEdit.value = '';
    itemTableToEdit.value = '';
    formTitle.textContent = '➕ إضافة / تعديل عنصر جديد';
    submitBtn.textContent = 'إضافة عنصر';
    submitBtn.style.backgroundColor = '#28a745'; 
    submitBtn.style.color = 'white';
    cancelEditBtn.style.display = 'none';
    addForm.reset();
    
    isOfferCheckbox.checked = false; 
    offerPriceInput.value = '';

    toggleProductFields();
    displayMessage(messageDisplay, '', 'info');
}

cancelEditBtn.addEventListener('click', cancelEditMode);

async function loadAllItems() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; 

    productsList.innerHTML = '<p class="loading-msg">جاري تحميل العناصر وتصنيفها...</p>';

    const [productsResponse, partsResponse] = await Promise.all(
        ALL_TABLES.map(table => supabase.from(table).select('*'))
    );

    productsList.innerHTML = '';

    if (productsResponse.error || partsResponse.error) {
        productsList.innerHTML = '<p class="error-msg">❌ خطأ في تحميل المنتجات أو قطع الكمبيوتر.</p>';
        return;
    }

    const allItems = [
        ...productsResponse.data.map(p => ({ 
            ...p, 
            table: 'products', 
            categoryKey: p.category, 
            displayCategory: CATEGORY_NAMES[p.category] || p.category, 
            stockDisplay: `المخزون: ${p.stock_qty !== undefined ? p.stock_qty : '0'}`,
            is_offer: p.is_offer || false
        }))
        ,
        ...partsResponse.data.map(p => ({ 
            ...p, 
            table: 'pc_parts', 
            categoryKey: p.type, 
            displayCategory: CATEGORY_NAMES[p.type] || p.type, 
            stockDisplay: `المخزون: ${p.stock_qty !== undefined ? p.stock_qty : '0'}`,
            is_offer: p.is_offer || false
        }))
    ];

    if (allItems.length === 0) {
        productsList.innerHTML = '<p>لا توجد منتجات أو قطع كمبيوتر لعرضها.</p>';
        return;
    }

    const groupedItems = allItems.reduce((acc, item) => {
        const category = item.categoryKey;
        if (!acc[category]) {
            acc[category] = {
                name: item.displayCategory,
                items: []
            };
        }
        acc[category].items.push(item);
        return acc;
    }, {});

    for (const categoryKey in groupedItems) {
        const categoryData = groupedItems[categoryKey];
        const section = document.createElement('div');
        section.classList.add('category-section');

        section.innerHTML = `
            <h3><i class="fas fa-tag"></i> ${categoryData.name} <span class="category-count">(${categoryData.items.length} عنصر)</span></h3>
            <div class="category-grid">
            </div>
        `;
        
        const categoryGrid = section.querySelector('.category-grid');

        categoryData.items.forEach((item) => {
            const div = document.createElement('div');
            div.classList.add('admin-product-card');

            const isLowStock = item.stock_qty <= 5 && item.stock_qty > 0;
            const isOutOfStock = item.stock_qty === 0;
            const isCurrentlyOffer = item.is_offer; 
            
            div.innerHTML = `
                <div class="product-header">
                    <img src="${item.image_url || 'placeholder.png'}" alt="${item.name}" />
                    <span class="product-id">ID: ${item.id}</span>
                    ${isCurrentlyOffer ? '<span class="offer-tag">🔥 عرض</span>' : ''}
                    </div>
                <div class="product-info">
                    <h4>${item.name}</h4>
                    <p class="product-desc-short">${item.description ? item.description.substring(0, 50) + '...' : 'لا يوجد وصف متاح.'}</p>
                    <div class="price-stock-row">
                        <strong class="product-price">
                            ${isCurrentlyOffer && item.offer_price && item.offer_price < item.price 
                                ? `<span style="text-decoration: line-through; color: #999; font-size: 0.8em;">${item.price.toFixed(2)} DZD</span> <span style="color: #dc3545;">${item.offer_price.toFixed(2)} DZD</span>`
                                : `${item.price ? item.price.toFixed(2) : '0.00'} DZD`
                            }
                        </strong>
                        <p class="stock-info ${isOutOfStock ? 'out-of-stock' : (isLowStock ? 'low-stock' : '')}">
                            ${item.stockDisplay}
                        </p>
                    </div>
                </div>
                <div class="product-actions-footer">
                    <button data-id="${item.id}" data-table="${item.table}" class="editBtn"><i class="fas fa-edit"></i> تعديل</button>
                    <button data-id="${item.id}" data-table="${item.table}" class="deleteBtn"><i class="fas fa-trash"></i> حذف</button>
                </div>
            `;

            categoryGrid.appendChild(div);
        });
        
        productsList.appendChild(section);
    }
    
    document.querySelectorAll('.deleteBtn').forEach((btn) => {
        btn.addEventListener('click', deleteItem);
    });
    
    document.querySelectorAll('.editBtn').forEach((btn) => {
        btn.addEventListener('click', editItem);
    });
}

async function deleteItem(e) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        alert('❌ يجب عليك تسجيل الدخول لحذف العناصر.');
        return;
    }

    const id = e.target.getAttribute('data-id');
    const table = e.target.getAttribute('data-table');

    if (!confirm(`هل أنت متأكد من حذف العنصر ID: ${id} من جدول ${table}؟`)) {
        return;
    }
    
    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) {
        alert(`خطأ في حذف العنصر من جدول ${table}: ${error.message}`);
        return;
    }

    alert('تم الحذف بنجاح!');
    loadAllItems();
}

async function loadOrders() {
    ordersList.innerHTML = '<p>جاري تحميل الطلبات...</p>';
    
    const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('id', { ascending: false }); 

    if (error) {
        ordersList.innerHTML = `<p>❌ خطأ في تحميل الطلبات: ${error.message}</p>`;
        return;
    }

    if (orders.length === 0) {
        ordersList.innerHTML = '<p>لا توجد طلبات لعرضها.</p>';
        pendingOrdersCount.style.display = 'none';
        return;
    }
    
    ordersList.innerHTML = '';
    
    let pendingCount = 0;

    orders.forEach(order => {
        if (order.status === 'pending') {
            pendingCount++;
        }
        
        const card = document.createElement('div');
        card.classList.add('order-card');
        
        const statusClass = `status-${order.status}`;
        const statusText = ORDER_STATUSES[order.status] || order.status;
        
        const itemsList = order.order_items.map(item => `
            <li>${item.name} (x${item.qty}) - ${item.price.toFixed(2)} DZD</li>
        `).join('');

        card.innerHTML = `
            <div class="order-details">
                <h4>طلب #${order.id} | ${order.full_name} (${order.phone_number})</h4>
                <p><strong>الولاية:</strong> ${order.wilaya}</p>
                <p><strong>العناصر:</strong></p>
                <ul>${itemsList}</ul>
            </div>
            <div class="order-total">${order.total_price.toFixed(2)} DZD</div>
            <div class="order-status ${statusClass}">${statusText}</div>
            <div class="order-actions">
                <select class="status-select" data-id="${order.id}">
                    ${Object.entries(ORDER_STATUSES).map(([key, value]) => `
                        <option value="${key}" ${key === order.status ? 'selected' : ''}>${value}</option>
                    `).join('')}
                </select>
            </div>
        `;
        
        ordersList.appendChild(card);
    });
    
    pendingOrdersCount.textContent = pendingCount > 0 ? pendingCount : '';
    pendingOrdersCount.style.display = pendingCount > 0 ? 'inline' : 'none';

    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', updateOrderStatus);
    });
}

async function updateOrderStatus(e) {
    const orderId = e.target.getAttribute('data-id');
    const newStatus = e.target.value;
    
    if (!confirm(`هل أنت متأكد من تغيير حالة الطلب #${orderId} إلى: ${ORDER_STATUSES[newStatus]}؟`)) {
        e.target.value = e.target.options[e.target.selectedIndex].defaultSelected ? e.target.options[e.target.selectedIndex].value : e.target.value;
        return;
    }
    
    const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

    if (error) {
        alert(`❌ خطأ في تحديث حالة الطلب: ${error.message}`);
        loadOrders(); 
        return;
    }
    
    alert(`✅ تم تحديث حالة الطلب #${orderId} إلى ${ORDER_STATUSES[newStatus]} بنجاح.`);
    loadOrders();
}

document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const targetTab = e.target.getAttribute('data-tab');
        
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
        document.getElementById(targetTab).style.display = 'block';

        if (targetTab === 'ordersTab') {
            loadOrders(); 
        } else if (targetTab === 'productsTab') {
            loadAllItems(); 
        }
    });
});


document.addEventListener('DOMContentLoaded', () => {
    checkUserStatus();
    toggleProductFields();
});