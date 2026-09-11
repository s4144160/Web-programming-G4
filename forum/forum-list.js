"use strict";

const searchForm = document.querySelector("#forum-search-form");
const searchInput = document.querySelector("#forum-search");
const fieldSelect = document.querySelector("#forum-search-field");
const sortSelect = document.querySelector("#forum-sort");
const threadList = document.querySelector("#forum-thread-list");
const statusBox = document.querySelector("#forum-list-status");
const resultCount = document.querySelector("#forum-result-count");
let searchTimer = null;

function formatDate(value) {
    return new Intl.DateTimeFormat("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    }).format(new Date(value));
}

function addText(parent, tag, className, text) {
    let element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    element.textContent = text;
    parent.appendChild(element);
    return element;
}

function renderThreads(items) {
    threadList.innerHTML = "";
    threadList.setAttribute("aria-busy", "false");
    resultCount.textContent = items.length === 1 ? "1 discussion" : items.length + " discussions";

    if (!items.length) {
        let empty = document.createElement("div");
        empty.className = "forum-empty";
        addText(empty, "h3", "", "No discussions found");
        addText(empty, "p", "", "Try a different search or start a new discussion.");
        let link = document.createElement("a");
        link.href = "new-thread.html";
        link.className = "btn btn-primary";
        link.textContent = "New Discussion";
        empty.appendChild(link);
        threadList.appendChild(empty);
        return;
    }

    for (let i = 0; i < items.length; i++) {
        let thread = items[i];
        let card = document.createElement("article");
        card.className = "thread-card";

        if (thread.imageUrl) {
            let imageLink = document.createElement("a");
            imageLink.href = "thread-detail.html?id=" + encodeURIComponent(thread.id);
            imageLink.className = "thread-card__image";
            let image = document.createElement("img");
            image.src = thread.imageUrl;
            image.alt = "Image for discussion: " + thread.title;
            image.addEventListener("error", function () {
                imageLink.hidden = true;
            });
            imageLink.appendChild(image);
            card.appendChild(imageLink);
        }

        let body = document.createElement("div");
        body.className = "thread-card__body";
        let title = addText(body, "h3", "thread-card__title", thread.title);
        let titleLink = document.createElement("a");
        titleLink.href = "thread-detail.html?id=" + encodeURIComponent(thread.id);
        titleLink.textContent = title.textContent;
        title.textContent = "";
        title.appendChild(titleLink);

        addText(body, "p", "thread-card__preview", thread.contentPreview);
        addText(body, "p", "thread-card__meta", "Started by " + thread.authorName + " on " + formatDate(thread.createdAt));
        addText(body, "p", "thread-card__meta", "Last activity " + formatDate(thread.lastActivityAt));

        let footer = document.createElement("div");
        footer.className = "thread-card__footer";
        addText(footer, "span", "forum-badge", thread.visibleReplyCount === 1 ? "1 visible reply" : thread.visibleReplyCount + " visible replies");
        let open = document.createElement("a");
        open.href = "thread-detail.html?id=" + encodeURIComponent(thread.id);
        open.className = "btn btn-outline";
        open.textContent = "Open Discussion";
        footer.appendChild(open);
        body.appendChild(footer);
        card.appendChild(body);
        threadList.appendChild(card);
    }
}

async function loadThreads() {
    statusBox.textContent = "Loading Forum threads...";
    statusBox.className = "forum-status";
    threadList.setAttribute("aria-busy", "true");

    let params = new URLSearchParams();
    if (searchInput.value.trim()) {
        params.set("search", searchInput.value.trim());
    }
    params.set("field", fieldSelect.value);
    params.set("sort", sortSelect.value);

    try {
        let response = await fetch("/api/forum/threads?" + params.toString());
        let data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Forum threads could not be loaded.");
        }

        renderThreads(data.threads || []);
        statusBox.textContent = "";
    } catch (err) {
        threadList.innerHTML = "";
        threadList.setAttribute("aria-busy", "false");
        resultCount.textContent = "Unavailable";
        statusBox.className = "forum-status forum-status--error";
        statusBox.textContent = err.message + " Please refresh and try again.";
    }
}

searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    loadThreads();
});

searchInput.addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadThreads, 350);
});

fieldSelect.addEventListener("change", loadThreads);
sortSelect.addEventListener("change", loadThreads);

loadThreads();
