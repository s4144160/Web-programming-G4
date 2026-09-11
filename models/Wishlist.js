const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    productId: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ["saved", "moved-to-cart", "purchased", "removed"],
        default: "saved"
    },
    addedAt: { type: Date, default: Date.now },
    movedToCartAt: { type: Date, default: null },
    purchasedAt: { type: Date, default: null },
    removedAt: { type: Date, default: null }
}, {
    timestamps: true
});

wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model("Wishlist", wishlistSchema);
