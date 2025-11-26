import { supabase } from './supabase.js';


const productsGrid = document.getElementById('productsGrid');
const pcPartsGrid = document.getElementById('pcPartsGrid');
const productFilters = document.getElementById('productFilters');
const partsFilters = document.getElementById('partsFilters');
const statusMessage = document.getElementById('statusMessage');
const cartCount = document.getElementById('cartCount');
const noProductsFound = document.getElementById('noProductsFound');
const noPartsFound = document.getElementById('noPartsFound');

let allProducts = [];
let allPCParts = [];
let cart = [];


/**

 */
function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = count;
}

/**
 
 * @param {object} item - بيانات المنتج
 * @param {string} table  ('products' أو 'pc_parts')
 */
function createCard(item, table) {
    const isPcPart = table === 'pc_parts';
    
 
    let stockStatus, actionButton, stockClass;
    if (isPcPart) {
        stockStatus = `<span class="stock in-stock">Available</span>`;
        actionButton = `<button class="add-to-cart-btn" data-id="${item.id}" data-table="${table}">Add to Build</button>`;
        stockClass = 'pc-part-card';
    } else {
        const inStock = item.stock_qty > 0;
        stockStatus = inStock ? 
            `<span class="stock in-stock">In Stock (${item.stock_qty})</span>` :
            `<span class="stock out-of-stock">Out of Stock</span>`;
        actionButton = `<button class="add-to-cart-btn" data-id="${item.id}" data-table="${table}" ${!inStock ? 'disabled' : ''}>Add to Cart</button>`;
        stockClass = inStock ? '' : 'out-of-stock-card';
    }

    const detailsLink = `product.html?id=${item.id}&table=${table}`; 

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
                    <a href="${detailsLink}" class="details-btn-link"><button class="details-btn">View Details</button></a>
                    ${actionButton}
                </div>
            </div>
        </div>
    `;
}

/**
 
 * @param {string} filterCategory 
 * ('laptop', 'monitor', 'all', etc.)
 */
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

/**
 
 * @param {string} filterType('cpu', 'gpu', 'all', etc.)
 */
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
        
        alert(`Item ID: ${id} from table: ${table} added to the cart! (Functionality to be implemented)`);
        
        cart.push({ id, table, quantity: 1 });
        updateCartCount();
    }
});



document.addEventListener('DOMContentLoaded', () => {
    loadAndDisplayItems();
    updateCartCount();
});