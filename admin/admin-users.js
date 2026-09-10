document.addEventListener("DOMContentLoaded", function () {
    let users = [];
    let currentUserId = "";
    let body = document.getElementById("user-table-body");
    let message = document.getElementById("admin-message");
    let accessMessage = document.getElementById("admin-access-message");
    let content = document.getElementById("admin-content");

    function showMessage(text, type) {
        message.textContent = text;
        message.className = "admin-message admin-message--" + type;
    }

    function updateTotals() {
        let active = 0;
        let locked = 0;
        let admins = 0;
        for (let i = 0; i < users.length; i++) {
            if (users[i].status === "active") {
                active++;
            }
            if (users[i].status === "locked") {
                locked++;
            }
            if (users[i].role === "admin") {
                admins++;
            }
        }
        document.getElementById("total-users").textContent = users.length;
        document.getElementById("active-users").textContent = active;
        document.getElementById("locked-users").textContent = locked;
        document.getElementById("admin-users").textContent = admins;
    }

    function addCell(row, label, text) {
        let cell = document.createElement("td");
        cell.setAttribute("data-label", label);
        cell.textContent = text;
        row.appendChild(cell);
        return cell;
    }

    function render() {
        body.innerHTML = "";
        let search = document.getElementById("user-search").value.trim().toLowerCase();
        let status = document.getElementById("status-filter").value;
        let role = document.getElementById("role-filter").value;
        let shown = 0;

        for (let i = 0; i < users.length; i++) {
            let user = users[i];
            let matchesSearch = user.username.toLowerCase().indexOf(search) !== -1 || user.email.toLowerCase().indexOf(search) !== -1;
            let matchesStatus = status === "all" || user.status === status;
            let matchesRole = role === "all" || user.role === role;
            if (!matchesSearch || !matchesStatus || !matchesRole) {
                continue;
            }

            shown++;
            let row = document.createElement("tr");
            let avatarCell = addCell(row, "User", "");
            let avatar = document.createElement("span");
            avatar.className = "user-avatar";
            avatar.textContent = user.name ? user.name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase();
            avatarCell.appendChild(avatar);
            addCell(row, "Username", user.username);
            addCell(row, "Email", user.email);
            addCell(row, "Role", user.role === "admin" ? "Administrator" : "User");

            let statusCell = addCell(row, "Account status", "");
            let badge = document.createElement("span");
            badge.className = "status-badge status-badge--" + user.status;
            badge.textContent = user.status.charAt(0).toUpperCase() + user.status.slice(1);
            statusCell.appendChild(badge);
            addCell(row, "Date joined", new Date(user.createdAt).toLocaleDateString());

            let actionCell = addCell(row, "Action", "");
            if (String(user._id) === String(currentUserId)) {
                actionCell.textContent = "Current account";
            } else if (user.status !== "deactivated") {
                let button = document.createElement("button");
                button.type = "button";
                button.className = "account-action " + (user.status === "locked" ? "account-action--unlock" : "account-action--lock");
                button.textContent = user.status === "locked" ? "Unlock Account" : "Lock Account";
                button.setAttribute("data-id", user._id);
                button.setAttribute("data-next-status", user.status === "locked" ? "active" : "locked");
                button.setAttribute("data-name", user.username);
                actionCell.appendChild(button);
            } else {
                actionCell.textContent = "No action";
            }
            body.appendChild(row);
        }

        document.getElementById("no-users").hidden = shown !== 0;
    }

    async function loadUsers(doneMessage) {
        try {
            let response = await fetch("/api/admin/users");
            let data = await response.json();
            if (!response.ok) {
                if (response.status === 401) {
                    sessionStorage.setItem("textswap-login-return", "/admin/user-management.html");
                    window.location.href = "../account/login.html";
                    return;
                }
                accessMessage.textContent = data.message || "Administrator access is required.";
                accessMessage.className = "admin-access-message admin-access-message--error";
                return;
            }
            users = data.users;
            currentUserId = data.currentUserId;
            accessMessage.hidden = true;
            content.hidden = false;
            if (doneMessage) {
                showMessage(doneMessage, "success");
            } else {
                showMessage("Loaded " + users.length + " registered account(s). Passwords are never displayed here.", "success");
            }
            updateTotals();
            render();
        } catch (err) {
            accessMessage.textContent = "Could not connect to the server.";
            accessMessage.className = "admin-access-message admin-access-message--error";
        }
    }

    document.getElementById("admin-filters").addEventListener("submit", function (event) {
        event.preventDefault();
        render();
    });

    document.getElementById("user-search").addEventListener("input", render);
    document.getElementById("status-filter").addEventListener("change", render);
    document.getElementById("role-filter").addEventListener("change", render);

    body.addEventListener("click", async function (event) {
        let button = event.target.closest("button[data-id]");
        if (!button) {
            return;
        }
        let nextStatus = button.getAttribute("data-next-status");
        let oldText = button.textContent;
        button.disabled = true;
        button.textContent = "Updating...";
        button.setAttribute("aria-busy", "true");

        try {
            let response = await fetch("/api/admin/users/" + button.getAttribute("data-id") + "/status", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus })
            });
            let data = await response.json();

            if (response.status === 401) {
                sessionStorage.setItem("textswap-login-return", "/admin/user-management.html");
                window.location.href = "../account/login.html";
                return;
            }
            if (response.status === 403) {
                body.innerHTML = "";
                content.hidden = true;
                accessMessage.hidden = false;
                accessMessage.textContent = data.message || "Administrator access is required.";
                accessMessage.className = "admin-access-message admin-access-message--error";
                return;
            }

            showMessage(data.message || "Could not update the account.", response.ok ? "success" : "error");
            if (response.ok) {
                await loadUsers(data.message);
            } else {
                button.disabled = false;
                button.textContent = oldText;
                button.removeAttribute("aria-busy");
            }
        } catch (err) {
            showMessage("Could not connect to the server.", "error");
            button.disabled = false;
            button.textContent = oldText;
            button.removeAttribute("aria-busy");
        }
    });

    loadUsers();
});
