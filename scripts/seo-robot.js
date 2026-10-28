#!/usr/bin/env node
"use strict";

// Biomassa Florestal keyword research robot for the static ICP deployment.
// It runs from GitHub Actions, preserves keyword history, and updates sitemap
// only from real HTML files found under site/.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE_DIR = path.join(ROOT, "site");
const DATA_DIR = path.join(ROOT, "seo-data");
const KEYWORDS_FILE = path.join(DATA_DIR, "keyword-opportunities.json");
const STATE_FILE = path.join(DATA_DIR, "robot-state.json");
const SITE = "https://biomassaflorestal.com.br";
const SEEDS = [
  "lenha de eucalipto para caldeira industrial",
  "fornecedor de biomassa florestal",
  "cavaco de madeira para caldeira",
  "consumo de lenha em caldeira industrial",
  "poder calorifico da lenha de eucalipto",
  "umidade da lenha para caldeira",
  "biomassa industrial Distrito Federal",
  "fornecedor de lenha de eucalipto Goias",
  "combustivel para caldeira industrial",
  "abastecimento de biomassa para industria",
  "lenha para frigorifico e industria de alimentos",
  "biomassa para secagem de graos",
  "custo de biomassa florestal industrial",
  "armazenamento seguro de lenha industrial",
  "diferenca entre lenha e cavaco de madeira"
];
const MAX_SUGGESTIONS = 12;

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (err) {
    if (err.code !== "ENOENT") console.warn("[seo-robot] read warning", file, err.message);
    return fallback;
  }
}
function writeJsonAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n");
  fs.renameSync(tmp, file);
}
async function fetchSuggestions(query) {
  const endpoint = "https://suggestqueries.google.com/complete/search?client=firefox&hl=pt-BR&q=" + encodeURIComponent(query);
  const response = await fetch(endpoint, {
    headers: { "user-agent": "BiomassaFlorestalSEOResearch/1.0" },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error("Google suggestions HTTP " + response.status);
  const data = await response.json();
  return Array.isArray(data[1]) ? data[1].filter(x => typeof x === "string" && x.trim()).slice(0, MAX_SUGGESTIONS) : [];
}
function listHtmlFiles(dir, relativeBase) {
  relativeBase = relativeBase || "";
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    const relative = path.posix.join(relativeBase, entry.name);
    if (entry.isDirectory()) results.push(...listHtmlFiles(absolute, relative));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) results.push(relative);
  }
  return results;
}
function updateSitemap() {
  const files = listHtmlFiles(SITE_DIR).sort();
  const urls = Array.from(new Set(files.map(file => file === "index.html" ? SITE + "/" : SITE + "/" + file.split(path.sep).join("/")))).sort();
  const body = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(u => "  <url><loc>" + u + "</loc></url>").join("\n") +
    "\n</urlset>\n";
  fs.writeFileSync(path.join(SITE_DIR, "sitemap.xml"), body);
  fs.writeFileSync(path.join(SITE_DIR, "robots.txt"), "User-agent: *\nAllow: /\n\nSitemap: " + SITE + "/sitemap.xml\n");
  return urls.length;
}
function normalizeKeyword(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
}
async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const catalog = readJson(KEYWORDS_FILE, { site: SITE, updatedAt: null, keywords: [] });
  if (!Array.isArray(catalog.keywords)) catalog.keywords = [];
  const existing = new Map(catalog.keywords.map(k => [normalizeKeyword(k.keyword), k]));
  const state = readJson(STATE_FILE, { seedIndex: 0, totalRuns: 0, lastRunAt: null, lastError: null });
  const seedIndex = Number.isInteger(state.seedIndex) ? state.seedIndex % SEEDS.length : 0;
  const seed = SEEDS[seedIndex];
  const now = new Date().toISOString();
  let suggestions = [];
  let suggestionError = null;
  try { suggestions = await fetchSuggestions(seed); }
  catch (error) {
    suggestionError = error.message;
    console.warn("[seo-robot] suggestions unavailable:", error.message);
  }
  let newCount = 0;
  for (const phrase of [seed].concat(suggestions)) {
    const keyword = normalizeKeyword(phrase);
    if (!keyword || keyword.length > 180) continue;
    const prior = existing.get(keyword);
    if (prior) {
      prior.lastSeenAt = now;
      prior.occurrences = (prior.occurrences || 1) + 1;
    } else {
      existing.set(keyword, {
        keyword: phrase.trim(), firstSeenAt: now, lastSeenAt: now,
        occurrences: 1, source: phrase === seed ? "seed" : "google-autocomplete", topic: seed
      });
      newCount++;
    }
  }
  catalog.site = SITE;
  catalog.updatedAt = now;
  catalog.keywords = Array.from(existing.values()).sort((a,b) => a.keyword.localeCompare(b.keyword, "pt-BR"));
  writeJsonAtomic(KEYWORDS_FILE, catalog);
  const sitemapUrlCount = updateSitemap();
  const nextState = {
    seedIndex: (seedIndex + 1) % SEEDS.length,
    totalRuns: (state.totalRuns || 0) + 1,
    lastRunAt: now, lastError: suggestionError, lastSeed: seed,
    keywordCount: catalog.keywords.length, newKeywordsThisRun: newCount,
    suggestionCount: suggestions.length, sitemapUrlCount: sitemapUrlCount
  };
  writeJsonAtomic(STATE_FILE, nextState);
  console.log("[seo-robot] success", JSON.stringify(nextState));
}
main().catch(error => { console.error("[seo-robot] fatal", error); process.exitCode = 1; });
