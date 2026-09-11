const mongoose = require("mongoose");

const replySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 120
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 3000
    },
    imageUrl: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ""
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    authorName: {
        type: String,
        required: true,
        trim: true
    },
    parentReplyId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    createdAt: {
        type: Date,
        required: true
    },
    updatedAt: {
        type: Date,
        required: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    _id: true
});

const forumThreadSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 120
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 3000
    },
    imageUrl: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ""
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    authorName: {
        type: String,
        required: true,
        trim: true
    },
    createdAt: {
        type: Date,
        required: true
    },
    updatedAt: {
        type: Date,
        required: true
    },
    lastActivityAt: {
        type: Date,
        required: true,
        index: true
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },
    deletedAt: {
        type: Date,
        default: null
    },
    replies: {
        type: [replySchema],
        default: []
    }
});

forumThreadSchema.index({ createdAt: 1 });

module.exports = mongoose.model("ForumThread", forumThreadSchema);
