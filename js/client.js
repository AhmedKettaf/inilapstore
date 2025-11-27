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
const navLinks = document.querySelector('.nav-links');

let allProducts = [];
let allPCParts = [];

let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];

menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    menuToggle.textContent = navLinks.classList.contains('active') ? '✕' : '☰';
});

navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
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

function addToCart(id, table) {
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
            alert(`Quantité de ${itemData.name} augmentée à ${existingItem.quantity}.`);
        } else {
            alert(`La quantité maximale disponible de ${itemData.name} est ${maxQty}.`);
            return;
        }
    } else {
        if (maxQty > 0) {
            const name = itemData.name;
            const price = itemPrice;
            const image = itemData.image_url;
            cart.push({ id, table, quantity: 1, name, price, image, maxQty });
            alert(`${name} a été ajouté au panier.`);
        } else {
            alert(`${itemData.name} est en rupture de stock.`);
            return;
        }
    }
    updateCart();
}

function renderCartModal() {
    cartItemsContainer.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">Le panier est actuellement vide. Ajoutez-y des articles pour commencer vos achats.</p>';
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
                <p>Prix unitaire: ${item.price.toFixed(2)} DZD</p> 
                <div class="cart-quantity-controls">
                    <button class="qty-control-btn" data-action="decrease" data-index="${index}" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                    <input type="number" value="${item.quantity}" min="1" max="${item.maxQty}" data-index="${index}" class="cart-qty-input">
                    <button class="qty-control-btn" data-action="increase" data-index="${index}" ${item.quantity >= item.maxQty ? 'disabled' : ''}>+</button>
                </div>
                <strong>Sous-total: ${itemTotal.toFixed(2)} DZD</strong> 
            </div>
            <button class="remove-from-cart-btn" data-index="${index}" title="Retirer l'article">❌</button> 
        `;
        cartItemsContainer.appendChild(cartItemDiv);
    });

    cartTotal.textContent = total.toFixed(2) + ' DZD';

    goToCheckoutBtn.disabled = false;
}

function handleCartControls(e) {
    const target = e.target;
    if (target.classList.contains('remove-from-cart-btn')) {
        const index = target.getAttribute('data-index');
        if (confirm(`Êtes-vous sûr de vouloir retirer ${cart[index].name} du panier ?`)) {
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
            alert(`La quantité maximale est ${item.maxQty}.`);
        }
        item.quantity = newQty;
        target.value = newQty; 
        updateCart();
    }
}

function createCard(item, table) {
    const isPcPart = table === 'pc_parts';
    
    const itemStockQty = item.stock_qty !== undefined ? item.stock_qty : 0;
    const inStock = itemStockQty > 0;
    
    let stockStatus, actionButton, stockClass;
    let actionText = isPcPart ? 'Ajouter à la Configuration' : 'Ajouter au Panier';

    if (inStock) {
        stockStatus = `<span class="stock in-stock">En Stock (${itemStockQty})</span>`;
        stockClass = '';
        actionButton = `<button class="add-to-cart-btn" data-id="${item.id}" data-table="${table}">${actionText}</button>`;
    } else {

        stockStatus = `<span class="stock out-of-stock">Rupture de Stock</span>`;
        stockClass = 'out-of-stock-card';
        actionButton = `<button class="add-to-cart-btn" data-id="${item.id}" data-table="${table}" disabled>Rupture de Stock</button>`;
    }

    const isOffer = item.is_offer && item.offer_price > 0 && item.offer_price < item.price;
    const displayPrice = isOffer ? item.offer_price : item.price;
    
    let priceHTML;
    if (isOffer) {
        priceHTML = `
            <div class="offer-price-container">
                <s class="old-price">${item.price.toFixed(2)} DZD</s>
                <strong class="new-offer-price">${displayPrice.toFixed(2)} DZD</strong>
            </div>
        `;
    } else {
        priceHTML = `<strong>${displayPrice.toFixed(2)} DZD</strong>`;
    }

    const descriptionText = item.description 
        ? item.description.substring(0, 100).trim() + (item.description.length > 100 ? '...' : '') 
        : 'Aucune description fournie.';

    return `
        <div class="product-card ${stockClass} ${isOffer ? 'on-offer' : ''}">
            <img src="${item.image_url || 'placeholder.png'}" alt="${item.name}" />
            ${isOffer ? '<span class="offer-badge">🔥 OFFRE !</span>' : ''} 
            <h3>${item.name}</h3>
            <p class="category">${isPcPart ? item.type.toUpperCase() : item.category.toUpperCase()}</p>
            <p class="description">${descriptionText}</p>
            <div class="card-footer">
                ${priceHTML} 
                ${stockStatus}
                <div class="card-actions">
                    <button class="details-btn" data-id="${item.id}" data-table="${table}">Voir Détails</button>
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
        noProductsFound.textContent = 'Aucun produit trouvé dans cette catégorie.';
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
        noPartsFound.textContent = 'Aucun composant PC trouvé dans cette catégorie.';
        noPartsFound.style.display = 'block';
    } else {
        filtered.forEach(item => {
            pcPartsGrid.innerHTML += createCard(item, 'pc_parts');
        });
        noPartsFound.style.display = 'none';
    }
}


async function loadAndDisplayItems() {
    statusMessage.textContent = '... Chargement des données du magasin';

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

        statusMessage.textContent = '✅ Magasin chargé avec succès.';
        statusMessage.style.color = 'green';
        setTimeout(() => { statusMessage.style.display = 'none'; }, 3000);

    } catch (error) {
        statusMessage.textContent = `❌ Échec du chargement : ${error.message}. Veuillez vérifier votre connexion et les clés Supabase.`;
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
        alert('Veuillez ajouter des produits à votre panier d\'abord.');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayItems();
    updateCart();
});