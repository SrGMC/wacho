const { MovieDb } = require("moviedb-promise");
const NodeCache = require("node-cache");
const movieDb = new MovieDb(process.env.TMDB_API_KEY);

const tmdbMovieCache = new NodeCache({ maxKeys: 1024 });
const tmdbProviderCache = new NodeCache({ maxKeys: 1024 });
const tmdbSearchCache = new NodeCache({ maxKeys: 1024 });

function movieInfo(options) {
    let language = options.language || "en";
    let key = options.id + language;

    let movie = tmdbMovieCache.get(key);
    if (movie) {
        console.info("Returning from cache");
        return new Promise((resolve, reject) => {
            resolve(movie);
        });
    } else {
        return new Promise((resolve, reject) => {
            movieDb
                .movieInfo({ id: options.id, language: language })
                .then((res) => {
                    tmdbMovieCache.set(key, res);
                    resolve(res);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }
}
function movieWatchProviders(options) {
    let key = options.id;

    let movie = tmdbProviderCache.get(key);
    if (movie) {
        console.info("Returning from cache");
        return new Promise((resolve, reject) => {
            resolve(movie);
        });
    } else {
        return new Promise((resolve, reject) => {
            movieDb
                .movieWatchProviders({ id: options.id })
                .then((res) => {
                    tmdbProviderCache.set(key, res);
                    resolve(res);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }
}
function searchMovie(options) {
    let key = options.query;

    let movie = tmdbSearchCache.get(key);
    if (movie) {
        console.info("Returning from cache");
        return new Promise((resolve, reject) => {
            resolve(movie);
        });
    } else {
        return new Promise((resolve, reject) => {
            movieDb
                .searchMovie({ query: options.query })
                .then((res) => {
                    tmdbSearchCache.set(key, res);
                    resolve(res);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }
}

exports.movieInfo = movieInfo;
exports.movieWatchProviders = movieWatchProviders;
exports.searchMovie = searchMovie;
