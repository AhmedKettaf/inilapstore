import { supabase } from './supabase.js';

const productsGrid = document.getElementById('productsGrid');
const pcPartsGrid = document.getElementById('pcPartsGrid');
const productFilters = document.getElementById('productFilters');
const partsFilters = document.getElementById('partsFilters');
const statusMessage = document.getElementById('statusMessage');
const noProductsFound = document.getElementById('noProductsFound');
const noPartsFound = document.getElementById('noPartsFound');

const detailsModal = document.getElementById('detailsModal');
const modalBody = document.getElementById('modalBody');
const closeDetailsBtn = document.querySelector('#detailsModal .close-button'); 

const cartModal = document.getElementById('cartModal');
const openCartModalBtn = document.getElementById('openCartModalBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartCount = document.getElementById('cartCount');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartTotal = document.getElementById('cartTotal');
const goToCheckoutBtn = document.getElementById('goToCheckoutBtn'); 

let allProducts = [];
let allPCParts = [];

let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];




/**
 * @description Updates the cart counter display and local storage.
 */
function updateCart() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = count;
    localStorage.setItem('shoppingCart', JSON.stringify(cart));
    renderCartModal(); 
}

/**
 * @description Finds an item by its ID and table.
 * @param {string} id 
 * @param {string} table 
 * @returns {object|undefined}
 */
function findItem(id, table) {
    const data = table === 'products' ? allProducts : allPCParts;
    return data.find(item => item.id.toString() === id.toString());
}

/**
 * @description Adds an item to the cart or increments its quantity.
 * @param {string} id 
 * @param {string} table 
 */
function addToCart(id, table) {
    const existingItem = cart.find(item => item.id.toString() === id.toString() && item.table === table);
    const itemData = findItem(id, table);

    if (!itemData) return;

    const maxQty = itemData.stock_qty || Infinity; 

    if (existingItem) {
        if (existingItem.quantity < maxQty) {
            existingItem.quantity += 1;
            alert(`تم زيادة كمية ${itemData.name}.`);
        } else {
            alert(`الكمية القصوى المتوفرة من ${itemData.name} هي ${maxQty}.`);
            return;
        }
    } else {
        if (maxQty > 0) {
            const name = itemData.name;
            const price = itemData.price;
            const image = itemData.image_url;
            cart.push({ id, table, quantity: 1, name, price, image, maxQty });
            alert(`تم إضافة ${name} إلى السلة.`);
        } else {
            alert(`${itemData.name} غير متوفر في المخزون.`);
            return;
        }
    }
    updateCart();
}

/**
 * @description Renders the cart contents inside the modal.
 */
function renderCartModal() {
    cartItemsContainer.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align: center;">السلة فارغة حالياً.</p>';
        cartTotal.textContent = '0.00 DZD';
        goToCheckoutBtn.disabled = true;
        return;
    }

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const cartItemDiv = document.createElement('div');
        cartItemDiv.classList.add('cart-item');
        cartItemDiv.innerHTML = `
            <img src="${item.image || 'placeholder.png'}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <p>Price: ${item.price.toFixed(2)} DZD</p>
                <div class="cart-quantity-controls">
                    <button class="qty-control-btn" data-action="decrease" data-index="${index}">-</button>
                    <input type="number" value="${item.quantity}" min="1" max="${item.maxQty}" data-index="${index}" class="cart-qty-input">
                    <button class="qty-control-btn" data-action="increase" data-index="${index}">+</button>
                </div>
                <strong>Subtotal: ${itemTotal.toFixed(2)} DZD</strong>
            </div>
            <button class="remove-from-cart-btn" data-index="${index}">❌</button>
        `;
        cartItemsContainer.appendChild(cartItemDiv);
    });

    cartTotal.textContent = total.toFixed(2) + ' DZD';

    goToCheckoutBtn.disabled = false;
}

/**
 * @description Handles quantity changes and removal from cart.
 * @param {Event} e 
 */
function handleCartControls(e) {
    const target = e.target;
    if (target.classList.contains('remove-from-cart-btn')) {
        const index = target.getAttribute('data-index');
        cart.splice(index, 1);
        updateCart();
    } else if (target.classList.contains('qty-control-btn')) {
        const index = target.getAttribute('data-index');
        const action = target.getAttribute('data-action');
        const item = cart[index];
        
        if (action === 'increase' && item.quantity < item.maxQty) {
            item.quantity++;
        } else if (action === 'decrease' && item.quantity > 1) {
            item.quantity--;
        }
        updateCart();
    } else if (target.classList.contains('cart-qty-input')) {

        const index = target.getAttribute('data-index');
        const item = cart[index];
        let newQty = parseInt(target.value) || 1;
        
        if (newQty < 1) newQty = 1;
        if (newQty > item.maxQty) {
            newQty = item.maxQty;
            alert(`الحد الأقصى للكمية هو ${item.maxQty}.`);
        }
        item.quantity = newQty;
        target.value = newQty; 
        updateCart();
    }
}



/**
 * @description Creates the HTML structure for a product or PC part card.
 * @param {object} item - بيانات المنتج
 * @param {string} table  ('products' أو 'pc_parts')
 */
