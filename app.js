/**
 * Main application coordinator.
 * Binds UI interactions, DOM updates, multi-chat navigation, and story editors.
 */

import { audio } from './audio.js';
import { GameEngine } from './engine.js';
import { StoryEditor } from './editor.js';
import { defaultStories } from './stories.js';

class AppCoordinator {
  constructor() {
    this.engine = new GameEngine();
    this.editor = new StoryEditor(this.engine);
    
    // Load stories from localStorage, falling back to defaultStories
    const savedStories = localStorage.getItem('phone_stories');
    if (savedStories) {
      try {
        this.stories = JSON.parse(savedStories);
      } catch (e) {
        console.error("Failed to parse saved stories from localStorage", e);
        this.stories = JSON.parse(JSON.stringify(defaultStories));
      }
    } else {
      this.stories = JSON.parse(JSON.stringify(defaultStories));
    }

    // DOM Elements
    this.messagesContainer = null;
    this.choicesContainer = null;
    this.typingIndicator = null;
    this.variablesTracker = null;
    
    // Multi-chat view divisions
    this.chatHeaderView = null;
    this.chatListView = null;
    this.chatRoomView = null;
    this.chatsListContainer = null;
    
    // Back navigation details
    this.btnBackToChats = null;
    this.unreadTotalBadge = null;

    // Header details
    this.contactNameEl = null;
    this.contactStatusEl = null;
    this.contactAvatarEl = null;

    // Control buttons
    this.btnRestart = null;
    this.storySelect = null;

    // Editor control items
    this.btnNewStory = null;
    this.btnNewNode = null;
    this.btnExport = null;
    this.btnImport = null;
    this.fileInput = null;
    this.btnExportBuild = null;

    // View panels for mobile layout
    this.viewModeSelector = null;
    this.editorPanel = null;
    this.phonePanel = null;
  }

