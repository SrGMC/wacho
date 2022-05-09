const { Sequelize, Model, DataTypes, Op } = require("sequelize");
const emojify = require("./utils/emojify.js");
const fastify = require("fastify")({ logger: true });
const path = require("path");
const { MovieDb } = require("moviedb-promise");

const tmdb = new MovieDb(process.env.TMDB_API_KEY);

/*
    Utils
*/
function makeString(length) {
    var result = "";
    var characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    storage: "db.sqlite",
});

const Party = sequelize.define("Party", {
    id: {
        type: DataTypes.STRING,
        unique: true,
        primaryKey: true,
        allowNull: false,
    },
});

const Item = sequelize.define("Item", {
    tmdbId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
    },
    addedBy: {
        type: DataTypes.TEXT,
        allowNull: false,
        primaryKey: true,
    },
    viewed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
    skipped: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
    },
});

Party.hasMany(Item, { foreignKey: { name: "partyId", allowNull: false } });

fastify.register(require("@fastify/static"), {
    root: path.join(__dirname, "dist"),
    prefixAvoidTrailingSlash: true
});

fastify.register(require("fastify-language-parser"), {
    supportedLngs: ["en"],
    order: ['header']
});

async function sync() {
    await sequelize.sync();
    console.log("All models were synchronized successfully.");
}

fastify.put("/api/v1/party/create", async (request, reply) => {
    let id = makeString(5);
    let repeated = true;
    while (repeated) {
        var party = await Party.findOne({
            where: {
                id: id,
            },
        });

        if (party) {
            id = makeString(5);
        } else {
            repeated = false;
        }
    }

    await Party.create({
        id: id,
    });

    reply.status(200).send({ emojiId: emojify.string2emoji(id), partyId: id });
});

fastify.get("/api/v1/party/check", async (request, reply) => {
    if (!request.query.partyId) {
        reply.status(400).send();
        return;
    }

    let id = emojify.emoji2string(request.query.partyId);
    var party = await Party.findOne({
        where: {
            id: id,
        },
    });

    if (party) {
        reply.status(200).send({ emojiId: emojify.string2emoji(id), partyId: id });
    } else {
        reply.status(404).send({ status: 404, error: "Party not found" });
    }
});

fastify.get("/api/v1/item/search", async (request, reply) => {
    if (!request.query.q || !request.query.partyId) {
        reply.status(400).send();
        return;
    }

    var items = await Item.findAll({
        where: {
            partyId: request.query.partyId,
        },
    });

    if (!items) {
        reply.status(404).send({ status: 404, error: "Party not found" });
        return;
    }

    let tmdbIds = items.map((item) => {
        return parseInt(item.tmdbId);
    });

    let result = await tmdb.searchMovie({ query: request.query.q });

    result = result.results
        .map((item) => {
            if (tmdbIds.includes(item.id)) {
                return;
            }
            return {
                tmdbId: item.id,
                title: item.title,
                overview: item.overview,
                poster: "https://image.tmdb.org/t/p/w500/" + item.poster_path,
                runtime: item.runtime,
                url: item.homepage,
            };
        })
        .filter((e) => e);

    reply.status(200).send(result);
});

fastify.put("/api/v1/item/add", async (request, reply) => {
    if (!request.body || !request.body.partyId || !request.body.addedBy || !request.body.tmdbId) {
        reply.status(400).send();
        return;
    }

    request.body.tmdbId = parseInt(request.body.tmdbId);

    var party = await Party.findOne({
        where: {
            id: request.body.partyId,
        },
    });

    if (!party) {
        reply.status(404).send({ status: 404, error: "Party not found" });
        return;
    }

    var item = await Item.findOne({
        where: {
            partyId: request.body.partyId,
            tmdbId: request.body.tmdbId,
        },
    });

    if (item) {
        reply.status(409).send({ status: 409, error: "Item is duplicated" });
        return;
    }

    var movie;
    try {
        movie = await tmdb.movieInfo({ id: request.body.tmdbId });
    } catch (err) {
        console.log(err);
        reply.status(404).send({ status: 404, error: "Movie not found" });
        return;
    }

    await Item.create({
        partyId: party.id,
        tmdbId: movie.id,
        viewed: false,
        skipped: false,
        addedBy: request.body.addedBy,
    });

    reply.status(200).send();
});

