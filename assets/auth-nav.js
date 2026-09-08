document.addEventListener("DOMContentLoaded", async function () {
    let actions = document.querySelector(".navbar__actions");
    if (!actions) {
        return;
    }

    try {
        let response = await fetch("/api/account/me");
        if (!response.ok) {
            return;
        }

        let data = await response.json();
        actions.innerHTML = "";

        let profile = document.createElement("a");
        profile.href = "/account/profile.html";
        profile.className = "btn btn-outline";
        profile.textContent = "Profile";
        actions.appendChild(profile);

        if (data.user.role === "admin") {
            let admin = document.createElement("a");
            admin.href = "/admin/user-management.html";
            admin.className = "btn btn-outline";
            admin.textContent = "Admin";
            actions.appendChild(admin);
        }

        let logout = document.createElement("button");
        logout.type = "button";
        logout.className = "btn btn-primary";
        logout.textContent = "Logout";
        logout.addEventListener("click", async function () {
            await fetch("/api/account/logout", { method: "POST" });
            localStorage.removeItem("textswap-shopping-cart-v3");
            localStorage.removeItem("textswap-last-order-id-v1");
            window.location.href = "/account/login.html";
        });
        actions.appendChild(logout);
    } catch (err) {
        return;
    }
});
