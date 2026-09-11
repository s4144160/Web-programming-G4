"use strict";

const params = new URLSearchParams(window.location.search);
const threadId = params.get("id");
const statusBox = document.querySelector("#thread-status");
const rootPost = document.querySelector("#root-post");
const repliesSection = document.querySelector("#replies-section");
const replyList = document.querySelector("#reply-list");
const replyPanel = document.querySelector("#reply-panel");
const replyLogin = document.querySelector("#reply-login");
const replyForm = document.querySelector("#reply-form");
const replyTitle = document.querySelector("#reply-title");
const replyContent = document.querySelector("#reply-content");
const replyImage = document.querySelector("#reply-image");
const replyButton = document.querySelector("#post-reply-button");
let currentUserId = null;
let currentThread = null;
let parentReplyId = null;
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
    statusBox.className = error ? "forum-status forum-status--error" : "forum-status";
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

function wasEdited(post) {
    return post.updatedAt && new Date(post.updatedAt).getTime() !== new Date(post.createdAt).getTime();
}

function validImage(value) {
    if (!value) {
        return true;
    }
    if (/^https?:\/\/[^\s]+$/i.test(value)) {
        return true;
    }
    if (value.indexOf("..") !== -1) {
        return false;
    }
    return /^\/assets\/images\/[a-z0-9_.%()\- /]+$/i.test(value);
}

function validateValues(values) {
    if (values.title.length < 3 || values.title.length > 120) {
        return "Title must be between 3 and 120 characters.";
    }
    if (values.content.length < 1 || values.content.length > 3000) {
        return "Post content is required and must be 3000 characters or less.";
    }
    if (!validImage(values.imageUrl) || values.imageUrl.length > 500) {
        return "Use an http(s) image URL or a path beginning /assets/images/.";
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
        let error = new Error(data.message || "The Forum request could not be completed.");
        error.status = response.status;
        throw error;
    }
    return data;
}

function addPostImage(parent, imageUrl, title) {
    if (!imageUrl) {
        return;
    }
    let image = document.createElement("img");
    image.className = "forum-post-image";
    image.src = imageUrl;
    image.alt = "Image for post: " + title;
    image.addEventListener("error", function () {
        image.hidden = true;
    });
    parent.appendChild(image);
}

function addPostMeta(parent, post) {
    let meta = makeElement("p", "forum-post-meta");
    meta.appendChild(makeElement("strong", "", post.authorName));
    meta.appendChild(document.createTextNode(" · Posted " + formatDate(post.createdAt)));
    if (wasEdited(post)) {
        meta.appendChild(document.createTextNode(" · Edited " + formatDate(post.updatedAt)));
    }
    parent.appendChild(meta);
}

function isOwner(post) {
    return currentUserId !== null && post.authorId === currentUserId;
}

function makeActionButton(label, className, action) {
    let button = makeElement("button", className, label);
    button.type = "button";
    button.addEventListener("click", action);
    return button;
}

function startReply(replyId, title) {
    parentReplyId = replyId;
    document.querySelector("#reply-target").textContent = replyId ? "Replying to: " + title : "Replying to the main discussion";
    document.querySelector("#cancel-reply-target").hidden = !replyId;
    replyPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    replyTitle.focus();
}

function addActions(parent, post, kind) {
    let actions = makeElement("div", "forum-post-actions");

    if (currentUserId !== null) {
        actions.appendChild(makeActionButton("Reply", "forum-text-button", function () {
            startReply(kind === "root" ? null : post.id, post.title);
        }));
    }

    if (isOwner(post)) {
        actions.appendChild(makeActionButton("Edit", "forum-text-button", function () {
            showEditForm(parent, post, kind);
        }));
        actions.appendChild(makeActionButton("Delete", "forum-text-button forum-text-button--danger", function () {
            deletePost(post, kind);
        }));
    }

    if (actions.childNodes.length) {
        parent.appendChild(actions);
    }
}

function createEditField(labelText, type, value, maxLength, optional) {
    let wrapper = makeElement("div", "forum-field");
    let id = "edit-" + type + "-" + Math.random().toString(16).slice(2);
    let label = makeElement("label", "", labelText);
    label.htmlFor = id;
    wrapper.appendChild(label);

    let input;
    if (type === "content") {
        input = document.createElement("textarea");
        input.rows = 6;
    } else {
        input = document.createElement("input");
        input.type = "text";
    }
    input.id = id;
    input.name = type;
    input.value = value;
    input.maxLength = maxLength;
    input.required = optional !== true;
    wrapper.appendChild(input);
    return wrapper;
}

