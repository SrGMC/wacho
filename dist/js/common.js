/**
 * Displays a spinner in the button
 * @param {HTMLElement} button
 */
 function setLoadButton(button) {
    button.setAttribute("original-data", button.innerHTML);
    button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    button.disabled = true;
}

/**
 * Displays a tick in the button that disapears after 1.5 seconds.
 * @param {HTMLElement} button
 */
function setDoneButtonWithTimeout(button) {
    button.innerHTML = '<i class="bi bi-check2"></i>';
    setTimeout(function () {
        unsetLoadButton(button);
    }, 1500);
}

/**
 * Displays a tick in the button.
 * @param {HTMLElement} button
 */
 function setDoneButton(button) {
    button.innerHTML = '<i class="bi bi-check2"></i>';
}

/**
 * Resets the button to its initial state
 * @param {HTMLElement} button
 */
function unsetLoadButton(button) {
    button.innerHTML = button.getAttribute("original-data");
    button.disabled = false;
}

if (!localStorage.getItem("username")) {
    var usernameModal = new bootstrap.Modal(document.getElementById("usernameModal"));
    usernameModal.show();
}

function saveUsername() {
    let username = document.querySelector("#usernameInput").value;
    localStorage.setItem("username", username);
}