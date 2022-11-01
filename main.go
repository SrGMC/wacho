package main

import (
    "log"
    "net/http"
    "os"

    "github.com/labstack/echo/v5"
    "github.com/pocketbase/pocketbase"
    "github.com/pocketbase/pocketbase/apis"
    "github.com/pocketbase/pocketbase/core"
    "github.com/cyruzin/golang-tmdb"
)

type Movie struct {
    ID int `json:"id"`
    Title string `json:"title"`
    Overview string `json:"overview"`
    Poster string `json:"poster"`
    Runtime int `json:"runtime"`
    URL string `json:"url"`
}

func main() {
    pocketbaseApp := pocketbase.New()
    tmdbClient, err := tmdb.Init(os.Getenv("TMDB_API_KEY"))
    tmdbClient.SetClientAutoRetry()
    
    if err != nil {
      log.Fatal(err)
    }

    pocketbaseApp.OnBeforeServe().Add(func(e *core.ServeEvent) error {
        // add new "GET /api/hello" route to the app router (echo)
        e.Router.AddRoute(echo.Route{
            Method: http.MethodGet,
            Path:   "/api/tmdb/search",
            Handler: func(c echo.Context) error {
                query := c.QueryParam("q")
                
                if query == "" {
                    return c.String(400, "Bad request")
                }
                
                movie := Movie{
                    ID: 1,
                    Title: query,
                    Overview: "Lorem Ipsum dolor sit amet",
                    Poster: "/assets/unknown.png",
                    Runtime: 109,
                    URL: "https://tmdb.org",
                }
                
                return c.JSON(200, movie)
            },
            Middlewares: []echo.MiddlewareFunc{
                apis.ActivityLogger(pocketbaseApp),
            },
        })

        return nil
    })

    if err := pocketbaseApp.Start(); err != nil {
        log.Fatal(err)
    }
}