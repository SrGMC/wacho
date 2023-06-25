<p align="center">
  <img width="200" src="./web/assets/wacho_512.png">
</p>
<p align="center">
  Wacho lets you and your friends create collaborative lists with movies you want to watch. Then, when you get together, let us choose what to watch.<br><a href="https://wacho.party">https://wacho.party</a>
</p>

---

[Buy Me a Coffee ☕️](https://www.buymeacoffee.com/srgmc)

# `wacho.party` is getting shut down

Wacho was a project I built for me and my friends to keep track of what movies to watch.

It was really fun to create but having seen the metrics of the service, it's expensive to run for so little use.

However, this is not the end for wacho. You can checkout the code repository and the guide on how to selfhost it yourself.

If you need access to your data, please, send me a message at wacho at galisteo.me with the Watch Party IDs.

# Installation

Wacho can be deployed using Docker or [fly.io](https://fly.io/).

## Requirements

Before running/installing, you'll need:

- A [TMDB API key](https://www.themoviedb.org/documentation/api)
- A database (Optional, can use SQLite file)

## Docker

First, build the image:

```bash
docker build -t srgmc/wacho .
```

Then change the environment variables inside the `.env.example` file and rename it to `.env`.

Finally, run the image:

```bash
docker run --name wacho --env-file .env -v $(pwd)/db.sqlite:/usr/src/app/db.sqlite -p 8000:8000 -d srgmc/wacho
```

## fly.io

First, create an account on [fly.io](https://fly.io/). Don't forget to install `flyctl`.

Then, create a Postgres database on fly.io: [Postgres on Fly](https://fly.io/docs/reference/postgres/).

Once you have created the database, create the app on Fly

```bash
flyctl launch
```

attach the database to the app

```bash
flyctl postgres attach --app wacho --postgres-app <postgres-app-name>
```

and deploy the app:

```bash
flyctl deploy
```

## How to build/run?

### API

Simply run `node index.js` to serve the API and the UI. Don't forget to `npm install` before running the server.

### UI

Every time you make a change to the UI (inside `web/`), run `node build.js` to generate the web files for the app.

## License

Copyright (C) 2021 Álvaro Galisteo

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see https://www.gnu.org/licenses/.
