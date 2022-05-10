const emojify = require("./emojify.js");

class Party {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
    }

    createParty(partyId) {
        return new Promise((resolve, reject) => {
            this.db.Party.create({
                id: partyId,
            })
                .then((res) => {
                    let obj = { emojiId: emojify.string2emoji(res.id), partyId: res.id };
                    if (this.cache) {
                        this.cache.set(res.id, obj);
                    }
                    resolve(obj);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    getParty(partyId) {
        return new Promise((resolve, reject) => {
            this.db.Item.findAll({
                where: {
                    partyId: partyId,
                },
                order: [["tmdbId", "DESC"]],
            })
                .then((res) => {
                    resolve(res);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    checkParty(partyId) {
        var value;
        if (this.cache) {
            value = this.cache.get(partyId);
        }

        return new Promise((resolve, reject) => {
            if (value) {
                console.log("[checkParty] Returning from cache");
                resolve(value);
            } else {
                this.db.Party.findOne({
                    where: {
                        id: partyId,
                    },
                })
                    .then((res) => {
                        let obj;
                        if (res) {
                            obj = { emojiId: emojify.string2emoji(res.id), partyId: res.id };
                            if (this.cache) {
                                this.cache.set(res.id, obj);
                            }
                        }
                        resolve(obj);
                    })
                    .catch((err) => {
                        reject(err);
                    });
            }
        });
    }
}

class Item {
    constructor(db) {
        this.db = db;
    }

    getItem(partyId, tmdbId) {
        return new Promise(async (resolve, reject) => {
            var item = await this.db.Item.findOne({
                where: {
                    partyId: partyId,
                    tmdbId: tmdbId,
                },
            });

            resolve(item);
        });
    }

    createItem(partyId, tmdbId, addedBy) {
        return new Promise(async (resolve, reject) => {
            await this.db.Item.create({
                partyId: partyId,
                tmdbId: tmdbId,
                viewed: false,
                skipped: false,
                addedBy: addedBy,
            });

            resolve();
        });
    }

    getRandomItem(partyId) {
        return new Promise(async (resolve, reject) => {
            var items = await this.db.Item.findAll({
                where: {
                    partyId: partyId,
                    viewed: false,
                    skipped: false,
                },
                order: [["tmdbId", "DESC"]],
            });

            if (!items) {
                reject();
                return;
            }

            let item = items[Math.floor(Math.random() * items.length)];

            resolve(item);
        });
    }

    setFieldValue(partyId, tmdbId, field, value) {
        return new Promise(async (resolve, reject) => {
            var item = await this.db.Item.findOne({
                where: {
                    partyId: partyId,
                    tmdbId: tmdbId,
                },
            });

            if (!item) {
                reject({ status: 404, error: "Item not found" });
                return;
            }

            item[field] = value;
            item.save();

            resolve();
        });
    }
}

exports.Party = Party;
exports.Item = Item;
