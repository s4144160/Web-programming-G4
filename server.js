const express = require("express");
const path = require("path");
require("dotenv").config();
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Review = require("./models/Review");
const User = require("./models/User");
const auth = require("./middleware/auth");

const app = express();
const port = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI, { dbName: "textswap" })
    .then(async function () {
        console.log("✅ MongoDB connected");

        if (process.env.ADMIN_USERNAME && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
            let username = process.env.ADMIN_USERNAME.trim().toLowerCase();
            let email = process.env.ADMIN_EMAIL.trim().toLowerCase();
            let found = await User.findOne({
                $or: [
                    { username: username },
                    { email: email }
                ]
            });

            if (!found) {
                let passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
                await User.create({
                    username: username,
                    email: email,
                    passwordHash: passwordHash,
                    name: "TextSwap Administrator",
                    role: "admin",
                    status: "active"
                });
                console.log("✅ Admin account created");
            }
        }

        app.listen(port, function () {
            console.log("TextSwap running at http://localhost:" + port);
        });
    })
    .catch((err) => console.error("❌ MongoDB connection error:", err.message));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || "textswap-student-project-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 2
    }
}));

function userData(user) {
    return {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        description: user.description,
        profileImage: user.profileImage,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
}

function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.post("/api/account/register", async function (req, res) {
    let username = typeof req.body.username === "string" ? req.body.username.trim().toLowerCase() : "";
    let email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    let password = typeof req.body.password === "string" ? req.body.password : "";
    let confirmPassword = typeof req.body.confirmPassword === "string" ? req.body.confirmPassword : "";
    let name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    let description = typeof req.body.description === "string" ? req.body.description.trim() : "";

    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
        return res.status(400).json({ message: "Username must be 3 to 30 letters, numbers, or underscores." });
    }

    if (!validEmail(email)) {
        return res.status(400).json({ message: "Please enter a valid email address." });
    }

    if (name.length < 2 || name.length > 80) {
        return res.status(400).json({ message: "Name must be between 2 and 80 characters." });
    }

    if (description.length > 300) {
        return res.status(400).json({ message: "Description must be 300 characters or less." });
    }

    if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match." });
    }

    try {
        let found = await User.findOne({
            $or: [
                { username: username },
                { email: email }
            ]
        });

        if (found) {
            return res.status(409).json({ message: "That username or email is already registered." });
        }

        let passwordHash = await bcrypt.hash(password, 10);
        let user = await User.create({
            username: username,
            email: email,
            passwordHash: passwordHash,
            name: name,
            description: description
        });

        req.session.userId = user._id.toString();
        req.session.role = user.role;
        req.session.save(function (err) {
            if (err) {
                return res.status(500).json({ message: "Account created, but login could not be started." });
            }
            res.status(201).json({ message: "Account created.", user: userData(user) });
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "That username or email is already registered." });
        }
        if (err.name === "ValidationError") {
            let firstError = Object.values(err.errors)[0];
            return res.status(400).json({ message: firstError.message });
        }
        res.status(500).json({ message: "Could not create the account." });
    }
});

app.post("/api/account/login", async function (req, res) {
    let identifier = typeof req.body.identifier === "string" ? req.body.identifier.trim().toLowerCase() : "";
    let password = typeof req.body.password === "string" ? req.body.password : "";

    if (!identifier || !password) {
        return res.status(400).json({ message: "Username or email and password are required." });
    }

    try {
        let user = await User.findOne({
            $or: [
                { username: identifier },
                { email: identifier }
            ]
        });

        if (!user) {
            return res.status(401).json({ message: "Username/email or password is incorrect." });
        }

        let correctPassword = await bcrypt.compare(password, user.passwordHash);
        if (!correctPassword) {
            return res.status(401).json({ message: "Username/email or password is incorrect." });
        }

        if (user.status === "locked") {
            return res.status(403).json({ message: "This account is locked. Please contact an administrator." });
        }

        if (user.status === "deactivated") {
            return res.status(403).json({ message: "This account has been deactivated." });
        }

        req.session.userId = user._id.toString();
        req.session.role = user.role;
        req.session.save(function (err) {
            if (err) {
                return res.status(500).json({ message: "Could not start your login session." });
            }
            res.json({ message: "Login successful.", user: userData(user) });
        });
    } catch (err) {
        res.status(500).json({ message: "Could not log in." });
    }
});

