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

const cartModal = document.getElementById('cartModal');
const openCartModalBtn = document.getElementById('openCartModalBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartCount = document.getElementById('cartCount');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartTotal = document.getElementById('cartTotal');
const goToCheckoutBtn = document.getElementById('goToCheckoutBtn');

const menuToggle = document.getElementById('menuToggle');
const mobileNavLinks = document.getElementById('mobileNavLinks'); 

let allProducts = [];
let allPCParts = [];

let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];

menuToggle.addEventListener('click', () => {
    const isActive = mobileNavLinks.classList.contains('translate-x-0');
    mobileNavLinks.classList.toggle('translate-x-0', !isActive);
    mobileNavLinks.classList.toggle('-translate-x-full', isActive);
    menuToggle.textContent = isActive ? '✕' : '☰';
});

mobileNavLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        mobileNavLinks.classList.remove('translate-x-0');
        mobileNavLinks.classList.add('-translate-x-full');
        menuToggle.textContent = '☰';
    });
});

function updateCart() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = count;
    localStorage.setItem('shoppingCart', JSON.stringify(cart));
    renderCartModal();
}

function findItem(id, table) {
    const data = table === 'products' ? allProducts : allPCParts;
    return data.find(item => item.id.toString() === id.toString());
}

/**
 * Ajout au Panier
 * @param {string} id ID du produit
 * @param {string} table Nom de la table ('products' ou 'pc_parts')
 */
window.addToCart = function(id, table) {
    const existingItem = cart.find(item => item.id.toString() === id.toString() && item.table === table);
    const itemData = findItem(id, table);

    if (!itemData) return;

    const itemPrice = (itemData.is_offer && itemData.offer_price > 0 && itemData.offer_price < itemData.price) 
        ? itemData.offer_price 
        : itemData.price;
    
    const maxQty = itemData.stock_qty || Infinity;

    if (existingItem) {
        if (existingItem.quantity < maxQty) {
            existingItem.quantity += 1;
            alert(`Quantity of ${itemData.name} increased to ${existingItem.quantity}.`);
        } else {
            alert(`Maximum available quantity for ${itemData.name} is ${maxQty}.`);
            return;
        }
    } else {
        if (maxQty > 0) {
            const name = itemData.name;
            const price = itemPrice;
            const image = itemData.image_url;
            cart.push({ id, table, quantity: 1, name, price, image, maxQty });
            alert(`${name} has been added to the cart.`);
        } else {
            alert(`${itemData.name} is out of stock.`);
            return;
        }
    }
    updateCart();
}

/**
 * Crée le HTML pour une carte de produit.
 * Mise à jour pour le style Black Glassmorphism et les icônes Font Awesome.
 */
