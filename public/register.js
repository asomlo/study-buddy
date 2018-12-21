function main() {
    // front end form validation for registration
    //

    // sloppy to match based on class that is on page twice, but i want to just match the first
    const contentBox = document.querySelector('.content');
    const submitBtn = document.querySelector('input[type="submit"]');
    submitBtn.classList.add("hidden");

    const usernameInput = document.querySelector('input[name="username"]');
    const usernameValidation = document.createElement("div");
    usernameValidation.id = "usernameValidation";
    usernameValidation.classList.add("validationMsg");
    usernameValidation.innerText = "Username is required";
    contentBox.prepend(usernameValidation);
    const usernameValidationMsg = document.querySelector('#usernameValidation');

    const passwordInput = document.querySelector('input[name="password"]');
    const passwordVerifyInput = document.querySelector('input[name="verify"]');
    const passwordValidation = document.createElement("div");
    passwordValidation.id = "passwordValidation";
    passwordValidation.classList.add("validationMsg");
    passwordValidation.innerText = "Passwords must match";
    contentBox.prepend(passwordValidation);
    const passwordValidMsg = document.querySelector('#passwordValidation');

    let usernameOkay = false;
    let passwordOkay = false;
    // check that username is not empty
    usernameInput.addEventListener('input', (event) => {
        if (usernameInput.value.length > 0) {
            usernameOkay = true;
            usernameValidationMsg.classList.add("hidden");
        } else {
            usernameOkay = false;
            usernameValidationMsg.classList.remove("hidden");
        }
        validCheck();
    });

    // check that both password fields are not empty, and match
    const passwordMatch = function() {
        if (passwordInput.value === passwordVerifyInput.value && passwordInput.value.length > 0) {
            passwordOkay = true;
            passwordValidMsg.classList.add("hidden");
        } else {
            passwordOkay = false;
            passwordValidMsg.classList.remove("hidden");
        }
        validCheck();
    }
    passwordInput.addEventListener('input', passwordMatch);
    passwordVerifyInput.addEventListener('input', passwordMatch);

    // check if both username and passwords fields are valid to show/hide submit button
    const validCheck = function() {
        if (usernameOkay && passwordOkay) {
            submitBtn.classList.remove("hidden");
        } else {
            submitBtn.classList.add("hidden");
        }
    }

}

document.addEventListener('DOMContentLoaded', main);
