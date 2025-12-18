// Load Menu Items
function loadMenuItems(filterCategory = 'all') {
    const menuGrid = document.getElementById('menu-grid');
    if (!menuGrid) return;

    db.collection("foods").onSnapshot((querySnapshot) => {
        menuGrid.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const item = doc.data();
            const isAvailable = item.availability === "available";
            const matchesCategory = filterCategory === 'all' || item.category === filterCategory;

            if (isAvailable && matchesCategory) {
                const cardHTML = `
                    <div class="menu-card visible">
                        <div class="menu-card-image">
                            <span class="menu-badge">${item.subcategory || 'Hot'}</span>
                            <img src="${item.image}" alt="${item.name}">
                        </div>
                        <div class="menu-card-content">
                            <h3>${item.name}</h3>
                            <p>${item.description}</p>
                            <div class="menu-card-footer">
                                <span class="price">LKR ${item.price.toLocaleString()}</span>
                                <button class="add-btn" onclick="addToCart('${item.name}', ${item.price}, '${item.image}')">Add to Cart</button>
                            </div>
                        </div>
                    </div>      
                `;
                menuGrid.innerHTML += cardHTML;
            }
        });
    });
}

// Filter Menu
function filterMenu(category) {
    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadMenuItems(category);
}

// Add to Cart
function addToCart(itemName, price, image) {
    let cart = JSON.parse(sessionStorage.getItem('foodieCart')) || [];
    const existingItemIndex = cart.findIndex(item => item.name === itemName);

    if (existingItemIndex > -1) {
        cart[existingItemIndex].qty += 1;
    } else {
        cart.push({
            name: itemName,
            price: price,
            image: image,
            qty: 1
        });
    }
    sessionStorage.setItem('foodieCart', JSON.stringify(cart));
    showToast(`✨ ${itemName} added to cart!`);
}

// Show Toast
function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Display Cart Items
function displayCart() {
    const cartItemsSection = document.getElementById('cart-items-section');
    if (!cartItemsSection) return;

    const cart = JSON.parse(sessionStorage.getItem('foodieCart')) || [];

    if (cart.length === 0) {
        cartItemsSection.innerHTML = `
            <div style="text-align:center; padding: 50px; width: 100%;">
                <p style="font-size: 1.2rem; color: #666;">Your cart is empty!</p>
                <a href="index.html" class="btn btn-primary" style="text-decoration:none; margin-top:10px; display:inline-block;">Back to Menu</a>
            </div>`;
        updateSummary();
        return;
    }

    let cartHTML = '';
    cart.forEach((item, index) => {
        cartHTML += `
            <div class="cart-item">
                <img src="${item.image}" class="cart-item-image">
                <div class="details">
                    <h3 style="margin:0">${item.name}</h3>
                    <p style="color:#666">LKR ${item.price.toLocaleString()}</p>
                </div>
                <div class="quantity-selector">
                    <button onclick="changeQty(${index}, -1)">-</button>
                    <span>${item.qty}</span>
                    <button onclick="changeQty(${index}, 1)">+</button>
                </div>
                <span class="item-total" style="font-weight:bold">LKR ${(item.price * item.qty).toLocaleString()}</span>
                <button class="remove-btn" onclick="removeItem(${index})" style="color: red; background:none; border:none; cursor:pointer; font-size: 20px;">×</button>
            </div>
        `;
    });

    cartItemsSection.innerHTML = cartHTML;
    updateSummary();
}

function changeQty(index, delta) {
    let cart = JSON.parse(sessionStorage.getItem('foodieCart'));
    cart[index].qty += delta;
    if (cart[index].qty < 1) cart[index].qty = 1;
    sessionStorage.setItem('foodieCart', JSON.stringify(cart));
    displayCart();
}

function removeItem(index) {
    let cart = JSON.parse(sessionStorage.getItem('foodieCart'));
    cart.splice(index, 1);
    sessionStorage.setItem('foodieCart', JSON.stringify(cart)); 
    displayCart();
}

function updateSummary() {
    const subtotalEl = document.getElementById('subtotal');
    if (!subtotalEl) return;

    const cart = JSON.parse(sessionStorage.getItem('foodieCart')) || [];
    let subtotal = 0;
    cart.forEach(item => { subtotal += item.price * item.qty; });

    const deliveryFee = subtotal > 0 ? 300 : 0;
    const total = subtotal + deliveryFee;

    subtotalEl.textContent = `LKR ${subtotal.toLocaleString()}`;
    document.getElementById('delivery').textContent = `LKR ${deliveryFee.toLocaleString()}`;
    document.getElementById('grand-total').textContent = `LKR ${total.toLocaleString()}`;
}

// Initial Loads
document.addEventListener('DOMContentLoaded', () => {
    loadMenuItems('all');
    displayCart();
});

//Checkout Page load summary 
document.addEventListener('DOMContentLoaded',()=>{
    const cart = JSON.parse(sessionStorage.getItem('foodieCart')) || [];
    const orderList = document.getElementById('order-items-list');
    const subtotalEl = document.getElementById('subtotal');
    const grandTotalEl = document.getElementById('grand-total');

    if(!orderList || !subtotalEl || !grandTotalEl) return;

    let subtotal = 0;
    orderList.innerHTML = '';

    cart.forEach(item => {
        subtotal +=item.price * item.qty;
        orderList.innerHTML +=`
        <div class="summary-line">
            <span>${item.name} (x${item.qty})</span>
            <span>LKR ${(item.price * item.qty).toLocaleString()}</span>
        </div>`;
    });
    const delivery = subtotal > 0 ? 300 : 0;
    subtotalEl.innerText = `LKR ${subtotal.toLocaleString()}`;
    grandTotalEl.innerText = `LKR ${(subtotal+delivery).toLocaleString()}`;
});

//place Order To Firebase
async function placeOrder(){
    const user = auth.currentUser;
    if(!user){
        alert("Please login to place an order! 🔒");
        return;
    }

    const name= document.getElementById('full-name').value;
    const phone= document.getElementById('phone-number').value;
    const address= document.getElementById('delivery-address').value;
    const cart= JSON.parse(sessionStorage.getItem('foodieCart')) || [];
    if(!name || !phone || !address || cart.length === 0){

        alert("Please fill all details and ensure cart is not empty! ❌");
        return;
    }

    const orderDate = {
        userId: user.uid,
        customerName: name,
        phone: phone,
        address: address,
        items: cart,
        subtotal:document.getElementById('subtotal').innerText,
        status: "Pending",
        createAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
        await db.collection("orders").add(orderDate);
        sessionStorage.removeItem('foodieCart');
        alert("Order Placed Successfully!");
        window.location.href = "dashboard.html";
    } catch (error) {
        console.error("Firestore Error:", error);
        alert("Error: " + error.message);
    }
}