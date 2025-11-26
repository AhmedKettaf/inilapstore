import { supabase } from '../supabase.js';

const adminContent = document.getElementById('adminContent');
const authSection = document.getElementById('authSection');
const adminAuthStatus = document.getElementById('admin-auth-status');
const signOutBtn = document.getElementById('signOutBtn');
const loginForm = document.getElementById('loginForm');
const authMessage = document.getElementById('authMessage');

const addForm = document.getElementById('addProductForm');
const productsList = document.getElementById('productsList');
const messageDisplay = document.getElementById('message');

const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const categorySelect = document.getElementById('productCategory');
const stockQtyContainer = document.getElementById('stockQtyContainer');

const itemIdToEdit = document.getElementById('itemIdToEdit');
const itemTableToEdit = document.getElementById('itemTableToEdit');

const PC_PART_CATEGORIES = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'case', 'cooling'];

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
    const selectedCategory = categorySelect.value;
    
    const pcPartTypeContainer = document.getElementById('pcPartTypeContainer');
    if (pcPartTypeContainer) {
         pcPartTypeContainer.style.display = 'none';
    }

    const isPcPart = PC_PART_CATEGORIES.includes(selectedCategory);

    if (isPcPart) {
        stockQtyContainer.style.display = 'none';
        document.getElementById('stockQty').required = false;
        document.getElementById('stockQty').value = 0; 
    } else {
        stockQtyContainer.style.display = 'block';
        document.getElementById('stockQty').required = true;
    }
}

function updateUI(user) {
    if (user) {
        authSection.style.display = 'none';
        adminContent.style.display = 'block';
        signOutBtn.style.display = 'block';
        adminAuthStatus.textContent = `Logged in as: ${user.email}`;
        loadAllItems(); 
    } else {
        authSection.style.display = 'block';
        adminContent.style.display = 'none';
        signOutBtn.style.display = 'none';
        adminAuthStatus.textContent = 'Not logged in';
        productsList.innerHTML = '';
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

    displayMessage(authMessage, 'Logging in...', 'info');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        displayMessage(authMessage, `Login Error: ${error.message}`, 'error');
        return;
    }

    displayMessage(authMessage, 'Login successful!', 'success');
    updateUI(data.user);
});

signOutBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert('Error signing out: ' + error.message);
        return;
    }
    alert('You have been signed out.');
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
        displayMessage(messageDisplay, '❌ You must be logged in to add/edit items.', 'error');
        return;
    }

    messageDisplay.textContent = '...Processing Item';
    messageDisplay.style.color = 'gray';
    
    const id = itemIdToEdit.value;
    const table = itemTableToEdit.value;
    const name = document.getElementById('productName').value;
    const category = categorySelect.value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const image = document.getElementById('productImage').value; 
    const description = document.getElementById('productDesc').value;
    const stockQty = parseInt(document.getElementById('stockQty').value) || 0; 

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
            description
        };
    } else {
        targetTable = 'products';
        insertionData = { 
            name, category, price, 
            image_url: image,
            description,
            stock_qty: stockQty 
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
        displayMessage(messageDisplay, `✅ تم تعديل المنتج بنجاح في جدول ${targetTable}!`, 'success');
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
    
    productsList.scrollIntoView({ behavior: 'smooth', block: 'start' });


    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
    
    if (error || !data) {
        alert('Error fetching item details: ' + error.message);
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
        document.getElementById('stockQty').value = data.stock_qty;
    }
    toggleProductFields();


    formTitle.textContent = `✍️ Edit Item ID: ${data.id} (${categoryValue})`;
    submitBtn.textContent = 'Update Item';
    submitBtn.style.backgroundColor = '#ffc107'; 
    submitBtn.style.color = '#333';
    cancelEditBtn.style.display = 'inline-block';
    
    displayMessage(messageDisplay, `Editing item: ${data.name}`, 'info');
}


function cancelEditMode() {
    itemIdToEdit.value = '';
    itemTableToEdit.value = '';
    formTitle.textContent = '➕ Add New Item (Product / PC Part)';
    submitBtn.textContent = 'Add Item';
    submitBtn.style.backgroundColor = '#28a745'; 
    submitBtn.style.color = 'white';
    cancelEditBtn.style.display = 'none';
    addForm.reset();
    displayMessage(messageDisplay, '', 'info');
}

cancelEditBtn.addEventListener('click', cancelEditMode);



async function loadAllItems() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; 

    productsList.innerHTML = '<p>Loading items...</p>';

    const [productsResponse, partsResponse] = await Promise.all([
        supabase.from('products').select('*'),
        supabase.from('pc_parts').select('*')
    ]);

    productsList.innerHTML = '';

    if (productsResponse.error || partsResponse.error) {
        productsList.innerHTML = '<p>❌ خطأ في تحميل المنتجات أو قطع الكمبيوتر.</p>';
        return;
    }

    const allItems = [
        ...productsResponse.data.map(p => ({ 
            ...p, 
            table: 'products', 
            displayCategory: p.category, 
            stockDisplay: `Stock: ${p.stock_qty || 0}`
        })),
        ...partsResponse.data.map(p => ({ 
            ...p, 
            table: 'pc_parts', 
            displayCategory: p.type, 
            stockDisplay: 'Stock: N/A' 
        }))
    ];

    if (allItems.length === 0) {
        productsList.innerHTML = '<p>لا توجد منتجات أو قطع كمبيوتر لعرضها.</p>';
        return;
    }

    allItems.forEach((item) => {
        const div = document.createElement('div');
        div.classList.add('admin-product');

        div.innerHTML = `
            <img src="${item.image_url || 'placeholder.png'}" alt="${item.name}" />
            <h4>${item.name} (${item.displayCategory})</h4>
            <p>${item.description || 'No description provided.'}</p>
            <strong>$${item.price ? item.price.toFixed(2) : '0.00'}</strong>
            <p class="stock-info">${item.stockDisplay}</p>
            <button data-id="${item.id}" data-table="${item.table}" class="deleteBtn">حذف</button>
            <button data-id="${item.id}" data-table="${item.table}" class="editBtn">تعديل</button>
        `;

        productsList.appendChild(div);
    });


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
        alert('❌ You must be logged in to delete items.');
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


document.addEventListener('DOMContentLoaded', () => {
    checkUserStatus();
    toggleProductFields();
});