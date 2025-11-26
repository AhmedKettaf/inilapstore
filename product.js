import { supabase } from './supabase.js';

const productDetailsContainer = document.getElementById('productDetails');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');
const pageTitle = document.getElementById('pageTitle');

const cartModal = document.getElementById('cartModal');
const openCartModalBtn = document.getElementById('openCartModalBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartCount = document.getElementById('cartCount');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartTotal = document.getElementById('cartTotal');
const goToCheckoutBtn = document.getElementById('goToCheckoutBtn'); 

let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
let currentItem = null; 


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
 * @description Adds the currently viewed item to the cart or increments its quantity.
 */
function addToCart(item) {
    if (!item || item.stock_qty <= 0) return;

    const id = item.id.toString();
    const table = item.table;
    const maxQty = item.stock_qty || Infinity; 

    const existingItem = cart.find(i => i.id.toString() === id && i.table === table);

    if (existingItem) {
        if (existingItem.quantity < maxQty) {
            existingItem.quantity += 1;
            alert(`تم زيادة كمية ${item.name}.`);
        } else {
            alert(`الكمية القصوى المتوفرة من ${item.name} هي ${maxQty}.`);
            return;
        }
    } else {
        const name = item.name;
        const price = item.price;
        const image = item.image_url;
        cart.push({ id, table, quantity: 1, name, price, image, maxQty });
        alert(`تم إضافة ${name} إلى السلة.`);
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

function openCartModal() {
    renderCartModal();
    cartModal.style.display = 'block';
}

function closeCartModal() {
    cartModal.style.display = 'none';
}



function getQueryParameters() {
    const params = new URLSearchParams(window.location.search);
    return {
        id: params.get('id'),
        table: params.get('table')
    };
}


async function loadItemDetails() {
    const { id, table } = getQueryParameters();

    loadingIndicator.style.display = 'block';
    errorMessage.style.display = 'none';
    productDetailsContainer.innerHTML = '';

    if (!id || !table || (table !== 'products' && table !== 'pc_parts')) {
        loadingIndicator.style.display = 'none';
        errorMessage.style.display = 'block';
        errorMessage.textContent = '❌ Invalid item ID or table specified. Please check the URL.';
        return;
    }

    try {
        const { data: item, error } = await supabase
            .from(table)
            .select('*')
            .eq('id', id)
            .single();

        loadingIndicator.style.display = 'none';

        if (error || !item) {
            errorMessage.style.display = 'block';
            errorMessage.textContent = `🚨 Error loading details: ${error?.message || 'Item not found'}`;
            console.error('Details Fetch Error:', error);
            return;
        }

        currentItem = { ...item, table: table }; 
        displayItemDetails(currentItem, table);
    } catch (e) {
        loadingIndicator.style.display = 'none';
        errorMessage.style.display = 'block';
        errorMessage.textContent = '❌ An unexpected error occurred while fetching data.';
        console.error('General Fetch Error:', e);
    }
}

function displayItemDetails(item, table) {
    pageTitle.textContent = item.name + ' - Tech Store';

    const inStock = item.stock_qty > 0;
    const stockStatusClass = inStock ? 'in-stock' : 'out-of-stock';
    const stockMessage = inStock ? `In Stock (${item.stock_qty} units)` : 'Out of Stock';

    let actionText = (table === 'pc_parts') ? 'Add to Build' : 'Add to Cart';

    let detailsHTML = `
        <div class="product-detail-card">
            <div class="image-column">
                <img src="${item.image_url || 'https://via.placeholder.com/400?text=Image+Not+Found'}" alt="${item.name}" class="product-image"/>
                <p class="price-tag">${item.price.toFixed(2)} DZD</p>
                
                <p class="stock-status-display ${stockStatusClass}">${stockMessage}</p>
                
                <button id="addToCartBtn" class="buy-button" ${!inStock ? 'disabled' : ''}>
                    🛒 ${inStock ? actionText : 'Out of Stock'}
                </button>
            </div>

            <div class="info-column">
                <h1>${item.name}</h1>
                
                <div class="description-box">
                    <p class="full-description">
                        ${item.description}
                    </p>
                </div>
                
                <div class="specs-box">
                    <h3>✨ Key Specifications</h3>
    `;

    if (table === 'products') {
        detailsHTML += `
            <p><strong>Category:</strong> <span>${item.category?.toUpperCase() || 'N/A'}</span></p>
        `;
    } else if (table === 'pc_parts') {
        detailsHTML += `
            <p><strong>Part Type:</strong> <span>${item.type?.toUpperCase() || 'N/A'}</span></p>
            <p><strong>Manufacturer:</strong> <span>${item.manufacturer || 'Unknown'}</span></p>
            <p><strong>Compatibility:</strong> <span>Compatible with most modern builds (Check details).</span></p>
        `;
    }

    detailsHTML += `
                </div> 
            </div> 
        </div> 
    `;

    productDetailsContainer.innerHTML = detailsHTML;
    
    const cartButton = document.getElementById('addToCartBtn');
    if (cartButton) {
        cartButton.addEventListener('click', () => {
            addToCart(currentItem);
        });
    }
}


openCartModalBtn.addEventListener('click', openCartModal);

closeCartBtn.addEventListener('click', closeCartModal);

goToCheckoutBtn.addEventListener('click', () => {
    if (cart.length > 0) {
        closeCartModal(); 
        window.location.href = 'checkout.html'; 
    } else {
        alert('الرجاء إضافة منتجات إلى السلة أولاً.');
    }
});

cartModal.addEventListener('click', (e) => {
    if (e.target.closest('.cart-item') || e.target.classList.contains('remove-from-cart-btn')) {
         handleCartControls(e);
    }
});

window.addEventListener('click', (e) => {
    if (e.target === cartModal) {
        closeCartModal();
    }
});


document.addEventListener('DOMContentLoaded', () => {
    loadItemDetails();
    updateCart();
});