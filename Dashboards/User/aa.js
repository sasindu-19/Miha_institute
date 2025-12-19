        // Tab Switching
        function switchTab(event, tabId) {
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            event.currentTarget.classList.add('active');
            if(tabId === 'orders-tab') animateBars();
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

        // Load User Data
        async function loadUserProfile(uid) {
            try {
                const userDoc = await db.collection("users").doc(uid).get();
                if (userDoc.exists) {
                    const data = userDoc.data();
                    // Update UI elements
                    document.getElementById('display-name').innerText = data.firstName + " " + data.lastName || "User";
                    document.getElementById('display-email-text').innerText = auth.currentUser.email;
                    document.getElementById('display-address').innerText = data.address || "No address found.";
                    
                    // Update Input fields
                    document.getElementById('input-name').value = data.fullName || "";
                    document.getElementById('input-phone').value = data.phone || "";
                    document.getElementById('input-email').value = auth.currentUser.email;
                }
            } catch (error) { console.error("Error loading profile:", error); }
        }

        // Save Profile Function
        async function saveProfile() {
            const user = auth.currentUser;
            const newName = document.getElementById('input-name').value;
            const newPhone = document.getElementById('input-phone').value;

            try {
                await db.collection("users").doc(user.uid).update({
                    name: newName,
                    phone: newPhone
                });
                document.getElementById('display-name').innerText = newName;
                alert("Profile Updated Successfully! ✅");
            } catch (error) { alert("Error updating profile."); }
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

function loadUserOrders(uid) {
    const ordersList = document.getElementById('orders-list');

    // Firestore query eka userId matha pamanak filter karamu (Index prashna nathi wenna)
    db.collection("orders")
      .where("userId", "==", uid) 
      .onSnapshot((querySnapshot) => {
        
        if (querySnapshot.empty) {
            ordersList.innerHTML = `<p style="text-align:center; padding:20px;">No orders found! 🛒</p>`;
            updateStats(0, 0, 0);
            return;
        }

        // JavaScript walinma client-side eke date eka anuwa sort karamu
        // createdAt field eka thiyenawada kiyala check karalama sort karamu
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

            // Firestore field eka 'subtotal' (LKR 400 wage text ekak thiyenne)
            const subtotalStr = order.subtotal || "0"; 
            const priceNum = parseInt(subtotalStr.replace(/[^0-9]/g, '')) || 0;
            
            totalSpent += priceNum;
            if(order.status !== "Delivered") pendingCount++;

            let progress = "20%";
            if(order.status === "Preparing") progress = "40%";
            if(order.status === "Out for Delivery") progress = "75%";
            if(order.status === "Delivered") progress = "100%";

            ordersHTML += `
                <div class="order-card" style="margin-bottom: 15px; border-left: 5px solid ${getStatusColor(order.status)};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <strong>Order #FH-${orderId}</strong><br>
                            <small style="color: #888;">Ordered on: ${order.createdAt ? order.createdAt.toDate().toLocaleDateString() : 'Date N/A'}</small>
                        </div>
                        <span class="status-badge" style="background: ${getStatusColor(order.status)}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: bold;">
                            ${order.status}
                        </span>
                    </div>
                    <div class="progress-bar-bg" style="background: #eee; height: 8px; border-radius: 4px; margin: 12px 0;">
                        <div class="progress-fill" style="width: ${progress}; background: #ff5722; height: 100%; border-radius: 4px; transition: width 0.5s;"></div>
                    </div>
                    <p style="color: #444; font-size: 0.9rem; margin-bottom: 8px;">
                        ${order.items ? order.items.map(item => `<b>${item.name}</b> (x${item.qty})`).join(', ') : 'No items'}
                    </p>
                    <div style="font-weight: bold; color: #ff5722; font-size: 1.1rem;">${order.subtotal || 'LKR 0'}</div>
                </div>`;
        });
        ordersList.innerHTML = ordersHTML;
        updateStats(querySnapshot.size, pendingCount, totalSpent);
    }, (error) => {
        console.error("Error fetching orders: ", error);
        ordersList.innerHTML = `<p style="color: red; text-align: center;">Error loading orders. Please check console.</p>`;
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