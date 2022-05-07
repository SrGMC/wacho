/**
 * Make a HTTP request
 * @param  {string} url
 * @param  {string} method
 * @param  {string} body
 * @return {Promise}       Resolves with object from server
 */
function http(url, method, body) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method || "GET", url);
        xhr.setRequestHeader("Content-Type", "application/json");

        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                if (xhr.response.length > 0) {
                    try {
                        resolve(JSON.parse(xhr.response));
                    } catch (err) {
                        console.log(err);
                    }
                } else {
                    resolve({});
                }
            } else {
                if (xhr.response.length > 0) {
                    reject(JSON.parse(xhr.response));
                } else {
                    reject({
                        status: xhr.status,
                        msg: xhr.statusText,
                    });
                }
            }
        };

        xhr.onerror = function () {
            reject({
                status: -1,
                msg: "Unknown",
            });
        };

        xhr.send(JSON.stringify(body));
    });
}

/**
 * Make a GET HTTP request
 * @param  {string} url
 * @return {Promise}       Resolves with object from server
 */
function get(url) {
    return http(url, "GET", {});
}

/**
 * Make a POST HTTP request
 * @param  {string} url
 * @param  {string} body
 * @return {Promise}       Resolves with object from server
 */
function post(url, body) {
    return http(url, "POST", body);
}

/**
 * Make a PUT HTTP request
 * @param  {string} url
 * @param  {string} body
 * @return {Promise}       Resolves with object from server
 */
function put(url, body) {
    return http(url, "PUT", body);
}

const api = {
    createParty: function () {
        return put("/api/v1/party/create", {});
    },
    checkParty: function (id) {
        return get("/api/v1/party/check?partyId=" + id);
    },
};

/**
 * Displays a spinner in the button
 * @param {HTMLElement} button
 */
function setLoadButton(button) {
    button.setAttribute("original-data", button.innerHTML);
    button.innerHTML = '<span class="spinner-border spinner-border-sm mx-3" role="status" aria-hidden="true"></span>';
    button.disabled = true;
}

/**
 * Displays a tick in the button that disapears after 1.5 seconds.
 * @param {HTMLElement} button
 */
function setDoneButton(button) {
    button.innerHTML = '<i class="bi bi-check2 mx-3"></i>';
    setTimeout(function () {
        unsetLoadButton(button);
    }, 1500);
}

/**
 * Resets the button to its initial state
 * @param {HTMLElement} button
 */
function unsetLoadButton(button) {
    button.innerHTML = button.getAttribute("original-data");
    button.disabled = false;
}

function createParty(button) {
    setLoadButton(button);
    api.createParty();
}

function saveUsername() {
    let username = document.querySelector('#usernameInput').value;
    localStorage.setItem("username", username)
}

/*
    Main
*/
if (!localStorage.getItem("username")) {
    var usernameModal = new bootstrap.Modal(document.getElementById("usernameModal"));
    usernameModal.show();
}