app.get("/api/account/me", auth.requireLogin, function (req, res) {
    res.json({ user: userData(req.user) });
});

app.put("/api/account/profile", auth.requireLogin, async function (req, res) {
    let name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    let email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    let description = typeof req.body.description === "string" ? req.body.description.trim() : "";
    let profileImage = typeof req.body.profileImage === "string" ? req.body.profileImage.trim() : "";

    if (name.length < 2 || name.length > 80) {
        return res.status(400).json({ message: "Name must be between 2 and 80 characters." });
    }

    if (!validEmail(email)) {
        return res.status(400).json({ message: "Please enter a valid email address." });
    }

    if (description.length > 300) {
        return res.status(400).json({ message: "Description must be 300 characters or less." });
    }

    if (profileImage && !/^https?:\/\//i.test(profileImage)) {
        return res.status(400).json({ message: "Profile image must be a full http or https URL." });
    }

    try {
        let found = await User.findOne({ email: email, _id: { $ne: req.user._id } });
        if (found) {
            return res.status(409).json({ message: "That email is already being used." });
        }

        req.user.name = name;
        req.user.email = email;
        req.user.description = description;
        req.user.profileImage = profileImage;
        await req.user.save();
        res.json({ message: "Profile updated.", user: userData(req.user) });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "That email is already being used." });
        }
        res.status(500).json({ message: "Could not update the profile." });
    }
});

app.put("/api/account/password", auth.requireLogin, async function (req, res) {
    let currentPassword = typeof req.body.currentPassword === "string" ? req.body.currentPassword : "";
    let newPassword = typeof req.body.newPassword === "string" ? req.body.newPassword : "";
    let confirmPassword = typeof req.body.confirmPassword === "string" ? req.body.confirmPassword : "";

    if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required." });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "New passwords do not match." });
    }

    try {
        let correctPassword = await bcrypt.compare(currentPassword, req.user.passwordHash);
        if (!correctPassword) {
            return res.status(400).json({ message: "Current password is incorrect." });
        }

        req.user.passwordHash = await bcrypt.hash(newPassword, 10);
        await req.user.save();
        res.json({ message: "Password changed." });
    } catch (err) {
        res.status(500).json({ message: "Could not change the password." });
    }
});

app.post("/api/account/reset-password", async function (req, res) {
    let identifier = typeof req.body.identifier === "string" ? req.body.identifier.trim().toLowerCase() : "";
    let newPassword = typeof req.body.newPassword === "string" ? req.body.newPassword : "";
    let confirmPassword = typeof req.body.confirmPassword === "string" ? req.body.confirmPassword : "";

    if (!identifier) {
        return res.status(400).json({ message: "Username or email is required." });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "New passwords do not match." });
    }

    try {
        let user = await User.findOne({
            $or: [
                { username: identifier },
                { email: identifier }
            ]
        });

        if (!user) {
            return res.status(404).json({ message: "No matching account was found." });
        }

        if (user.status === "deactivated") {
            return res.status(403).json({ message: "A deactivated account cannot reset its password." });
        }

        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.json({ message: "Password reset. You can now log in." });
    } catch (err) {
        res.status(500).json({ message: "Could not reset the password." });
    }
});

