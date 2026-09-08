document.addEventListener("DOMContentLoaded", function () {
    let users = [];
    let currentUserId = "";
    let body = document.getElementById("user-table-body");
    let message = document.getElementById("admin-message");

    function showMessage(text) {
        message.textContent = text;
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

    async function loadUsers() {
        try {
            let response = await fetch("/api/admin/users");
            let data = await response.json();
            if (!response.ok) {
                showMessage(data.message);
                if (response.status === 401) {
                    window.location.href = "../account/login.html";
                }
                return;
            }
            users = data.users;
            currentUserId = data.currentUserId;
            showMessage("Loaded " + users.length + " registered account(s). Passwords are never displayed here.");
            updateTotals();
            render();
        } catch (err) {
            showMessage("Could not connect to the server.");
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
        let username = button.getAttribute("data-name");
        let answer = window.confirm("Change " + username + " to " + nextStatus + " status?");
        if (!answer) {
            return;
        }

        let response = await fetch("/api/admin/users/" + button.getAttribute("data-id") + "/status", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextStatus })
        });
        let data = await response.json();
        showMessage(data.message);
        if (response.ok) {
            await loadUsers();
        }
    });

    loadUsers();
});
