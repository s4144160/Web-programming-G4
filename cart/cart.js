"use strict";

let TEXTSWAP_PRODUCTS = [];
let SERVER_CART = [];

const CART_STORAGE_KEY = "textswap-shopping-cart-v3";
const ORDER_ID_STORAGE_KEY = "textswap-last-order-id-v1";
const CHECKOUT_STORAGE_KEY = "textswap-checkout-draft-v1";
const STANDARD_DELIVERY_FEE = 30000;
const MAX_QUANTITY = 99;

function findProduct(productId) {
    return TEXTSWAP_PRODUCTS.find(function (product) {
        return product.id === productId;
    });
}

function normaliseCart(value) {
    if (!Array.isArray(value)) {
        return null;
    }

    const quantities = new Map();

    value.forEach(function (entry) {
        const product = entry && findProduct(entry.id);
        const quantity = Number(entry && entry.quantity);

        if (!product || !Number.isInteger(quantity) || quantity < 1) {
            return;
        }

        const previousQuantity = quantities.get(product.id) || 0;
        quantities.set(product.id, Math.min(previousQuantity + quantity, MAX_QUANTITY));
    });

    return Array.from(quantities, function (entry) {
        return { id: entry[0], quantity: entry[1] };
    });
}

function saveCart(cart) {
    const cleanCart = normaliseCart(cart) || [];
    SERVER_CART = cleanCart;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cleanCart));
    updateCartCount();
}

function loadCart() {
    return SERVER_CART;
}

async function requestAPI(url, options) {
    const response = await fetch(url, options);
    let data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "The server could not complete the request.");
    }
    return data;
}

async function loadServerData() {
    TEXTSWAP_PRODUCTS = await requestAPI("/api/products");
    const cart = await requestAPI("/api/cart");
    saveCart(cart);
}

function formatVND(amount) {
    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0
    }).format(amount) + "₫";
}

