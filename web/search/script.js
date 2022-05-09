const partyId = localStorage.getItem("emojiId");

const http = new HTTP();
const api = new API(http);

function searchMovie(query, items) {
    api.searchMovie(query).then((res) => {
        res.forEach((item) => {
            items.list.push(item);
        })
        items.length = res.length;
        items.searching = false;
    })
}

function addItemToParty(tmdbId, element) {
    setLoadButton(element);
    api.addItemToParty(tmdbId).then(() => {
        setDoneButton(element);
    }).catch((err) => {
        console.log(err);
        unsetLoadButton(element)
    });
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

    app.setAttribute(
        "l-state",
        JSON.stringify({
            emojiId: party.emojiId,
            partyId: party.partyId,
            items: {
                length: 0,
                list: [],
                searching: false
            },
            query: "",
        })
    );
    Lucia.init();
}

init();
