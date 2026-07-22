const express = require("express");
const axios = require("axios");
const { addonBuilder } = require("stremio-addon-sdk");

const app = express();

const PORT = process.env.PORT || 7000;

const LIBRARY_URL =
    "https://api.github.com/repos/plamenpm/personal-subtitles-library/contents/";

// --------------------------------------------------
// Stremio Addon Manifest
// --------------------------------------------------

const manifest = {
    id: "com.plamen.personal.subtitles",
    version: "1.0.0",
    name: "Personal Subtitles",
    description: "Personal Bulgarian subtitles from a private GitHub library",

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
// GitHub – get subtitle files
// --------------------------------------------------

async function getSubtitleFiles() {

    const response = await axios.get(LIBRARY_URL);

    return response.data.filter(file =>
        file.name &&
        file.name.toLowerCase().endsWith(".srt")
    );
}

// --------------------------------------------------
// Extract season and episode from Stremio ID
// --------------------------------------------------

function getEpisodeInfo(id) {

    const match = id.match(/tt\d+:(\d+):(\d+)/);

    if (!match) {
        return null;
    }

    return {
        season: parseInt(match[1], 10),
        episode: parseInt(match[2], 10)
    };
}

// --------------------------------------------------
// Find subtitles
// --------------------------------------------------

builder.defineSubtitlesHandler(async ({ type, id }) => {

    console.log("Subtitle request:", type, id);

    const subtitles = [];

    try {

        const files = await getSubtitleFiles();

        // ------------------------------------------
        // SERIES
        // ------------------------------------------

        if (type === "series") {

            const episodeInfo = getEpisodeInfo(id);

            if (!episodeInfo) {

                console.log(
                    "Could not determine season/episode from:",
                    id
                );

                return {
                    subtitles: []
                };
            }

            const season =
                String(episodeInfo.season).padStart(2, "0");

            const episode =
                String(episodeInfo.episode).padStart(2, "0");

            const episodeCode =
                `S${season}E${episode}`;

            console.log(
                "Searching for episode:",
                episodeCode
            );

            for (const file of files) {

                const filename = file.name;

                if (
                    filename
                        .toLowerCase()
                        .includes(episodeCode.toLowerCase())
                ) {

                    subtitles.push({
                        id: file.sha,
                        url: file.download_url,
                        lang: "bul",
                        label: filename
                    });

                }
            }
        }

        // ------------------------------------------
        // MOVIES
        // ------------------------------------------

        if (type === "movie") {

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
            "Error loading subtitles:",
            error.message
        );

    }

    console.log(
        "Subtitles found:",
        subtitles.length
    );

    return {
        subtitles
    };
});

// --------------------------------------------------
// Manifest endpoint
// --------------------------------------------------

app.get("/manifest.json", (req, res) => {

    res.json(manifest);

});

// --------------------------------------------------
// Stremio addon routes
// --------------------------------------------------

const addonInterface =
    builder.getInterface();

app.get(
    "/subtitles/:type/:id.json",
    async (req, res) => {

        try {

            const result =
                await addonInterface.subtitles(
                    req.params.type,
                    req.params.id
                );

            res.json(result);

        } catch (error) {

            console.error(
                "Subtitle endpoint error:",
                error.message
            );

            res.json({
                subtitles: []
            });

        }

    }
);

// --------------------------------------------------
// Start server
// --------------------------------------------------

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Personal Subtitles addon listening on port ${PORT}`
        );

        console.log(
            `Manifest available at /manifest.json`
        );

    }
);