function escapeHTML(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function cartWithProductDetails(cart) {
    return cart.map(function (entry) {
        const product = findProduct(entry.id);
        return Object.assign({}, product, { quantity: entry.quantity });
    }).filter(function (entry) {
        return entry.id;
    });
}

function calculateSubtotal(cart) {
    return cartWithProductDetails(cart).reduce(function (total, item) {
        return total + (item.price * item.quantity);
    }, 0);
}

function updateCartCount() {
    const quantity = loadCart().reduce(function (total, item) {
        return total + item.quantity;
    }, 0);
    const label = quantity === 1 ? "1 item" : quantity + " items";

    document.querySelectorAll("[data-cart-count]").forEach(function (element) {
        element.textContent = label;
    });

    document.querySelectorAll(".product-cart-link").forEach(function (link) {
        link.setAttribute("aria-label", "View shopping cart with " + label);
    });
}

function announce(element, message) {
    if (element) {
        element.textContent = message;
    }
}

function initialiseProductPage() {
    const productGrid = document.querySelector("[data-product-grid]");
    if (!productGrid) {
        return;
    }

    const feedback = document.querySelector("[data-product-feedback]");
    const filterForm = document.querySelector(".product-filter-form");
    const searchInput = document.querySelector("#product-search");
    const subjectSelect = document.querySelector("#subject-filter");
    const conditionSelect = document.querySelector("#condition-filter");
    const sortSelect = document.querySelector("#product-sort");

    function renderProducts() {
        const search = searchInput.value.trim().toLowerCase();
        let items = [];

        for (let i = 0; i < TEXTSWAP_PRODUCTS.length; i += 1) {
            let product = TEXTSWAP_PRODUCTS[i];
            let searchable = (product.title + " " + product.author + " " + product.detail + " " + product.course).toLowerCase();
            let matchesSearch = !search || searchable.includes(search);
            let matchesSubject = subjectSelect.value === "all" || product.subject === subjectSelect.value;
            let matchesCondition = conditionSelect.value === "all" || product.conditionValue === conditionSelect.value;

            if (matchesSearch && matchesSubject && matchesCondition) {
                items.push(product);
            }
        }

        items.sort(function (first, second) {
            if (sortSelect.value === "price-low") {
                return first.price - second.price;
            } else if (sortSelect.value === "price-high") {
                return second.price - first.price;
            } else if (sortSelect.value === "title") {
                return first.title.localeCompare(second.title);
            }
            return TEXTSWAP_PRODUCTS.indexOf(first) - TEXTSWAP_PRODUCTS.indexOf(second);
        });

        if (!items.length) {
            productGrid.innerHTML = "<div class=\"cart-empty-state\"><h3>No textbooks found</h3><p>Try different search or filter choices.</p></div>";
            return;
        }

        let html = "";
        for (let i = 0; i < items.length; i += 1) {
            let product = items[i];
            let conditionClass = "";
            if (product.conditionValue === "good") {
                conditionClass = " condition-tag--good";
            } else if (product.conditionValue === "like-new") {
                conditionClass = " condition-tag--new";
            }

            html += `<article class="product-card">
                <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.imageAlt)}">
                <div class="product-card__body">
                    <div class="product-card__topline"><span class="condition-tag${conditionClass}">${escapeHTML(product.condition)}</span><span class="product-card__course">${escapeHTML(product.course)}</span></div>
                    <h2>${escapeHTML(product.shortTitle)}</h2>
                    <p class="product-card__author">${escapeHTML(product.authorDisplay)} · ${escapeHTML(product.edition)}</p>
                    <dl class="product-card__details">
                        <div><dt>Seller</dt><dd>${escapeHTML(product.sellerCode)}</dd></div>
                        <div><dt>Pickup</dt><dd>${escapeHTML(product.pickup)}</dd></div>
                    </dl>
                    <div class="product-card__footer">
                        <strong>${formatVND(product.price)}</strong>
                        <a href="cart.html" class="product-add-button" data-product-id="${escapeHTML(product.id)}">Add to Cart</a>
                    </div>
                </div>
            </article>`;
        }
        productGrid.innerHTML = html;
    }

    productGrid.addEventListener("click", async function (event) {
        const button = event.target.closest("[data-product-id]");
        if (!button) {
            return;
        }
        event.preventDefault();

        const product = findProduct(button.dataset.productId);
        if (!product) {
            return;
        }

        try {
            const data = await requestAPI("/api/cart", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: product.id, quantity: 1 })
            });
            saveCart(data.cart);
            button.textContent = "Added to Cart";
            button.classList.add("product-add-button--added");
            announce(feedback, product.title + " was added to your cart.");
        } catch (error) {
            announce(feedback, error.message);
        }
    });

    filterForm.addEventListener("submit", function (event) {
        event.preventDefault();
        renderProducts();
    });
    searchInput.addEventListener("input", renderProducts);
    subjectSelect.addEventListener("change", renderProducts);
    conditionSelect.addEventListener("change", renderProducts);
    sortSelect.addEventListener("change", renderProducts);

    renderProducts();
}

function cartItemTemplate(item) {
    const inputId = "quantity-" + item.id;
    const subtotal = item.price * item.quantity;

    return `
        <article class="cart-item" data-cart-item="${escapeHTML(item.id)}">
            <figure class="cart-item__media">
                <img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.imageAlt)}">
                <figcaption>Textbook cover</figcaption>
            </figure>
            <div class="cart-item__details">
                <h3>${escapeHTML(item.title)}</h3>
                <p class="cart-item__author">${escapeHTML(item.author)}</p>
                <dl class="cart-item__facts">
                    <div><dt>Edition</dt><dd>${escapeHTML(item.edition)}</dd></div>
                    <div><dt>${escapeHTML(item.detailLabel)}</dt><dd>${escapeHTML(item.detail)}</dd></div>
                    <div><dt>Condition</dt><dd>${escapeHTML(item.condition)}</dd></div>
                    <div><dt>Seller</dt><dd>${escapeHTML(item.seller)}</dd></div>
                </dl>
            </div>
            <div class="cart-item__purchase">
                <p class="cart-item__price"><span>Unit price</span>${formatVND(item.price)}</p>
                <p class="cart-item__subtotal"><span>Subtotal</span>${formatVND(subtotal)}</p>
                <label class="quantity-control" for="${escapeHTML(inputId)}">
                    <span>Quantity</span>
                    <input type="number" id="${escapeHTML(inputId)}" min="1" max="${MAX_QUANTITY}" step="1" value="${item.quantity}" data-cart-quantity="${escapeHTML(item.id)}" aria-label="Quantity for ${escapeHTML(item.title)}">
                </label>
                <button class="remove-button" type="button" data-remove-item="${escapeHTML(item.id)}">Remove</button>
            </div>
        </article>`;
}

