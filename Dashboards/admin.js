// ==========================================
// 1. CLOUDINARY CONFIGURATION
// ==========================================
const CLOUD_NAME = "diaf824lc"; 
const UPLOAD_PRESET = "vadvaxcz"; 

// Function to handle image upload
async function uploadImageToCloudinary(file) {
    console.log("1. Starting Upload Process...");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET); 
    formData.append("cloud_name", CLOUD_NAME);

    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST", body: formData
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

document.addEventListener('DOMContentLoaded', function() {
    
    loadDashboardData();
    loadFoods();
    loadCategories();

    // --- FOOD FORM SUBMIT ---
    const foodForm = document.getElementById('foodForm');
    
    if(foodForm) {
        foodForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            
            const submitBtn = document.querySelector('.btn-submit');
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;

            try {
                const fileInput = document.getElementById('itemImageInput');
                let imageUrl = null;

                if (!fileInput) {
                    throw new Error("Critical: Image Input ID 'itemImageInput' not found!");
                }

                if (fileInput.files.length > 0) {
                    submitBtn.textContent = 'Uploading Image...';
                    imageUrl = await uploadImageToCloudinary(fileInput.files[0]);
                    
                    if(!imageUrl) {
                        alert("Warning: Image upload failed. Saving without image.");
                    }
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
                console.error("Error:", error);
                alert("Error: " + error.message);
            } finally {
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

    // --- Category Form Submit ---
    const catForm = document.getElementById('categoryForm');
    if (catForm) {
        catForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const categoryData = {
                name: document.getElementById('categoryName').value,
                itemsCount: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            try {
                await db.collection('categories').add(categoryData);
                alert('Category Added!');
                document.getElementById('categoryName').value = "";
                closeCategoryModal();
            } catch (error) {
                alert("Error adding category");
            }
        });
    }

    // --- NAVIGATION LOGIC ---
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
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
    if(!db) return;
    db.collection('foods').onSnapshot(snap => {
        const el = document.getElementById('totalFoods');
        if(el) el.textContent = snap.size;
    });

    db.collection('orders').onSnapshot(snap => {
        const elTotal = document.getElementById('totalOrders');
        const elPending = document.getElementById('pendingOrders');
        const elRev = document.getElementById('totalRevenue');

        if(elTotal) elTotal.textContent = snap.size;

        let pending = 0;
        let revenue = 0;
        snap.forEach(doc => {
            const order = doc.data();
            if(order.status === 'pending') pending++;
            revenue += (order.totalAmount || order.total || 0);
        });

        if (elPending) elPending.textContent = pending;
        if (elRev) elRev.textContent = "Rs. " + revenue.toFixed(2);
    });
}

// ==========================================
// 4. FOOD MANAGEMENT
// ==========================================

function loadFoods() {
    const grid = document.getElementById('foodGrid');
    if (!grid) return;

    db.collection('foods').onSnapshot(snap => {
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

// ======================
// 5. ORDER MANAGEMENT 
// ======================

async function loadOrders() {
    try {
        const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
        const tbody = document.getElementById('ordersTableBody');
        if(!tbody) return;
        
        tbody.innerHTML = '';
        
        snapshot.forEach(doc => {
            const order = doc.data();
            const statusClass = `status-${order.status || 'pending'}`;
            const row = `
                <tr>
                    <td>#${doc.id.substring(0, 6)}</td>
                    <td>${order.customerName || 'N/A'}</td>
                    <td>${order.items?.length || 0} items</td>
                    <td>Rs. ${order.total || 0}</td>
                    <td><span class="status-badge ${statusClass}">${order.status || 'pending'}</span></td>
                    <td class="action-btns">
                        <button class="btn-edit" onclick="updateOrderStatus('${doc.id}')">Update</button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// ==========================================
// 6. CATEGORY MANAGEMENT
// ==========================================

let liveCategories= [];
let liveFoods = [];

function loadCategories() {
    const tbody = document.getElementById('categoriesTableBody');
    if (!tbody) return;

    db.collection('categories').onSnapshot(snapshot => {
        liveCategories = snapshot.docs.map(doc =>({
            id: doc.id,
            ...doc.data()
        }));
        renderCategoriesTable();
    });

    db.collection('foods').onSnapshot(snapshot => {
        liveFoods = snapshot.docs.map(doc =>({
            id: doc.id,
            ...doc.data()
        }));
        renderCategoriesTable();
    });
}

function renderCategoriesTable(){
    const tbody = document.getElementById('categoriesTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    liveCategories.forEach(cat => {
        const itemCount = liveFoods.filter(food => food.category === cat.name).length;
        const row =`
            <tr>
                <td>${cat.name}</td>

                <td style="font-weight: bold; color: #2ecc71">${itemCount} Items</td>

                <td class="action-btns">
                    <button class="btn-delete" onclick="deleteCategory('${cat.id}')">Delete</button>
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}
// ==========================================
// 7. GLOBAL WINDOW FUNCTIONS
// ==========================================

window.deleteFood = async function(id) {
    if (confirm('Delete this item?')) {
        await db.collection('foods').doc(id).delete();
    }
};

window.editFood = function(id) {
    alert("Edit feature coming soon!"); 
};

window.deleteCategory = async function(id) {
    if (confirm('Delete this category?')) {
        await db.collection('categories').doc(id).delete();
    }
};

window.updateOrderStatus = async function(orderId) {
    const newStatus = prompt('Enter new status (pending/preparing/ready):');
    if (newStatus && ['pending', 'preparing', 'ready'].includes(newStatus)) {
        await db.collection('orders').doc(orderId).update({ status: newStatus });
        alert('Status Updated!');
        loadOrders();
    }
};

window.handleLogout = function() {
    if (confirm('Logout?')) {
        auth.signOut().then(() => {
            window.location.href = '../index.html';
        });
    }
};

// Modal Helpers
window.openFoodModal = function() {
    const select = document.getElementById('foodCategory');
    if(select) {
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
    document.getElementById('foodForm').reset();
};

window.closeFoodModal = function() {
    document.getElementById('foodModal').classList.remove('active');
    document.getElementById('foodForm').reset();
    const box = document.querySelector('.image-upload-box');
    if(box) {
        box.style.backgroundImage = 'none';
        box.innerHTML = '<span style="font-size: 24px;">☁️</span><p>Click to upload image</p>';
    }
};

window.openCategoryModal = function() {
    document.getElementById('categoryModal').classList.add('active');
    document.getElementById('categoryForm').reset();
};

window.closeCategoryModal = function() {
    document.getElementById('categoryModal').classList.remove('active');
};