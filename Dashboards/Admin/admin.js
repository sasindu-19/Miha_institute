// ==========================================
// 1. CLOUDINARY CONFIGURATION
// ==========================================
const CLOUD_NAME = "diaf824lc";
const UPLOAD_PRESET = "vadvaxcz";

async function uploadImageToCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("cloud_name", CLOUD_NAME);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: formData
        });
        const data = await response.json();

        if (data.error) {
            alert("Upload Error: " + data.error.message);
            return null;
        }
        return data.secure_url;
    } catch (error) {
        console.error("Upload Network Error:", error);
        return null;
    }
}

// ==========================================
// 2. INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', function () {
    // Initial data load
    loadDashboardData();
    loadFoods();
    loadCategories();

    // --- FOOD FORM SUBMIT ---
    const foodForm = document.getElementById('foodForm');
    if (foodForm) {
        foodForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = document.querySelector('.btn-submit');
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;

            try {
                const fileInput = document.getElementById('itemImageInput');
                let imageUrl = null;

                // Upload image if selected
                if (fileInput && fileInput.files.length > 0) {
                    submitBtn.textContent = 'Uploading Image...';
                    imageUrl = await uploadImageToCloudinary(fileInput.files[0]);
                }

                submitBtn.textContent = 'Saving Data...';

                const radioElement = document.querySelector('input[name="availability"]:checked');
                const availability = radioElement ? radioElement.value : 'available';

                let price = parseFloat(document.getElementById('foodPrice').value);
                if (isNaN(price)) price = 0;

                const foodData = {
                    name: document.getElementById('foodName').value,
                    price: price,
                    description: document.getElementById('foodDescription').value,
                    category: document.getElementById('foodCategory').value,
                    subcategory: document.getElementById('foodSubcategory').value || '',
                    allergens: document.getElementById('foodAllergens').value || '',
                    availability: availability,
                    image: imageUrl,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                await db.collection('foods').add(foodData);
                alert('Food Added Successfully!');
                closeFoodModal();

            } catch (error) {
                console.error("Error adding food:", error);
                alert("Error: " + error.message);
            } finally {
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // --- CATEGORY FORM SUBMIT ---
    const catForm = document.getElementById('categoryForm');
    if (catForm) {
        catForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const categoryData = {
                name: document.getElementById('categoryName').value,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            try {
                await db.collection('categories').add(categoryData);
                alert('Category Added!');
                closeCategoryModal();
            } catch (error) {
                alert("Error adding category");
            }
        });
    }

    // --- NAVIGATION LOGIC ---
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function () {
            menuItems.forEach(m => m.classList.remove('active'));
            this.classList.add('active');

            const section = this.dataset.section;
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.getElementById(section).classList.add('active');

            if (section === 'foods') loadFoods();
            if (section === 'orders') loadOrders();
            if (section === 'categories') loadCategories();
        });
    });
});

// ==========================================
// 3. DASHBOARD LOGIC
// ==========================================

function loadDashboardData() {
    if (!db) return;

    // Real-time count for Foods
    db.collection('foods').onSnapshot(snap => {
        const el = document.getElementById('totalFoods');
        if (el) el.textContent = snap.size;
    });

    // Real-time updates for Orders, Pending count, and Revenue
    db.collection('orders').onSnapshot(snap => {
        const elTotal = document.getElementById('totalOrders');
        const elPending = document.getElementById('pendingOrders');
        const elRev = document.getElementById('totalRevenue');

        if (elTotal) elTotal.textContent = snap.size;

        let pendingCount = 0;
        let totalRevenue = 0;

        snap.forEach(doc => {
            const order = doc.data();

            if (order.status && order.status.toLowerCase() === 'pending') {
                pendingCount++;
            }

            let rawPrice = order.subtotal || order.total || order.totalAmount || "0";
            let numericValue = 0;

            if (typeof rawPrice === 'string') {
                numericValue = parseFloat(rawPrice.replace(/[^0-9.]/g, '')) || 0;
            } else {
                numericValue = parseFloat(rawPrice) || 0;
            }
            totalRevenue += numericValue;
        });

        if (elPending) elPending.textContent = pendingCount;
        if (elRev) elRev.textContent = "Rs. " + totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 });
    });
}

// ==========================================
// 4. FOOD MANAGEMENT
// ==========================================

function loadFoods() {
    const grid = document.getElementById('foodGrid');
    if (!grid) return;

    db.collection('foods').orderBy('createdAt', 'desc').onSnapshot(snap => {
        grid.innerHTML = '';
        snap.forEach(doc => {
            const food = doc.data();
            const imageUrl = food.image || 'https://placehold.co/300x200?text=No+Image';

            grid.innerHTML += `
                <div class="food-card">
                    <div class="card-header">
                        <img src="${imageUrl}" class="card-image">
                        <span class="badge">${food.availability || 'Available'}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-title-row">
                            <h3 class="food-name">${food.name}</h3>
                            <span class="food-price">Rs. ${food.price}</span>
                        </div>
                        <p class="food-desc">${food.description || '-'}</p>
                        <div class="tags">
                            <span>${food.category}</span>
                            ${food.subcategory ? `<span>${food.subcategory}</span>` : ''}
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn-icon edit-text" onclick="editFood('${doc.id}')">Edit</button>
                        <button class="btn-icon delete-text" onclick="deleteFood('${doc.id}')">Delete</button>
                    </div>
                </div>
            `;
        });
    });
}

