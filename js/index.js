const http = new HTTPClass();
const api = new APIClass(http);

function createParty(button) {
    setLoadButton(button);
    api.createParty().then((party) => {
        window.location = window.location.origin + "/" + lang + "/list?id=" + party.emojiId;
    });
}

async function init() {
    var emojiId = localStorage.getItem("emojiId");
    if (emojiId) {
        document.querySelector("#partyForm").setAttribute("l-state", JSON.stringify({ emojiId: emojiId }));
    }

    Lucia.init();
}

init();
