import { supabase } from './supabase.js';

const checkoutForm = document.getElementById('checkoutForm');
const orderSummaryList = document.getElementById('orderSummaryList');
const finalTotalDisplay = document.getElementById('finalTotalDisplay').querySelector('span');
const submitCheckoutBtn = document.getElementById('submitCheckoutBtn');
const checkoutMessage = document.getElementById('checkoutMessage');
const statusAlert = document.getElementById('statusAlert');


let cart = [];
let cartTotal = 0;

function calculateCartTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

/**
 * Loads the cart from LocalStorage and renders the order summary.
 */
function loadAndRenderSummary() {
    const storedCart = localStorage.getItem('shoppingCart');
    cart = storedCart ? JSON.parse(storedCart) : [];

    cartTotal = calculateCartTotal();
    finalTotalDisplay.textContent = cartTotal.toFixed(2) + ' DZD';

    orderSummaryList.innerHTML = '';

    if (cart.length === 0) {
        orderSummaryList.innerHTML = '<p class="text-center text-price-color font-bold p-3">❌ السلة فارغة. الرجاء العودة إلى المتجر لإضافة منتجات.</p>';
        submitCheckoutBtn.disabled = true;
        document.getElementById('checkoutContainer').classList.add('opacity-50', 'pointer-events-none');
        return;
    }
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center text-white';
        div.innerHTML = `
            <span class="text-secondary-accent font-semibold">${item.name} <span class="text-secondary-text text-sm">(x${item.quantity})</span></span>
            <strong class="text-white">${itemTotal.toFixed(2)} DZD</strong>
        `;
        orderSummaryList.appendChild(div);
    });

    submitCheckoutBtn.disabled = false;
}

/**
 * Handles the submission of the checkout form.
 */
async function handleCheckout(e) {
    e.preventDefault();

    if (cart.length === 0) {
        checkoutMessage.textContent = '❌ السلة فارغة. لا يمكن إرسال الطلب.';
        checkoutMessage.style.color = '#FF0000';
        return;
    }
    
    const fullName = document.getElementById('fullName').value;
    const phone = document.getElementById('phone').value;
    const wilaya = document.getElementById('wilaya').value;
    const total = cartTotal;

    if (!fullName || !phone || !wilaya) {
        checkoutMessage.textContent = 'الرجاء ملء جميع الحقول المطلوبة.';
        checkoutMessage.style.color = '#FFD700';
        return;
    }
    
    submitCheckoutBtn.disabled = true;
    submitCheckoutBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري إرسال الطلب...';
    checkoutMessage.textContent = '... يتم معالجة طلبك.';
    checkoutMessage.style.color = '#E53935';

    const orderItemsData = cart.map(item => ({
        id: item.id,
        table: item.table,
        name: item.name,
        price: item.price,
        quantity: item.quantity
    }));

    const orderData = {
        full_name: fullName,
        phone_number: phone,
        wilaya: wilaya,
        total_price: total,
        order_items: orderItemsData,
        status: 'New'
    };

    const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select();

    submitCheckoutBtn.innerHTML = '<i class="fa-solid fa-check-circle"></i> تأكيد الطلب الآن';
    
    if (error) {
        console.error('Checkout Error:', error);
        statusAlert.innerHTML = `
            <div class="bg-dark-bg/50 p-6 rounded-lg border border-price-color">
                <p class="text-price-color text-2xl font-bold mb-3">❌ فشل تأكيد الطلب</p>
                <p class="text-secondary-text">حدث خطأ أثناء إرسال طلبك. الرجاء المحاولة مرة أخرى أو التواصل معنا مباشرة.</p>
                <p class="text-sm text-price-color mt-2">(${error.message})</p>
            </div>
        `;
        submitCheckoutBtn.disabled = false;
        checkoutMessage.textContent = '';
        return;
    }

    // Success
    localStorage.removeItem('shoppingCart');
    cart = [];
    
    const orderId = data[0].id;

    statusAlert.innerHTML = `
        <div class="bg-light-bg p-8 rounded-xl shadow-2xl border-4 border-success-color">
            <h2 class="text-success-color text-4xl font-extrabold mb-4"><i class="fa-solid fa-check-double"></i> تم تأكيد طلبك بنجاح!</h2>
            <p class="text-white text-lg mb-2">رقم الطلب (Order ID): <strong class="text-secondary-accent">${orderId}</strong></p>
            <p class="text-white mb-6">سيتم التواصل معك على الرقم <strong class="text-primary">${phone}</strong> لتأكيد تفاصيل الشحن إلى <strong class="text-primary">${wilaya}</strong>.</p>
            
            <p class="text-secondary-text mb-6">
                شكرًا لتسوقك من <span class="text-primary font-bold">INI LAP</span>.
            </p>

            <a href="index.html" class="inline-block px-6 py-3 bg-primary text-white font-bold rounded-lg transition duration-300 hover:bg-red-700 shadow-lg shadow-primary/30">
                <i class="fa-solid fa-house"></i> العودة إلى الصفحة الرئيسية
            </a>
        </div>
    `;
    
    document.getElementById('checkoutContainer').style.display = 'none';
    
    window.dispatchEvent(new CustomEvent('cartUpdated')); 
}


// --- Event Listeners ---
checkoutForm.addEventListener('submit', handleCheckout);
document.addEventListener('DOMContentLoaded', loadAndRenderSummary);