"use strict";

const form = document.querySelector("#new-thread-form");
const statusBox = document.querySelector("#new-thread-status");
const loginBox = document.querySelector("#new-thread-login");
const titleInput = document.querySelector("#thread-title");
const contentInput = document.querySelector("#thread-content");
const imageInput = document.querySelector("#thread-image");
const submitButton = document.querySelector("#create-thread-button");
let submitting = false;

function validImage(value) {
    if (/^https?:\/\/[^\s]+$/i.test(value)) {
        return true;
    }
    if (value.indexOf("..") !== -1) {
        return false;
    }
    return /^\/assets\/images\/[a-z0-9_.%()\- /]+$/i.test(value);
}

function showError(input, message) {
    let error = document.querySelector("#" + input.id + "-error");
    error.textContent = message;
    if (message) {
        input.classList.add("forum-input-error");
        input.setAttribute("aria-invalid", "true");
    } else {
        input.classList.remove("forum-input-error");
        input.removeAttribute("aria-invalid");
    }
}

function validateInput(input) {
    let value = input.value.trim();
    let message = "";

    if (input === titleInput && (value.length < 3 || value.length > 120)) {
        message = "Title must be between 3 and 120 characters.";
    } else if (input === contentInput && (value.length < 1 || value.length > 3000)) {
        message = "Post content is required and must be 3000 characters or less.";
    } else if (input === imageInput && !validImage(value)) {
        message = "Use an http(s) image URL or a path beginning /assets/images/.";
    }

    showError(input, message);
    return message === "";
}

function validateForm() {
    let titleOk = validateInput(titleInput);
    let contentOk = validateInput(contentInput);
    let imageOk = validateInput(imageInput);
    return titleOk && contentOk && imageOk;
}

async function checkLogin() {
    try {
        let response = await fetch("/api/account/me");
        if (response.status === 401 || response.status === 403) {
            statusBox.textContent = "";
            loginBox.hidden = false;
            form.hidden = true;
            return;
        }
        if (!response.ok) {
            throw new Error("Your account could not be checked.");
        }

        statusBox.textContent = "";
        loginBox.hidden = true;
        form.hidden = false;
        titleInput.focus();
    } catch (err) {
        statusBox.className = "forum-status forum-status--error";
        statusBox.textContent = err.message + " Refresh this page to try again.";
    }
}

titleInput.addEventListener("input", function () {
    validateInput(titleInput);
});

contentInput.addEventListener("input", function () {
    document.querySelector("#thread-content-count").textContent = contentInput.value.length;
    validateInput(contentInput);
});

imageInput.addEventListener("input", function () {
    validateInput(imageInput);
});

form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (submitting || !validateForm()) {
        statusBox.className = "forum-status forum-status--error";
        statusBox.textContent = "Please correct the highlighted fields.";
        let firstError = form.querySelector('[aria-invalid="true"]');
        if (firstError) {
            firstError.focus();
        }
        return;
    }

    submitting = true;
    submitButton.disabled = true;
    submitButton.textContent = "Creating Discussion...";
    statusBox.className = "forum-status";
    statusBox.textContent = "Creating your discussion...";

    try {
        let response = await fetch("/api/forum/threads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: titleInput.value.trim(),
                content: contentInput.value.trim(),
                imageUrl: imageInput.value.trim()
            })
        });
        let data = await response.json();

        if (response.status === 401 || response.status === 403) {
            form.hidden = true;
            loginBox.hidden = false;
            throw new Error(data.message || "Login is required.");
        }
        if (!response.ok) {
            throw new Error(data.message || "The discussion could not be created.");
        }

        statusBox.textContent = "Discussion created. Opening it now...";
        window.location.href = "thread-detail.html?id=" + encodeURIComponent(data.thread.id);
    } catch (err) {
        submitting = false;
        submitButton.disabled = false;
        submitButton.textContent = "Create Discussion";
        statusBox.className = "forum-status forum-status--error";
        statusBox.textContent = err.message;
    }
});

checkLogin();