function initialiseCartPage() {
    const itemsContainer = document.querySelector("[data-cart-items]");
    if (!itemsContainer) {
        return;
    }

    const searchInput = document.querySelector("#cart-search");
    const sortSelect = document.querySelector("#cart-sort");
    const feedback = document.querySelector("[data-cart-feedback]");
    const checkoutLink = document.querySelector("[data-checkout-link]");

    function updateCartSummary(cart) {
        const unitCount = cart.reduce(function (total, item) {
            return total + item.quantity;
        }, 0);
        const titleCount = cart.length;
        const countMessage = document.querySelector("#cart-count-message");
        const subtotal = calculateSubtotal(cart);
        const deliveryFee = cart.length ? STANDARD_DELIVERY_FEE : 0;

        countMessage.textContent = titleCount + (titleCount === 1 ? " title" : " titles") +
            " and " + unitCount + (unitCount === 1 ? " item" : " items") + " in your saved cart.";
        document.querySelector("[data-cart-subtotal]").textContent = formatVND(subtotal);
        document.querySelector("[data-cart-delivery]").textContent = formatVND(deliveryFee);
        document.querySelector("[data-cart-total]").textContent = formatVND(subtotal + deliveryFee);

        checkoutLink.classList.toggle("cart-action--disabled", !cart.length);
        checkoutLink.setAttribute("aria-disabled", String(!cart.length));
        updateCartCount();
    }

    function renderCart() {
        const cart = loadCart();
        const allItems = cartWithProductDetails(cart);
        const searchTerm = searchInput.value.trim().toLocaleLowerCase();
        const sortValue = sortSelect.value;
        let displayedItems = allItems.filter(function (item) {
            return item.title.toLocaleLowerCase().includes(searchTerm);
        });

        displayedItems.sort(function (firstItem, secondItem) {
            if (sortValue === "price-ascending") {
                return firstItem.price - secondItem.price;
            }
            if (sortValue === "price-descending") {
                return secondItem.price - firstItem.price;
            }
            if (sortValue === "quantity") {
                return secondItem.quantity - firstItem.quantity || firstItem.title.localeCompare(secondItem.title);
            }
            return firstItem.title.localeCompare(secondItem.title);
        });

        if (!allItems.length) {
            itemsContainer.innerHTML = `
                <div class="cart-empty-state">
                    <h3>Your cart is empty</h3>
                    <p>Add a textbook from the product catalogue to begin an order.</p>
                    <a class="cart-action cart-action--primary" href="products.html">Browse Textbooks</a>
                </div>`;
        } else if (!displayedItems.length) {
            itemsContainer.innerHTML = `
                <div class="cart-empty-state">
                    <h3>No matching textbooks</h3>
                    <p>Try a different product title in the search box.</p>
                </div>`;
        } else {
            itemsContainer.innerHTML = displayedItems.map(cartItemTemplate).join("");
        }

        updateCartSummary(cart);
    }

    async function handleQuantityChange(event) {
        const input = event.target.closest("[data-cart-quantity]");
        if (!input) {
            return;
        }

        const cart = loadCart();
        const item = cart.find(function (cartEntry) {
            return cartEntry.id === input.dataset.cartQuantity;
        });
        const quantity = Number(input.value);

        if (!item) {
            renderCart();
            return;
        }

        if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
            input.setAttribute("aria-invalid", "true");
            input.classList.add("is-invalid");
            announce(feedback, "Quantity must be a whole number from 1 to " + MAX_QUANTITY + ". The previous quantity was kept.");
            input.value = item.quantity;
            return;
        }

        input.removeAttribute("aria-invalid");
        input.classList.remove("is-invalid");

        try {
            const data = await requestAPI("/api/cart/" + encodeURIComponent(item.id), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quantity: quantity })
            });
            saveCart(data.cart);
            announce(feedback, "Quantity updated.");
            renderCart();
        } catch (error) {
            announce(feedback, error.message);
            renderCart();
        }
    }

    itemsContainer.addEventListener("change", handleQuantityChange);
    itemsContainer.addEventListener("focusout", handleQuantityChange);

    itemsContainer.addEventListener("click", async function (event) {
        const removeButton = event.target.closest("[data-remove-item]");
        if (!removeButton) {
            return;
        }

        const product = findProduct(removeButton.dataset.removeItem);
        try {
            const data = await requestAPI("/api/cart/" + encodeURIComponent(removeButton.dataset.removeItem), {
                method: "DELETE"
            });
            saveCart(data.cart);
            announce(feedback, product ? product.title + " was removed from your cart." : "Item removed.");
            renderCart();
        } catch (error) {
            announce(feedback, error.message);
        }
    });

    searchInput.addEventListener("input", renderCart);
    sortSelect.addEventListener("change", renderCart);
    document.querySelector(".cart-toolbar").addEventListener("submit", function (event) {
        event.preventDefault();
    });
    checkoutLink.addEventListener("click", function (event) {
        if (!loadCart().length) {
            event.preventDefault();
            announce(feedback, "Add at least one textbook before proceeding to checkout.");
        }
    });

    renderCart();
}

