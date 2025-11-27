import { supabase } from './supabase.js';

const offersGrid = document.getElementById('offersGrid');
const statusMessage = document.getElementById('statusMessage');
const noOffersFound = document.getElementById('noOffersFound');
const cartCountSpan = document.getElementById('cartCount');

function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    cartCountSpan.textContent = totalItems;
}

function createProductCard(product, table) {
    const isOffer = product.is_offer;
    const availableStock = product.stock_qty || 0; 
    const isOutOfStock = availableStock <= 0;

    const priceNormal = product.price; 
    let priceOffer = product.offer_price;
    
    if (isOffer && (!priceOffer || priceOffer >= priceNormal)) {
        priceOffer = priceNormal;
    }

    const currentPrice = isOffer ? priceOffer : priceNormal;

    let priceHTML;
    if (isOffer) {
        priceHTML = `
            <div class="offer-price-container">
                <span class="old-price">${priceNormal.toFixed(2)} DZD</span>
                <strong class="new-offer-price">${currentPrice.toFixed(2)} DZD</strong>
            </div>
        `;
    } else {
        priceHTML = `<strong>${currentPrice.toFixed(2)} DZD</strong>`;
    }

    const stockStatusClass = isOutOfStock ? 'out-of-stock' : 'in-stock';
    const stockStatusText = isOutOfStock ? 'Épuisé' : `En stock (${availableStock})`;
    const stockHTML = `<span class="stock ${stockStatusClass}">${stockStatusText}</span>`;

    return `
        <div class="product-card ${isOffer ? 'on-offer' : ''} ${isOutOfStock ? 'out-of-stock-card' : ''}" data-id="${product.id}">
            ${isOffer ? '<span class="offer-badge">🔥 OFFRE</span>' : ''}
            <img src="${product.image_url || 'placeholder.png'}" alt="${product.name}" class="product-image">
            <h3 class="product-name">${product.name}</h3>
            <p class="category">${product.category || product.part_type || product.type}</p>
            
            <div class="card-footer">
                ${stockHTML}
                ${priceHTML}
                
                <div class="card-actions">
                    <button class="add-to-cart-btn" 
                        data-product-id="${product.id}" 
                        data-product-name="${product.name}" 
                        data-product-price="${currentPrice}"
                        data-product-image="${product.image_url}"
                        data-product-stock="${availableStock}"
                        data-product-table="${table}"
                        ${isOutOfStock ? 'disabled' : ''}>
                        🛒 Ajouter au Panier
                    </button>
                    <button class="details-btn" data-product-id="${product.id}" data-product-table="${table}">
                        Détails
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function fetchAndRenderOffers() {
    statusMessage.textContent = 'Chargement des offres en cours...';
    offersGrid.innerHTML = '';
    noOffersFound.style.display = 'none';
    
    updateCartCount(); 

    try {
        const [productsResponse, partsResponse] = await Promise.all([
            supabase.from('products')
                .select('*, stock_qty') 
                .eq('is_offer', true)
                .order('name', { ascending: true }),
            
            supabase.from('pc_parts')
                .select('*, stock_qty') 
                .eq('is_offer', true)
                .order('name', { ascending: true })
        ]);

        if (productsResponse.error || partsResponse.error) {
            console.error('Erreur de chargement des offres:', productsResponse.error || partsResponse.error);
            statusMessage.textContent = '❌ Erreur lors du chargement des offres. Veuillez réessayer. (Voir console)';
            return;
        }

        const productsOffers = (productsResponse.data || []).map(p => ({ 
            ...p, 
            table: 'products',
            stock_qty: p.stock_qty || 0
        }));
        
        const partsOffers = (partsResponse.data || []).map(p => ({ 
            ...p, 
            table: 'pc_parts',
            stock_qty: p.stock_qty || 0
        }));

        const allOffers = [...productsOffers, ...partsOffers];

        if (allOffers.length > 0) {
            const offersHTML = allOffers.map(offer => createProductCard(offer, offer.table)).join('');
            offersGrid.innerHTML = offersHTML;
            statusMessage.style.display = 'none';
        } else {
            statusMessage.style.display = 'none';
            noOffersFound.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Erreur inattendue:', error);
        statusMessage.textContent = 'Une erreur système est survenue.';
    }
}

function addToCart(product) {
    let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
    const maxQty = product.maxQty;
    
    const existingItem = cart.find(item => item.id === product.id && item.table === product.table);
    
    if (existingItem) {
        if (existingItem.quantity < maxQty) {
            existingItem.quantity++;
        } else {
            alert(`Stock maximum atteint pour ${product.name}.`);
            return;
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            maxQty: maxQty,
            quantity: 1,
            table: product.table
        });
    }

    localStorage.setItem('shoppingCart', JSON.stringify(cart));
    updateCartCount(); 
    window.dispatchEvent(new CustomEvent('cartUpdated')); 
}


document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderOffers();
    updateCartCount();
    
    offersGrid.addEventListener('click', async (e) => {
        const target = e.target;
        const productId = target.getAttribute('data-product-id');
        const productTable = target.getAttribute('data-product-table');

        if (target.classList.contains('add-to-cart-btn') && productId && productTable) {
            const maxQty = parseInt(target.getAttribute('data-product-stock'));
            
            if (maxQty > 0) {
                const productData = {
                    id: productId,
                    name: target.getAttribute('data-product-name'),
                    price: parseFloat(target.getAttribute('data-product-price')),
                    image: target.getAttribute('data-product-image'),
                    maxQty: maxQty,
                    table: productTable
                };
                addToCart(productData);
            } else {
                alert('Ce produit est malheureusement épuisé.');
            }
        }
        
        else if (target.classList.contains('details-btn') && productId && productTable) {
            console.log(`Redirection vers la page de détails pour l'article ${productId}...`);
            window.location.href = `product.html?id=${productId}&table=${productTable}`;
        }
    });
});