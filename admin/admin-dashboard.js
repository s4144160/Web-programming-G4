document.addEventListener("DOMContentLoaded", async function () {
    let accessMessage = document.getElementById("dashboard-access-message");
    let content = document.getElementById("dashboard-content");

    try {
        let response = await fetch("/api/admin/users");
        let data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                sessionStorage.setItem("textswap-login-return", "/admin/dashboard.html");
                window.location.href = "../account/login.html";
                return;
            }
            accessMessage.textContent = data.message || "Administrator access is required.";
            accessMessage.className = "admin-access-message admin-access-message--error";
            return;
        }

        let active = 0;
        let locked = 0;
        for (let i = 0; i < data.users.length; i++) {
            if (data.users[i].status === "active") {
                active++;
            }
            if (data.users[i].status === "locked") {
                locked++;
            }
        }

        document.getElementById("dashboard-total-users").textContent = data.users.length;
        document.getElementById("dashboard-active-users").textContent = active;
        document.getElementById("dashboard-locked-users").textContent = locked;
        accessMessage.hidden = true;
        content.hidden = false;
    } catch (err) {
        accessMessage.textContent = "Could not connect to the server.";
        accessMessage.className = "admin-access-message admin-access-message--error";
    }

    document.getElementById("admin-logout").addEventListener("click", async function () {
        await fetch("/api/account/logout", { method: "POST" });
        localStorage.removeItem("textswap-shopping-cart-v3");
        localStorage.removeItem("textswap-last-order-id-v1");
        window.location.href = "../account/login.html";
    });
});
