const urlParams = new URLSearchParams(window.location.search);
const partyId = urlParams.get("id");

const http = new HTTPClass();
const api = new APIClass(http);

function setItemAsViewed(tmdbId, items, element) {
    setLoadButton(element);
    api.setItemAsViewed(tmdbId).then(() => {
        setDoneButtonWithTimeout(element);
        for (let i = 0; i < items.list.length; i++) {
            if(items.list[i].tmdbId == tmdbId) {
                items.list[i].viewed = true;
                break;
            }        
        }
    })
}

function unsetItemAsViewed(tmdbId, items, element) {
    setLoadButton(element);
    api.unsetItemAsViewed(tmdbId).then(() => {
        setDoneButtonWithTimeout(element);
        for (let i = 0; i < items.list.length; i++) {
            if(items.list[i].tmdbId == tmdbId) {
                items.list[i].viewed = false;
                break;
            }        
        }
    })
}

function setItemAsSkipped(tmdbId, items, element) {
    setLoadButton(element);
    api.setItemAsSkipped(tmdbId).then(() => {
        setDoneButtonWithTimeout(element);
        for (let i = 0; i < items.list.length; i++) {
            if(items.list[i].tmdbId == tmdbId) {
                items.list[i].skipped = true;
                break;
            }        
        }
    })
}

function unsetItemAsSkipped(tmdbId, items, element) {
    setLoadButton(element);
    api.unsetItemAsSkipped(tmdbId).then(() => {
        setDoneButtonWithTimeout(element);
        for (let i = 0; i < items.list.length; i++) {
            if(items.list[i].tmdbId == tmdbId) {
                items.list[i].skipped = false;
                break;
            }        
        }
    })
}

async function init() {
    const app = document.querySelector("#app");

    try {
        var party = await api.checkParty(partyId);
        localStorage.setItem("partyId", party.partyId);
        localStorage.setItem("emojiId", party.emojiId);
    } catch (err) {
        console.log(err);
        var partyNotFoundModal = new bootstrap.Modal(document.getElementById("partyNotFoundModal"));
        partyNotFoundModal.show();
        return;
    }

    var items = await api.getPartyList();
    app.setAttribute("l-state", JSON.stringify({ 
        emojiId: party.emojiId, 
        partyId: party.partyId,
        partyUrl: window.location.origin + "/" + lang + "/list?id=" + party.emojiId,
        items: {
            length: items.length,
            list: items,
        },
    }));
    Lucia.init();
}

init();