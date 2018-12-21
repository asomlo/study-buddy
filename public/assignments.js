function main() {
    // front end form validation for adding assignments
    // assignment must have a title and date (description optional)

    const contentBox = document.querySelector('.content');
    const submitBtn = document.querySelector('input[type="submit"]');
    submitBtn.classList.add("hidden");

    // creating div to hold DOM message about title
    const titleInput = document.querySelector('input[name="title"]');
    const titleValid = document.createElement("div");
    titleValid.id = "titleValidation";
    titleValid.classList.add("validationMsg");
    titleValid.innerText = "Assignment title is required.";
    contentBox.prepend(titleValid);
    const titleValidMsg = document.querySelector('#titleValidation');

    // same thing as above, but for date
    const dateInput = document.querySelector('input[name="date"]');
    const dateValid = document.createElement("div");
    dateValid.id = "dateValidation";
    dateValid.classList.add("validationMsg");
    dateValid.innerText = "Valid date is required.";
    contentBox.prepend(dateValid);
    const dateValidMsg = document.querySelector('#dateValidation');

    let titleOkay = false;
    let dateOkay = false;
    titleInput.addEventListener('input', (event) => {
        if (titleInput.value.length > 0) {
            titleOkay = true;
            titleValidMsg.classList.add("hidden");
        } else {
            titleOkay = false;
            titleValidMsg.classList.remove("hidden");
        }
        validCheck();
    });

    // date validation is a little primitive. just matches XXXX-XX-XX where X is any digit. could be nonsensical month/date
    dateInput.addEventListener('input', (event) => {
        if (dateInput.value.match(/\d{4}-\d{2}-\d{2}/)) {
            dateOkay = true;
            dateValidMsg.classList.add("hidden");
        } else {
            dateOkay = false;
            dateValidMsg.classList.remove("hidden");
        }
        validCheck();
    });

    // check that both date and title are valid before showing/hiding submit
    const validCheck = function() {
        if (titleOkay && dateOkay) {
            submitBtn.classList.remove("hidden");
        } else {
            submitBtn.classList.add("hidden");
        }
    }

}

document.addEventListener('DOMContentLoaded', main);
