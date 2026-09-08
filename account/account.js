document.addEventListener("DOMContentLoaded", function () {
    let page = document.body.getAttribute("data-account-page");

    function message(box, text, error) {
        if (!box) {
            return;
        }
        box.textContent = text;
        box.className = "form-message is-visible " + (error ? "is-error" : "is-success");
    }

    function fieldError(form, name, text) {
        let box = form.querySelector('[data-error-for="' + name + '"]');
        if (box) {
            box.textContent = text;
        }
    }

    function emailOk(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    async function send(url, method, data) {
        let options = { method: method, headers: {} };
        if (data) {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(data);
        }
        let response = await fetch(url, options);
        let result = await response.json();
        return { ok: response.ok, status: response.status, data: result };
    }

    function goToLogin() {
        window.location.href = "login.html";
    }

    let registerForm = document.getElementById("register-form");
    if (registerForm) {
        let fields = registerForm.querySelectorAll("input, textarea");

        function checkRegisterField(input) {
            let value = input.value.trim();
            let error = "";

            if (input.name === "username" && !/^[A-Za-z0-9_]{3,30}$/.test(value)) {
                error = "Use 3 to 30 letters, numbers, or underscores.";
            }
            if (input.name === "name" && (value.length < 2 || value.length > 80)) {
                error = "Name must be between 2 and 80 characters.";
            }
            if (input.name === "email" && !emailOk(value)) {
                error = "Enter a valid email address.";
            }
            if (input.name === "description" && value.length > 300) {
                error = "Description must be 300 characters or less.";
            }
            if (input.name === "password" && input.value.length < 6) {
                error = "Password must be at least 6 characters.";
            }
            if (input.name === "confirmPassword" && input.value !== registerForm.password.value) {
                error = "Passwords do not match.";
            }

            fieldError(registerForm, input.name, error);
            return error === "";
        }

        for (let i = 0; i < fields.length; i++) {
            fields[i].addEventListener("input", function () {
                checkRegisterField(fields[i]);
                if (fields[i].name === "password") {
                    checkRegisterField(registerForm.confirmPassword);
                }
            });
        }

        registerForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            let valid = true;
            for (let i = 0; i < fields.length; i++) {
                if (!checkRegisterField(fields[i])) {
                    valid = false;
                }
            }
            if (!valid) {
                message(document.getElementById("register-message"), "Please fix the highlighted fields.", true);
                return;
            }

            let data = {
                username: registerForm.username.value,
                name: registerForm.name.value,
                email: registerForm.email.value,
                description: registerForm.description.value,
                password: registerForm.password.value,
                confirmPassword: registerForm.confirmPassword.value
            };

            try {
                let result = await send("/api/account/register", "POST", data);
                if (!result.ok) {
                    message(document.getElementById("register-message"), result.data.message, true);
                    return;
                }
                window.location.href = "profile.html";
            } catch (err) {
                message(document.getElementById("register-message"), "Could not connect to the server.", true);
            }
        });
    }

    let loginForm = document.getElementById("login-form");
    if (loginForm) {
        let loginInputs = loginForm.querySelectorAll("input");
        for (let i = 0; i < loginInputs.length; i++) {
            loginInputs[i].addEventListener("input", function () {
                let text = loginInputs[i].value.trim() ? "" : "This field is required.";
                fieldError(loginForm, loginInputs[i].name, text);
            });
        }

        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            if (!loginForm.identifier.value.trim() || !loginForm.password.value) {
                fieldError(loginForm, "identifier", loginForm.identifier.value.trim() ? "" : "This field is required.");
                fieldError(loginForm, "password", loginForm.password.value ? "" : "This field is required.");
                return;
            }

            try {
                let result = await send("/api/account/login", "POST", {
                    identifier: loginForm.identifier.value,
                    password: loginForm.password.value
                });
                if (!result.ok) {
                    message(document.getElementById("login-message"), result.data.message, true);
                    return;
                }
                let returnUrl = sessionStorage.getItem("textswap-login-return");
                sessionStorage.removeItem("textswap-login-return");
                if (returnUrl && returnUrl.indexOf("/cart/") === 0) {
                    window.location.href = returnUrl;
                } else if (result.data.user.role === "admin") {
                    window.location.href = "../admin/user-management.html";
                } else {
                    window.location.href = "profile.html";
                }
            } catch (err) {
                message(document.getElementById("login-message"), "Could not connect to the server.", true);
            }
        });
    }

    let resetForm = document.getElementById("reset-form");
    if (resetForm) {
        let resetInputs = resetForm.querySelectorAll("input");
        for (let i = 0; i < resetInputs.length; i++) {
            resetInputs[i].addEventListener("input", function () {
                let error = "";
                if (!resetInputs[i].value.trim()) {
                    error = "This field is required.";
                }
                if (resetInputs[i].name === "newPassword" && resetInputs[i].value.length < 6) {
                    error = "Password must be at least 6 characters.";
                }
                if (resetInputs[i].name === "confirmPassword" && resetInputs[i].value !== resetForm.newPassword.value) {
                    error = "Passwords do not match.";
                }
                fieldError(resetForm, resetInputs[i].name, error);
            });
        }

        resetForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            if (!resetForm.identifier.value.trim() || resetForm.newPassword.value.length < 6 || resetForm.newPassword.value !== resetForm.confirmPassword.value) {
                message(document.getElementById("reset-message"), "Please check the form fields.", true);
                return;
            }

            try {
                let result = await send("/api/account/reset-password", "POST", {
                    identifier: resetForm.identifier.value,
                    newPassword: resetForm.newPassword.value,
                    confirmPassword: resetForm.confirmPassword.value
                });
                message(document.getElementById("reset-message"), result.data.message, !result.ok);
                if (result.ok) {
                    resetForm.reset();
                }
            } catch (err) {
                message(document.getElementById("reset-message"), "Could not connect to the server.", true);
            }
        });
    }

    async function loadProfile() {
        try {
            let result = await send("/api/account/me", "GET");
            if (!result.ok) {
                goToLogin();
                return;
            }
            let user = result.data.user;
            document.getElementById("profile-name").textContent = user.name;
            document.getElementById("profile-username").textContent = user.username;
            document.getElementById("profile-email").textContent = user.email;
            document.getElementById("profile-role").textContent = user.role;
            document.getElementById("profile-status").textContent = user.status;
            document.getElementById("profile-description").textContent = user.description || "No description added yet.";
            document.getElementById("profile-joined").textContent = new Date(user.createdAt).toLocaleDateString();
            let avatar = document.getElementById("profile-avatar");
            if (user.profileImage) {
                let image = document.createElement("img");
                image.className = "profile-avatar";
                image.alt = user.name + " profile image";
                image.src = user.profileImage;
                avatar.replaceWith(image);
            } else {
                avatar.textContent = user.name.charAt(0).toUpperCase();
            }
        } catch (err) {
            message(document.getElementById("profile-message"), "Could not load the profile.", true);
        }
    }

    async function loadEditProfile() {
        let form = document.getElementById("profile-form");
        try {
            let result = await send("/api/account/me", "GET");
            if (!result.ok) {
                goToLogin();
                return;
            }
            form.name.value = result.data.user.name;
            form.email.value = result.data.user.email;
            form.description.value = result.data.user.description || "";
            form.profileImage.value = result.data.user.profileImage || "";
        } catch (err) {
            message(document.getElementById("profile-form-message"), "Could not load the profile.", true);
        }
    }

    if (page === "profile") {
        loadProfile();
    }

    let profileForm = document.getElementById("profile-form");
    if (profileForm) {
        loadEditProfile();
        profileForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            let name = profileForm.name.value.trim();
            let email = profileForm.email.value.trim();
            let description = profileForm.description.value.trim();
            let profileImage = profileForm.profileImage.value.trim();

            fieldError(profileForm, "name", name.length >= 2 ? "" : "Name must be at least 2 characters.");
            fieldError(profileForm, "email", emailOk(email) ? "" : "Enter a valid email address.");
            fieldError(profileForm, "description", description.length <= 300 ? "" : "Description must be 300 characters or less.");
            if (name.length < 2 || !emailOk(email) || description.length > 300) {
                return;
            }

            try {
                let result = await send("/api/account/profile", "PUT", {
                    name: name,
                    email: email,
                    description: description,
                    profileImage: profileImage
                });
                message(document.getElementById("profile-form-message"), result.data.message, !result.ok);
            } catch (err) {
                message(document.getElementById("profile-form-message"), "Could not connect to the server.", true);
            }
        });
    }

    let passwordForm = document.getElementById("password-form");
    if (passwordForm) {
        passwordForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            if (!passwordForm.currentPassword.value || passwordForm.newPassword.value.length < 6 || passwordForm.newPassword.value !== passwordForm.confirmPassword.value) {
                message(document.getElementById("password-message"), "Check the password fields. The new password needs at least 6 characters and both copies must match.", true);
                return;
            }

            try {
                let result = await send("/api/account/password", "PUT", {
                    currentPassword: passwordForm.currentPassword.value,
                    newPassword: passwordForm.newPassword.value,
                    confirmPassword: passwordForm.confirmPassword.value
                });
                message(document.getElementById("password-message"), result.data.message, !result.ok);
                if (result.ok) {
                    passwordForm.reset();
                }
            } catch (err) {
                message(document.getElementById("password-message"), "Could not connect to the server.", true);
            }
        });
    }

    let logoutButtons = document.querySelectorAll("[data-logout]");
    for (let i = 0; i < logoutButtons.length; i++) {
        logoutButtons[i].addEventListener("click", async function () {
            await send("/api/account/logout", "POST");
            localStorage.removeItem("textswap-shopping-cart-v3");
            localStorage.removeItem("textswap-last-order-id-v1");
            goToLogin();
        });
    }

    let deactivate = document.getElementById("deactivate-account");
    if (deactivate) {
        deactivate.addEventListener("click", async function () {
            let answer = window.confirm("Deactivate your account? You will be logged out and will not be able to use this account again.");
            if (!answer) {
                return;
            }
            let result = await send("/api/account/deactivate", "POST");
            if (result.ok) {
                localStorage.removeItem("textswap-shopping-cart-v3");
                localStorage.removeItem("textswap-last-order-id-v1");
                goToLogin();
            } else {
                message(document.getElementById("profile-message"), result.data.message, true);
            }
        });
    }
});
