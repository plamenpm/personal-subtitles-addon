const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const builder = new addonBuilder({
    id: "com.plamen.personal.subtitles",
    version: "1.0.0",
    name: "Personal Subtitles",
    description: "Personal Bulgarian subtitles addon for Stremio",
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
});

const LIBRARY_URL = "https://api.github.com/repos/plamenpm/personal-subtitles-library/contents/";

async function getSubtitleFiles() {
    const response = await axios.get(LIBRARY_URL);

    return response.data.filter(file =>
        file.name.toLowerCase().endsWith(".srt")
    );
}

builder.defineSubtitlesHandler(async ({ type, id }) => {

    let subtitles = [];

    try {
        const files = await getSubtitleFiles();

        for (const file of files) {

            const filename = file.name;

            if (type === "series") {

                const match = id.match(/tt\d+:(\d+):(\d+)/);

                if (match) {

                    const season = match[1].padStart(2, "0");
                    const episode = match[2].padStart(2, "0");

                    if (filename.includes(`S${season}E${episode}`)) {

                        subtitles.push({
                            id: file.sha,
                            url: file.download_url,
                            lang: "bul",
                            label: filename
                        });
                    }
                }

            }

            if (type === "movie") {

                subtitles.push({
                    id: file.sha,
                    url: file.download_url,
                    lang: "bul",
                    label: filename
                });

            }
        }

    } catch (error) {

        console.log(error);

    }

    return {
        subtitles
    };

});

serveHTTP(builder.getInterface(), 7000);