function deliveryFeeFor(method) {
    if (method === "express") {
        return 60000;
    }
    if (method === "pickup") {
        return 0;
    }
    if (method === "standard") {
        return STANDARD_DELIVERY_FEE;
    }
    return 0;
}

function deliveryMethodLabel(method) {
    if (method === "express") {
        return "Express delivery";
    }
    if (method === "pickup") {
        return "RMIT campus pickup";
    }
    if (method === "standard") {
        return "Standard delivery";
    }
    return "";
}

function initialiseCheckoutPage() {
    const form = document.querySelector("[data-checkout-form]");
    if (!form) {
        return;
    }

    const itemsList = document.querySelector("[data-checkout-items]");
    const deliverySelect = document.querySelector("#delivery-method");
    const placeOrderButton = form.querySelector(".place-order-button");
    const feedback = document.querySelector("[data-checkout-feedback]");

    function showFieldError(field, message) {
        const error = document.querySelector("#" + field.id + "-error");
        if (error) {
            error.textContent = message;
        }

        if (message) {
            field.classList.add("input-error");
            field.setAttribute("aria-invalid", "true");
        } else {
            field.classList.remove("input-error");
            field.removeAttribute("aria-invalid");
        }
    }

    function checkField(field, showError) {
        let value = field.value.trim();
        let message = "";

        if (field.id === "full-name" || field.id === "cardholder-name") {
            if (value.length < 2) {
                message = "Please enter a name with at least 2 characters.";
            } else if (/[0-9]/.test(value)) {
                message = "A name should not contain numbers.";
            }
        } else if (field.id === "email") {
            if (!value) {
                message = "Please enter your email address.";
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                message = "Please enter a valid email address.";
            }
        } else if (field.id === "phone") {
            if (!/^[0-9]{10}$/.test(value)) {
                message = "Phone number must contain 10 digits.";
            }
        } else if (field.id === "street-address") {
            if (value.length < 5) {
                message = "Please enter a complete street address.";
            }
        } else if (field.id === "district-ward") {
            if (value.length < 2) {
                message = "Please enter your district or ward.";
            }
        } else if (field.id === "province-city") {
            if (!value) {
                message = "Please select a province or city.";
            }
        } else if (field.id === "postal-code") {
            if (!/^[0-9]{6}$/.test(value)) {
                message = "Postal code must contain 6 digits.";
            }
        } else if (field.id === "delivery-method") {
            if (!value) {
                message = "Please select a delivery method.";
            }
        } else if (field.id === "card-number") {
            const cardDigits = value.replace(/\s/g, "");
            if (!/^[0-9]{16}$/.test(cardDigits)) {
                message = "Card number must contain 16 digits.";
            }
        } else if (field.id === "expiry-date") {
            if (!/^[0-9]{2}\/[0-9]{2}$/.test(value)) {
                message = "Use the format MM/YY.";
            } else {
                const parts = value.split("/");
                const month = Number(parts[0]);
                const year = 2000 + Number(parts[1]);
                const now = new Date();

                if (month < 1 || month > 12) {
                    message = "Enter a month from 01 to 12.";
                } else if (year < now.getFullYear() ||
                    (year === now.getFullYear() && month < now.getMonth() + 1)) {
                    message = "The card expiry date has already passed.";
                }
            }
        } else if (field.id === "cvv") {
            if (!/^[0-9]{3}$/.test(value)) {
                message = "CVV must contain 3 digits.";
            }
        } else if (field.id === "order-confirmation") {
            if (!field.checked) {
                message = "Please confirm the order details.";
            }
        }

        if (showError) {
            showFieldError(field, message);
        }
        return !message;
    }

    function checkForm(showErrors) {
        const fields = form.querySelectorAll("input, select");
        let valid = true;

        for (let i = 0; i < fields.length; i += 1) {
            if (!checkField(fields[i], showErrors)) {
                valid = false;
            }
        }
        return valid;
    }

    function updatePlaceOrderButton() {
        const cart = loadCart();
        placeOrderButton.disabled = !cart.length || !checkForm(false);
    }

    function saveCheckoutDraft() {
        const data = {
            name: document.querySelector("#full-name").value,
            email: document.querySelector("#email").value,
            phone: document.querySelector("#phone").value,
            street: document.querySelector("#street-address").value,
            district: document.querySelector("#district-ward").value,
            city: document.querySelector("#province-city").value,
            postcode: document.querySelector("#postal-code").value,
            delivery: document.querySelector("#delivery-method").value
        };
        localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(data));
    }

    function restoreCheckoutDraft() {
        try {
            const data = JSON.parse(localStorage.getItem(CHECKOUT_STORAGE_KEY));
            if (!data) {
                return;
            }

            document.querySelector("#full-name").value = data.name || "";
            document.querySelector("#email").value = data.email || "";
            document.querySelector("#phone").value = data.phone || "";
            document.querySelector("#street-address").value = data.street || "";
            document.querySelector("#district-ward").value = data.district || "";
            document.querySelector("#province-city").value = data.city || "";
            document.querySelector("#postal-code").value = data.postcode || "";
            document.querySelector("#delivery-method").value = data.delivery || "";
        } catch (error) {
            localStorage.removeItem(CHECKOUT_STORAGE_KEY);
        }
    }

    function renderCheckoutSummary() {
        const cart = loadCart();
        const items = cartWithProductDetails(cart);
        const subtotal = calculateSubtotal(cart);
        const deliveryFee = items.length ? deliveryFeeFor(deliverySelect.value) : 0;

        if (items.length) {
            itemsList.innerHTML = items.map(function (item) {
                return `<li>
                    <span>${escapeHTML(item.title)} <small>Quantity: ${item.quantity}</small></span>
                    <strong>${formatVND(item.price * item.quantity)}</strong>
                </li>`;
            }).join("");
        } else {
            itemsList.innerHTML = "<li>Your cart is empty. Return to the product catalogue to add a textbook.</li>";
        }

        document.querySelector("[data-checkout-subtotal]").textContent = formatVND(subtotal);
        document.querySelector("[data-checkout-delivery]").textContent = formatVND(deliveryFee);
        document.querySelector("[data-checkout-total]").textContent = formatVND(subtotal + deliveryFee) + " VND";
        updatePlaceOrderButton();
        updateCartCount();
    }

    restoreCheckoutDraft();

    const fields = form.querySelectorAll("input, select");
    for (let i = 0; i < fields.length; i += 1) {
        fields[i].addEventListener("input", function () {
            const field = fields[i];

            if (field.id === "phone" || field.id === "postal-code" || field.id === "cvv") {
                field.value = field.value.replace(/[^0-9]/g, "").slice(0, field.maxLength);
            }

            if (field.id === "card-number") {
                const digits = field.value.replace(/[^0-9]/g, "").slice(0, 16);
                let cardNumber = "";
                for (let j = 0; j < digits.length; j += 1) {
                    if (j > 0 && j % 4 === 0) {
                        cardNumber += " ";
                    }
                    cardNumber += digits[j];
                }
                field.value = cardNumber;
            }

            if (field.id === "expiry-date") {
                const expiry = field.value.replace(/[^0-9]/g, "").slice(0, 4);
                if (expiry.length > 2) {
                    field.value = expiry.slice(0, 2) + "/" + expiry.slice(2);
                } else {
                    field.value = expiry;
                }
            }

            checkField(field, true);
            if (field.id !== "cardholder-name" && field.id !== "card-number" &&
                field.id !== "expiry-date" && field.id !== "cvv" &&
                field.id !== "order-confirmation") {
                saveCheckoutDraft();
            }
            updatePlaceOrderButton();
        });

        fields[i].addEventListener("change", function () {
            checkField(fields[i], true);
            if (fields[i].id !== "cardholder-name" && fields[i].id !== "card-number" &&
                fields[i].id !== "expiry-date" && fields[i].id !== "cvv" &&
                fields[i].id !== "order-confirmation") {
                saveCheckoutDraft();
            }
            if (fields[i].id === "delivery-method") {
                renderCheckoutSummary();
            }
            updatePlaceOrderButton();
        });

        fields[i].addEventListener("blur", function () {
            checkField(fields[i], true);
        });
    }

    form.addEventListener("submit", async function (event) {
        const cart = loadCart();
        if (!cart.length) {
            event.preventDefault();
            announce(feedback, "Your cart is empty. Add a textbook before placing an order.");
            return;
        }

        if (!checkForm(true)) {
            event.preventDefault();
            announce(feedback, "Please correct the highlighted checkout fields.");
            return;
        }

        event.preventDefault();

        const formData = new FormData(form);
        const reqData = {
            deliveryMethod: formData.get("delivery-method"),
            confirmed: formData.get("order-confirmation") === "on",
            customer: {
                name: formData.get("full-name"),
                email: formData.get("email"),
                phone: formData.get("phone")
            },
            address: {
                street: formData.get("street-address"),
                district: formData.get("district-ward"),
                city: formData.get("province-city"),
                postcode: formData.get("postal-code")
            },
            payment: {
                cardholderName: formData.get("cardholder-name"),
                cardNumber: formData.get("card-number"),
                expiryDate: formData.get("expiry-date"),
                cvv: formData.get("cvv")
            }
        };

        try {
            const data = await requestAPI("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reqData)
            });

            // only keep the order ID, not the card details
            localStorage.setItem(ORDER_ID_STORAGE_KEY, data.orderId);
            localStorage.removeItem(CHECKOUT_STORAGE_KEY);
            saveCart([]);
            window.location.href = "confirmation.html?orderId=" + encodeURIComponent(data.orderId);
        } catch (error) {
            announce(feedback, error.message);
        }
    });

    renderCheckoutSummary();
}