function createCard(item, table) {
    const isPcPart = table === 'pc_parts';
    
    const itemStockQty = item.stock_qty !== undefined ? item.stock_qty : 0;
    const inStock = itemStockQty > 0;
    
    let stockStatus, actionButton, stockClass;
    let actionText = isPcPart ? 'Add to Build' : 'Add to Cart';

    if (inStock) {
        stockStatus = `<span class="stock in-stock">In Stock (${itemStockQty})</span>`;
        stockClass = '';
        actionButton = `<button class="add-to-cart-btn" data-id="${item.id}" data-table="${table}">${actionText}</button>`;
    } else {
    
        stockStatus = `<span class="stock out-of-stock">Out of Stock</span>`;
        stockClass = 'out-of-stock-card'; 
        actionButton = `<button class="add-to-cart-btn" data-id="${item.id}" data-table="${table}" disabled>Out of Stock</button>`;
    }

    return `
        <div class="product-card ${stockClass}">
            <img src="${item.image_url || 'placeholder.png'}" alt="${item.name}" />
            <h3>${item.name}</h3>
            <p class="category">${isPcPart ? item.type.toUpperCase() : item.category.toUpperCase()}</p>
            <p class="description">${item.description ? item.description.substring(0, 100) : 'No description provided.'}...</p>
            <div class="card-footer">
                <strong>${item.price.toFixed(2)} DZD</strong>
                ${stockStatus}
                <div class="card-actions">
                    <button class="details-btn" data-id="${item.id}" data-table="${table}">View Details</button>
                    ${actionButton}
                </div>
            </div>
        </div>
    `;
}

function displayProducts(filterCategory) {
    productsGrid.innerHTML = '';
    const filtered = (filterCategory === 'all') 
        ? allProducts 
        : allProducts.filter(item => item.category === filterCategory);

    if (filtered.length === 0) {
        productsGrid.innerHTML = '';
        noProductsFound.style.display = 'block';
    } else {
        filtered.forEach(item => {
            productsGrid.innerHTML += createCard(item, 'products');
        });
        noProductsFound.style.display = 'none';
    }
}

function displayPCParts(filterType) {
    pcPartsGrid.innerHTML = '';
    const filtered = (filterType === 'all') 
        ? allPCParts
        : allPCParts.filter(item => item.type === filterType);

    if (filtered.length === 0) {
        pcPartsGrid.innerHTML = '';
        noPartsFound.style.display = 'block';
    } else {
        filtered.forEach(item => {
            pcPartsGrid.innerHTML += createCard(item, 'pc_parts');
        });
        noPartsFound.style.display = 'none';
    }
}


async function loadAndDisplayItems() {
    statusMessage.textContent = '... جلب بيانات المتجر';
    
    try {
        const [productsResponse, partsResponse] = await Promise.all([
            supabase.from('products').select('*').order('category', { ascending: true }),
            supabase.from('pc_parts').select('*').order('type', { ascending: true })
        ]);

        if (productsResponse.error || partsResponse.error) {
            throw new Error(productsResponse.error?.message || partsResponse.error?.message);
        }

        allProducts = productsResponse.data || [];
        allPCParts = partsResponse.data || [];

        displayProducts('all');
        displayPCParts('all');

        statusMessage.textContent = '✅ تم تحميل المتجر بنجاح.';
        statusMessage.style.color = 'green';
        setTimeout(() => { statusMessage.style.display = 'none'; }, 3000);

    } catch (error) {
        statusMessage.textContent = `❌ فشل التحميل: ${error.message}`;
        statusMessage.style.color = 'red';
        console.error('Data Loading Error:', error);
    }
}



function openCartModal() {
    renderCartModal();
    cartModal.style.display = 'block';
}

function closeCartModal() {
    cartModal.style.display = 'none';
}


// --- معالجات الأحداث (Event Listeners) ---

productFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (btn) {
        document.querySelectorAll('#productFilters .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const category = btn.getAttribute('data-category');
        displayProducts(category);
    }
});


partsFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (btn) {
        document.querySelectorAll('#partsFilters .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const type = btn.getAttribute('data-type');
        displayPCParts(type);
    }
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart-btn')) {
        const id = e.target.getAttribute('data-id');
        const table = e.target.getAttribute('data-table');
        addToCart(id, table);
    } 
    else if (e.target.classList.contains('details-btn')) {
        const id = e.target.getAttribute('data-id');
        const table = e.target.getAttribute('data-table');
        window.location.href = `product.html?id=${id}&table=${table}`;
    } 
    else if (e.target.closest('.cart-item')) {
        handleCartControls(e);
    }
});


closeCartBtn.addEventListener('click', closeCartModal);

openCartModalBtn.addEventListener('click', openCartModal);

window.addEventListener('click', (e) => {
    if (e.target === cartModal) {
        closeCartModal();
    }
});


goToCheckoutBtn.addEventListener('click', () => {
    if (cart.length > 0) {
        closeCartModal();
        window.location.href = 'checkout.html';
    } else {
        alert('الرجاء إضافة منتجات إلى السلة أولاً.');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayItems();
    updateCart(); 
});