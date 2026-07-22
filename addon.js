const express = require("express");
const axios = require("axios");
const { addonBuilder, getRouter } = require("stremio-addon-sdk");

const app = express();

const PORT = process.env.PORT || 7000;

const LIBRARY_URL =
    "https://api.github.com/repos/plamenpm/personal-subtitles-library/contents/";

// --------------------------------------------------
// Manifest
// --------------------------------------------------

const manifest = {
    id: "com.plamen.personal.subtitles",
    version: "1.0.1",
    name: "Personal Subtitles",
    description: "Personal Bulgarian subtitles from GitHub",

    resources: [
        "subtitles"
    ],

    types: [
        "movie",
        "series"
    ],

    catalogs: [],

    idPrefixes: [
        "tt"
    ]
};

// --------------------------------------------------
// Stremio Addon Builder
// --------------------------------------------------

const builder = new addonBuilder(manifest);

// --------------------------------------------------
// GitHub
// --------------------------------------------------

async function getSubtitleFiles() {

    console.log("Loading subtitle files from GitHub...");

    const response = await axios.get(LIBRARY_URL);

    const files = response.data.filter(file =>
        file.name &&
        file.name.toLowerCase().endsWith(".srt")
    );

    console.log(
        "GitHub subtitle files found:",
        files.length
    );

    return files;
}

// --------------------------------------------------
// Extract season / episode
// --------------------------------------------------

function getEpisodeInfo(id, extra) {

    // First try the Stremio video ID
    // Example:
    // tt1234567:2:1

    if (id) {

        const match = id.match(/tt\d+:(\d+):(\d+)/);

        if (match) {

            return {
                season: parseInt(match[1], 10),
                episode: parseInt(match[2], 10)
            };

        }
    }

    // Try filename from Stremio extra
    // Example:
    // Landman.S02E01...
    
    if (extra && extra.filename) {

        const match =
            extra.filename.match(/S(\d{1,2})E(\d{1,2})/i);

        if (match) {

            return {
                season: parseInt(match[1], 10),
                episode: parseInt(match[2], 10)
            };

        }
    }

    return null;
}

// --------------------------------------------------
// Subtitle Handler
// --------------------------------------------------

builder.defineSubtitlesHandler(async (args) => {

    console.log(
        "----------------------------------------"
    );

    console.log(
        "SUBTITLE REQUEST"
    );

    console.log(
        "Type:",
        args.type
    );

    console.log(
        "ID:",
        args.id
    );

    console.log(
        "Extra:",
        JSON.stringify(args.extra || {})
    );

    const subtitles = [];

    try {

        const files =
            await getSubtitleFiles();

        // ------------------------------------------
        // SERIES
        // ------------------------------------------

        if (args.type === "series") {

            const episodeInfo =
                getEpisodeInfo(
                    args.id,
                    args.extra
                );

            if (!episodeInfo) {

                console.log(
                    "Could not determine season and episode."
                );

                return {
                    subtitles: []
                };
            }

            const season =
                String(
                    episodeInfo.season
                ).padStart(2, "0");

            const episode =
                String(
                    episodeInfo.episode
                ).padStart(2, "0");

            const episodeCode =
                `S${season}E${episode}`;

            console.log(
                "Looking for:",
                episodeCode
            );

            for (const file of files) {

                if (
                    file.name
                        .toLowerCase()
                        .includes(
                            episodeCode.toLowerCase()
                        )
                ) {

                    console.log(
                        "MATCH:",
                        file.name
                    );

                    subtitles.push({

                        id: file.sha,

                        url: file.download_url,

                        lang: "bul",

                        label: file.name

                    });

                }

            }

        }

        // ------------------------------------------
        // MOVIE
        // ------------------------------------------

        if (args.type === "movie") {

            console.log(
                "Movie request detected."
            );

            // For now return all movie subtitle files.
            // We will improve movie matching later.

            for (const file of files) {

                subtitles.push({

                    id: file.sha,

                    url: file.download_url,

                    lang: "bul",

                    label: file.name

                });

            }

        }

    } catch (error) {

        console.error(
            "SUBTITLE ERROR:",
            error.message
        );

    }

    console.log(
        "SUBTITLES RETURNED:",
        subtitles.length
    );

    return {

        subtitles,

        cacheMaxAge: 300

    };

});

// --------------------------------------------------
// Get official Stremio Router
// --------------------------------------------------

const addonInterface =
    builder.getInterface();

const router =
    getRouter(addonInterface);

// --------------------------------------------------
// Mount Stremio Router
// --------------------------------------------------

app.use(
    "/",
    router
);

// --------------------------------------------------
// Start server
// --------------------------------------------------

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "========================================"
        );

        console.log(
            "Personal Subtitles addon is running"
        );

        console.log(
            "Port:",
            PORT
        );

        console.log(
            "Manifest:",
            "/manifest.json"
        );

        console.log(
            "========================================"
        );

    }
);
