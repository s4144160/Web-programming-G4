const searchInput = document.querySelector("#search-input");
const sortSelect = document.querySelector("#sort-select");
const filterSelect = document.querySelector("#filter-select");
const cardGrid = document.querySelector("#review-card-grid");
const resultsCount = document.querySelector("#results-count");
const noResultsMessage = document.querySelector("#no-results-message");

let allReviews = []; 

async function loadReviews(){
    try{
        const response = await fetch("/api/reviews");
        allReviews = await response.json();
        renderReviews();
    }catch (error){
        console.error("Could not load reviews:", error);
        cardGrid.innerHTML = "<p class='text-muted'>Could not load reviews from the server.</p>";
    }
}

function applySearch(reviewsArray){
    const searchTerm = searchInput.value.trim().toLowerCase();
    if (searchTerm === "") return reviewsArray;

    return reviewsArray.filter(function (review){
        return(
            review.bookTitle.toLowerCase().includes(searchTerm) ||
            review.reviewerName.toLowerCase().includes(searchTerm)
        );
    });
}

function applyFilter(reviewsArray){
    const filterValue = filterSelect.value;
    if (filterValue === "all") return reviewsArray;

    const minRating = Number(filterValue);
    return reviewsArray.filter(function (review){
        return review.rating >= minRating;
    });
}

function applySort(reviewsArray){
    const sortValue = sortSelect.value;
    const sorted = reviewsArray.slice();

    if (sortValue === "newest"){
        sorted.sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    }else if(sortValue === "oldest"){
        sorted.sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
    }else if(sortValue === "rating-high"){
        sorted.sort(function (a, b) { return b.rating - a.rating; });
    }else if(sortValue === "rating-low"){
        sorted.sort(function (a, b) { return a.rating - b.rating; })
    }

    return sorted;
}

function renderReviews(){
    let visibleReviews = applySearch(allReviews);
    visibleReviews = applyFilter(visibleReviews);
    visibleReviews = applySort(visibleReviews);

    resultsCount.textContent = visibleReviews.length + " review(s) found";
    noResultsMessage.style.display = visibleReviews.length === 0 ? "block" : "none";

    cardGrid.innerHTML = visibleReviews.map(buildCardHtml).join("");
}

function buildCardHtml(review){
    const stars = "⭐".repeat(review.rating) + "☆".repeat(5 - review.rating);
    const shortContent = review.content.length > 120
        ? review.content.slice(0, 120) + "..."
        : review.content

    return `
        <div class="card">
            <h3 class="card__title">${escapeHtml(review.bookTitle)}</h3>
            <p class="card__meta">${stars} · ${escapeHtml(review.reviewerName)}</p>
            <p>${escapeHtml(shortContent)}</p>
            <a href="review-detail.html?id=${review.id}" class="btn btn-outline">Read More</a>
        </div>
    `;
}

function escapeHtml(text){
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

searchInput.addEventListener("input", renderReviews);
sortSelect.addEventListener("change", renderReviews);
filterSelect.addEventListener("change", renderReviews);

loadReviews();