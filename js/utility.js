const cartModal = document.getElementById('cartModal');
const openCartModalBtn = document.getElementById('openCartModalBtn');
const closeCartBtn = document.getElementById('closeCartBtn');
const cartCount = document.getElementById('cartCount');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartTotal = document.getElementById('cartTotal');
const goToCheckoutBtn = document.getElementById('goToCheckoutBtn');
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.querySelector('.nav-links');

let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];

function setupMobileMenu() {
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuToggle.textContent = navLinks.classList.contains('active') ? '✕' : '☰';
        });
    }
}

function updateCart() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = count;
    localStorage.setItem('shoppingCart', JSON.stringify(cart));
    if(cartModal && cartModal.style.display === 'block') {
        renderCartModal();
    }
}

function renderCartModal() {
    if (!cartItemsContainer || !cartTotal) return; 

    cartItemsContainer.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align: center;">Le panier est actuellement vide.</p>';
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
                <p>Prix: ${item.price.toFixed(2)} DZD</p> 
                <div class="cart-quantity-controls">
                    <button class="qty-control-btn" data-action="decrease" data-index="${index}">-</button>
                    <input type="number" value="${item.quantity}" min="1" max="${item.maxQty}" data-index="${index}" class="cart-qty-input">
                    <button class="qty-control-btn" data-action="increase" data-index="${index}">+</button>
                </div>
                <strong>Sous-total: ${itemTotal.toFixed(2)} DZD</strong> 
            </div>
            <button class="remove-from-cart-btn" data-index="${index}">❌</button> 
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

document.addEventListener('DOMContentLoaded', () => {
    updateCart(); 
    setupMobileMenu();
    
    if(openCartModalBtn) openCartModalBtn.addEventListener('click', openCartModal);
    if(closeCartBtn) closeCartBtn.addEventListener('click', closeCartModal);

    window.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            closeCartModal();
        }
    });

    if(cartItemsContainer) {
        cartItemsContainer.addEventListener('click', (e) => {
            if (e.target.closest('.cart-item')) {
                handleCartControls(e);
            }
        });
    }

    if(goToCheckoutBtn) {
        goToCheckoutBtn.addEventListener('click', () => {
            if (cart.length > 0) {
                closeCartModal();
                window.location.href = 'checkout.html';
            } else {
                alert('Veuillez ajouter des produits à votre panier d\'abord.'); 
            }
        });
    }
});