/**
 * Dynamic Story Loader for the stories/ directory.
 * Discovers, parses, and validates story files (.js) from the stories/ directory.
 */

/**
 * Validates whether an object represents a properly-formatted story schema.
 * @param {any} story
 * @returns {boolean}
 */
export function isValidStory(story) {
  if (!story || typeof story !== 'object' || Array.isArray(story)) {
    return false;
  }
  if (typeof story.title !== 'string' || !story.title.trim()) {
    return false;
  }
  if (!Array.isArray(story.nodes)) {
    return false;
  }
  if (story.characters && (typeof story.characters !== 'object' || Array.isArray(story.characters))) {
    return false;
  }
  return true;
}

/**
 * Normalizes a valid story object with default fallbacks if optional fields are missing.
 * @param {object} story
 * @param {string} fallbackId
 * @returns {object}
 */
export function normalizeStory(story, fallbackId) {
  const normalized = JSON.parse(JSON.stringify(story));
  if (!normalized.id) {
    normalized.id = fallbackId;
  }
  if (!normalized.description || typeof normalized.description !== 'string') {
    normalized.description = "";
  }
  if (!normalized.variables || typeof normalized.variables !== 'object' || Array.isArray(normalized.variables)) {
    normalized.variables = {};
  }
  if (!normalized.characters || typeof normalized.characters !== 'object' || Array.isArray(normalized.characters)) {
    normalized.characters = {
      player: {
        name: "Player",
        avatarColor: "#8b5cf6",
        avatarText: "PL",
        isPlayer: true,
        visibleByDefault: true
      }
    };
  }
  return normalized;
}

/**
 * Extracts properly-formatted stories from an imported module or evaluated object.
 * Supports:
 * - default export: export default { title: ... } or export default { story1: {...}, story2: {...} }
 * - named exports: export const story = { ... } or export const optOut = { ... } or export const stories = { ... }
 * - raw story object
 * @param {object} mod
 * @param {string} fallbackId
 * @returns {Record<string, object>}
 */
export function extractStoriesFromModule(mod, fallbackId) {
  const stories = {};

  if (!mod || typeof mod !== 'object') {
    return stories;
  }

  // 1. Check mod.default
  if (mod.default) {
    if (isValidStory(mod.default)) {
      const id = mod.default.id || fallbackId;
      stories[id] = normalizeStory(mod.default, id);
    } else if (typeof mod.default === 'object' && !Array.isArray(mod.default)) {
      for (const [key, val] of Object.entries(mod.default)) {
        if (isValidStory(val)) {
          const id = val.id || key;
          stories[id] = normalizeStory(val, id);
        }
      }
    }
  }

  // 2. Check named exports
  for (const [exportName, exportVal] of Object.entries(mod)) {
    if (exportName === 'default') continue;
    if (isValidStory(exportVal)) {
      const id = exportVal.id || (exportName === 'story' ? fallbackId : exportName);
      stories[id] = normalizeStory(exportVal, id);
    } else if (exportVal && typeof exportVal === 'object' && !Array.isArray(exportVal)) {
      for (const [key, val] of Object.entries(exportVal)) {
        if (isValidStory(val)) {
          const id = val.id || key;
          stories[id] = normalizeStory(val, id);
        }
      }
    }
  }

  // 3. Check if mod itself is directly a story (e.g. from evaluate)
  if (isValidStory(mod)) {
    const id = mod.id || fallbackId;
    stories[id] = normalizeStory(mod, id);
  }

  return stories;
}

/**
 * Safely parses raw JavaScript file text if native import() fails.
 * @param {string} code
 * @param {string} fallbackId
 * @returns {Record<string, object>}
 */
export function parseStoryFromText(code, fallbackId) {
  try {
    // Attempt evaluation by stripping ES module export keywords
    const transformedCode = code
      .replace(/export\s+default\s+/g, "const __defaultStory = ")
      .replace(/export\s+const\s+/g, "const ")
      .replace(/export\s+let\s+/g, "let ")
      .replace(/export\s+var\s+/g, "var ")
      .replace(/export\s*\{[^}]*\};?/g, "");

    const fn = new Function(`
      "use strict";
      ${transformedCode}
      const __result = {};
      if (typeof __defaultStory !== "undefined") __result.default = __defaultStory;
      if (typeof story !== "undefined") __result.story = story;
      if (typeof stories !== "undefined") __result.stories = stories;
      if (typeof defaultStories !== "undefined") __result.defaultStories = defaultStories;
      return __result;
    `);

    const result = fn();
    return extractStoriesFromModule(result, fallbackId);
  } catch (err) {
    console.warn(`[StoryLoader] Failed to evaluate script text for ${fallbackId}:`, err);
    return {};
  }
}

