"use strict";

const form = document.querySelector("#new-post-form");
const loginBox = document.querySelector("#new-post-login");
const statusBox = document.querySelector("#new-post-status");
const titleInput = document.querySelector("#post-title");
const tagsInput = document.querySelector("#post-tags");
const contentInput = document.querySelector("#post-content");
const imageInput = document.querySelector("#post-image");
const publishButton = document.querySelector("#publish-post-button");
let pending = false;

function setStatus(message, error) {
    statusBox.textContent = message;
    statusBox.className = error ? "blog-status blog-status--error" : "blog-status";
}

function validImage(value) {
    if (/^https?:\/\/[^\s]+$/i.test(value)) {
        return true;
    }
    if (value.indexOf("..") !== -1) {
        return false;
    }
    return /^\/assets\/images\/[a-z0-9_.%()\- /]+$/i.test(value);
}

function getTags() {
    let parts = tagsInput.value.split(",");
    let tags = [];
    let seen = {};
    for (let i = 0; i < parts.length; i++) {
        let tag = parts[i].trim();
        let key = tag.toLowerCase();
        if (tag && !seen[key]) {
            tags.push(tag);
            seen[key] = true;
        }
    }
    return tags;
}

function showError(input, message) {
    document.querySelector("#" + input.id + "-error").textContent = message;
    if (message) {
        input.classList.add("blog-input-error");
        input.setAttribute("aria-invalid", "true");
    } else {
        input.classList.remove("blog-input-error");
        input.removeAttribute("aria-invalid");
    }
}

function checkForm() {
    let title = titleInput.value.trim();
    let content = contentInput.value.trim();
    let imageUrl = imageInput.value.trim();
    let tags = getTags();
    let titleError = title.length < 3 || title.length > 150 ? "Title must be between 3 and 150 characters." : "";
    let contentError = content.length < 10 || content.length > 10000 ? "Main content must be between 10 and 10000 characters." : "";
    let tagError = tags.length < 1 || tags.length > 10 ? "Add between 1 and 10 tags." : "";
    if (!tagError) {
        for (let i = 0; i < tags.length; i++) {
            if (tags[i].length > 30 || !/^[a-z0-9][a-z0-9 &/_-]*$/i.test(tags[i])) {
                tagError = "Tags may use letters, numbers, spaces, hyphens, slashes or underscores.";
            }
        }
    }
    let imageError = !validImage(imageUrl) || imageUrl.length > 500 ? "Use an http(s) image URL or /assets/images/ path." : "";

    showError(titleInput, titleError);
    showError(tagsInput, tagError);
    showError(contentInput, contentError);
    showError(imageInput, imageError);
    return {
        valid: !titleError && !tagError && !contentError && !imageError,
        values: { title: title, tags: tags, content: content, imageUrl: imageUrl }
    };
}

titleInput.addEventListener("input", checkForm);
tagsInput.addEventListener("input", checkForm);
contentInput.addEventListener("input", function () {
    document.querySelector("#post-content-count").textContent = contentInput.value.length + "/10000 characters";
    checkForm();
});
imageInput.addEventListener("input", checkForm);

form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (pending) {
        return;
    }
    let checked = checkForm();
    if (!checked.valid) {
        setStatus("Please correct the highlighted fields.", true);
        return;
    }

    pending = true;
    publishButton.disabled = true;
    publishButton.textContent = "Publishing...";
    setStatus("Publishing Blog post...", false);
    try {
        let response = await fetch("/api/blog/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(checked.values)
        });
        let data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "The Blog post could not be published.");
        }
        window.location.href = "blog-detail.html?id=" + encodeURIComponent(data.post.id);
    } catch (err) {
        pending = false;
        publishButton.disabled = false;
        publishButton.textContent = "Publish Post";
        setStatus(err.message, true);
    }
});

async function checkLogin() {
    try {
        let response = await fetch("/api/account/me");
        if (response.status === 401 || response.status === 403) {
            form.hidden = true;
            loginBox.hidden = false;
            setStatus("", false);
            return;
        }
        if (!response.ok) {
            throw new Error("Your account could not be checked.");
        }
        form.hidden = false;
        loginBox.hidden = true;
        setStatus("", false);
        titleInput.focus();
    } catch (err) {
        form.hidden = true;
        setStatus(err.message, true);
    }
}

checkLogin();