function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) {
        element.textContent = value;
    }
}

async function loadLastOrder() {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("orderId") || localStorage.getItem(ORDER_ID_STORAGE_KEY);
    if (!orderId) {
        return null;
    }

    try {
        return await requestAPI("/api/orders/" + encodeURIComponent(orderId));
    } catch (error) {
        console.warn("TextSwap could not load the order.", error);
    }
    return null;
}

async function initialiseConfirmationPage() {
    const tableBody = document.querySelector("[data-confirmation-items]");
    if (!tableBody) {
        return;
    }

    const order = await loadLastOrder();
    if (!order || !order.items.length) {
        return;
    }

    document.querySelector("[data-confirmation-icon]").textContent = "✓";
    document.querySelector("[data-confirmation-eyebrow]").textContent = "Purchase complete";
    document.querySelector("[data-confirmation-heading]").textContent = "Order Confirmed";
    document.querySelector("[data-confirmation-message]").textContent =
        "Thank you, " + order.customer.name + ", for your purchase. Your textbook order has been received.";
    document.querySelector("[data-confirmation-meta]").hidden = false;
    document.querySelector("[data-confirmation-details]").hidden = false;

    const items = order.items;
    tableBody.innerHTML = items.map(function (item) {
        return `<tr>
            <td>${escapeHTML(item.title)}</td>
            <td>${item.quantity}</td>
            <td>${formatVND(item.price * item.quantity)}</td>
        </tr>`;
    }).join("");

    const orderDate = new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
    }).format(new Date(order.orderedAt));

    setText("[data-confirmation-number]", order.id);
    setText("[data-confirmation-date]", orderDate);
    setText("[data-confirmation-customer]", order.customer.name);
    setText("[data-confirmation-email]", order.customer.email);
    setText("[data-confirmation-phone]", order.customer.phone);
    setText("[data-confirmation-street]", order.address.street);
    setText("[data-confirmation-district]", order.address.district);
    setText("[data-confirmation-city]", order.address.city);
    setText("[data-confirmation-postcode]", "Postal code: " + order.address.postcode);
    setText("[data-confirmation-subtotal]", formatVND(order.subtotal));
    setText("[data-confirmation-delivery]", formatVND(order.deliveryFee));
    setText("[data-confirmation-total]", formatVND(order.total) + " VND");
    setText("[data-confirmation-method]", deliveryMethodLabel(order.deliveryMethod));

    const emailLink = document.querySelector("[data-confirmation-email]");
    const phoneLink = document.querySelector("[data-confirmation-phone]");
    emailLink.href = "mailto:" + order.customer.email;
    phoneLink.href = "tel:" + order.customer.phone;
    updateCartCount();
}

