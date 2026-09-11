"use strict";

let wishlistItems = [];
let pendingProduct = "";

function wishlistRequest(url, options) {
    return fetch(url, options).then(function (response) {
        return response.json().then(function (data) {
            if (!response.ok) {
                let error = new Error(data.message || "The request could not be completed.");
                error.status = response.status;
                throw error;
            }
            return data;
        });
    });
}

function wishlistMoney(value) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value) + "₫";
}

function wishlistDate(value) {
    if (!value) {
        return "Date unavailable";
    }
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function setWishlistMessage(message, isError) {
    let box = document.querySelector("[data-wishlist-message]");
    box.textContent = message;
    if (isError) {
        box.classList.add("is-error");
    } else {
        box.classList.remove("is-error");
    }
}

function makeText(tag, className, content) {
    let element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    element.textContent = content;
    return element;
}

function statusLabel(status) {
    if (status === "moved-to-cart") {
        return "Moved to cart";
    }
    if (status === "purchased") {
        return "Purchased";
    }
    return "Saved";
}

function makeAction(text, action, productId, primary) {
    let btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wishlist-action" + (primary ? " wishlist-action--primary" : "");
    btn.dataset.wishlistAction = action;
    btn.dataset.productId = productId;
    btn.textContent = text;
    if (pendingProduct === productId) {
        btn.disabled = true;
    }
    return btn;
}

function makeCard(item) {
    let product = item.product;
    let card = document.createElement("article");
    card.className = "wishlist-card";
    card.dataset.wishlistProduct = item.productId;

    let image = document.createElement("img");
    image.src = product.image;
    image.alt = product.imageAlt;
    card.appendChild(image);

    let body = document.createElement("div");
    body.className = "wishlist-card__body";
    let badge = makeText("span", "wishlist-card__status", statusLabel(item.status));
    if (item.status !== "saved") {
        badge.classList.add("wishlist-card__status--history");
    }
    body.appendChild(badge);
    body.appendChild(makeText("h3", "", product.title));
    body.appendChild(makeText("p", "wishlist-card__book", product.author + " · " + product.edition));
    body.appendChild(makeText("p", "wishlist-card__book", product.course + " · " + product.condition));
    body.appendChild(makeText("strong", "wishlist-card__price", wishlistMoney(product.price)));
    body.appendChild(makeText("p", "wishlist-card__date", "Saved " + wishlistDate(item.addedAt)));

    if (item.status === "moved-to-cart") {
        body.appendChild(makeText("p", "wishlist-card__date", "Moved " + wishlistDate(item.movedToCartAt)));
    } else if (item.status === "purchased") {
        body.appendChild(makeText("p", "wishlist-card__date", "Marked purchased " + wishlistDate(item.purchasedAt)));
    }

    let stats = document.createElement("div");
    stats.className = "wishlist-stats";
    stats.setAttribute("aria-label", "Product statistics");
    stats.appendChild(makeText("span", "", "Saved by " + item.stats.savedUsers + (item.stats.savedUsers === 1 ? " user" : " users")));
    stats.appendChild(makeText("span", "", item.stats.everSaved + (item.stats.everSaved === 1 ? " user ever saved" : " users ever saved")));
    stats.appendChild(makeText("span", "", "Currently in " + item.stats.carts + (item.stats.carts === 1 ? " cart" : " carts")));
    stats.appendChild(makeText("span", "", item.stats.cartQuantity + " copies in carts"));
    stats.appendChild(makeText("span", "", item.stats.purchasedQuantity + " copies purchased"));
    body.appendChild(stats);

    let link = document.createElement("a");
    link.className = "wishlist-reference";
    link.href = "../cart/products.html";
    link.textContent = "Browse original product catalogue";
    body.appendChild(link);

    let actions = document.createElement("div");
    actions.className = "wishlist-actions";
    if (item.status === "saved") {
        actions.appendChild(makeAction(pendingProduct === item.productId ? "Moving..." : "Move to Cart", "move", item.productId, true));
        actions.appendChild(makeAction("Mark Purchased", "purchased", item.productId, false));
        let remove = makeAction("Remove", "remove", item.productId, false);
        remove.classList.add("wishlist-action--danger");
        actions.appendChild(remove);
    } else if (item.status === "moved-to-cart") {
        let cartLink = document.createElement("a");
        cartLink.className = "wishlist-action wishlist-action--primary";
        cartLink.href = "../cart/cart.html";
        cartLink.textContent = "View Cart";
        actions.appendChild(cartLink);
        actions.appendChild(makeAction("Mark Purchased", "purchased", item.productId, false));
    }
    body.appendChild(actions);
    card.appendChild(body);
    return card;
}

function renderWishlist() {
    let activeBox = document.querySelector("[data-active-wishlist]");
    let historyBox = document.querySelector("[data-wishlist-history]");
    let search = document.querySelector("#wishlist-search").value.trim().toLowerCase();
    let status = document.querySelector("#wishlist-status").value;
    let sort = document.querySelector("#wishlist-sort").value;
    let filtered = [];

    for (let i = 0; i < wishlistItems.length; i++) {
        let item = wishlistItems[i];
        let searchable = (item.product.title + " " + item.product.author).toLowerCase();
        if ((!search || searchable.indexOf(search) !== -1) && (status === "all" || item.status === status)) {
            filtered.push(item);
        }
    }

    filtered.sort(function (a, b) {
        if (sort === "oldest") {
            return new Date(a.addedAt) - new Date(b.addedAt);
        } else if (sort === "title") {
            return a.product.title.localeCompare(b.product.title);
        } else if (sort === "price-low") {
            return a.product.price - b.product.price;
        } else if (sort === "price-high") {
            return b.product.price - a.product.price;
        }
        return new Date(b.addedAt) - new Date(a.addedAt);
    });

    activeBox.textContent = "";
    historyBox.textContent = "";
    let activeCount = 0;
    let historyCount = 0;
    for (let i = 0; i < filtered.length; i++) {
        if (filtered[i].status === "saved") {
            activeBox.appendChild(makeCard(filtered[i]));
            activeCount = activeCount + 1;
        } else {
            historyBox.appendChild(makeCard(filtered[i]));
            historyCount = historyCount + 1;
        }
    }

    if (!activeCount) {
        activeBox.appendChild(makeText("p", "wishlist-empty", "No active wishlist items match your choices."));
    }
    if (!historyCount) {
        historyBox.appendChild(makeText("p", "wishlist-empty", "No purchased or moved-to-cart items match your choices."));
    }
    document.querySelector("[data-active-count]").textContent = activeCount + (activeCount === 1 ? " item" : " items");
    document.querySelector("[data-history-count]").textContent = historyCount + (historyCount === 1 ? " item" : " items");
    document.querySelector("[data-wishlist-count]").textContent = filtered.length + (filtered.length === 1 ? " matching item" : " matching items");
}

async function loadWishlist() {
    try {
        let data = await wishlistRequest("/api/wishlist");
        wishlistItems = data.items || [];
        document.querySelector("[data-wishlist-content]").hidden = false;
        document.querySelector("[data-wishlist-login]").hidden = true;
        setWishlistMessage("Wishlist loaded.", false);
        renderWishlist();
    } catch (error) {
        if (error.status === 401) {
            document.querySelector("[data-wishlist-login]").hidden = false;
            document.querySelector("[data-wishlist-content]").hidden = true;
            setWishlistMessage("Please log in to view your wishlist.", false);
        } else {
            setWishlistMessage(error.message, true);
        }
    }
}

document.addEventListener("DOMContentLoaded", function () {
    let form = document.querySelector("[data-wishlist-filters]");
    form.addEventListener("submit", function (event) { event.preventDefault(); renderWishlist(); });
    document.querySelector("#wishlist-search").addEventListener("input", renderWishlist);
    document.querySelector("#wishlist-status").addEventListener("change", renderWishlist);
    document.querySelector("#wishlist-sort").addEventListener("change", renderWishlist);

    document.querySelector("[data-wishlist-content]").addEventListener("click", async function (event) {
        let btn = event.target.closest("[data-wishlist-action]");
        if (!btn || pendingProduct) {
            return;
        }

        let productId = btn.dataset.productId;
        let action = btn.dataset.wishlistAction;
        let url = "/api/wishlist/" + encodeURIComponent(productId);
        let options = { method: "DELETE" };
        if (action === "move") {
            url = url + "/move-to-cart";
            options.method = "POST";
        } else if (action === "purchased") {
            url = url + "/purchased";
            options.method = "PUT";
        }

        pendingProduct = productId;
        setWishlistMessage("Updating your wishlist...", false);
        renderWishlist();
        try {
            let data = await wishlistRequest(url, options);
            await loadWishlist();
            setWishlistMessage(data.message, false);
        } catch (error) {
            setWishlistMessage(error.message, true);
        }
        pendingProduct = "";
        renderWishlist();
    });

    loadWishlist();
});
