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



function updateCart() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = count;
    localStorage.setItem('shoppingCart', JSON.stringify(cart));
    renderCartModal(); 
}

function addToCart(item) {
    if (!item || item.stock_qty <= 0) {
        alert(`The product ${item.name} is currently out of stock.`);
        return;
    }

    const id = item.id.toString();
    const table = item.table;
    const maxQty = item.stock_qty || Infinity; 
    const finalPrice = item.price; 

    const existingItem = cart.find(i => i.id.toString() === id && i.table === table);

    if (existingItem) {
        if (existingItem.quantity < maxQty) {
            existingItem.quantity += 1;
            alert(`Quantity of ${item.name} increased to ${existingItem.quantity}.`);
        } else {
            alert(`Maximum available quantity for ${item.name} is ${maxQty}.`);
            return;
        }
    } else {
        const name = item.name;
        const image = item.image_url;
        cart.push({ id, table, quantity: 1, name, price: finalPrice, image, maxQty });
        alert(`The product ${name} has been added to the cart.`);
    }
    updateCart();
}

/**
 * Renders the cart modal content using Dark Gaming theme classes.
 */
function renderCartModal() {
    cartItemsContainer.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="text-center text-secondary-text p-5">Your cart is currently empty. Add items to start shopping!</p>';
        cartTotal.textContent = '0.00 DZD';
        goToCheckoutBtn.disabled = true;
        return;
    }

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const cartItemDiv = document.createElement('div');
        // Applying Dark Gaming classes
        cartItemDiv.classList.add('cart-item', 'flex', 'items-center', 'border-b', 'border-glass-border', 'py-3', 'gap-3', 'text-white');
        cartItemDiv.innerHTML = `
            <img src="${item.image || 'placeholder.png'}" alt="${item.name}" class="w-16 h-16 object-contain rounded-md border border-glass-border">
            <div class="cart-item-details flex-grow">
                <h4 class="m-0 text-base font-semibold text-white">${item.name}</h4>
                <p class="m-0 text-sm text-secondary-text">Unit Price: ${item.price.toFixed(2)} DZD</p> 
                <div class="cart-quantity-controls flex items-center my-1">
                    <button class="qty-control-btn bg-dark-bg border border-glass-border text-white px-2 py-1 cursor-pointer text-base transition duration-200 hover:bg-light-bg rounded-l" data-action="decrease" data-index="${index}" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                    <input type="number" value="${item.quantity}" min="1" max="${item.maxQty}" data-index="${index}" class="cart-qty-input w-10 text-center bg-dark-bg text-white border border-glass-border mx-1 p-0.5 rounded-sm">
                    <button class="qty-control-btn bg-dark-bg border border-glass-border text-white px-2 py-1 cursor-pointer text-base transition duration-200 hover:bg-light-bg rounded-r" data-action="increase" data-index="${index}" ${item.quantity >= item.maxQty ? 'disabled' : ''}>+</button>
                </div>
                <strong class="text-sm text-secondary-accent">Subtotal: ${itemTotal.toFixed(2)} DZD</strong> 
            </div>
            <button class="remove-from-cart-btn bg-transparent border-none cursor-pointer text-xl text-price-color p-1 hover:text-primary transition duration-300" data-index="${index}" title="Remove Item">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;
        cartItemsContainer.appendChild(cartItemDiv);
    });

    cartTotal.textContent = total.toFixed(2) + ' DZD';
    goToCheckoutBtn.disabled = false;
}

function handleCartControls(e) {
    const target = e.target.closest('button') || e.target.closest('input');
    if (!target) return;
    
    const isRemoveBtn = target.classList.contains('remove-from-cart-btn') || target.closest('.fa-trash-can');

    if (isRemoveBtn) {
        const btn = target.closest('.remove-from-cart-btn');
        const index = btn.getAttribute('data-index');
        if (confirm(`Are you sure you want to remove ${cart[index].name} from the cart?`)) {
            cart.splice(index, 1);
            updateCart();
        }
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
            alert(`The maximum quantity is ${item.maxQty}.`);
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


// --- DETAIL FETCHING & RENDERING ---

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
    errorMessage.classList.add('hidden');
    productDetailsContainer.innerHTML = '';

    if (!id || !table || (table !== 'products' && table !== 'pc_parts')) {
        loadingIndicator.style.display = 'none';
        errorMessage.classList.remove('hidden');
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
            errorMessage.classList.remove('hidden');
            errorMessage.textContent = `🚨 Failed to load details: ${error?.message || 'Item not found'}`;
            console.error('Details Fetch Error:', error);
            return;
        }

        currentItem = { ...item, table: table }; 
        displayItemDetails(currentItem, table);
    } catch (e) {
        loadingIndicator.style.display = 'none';
        errorMessage.classList.remove('hidden');
        errorMessage.textContent = '❌ An unexpected error occurred while fetching data.';
        console.error('General Fetch Error:', e);
    }
}


function displayItemDetails(item, table) {
    pageTitle.textContent = item.name + ' - INI LAP';
    productDetailsContainer.innerHTML = ''; // Clear previous content

    const priceNormal = item.price;
    const isOfferValid = item.is_offer && item.offer_price > 0 && item.offer_price < priceNormal;
    const priceToUse = isOfferValid ? item.offer_price : priceNormal;

    let priceHTML;
    let offerBadgeHTML = '';

    // Price rendering
    if (isOfferValid) {
        priceHTML = `
            <s class="text-lg text-secondary-text block mb-1">${priceNormal.toFixed(2)} DZD</s>
            <p class="text-4xl text-price-color font-extrabold animate-pulse">${priceToUse.toFixed(2)} DZD</p>
        `;
        offerBadgeHTML = `<span class="absolute top-0 right-0 bg-primary text-secondary-accent px-4 py-2 rounded-bl-xl text-sm font-bold shadow-2xl z-10 border-l border-b border-secondary-accent/50">🔥 SPECIAL DEAL!</span>`;
    } else {
        priceHTML = `<p class="text-4xl text-price-color font-extrabold">${priceToUse.toFixed(2)} DZD</p>`;
    }

    // Stock Status
    const inStock = item.stock_qty > 0;
    const stockStatusClass = inStock ? 'bg-success-color/30 text-success-color border-success-color/50' : 'bg-price-color/30 text-price-color border-price-color/50';
    const stockMessage = inStock ? `In Stock (${item.stock_qty} units)` : 'Out of Stock';

    // Button Text and Action
    // For PC Parts, the action is usually adding to a configuration builder, hence the 'gear' icon.
    const actionText = (table === 'pc_parts') ? 'Add to Configuration' : 'Add to Cart';
    const buttonText = inStock ? actionText : 'Out of Stock';
    const buttonIcon = (table === 'pc_parts') ? 'fa-solid fa-gear' : 'fa-solid fa-cart-shopping';
    const buttonClasses = inStock ? 'bg-primary hover:bg-red-700 shadow-lg shadow-primary/40 border-2 border-secondary-accent' : 'bg-secondary-text/50 cursor-not-allowed border-2 border-secondary-text/30';


    let detailsHTML = `
        <div class="product-detail-card bg-glass-bg backdrop-blur-md border border-glass-border rounded-2xl shadow-2xl p-8 flex flex-col lg:flex-row gap-8 relative">
            ${offerBadgeHTML}
            
            <div class="image-column w-full lg:w-1/3 flex flex-col items-center p-6 bg-light-bg/70 rounded-xl shadow-inner border border-glass-border">
                <img src="${item.image_url || 'https://via.placeholder.com/400?text=Image+Not+Found'}" alt="${item.name}" class="product-image max-w-full h-64 object-contain mb-6 rounded-lg"/>
                
                <div class="price-container text-center mb-6">
                    ${priceHTML}
                </div>
                
                <p class="stock-status-display text-center mb-6 px-4 py-2 rounded-full font-semibold text-sm uppercase border ${stockStatusClass}">
                    Status: <span class="stock">${stockMessage}</span>
                </p>
                
                <button id="addToCartBtn" class="buy-button w-full p-4 text-lg font-bold text-white rounded-lg transition duration-300 ${buttonClasses}" ${!inStock ? 'disabled' : ''}>
                    <i class="${buttonIcon} mr-2"></i> ${buttonText}
                </button>
            </div>

            <div class="info-column w-full lg:w-2/3">
                <h1 class="text-4xl font-extrabold text-secondary-accent mb-4 uppercase">${item.name}</h1>
                <p class="text-primary text-lg font-medium mb-8">${table === 'products' ? item.category?.toUpperCase() : item.type?.toUpperCase()}</p>
                
                <div class="description-box mb-8 p-5 bg-light-bg/70 rounded-xl border border-glass-border">
                    <h3 class="text-2xl font-bold text-primary mb-3 flex items-center gap-2"><i class="fa-solid fa-file-lines"></i> Product Description</h3>
                    <p class="full-description text-secondary-text leading-relaxed">
                        ${item.description || 'No detailed description is available for this item.'}
                    </p>
                </div>
                
                <div class="specs-box p-5 bg-light-bg/70 rounded-xl border border-glass-border">
                    <h3 class="text-2xl font-bold text-primary mb-4 flex items-center gap-2"><i class="fa-solid fa-list-check"></i> Key Specifications</h3>
                    <div class="space-y-2 text-lg">
                        ${table === 'products' ? 
                            `
                            <p class="text-white"><strong>Category:</strong> <span class="text-secondary-accent">${item.category?.toUpperCase() || 'N/A'}</span></p>
                            <p class="text-white"><strong>Product ID:</strong> <span class="text-secondary-accent">#${item.id}</span></p>
                            `
                            : 
                            `
                            <p class="text-white"><strong>Part Type:</strong> <span class="text-secondary-accent">${item.type?.toUpperCase() || 'N/A'}</span></p>
                            <p class="text-white"><strong>Manufacturer:</strong> <span class="text-secondary-accent">${item.manufacturer || 'Unknown'}</span></p>
                            <p class="text-white"><strong>SKU:</strong> <span class="text-secondary-accent">#${item.id}</span></p>
                            `
                        }
                    </div>
                </div> 
            </div> 
        </div> 
    `;

    productDetailsContainer.innerHTML = detailsHTML;
    

    const cartButton = document.getElementById('addToCartBtn');
    if (cartButton) {
        cartButton.addEventListener('click', () => {
            const itemWithFinalPrice = {
                ...currentItem, 
                price: priceToUse 
            };
            addToCart(itemWithFinalPrice);
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
        alert('Please add products to your cart first.');
    }
});

cartItemsContainer.addEventListener('click', handleCartControls);


window.addEventListener('click', (e) => {
    if (e.target === cartModal) {
        closeCartModal();
    }
});


document.addEventListener('DOMContentLoaded', () => {
    loadItemDetails();
    updateCart();
});