async function initialiseCartModule() {
    // Remove storage created by the old demo version.
    localStorage.removeItem("textswap-shopping-cart");
    localStorage.removeItem("textswap-shopping-cart-v2");
    localStorage.removeItem("textswap-last-order");
    localStorage.removeItem("textswap-last-order-v2");
    localStorage.removeItem("textswap-last-order-v3");

    try {
        await loadServerData();
    } catch (error) {
        const feedback = document.querySelector("[data-product-feedback], [data-cart-feedback], [data-checkout-feedback]");
        announce(feedback, "Could not connect to the Shopping Cart server. Start NodeJS and refresh this page.");
        const productGrid = document.querySelector("[data-product-grid]");
        if (productGrid) {
            productGrid.innerHTML = "<p>Products could not be loaded from the server.</p>";
        }
        return;
    }

    updateCartCount();
    initialiseProductPage();
    initialiseCartPage();
    initialiseCheckoutPage();
    await initialiseConfirmationPage();
}

window.addEventListener("storage", function (event) {
    if (event.key === CART_STORAGE_KEY) {
        try {
            SERVER_CART = normaliseCart(JSON.parse(event.newValue)) || [];
        } catch (error) {
            SERVER_CART = [];
        }
        updateCartCount();
    }
});

initialiseCartModule();
