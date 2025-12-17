async function loginUser(){
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try{
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        const doc = await db.collection("users").doc(user.uid).get();
        if(!doc.exists){
            alert("User role not found!");
            return;
        }
        const role = doc.data().role;

        if(role == "admin"){
            window.location.href = "Dashboards/adminDashboard.html";
        }else{
            window.location.href = "Dashboards/User/index.html";
        }
    }catch(error){
        alert(error.message);
    }
}

async function signupUser(){
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const email = document.getElementById("signupEmail").value;
    const phone = document.getElementById("phone").value;
    const password = document.getElementById("signupPassword").value;
    const confirmpassword = document.getElementById("confirmPassword").value;

    const role = "user";

    if(password !== confirmpassword){
        alert("Passwords do not match!");
        return;
    }
    try{
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        await db.collection("users").doc(user.uid).set({
            firstName,
            lastName,
            email,
            phone,
            role,
            createdAt: new Date()
        });
        alert("User registered successfully!");
        showLogin();
    }catch(error){
        alert(error.message);
    }

}