function createCard(item, table) {
    const isPcPart = table === 'pc_parts';
    
    const itemStockQty = item.stock_qty !== undefined ? item.stock_qty : 0;
    const inStock = itemStockQty > 0;
    
    let stockStatus, actionButton, cardClasses;

    if (inStock) {
        stockStatus = `<span class="font-semibold px-2 py-1 rounded-md text-xs inline-block uppercase bg-green-900/50 text-success-color border border-success-color/30">In Stock (${itemStockQty})</span>`;
        actionButton = `
            <button class="add-to-cart-btn p-2 bg-primary text-white rounded-md hover:bg-red-700 transition duration-300" data-id="${item.id}" data-table="${table}" title="${isPcPart ? 'Add to Configuration' : 'Add to Cart'}">
                <i class="fa-solid fa-cart-shopping"></i>
            </button>
        `;
    } else {
        stockStatus = `<span class="font-semibold px-2 py-1 rounded-md text-xs inline-block uppercase bg-red-900/50 text-price-color border border-price-color/30">Out of Stock</span>`;
        actionButton = `
            <button disabled class="p-2 bg-secondary-text/50 text-white rounded-md cursor-not-allowed" title="Out of Stock">
                <i class="fa-solid fa-ban"></i>
            </button>
        `;
    }

    const isOffer = item.is_offer && item.offer_price > 0 && item.offer_price < item.price;
    const displayPrice = isOffer ? item.offer_price : item.price;
    
    let priceHTML;
    if (isOffer) {
        priceHTML = `
            <div class="offer-price-container flex flex-col items-start">
                <s class="old-price text-base text-secondary-text mb-0 font-normal">${item.price.toFixed(2)} DZD</s>
                <strong class="new-offer-price text-2xl text-price-color font-extrabold animate-pulse">${displayPrice.toFixed(2)} DZD</strong>
            </div>
        `;
    } else {
        priceHTML = `<strong class="text-2xl text-price-color font-extrabold">${displayPrice.toFixed(2)} DZD</strong>`;
    }

    const descriptionText = item.description 
        ? item.description.substring(0, 100).trim() + (item.description.length > 100 ? '...' : '') 
        : 'No description provided.';

    return `
        <div class="product-card bg-glass-bg backdrop-blur-sm border border-glass-border rounded-xl shadow-2xl p-4 flex flex-col transition duration-300 hover:shadow-[0_0_20px_rgba(229,57,53,0.4)]">
            <img src="${item.image_url || 'placeholder.png'}" alt="${item.name}" class="w-full h-40 object-contain mx-auto mb-4 rounded-lg" />
            
            ${isOffer ? '<span class="offer-badge absolute top-3 right-3 bg-price-color text-white px-3 py-1 rounded-md text-xs font-bold shadow-md transform rotate-3 z-10">🔥 DEAL!</span>' : ''} 
            
            <h3 class="text-xl font-bold text-white mb-2 min-h-[2.8em]">${item.name}</h3>
            <p class="category text-primary text-sm mb-3 font-semibold">${isPcPart ? item.type.toUpperCase() : item.category.toUpperCase()}</p>
            <p class="description text-secondary-text text-sm flex-grow mb-4 text-left line-clamp-2">${descriptionText}</p>
            
            <div class="card-footer flex justify-between items-center pt-3 border-t border-glass-border mt-auto">
                ${priceHTML} 
                <div class="card-actions flex gap-2">
                    <button class="details-btn p-2 bg-secondary-accent text-dark-bg rounded-md hover:bg-primary transition duration-300 group" data-id="${item.id}" data-table="${table}" title="View Details">
                        <i class="fa-solid fa-eye group-hover:text-white transition duration-300"></i>
                    </button>
                    ${actionButton}
                </div>
            </div>
             <div class="mt-3 text-right">
                ${stockStatus}
            </div>
        </div>
    `;
}


function updateFilterButtonClass(containerId, activeDataAttribute, activeValue) {
    document.querySelectorAll(`#${containerId} .filter-btn`).forEach(b => {
        b.classList.remove('font-bold', 'bg-primary', 'text-white', 'border-primary', 'shadow-lg', 'hover:bg-red-700');
        b.classList.add('border-secondary-accent', 'bg-dark-bg', 'text-secondary-accent', 'hover:bg-secondary-accent/20', 'hover:text-white');
        
        if (b.getAttribute(activeDataAttribute) === activeValue) {
            b.classList.remove('border-secondary-accent', 'bg-dark-bg', 'text-secondary-accent', 'hover:bg-secondary-accent/20', 'hover:text-white');
            b.classList.add('font-bold', 'bg-primary', 'text-white', 'border-primary', 'shadow-lg', 'hover:bg-red-700');
        }
    });
}

function displayProducts(filterCategory) {
    productsGrid.innerHTML = '';
    const filtered = (filterCategory === 'all')
        ? allProducts
        : allProducts.filter(item => item.category === filterCategory);

    if (filtered.length === 0) {
        productsGrid.innerHTML = '';
        noProductsFound.textContent = 'No products found in this category.';
        noProductsFound.classList.remove('hidden');
    } else {
        filtered.forEach(item => {
            productsGrid.innerHTML += createCard(item, 'products');
        });
        noProductsFound.classList.add('hidden');
    }
    updateFilterButtonClass('productFilters', 'data-category', filterCategory);
}

