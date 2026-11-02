import express from "express";
import { addonBuilder } from "stremio-addon-sdk";

const app = express();
const PORT = process.env.PORT || 10000;

const OWNER = "plamenpm";
const REPO = "personal-subtitles-library";
const BRANCH = "main";

const manifest = {
  id: "community.personal.subtitles.bg",
  version: "1.0.0",
  name: "Personal Bulgarian Subtitles",
  description: "Personal Bulgarian subtitles from GitHub",
  resources: ["subtitles"],
  types: ["series"],
  idPrefixes: ["tt"],
  catalogs: []
};

const builder = new addonBuilder(manifest);

let cachedFiles = [];
let cacheTime = 0;

async function getSubtitleFiles() {
  if (Date.now() - cacheTime < 5 * 60 * 1000 && cachedFiles.length) {
    return cachedFiles;
  }

  const apiUrl =
    `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`;

  const response = await fetch(apiUrl, {
    headers: { "Accept": "application/vnd.github+json" }
  });

  if (!response.ok) {
    throw new Error(`GitHub error: ${response.status}`);
  }

  const data = await response.json();

  cachedFiles = (data.tree || []).filter(file =>
    file.type === "blob" &&
    file.path.toLowerCase().endsWith(".srt")
  );

  cacheTime = Date.now();
  return cachedFiles;
}

builder.defineSubtitlesHandler(async ({ type, id }) => {
  if (type !== "series") return { subtitles: [] };

  const parts = id.split(":");
  if (parts.length < 3) return { subtitles: [] };

  const season = Number(parts[1]);
  const episode = Number(parts[2]);

  if (!Number.isInteger(season) || !Number.isInteger(episode)) {
    return { subtitles: [] };
  }

  try {
    const files = await getSubtitleFiles();

    const subtitles = files
      .filter(file => {
        const match = file.path.match(/S(\d{1,2})E(\d{1,2})/i);
        return match &&
          Number(match[1]) === season &&
          Number(match[2]) === episode;
      })
      .map(file => {
        const encodedPath = file.path
          .split("/")
          .map(encodeURIComponent)
          .join("/");

        return {
          id: file.path,
          url: `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${encodedPath}`,
          lang: "bul"
        };
      });

    return { subtitles };
  } catch (error) {
    console.error("Subtitle search error:", error);
    return { subtitles: [] };
  }
});

const { getRouter } = builder.getInterface();

app.use(getRouter());

app.get("/health", (req, res) => {
  res.send("Personal Subtitles Addon is running");
});

app.listen(PORT, () => {
  console.log(`Addon running on port ${PORT}`);
});
