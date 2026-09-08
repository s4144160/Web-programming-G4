const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    productId: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true },
    shortTitle: { type: String, required: true },
    author: { type: String, required: true },
    authorDisplay: { type: String, required: true },
    edition: { type: String, required: true },
    detailLabel: { type: String, required: true },
    detail: { type: String, required: true },
    subject: { type: String, required: true },
    course: { type: String, required: true },
    condition: { type: String, required: true },
    conditionValue: { type: String, required: true },
    seller: { type: String, required: true },
    sellerCode: { type: String, required: true },
    pickup: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, required: true },
    imageAlt: { type: String, required: true }
}, {
    timestamps: true
});

module.exports = mongoose.model("Product", productSchema);
