const mongoose = require("mongoose");

const blogCommentSchema = new mongoose.Schema({
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    authorName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const blogPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 150
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    authorName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80
    },
    tags: {
        type: [String],
        required: true,
        validate: {
            validator: function (tags) {
                return tags.length >= 1 && tags.length <= 10;
            },
            message: "Add between 1 and 10 tags."
        }
    },
    content: {
        type: String,
        required: true,
        trim: true,
        minlength: 10,
        maxlength: 10000
    },
    imageUrl: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    editedAt: {
        type: Date,
        default: null
    },
    comments: {
        type: [blogCommentSchema],
        default: []
    }
}, { timestamps: true });

blogPostSchema.index({ createdAt: -1 });
blogPostSchema.index({ tags: 1 });

module.exports = mongoose.models.BlogPost || mongoose.model("BlogPost", blogPostSchema);
