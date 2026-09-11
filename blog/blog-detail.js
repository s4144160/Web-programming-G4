"use strict";

const params = new URLSearchParams(window.location.search);
const postId = params.get("id");
const statusBox = document.querySelector("#detail-status");
const postBox = document.querySelector("#blog-post");
const editSection = document.querySelector("#edit-section");
const commentsSection = document.querySelector("#comments-section");
const commentList = document.querySelector("#comment-list");
const commentFormPanel = document.querySelector("#comment-form-panel");
const commentLogin = document.querySelector("#comment-login");
const commentForm = document.querySelector("#comment-form");
const commentContent = document.querySelector("#comment-content");
const commentButton = document.querySelector("#comment-button");
let currentUserId = null;
let currentPost = null;
let pending = false;

function makeElement(tag, className, text) {
    let element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}

function setStatus(message, error) {
    statusBox.textContent = message;
    statusBox.className = error ? "blog-status blog-status--error" : "blog-status";
}

function formatDate(value) {
    return new Intl.DateTimeFormat("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    }).format(new Date(value));
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

function cleanTags(value) {
    let parts = value.split(",");
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

function validatePost(values) {
    if (values.title.length < 3 || values.title.length > 150) {
        return "Title must be between 3 and 150 characters.";
    }
    if (values.content.length < 10 || values.content.length > 10000) {
        return "Main content must be between 10 and 10000 characters.";
    }
    if (values.tags.length < 1 || values.tags.length > 10) {
        return "Add between 1 and 10 tags.";
    }
    for (let i = 0; i < values.tags.length; i++) {
        if (values.tags[i].length > 30 || !/^[a-z0-9][a-z0-9 &/_-]*$/i.test(values.tags[i])) {
            return "Tags may use letters, numbers, spaces, hyphens, slashes or underscores.";
        }
    }
    if (!validImage(values.imageUrl) || values.imageUrl.length > 500) {
        return "Use an http(s) image URL or /assets/images/ path.";
    }
    return "";
}

async function requestJson(url, options) {
    let response = await fetch(url, options);
    let data;
    try {
        data = await response.json();
    } catch (err) {
        data = {};
    }
    if (!response.ok) {
        throw new Error(data.message || "The Blog request could not be completed.");
    }
    return data;
}

function addTags(parent, tags) {
    let tagBox = makeElement("div", "blog-tags");
    for (let i = 0; i < tags.length; i++) {
        tagBox.appendChild(makeElement("span", "blog-tag", tags[i]));
    }
    parent.appendChild(tagBox);
}

function addImage(parent, imageUrl, title) {
    let image = document.createElement("img");
    image.className = "blog-post-image";
    image.src = imageUrl;
    image.alt = "Image for Blog post: " + title;
    image.addEventListener("error", function () {
        image.hidden = true;
    });
    parent.appendChild(image);
}

function makeButton(text, className, action) {
    let button = makeElement("button", className, text);
    button.type = "button";
    button.addEventListener("click", action);
    return button;
}

function renderPost() {
    postBox.innerHTML = "";
    postBox.hidden = false;
    let heading = makeElement("h1", "", currentPost.title);
    postBox.appendChild(heading);
    let meta = "By " + currentPost.authorName + " · Added " + formatDate(currentPost.createdAt);
    if (currentPost.editedAt) {
        meta += " · Edited " + formatDate(currentPost.editedAt);
    }
    postBox.appendChild(makeElement("p", "blog-post-meta", meta));
    addTags(postBox, currentPost.tags);
    addImage(postBox, currentPost.imageUrl, currentPost.title);
    postBox.appendChild(makeElement("p", "blog-post-content", currentPost.content));

    if (currentUserId !== null && currentUserId === currentPost.authorId) {
        let actions = makeElement("div", "blog-post-actions");
        actions.appendChild(makeButton("Edit Post", "btn btn-outline", showEditForm));
        actions.appendChild(makeButton("Delete Post", "btn btn-danger", deletePost));
        postBox.appendChild(actions);
    }
    document.title = currentPost.title + " - TextSwap";
}

function createEditField(labelText, name, value, textarea) {
    let wrapper = makeElement("div", "blog-field");
    let label = makeElement("label", "", labelText);
    label.htmlFor = "edit-" + name;
    wrapper.appendChild(label);
    let input = textarea ? document.createElement("textarea") : document.createElement("input");
    input.id = "edit-" + name;
    input.name = name;
    input.value = value;
    input.required = true;
    if (textarea) {
        input.rows = 12;
        input.maxLength = 10000;
    } else {
        input.type = "text";
        input.maxLength = name === "title" ? 150 : name === "tags" ? 320 : 500;
    }
    wrapper.appendChild(input);
    return wrapper;
}

function showEditForm() {
    editSection.innerHTML = "";
    editSection.hidden = false;
    let heading = makeElement("h2", "", "Edit Blog Post");
    heading.id = "edit-heading";
    editSection.appendChild(heading);
    let form = makeElement("form", "blog-form");
    form.noValidate = true;
    form.appendChild(createEditField("Title", "title", currentPost.title, false));
    form.appendChild(createEditField("Tags/categories", "tags", currentPost.tags.join(", "), false));
    form.appendChild(createEditField("Main content", "content", currentPost.content, true));
    form.appendChild(createEditField("Image URL or project path", "imageUrl", currentPost.imageUrl, false));
    let formStatus = makeElement("p", "blog-error");
    formStatus.setAttribute("role", "status");
    formStatus.setAttribute("aria-live", "polite");
    form.appendChild(formStatus);
    let actions = makeElement("div", "blog-form-actions");
    let save = makeElement("button", "btn btn-primary", "Save Changes");
    save.type = "submit";
    actions.appendChild(save);
    actions.appendChild(makeButton("Cancel", "btn btn-outline", function () {
        editSection.hidden = true;
        editSection.innerHTML = "";
    }));
    form.appendChild(actions);
    editSection.appendChild(form);

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (pending) {
            return;
        }
        let values = {
            title: form.elements.title.value.trim(),
            tags: cleanTags(form.elements.tags.value),
            content: form.elements.content.value.trim(),
            imageUrl: form.elements.imageUrl.value.trim()
        };
        let error = validatePost(values);
        if (error) {
            formStatus.textContent = error;
            return;
        }
        pending = true;
        save.disabled = true;
        save.textContent = "Saving...";
        try {
            let data = await requestJson("/api/blog/posts/" + encodeURIComponent(postId), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values)
            });
            currentPost = data.post;
            pending = false;
            editSection.hidden = true;
            editSection.innerHTML = "";
            renderPost();
            renderComments();
            setStatus("Blog post updated.", false);
        } catch (err) {
            pending = false;
            save.disabled = false;
            save.textContent = "Save Changes";
            formStatus.textContent = err.message;
        }
    });
    form.elements.title.focus();
    editSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function deletePost() {
    if (!window.confirm("Delete this Blog post and its comments?")) {
        return;
    }
    if (pending) {
        return;
    }
    pending = true;
    setStatus("Deleting Blog post...", false);
    try {
        await requestJson("/api/blog/posts/" + encodeURIComponent(postId), { method: "DELETE" });
        window.location.href = "blog-list.html";
    } catch (err) {
        pending = false;
        setStatus(err.message, true);
    }
}

