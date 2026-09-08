const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
    productId: String,
    title: String,
    author: String,
    edition: String,
    detailLabel: String,
    detail: String,
    condition: String,
    seller: String,
    price: Number,
    image: String,
    imageAlt: String,
    quantity: Number
}, {
    _id: false
});

const orderSchema = new mongoose.Schema({
    orderId: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [orderItemSchema], required: true },
    orderedAt: { type: Date, required: true },
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, required: true },
    total: { type: Number, required: true },
    deliveryMethod: { type: String, required: true },
    customer: {
        name: String,
        email: String,
        phone: String
    },
    address: {
        street: String,
        district: String,
        city: String,
        postcode: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Order", orderSchema);
