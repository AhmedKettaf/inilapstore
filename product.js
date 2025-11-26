import { supabase } from './supabase.js';

const productDetailsContainer = document.getElementById('productDetails');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');
const pageTitle = document.getElementById('pageTitle');

/**

 * @returns {object}
 */
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

        displayItemDetails(item, table);
    } catch (e) {
        loadingIndicator.style.display = 'none';
        errorMessage.style.display = 'block';
        errorMessage.textContent = '❌ An unexpected error occurred while fetching data.';
        console.error('General Fetch Error:', e);
    }
}

/**

 @param {object} item 
 @param {string} table 
 */
function displayItemDetails(item, table) {
    pageTitle.textContent = item.name + ' - Tech Store';

    let detailsHTML = `
        <div class="product-detail-card">
            <div class="image-column">
                <img src="${item.image_url || 'https://via.placeholder.com/400?text=Image+Not+Found'}" alt="${item.name}" class="product-image"/>
                <p class="price-tag">$${item.price.toFixed(2)}</p>
                <button class="buy-button">🛒 Add to Cart</button>
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
        const stockStatusClass = item.stock_qty > 0 ? 'in-stock' : 'out-of-stock';
        const stockMessage = item.stock_qty > 0 ? `In Stock (${item.stock_qty} units)` : 'Out of Stock';

        detailsHTML += `
            <p><strong>Category:</strong> <span>${item.category?.toUpperCase() || 'N/A'}</span></p>
            <p><strong>Availability:</strong> <span class="stock ${stockStatusClass}">${stockMessage}</span></p>
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
}

loadItemDetails();