app.post("/api/account/logout", function (req, res) {
    if (!req.session) {
        return res.json({ message: "Logged out." });
    }

    req.session.destroy(function (err) {
        if (err) {
            return res.status(500).json({ message: "Could not log out." });
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out." });
    });
});

app.post("/api/account/deactivate", auth.requireLogin, async function (req, res) {
    try {
        req.user.status = "deactivated";
        await req.user.save();
        req.session.destroy(function (err) {
            if (err) {
                return res.status(500).json({ message: "Account deactivated, but logout failed." });
            }
            res.clearCookie("connect.sid");
            res.json({ message: "Account deactivated." });
        });
    } catch (err) {
        res.status(500).json({ message: "Could not deactivate the account." });
    }
});

app.get("/api/admin/users", auth.requireAdmin, async function (req, res) {
    try {
        let users = await User.find({}).select("-passwordHash").sort({ createdAt: -1 });
        res.json({ users: users, currentUserId: req.user._id });
    } catch (err) {
        res.status(500).json({ message: "Could not load users." });
    }
});

app.put("/api/admin/users/:id/status", auth.requireAdmin, async function (req, res) {
    let status = typeof req.body.status === "string" ? req.body.status.trim().toLowerCase() : "";

    if (status !== "active" && status !== "locked") {
        return res.status(400).json({ message: "Status must be active or locked." });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid user ID." });
    }

    try {
        let user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User was not found." });
        }

        if (user._id.equals(req.user._id) && status === "locked") {
            return res.status(400).json({ message: "You cannot lock your own administrator account." });
        }

        if (user.status === "deactivated") {
            return res.status(400).json({ message: "A deactivated account cannot be locked or unlocked." });
        }

        user.status = status;
        await user.save();
        res.json({ message: "Account status updated.", user: userData(user) });
    } catch (err) {
        res.status(500).json({ message: "Could not update the account status." });
    }
});

let products = [
    {
        id: "corporate-finance-14",
        title: "Principles of Corporate Finance, 14th Edition",
        shortTitle: "Principles of Corporate Finance",
        author: "Richard A. Brealey, Stewart C. Myers and Franklin Allen",
        authorDisplay: "Brealey, Myers and Allen",
        edition: "14th Edition",
        detailLabel: "Subject",
        detail: "Corporate Finance",
        subject: "business",
        course: "FINA2001",
        condition: "Very good",
        conditionValue: "very-good",
        seller: "Nguyen Van An",
        sellerCode: "a7",
        pickup: "Melbourne CBD",
        price: 1450000,
        image: "../assets/images/Handbook-for Mindful-Technial- Writing.webp",
        imageAlt: "Cover of a secondhand academic textbook listing"
    },
    {
        id: "python-crash-course-3",
        title: "Python Crash Course, 3rd Edition",
        shortTitle: "Python Crash Course",
        author: "Eric Matthes",
        authorDisplay: "Eric Matthes",
        edition: "3rd Edition",
        detailLabel: "Course",
        detail: "COMP1511 Programming Fundamentals",
        subject: "computing",
        course: "COSC1511",
        condition: "Good",
        conditionValue: "good",
        seller: "Tran Thi Binh",
        sellerCode: "a8",
        pickup: "RMIT City Campus",
        price: 750000,
        image: "../assets/images/The-music.webp",
        imageAlt: "Cover of a secondhand programming textbook listing"
    },
    {
        id: "introduction-algorithms-4",
        title: "Introduction to Algorithms, 4th Edition",
        shortTitle: "Introduction to Algorithms",
        author: "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest and Clifford Stein",
        authorDisplay: "Cormen, Leiserson, Rivest and Stein",
        edition: "4th Edition",
        detailLabel: "Subject",
        detail: "Algorithms and Data Structures",
        subject: "computing",
        course: "COSC2123",
        condition: "Like new",
        conditionValue: "like-new",
        seller: "Le Minh Chau",
        sellerCode: "a9",
        pickup: "Carlton",
        price: 1200000,
        image: "../assets/images/Piranesi.jpg",
        imageAlt: "Cover of a secondhand algorithms textbook listing"
    },
    {
        id: "mental-health-nursing-10",
        title: "Psychiatric Mental Health Nursing, 10th Edition",
        shortTitle: "Psychiatric Mental Health Nursing",
        author: "Mary C. Townsend and Karyn I. Morgan",
        authorDisplay: "Townsend and Morgan",
        edition: "10th Edition",
        detailLabel: "Subject",
        detail: "Mental Health Nursing",
        subject: "health",
        course: "NURS2105",
        condition: "Very good",
        conditionValue: "very-good",
        seller: "Pham Thu Trang",
        sellerCode: "a10",
        pickup: "Bundoora Campus",
        price: 1050000,
        image: "../assets/images/Psychiatric-Mental-Health-Nursing.webp",
        imageAlt: "Cover of a secondhand nursing textbook listing"
    }
];

let cart = [];
let orders = [];


