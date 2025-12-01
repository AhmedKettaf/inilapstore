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

function addToCart(product) {
    let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
    const maxQty = product.maxQty;
    
    const productIdStr = product.id.toString(); 

    const existingItem = cart.find(item => item.id.toString() === productIdStr && item.table === product.table);
    
    if (existingItem) {
        if (existingItem.quantity < maxQty) {
            existingItem.quantity++;
            alert(`Quantity of ${product.name} increased to ${existingItem.quantity}.`);
        } else {
            alert(`Maximum stock reached for ${product.name}.`);
            return;
        }
    } else {
        cart.push({
            id: productIdStr,
            name: product.name,
            price: product.price,
            image: product.image,
            maxQty: maxQty,
            quantity: 1,
            table: product.table
        });
        alert(`The product ${product.name} has been added to the cart.`);
    }

    localStorage.setItem('shoppingCart', JSON.stringify(cart));
    updateCartCount(); 
    window.dispatchEvent(new CustomEvent('cartUpdated')); 
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
    const categoryName = product.category || product.part_type || product.type || 'General';

    let priceHTML;
    if (isOffer) {
        priceHTML = `
            <div class="offer-price-container flex flex-col items-start">
                <span class="old-price text-secondary-text text-sm line-through">${priceNormal.toFixed(2)} DZD</span>
                <strong class="new-offer-price text-price-color text-2xl font-extrabold animate-pulse">${currentPrice.toFixed(2)} DZD</strong>
            </div>
        `;
    } else {
        priceHTML = `<strong class="text-price-color text-2xl font-extrabold">${currentPrice.toFixed(2)} DZD</strong>`;
    }

    const stockStatusClass = isOutOfStock ? 'bg-price-color/30 text-price-color' : 'bg-success-color/30 text-success-color';
    const stockStatusText = isOutOfStock ? 'Out of Stock' : `In Stock (${availableStock})`;
    const stockHTML = `<span class="stock px-2 py-0.5 text-xs rounded-full font-semibold border ${stockStatusClass} border-current">${stockStatusText}</span>`;

    return `
        <div class="product-card bg-glass-bg backdrop-blur-sm border border-glass-border rounded-xl shadow-2xl p-4 flex flex-col transition duration-300 hover:shadow-[0_0_25px_rgba(255,215,0,0.3)] ${isOutOfStock ? 'opacity-60 grayscale' : ''}" data-id="${product.id}">
            ${isOffer ? '<span class="offer-badge absolute top-0 left-0 bg-primary text-secondary-accent px-3 py-1 rounded-br-lg text-sm font-bold shadow-lg border-r border-b border-secondary-accent/50 z-10"><i class="fa-solid fa-fire"></i> DEAL</span>' : ''}
            
            <img src="${product.image_url || 'https://via.placeholder.com/200x150?text=INI+LAP+Image'}" alt="${product.name}" class="product-image w-full h-40 object-cover rounded-lg mb-4">
            
            <h3 class="product-name text-xl font-bold text-white mb-1">${product.name}</h3>
            <p class="category text-secondary-accent text-sm mb-3">${categoryName.toUpperCase()}</p>
            
            <div class="card-footer mt-auto pt-3 border-t border-glass-border">
                <div class="mb-3">${stockHTML}</div>

                <div class="flex justify-between items-center mb-3">
                    ${priceHTML}
                </div>
                
                <div class="card-actions flex gap-3">
                    <button class="add-to-cart-btn flex-grow p-2 text-white rounded-md cursor-pointer transition duration-300 font-semibold shadow-lg ${isOutOfStock ? 'bg-secondary-text/50 cursor-not-allowed' : 'bg-primary hover:bg-red-700 shadow-primary/30'}"
                        data-product-id="${product.id}" 
                        data-product-name="${product.name}" 
                        data-product-price="${currentPrice}"
                        data-product-image="${product.image_url}"
                        data-product-stock="${availableStock}"
                        data-product-table="${table}"
                        ${isOutOfStock ? 'disabled' : ''}>
                        <i class="fa-solid fa-cart-shopping"></i> Add to Cart
                    </button>
                    <button class="details-btn p-2 bg-secondary-accent text-dark-bg rounded-md hover:bg-primary hover:text-white transition duration-300" 
                        data-product-id="${product.id}" 
                        data-product-table="${table}">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function fetchAndRenderOffers() {
    statusMessage.textContent = 'Loading hot deals...';
    offersGrid.innerHTML = '';
    noOffersFound.style.display = 'none';
    
    updateCartCount(); 

    try {
        const [productsResponse, partsResponse] = await Promise.all([
            supabase.from('products')
                .select('id, name, price, is_offer, offer_price, image_url, category, stock_qty') 
                .eq('is_offer', true)
                .order('name', { ascending: true }),
            
            supabase.from('pc_parts')
                .select('id, name, price, is_offer, offer_price, image_url, type, stock_qty') 
                .eq('is_offer', true)
                .order('name', { ascending: true })
        ]);

        if (productsResponse.error || partsResponse.error) {
            console.error('Offers loading error:', productsResponse.error || partsResponse.error);
            statusMessage.textContent = '❌ Error loading offers. Please try again. (Check console)';
            statusMessage.classList.add('bg-price-color/30', 'text-price-color');
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
        console.error('Unexpected error:', error);
        statusMessage.textContent = 'A system error occurred.';
        statusMessage.classList.add('bg-price-color/30', 'text-price-color');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderOffers();
    updateCartCount();
    
    window.addEventListener('cartUpdated', updateCartCount);

    offersGrid.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        
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
                alert('This product is unfortunately out of stock.');
            }
        }
        
        else if (target.classList.contains('details-btn') && productId && productTable) {
            console.log(`Redirecting to details page for item ${productId}...`);
            window.location.href = `product.html?id=${productId}&table=${productTable}`;
        }
    });

    const cartModal = document.getElementById('cartModal');
    document.getElementById('openCartModalBtn')?.addEventListener('click', () => {
        cartModal.style.display = 'block';
    });
    document.getElementById('closeCartBtn')?.addEventListener('click', () => {
        cartModal.style.display = 'none';
    });
    window.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            cartModal.style.display = 'none';
        }
    });
    
});