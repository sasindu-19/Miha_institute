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

//----------------Dashboard Section----------------
//Tab Switching
function switchTab(event,tabId){
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
    if(tabId === 'orders-tab')animateBars();
}

// Auth Listener
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            loadUserProfile(user.uid);
            loadUserOrders(user.uid);
        } else {
            window.location.href = "../../index.html"; 
        }
    });
//Load User Data
async function loadUserProfile(uid){
    try {
        const userDoc = await db.collection("users").doc(uid).get();
        if(userDoc.exists){
            const data = userDoc.data();
            //update UI elements
            document.getElementById('display-name').innerHTML = data.fullName || "User";
            document.getElementById('display-email-text').innerHTML = auth.currentUser.email;
            document.getElementById('display-address').innerHTML = data.address || "No address found";

            //Update Input fields
            document.getElementById('input-name').value = data.fullName || "";
            document.getElementById('input-phone').value = data.phone || "";
            document.getElementById('input-email').value = auth.currentUser.email;
        }
    } catch (error) {
        console.log("Error loading profile:",error);       
    }
}

//Save profile Function
async function saveProfile(){
    const user = auth.currentUser;
    const newName = document.getElementById('input-name').value;
    const newPhone = document.getElementById('input-phone').value;

    try {
        await db.collection("users").doc(user.uid).update({
            fullName: newName,
            phone: newPhone
        });
        document.getElementById('display-name').innerText = newName;
        alert("Profile Updated Successfully! ✅");
    } catch (error) { 
        alert("Error updating profile."); 
    }
}

// Update Address Function
async function updateAddress() {
    const user = auth.currentUser;
    const newAddr = prompt("Enter your delivery address:", document.getElementById('display-address').innerText);
    
    if (newAddr) {
        try {
            await db.collection("users").doc(user.uid).update({ address: newAddr });
            document.getElementById('display-address').innerText = newAddr;
            alert("Address Updated! 📍");
        } catch (error) { alert("Error saving address."); }
    }
}

//load dashboard Data
function loadUserOrders(uid) {
    const orderList = document.getElementById('orders-list');

    db.collection("orders")
      .where("userId", "==", uid)
      .onSnapshot((querySnapshot) => { 
        
        if (querySnapshot.empty) {
            orderList.innerHTML = `<p style="text-align:center; padding:20px;">No orders found! 🛒</p>`;
            updateStats(0, 0, 0);
            return;
        }

        const sortedDocs = querySnapshot.docs.sort((a, b) => {
            const dateA = a.data().createdAt ? a.data().createdAt.toMillis() : 0;
            const dateB = b.data().createdAt ? b.data().createdAt.toMillis() : 0;
            return dateB - dateA;
        });

        let ordersHTML = '';
        let totalSpent = 0;
        let pendingCount = 0;

        sortedDocs.forEach((doc) => {
            const order = doc.data();
            const orderId = doc.id.slice(-6).toUpperCase();
            const priceNum = parseInt((order.subtotal || "0").replace(/[^0-9]/g, '')) || 0;
            
            totalSpent += priceNum;
            if (order.status !== "Delivered") pendingCount++;

            let progress = "20%";
            if (order.status === "Preparing") progress = "40%";
            if (order.status === "Out for Delivery") progress = "75%";
            if (order.status === "Delivered") progress = "100%";

            ordersHTML += `
                <div class="order-card" style="margin-bottom: 15px; border-left: 5px solid ${getStatusColor(order.status)};">
                    <div style="display: flex; justify-content: space-between;">
                        <strong>Order #FH-${orderId}</strong>
                        <span class="status-badge" style="background: ${getStatusColor(order.status)}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem;">
                            ${order.status}
                        </span>
                    </div>
                    <div class="progress-bar-bg"><div class="progress-fill" style="width: ${progress};"></div></div>
                    <p style="color: #444; font-size: 0.9rem;">
                        ${order.items ? order.items.map(item => `${item.name} x${item.qty}`).join(', ') : 'No items'}
                    </p>
                    <div style="font-weight: bold; color: #ff5722;">${order.subtotal || 'LKR 0'}</div>
                </div>`;
        });

        orderList.innerHTML = ordersHTML;
        updateStats(querySnapshot.size, pendingCount, totalSpent);

    }, (error) => { 
        console.error("Error fetching orders: ", error);
    });
}
function updateStats(total, pending, spent) {
    document.getElementById('total-orders-stat').innerText = total;
    document.getElementById('pending-orders-stat').innerText = pending;
    document.getElementById('total-spent-stat').innerText = `LKR ${(spent)}`;
}
function getStatusColor(status) {
    if(status === "Pending") return "#ffa502";
    if(status === "Preparing") return "#ff7f50";
    if(status === "Out for Delivery") return "#3498db";
    if(status === "Delivered") return "#00d9a5";
    return "#ff4757";
}
function animateBars() {
    document.querySelectorAll('.progress-fill').forEach(fill => {
        const target = fill.style.width;
        fill.style.width = '0';
        setTimeout(() => { fill.style.width = target; }, 100);
    });
}
function logout() {
    auth.signOut().then(() => { window.location.href = "../../index.html"; });
}