let reviews = [
    {
        id: 1,
        bookTitle: "The Muse: Misunderstandings and Their Remedies",
        rating: 4,
        reviewerName: "Sarah Mitchell",
        content: "I really appreciate the text's emphasis on essays about writing, which makes the text personable and approachable.",
        userId: 101,
        createdAt: "2026-07-20T09:00:00Z"
    },
    {
        id: 2,
        bookTitle: "Psychiatric-Mental Health Nursing",
        rating: 5,
        reviewerName: "James Carter",
        content: "This is a comprehensive open educational resource (OER) textbook that more than adequately covers the essential topics in Psychiatric Mental Health Nursing. It was a pleasure to review this text. I would recommend it as a primary text for undergraduate Mental Health Nursing courses.",
        userId: 102,
        createdAt: "2026-07-22T13:15:00Z"
    },
    {
        id: 3,
        bookTitle: "Handbook for Mindful Technical Writing: A Practical Guide for University Students and Professionals - 2026 Edition",
        rating: 3,
        reviewerName: "Maria Gonzalez",
        content: "This open textbook was compiled with the Americans with Disabilities Act in mind and in compliance with the Web Content Accessibility Guidelines 2.2 (WCAG 2.2). It is optimized for people who use screen-reader technology. All content can be navigated using a keyboard; all images have alt text tags; and information is not conveyed solely by color.",
        userId: 103,
        createdAt: "2026-07-25T10:30:00Z"
    },
    {
        id: 4,
        bookTitle: "Introduction to Algorithms",
        rating: 5,
        reviewerName: "Alice Chen",
        content: "Great condition, exactly as described. Would buy from this seller again. Added as a new review to demonstrate the A2 dynamic create feature.",
        userId: 101,
        createdAt: "2026-08-14T11:20:00Z"
    }
];
let nextReviewId = 5;

function findProduct(id) {
    let found = null;

    for (let i = 0; i < products.length; i++) {
        if (products[i].id === id) {
            found = products[i];
        }
    }
    return found;
}

function getCartData() {
    let result = [];

    for (let i = 0; i < cart.length; i++) {
        let product = findProduct(cart[i].productId);
        if (product) {
            result.push({
                id: product.id,
                title: product.title,
                author: product.author,
                edition: product.edition,
                detailLabel: product.detailLabel,
                detail: product.detail,
                condition: product.condition,
                seller: product.seller,
                price: product.price,
                image: product.image,
                imageAlt: product.imageAlt,
                quantity: cart[i].quantity
            });
        }
    }
    return result;
}

function deliveryFee(method) {
    if (method === "standard") {
        return 30000;
    } else if (method === "express") {
        return 60000;
    } else if (method === "pickup") {
        return 0;
    }
    return 0;
}

function findReview(id) {
    let found = null;

    for (let i = 0; i < reviews.length; i++) {
        if (reviews[i].id === id) {
            found = reviews[i];
        }
    }
    return found;
}

function getCurrentReviewUser(req) {
    let userId = req.query.userId || (req.body && req.body.userId) || 101;
    return { id: Number(userId) };
}

function validateReviewData(data) {
    let errors = [];

    if (typeof data.bookTitle !== "string" || data.bookTitle.trim().length === 0) {
        errors.push("Book title is required.");
    }
    if (typeof data.reviewerName !== "string" || data.reviewerName.trim().length === 0) {
        errors.push("Reviewer name is required.");
    }
    if (typeof data.content !== "string" || data.content.trim().length === 0) {
        errors.push("Review content is required.");
    } else if (data.content.length > 500) {
        errors.push("Review content must be under 500 characters.");
    }

    let ratingNum = Number(data.rating);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
        errors.push("Rating must be a number between 1 and 5.");
    }

    return errors;
}

app.get("/api/products", function (req, res) {
    res.json(products);
});

app.get("/api/cart", function (req, res) {
    res.json(getCartData());
});