function showEditForm(parent, post, kind) {
    let oldForm = document.querySelector(".forum-edit-form");
    if (oldForm) {
        oldForm.remove();
    }

    let form = makeElement("form", "forum-form forum-edit-form");
    let heading = makeElement("h3", "", kind === "root" ? "Edit Discussion" : "Edit Reply");
    form.appendChild(heading);
    form.appendChild(createEditField("Title", "title", post.title, 120));
    form.appendChild(createEditField("Post content", "content", post.content, 3000));
    form.appendChild(createEditField("Image URL or path (optional)", "imageUrl", post.imageUrl || "", 500, true));
    let formStatus = makeElement("p", "forum-error");
    formStatus.setAttribute("role", "status");
    formStatus.setAttribute("aria-live", "polite");
    form.appendChild(formStatus);

    let buttons = makeElement("div", "forum-form-actions");
    let save = makeElement("button", "btn btn-primary", "Save Changes");
    save.type = "submit";
    let cancel = makeActionButton("Cancel", "btn btn-outline", function () {
        form.remove();
    });
    buttons.appendChild(save);
    buttons.appendChild(cancel);
    form.appendChild(buttons);

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (pending) {
            return;
        }

        let values = {
            title: form.elements.title.value.trim(),
            content: form.elements.content.value.trim(),
            imageUrl: form.elements.imageUrl.value.trim()
        };
        let validationError = validateValues(values);
        if (validationError) {
            formStatus.textContent = validationError;
            return;
        }

        pending = true;
        save.disabled = true;
        save.textContent = "Saving...";
        formStatus.textContent = "Saving changes...";
        let url = "/api/forum/threads/" + encodeURIComponent(threadId);
        if (kind === "reply") {
            url += "/replies/" + encodeURIComponent(post.id);
        }

        try {
            await requestJson(url, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values)
            });
            pending = false;
            await loadThread("Changes saved.");
        } catch (err) {
            pending = false;
            save.disabled = false;
            save.textContent = "Save Changes";
            formStatus.textContent = err.message;
        }
    });

    parent.appendChild(form);
    form.elements.title.focus();
}

async function deletePost(post, kind) {
    let label = kind === "root" ? "this entire discussion" : "this reply";
    if (!window.confirm("Delete " + label + "? It will be hidden publicly but retained for auditing.")) {
        return;
    }
    if (pending) {
        return;
    }

    pending = true;
    setStatus("Deleting " + label + "...", false);
    let url = "/api/forum/threads/" + encodeURIComponent(threadId);
    if (kind === "reply") {
        url += "/replies/" + encodeURIComponent(post.id);
    }

    try {
        await requestJson(url, { method: "DELETE" });
        pending = false;
        if (kind === "root") {
            window.location.href = "forum-list.html";
            return;
        }
        await loadThread("Reply deleted. Its child replies remain in the discussion.");
    } catch (err) {
        pending = false;
        setStatus(err.message, true);
    }
}

function renderRoot() {
    rootPost.innerHTML = "";
    rootPost.hidden = false;
    rootPost.id = "root-post";

    let heading = makeElement("h1", "", currentThread.title);
    heading.id = "thread-heading";
    rootPost.appendChild(heading);
    addPostMeta(rootPost, currentThread);
    rootPost.appendChild(makeElement("p", "forum-post-content", currentThread.content));
    addPostImage(rootPost, currentThread.imageUrl, currentThread.title);
    addActions(rootPost, currentThread, "root");
    document.title = currentThread.title + " - TextSwap";
}

// Turn flat reply records into parent/child nodes before rendering the discussion tree.
// Deleted parents stay in the map, so their visible children keep the correct context.
function buildReplyTree(replies) {
    let nodes = {};
    let roots = [];

    for (let i = 0; i < replies.length; i++) {
        nodes[replies[i].id] = { reply: replies[i], children: [] };
    }

    for (let i = 0; i < replies.length; i++) {
        let node = nodes[replies[i].id];
        let parentId = replies[i].parentReplyId;
        if (parentId && nodes[parentId]) {
            nodes[parentId].children.push(node);
        } else {
            roots.push(node);
        }
    }

    return roots;
}

function renderReplyNode(node, depth) {
    let reply = node.reply;
    let wrapper = makeElement("article", "reply-node");
    wrapper.id = "post-" + reply.id;
    wrapper.setAttribute("aria-label", reply.isDeleted ? "Deleted reply" : "Reply: " + reply.title);
    wrapper.dataset.depth = Math.min(depth, 6);

    let card = makeElement("div", reply.isDeleted ? "reply-card reply-card--deleted" : "reply-card");
    if (reply.isDeleted) {
        card.appendChild(makeElement("h3", "", "Deleted reply"));
        card.appendChild(makeElement("p", "forum-post-content", "This post has been deleted."));
    } else {
        card.appendChild(makeElement("h3", "", reply.title));
        addPostMeta(card, reply);
        card.appendChild(makeElement("p", "forum-post-content", reply.content));
        addPostImage(card, reply.imageUrl, reply.title);
        addActions(card, reply, "reply");
    }
    wrapper.appendChild(card);

    if (node.children.length) {
        let children = makeElement("div", "reply-children");
        children.setAttribute("role", "group");
        for (let i = 0; i < node.children.length; i++) {
            children.appendChild(renderReplyNode(node.children[i], depth + 1));
        }
        wrapper.appendChild(children);
    }

    return wrapper;
}

