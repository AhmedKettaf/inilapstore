import { supabase } from './supabase.js';


const COMPONENTS_TO_BUILD = [
    { type: 'CPU', label: 'CPU', table: 'pc_parts', icon: 'fas fa-server' },
    { type: 'Motherboard', label: 'Motherboard', table: 'pc_parts', icon: 'fas fa-diagram-project' },
    { type: 'RAM', label: 'Memory', table: 'pc_parts', icon: 'fas fa-memory' },
    { type: 'Cooler', label: 'Fans & Cooling', table: 'pc_parts', icon: 'fas fa-fan' },
    { type: 'Case', label: 'Case', table: 'pc_parts', icon: 'fas fa-box' },
    { type: 'GPU', label: 'Graphics Card', table: 'pc_parts', icon: 'fas fa-microchip' },
    { type: 'SSD', label: 'SSD', table: 'pc_parts', icon: 'fas fa-hdd' },
    { type: 'HDD', label: 'Hard Drive', table: 'pc_parts', icon: 'fas fa-database' },
    { type: 'Power_Supply', label: 'Power Supply', table: 'pc_parts', icon: 'fas fa-bolt' }
];

const componentListContainer = document.getElementById('componentList');
const buildTotalElement = document.getElementById('buildTotal');
const addToCartBtn = document.getElementById('addToCartBtn');
const removeAllBtn = document.getElementById('removeAllBtn');
const compatibilityMessage = document.getElementById('compatibilityMessage');

const selectionModal = document.getElementById('selectionModal');
const modalComponentName = document.getElementById('modalComponentName');
const modalBody = document.getElementById('modalBody');
const closeButton = document.querySelector('.modal-content .close-button');

let currentBuild = {};
let activeComponentType = null;


function loadBuildState() {
    const savedBuild = localStorage.getItem('currentPCBuild');
    currentBuild = savedBuild ? JSON.parse(savedBuild) : {};
    renderComponentList();
    calculateAndDisplayTotal();
}

function saveBuildState() {
    localStorage.setItem('currentPCBuild', JSON.stringify(currentBuild));
    calculateAndDisplayTotal();
}


function checkCompatibility(build) {
    const requiredParts = ['CPU', 'Motherboard', 'RAM', 'GPU', 'Power_Supply'];
    let allSelected = true;
    let message = 'All good! This build seems compatible.';
    let isCompatible = true;

    // التحقق من أن جميع الأجزاء الرئيسية تم اختيارها
    for (const part of requiredParts) {
        if (!build[part]) {
            allSelected = false;
            isCompatible = false;
        }
    }

    if (!allSelected) {
        message = 'Please select CPU, Motherboard, RAM, GPU, and Power Supply to complete the build.';
    } 


    compatibilityMessage.textContent = message;
    compatibilityMessage.className = isCompatible && allSelected ? 'comp-message success' : 'comp-message warning';
    compatibilityMessage.style.display = 'block';
    
    addToCartBtn.disabled = !isCompatible || !allSelected;
    return isCompatible && allSelected;
}

function calculateAndDisplayTotal() {
    let total = 0;
    for (const type in currentBuild) {
        if (currentBuild[type] && currentBuild[type].price) {
            total += currentBuild[type].price;
        }
    }
    buildTotalElement.textContent = `${total.toFixed(2)} DA`;
    checkCompatibility(currentBuild);
}

function renderComponentList() {
    componentListContainer.innerHTML = '';
    
    COMPONENTS_TO_BUILD.forEach(comp => {
        const item = currentBuild[comp.type];
        const isSelected = !!item;

        const div = document.createElement('div');
        div.className = 'component-item';
        div.dataset.type = comp.type;

        div.innerHTML = `
            <h3><i class="${comp.icon}"></i> ${comp.label}</h3>
            <div class="selection-area">
                <p class="selected-item" data-id="${item ? item.id : ''}">
                    ${isSelected ? item.name : 'No item selected'}
                </p>
                <button class="choose-btn" data-type="${comp.type}">Choisir</button>
                <button class="remove-btn" data-type="${comp.type}" style="display: ${isSelected ? 'inline-block' : 'none'};">Remove</button>
            </div>
            <div class="price-display">${isSelected ? item.price.toFixed(2) : 0} DA</div>
        `;

        componentListContainer.appendChild(div);
    });

    attachEventListeners();
}

function attachEventListeners() {
    document.querySelectorAll('.choose-btn').forEach(btn => {
        btn.onclick = () => openModal(btn.dataset.type);
    });
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.onclick = () => removeComponent(btn.dataset.type);
    });
}

function removeComponent(type) {
    delete currentBuild[type];
    saveBuildState();
    renderComponentList();
}


function openModal(componentType) {
    activeComponentType = componentType;
    modalComponentName.textContent = componentType;
    selectionModal.style.display = 'block';
    modalBody.innerHTML = '<p id="modalLoading">Loading options...</p>';
    
    fetchComponentsForModal(componentType);
}

function closeModal() {
    selectionModal.style.display = 'none';
    activeComponentType = null;
    modalBody.innerHTML = '';
}

async function fetchComponentsForModal(type) {
    const { data, error } = await supabase
        .from('pc_parts')
        .select('*')
        .eq('type', type) 
        .order('price', { ascending: true });

    if (error) {
        modalBody.innerHTML = `<p class="error">Error loading components: ${error.message}</p>`;
        return;
    }

    if (data.length === 0) {
        modalBody.innerHTML = '<p>No items found for this category.</p>';
        return;
    }

    modalBody.innerHTML = data.map(item => `
        <div class="modal-item" data-id="${item.id}" data-type="${type}">
            <img src="${item.image_url || 'placeholder.png'}" alt="${item.name}">
            <div class="item-info">
                <strong>${item.name}</strong>
                <p>${item.description.substring(0, 50)}...</p>
            </div>
            <div class="item-price">
                ${item.price.toFixed(2)} DA
            </div>
            <button class="select-item-btn" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}">Select</button>
        </div>
    `).join('');

    document.querySelectorAll('.select-item-btn').forEach(btn => {
        btn.onclick = (e) => selectComponent(
            type, 
            {
                id: e.target.dataset.id,
                name: e.target.dataset.name,
                price: parseFloat(e.target.dataset.price),

            }
        );
    });
}

function selectComponent(type, item) {
    currentBuild[type] = item;
    saveBuildState();
    renderComponentList();
    closeModal();
}

removeAllBtn.onclick = () => {
    if (confirm('Are you sure you want to clear the entire build?')) {
        currentBuild = {};
        saveBuildState();
        renderComponentList();
    }
};

addToCartBtn.onclick = () => {
    if (checkCompatibility(currentBuild)) {
        console.log('Final Build:', currentBuild);
        alert('Build added to cart successfully!');

    }
};

closeButton.onclick = closeModal;
window.onclick = (event) => {
    if (event.target == selectionModal) {
        closeModal();
    }
};

document.addEventListener('DOMContentLoaded', loadBuildState);