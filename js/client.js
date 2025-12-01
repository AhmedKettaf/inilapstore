import { supabase } from './supabase.js';

const productsGrid = document.getElementById('productsGrid');
const pcPartsGrid = document.getElementById('pcPartsGrid');
const prebuiltPcsGrid = document.getElementById('prebuiltPcsGrid');
const productFilters = document.getElementById('productFilters');
const partsFilters = document.getElementById('partsFilters');
const statusMessage = document.getElementById('statusMessage');
const noProductsFound = document.getElementById('noProductsFound');
const noPartsFound = document.getElementById('noPartsFound');
const noPrebuiltPcsFound = document.getElementById('noPrebuiltPcsFound');

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

function createCard(item, table) {
    const isPcPart = table === 'pc_parts';
    
    const itemStockQty = item.stock_qty !== undefined ? item.stock_qty : 0;
    const inStock = itemStockQty > 0;
    
    let stockStatus, actionButton;

    if (inStock) {
        stockStatus = `<span class="font-semibold px-2 py-1 rounded-md text-xs inline-block uppercase bg-green-900/50 text-success-color border border-success-color/30">In Stock (${itemStockQty})</span>`;
        actionButton = `
            <button onclick="addToCart('${item.id}', '${table}')" class="add-to-cart-btn p-2 bg-primary text-white rounded-md hover:bg-red-700 transition duration-300" data-id="${item.id}" data-table="${table}" title="${isPcPart ? 'Add to Configuration' : 'Add to Cart'}">
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
                <s class="old-price text-sm text-secondary-text/70 font-normal">${item.price.toFixed(2)} DZD</s>
                <strong class="new-offer-price text-2xl text-price-color font-extrabold animate-pulse">${displayPrice.toFixed(2)} DZD</strong>
            </div>
            <span class="offer-badge absolute top-3 right-3 bg-price-color text-white px-3 py-1 rounded-bl-lg text-xs font-bold shadow-md z-10">🔥 DEAL</span>
        `;
    } else {
        priceHTML = `<strong class="text-2xl text-price-color font-extrabold">${displayPrice.toFixed(2)} DZD</strong>`;
    }

    const descriptionText = item.description 
        ? item.description.substring(0, 100).trim() + (item.description.length > 100 ? '...' : '') 
        : 'No description provided.';

    const detailsLink = `product.html?id=${item.id}&table=${table}`;

    return `
        <div class="product-card bg-glass-bg backdrop-blur-sm border border-glass-border rounded-xl shadow-2xl p-4 flex flex-col transition duration-300 hover:shadow-[0_0_20px_rgba(229,57,53,0.4)] relative">
            <img src="${item.image_url || 'placeholder.png'}" alt="${item.name}" class="w-full h-40 object-contain mx-auto mb-4 rounded-lg" />
            
            ${isOffer ? '<span class="offer-badge absolute top-3 right-3 bg-price-color text-white px-3 py-1 rounded-bl-lg text-xs font-bold shadow-md z-10 transform rotate-3">🔥 DEAL!</span>' : ''}
            
            <h3 class="text-xl font-bold text-white mb-2 min-h-[3em] overflow-hidden">${item.name}</h3>
            <p class="category text-primary text-sm mb-3 font-semibold">${isPcPart ? item.type.toUpperCase() : item.category.toUpperCase()}</p>
            <p class="description text-secondary-text text-sm flex-grow mb-4 text-left line-clamp-2">${descriptionText}</p>
            
            <div class="card-footer flex justify-between items-end pt-3 border-t border-glass-border mt-auto">
                <div class="price-stock-container">
                    ${priceHTML} 
                    <div class="mt-2 text-left">
                        ${stockStatus}
                    </div>
                </div>
                
                <div class="card-actions flex gap-2">
                    <a href="${detailsLink}" class="details-btn p-2 bg-secondary-accent text-dark-bg rounded-md hover:bg-primary transition duration-300 group" title="View Details">
                        <i class="fa-solid fa-eye group-hover:text-white transition duration-300"></i>
                    </a>
                    ${actionButton}
                </div>
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
        ? allProducts.filter(item => item.category !== 'prebuilt_pc')
        : allProducts.filter(item => item.category === filterCategory);

    if (filtered.length === 0) {
        noProductsFound.classList.remove('hidden');
    } else {
        noProductsFound.classList.add('hidden');
        filtered.forEach(item => {
            productsGrid.innerHTML += createCard(item, 'products');
        });
    }
    updateFilterButtonClass('productFilters', 'data-category', filterCategory);
    addCardEventListeners();
}

function displayPrebuiltPcs() {
    prebuiltPcsGrid.innerHTML = '';
    
    const prebuiltPcs = allProducts.filter(item => item.category === 'prebuilt_pc');

    if (prebuiltPcs.length === 0) {
        noPrebuiltPcsFound.classList.remove('hidden');
    } else {
        noPrebuiltPcsFound.classList.add('hidden');
        prebuiltPcs.forEach(item => {
            prebuiltPcsGrid.innerHTML += createCard(item, 'products');
        });
    }
    addCardEventListeners();
}

function displayPCParts(filterType) {
    pcPartsGrid.innerHTML = '';
    const filtered = (filterType === 'all')
        ? allPCParts
        : allPCParts.filter(item => item.type === filterType);

    if (filtered.length === 0) {
        noPartsFound.classList.remove('hidden');
    } else {
        noPartsFound.classList.add('hidden');
        filtered.forEach(item => {
            pcPartsGrid.innerHTML += createCard(item, 'pc_parts');
        });
    }
    updateFilterButtonClass('partsFilters', 'data-type', filterType);
    addCardEventListeners();
}

async function fetchProducts() {
    statusMessage.textContent = 'Loading products...';
    try {
        const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('*')
            .order('id', { ascending: true });

        const { data: pcPartsData, error: pcPartsError } = await supabase
            .from('pc_parts')
            .select('*')
            .order('id', { ascending: true });

        if (productsError) throw productsError;
        if (pcPartsError) throw pcPartsError;

        allProducts = productsData || [];
        allPCParts = pcPartsData || [];

        displayProducts('all');
        displayPrebuiltPcs(); 
        displayPCParts('all');

        statusMessage.classList.add('hidden');

    } catch (error) {
        console.error('Error fetching data:', error.message);
        statusMessage.textContent = 'Error loading products. Please try again.';
        statusMessage.classList.remove('hidden');
        statusMessage.classList.add('bg-red-900/50', 'text-price-color', 'border-price-color');
    }
}

function addCardEventListeners() {
    
}

productFilters.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
        const category = e.target.getAttribute('data-category');
        displayProducts(category);
    }
});

partsFilters.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
        const type = e.target.getAttribute('data-type');
        displayPCParts(type);
    }
});

window.openDetailsModal = function(id, table) {
    window.location.href = `product.html?id=${id}&table=${table}`;
}

document.querySelector('#detailsModal .close-button').onclick = () => {
    detailsModal.classList.add('hidden');
};

openCartModalBtn.onclick = () => {
    cartModal.classList.remove('hidden');
};

closeCartBtn.onclick = () => {
    cartModal.classList.add('hidden');
};

window.onclick = (event) => {
    if (event.target === detailsModal) {
        detailsModal.classList.add('hidden');
    }
    if (event.target === cartModal) {
        cartModal.classList.add('hidden');
    }
};

window.changeCartQuantity = function(id, table, delta) {
    const item = cart.find(i => i.id.toString() === id.toString() && i.table === table);
    if (item) {
        const newQuantity = item.quantity + delta;
        if (newQuantity > 0 && newQuantity <= item.maxQty) {
            item.quantity = newQuantity;
        } else if (newQuantity > item.maxQty) {
            alert(`Maximum available quantity for ${item.name} is ${item.maxQty}.`);
        } else if (newQuantity === 0) {
            removeFromCart(id, table);
            return;
        }
        updateCart();
    }
}

window.removeFromCart = function(id, table) {
    const itemIndex = cart.findIndex(i => i.id.toString() === id.toString() && i.table === table);
    if (itemIndex > -1) {
        cart.splice(itemIndex, 1);
        updateCart();
    }
}

function renderCartModal() {
    cartItemsContainer.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="text-center py-4 text-secondary-text/70">Your cart is empty.</p>';
        goToCheckoutBtn.disabled = true;
        goToCheckoutBtn.classList.add('bg-gray-600', 'hover:bg-gray-600');
        goToCheckoutBtn.classList.remove('bg-primary', 'hover:bg-red-700');
    } else {
        goToCheckoutBtn.disabled = false;
        goToCheckoutBtn.classList.remove('bg-gray-600', 'hover:bg-gray-600');
        goToCheckoutBtn.classList.add('bg-primary', 'hover:bg-red-700');

        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            const itemHtml = `
                <div class="flex items-center space-x-4 py-3 border-b border-primary/20 last:border-b-0">
                    <img src="${item.image || 'placeholder.png'}" alt="${item.name}" class="w-12 h-12 object-contain rounded">
                    <div class="flex-grow">
                        <p class="text-white font-semibold text-sm">${item.name}</p>
                        <p class="text-secondary-accent text-xs">${item.price.toFixed(2)} DZD</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="changeCartQuantity('${item.id}', '${item.table}', -1)" class="bg-primary hover:bg-red-700 text-white w-6 h-6 rounded-full text-sm font-bold">-</button>
                        <span class="text-white w-4 text-center">${item.quantity}</span>
                        <button onclick="changeCartQuantity('${item.id}', '${item.table}', 1)" class="bg-primary hover:bg-red-700 text-white w-6 h-6 rounded-full text-sm font-bold" ${item.quantity >= item.maxQty ? 'disabled' : ''}>+</button>
                    </div>
                    <button onclick="removeFromCart('${item.id}', '${item.table}')" class="text-secondary-text hover:text-price-color transition duration-300">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;
            cartItemsContainer.innerHTML += itemHtml;
        });
    }

    cartTotal.textContent = total.toFixed(2) + ' DZD';
}

fetchProducts();
updateCart();