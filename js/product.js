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
        alert(`Le produit ${item.name} est actuellement en rupture de stock.`);
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
            alert(`Quantité de ${item.name} augmentée à ${existingItem.quantity}.`);
        } else {
            alert(`La quantité maximale disponible de ${item.name} est ${maxQty}.`);
            return;
        }
    } else {
        const name = item.name;
        const image = item.image_url;
        cart.push({ id, table, quantity: 1, name, price: finalPrice, image, maxQty });
        alert(`Le produit ${name} a été ajouté au panier.`);
    }
    updateCart();
}


function renderCartModal() {
    cartItemsContainer.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align: center; color: #6c757d; padding: 20px;">Le panier est actuellement vide.</p>';
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
        errorMessage.textContent = '❌ ID d\'article ou table spécifié(e) non valide. Veuillez vérifier l\'URL.';
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
            errorMessage.textContent = `🚨 Erreur de chargement des détails : ${error?.message || 'Article introuvable'}`;
            console.error('Details Fetch Error:', error);
            return;
        }

        currentItem = { ...item, table: table }; 
        displayItemDetails(currentItem, table);
    } catch (e) {
        loadingIndicator.style.display = 'none';
        errorMessage.style.display = 'block';
        errorMessage.textContent = '❌ Une erreur inattendue s\'est produite lors de la récupération des données.';
        console.error('General Fetch Error:', e);
    }
}

function displayItemDetails(item, table) {
    pageTitle.textContent = item.name + ' - Tech Store';

    const priceNormal = item.price;
    const isOfferValid = item.is_offer && item.offer_price > 0 && item.offer_price < priceNormal;
    const priceToUse = isOfferValid ? item.offer_price : priceNormal;

    let priceHTML;
    let offerBadgeHTML = '';

    if (isOfferValid) {
        priceHTML = `
            <s class="old-price-tag">${priceNormal.toFixed(2)} DZD</s>
            <p class="price-tag offer-price-tag">${priceToUse.toFixed(2)} DZD</p>
        `;
        offerBadgeHTML = `<span class="offer-badge">🔥 OFFRE SPÉCIALE !</span>`;
    } else {
        priceHTML = `<p class="price-tag">${priceToUse.toFixed(2)} DZD</p>`;
    }

    const inStock = item.stock_qty > 0;
    const stockStatusClass = inStock ? 'in-stock' : 'out-of-stock';
    const stockMessage = inStock ? `En Stock (${item.stock_qty} unités)` : 'Rupture de Stock';

    let actionText = (table === 'pc_parts') ? 'Ajouter à la Configuration' : 'Ajouter au Panier';
    let buttonText = inStock ? actionText : 'Rupture de Stock';

    let detailsHTML = `
        <div class="product-detail-card">
            ${offerBadgeHTML}
            <div class="image-column">
                <img src="${item.image_url || 'https://via.placeholder.com/400?text=Image+Non+Trouvée'}" alt="${item.name}" class="product-image"/>
                
                <div class="price-container">
                    ${priceHTML}
                </div>
                
                <p class="stock-status-display">Statut: <span class="stock ${stockStatusClass}">${stockMessage}</span></p>
                
                <button id="addToCartBtn" class="buy-button" ${!inStock ? 'disabled' : ''}>
                    🛒 ${buttonText}
                </button>
            </div>

            <div class="info-column">
                <h1>${item.name}</h1>
                
                <div class="description-box">
                    <h3>📃 Description du Produit</h3>
                    <p class="full-description">
                        ${item.description || 'Aucune description détaillée n\'est disponible pour cet article.'}
                    </p>
                </div>
                
                <div class="specs-box">
                    <h3>✨ Spécifications Clés</h3>
    `;

    if (table === 'products') {
        detailsHTML += `
            <p><strong>Catégorie:</strong> <span>${item.category?.toUpperCase() || 'N/A'}</span></p>
            <p><strong>ID Produit:</strong> <span>#${item.id}</span></p>
        `;
    } else if (table === 'pc_parts') {
        detailsHTML += `
            <p><strong>Type de Pièce:</strong> <span>${item.type?.toUpperCase() || 'N/A'}</span></p>
            <p><strong>Fabricant:</strong> <span>${item.manufacturer || 'Inconnu'}</span></p>
            <p><strong>SKU:</strong> <span>#${item.id}</span></p>
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
        alert('Veuillez ajouter des produits à votre panier d\'abord.');
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