fastify.post("/api/v1/item/viewed", async (request, reply) => {
    if (!request.query.partyId || !request.query.tmdbId) {
        reply.status(400).send();
        return;
    }

    request.query.tmdbId = parseInt(request.query.tmdbId);

    var item = await Item.findOne({
        where: {
            partyId: request.query.partyId,
            tmdbId: request.query.tmdbId,
        },
    });

    if (!item) {
        reply.status(404).send({ status: 404, error: "Item not found" });
        return;
    }

    item.viewed = true;
    item.save();

    reply.status(200).send();
});

fastify.post("/api/v1/item/skipped", async (request, reply) => {
    if (!request.query.partyId || !request.query.tmdbId) {
        reply.status(400).send();
        return;
    }

    request.query.tmdbId = parseInt(request.query.tmdbId);

    var item = await Item.findOne({
        where: {
            partyId: request.query.partyId,
            tmdbId: request.query.tmdbId,
        },
    });

    if (!item) {
        reply.status(404).send({ status: 404, error: "Item not found" });
        return;
    }

    item.skipped = true;
    item.save();

    reply.status(200).send();
});

fastify.delete("/api/v1/item/viewed", async (request, reply) => {
    if (!request.query.partyId || !request.query.tmdbId) {
        reply.status(400).send();
        return;
    }

    request.query.tmdbId = parseInt(request.query.tmdbId);

    var item = await Item.findOne({
        where: {
            partyId: request.query.partyId,
            tmdbId: request.query.tmdbId,
        },
    });

    if (!item) {
        reply.status(404).send({ status: 404, error: "Item not found" });
        return;
    }

    item.viewed = false;
    item.save();

    reply.status(200).send();
});

fastify.delete("/api/v1/item/skipped", async (request, reply) => {
    if (!request.query.partyId || !request.query.tmdbId) {
        reply.status(400).send();
        return;
    }

    request.query.tmdbId = parseInt(request.query.tmdbId);

    var item = await Item.findOne({
        where: {
            partyId: request.query.partyId,
            tmdbId: request.query.tmdbId,
        },
    });

    if (!item) {
        reply.status(404).send({ status: 404, error: "Item not found" });
        return;
    }

    item.skipped = false;
    item.save();

    reply.status(200).send();
});

fastify.get("/api/v1/item/list", async (request, reply) => {
    if (!request.query.partyId) {
        reply.status(400).send();
        return;
    }

    var items = await Item.findAll({
        where: {
            partyId: request.query.partyId,
        },
        order: [
            ['tmdbId', 'DESC'],
        ]
    });

    if (!items) {
        reply.status(404).send({ status: 404, error: "Party not found" });
        return;
    }

    items = items.map((item) => {
        return {
            partyId: item.partyId,
            tmdbId: item.tmdbId,
            viewed: item.viewed,
            skipped: item.skipped,
            addedBy: item.addedBy,
        };
    });

    for (let i = 0; i < items.length; i++) {
        let movie = await tmdb.movieInfo({ id: items[i].tmdbId, language: request.detectedLng });
        items[i]["title"] = movie.title;
        items[i]["overview"] = movie.overview;
        items[i]["poster"] = "https://image.tmdb.org/t/p/w500/" + movie.poster_path;
        items[i]["runtime"] = movie.runtime;
        items[i]["url"] = movie.homepage;
    }

    reply.status(200).send(items);
});

fastify.get("/api/v1/item/random", async (request, reply) => {
    if (!request.query.partyId) {
        reply.status(400).send();
        return;
    }

    var items = await Item.findAll({
        where: {
            partyId: request.query.partyId,
            viewed: false,
            skipped: false,
        },
        order: [
            ['tmdbId', 'DESC'],
        ]
    });

    if (!items) {
        reply.status(404).send({ status: 404, error: "Party not found" });
        return;
    }

    let item = items[Math.floor(Math.random() * items.length)];

    let movie = await tmdb.movieInfo({ id: item.tmdbId, language: request.detectedLng });
    let watchProviders = await tmdb.movieWatchProviders({ id: item.tmdbId });
    countryProviders = watchProviders.results[request.headers["CF-IPCountry"]];
    if (!countryProviders) {
        countryProviders = watchProviders.results["GB"];
    }

    item = {
        partyId: item.partyId,
        tmdbId: item.tmdbId,
        viewed: item.viewed,
        skipped: item.skipped,
        addedBy: item.addedBy,
        title: movie.title,
        overview: movie.overview,
        poster: "https://image.tmdb.org/t/p/original/" + movie.poster_path,
        runtime: movie.runtime,
        url: movie.homepage,
        providers: countryProviders.link,
    };

    reply.status(200).send(item);
});

// Run server
const start = async () => {
    try {
        await sync();
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
    try {
        await fastify.listen(process.env.PORT || 3000, "0.0.0.0");
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