  init() {
    window.appCoordinator = this;
    // Cache UI elements
    this.messagesContainer = document.getElementById("chat-messages");
    this.choicesContainer = document.getElementById("chat-choices");
    this.typingIndicator = document.getElementById("typing-indicator");
    this.variablesTracker = document.getElementById("variables-tracker");

    this.chatHeaderView = document.getElementById("phone-chat-header");
    this.chatListView = document.getElementById("phone-chat-list-view");
    this.chatRoomView = document.getElementById("phone-chat-room-view");
    this.chatsListContainer = document.getElementById("chats-list");

    this.btnBackToChats = document.getElementById("btn-back-to-chats");
    this.unreadTotalBadge = document.getElementById("unread-total-badge");

    this.contactNameEl = document.getElementById("phone-contact-name");
    this.contactStatusEl = document.getElementById("phone-contact-status");
    this.contactAvatarEl = document.getElementById("phone-contact-avatar");

    this.btnRestart = document.getElementById("btn-restart-game");
    this.storySelect = document.getElementById("story-select");

    this.btnNewStory = document.getElementById("btn-new-story");
    this.btnNewNode = document.getElementById("btn-new-node");
    this.btnExport = document.getElementById("btn-export-story");
    this.btnImport = document.getElementById("btn-import-story");
    this.btnExportBuild = document.getElementById("btn-export-build");
    this.fileInput = document.getElementById("import-file-input");

    this.editorPanel = document.getElementById("left-panel");
    this.phonePanel = document.getElementById("right-panel");

    // Populate story selector
    this.populateStorySelector();

    // Bind game engine callbacks
    this.engine.on("onMessageAdded", (msg, targetChatId) => this.renderMessage(msg, targetChatId));
    this.engine.on("onTypingStateChange", (isTyping, senderId) => this.updateTypingState(isTyping, senderId));
    this.engine.on("onChoicesDisplay", (choices) => this.renderChoices(choices));
    this.engine.on("onStoryRestart", () => this.clearChatHistory());
    this.engine.on("onVariableUpdate", (vars) => this.renderVariablesDebug(vars));

    // Initialize with default story
    const initialStoryKey = Object.keys(this.stories)[0];
    const initialStory = this.stories[initialStoryKey];
    if (this.storySelect) this.storySelect.dataset.lastSelected = initialStoryKey;
    
    this.engine.loadStory(initialStory);
    if (this.editor) this.editor.init(initialStory);
    this.openChatRoom(this.engine.activeChatId);

    // Attach control listeners
    if (this.btnRestart) {
      this.btnRestart.addEventListener("click", () => {
        audio.playClick();
        const currentMode = document.body.dataset.viewMode || "edit";
        if (currentMode === "edit") {
          const activeStory = (this.editor && this.editor.currentStory) || this.engine.story;
          this.engine.loadStory(activeStory);
          this.engine.reset();
          this.switchViewMode("play");
        } else {
          this.switchViewMode("edit");
        }
      });
    }

    if (this.storySelect) {
      this.storySelect.addEventListener("change", (e) => {
        audio.playClick();
        // Save current edits before switching
        if (this.editor && this.editor.currentStory && this.storySelect.dataset.lastSelected) {
          const lastKey = this.storySelect.dataset.lastSelected;
          this.stories[lastKey] = this.editor.currentStory;
          this.saveStoriesToLocalStorage(lastKey);
        }
        const storyKey = e.target.value;
        this.storySelect.dataset.lastSelected = storyKey;
        const selectedStory = this.stories[storyKey];
        if (selectedStory) {
          this.engine.loadStory(selectedStory);
          if (this.editor) this.editor.init(selectedStory);
          this.openChatRoom(this.engine.activeChatId);
        }
      });
    }

    if (this.btnNewStory) {
      this.btnNewStory.addEventListener("click", () => {
        audio.playClick();
        this.createNewStory();
      });
    }

    // Back to conversations list action
    if (this.btnBackToChats) {
      this.btnBackToChats.addEventListener("click", () => {
        audio.playClick();
        this.showChatSelector();
      });
    }

    // Editor click buttons
    if (this.btnNewNode) {
      this.btnNewNode.addEventListener("click", () => {
        audio.playClick();
        this.editor.createNewNode();
      });
    }

    if (this.btnExport) {
      this.btnExport.addEventListener("click", () => {
        audio.playClick();
        this.editor.exportJSON();
      });
    }

    if (this.btnImport) {
      this.btnImport.addEventListener("click", () => {
        this.fileInput.click();
      });
    }

    if (this.fileInput) {
      this.fileInput.addEventListener("change", (e) => {
        if (this.editor) {
          this.editor.importJSON(e);
          setTimeout(() => {
            this.openChatRoom(this.engine.activeChatId);
          }, 200);
        }
      });
    }

    if (this.btnExportBuild) {
      this.btnExportBuild.addEventListener("click", () => {
        audio.playClick();
        this.exportBuild();
      });
    }

    this.startStatusBarClock();
    this.setupViewModeTabs();
  }

  saveStoriesToLocalStorage(targetKey) {
    if (this.editor && this.editor.currentStory) {
      const key = targetKey || (this.storySelect && this.storySelect.value);
      if (key) {
        this.stories[key] = this.editor.currentStory;
      }
    }
    localStorage.setItem('phone_stories', JSON.stringify(this.stories));
  }