/**
 * Discovers available .js story files in the stories/ directory.
 * Queries:
 * 1. Directory listing from local HTTP server (ecstatic, python, apache, etc.)
 * 2. Fallback manifest at stories/manifest.json
 * @returns {Promise<string[]>}
 */
export async function discoverStoryFiles() {
  const discovered = new Set();

  // 1. Try fetching stories/ directory listing
  try {
    const dirRes = await fetch('stories/');
    if (dirRes.ok) {
      const htmlText = await dirRes.text();
      // Match all anchor tags linking to .js files
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const anchors = Array.from(doc.querySelectorAll('a'));
      
      for (const a of anchors) {
        const href = a.getAttribute('href') || a.textContent || '';
        const cleanHref = href.split('?')[0].split('#')[0];
        if (cleanHref.endsWith('.js') && !cleanHref.startsWith('..')) {
          const fileName = cleanHref.split('/').pop();
          if (fileName && fileName.endsWith('.js')) {
            discovered.add(fileName);
          }
        }
      }

      // Regex fallback on the raw HTML in case DOMParser missed anything
      const regex = /href=["']([^"']+\.js)["']/gi;
      let match;
      while ((match = regex.exec(htmlText)) !== null) {
        const path = match[1].split('?')[0].split('#')[0];
        if (path.endsWith('.js') && !path.startsWith('..')) {
          const fileName = path.split('/').pop();
          if (fileName && fileName.endsWith('.js')) {
            discovered.add(fileName);
          }
        }
      }
    }
  } catch (err) {
    console.warn("[StoryLoader] Could not fetch stories/ directory listing:", err);
  }

  // 2. Check manifest.json fallback
  try {
    const manifestRes = await fetch('stories/manifest.json?v=' + Date.now());
    if (manifestRes.ok) {
      const list = await manifestRes.json();
      if (Array.isArray(list)) {
        list.forEach(item => {
          if (typeof item === 'string' && item.endsWith('.js')) {
            const fileName = item.split('/').pop();
            discovered.add(fileName);
          }
        });
      }
    }
  } catch (err) {
    // Optional manifest, ignore error
  }

  return Array.from(discovered);
}

/**
 * Loads and extracts stories from a single file in the stories/ folder.
 * @param {string} fileName
 * @returns {Promise<Record<string, object>>}
 */
export async function loadStoryFile(fileName) {
  const baseId = fileName.replace(/\.js$/, '');
  const url = `./stories/${fileName}?v=${Date.now()}`;

  // 1. Try dynamic ES module import
  try {
    const mod = await import(url);
    const extracted = extractStoriesFromModule(mod, baseId);
    if (Object.keys(extracted).length > 0) {
      return extracted;
    }
  } catch (importErr) {
    console.warn(`[StoryLoader] Dynamic import failed for ${fileName}, attempting text evaluation:`, importErr);
  }

  // 2. Fallback to fetching raw file text
  try {
    const fetchRes = await fetch(url);
    if (fetchRes.ok) {
      const code = await fetchRes.text();
      const extracted = parseStoryFromText(code, baseId);
      if (Object.keys(extracted).length > 0) {
        return extracted;
      }
    }
  } catch (fetchErr) {
    console.warn(`[StoryLoader] Failed to fetch file ${fileName}:`, fetchErr);
  }

  console.info(`[StoryLoader] File stories/${fileName} did not contain any properly-formatted stories.`);
  return {};
}

/**
 * Discovers and loads all valid stories from the stories/ directory.
 * @returns {Promise<Record<string, object>>}
 */
export async function loadAllStoriesFromFolder() {
  const files = await discoverStoryFiles();
  const allStories = {};

  for (const fileName of files) {
    try {
      const storiesFromFile = await loadStoryFile(fileName);
      for (const [key, story] of Object.entries(storiesFromFile)) {
        allStories[key] = story;
      }
    } catch (err) {
      console.warn(`[StoryLoader] Error processing stories/${fileName}:`, err);
    }
  }

  return allStories;
}