app.post("/api/cart", function (req, res) {
    let productId = req.body.productId;
    let qty = req.body.quantity;
    let product = findProduct(productId);

    if (typeof productId !== "string" || !productId.trim()) {
        return res.status(400).json({ error: "A valid product ID is required." });
    }
    if (!product) {
        return res.status(404).json({ error: "Product was not found." });
    }
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > 99) {
        return res.status(400).json({ error: "Quantity must be a whole number from 1 to 99." });
    }

    let found = null;
    for (let i = 0; i < cart.length; i++) {
        if (cart[i].productId === productId) {
            found = cart[i];
        }
    }

    if (found) {
        if (found.quantity + qty > 99) {
            return res.status(400).json({ error: "The maximum quantity is 99." });
        }
        found.quantity = found.quantity + qty;
    } else {
        cart.push({ productId: productId, quantity: qty });
    }

    res.status(201).json({ message: "Product added to cart.", cart: getCartData() });
});

app.put("/api/cart/:id", function (req, res) {
    let productId = req.params.id;
    let qty = req.body.quantity;
    let found = null;

    for (let i = 0; i < cart.length; i++) {
        if (cart[i].productId === productId) {
            found = cart[i];
        }
    }

    if (!findProduct(productId) || !found) {
        return res.status(404).json({ error: "Cart item was not found." });
    }
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > 99) {
        return res.status(400).json({ error: "Quantity must be a whole number from 1 to 99." });
    }

    found.quantity = qty;
    res.json({ message: "Cart quantity updated.", cart: getCartData() });
});

app.delete("/api/cart/:id", function (req, res) {
    let productId = req.params.id;
    let index = -1;

    for (let i = 0; i < cart.length; i++) {
        if (cart[i].productId === productId) {
            index = i;
        }
    }

    if (index === -1) {
        return res.status(404).json({ error: "Cart item was not found." });
    }

    cart.splice(index, 1);
    res.json({ message: "Product removed from cart.", cart: getCartData() });
});

app.post("/api/orders", function (req, res) {
    let data = req.body || {};
    let customer = data.customer || {};
    let address = data.address || {};
    let payment = data.payment || {};
    let method = data.deliveryMethod;

    if (typeof customer.name !== "string" || customer.name.trim().length < 2 || /[0-9]/.test(customer.name)) {
        return res.status(400).json({ error: "A valid full name is required." });
    }
    if (typeof customer.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
        return res.status(400).json({ error: "A valid email is required." });
    }
    if (typeof customer.phone !== "string" || !/^[0-9]{10}$/.test(customer.phone)) {
        return res.status(400).json({ error: "Phone number must contain 10 digits." });
    }
    if (typeof address.street !== "string" || address.street.trim().length < 5) {
        return res.status(400).json({ error: "A complete street address is required." });
    }
    if (typeof address.district !== "string" || address.district.trim().length < 2) {
        return res.status(400).json({ error: "A district or ward is required." });
    }
    if (typeof address.city !== "string" || address.city.trim().length < 2) {
        return res.status(400).json({ error: "A province or city is required." });
    }
    if (typeof address.postcode !== "string" || !/^[0-9]{6}$/.test(address.postcode)) {
        return res.status(400).json({ error: "Postal code must contain 6 digits." });
    }
    if (method !== "standard" && method !== "express" && method !== "pickup") {
        return res.status(400).json({ error: "A valid delivery method is required." });
    }
    if (typeof payment.cardholderName !== "string" || payment.cardholderName.trim().length < 2 || /[0-9]/.test(payment.cardholderName)) {
        return res.status(400).json({ error: "A valid cardholder name is required." });
    }

    let cardNumber = typeof payment.cardNumber === "string" ? payment.cardNumber.replace(/\s/g, "") : "";
    if (!/^[0-9]{16}$/.test(cardNumber)) {
        return res.status(400).json({ error: "Card number must contain 16 digits." });
    }
    if (typeof payment.expiryDate !== "string" || !/^[0-9]{2}\/[0-9]{2}$/.test(payment.expiryDate)) {
        return res.status(400).json({ error: "Expiry date must use MM/YY." });
    }

    let expiryParts = payment.expiryDate.split("/");
    let expiryMonth = Number(expiryParts[0]);
    let expiryYear = 2000 + Number(expiryParts[1]);
    let now = new Date();
    if (expiryMonth < 1 || expiryMonth > 12 || expiryYear < now.getFullYear() ||
        (expiryYear === now.getFullYear() && expiryMonth < now.getMonth() + 1)) {
        return res.status(400).json({ error: "Card expiry date is invalid or expired." });
    }
    if (typeof payment.cvv !== "string" || !/^[0-9]{3}$/.test(payment.cvv)) {
        return res.status(400).json({ error: "CVV must contain 3 digits." });
    }
    if (data.confirmed !== true) {
        return res.status(400).json({ error: "The order confirmation checkbox is required." });
    }
    if (!cart.length) {
        return res.status(400).json({ error: "The cart is empty." });
    }

    let items = getCartData();
    let subtotal = 0;
    for (let i = 0; i < items.length; i++) {
        subtotal = subtotal + (items[i].price * items[i].quantity);
    }

    let fee = deliveryFee(method);
    let order = {
        id: "TS-" + String(100001 + orders.length),
        items: items,
        orderedAt: new Date().toISOString(),
        subtotal: subtotal,
        deliveryFee: fee,
        total: subtotal + fee,
        deliveryMethod: method,
        customer: {
            name: customer.name.trim(),
            email: customer.email.trim(),
            phone: customer.phone
        },
        address: {
            street: address.street.trim(),
            district: address.district.trim(),
            city: address.city.trim(),
            postcode: address.postcode
        }
    };

    orders.push(order);
    cart = [];
    res.status(201).json({ message: "Order created.", orderId: order.id });
});