function displayPCParts(filterType) {
    pcPartsGrid.innerHTML = '';
    const filtered = (filterType === 'all')
        ? allPCParts
        : allPCParts.filter(item => item.type === filterType);

    if (filtered.length === 0) {
        pcPartsGrid.innerHTML = '';
        noPartsFound.textContent = 'No PC components found in this category.';
        noPartsFound.classList.remove('hidden');
    } else {
        filtered.forEach(item => {
            pcPartsGrid.innerHTML += createCard(item, 'pc_parts');
        });
        noPartsFound.classList.add('hidden');
    }
    updateFilterButtonClass('partsFilters', 'data-type', filterType);
}

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
        cartItemDiv.classList.add('cart-item', 'flex', 'items-center', 'border-b', 'border-glass-border', 'py-3', 'gap-3', 'text-white');
        cartItemDiv.innerHTML = `
            <img src="${item.image || 'placeholder.png'}" alt="${item.name}" class="cart-item-img w-16 h-16 object-contain rounded-md border border-glass-border">
            <div class="cart-item-details flex-grow">
                <h4 class="m-0 text-base font-semibold text-white">${item.name}</h4>
                <p class="m-0 text-sm text-secondary-text">Unit Price: ${item.price.toFixed(2)} DZD</p> 
                <div class="cart-quantity-controls flex items-center my-1">
                    <button class="qty-control-btn bg-dark-bg border border-glass-border text-white px-2 py-1 cursor-pointer text-base transition duration-200 hover:bg-light-bg" data-action="decrease" data-index="${index}" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                    <input type="number" value="${item.quantity}" min="1" max="${item.maxQty}" data-index="${index}" class="cart-qty-input w-10 text-center bg-dark-bg text-white border border-glass-border mx-1 p-0.5 rounded-sm">
                    <button class="qty-control-btn bg-dark-bg border border-glass-border text-white px-2 py-1 cursor-pointer text-base transition duration-200 hover:bg-light-bg" data-action="increase" data-index="${index}" ${item.quantity >= item.maxQty ? 'disabled' : ''}>+</button>
                </div>
                <strong class="text-sm text-secondary-accent">Subtotal: ${itemTotal.toFixed(2)} DZD</strong> 
            </div>
            <button class="remove-from-cart-btn bg-transparent border-none cursor-pointer text-xl text-price-color p-1 hover:text-red-700 transition duration-300" data-index="${index}" title="Remove Item">
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

    if (target.classList.contains('remove-from-cart-btn') || target.closest('.fa-trash-can')) {
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

async function loadAndDisplayItems() {
    statusMessage.textContent = '... Loading store data';

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

        statusMessage.textContent = '✅ Store loaded successfully.';
        statusMessage.classList.remove('text-secondary-accent', 'border-secondary-accent', 'animate-pulse');
        statusMessage.classList.add('bg-success-color', 'text-white', 'border-success-color');
        setTimeout(() => { statusMessage.style.display = 'none'; }, 3000);

    } catch (error) {
        statusMessage.textContent = `❌ Loading failed: ${error.message}. Please check your connection and Supabase keys.`;
        statusMessage.classList.remove('text-secondary-accent', 'border-secondary-accent', 'animate-pulse');
        statusMessage.classList.add('bg-price-color', 'text-white', 'border-price-color');
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


productFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (btn) {
        const category = btn.getAttribute('data-category');
        displayProducts(category);
    }
});


partsFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (btn) {
        const type = btn.getAttribute('data-type');
        displayPCParts(type);
    }
});

document.addEventListener('click', (e) => {
    
    const addToCartButton = e.target.closest('.add-to-cart-btn');

    if (addToCartButton) {
        const id = addToCartButton.getAttribute('data-id');
        const table = addToCartButton.getAttribute('data-table');
        window.addToCart(id, table);
    }
    else if (e.target.closest('.details-btn')) { 
        const btn = e.target.closest('.details-btn');
        if (btn) {
            const id = btn.getAttribute('data-id');
            const table = btn.getAttribute('data-table');
            window.location.href = `product.html?id=${id}&table=${table}`;
        }
    }
});

cartItemsContainer.addEventListener('click', handleCartControls);
cartItemsContainer.addEventListener('change', handleCartControls);


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
        alert('Please add products to your cart first.');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayItems();
    updateCart();
});