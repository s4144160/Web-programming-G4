const CURRENT_USER_ID = 101;

const detailCard = document.querySelector("#review-detail-card");

function getReviewIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

async function loadReviewDetail() {
    const reviewId = getReviewIdFromUrl();

    if(!reviewId) {
        detailCard.innerHTML = "<p>No review selected.</p><a href='review-list.html' class='btn btn-outline mt-lg'>&larr; Back to Reviews</a>";
        return;
    }

    try{
        const response = await fetch(`/api/reviews/${reviewId}`);

        if (!response.ok) {
            detailCard.innerHTML = "<p>Review not found.</p><a href='review-list.html' class='btn btn-outline mt-lg'>&larr; Back to Reviews</a>";
            return;
        }

        const review = await response.json();
        renderReview(review);
    } catch (error) {
        console.error("Could not load review:", error);
        detailCard.innerHTML = "<p>Could not reach the server.</p>";
    }
}

function renderReview(review){
    const stars = "⭐".repeat(review.rating) + "☆".repeat(5 - review.rating);
    const isOwner = review.userId === CURRENT_USER_ID;
    const submittedDate = new Date(review.createdAt).toLocaleDateString();

    detailCard.innerHTML = `
        <h1>${escapeHtml(review.bookTitle)}</h1>
        <p class="card__meta">${stars} · ${escapeHtml(review.reviewerName)} · ${submittedDate}</p>
        <div class="mt-lg">
            <p>${escapeHtml(review.content)}</p>
        </div>
        <div class="mt-lg" id="detail-actions">
            <a href="review-list.html" class="btn btn-outline">&larr; Back to Reviews</a>
            ${isOwner ? `<button id="delete-review-btn" class="btn btn-outline" style="margin-left:8px;">Delete this review</button>` : ""}
        </div>
    `;

    if(isOwner){
        document.querySelector("#delete-review-btn").addEventListener("click", function () {
            handleDelete(review.id);
        });
    }
}

async function handleDelete(reviewId){
    const confirmed = confirm("Delete this review? This cannot be undone.");
    if(!confirmed) return;

    try{
        const response = await fetch(`/api/reviews/${reviewId}?userId=${CURRENT_USER_ID}`, {
            method: "DELETE"
        });

        if(response.status === 204){
            alert("Review deleted.");
            window.location.href = "review-list.html";
        }else{
            const errorResult = await response.json();
            alert("Could not delete review: " + errorResult.message);
        }
    } catch (error){
        console.error("Network error deleting review:", error);
        alert("Could not reach the server. Please try again.")
    }
}

function escapeHtml(text){
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

loadReviewDetail();