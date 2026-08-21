
function validateRequired(inputEl, errorEl, message){
    if (inputEl.value.trim() === ""){
        inputEl.classList.add("input-invalid");
        errorEl.textContent = message;
        return false;
    }else{
        inputEl.classList.remove("input-invalid");
        errorEl.textContent = "";
        return true;
    }
}

const bookTitleInput = document.querySelector("#book-title");
const bookTitleError = document.querySelector("#book-title-error");

bookTitleInput.addEventListener("input", function(){
    validateRequired(bookTitleInput, bookTitleError, "Book title is required.");
});

const reviewerNameInput = document.querySelector("#reviewer-name");
const reviewerNameError = document.querySelector("#reviewer-name-error");

reviewerNameInput.addEventListener("input", function(){
    validateRequired(reviewerNameInput, reviewerNameError, "Your name is required.")
});

const reviewerContentInput = document.querySelector("#review-content");
const reviewerContentError = document.querySelector("#reviewer-content-error");

reviewerContentInput.addEventListener("input", function(){
    validateRequired(reviewerContentInput, reviewerContentError, "Your content is required.")
})