app.get("/api/orders/:id", function (req, res) {
    let order = null;

    for (let i = 0; i < orders.length; i++) {
        if (orders[i].id === req.params.id) {
            order = orders[i];
        }
    }

    if (!order) {
        return res.status(404).json({ error: "Order was not found." });
    }
    res.json(order);
});

app.get("/api/reviews", async function (req, res) {
    try {
        let reviews = await Review.find();
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch reviews." });
    }
});

app.get("/api/reviews/:id", async function (req, res) {
    try {
        let review = await Review.findOne({ id: Number(req.params.id) });

        if (!review) {
            return res.status(404).json({ message: "Review not found." });
        }
        res.json(review);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch review." });
    }
});

app.post("/api/reviews", async function (req, res) {
    try {
        let errors = validateReviewData(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ message: errors.join(" ") });
        }

        let currentUser = getCurrentReviewUser(req);

        let lastReview = await Review.findOne().sort({ id: -1 });
        let nextId = lastReview ? lastReview.id + 1 : 1;

        let newReview = new Review({
            id: nextId,
            bookTitle: req.body.bookTitle.trim(),
            rating: Number(req.body.rating),
            reviewerName: req.body.reviewerName.trim(),
            content: req.body.content.trim(),
            userId: currentUser.id,
            createdAt: new Date()
        });

        await newReview.save();
        res.status(201).json(newReview);
    } catch (err) {
        res.status(500).json({ message: "Failed to create review." });
    }
});

app.put("/api/reviews/:id", async function (req, res) {
    try {
        let review = await Review.findOne({ id: Number(req.params.id) });
        if (!review) {
            return res.status(404).json({ message: "Review not found." });
        }

        let currentUser = getCurrentReviewUser(req);
        if (review.userId !== currentUser.id) {
            return res.status(403).json({ message: "You can only edit your own reviews." });
        }

        let errors = validateReviewData(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ message: errors.join(" ") });
        }

        review.bookTitle = req.body.bookTitle.trim();
        review.rating = Number(req.body.rating);
        review.reviewerName = req.body.reviewerName.trim();
        review.content = req.body.content.trim();

        await review.save();
        res.json(review);
    } catch (err) {
        res.status(500).json({ message: "Failed to update review." });
    }
});

app.delete("/api/reviews/:id", async function (req, res) {
    try {
        let review = await Review.findOne({ id: Number(req.params.id) });
        if (!review) {
            return res.status(404).json({ message: "Review not found." });
        }

        let currentUser = getCurrentReviewUser(req);
        if (review.userId !== currentUser.id) {
            return res.status(403).json({ message: "You can only delete your own reviews." });
        }

        await Review.deleteOne({ id: review.id });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ message: "Failed to delete review." });
    }
});

app.use(express.static(path.join(__dirname)));
