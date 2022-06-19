const db = require('./libs/db.js');
const emojify = require('./libs/emojify.js');
const fastify = require('fastify')({ logger: true });
const path = require('path');
const sanitize = require('./libs/sanitize.js').sanitize;
const sequelize = require('./libs/sequelize.db.js');
const tmdb = require('./libs/tmdb.js');

const NodeCache = require('node-cache');
const partyCache = new NodeCache({ maxKeys: 1024 });

const Party = new db.Party(sequelize, partyCache);
const Item = new db.Item(sequelize);

/*
    Utils
*/
function makeString(length) {
    var result = '';
    var characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

/*
    Rate Limit store
*/
function RateLimiterStore(options) {
    this.options = options;
    this.route = '';
}

RateLimiterStore.prototype.routeKey = function routeKey(route) {
    if (route) this.route = route;
    return route;
};

RateLimiterStore.prototype.incr = async function incr(key, cb) {
    const now = new Date().getTime();
    const ttl = now + this.options.timeWindow;
    const cond = { Route: this.route, Source: key };

    const RateLimit = await sequelize.RateLimits.findOne({ where: cond });

    if (RateLimit && parseInt(RateLimit.TTL, 10) > now) {
        try {
            await RateLimit.update({ Count: RateLimit.Count + 1 }, cond);
            cb(null, {
                current: RateLimit.Count + 1,
                ttl: RateLimit.TTL,
            });
        } catch (err) {
            cb(err, {
                current: 0,
            });
        }
    } else {
        sequelize.sequelize
            .query(
                `INSERT INTO "RateLimits"("Route", "Source", "Count", "TTL")
              VALUES('${this.route}', '${key}', 1,
              ${(RateLimit && RateLimit.TTL) || ttl})
              ON CONFLICT("Route", "Source") DO UPDATE SET "Count"=1, "TTL"=${ttl}`
            )
            .then(() => {
                cb(null, {
                    current: 1,
                    ttl: (RateLimit && RateLimit.TTL) || ttl,
                });
            })
            .catch((err) => {
                cb(err, {
                    current: 0,
                });
            });
    }
};

RateLimiterStore.prototype.child = function child(routeOptions = {}) {
    const options = Object.assign(this.options, routeOptions);
    const store = new RateLimiterStore(options);
    store.routeKey(routeOptions.routeInfo.method + routeOptions.routeInfo.url);
    return store;
};

/*
    Fastify imports
*/
fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, 'dist'),
    prefixAvoidTrailingSlash: true,
});

fastify.register(require('fastify-language-parser'), {
    supportedLngs: ['es', 'en'],
    order: ['header'],
});

fastify.register(require('@fastify/rate-limit'), {
    max: 15000,
    timeWindow: '10 minutes',
    ban: 5,
    store: RateLimiterStore,
});

fastify.addHook('preHandler', async (request, reply) => {
    console.log(request.detectedLng);
    console.log(request.headers);
})

/*
    Paths
*/
fastify.put('/api/v1/party/create', async (request, reply) => {
    let id = makeString(Math.floor(Math.random() * (6 - 5 + 1)) + 5);
    let repeated = true;
    while (repeated) {
        var party = await Party.checkParty(id);

        if (party) {
            id = makeString(Math.floor(Math.random() * (6 - 5 + 1)) + 5);
        } else {
            repeated = false;
        }
    }

    reply.status(200).send(await Party.createParty(id));
});

fastify.get('/api/v1/party/check', async (request, reply) => {
    if (!request.query.partyId || request.query.partyId.length > 20) {
        reply.status(400).send();
        return;
    }

    let id = emojify.emoji2string(request.query.partyId);
    var party = await Party.checkParty(id);

    if (party) {
        reply.status(200).send(party);
    } else {
        reply.status(404).send({ status: 404, error: 'Party not found' });
    }
});

fastify.get('/api/v1/item/search', async (request, reply) => {
    if (!request.query.q || request.query.q.length > 128 || !request.query.partyId || request.query.partyId.length > 20) {
        reply.status(400).send();
        return;
    }

    request.query.q = sanitize(request.query.q);
    request.query.partyId = sanitize(request.query.partyId);
    if (request.query.lang) {
        request.query.lang = sanitize(request.query.lang);
    }

    var party = await Party.checkParty(request.query.partyId);
    if (!party) {
        reply.status(404).send({ status: 404, error: 'Party not found' });
        return;
    }

    var items = await Party.getParty(party.partyId);
    if (!items) {
        reply.status(404).send({ status: 404, error: 'Party not found' });
        return;
    }

    let tmdbIds = items.map((item) => {
        return parseInt(item.tmdbId);
    });

    let result = await tmdb.searchMovie({ query: request.query.q, language: request.query.lang || request.detectedLng });

    result = result.results
        .map((item) => {
            if (tmdbIds.includes(item.id)) {
                return;
            }
            return {
                tmdbId: item.id,
                title: item.title,
                overview: item.overview,
                poster: item.poster_path
                    ? 'https://image.tmdb.org/t/p/w500/' + item.poster_path
                    : '/assets/unknown.png',
                runtime: item.runtime,
                url: item.homepage,
            };
        })
        .filter((e) => e);

    reply.status(200).send(result);
});