function renderComments() {
    commentList.innerHTML = "";
    let count = currentPost.comments.length;
    document.querySelector("#comment-count").textContent = count === 1 ? "1 comment" : count + " comments";
    if (!count) {
        commentList.appendChild(makeElement("div", "blog-empty", "No comments yet."));
        return;
    }

    for (let i = 0; i < currentPost.comments.length; i++) {
        let comment = currentPost.comments[i];
        let card = makeElement("article", "comment-card");
        card.setAttribute("aria-label", "Comment by " + comment.authorName);
        card.appendChild(makeElement("p", "comment-meta", comment.authorName + " · " + formatDate(comment.createdAt)));
        card.appendChild(makeElement("p", "comment-content", comment.content));
        if (currentUserId !== null && currentUserId === comment.authorId) {
            card.appendChild(makeButton("Delete Comment", "blog-text-button blog-text-button--danger", function () {
                deleteComment(comment.id);
            }));
        }
        commentList.appendChild(card);
    }
}

async function deleteComment(commentId) {
    if (!window.confirm("Delete your comment?")) {
        return;
    }
    if (pending) {
        return;
    }
    pending = true;
    setStatus("Deleting comment...", false);
    try {
        await requestJson("/api/blog/posts/" + encodeURIComponent(postId) + "/comments/" + encodeURIComponent(commentId), { method: "DELETE" });
        pending = false;
        await loadPost("Comment deleted.");
    } catch (err) {
        pending = false;
        setStatus(err.message, true);
    }
}

commentContent.addEventListener("input", function () {
    document.querySelector("#comment-count-text").textContent = commentContent.value.length + "/1000 characters";
    let message = commentContent.value.trim() ? "" : "Comment is required.";
    document.querySelector("#comment-error").textContent = message;
    if (message) {
        commentContent.setAttribute("aria-invalid", "true");
    } else {
        commentContent.removeAttribute("aria-invalid");
    }
});

commentForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (pending) {
        return;
    }
    let content = commentContent.value.trim();
    if (!content || content.length > 1000) {
        document.querySelector("#comment-error").textContent = "Comment is required and must be 1000 characters or less.";
        commentContent.setAttribute("aria-invalid", "true");
        return;
    }
    pending = true;
    commentButton.disabled = true;
    commentButton.textContent = "Posting...";
    setStatus("Posting comment...", false);
    try {
        await requestJson("/api/blog/posts/" + encodeURIComponent(postId) + "/comments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: content })
        });
        commentContent.value = "";
        document.querySelector("#comment-count-text").textContent = "0/1000 characters";
        pending = false;
        commentButton.disabled = false;
        commentButton.textContent = "Post Comment";
        await loadPost("Comment added.");
    } catch (err) {
        pending = false;
        commentButton.disabled = false;
        commentButton.textContent = "Post Comment";
        setStatus(err.message, true);
    }
});

async function loadCurrentUser() {
    try {
        let response = await fetch("/api/account/me");
        if (response.status === 401 || response.status === 403) {
            currentUserId = null;
            return;
        }
        if (!response.ok) {
            throw new Error("Account could not be checked.");
        }
        let data = await response.json();
        currentUserId = String(data.user.id);
    } catch (err) {
        currentUserId = null;
    }
}

async function loadPost(successMessage) {
    if (!postId) {
        setStatus("No Blog post ID was provided.", true);
        return;
    }
    setStatus("Loading Blog post...", false);
    try {
        let data = await requestJson("/api/blog/posts/" + encodeURIComponent(postId));
        currentPost = data.post;
        renderPost();
        renderComments();
        commentsSection.hidden = false;
        commentFormPanel.hidden = currentUserId === null;
        commentLogin.hidden = currentUserId !== null;
        setStatus(successMessage || "", false);
    } catch (err) {
        postBox.hidden = true;
        commentsSection.hidden = true;
        editSection.hidden = true;
        setStatus(err.message, true);
    }
}

async function startPage() {
    await loadCurrentUser();
    await loadPost();
}

startPage();
