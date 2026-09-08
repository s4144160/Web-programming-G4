require("dotenv").config();
const mongoose = require("mongoose");
const Review = require("./models/Review");

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

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ MongoDB connected for seeding");

        await Review.deleteMany({});
        console.log("🗑️  Cleared existing reviews");

        await Review.insertMany(reviews);
        console.log("🌱 Inserted " + reviews.length + " reviews");

        await mongoose.disconnect();
        console.log("✅ Done, disconnected");
    } catch (err) {
        console.error("❌ Seeding error:", err);
        process.exit(1);
    }
}

seed();