fastify.put('/api/v1/item/add', async (request, reply) => {
    if (!request.body || !request.body.partyId || request.body.partyId.length > 20 || !request.body.addedBy || request.body.addedBy.length > 128 || !request.body.tmdbId) {
        reply.status(400).send();
        return;
    }

    request.body.tmdbId = parseInt(request.body.tmdbId);
    request.body.partyId = sanitize(request.body.partyId);
    request.body.addedBy = sanitize(request.body.addedBy);

    var party = await Party.checkParty(request.body.partyId);
    if (!party) {
        reply.status(404).send({ status: 404, error: 'Party not found' });
        return;
    }

    var item = await Item.getItem(request.body.partyId, request.body.tmdbId);
    if (item) {
        reply.status(409).send({ status: 409, error: 'Item is duplicated' });
        return;
    }

    var movie;
    try {
        movie = await tmdb.movieInfo({ id: request.body.tmdbId });
    } catch (err) {
        console.log(err);
        reply.status(404).send({ status: 404, error: 'Movie not found' });
        return;
    }

    await Item.createItem(party.partyId, movie.id, request.body.addedBy);

    reply.status(200).send();
});

fastify.post('/api/v1/item/:field', async (request, reply) => {
    if (!request.query.partyId || !request.query.tmdbId) {
        reply.status(400).send();
        return;
    }

    if (!(request.params.field == 'viewed' || request.params.field == 'skipped')) {
        reply.status(404).send({ status: 404, error: 'POST /api/v1/item/' + request.params.field + ' not found' });
        return;
    }

    request.query.tmdbId = parseInt(request.query.tmdbId);
    request.query.partyId = sanitize(request.query.partyId);

    var party = await Party.checkParty(request.query.partyId);
    if (!party) {
        reply.status(404).send({ status: 404, error: 'Party not found' });
        return;
    }

    await Item.setFieldValue(party.partyId, request.query.tmdbId, request.params.field, true);

    reply.status(200).send();
});

fastify.delete('/api/v1/item/:field', async (request, reply) => {
    if (!request.query.partyId || request.query.partyId.length > 20 || !request.query.tmdbId) {
        reply.status(400).send();
        return;
    }

    if (!(request.params.field == 'viewed' || request.params.field == 'skipped')) {
        reply.status(404).send({ status: 404, error: 'DELETE /api/v1/item/' + request.params.field + ' not found' });
        return;
    }

    request.query.tmdbId = parseInt(request.query.tmdbId);
    request.query.partyId = sanitize(request.query.partyId);

    var party = await Party.checkParty(request.query.partyId);
    if (!party) {
        reply.status(404).send({ status: 404, error: 'Party not found' });
        return;
    }

    await Item.setFieldValue(party.partyId, request.query.tmdbId, request.params.field, false);

    reply.status(200).send();
});

fastify.get('/api/v1/item/list', async (request, reply) => {
    if (!request.query.partyId || request.query.partyId.length > 20) {
        reply.status(400).send();
        return;
    }

    request.query.partyId = sanitize(request.query.partyId);
    if (request.query.lang) {
        request.query.lang = sanitize(request.query.lang);
    }

    var party = await Party.checkParty(request.query.partyId);
    if (!party) {
        reply.status(404).send({ status: 404, error: 'Party not found' });
        return;
    }

    var items = await Party.getParty(party.partyId);
    if (!items) {
        reply.status(404).send({ status: 404, error: 'Party not found' });
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
        let movie = await tmdb.movieInfo({ id: items[i].tmdbId, language: request.query.lang || request.detectedLng });
        items[i]['title'] = movie.title;
        items[i]['overview'] = movie.overview;
        if (movie.poster_path) {
            items[i]['poster'] = 'https://image.tmdb.org/t/p/w500/' + movie.poster_path;
        } else {
            items[i]['poster'] = '/assets/unknown.png';
        }
        items[i]['runtime'] = movie.runtime;
        items[i]['url'] = movie.homepage;
    }

    reply.status(200).send(items);
});

fastify.get('/api/v1/item/random', async (request, reply) => {
    if (!request.query.partyId || request.query.partyId.length > 20) {
        reply.status(400).send();
        return;
    }

    request.query.partyId = sanitize(request.query.partyId);
    if (request.query.lang) {
        request.query.lang = sanitize(request.query.lang);
    }

    var party = await Party.checkParty(request.query.partyId);
    if (!party) {
        reply.status(404).send({ status: 404, error: 'Party not found' });
        return;
    }

    let item = await Item.getRandomItem(party.partyId);

    let movie = await tmdb.movieInfo({ id: item.tmdbId, language: request.query.lang || request.detectedLng  });
    let watchProviders = await tmdb.movieWatchProviders({ id: item.tmdbId });
    countryProviders = watchProviders.results[request.headers['CF-IPCountry']];
    if (!countryProviders) {
        countryProviders = watchProviders.results['GB'];
    }

    item = {
        partyId: item.partyId,
        tmdbId: item.tmdbId,
        viewed: item.viewed,
        skipped: item.skipped,
        addedBy: item.addedBy,
        title: movie.title,
        overview: movie.overview,
        poster: movie.poster_path ? 'https://image.tmdb.org/t/p/original/' + movie.poster_path : '/assets/unknown.png',
        runtime: movie.runtime,
        url: movie.homepage,
        providers: countryProviders.link,
    };

    reply.status(200).send(item);
});

// Run server
const start = async () => {
    try {
        await sequelize.sync();
        fastify.log.info('All models were synchronized successfully.');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
    try {
        await fastify.listen(process.env.PORT || 3000, '0.0.0.0');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
