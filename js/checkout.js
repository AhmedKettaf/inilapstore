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

function loadAndRenderSummary() {
    const storedCart = localStorage.getItem('shoppingCart');
    cart = storedCart ? JSON.parse(storedCart) : [];

    cartTotal = calculateCartTotal();
    finalTotalDisplay.textContent = cartTotal.toFixed(2) + ' DZD';

    orderSummaryList.innerHTML = '';

    if (cart.length === 0) {
        orderSummaryList.innerHTML = '<p style="text-align: center; color: red;">❌ السلة فارغة. الرجاء العودة إلى المتجر.</p>';
        submitCheckoutBtn.disabled = true;
        return;
    }
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        const div = document.createElement('div');
        div.innerHTML = `
            <span>${item.name} (x${item.quantity})</span>
            <strong>${itemTotal.toFixed(2)} DZD</strong>
        `;
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        orderSummaryList.appendChild(div);
    });

    submitCheckoutBtn.disabled = false;
}

async function handleCheckout(e) {
    e.preventDefault();

    if (cart.length === 0) {
        checkoutMessage.textContent = '❌ السلة فارغة.';
        return;
    }
    
    const fullName = document.getElementById('fullName').value;
    const phone = document.getElementById('phone').value;
    const wilaya = document.getElementById('wilaya').value;
    const total = cartTotal;

    submitCheckoutBtn.disabled = true;
    submitCheckoutBtn.textContent = 'جاري إرسال الطلب...';
    checkoutMessage.textContent = '... يتم معالجة طلبك.';
    checkoutMessage.style.color = '#007bff';

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

    if (error) {
        console.error('Checkout Error:', error);
        statusAlert.innerHTML = `<p style="color: red; font-size: 1.2em;">❌ فشل تأكيد الطلب: ${error.message}</p>`;
        submitCheckoutBtn.disabled = false;
        submitCheckoutBtn.textContent = 'تأكيد الطلب الآن';
        return;
    }

    localStorage.removeItem('shoppingCart');
    cart = [];
    
    statusAlert.innerHTML = `
        <h2 style="color: green;">✅ تم تأكيد طلبك بنجاح!</h2>
        <p>سيتم التواصل معك على الرقم ${phone} لتأكيد تفاصيل الشحن إلى ${wilaya}.</p>
        <p>رقم الطلب (Order ID): <strong>${data[0].id}</strong></p>
        <a href="index.html" style="display: block; margin-top: 20px;">العودة إلى المتجر</a>
    `;
    
    document.getElementById('checkoutContainer').style.display = 'none';
}


checkoutForm.addEventListener('submit', handleCheckout);

document.addEventListener('DOMContentLoaded', loadAndRenderSummary);