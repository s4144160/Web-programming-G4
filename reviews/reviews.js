function validateRequired(inputEl, errorEl, message){
    if(inputEl.value.trim() === ""){
        inputEl.classList.add("input-invalid");
        errorEl.textContent = message;
        return false
    }else{
        inputEl.classList.remove("input-invalid");
        errorEl.textContent = "";
        return true;
    }
}

const bookTitleInput = document.querySelector("#book-title");

const bookTitleError = document.querySelector("#book-title-error");

const reviewerNameInput = document.querySelector("#reviewer-name");

const reviewerNameError = document.querySelector("#reviewer-name-error");

const reviewerContentInput = document.querySelector("#review-content");

const reviewerContentError = document.querySelector("#reviewer-content-error");

const reviewContentCounter = document.querySelector("#review-content-counter");

const ratingSelect = document.querySelector("#rating");

const reviewImageInput = document.querySelector("#review-image");

const reviewImageError = document.querySelector("#review-image-error");

const reviewForm = document.querySelector(".form");

const REVIEW_CONTENT_MAX = 500;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_MB = 5

bookTitleInput.addEventListener("input", function (){
    validateRequired(bookTitleInput, bookTitleError, "Book title is required.");
    saveDraftToStorage();
});

reviewerNameInput.addEventListener("input", function (){
    validateRequired(reviewerNameInput, reviewerNameError, "Your name is required.");
    saveDraftToStorage();
});

reviewerContentInput.addEventListener("input", function (){
    validateRequired(reviewerContentInput, reviewerContentError, "Your content is required.");

    if (reviewerContentInput.value.length > REVIEW_CONTENT_MAX){
        reviewerContentInput.value = reviewerContentInput.value.slice(0, REVIEW_CONTENT_MAX);
    }

    const remaining = REVIEW_CONTENT_MAX - reviewerContentInput.value.length;
    reviewContentCounter.textContent = remaining + " characters remaining";
    reviewContentCounter.classList.toggle("counter-warning", remaining <= 20);

    saveDraftToStorage();
});

reviewImageInput.addEventListener("change", function (){
    const file = reviewImageInput.files[0];

    if(!file){
        reviewImageInput.classList.remove("input-invalid");
        reviewImageError.textContent = ""
        return;
    }

    const isValidType = ALLOWED_IMAGE_TYPES.includes(file.type);

    const isValidSize = file.size <= MAX_IMAGE_SIZE_MB * 1024 * 1024;

    if(!isValidType){
        reviewImageInput.classList.add("input-invalid");
        reviewImageError.textContent = "Only JPG, PNG or WEBP images are allowed.";
        reviewImageInput.value = "";
    }else if(!isValidSize){
        reviewImageInput.classList.add("input-invalid");
        reviewImageError.textContent = "Image must be smaller than " + MAX_IMAGE_SIZE_MB + "MB.";
        reviewImageInput.value = "";
    }else{
        reviewImageInput.classList.remove("input-invalid");
        reviewImageError.textContent = ""
    }
});

ratingSelect.addEventListener("change", function(){
    saveDraftToStorage();
});

const DRAFT_KEY = "textswap_review_draft";

function saveDraftToStorage(){
    const draft ={
        bookTitle: bookTitleInput.value,
        rating: ratingSelect.value,
        reviewerName: reviewerNameInput.value,
        reviewContent: reviewerContentInput.value
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function restoreDraftFromStorage(){
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (!savedDraft) return;

    const draft = JSON.parse(savedDraft);
    bookTitleInput.value = draft.bookTitle || "";
    ratingSelect.value = draft.rating || "5";
    reviewerNameInput.value = draft.reviewerName || "";
    reviewerContentInput.value = draft.reviewContent || "";

    const remaining = REVIEW_CONTENT_MAX - reviewerContentInput.value.length;
    reviewContentCounter.textContent = remaining + " characters remaining";
}

function clearDraftFromStorage(){
    localStorage.removeItem(DRAFT_KEY);
}

restoreDraftFromStorage();

reviewForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const isBookTitleValid = validateRequired(bookTitleInput, bookTitleError, "Book title is required.");
    const isNameValid = validateRequired(reviewerNameInput, reviewerNameError, "Your name is required.")
    const isContentValid = validateRequired(reviewerContentInput, reviewerContentError, "Your content is required.");

    if (!isBookTitleValid || !isNameValid || !isContentValid) {
        return;
    }

    const newReview ={
        bookTitle: bookTitleInput.value.trim(),
        rating: Number(ratingSelect.value),
        reviewerName: reviewerNameInput.value.trim(),
        content: reviewerContentInput.value.trim(),
        userId: 101 
    };

    postReviewToServer(newReview);
});

async function postReviewToServer(reviewData){
    try{
        const response = await fetch("/api/reviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reviewData)
        });

        if(!response.ok){
            const errorResult = await response.json();
            alert("Could not submit review: " + errorResult.message);
            return;
        }

        clearDraftFromStorage();
        reviewForm.reset();
        alert("Review submitted successfully!");
        window.location.href = "review-list.html";
    } catch (error) {
        console.error("Network error submitting review:", error);
        alert("Could not reach the server. Please try again.");
    }
}