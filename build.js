/**
 * Offline & CLI Build Tool for CYOA Phone Chat Story Engine
 * Compiles stories into standalone HTML single-file distributions.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectDir = __dirname;
const outputDir = path.join(projectDir, 'builds');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read core source files
const indexHtml = fs.readFileSync(path.join(projectDir, 'index.html'), 'utf8');
const cssText = fs.readFileSync(path.join(projectDir, 'style.css'), 'utf8');
const audioJs = fs.readFileSync(path.join(projectDir, 'audio.js'), 'utf8');
const engineJs = fs.readFileSync(path.join(projectDir, 'engine.js'), 'utf8');
const appJs = fs.readFileSync(path.join(projectDir, 'app.js'), 'utf8');

// Helper to clean ES module imports/exports for inline embedding
const cleanScript = (jsText) => {
  return jsText
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/export\s+class\s+/g, 'class ')
    .replace(/export\s+const\s+/g, 'const ')
    .replace(/export\s+default\s+/g, '');
};

const cleanedAudio = cleanScript(audioJs);
const cleanedEngine = cleanScript(engineJs);
const cleanedApp = cleanScript(appJs);

// Extract the phone screen layout from index.html
const rightPanelMatch = indexHtml.match(/<section id="right-panel"[\s\S]*?<\/section>/);
if (!rightPanelMatch) {
  console.error('Error: Could not extract right-panel from index.html');
  process.exit(1);
}

let phoneHtml = rightPanelMatch[0];

// Strip out developer debugging tools (Knowledge Matrix HUD & toggle buttons)
phoneHtml = phoneHtml
  .replace(/<button id="btn-toggle-knowledge-hud"[\s\S]*?<\/button>/g, '')
  .replace(/<button id="btn-list-knowledge-hud"[\s\S]*?<\/button>/g, '')
  .replace(/<div id="phone-knowledge-hud"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g, '');

// Load stories to build
const storiesManifest = JSON.parse(fs.readFileSync(path.join(projectDir, 'stories', 'manifest.json'), 'utf8'));

for (const storyFile of storiesManifest) {
  const storyFilePath = path.join(projectDir, 'stories', storyFile);
  const storyModule = await import(`file://${storyFilePath}`);
  const activeStory = storyModule.story || storyModule.default;

  if (!activeStory) {
    console.warn(`Warning: Could not extract story from ${storyFile}`);
    continue;
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${activeStory.title}</title>
  <style>
    ${cssText}

    html, body {
      margin: 0;
      padding: 0;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      background: var(--bg-app);
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .standalone-workspace {
      width: 100vw;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    #right-panel {
      width: 100%;
      height: 100%;
      display: flex !important;
      justify-content: center;
      align-items: center;
    }
    /* Suppress developer debugging tools in built game */
    .phone-hud-btn,
    .phone-hud-overlay,
    .standalone-workspace .phone-hud-btn,
    .standalone-workspace .phone-hud-overlay {
      display: none !important;
    }
  </style>
</head>
<body data-view-mode="play" data-standalone="true" class="is-standalone">

  <main class="standalone-workspace">
    ${phoneHtml}
  </main>

  <script>
    window.IS_STANDALONE = true;

    // Embedded Story Data
    const activeStory = ${JSON.stringify(activeStory, null, 2)};
    const defaultStories = { "active": activeStory };

    // Stub StoryEditor for standalone coordinator run
    class StoryEditor {
      constructor() {
        this.currentStory = activeStory;
        this.stories = { "active": activeStory };
      }
      init() {}
      setStories() {}
    }

    // Audio Controller Script
    ${cleanedAudio}

    // Game Engine Script
    ${cleanedEngine}

    // App Coordinator Script
    ${cleanedApp}
  </script>
</body>
</html>`;

  const fileName = (activeStory.title || 'story').toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_standalone.html';
  const outputPath = path.join(outputDir, fileName);
  fs.writeFileSync(outputPath, htmlContent, 'utf8');
  console.log(`✅ Built: ${fileName} (${(Buffer.byteLength(htmlContent) / 1024).toFixed(1)} KB) -> builds/${fileName}`);
}

console.log(`\n🎉 All standalone builds generated in builds/!`);