function renderReplies() {
    replyList.innerHTML = "";
    repliesSection.hidden = false;
    let visibleCount = 0;
    for (let i = 0; i < currentThread.replies.length; i++) {
        if (!currentThread.replies[i].isDeleted) {
            visibleCount++;
        }
    }
    document.querySelector("#reply-count").textContent = visibleCount === 1 ? "1 visible reply" : visibleCount + " visible replies";

    if (!currentThread.replies.length) {
        let empty = makeElement("div", "forum-empty");
        empty.appendChild(makeElement("p", "", "No replies yet. Be the first to join the discussion."));
        replyList.appendChild(empty);
        return;
    }

    let tree = buildReplyTree(currentThread.replies);
    for (let i = 0; i < tree.length; i++) {
        replyList.appendChild(renderReplyNode(tree[i], 0));
    }
}

function updateReplyAccess() {
    if (currentUserId !== null) {
        replyPanel.hidden = false;
        replyLogin.hidden = true;
    } else {
        replyPanel.hidden = true;
        replyLogin.hidden = false;
    }
}

async function loadCurrentUser() {
    try {
        let response = await fetch("/api/account/me");
        if (response.status === 401 || response.status === 403) {
            currentUserId = null;
            return;
        }
        if (!response.ok) {
            throw new Error("Account status could not be checked.");
        }
        let data = await response.json();
        currentUserId = String(data.user.id);
    } catch (err) {
        currentUserId = null;
    }
}

async function loadThread(successMessage) {
    setStatus("Loading discussion...", false);
    rootPost.hidden = true;
    repliesSection.hidden = true;

    try {
        let data = await requestJson("/api/forum/threads/" + encodeURIComponent(threadId));
        currentThread = data.thread;
        renderRoot();
        renderReplies();
        updateReplyAccess();
        setStatus(successMessage || "", false);

        if (window.location.hash) {
            let target = document.getElementById(window.location.hash.slice(1));
            if (target) {
                target.scrollIntoView({ block: "center" });
                target.setAttribute("tabindex", "-1");
                target.focus();
            }
        }
    } catch (err) {
        rootPost.hidden = true;
        repliesSection.hidden = true;
        replyPanel.hidden = true;
        replyLogin.hidden = true;
        setStatus(err.message, true);
    }
}

function showReplyError(input, message) {
    document.querySelector("#" + input.id + "-error").textContent = message;
    if (message) {
        input.classList.add("forum-input-error");
        input.setAttribute("aria-invalid", "true");
    } else {
        input.classList.remove("forum-input-error");
        input.removeAttribute("aria-invalid");
    }
}

function validateReplyForm() {
    let values = {
        title: replyTitle.value.trim(),
        content: replyContent.value.trim(),
        imageUrl: replyImage.value.trim()
    };
    let titleError = values.title.length < 3 || values.title.length > 120 ? "Title must be between 3 and 120 characters." : "";
    let contentError = values.content.length < 1 || values.content.length > 3000 ? "Reply content is required and must be 3000 characters or less." : "";
    let imageError = !validImage(values.imageUrl) || values.imageUrl.length > 500 ? "Use an http(s) image URL or /assets/images/ path." : "";
    showReplyError(replyTitle, titleError);
    showReplyError(replyContent, contentError);
    showReplyError(replyImage, imageError);
    return { values: values, valid: !titleError && !contentError && !imageError };
}

replyTitle.addEventListener("input", function () {
    validateReplyForm();
});
replyContent.addEventListener("input", function () {
    document.querySelector("#reply-content-count").textContent = replyContent.value.length;
    validateReplyForm();
});
replyImage.addEventListener("input", function () {
    validateReplyForm();
});

document.querySelector("#cancel-reply-target").addEventListener("click", function () {
    startReply(null, currentThread.title);
});

replyForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (pending) {
        return;
    }

    let checked = validateReplyForm();
    if (!checked.valid) {
        setStatus("Please correct the highlighted reply fields.", true);
        let firstError = replyForm.querySelector('[aria-invalid="true"]');
        if (firstError) {
            firstError.focus();
        }
        return;
    }

    pending = true;
    replyButton.disabled = true;
    replyButton.textContent = "Posting Reply...";
    setStatus("Posting your reply...", false);
    checked.values.parentReplyId = parentReplyId;

    try {
        let data = await requestJson("/api/forum/threads/" + encodeURIComponent(threadId) + "/replies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(checked.values)
        });
        replyForm.reset();
        document.querySelector("#reply-content-count").textContent = "0";
        parentReplyId = null;
        document.querySelector("#reply-target").textContent = "Replying to the main discussion";
        document.querySelector("#cancel-reply-target").hidden = true;
        window.location.hash = "post-" + data.reply.id;
        pending = false;
        replyButton.disabled = false;
        replyButton.textContent = "Post Reply";
        await loadThread("Reply posted.");
    } catch (err) {
        pending = false;
        replyButton.disabled = false;
        replyButton.textContent = "Post Reply";
        setStatus(err.message, true);
    }
});

async function initialiseThreadPage() {
    if (!threadId || !/^[a-f0-9]{24}$/i.test(threadId)) {
        setStatus("A valid discussion ID was not provided.", true);
        return;
    }

    await loadCurrentUser();
    await loadThread();
}

initialiseThreadPage();
