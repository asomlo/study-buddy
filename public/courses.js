function main() {
    // front end form validation for adding a course
    // course must have a title

    // sloppy to match based on class that is on page twice, but i want to just match the first
    const contentBox = document.querySelector('.content');
    const submitBtn = document.querySelector('input[type="submit"]');

    const titleInput = document.querySelector('input[name="name"]');
    const titleValidation = document.createElement("div");
    titleValidation.id = "titleValidation";
    titleValidation.classList.add("validationMsg");
    titleValidation.innerText = "Class name is required";
    contentBox.prepend(titleValidation);
    const titleValidMsg = document.querySelector('#titleValidation');

    submitBtn.classList.add("hidden");
    // check that title is not empty
    titleInput.addEventListener('input', (event) => {
        if (titleInput.value.length > 0) {
            submitBtn.classList.remove("hidden");
            titleValidMsg.classList.add("hidden");
        } else {
            submitBtn.classList.add("hidden");
            titleValidMsg.classList.remove("hidden");
        }
    });

}

document.addEventListener('DOMContentLoaded', main);
