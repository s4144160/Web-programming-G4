const express = require("express");
const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const auth = require("../middleware/auth");

const router = express.Router();

function validProductId(productId) {
    return typeof productId === "string" && productId.trim().length > 0 && productId.trim().length <= 100;
}

function productData(product) {
    return {
        productId: product.productId,
        title: product.title,
        author: product.author,
        edition: product.edition,
        course: product.course,
        condition: product.condition,
        image: product.image,
        imageAlt: product.imageAlt,
        price: product.price
    };
}

async function getStats(productId) {
    let savedUsers = await Wishlist.countDocuments({ productId: productId, status: "saved" });
    let everSaved = await Wishlist.countDocuments({ productId: productId });
    let carts = await Cart.find({ "items.productId": productId }).select("items");
    let cartQuantity = 0;

    for (let i = 0; i < carts.length; i++) {
        for (let j = 0; j < carts[i].items.length; j++) {
            if (carts[i].items[j].productId === productId) {
                cartQuantity = cartQuantity + carts[i].items[j].quantity;
            }
        }
    }

    let orders = await Order.find({ "items.productId": productId }).select("items");
    let purchasedQuantity = 0;
    for (let i = 0; i < orders.length; i++) {
        for (let j = 0; j < orders[i].items.length; j++) {
            if (orders[i].items[j].productId === productId) {
                purchasedQuantity = purchasedQuantity + orders[i].items[j].quantity;
            }
        }
    }

    return {
        savedUsers: savedUsers,
        everSaved: everSaved,
        carts: carts.length,
        cartQuantity: cartQuantity,
        purchasedQuantity: purchasedQuantity
    };
}

async function wishlistData(record, product) {
    return {
        id: record._id,
        productId: record.productId,
        status: record.status,
        addedAt: record.addedAt,
        movedToCartAt: record.movedToCartAt,
        purchasedAt: record.purchasedAt,
        product: productData(product),
        stats: await getStats(record.productId)
    };
}

router.get("/", auth.requireLogin, async function (req, res) {
    try {
        let records = await Wishlist.find({
            userId: req.user._id,
            status: { $ne: "removed" }
        }).sort({ addedAt: -1 });

        let ids = [];
        for (let i = 0; i < records.length; i++) {
            ids.push(records[i].productId);
        }
        let products = await Product.find({ productId: { $in: ids } });
        let items = [];

        for (let i = 0; i < records.length; i++) {
            let product = null;
            for (let j = 0; j < products.length; j++) {
                if (products[j].productId === records[i].productId) {
                    product = products[j];
                }
            }
            if (product) {
                items.push(await wishlistData(records[i], product));
            }
        }

        res.json({ items: items });
    } catch (err) {
        res.status(500).json({ message: "Could not load your wishlist." });
    }
});

router.post("/", auth.requireLogin, async function (req, res) {
    let productId = typeof req.body.productId === "string" ? req.body.productId.trim() : "";
    if (!validProductId(productId)) {
        return res.status(400).json({ message: "A valid product ID is required." });
    }

    try {
        let product = await Product.findOne({ productId: productId });
        if (!product) {
            return res.status(404).json({ message: "Product was not found." });
        }

        let record = await Wishlist.findOne({ userId: req.user._id, productId: productId });
        if (record && record.status === "saved") {
            return res.status(409).json({ message: "Product is already in your wishlist." });
        }

        if (record) {
            record.status = "saved";
            record.addedAt = new Date();
            record.movedToCartAt = null;
            record.purchasedAt = null;
            record.removedAt = null;
            await record.save();
        } else {
            record = await Wishlist.create({
                userId: req.user._id,
                productId: productId,
                status: "saved",
                addedAt: new Date()
            });
        }

        res.status(201).json({
            message: "Product saved to your wishlist.",
            item: await wishlistData(record, product)
        });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "Product is already in your wishlist." });
        }
        res.status(500).json({ message: "Could not save the product to your wishlist." });
    }
});

router.delete("/:productId", auth.requireLogin, async function (req, res) {
    let productId = req.params.productId;
    if (!validProductId(productId)) {
        return res.status(400).json({ message: "A valid product ID is required." });
    }

    try {
        let record = await Wishlist.findOne({
            userId: req.user._id,
            productId: productId,
            status: { $ne: "removed" }
        });
        if (!record) {
            return res.status(404).json({ message: "Wishlist item was not found." });
        }

        record.status = "removed";
        record.removedAt = new Date();
        await record.save();
        res.json({ message: "Product removed from your wishlist." });
    } catch (err) {
        res.status(500).json({ message: "Could not remove the wishlist item." });
    }
});

router.post("/:productId/move-to-cart", auth.requireLogin, async function (req, res) {
    let productId = req.params.productId;
    if (!validProductId(productId)) {
        return res.status(400).json({ message: "A valid product ID is required." });
    }

    try {
        let record = await Wishlist.findOne({
            userId: req.user._id,
            productId: productId,
            status: "saved"
        });
        if (!record) {
            return res.status(404).json({ message: "Saved wishlist item was not found." });
        }

        let product = await Product.findOne({ productId: productId });
        if (!product) {
            return res.status(404).json({ message: "Product was not found." });
        }

        let cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) {
            cart = new Cart({ userId: req.user._id, items: [] });
        }

        let found = null;
        for (let i = 0; i < cart.items.length; i++) {
            if (cart.items[i].productId === productId) {
                found = cart.items[i];
            }
        }

        if (found && found.quantity >= 99) {
            return res.status(400).json({ message: "The cart already has the maximum quantity of 99." });
        }
        if (found) {
            found.quantity = found.quantity + 1;
        } else {
            cart.items.push({ productId: productId, quantity: 1 });
        }
        await cart.save();

        record.status = "moved-to-cart";
        record.movedToCartAt = new Date();
        record.removedAt = null;
        await record.save();

        res.json({
            message: "Product moved to your shopping cart.",
            item: await wishlistData(record, product)
        });
    } catch (err) {
        res.status(500).json({ message: "Could not move the product to your cart." });
    }
});

router.put("/:productId/purchased", auth.requireLogin, async function (req, res) {
    let productId = req.params.productId;
    if (!validProductId(productId)) {
        return res.status(400).json({ message: "A valid product ID is required." });
    }

    try {
        let record = await Wishlist.findOne({
            userId: req.user._id,
            productId: productId,
            status: { $ne: "removed" }
        });
        if (!record) {
            return res.status(404).json({ message: "Wishlist item was not found." });
        }

        let product = await Product.findOne({ productId: productId });
        if (!product) {
            return res.status(404).json({ message: "Product was not found." });
        }

        record.status = "purchased";
        record.purchasedAt = new Date();
        record.removedAt = null;
        await record.save();
        res.json({
            message: "Product marked as purchased.",
            item: await wishlistData(record, product)
        });
    } catch (err) {
        res.status(500).json({ message: "Could not update the wishlist item." });
    }
});

router.get("/:productId/stats", auth.requireLogin, async function (req, res) {
    let productId = req.params.productId;
    if (!validProductId(productId)) {
        return res.status(400).json({ message: "A valid product ID is required." });
    }

    try {
        let product = await Product.findOne({ productId: productId });
        if (!product) {
            return res.status(404).json({ message: "Product was not found." });
        }
        res.json({ productId: productId, stats: await getStats(productId) });
    } catch (err) {
        res.status(500).json({ message: "Could not load wishlist statistics." });
    }
});

module.exports = router;