// ==========================================
// 5. ORDER MANAGEMENT 
// ==========================================
async function loadOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    try {
        const snapshot = await db.collection('orders').get();
        tbody.innerHTML = '';

        snapshot.forEach(doc => {
            const order = doc.data();
            const displayTotal = order.subtotal || order.total || order.totalAmount || 'Rs. 0';
            const currentStatus = order.status || 'Pending';
            const statusClass = `status-${currentStatus.toLowerCase().replace(/\s+/g, '-')}`;

            const statusOptions = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered'];
            let statusDropdown = `<select class="status-select" onchange="updateOrderStatus('${doc.id}', this.value)">`;
            statusOptions.forEach(opt => {
                statusDropdown += `<option value="${opt}" ${currentStatus === opt ? 'selected' : ''}>${opt}</option>`;
            });
            statusDropdown += `</select>`;

            tbody.innerHTML += `
                <tr>
                    <td>#${doc.id.substring(0, 6)}</td>
                    <td>${order.customerName || 'Guest'}</td>
                    <td>${order.items ? (Array.isArray(order.items) ? order.items.length : '1') : 0} items</td>
                    <td>${displayTotal}</td>
                    <td><span class="status-badge ${statusClass}">${currentStatus}</span></td>
                    <td class="action-btns">
                        <button class="edit-text" onclick="viewOrder('${doc.id}')">View</button>
                        ${statusDropdown}
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// --- Function to View Specific Order Details ---
window.viewOrder = async function (docId) {
    const modal = document.getElementById('orderViewModal');
    const content = document.getElementById('orderDetailsContent');
    modal.classList.add('active');
    content.innerHTML = '<p>Loading order details...</p>';

    try {
        const doc = await db.collection('orders').doc(docId).get();
        if (!doc.exists) {
            content.innerHTML = '<p>Order not found.</p>';
            return;
        }

        const order = doc.data();
        let itemsHtml = '';

        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                itemsHtml += `
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 8px 0;">
                        <span>${item.name} x ${item.quantity || 1}</span>
                        <span>Rs. ${item.price}</span>
                    </div>`;
            });
        }

        content.innerHTML = `
            <div class="order-detail-card">
                <p><strong>Order ID:</strong> #${docId}</p>
                <p><strong>Customer:</strong> ${order.customerName || 'N/A'}</p>
                <p><strong>Phone:</strong> ${order.customerPhone || 'N/A'}</p>
                <p><strong>Address:</strong> ${order.address || 'N/A'}</p>
                <hr>
                <h4>Items:</h4>
                ${itemsHtml || '<p>No items found</p>'}
                <hr>
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1rem; margin-top: 10px;">
                    <span>Total Amount:</span>
                    <span>${order.subtotal || order.total || order.totalAmount}</span>
                </div>
            </div>
        `;
    } catch (error) {
        content.innerHTML = '<p>Error loading details.</p>';
        console.error(error);
    }
};

window.closeOrderModal = function () {
    document.getElementById('orderViewModal').classList.remove('active');
};

window.updateOrderStatus = async function (docId, newStatus) {
    try {
        await db.collection('orders').doc(docId).update({ status: newStatus });
        loadOrders();
    } catch (error) {
        console.error("Update failed:", error);
        alert("Failed to update status.");
    }
};

// ==========================================
// 6. CATEGORY MANAGEMENT
// ==========================================

let liveCategories = [];
let liveFoods = [];

function loadCategories() {
    db.collection('categories').onSnapshot(snapshot => {
        liveCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCategoriesTable();
    });

    db.collection('foods').onSnapshot(snapshot => {
        liveFoods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCategoriesTable();
    });
}

function renderCategoriesTable() {
    const tbody = document.getElementById('categoriesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    liveCategories.forEach(cat => {
        const itemCount = liveFoods.filter(food => food.category === cat.name).length;
        tbody.innerHTML += `
            <tr>
                <td>${cat.name}</td>
                <td style="font-weight: bold; color: #2ecc71">${itemCount} Items</td>
                <td class="action-btns">
                    <button class="btn-delete" onclick="deleteCategory('${cat.id}')">Delete</button>
                </td>
            </tr>
        `;
    });
}

// ==========================================
// 7. GLOBAL HELPERS & MODALS
// ==========================================

window.deleteFood = async function (id) {
    if (confirm('Delete this item?')) await db.collection('foods').doc(id).delete();
};

window.editFood = (id) => alert("Edit feature coming soon!");

window.deleteCategory = async function (id) {
    if (confirm('Delete this category?')) await db.collection('categories').doc(id).delete();
};

window.handleLogout = function () {
    if (confirm('Logout?')) {
        auth.signOut().then(() => window.location.href = '../../index.html');
    }
};

window.openFoodModal = function () {
    const select = document.getElementById('foodCategory');
    if (select) {
        db.collection("categories").get().then(snap => {
            select.innerHTML = '<option value="">Select Category</option>';
            snap.forEach(doc => {
                const opt = document.createElement('option');
                opt.value = doc.data().name;
                opt.text = doc.data().name;
                select.appendChild(opt);
            });
        });
    }
    document.getElementById('foodModal').classList.add('active');
};

window.closeFoodModal = function () {
    document.getElementById('foodModal').classList.remove('active');
    document.getElementById('foodForm').reset();
};

window.openCategoryModal = () => document.getElementById('categoryModal').classList.add('active');
window.closeCategoryModal = () => document.getElementById('categoryModal').classList.remove('active');