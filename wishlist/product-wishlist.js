"use strict";

let wishlistLoggedIn = false;
let savedWishlistProducts = [];
let wishlistButtonPending = "";

function updateProductWishlistButtons() {
    let buttons = document.querySelectorAll("[data-wishlist-product-id]");
    for (let i = 0; i < buttons.length; i++) {
        let productId = buttons[i].dataset.wishlistProductId;
        if (wishlistButtonPending === productId) {
            buttons[i].disabled = true;
            buttons[i].textContent = "Saving...";
        } else if (savedWishlistProducts.indexOf(productId) !== -1) {
            buttons[i].disabled = true;
            buttons[i].textContent = "Saved ✓";
        } else {
            buttons[i].disabled = false;
            buttons[i].textContent = "♡ Save";
        }
    }
}

function productWishlistMessage(message) {
    let feedback = document.querySelector("[data-product-feedback]");
    if (feedback) {
        feedback.textContent = message;
    }
}

async function loadProductWishlist() {
    try {
        let loginResponse = await fetch("/api/account/me");
        if (!loginResponse.ok) {
            wishlistLoggedIn = false;
            updateProductWishlistButtons();
            return;
        }
        wishlistLoggedIn = true;
        let response = await fetch("/api/wishlist");
        if (!response.ok) {
            return;
        }
        let data = await response.json();
        savedWishlistProducts = [];
        for (let i = 0; i < data.items.length; i++) {
            if (data.items[i].status === "saved") {
                savedWishlistProducts.push(data.items[i].productId);
            }
        }
        updateProductWishlistButtons();
    } catch (error) {
        productWishlistMessage("Wishlist buttons could not be loaded.");
    }
}

document.addEventListener("click", async function (event) {
    let btn = event.target.closest("[data-wishlist-product-id]");
    if (!btn || wishlistButtonPending) {
        return;
    }
    event.preventDefault();

    if (!wishlistLoggedIn) {
        sessionStorage.setItem("textswap-login-return", window.location.pathname + window.location.search);
        window.location.href = "../account/login.html";
        return;
    }

    let productId = btn.dataset.wishlistProductId;
    wishlistButtonPending = productId;
    updateProductWishlistButtons();
    productWishlistMessage("Saving product to your wishlist...");
    try {
        let response = await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: productId })
        });
        let data = await response.json();
        if (!response.ok && response.status !== 409) {
            throw new Error(data.message || "Could not save this product.");
        }
        if (savedWishlistProducts.indexOf(productId) === -1) {
            savedWishlistProducts.push(productId);
        }
        productWishlistMessage(response.status === 409 ? "This product is already in your wishlist." : data.message);
    } catch (error) {
        productWishlistMessage(error.message);
    }
    wishlistButtonPending = "";
    updateProductWishlistButtons();
});

let productGrid = document.querySelector("[data-product-grid]");
if (productGrid) {
    let observer = new MutationObserver(function () {
        updateProductWishlistButtons();
    });
    observer.observe(productGrid, { childList: true });
}

loadProductWishlist();
