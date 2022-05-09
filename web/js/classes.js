class HTTP {
    constructor() {}
    /**
     * Make a HTTP request
     * @param  {string} url
     * @param  {string} method
     * @param  {string} body
     * @return {Promise}       Resolves with object from server
     */
    http(url, method, body) {
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
    get(url) {
        return this.http(url, "GET", {});
    }

    /**
     * Make a POST HTTP request
     * @param  {string} url
     * @param  {string} body
     * @return {Promise}       Resolves with object from server
     */
    post(url, body) {
        return this.http(url, "POST", body);
    }

    /**
     * Make a PUT HTTP request
     * @param  {string} url
     * @param  {string} body
     * @return {Promise}       Resolves with object from server
     */
    put(url, body) {
        return this.http(url, "PUT", body);
    }

    /**
     * Make a DELETE HTTP request
     * @param  {string} url
     * @param  {string} body
     * @return {Promise}       Resolves with object from server
     */
    delete(url, body) {
        return this.http(url, "DELETE", body);
    }
}

class API {
    constructor(http) {
        this.http = http;
    }

    createParty() {
        return this.http.put("/api/v1/party/create", {});
    }

    checkParty(id) {
        return this.http.get("/api/v1/party/check?partyId=" + id);
    }

    getPartyList() {
        let partyId = localStorage.getItem("partyId");
        return this.http.get("/api/v1/item/list?partyId=" + partyId);
    }

    searchMovie(query) {
        return this.http.get("/api/v1/item/search?q=" + query + "&partyId=" + localStorage.getItem("partyId"));
    }

    addItemToParty(tmdbId) {
        return this.http.put("/api/v1/item/add", {
            partyId: localStorage.getItem("partyId"),
            addedBy: localStorage.getItem("username"),
            tmdbId: tmdbId,
        });
    }

    setItemAsViewed(tmdbId) {
        return this.http.post("/api/v1/item/viewed?tmdbId=" + tmdbId + "&partyId=" + localStorage.getItem("partyId"), {});
    }

    setItemAsSkipped(tmdbId) {
        return this.http.post("/api/v1/item/skipped?tmdbId=" + tmdbId + "&partyId=" + localStorage.getItem("partyId"), {});
    }

    unsetItemAsViewed(tmdbId) {
        return this.http.delete("/api/v1/item/viewed?tmdbId=" + tmdbId + "&partyId=" + localStorage.getItem("partyId"), {});
    }

    unsetItemAsSkipped(tmdbId) {
        return this.http.delete("/api/v1/item/skipped?tmdbId=" + tmdbId + "&partyId=" + localStorage.getItem("partyId"), {});
    }

    getRandomMovie() {
        return this.http.get("/api/v1/item/random?partyId=" + localStorage.getItem("partyId"));
    }
}
