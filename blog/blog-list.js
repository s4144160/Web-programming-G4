"use strict";

const searchForm = document.querySelector("#blog-search-form");
const searchInput = document.querySelector("#blog-search");
const searchField = document.querySelector("#blog-search-field");
const tagFilter = document.querySelector("#blog-tag");
const sortSelect = document.querySelector("#blog-sort");
const fromInput = document.querySelector("#blog-from");
const toInput = document.querySelector("#blog-to");
const statusBox = document.querySelector("#blog-status");
const resultCount = document.querySelector("#blog-result-count");
const postList = document.querySelector("#blog-post-list");
let searchTimer = null;

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

function formatDate(value) {
    return new Intl.DateTimeFormat("en-AU", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(new Date(value));
}

function setStatus(message, error) {
    statusBox.textContent = message;
    statusBox.className = error ? "blog-status blog-status--error" : "blog-status";
}

function addTags(parent, tags) {
    let box = makeElement("div", "blog-tags");
    for (let i = 0; i < tags.length; i++) {
        box.appendChild(makeElement("span", "blog-tag", tags[i]));
    }
    parent.appendChild(box);
}

function renderPosts(posts) {
    postList.innerHTML = "";
    resultCount.textContent = posts.length === 1 ? "1 post" : posts.length + " posts";

    if (!posts.length) {
        let empty = makeElement("div", "blog-empty");
        empty.appendChild(makeElement("h3", "", "No Blog posts found"));
        empty.appendChild(makeElement("p", "", "Try changing the search or create the first Blog post."));
        let link = makeElement("a", "btn btn-primary", "Create Blog Post");
        link.href = "new-post.html";
        empty.appendChild(link);
        postList.appendChild(empty);
        return;
    }

    for (let i = 0; i < posts.length; i++) {
        let post = posts[i];
        let card = makeElement("article", "blog-card");
        let imageLink = makeElement("a", "blog-card__image");
        imageLink.href = "blog-detail.html?id=" + encodeURIComponent(post.id);
        let image = document.createElement("img");
        image.src = post.imageUrl;
        image.alt = "Thumbnail for Blog post: " + post.title;
        image.addEventListener("error", function () {
            image.hidden = true;
        });
        imageLink.appendChild(image);
        card.appendChild(imageLink);

        let body = makeElement("div", "blog-card__body");
        let heading = makeElement("h3", "blog-card__title");
        let titleLink = makeElement("a", "", post.title);
        titleLink.href = "blog-detail.html?id=" + encodeURIComponent(post.id);
        heading.appendChild(titleLink);
        body.appendChild(heading);
        body.appendChild(makeElement("p", "blog-card__meta", "By " + post.authorName + " · Added " + formatDate(post.createdAt)));
        addTags(body, post.tags);
        body.appendChild(makeElement("p", "blog-card__summary", post.contentSummary));

        let footer = makeElement("div", "blog-card__footer");
        footer.appendChild(makeElement("span", "blog-comment-count", post.commentCount === 1 ? "1 comment" : post.commentCount + " comments"));
        let readMore = makeElement("a", "btn btn-outline", "Read More");
        readMore.href = "blog-detail.html?id=" + encodeURIComponent(post.id);
        footer.appendChild(readMore);
        body.appendChild(footer);
        card.appendChild(body);
        postList.appendChild(card);
    }
}

function updateTagOptions(tags) {
    let selected = tagFilter.value;
    tagFilter.innerHTML = "";
    let all = document.createElement("option");
    all.value = "";
    all.textContent = "All tags";
    tagFilter.appendChild(all);
    for (let i = 0; i < tags.length; i++) {
        let option = document.createElement("option");
        option.value = tags[i];
        option.textContent = tags[i];
        tagFilter.appendChild(option);
    }
    if (Array.from(tagFilter.options).some(function (option) { return option.value === selected; })) {
        tagFilter.value = selected;
    }
}

async function loadPosts() {
    setStatus("Loading Blog posts...", false);
    postList.innerHTML = "";
    let params = new URLSearchParams();
    if (searchInput.value.trim()) {
        params.set("search", searchInput.value.trim());
    }
    params.set("field", searchField.value);
    params.set("sort", sortSelect.value);
    if (tagFilter.value) {
        params.set("tag", tagFilter.value);
    }
    if (fromInput.value) {
        params.set("from", fromInput.value);
    }
    if (toInput.value) {
        params.set("to", toInput.value);
    }

    try {
        let response = await fetch("/api/blog/posts?" + params.toString());
        let data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Blog posts could not be loaded.");
        }
        updateTagOptions(data.availableTags || []);
        renderPosts(data.posts || []);
        setStatus("", false);
    } catch (err) {
        resultCount.textContent = "0 posts";
        setStatus(err.message, true);
        let empty = makeElement("div", "blog-empty", "Please try loading the Blog again.");
        postList.appendChild(empty);
    }
}

searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    loadPosts();
});

searchInput.addEventListener("input", function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadPosts, 350);
});

searchField.addEventListener("change", loadPosts);
tagFilter.addEventListener("change", loadPosts);
sortSelect.addEventListener("change", loadPosts);
fromInput.addEventListener("change", loadPosts);
toInput.addEventListener("change", loadPosts);

loadPosts();