  populateStorySelector() {
    if (!this.storySelect) return;
    this.storySelect.innerHTML = "";
    Object.keys(this.stories).forEach(key => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = this.stories[key].title;
      this.storySelect.appendChild(option);
    });
  }

  createNewStory() {
    const title = prompt("Enter the title for your new story:", "Untitled Story");
    if (!title) return;

    // Save current story edits first
    if (this.editor && this.editor.currentStory && this.storySelect && this.storySelect.value) {
      this.stories[this.storySelect.value] = this.editor.currentStory;
      this.saveStoriesToLocalStorage(this.storySelect.value);
    }

    const storyId = "custom_story_" + Date.now();
    const newStory = {
      title: title,
      description: "Describe your branching story here.",
      variables: {},
      characters: {
        player: {
          name: "Player",
          avatarColor: "#8b5cf6",
          avatarText: "PL",
          isPlayer: true
        }
      },
      nodes: [
        {
          sender: "player",
          text: "Start your dialogue here.",
          delay: 1000,
          choices: []
        }
      ]
    };

    this.stories[storyId] = newStory;
    this.populateStorySelector();
    if (this.storySelect) {
      this.storySelect.value = storyId;
      this.storySelect.dataset.lastSelected = storyId;
    }

    this.engine.loadStory(newStory);
    if (this.editor) this.editor.init(newStory);
    this.openChatRoom(this.engine.activeChatId);

    // Save new story to localStorage
    this.saveStoriesToLocalStorage(storyId);
  }

  // Opens conversations list index view
  showChatSelector() {
    this.chatHeaderView.classList.add("hidden");
    this.chatRoomView.classList.add("hidden");
    this.chatListView.classList.remove("hidden");
    
    this.renderChatList();
  }

  // Opens individual chat room thread view
  openChatRoom(charId) {
    this.engine.setActiveChat(charId);

    this.chatListView.classList.add("hidden");
    this.chatHeaderView.classList.remove("hidden");
    this.chatRoomView.classList.remove("hidden");

    this.updatePhoneHeader();
    this.updateBackUnreadBadge();

    // Clear feed (except tracking indicator elements)
    const children = Array.from(this.messagesContainer.children);
    children.forEach(child => {
      if (child !== this.typingIndicator && child !== this.choicesContainer) {
        child.remove();
      }
    });

    // Render historical logs for the target chat
    const logs = this.engine.conversations[charId] || [];
    logs.forEach(msg => {
      this.drawMessageBubble(msg);
    });

    // Display inline choices filtered for this chat room channel
    this.renderChoices(this.engine.activeChoices);
    this.scrollToBottom();
  }

  // Populate phone screen header details
  updatePhoneHeader() {
    if (!this.engine.story || !this.engine.activeChatId) return;

    const contact = this.engine.story.characters[this.engine.activeChatId];
    if (contact) {
      this.contactNameEl.textContent = contact.name;
      this.contactAvatarEl.textContent = contact.avatarText || "?";
      this.contactAvatarEl.style.backgroundColor = contact.avatarColor || "#6b7280";
      this.contactStatusEl.textContent = this.engine.isTyping ? "Typing..." : "Online";
    }
  }

  // Renders the chat list items recursively
  renderChatList() {
    this.chatsListContainer.innerHTML = "";
    if (!this.engine.story) return;

    const characters = this.engine.story.characters;
    const charKeys = Object.keys(characters).filter(k => k !== "player");

    charKeys.forEach(charId => {
      const char = characters[charId];
      const logs = this.engine.conversations[charId] || [];
      const unreadCount = this.engine.unreadCounts[charId] || 0;
      const isUnread = unreadCount > 0;

      const item = document.createElement("div");
      item.className = `chat-list-item ${isUnread ? 'unread' : ''}`;

      let lastMsgText = "No messages yet";
      if (logs.length > 0) {
        const lastMsg = logs[logs.length - 1];
        lastMsgText = lastMsg.senderId === "player" ? `You: ${lastMsg.text}` : lastMsg.text;
      } else if (this.engine.activeChoices && this.engine.activeChoices.length > 0) {
        // Evaluate if this background contact is waiting for an active response
        const hasChoiceInThread = this.engine.activeChoices.some(ch => {
          const target = ch.chat || this.getActiveNodeSender();
          return target === charId;
        });
        if (hasChoiceInThread) {
          lastMsgText = "Response waiting...";
        }
      }

      const avatarHtml = `<div class="chat-item-avatar" style="background-color: ${char.avatarColor}">${char.avatarText}</div>`;
      const badgeHtml = isUnread 
        ? `<div class="chat-item-badge-wrap"><div class="chat-item-unread-dot"></div></div>`
        : ``;

      item.innerHTML = `
        ${avatarHtml}
        <div class="chat-item-content">
          <div class="chat-item-top">
            <span class="chat-item-name">${char.name}</span>
            <span class="chat-item-time">Now</span>
          </div>
          <span class="chat-item-preview">${lastMsgText}</span>
        </div>
        ${badgeHtml}
      `;

      item.addEventListener("click", () => {
        this.openChatRoom(charId);
      });

      this.chatsListContainer.appendChild(item);
    });
  }

  // Helper to determine the sender of the active story stack node
  getActiveNodeSender() {
    if (this.engine.stack.length > 0) {
      const frame = this.engine.stack[this.engine.stack.length - 1];
      const node = frame.nodesList[frame.currentIndex];
      return node ? node.sender : "";
    }
    return "";
  }

  // Reactive message interceptor
  renderMessage(msg, targetChatId) {
    // Refresh conversation previews if looking at selector index
    if (!this.chatListView.classList.contains("hidden")) {
      this.renderChatList();
    }

    this.updateBackUnreadBadge();

    // Do not draw message bubble if it arrived in a background chat channel
    if (targetChatId !== this.engine.activeChatId) {
      return;
    }

    this.drawMessageBubble(msg);
  }

  // Draws message bubble inside chat body
  drawMessageBubble(msg) {
    let msgEl = document.getElementById(msg.id);
    const isNew = !msgEl;

    if (isNew) {
      msgEl = document.createElement("div");
      msgEl.id = msg.id;
      this.messagesContainer.appendChild(msgEl);
    }

    const senderKey = msg.senderId;
    const isPlayer = msg.character.isPlayer;

    if (senderKey === "system") {
      msgEl.className = "message-row message-system";
      msgEl.innerHTML = `<div class="message-system-inner">${msg.text}</div>`;
    } else {
      msgEl.className = `message-row ${isPlayer ? 'message-player' : 'message-contact'}`;
      
      const avatarHtml = isPlayer 
        ? '' 
        : `<div class="msg-avatar" style="background-color: ${msg.character.avatarColor}">${msg.character.avatarText}</div>`;

      msgEl.innerHTML = `
        ${avatarHtml}
        <div class="msg-bubble complete">
          <div class="msg-body">${msg.text}</div>
        </div>
      `;
    }

    this.scrollToBottom();
  }

  // Show/Hide three bouncing typing dots
  updateTypingState(isTyping, senderId) {
    // Suppress typing indicator if it belongs to a background thread
    if (isTyping && senderId !== "system" && senderId !== this.engine.activeChatId) {
      return;
    }

    if (isTyping && senderId !== "system") {
      const char = this.engine.story.characters[senderId] || { name: "Character", avatarColor: "#6b7280", avatarText: "C" };
      
      this.typingIndicator.querySelector(".typing-avatar").style.backgroundColor = char.avatarColor;
      this.typingIndicator.querySelector(".typing-avatar").textContent = char.avatarText;
      
      this.messagesContainer.appendChild(this.typingIndicator);
      this.typingIndicator.classList.remove("hidden");
      this.scrollToBottom();

      this.contactStatusEl.textContent = "Typing...";
      this.contactStatusEl.classList.add("status-typing");
    } else {
      this.typingIndicator.classList.add("hidden");
      this.contactStatusEl.textContent = "Online";
      this.contactStatusEl.classList.remove("status-typing");
    }
  }

  // Renders active choices filtered for the current chat room channel
  renderChoices(choices) {
    this.choicesContainer.innerHTML = "";

    if (!choices || choices.length === 0) {
      this.choicesContainer.classList.add("hidden");
      return;
    }

    const nodeSender = this.getActiveNodeSender();
    
    // Filter choices where targeted chat matches activeChatId
    const filtered = choices.filter(ch => {
      const target = ch.chat || nodeSender;
      return target === this.engine.activeChatId;
    });

    if (filtered.length === 0) {
      this.choicesContainer.classList.add("hidden");
      return;
    }

    this.messagesContainer.appendChild(this.choicesContainer);
    this.choicesContainer.classList.remove("hidden");

    filtered.forEach(ch => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.innerHTML = `${ch.text}`;
      btn.addEventListener("click", () => {
        this.engine.selectChoice(ch);
      });
      this.choicesContainer.appendChild(btn);
    });

    this.scrollToBottom();
  }

  // Update back arrow button unread messages counter
  updateBackUnreadBadge() {
    const unreadCounts = this.engine.unreadCounts;
    let total = 0;
    
    Object.keys(unreadCounts).forEach(key => {
      if (key !== this.engine.activeChatId) {
        total += unreadCounts[key];
      }
    });

    if (total > 0) {
      this.unreadTotalBadge.textContent = total;
      this.unreadTotalBadge.classList.remove("hidden");
    } else {
      this.unreadTotalBadge.classList.add("hidden");
    }
  }

  // Reset dialogue feed
  clearChatHistory() {
    this.chatListView.classList.add("hidden");
    this.chatHeaderView.classList.remove("hidden");
    this.chatRoomView.classList.remove("hidden");

    const children = Array.from(this.messagesContainer.children);
    children.forEach(child => {
      if (child !== this.typingIndicator && child !== this.choicesContainer) {
        child.remove();
      }
    });
    
    this.typingIndicator.classList.add("hidden");
    this.choicesContainer.innerHTML = "";
    this.choicesContainer.classList.add("hidden");

    this.updatePhoneHeader();
    this.updateBackUnreadBadge();
  }

  renderVariablesDebug(variables) {
    if (!this.variablesTracker) return;
    this.variablesTracker.innerHTML = "";

    const keys = Object.keys(variables);
    if (keys.length === 0) {
      this.variablesTracker.innerHTML = `<span class="empty-vars">No game state variables defined.</span>`;
      return;
    }

    keys.forEach(key => {
      const chip = document.createElement("div");
      chip.className = "variable-chip";
      chip.innerHTML = `
        <span class="var-name">${key}</span>
        <span class="var-val">${variables[key]}</span>
      `;
      this.variablesTracker.appendChild(chip);
    });
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  startStatusBarClock() {
    const clockEl = document.getElementById("status-time");
    if (!clockEl) return;

    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      clockEl.textContent = `${hours}:${minutes} ${ampm}`;
    };

    updateTime();
    setInterval(updateTime, 30000);
  }

  setupViewModeTabs() {
    document.body.dataset.viewMode = "edit";
  }

  switchViewMode(mode) {
    document.body.dataset.viewMode = mode;
    if (this.btnRestart) {
      if (mode === "play") {
        this.btnRestart.innerHTML = `<span class="icon">📝</span> Edit Draft`;
      } else {
        this.btnRestart.innerHTML = `<span class="icon">🔄</span> Playtest Draft`;
      }
    }
  }

  async exportBuild() {
    try {
      const activeStory = (this.editor && this.editor.currentStory) || this.engine.story;
      if (!activeStory) {
        alert("No active story to export.");
        return;
      }

      // Fetch external files
      const [cssText, audioJs, engineJs, appJs] = await Promise.all([
        fetch("style.css").then(res => res.text()),
        fetch("audio.js").then(res => res.text()),
        fetch("engine.js").then(res => res.text()),
        fetch("app.js").then(res => res.text())
      ]);

      // Helper function to clean JS modules imports/exports
      const cleanScript = (jsText, isApp = false) => {
        let cleaned = jsText
          .replace(/import\s+[\s\S]*?;\s*/g, "") // Remove imports
          .replace(/export\s+class\s+/g, "class ") // Remove export class
          .replace(/export\s+const\s+/g, "const "); // Remove export const

        if (isApp) {
          const parts = cleaned.split("async exportBuild() {");
          if (parts.length > 1) {
            cleaned = parts[0] + "}\n\nwindow.addEventListener('DOMContentLoaded', () => {\n  const app = new AppCoordinator();\n  app.init();\n});";
          }
        }
        return cleaned;
      };

      const cleanedAudio = cleanScript(audioJs);
      const cleanedEngine = cleanScript(engineJs);
      const cleanedApp = cleanScript(appJs, true);

      // Extract the right-panel HTML directly from the live DOM
      const phonePanelEl = document.getElementById("right-panel");
      if (!phonePanelEl) {
        alert("Phone panel container not found in DOM.");
        return;
      }
      
      const phoneHtml = phonePanelEl.outerHTML;

      // Construct a single standalone HTML document
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${activeStory.title}</title>
  <style>
    ${cssText}
    /* Ensure standalone app centers and fills screen correctly */
    body {
      overflow: hidden;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .workspace {
      height: 100vh !important;
      display: flex !important;
      justify-content: center;
      align-items: center;
    }
    #right-panel {
      width: 100%;
      height: 100%;
      display: flex !important;
    }
  </style>
</head>
<body data-view-mode="play">

  <main class="workspace">
    ${phoneHtml}
  </main>

  <script>
    // Embedded Story Data
    const activeStory = ${JSON.stringify(activeStory, null, 2)};
    const defaultStories = { "active": activeStory };

    // Stub StoryEditor for standalone coordinator run
    class StoryEditor {
      constructor() {
        this.currentStory = activeStory;
      }
      init() {}
    }

    // Audio Controller Script
    ${cleanedAudio}

    // Game Engine Script
    ${cleanedEngine}

    // App Coordinator Script
    ${cleanedApp}
  <\/script>
</body>
</html>`;

      // Download file blob
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = activeStory.title.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_standalone.html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Export build failed:", error);
      alert("Failed to export build: " + error.message);
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const app = new AppCoordinator();
  app.init();
});
