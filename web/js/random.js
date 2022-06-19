const partyId = localStorage.getItem("emojiId");

const http = new HTTPClass();
const api = new APIClass(http);

function setItemAsViewed(tmdbId, item, element) {
    setLoadButton(element);
    api.setItemAsViewed(tmdbId).then(() => {
        setDoneButtonWithTimeout(element);
        item.viewed = true;
    })
}

function unsetItemAsViewed(tmdbId, item, element) {
    setLoadButton(element);
    api.unsetItemAsViewed(tmdbId).then(() => {
        setDoneButtonWithTimeout(element);
        item.viewed = false;
    })
}

function setItemAsSkipped(tmdbId, item, element) {
    setLoadButton(element);
    api.setItemAsSkipped(tmdbId).then(() => {
        setDoneButtonWithTimeout(element);
        item.skipped = true;
    })
}

function unsetItemAsSkipped(tmdbId, item, element) {
    setLoadButton(element);
    api.unsetItemAsSkipped(tmdbId).then(() => {
        setDoneButtonWithTimeout(element);
        item.skipped = false;
    })
}

async function init() {
    const app = document.querySelector("#app");

    try {
        var party = await api.checkParty(partyId);
    } catch (err) {
        console.log(err);
        var partyNotFoundModal = new bootstrap.Modal(document.getElementById("partyNotFoundModal"));
        partyNotFoundModal.show();
    }

    var item = await api.getRandomMovie();
    app.setAttribute(
        "l-state",
        JSON.stringify({
            emojiId: party.emojiId,
            partyId: party.partyId,
            item: item,
            loading: false
        })
    );
    Lucia.init();
}

init();
