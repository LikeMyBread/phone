/**
 * Main application coordinator.
 * Binds UI interactions, DOM updates, multi-chat navigation, and story editors.
 */

import { audio } from './audio.js';
import { GameEngine } from './engine.js';
import { StoryEditor } from './editor.js';
import { defaultStories } from './stories.js';
import { loadAllStoriesFromFolder } from './storyLoader.js';

class AppCoordinator {
  constructor() {
    this.engine = new GameEngine();
    this.editor = new StoryEditor(this.engine);
    
    // Load stories from localStorage, falling back to defaultStories
    if (window.IS_STANDALONE) {
      this.stories = typeof defaultStories !== "undefined" ? defaultStories : { "active": null };
    } else {
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
      // Ensure all base defaultStories are present in this.stories
      if (typeof defaultStories !== "undefined") {
        Object.keys(defaultStories).forEach(k => {
          if (!this.stories[k]) {
            this.stories[k] = JSON.parse(JSON.stringify(defaultStories[k]));
          }
        });
      }
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

    // Conflict modal elements
    this.modalImportConflict = null;
    this.importConflictMsg = null;
    this.importNewTitleInput = null;
    this.btnOverwriteStory = null;
    this.btnImportNewTitle = null;
    this.btnCancelImport = null;
    this.btnCloseImportConflict = null;

    // Pending import conflict state
    this.pendingImportStory = null;
    this.pendingConflictKey = null;

    // View panels for mobile layout
    this.viewModeSelector = null;
    this.editorPanel = null;
    this.phonePanel = null;

    // Knowledge Matrix Live HUD Elements
    this.btnToggleKnowledgeHud = null;
    this.phoneKnowledgeHud = null;
    this.btnCloseKnowledgeHud = null;
    this.phoneKnowledgeHudBody = null;
  }

  async init() {
    window.appCoordinator = this;
    // Cache UI elements
    this.messagesContainer = document.getElementById("chat-messages");
    this.choicesContainer = document.getElementById("chat-choices");
    this.typingIndicator = document.getElementById("typing-indicator");

    this.chatHeaderView = document.getElementById("phone-chat-header");
    this.chatListView = document.getElementById("phone-chat-list-view");
    this.chatRoomView = document.getElementById("phone-chat-room-view");
    this.chatsListContainer = document.getElementById("chats-list");

    this.btnBackToChats = document.getElementById("btn-back-to-chats");
    this.unreadTotalBadge = document.getElementById("unread-total-badge");

    this.contactNameEl = document.getElementById("phone-contact-name");
    this.contactStatusEl = document.getElementById("phone-contact-status");
    this.contactAvatarEl = document.getElementById("phone-contact-avatar");

    this.btnToggleKnowledgeHud = document.getElementById("btn-toggle-knowledge-hud");
    this.phoneKnowledgeHud = document.getElementById("phone-knowledge-hud");
    this.btnCloseKnowledgeHud = document.getElementById("btn-close-knowledge-hud");
    this.phoneKnowledgeHudBody = document.getElementById("phone-knowledge-hud-body");

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

    // Dynamically discover and load custom stories from stories/ folder
    await this.loadStoriesFromFolder();

    // Populate story selector
    this.populateStorySelector();

    // Bind game engine callbacks
    this.engine.on("onMessageAdded", (msg, targetChatId) => this.renderMessage(msg, targetChatId));
    this.engine.on("onTypingStateChange", (isTyping, senderId) => this.updateTypingState(isTyping, senderId));
    this.engine.on("onChoicesDisplay", (choices) => this.renderChoices(choices));
    this.engine.on("onStoryRestart", () => this.clearChatHistory());
    this.engine.on("onClockUpdate", (timeStr) => this.updateClockDisplay(timeStr));
    this.engine.on("onKnowledgeUpdate", (matrix, summary) => this.renderKnowledgeHud(matrix, summary));

    // Initialize with active or default story
    const savedActiveKey = localStorage.getItem('phone_active_story');
    const initialStoryKey = (savedActiveKey && this.stories[savedActiveKey])
      ? savedActiveKey
      : Object.keys(this.stories)[0];
    const initialStory = this.stories[initialStoryKey];
    if (this.storySelect) {
      this.storySelect.value = initialStoryKey;
      this.storySelect.dataset.lastSelected = initialStoryKey;
    }
    
    this.engine.loadStory(initialStory);
    if (this.editor) {
      this.editor.setStories(this.stories);
      this.editor.init(initialStory);
    }
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

    if (this.btnToggleKnowledgeHud) {
      this.btnToggleKnowledgeHud.addEventListener("click", (e) => {
        if (e) e.stopPropagation();
        audio.playClick();
        this.toggleKnowledgeHud();
      });
    }

    if (this.btnCloseKnowledgeHud) {
      this.btnCloseKnowledgeHud.addEventListener("click", (e) => {
        if (e) e.stopPropagation();
        this.closeKnowledgeHud();
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
        localStorage.setItem('phone_active_story', storyKey);
        const selectedStory = this.stories[storyKey];
        if (selectedStory) {
          this.engine.loadStory(selectedStory);
          if (this.editor) {
            this.editor.setStories(this.stories);
            this.editor.init(selectedStory);
          }
          this.openChatRoom(this.engine.activeChatId);
        }
      });
    }

    if (this.btnNewStory) {
      this.btnNewStory.addEventListener("click", (e) => {
        if (e) e.preventDefault();
        audio.playClick();
        this.openNewStoryModal();
      });
    }

    // Modal elements
    this.modalNewStory = document.getElementById("modal-new-story");
    this.modalNewStoryInput = document.getElementById("new-story-title-input");
    this.btnConfirmNewStory = document.getElementById("btn-confirm-new-story");
    this.btnCancelNewStory = document.getElementById("btn-cancel-new-story");
    this.btnCloseNewStory = document.getElementById("btn-close-new-story-modal");

    if (this.btnConfirmNewStory) {
      this.btnConfirmNewStory.addEventListener("click", (e) => {
        if (e) e.preventDefault();
        this.confirmNewStoryFromModal();
      });
    }

    if (this.btnCancelNewStory) {
      this.btnCancelNewStory.addEventListener("click", (e) => {
        if (e) e.preventDefault();
        this.closeNewStoryModal();
      });
    }

    if (this.btnCloseNewStory) {
      this.btnCloseNewStory.addEventListener("click", (e) => {
        if (e) e.preventDefault();
        this.closeNewStoryModal();
      });
    }

    if (this.modalNewStoryInput) {
      this.modalNewStoryInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.confirmNewStoryFromModal();
        } else if (e.key === "Escape") {
          e.preventDefault();
          this.closeNewStoryModal();
        }
      });
    }

    // Import conflict modal elements & bindings
    this.modalImportConflict = document.getElementById("modal-import-conflict");
    this.importConflictMsg = document.getElementById("import-conflict-msg");
    this.importNewTitleInput = document.getElementById("import-new-title-input");
    this.btnOverwriteStory = document.getElementById("btn-overwrite-story");
    this.btnImportNewTitle = document.getElementById("btn-import-new-title");
    this.btnCancelImport = document.getElementById("btn-cancel-import");
    this.btnCloseImportConflict = document.getElementById("btn-close-import-conflict-modal");

    if (this.btnOverwriteStory) {
      this.btnOverwriteStory.addEventListener("click", (e) => {
        if (e) e.preventDefault();
        this.confirmOverwriteImport();
      });
    }

    if (this.btnImportNewTitle) {
      this.btnImportNewTitle.addEventListener("click", (e) => {
        if (e) e.preventDefault();
        this.confirmNewTitleImport();
      });
    }

    if (this.btnCancelImport) {
      this.btnCancelImport.addEventListener("click", (e) => {
        if (e) e.preventDefault();
        this.closeImportConflictModal();
      });
    }

    if (this.btnCloseImportConflict) {
      this.btnCloseImportConflict.addEventListener("click", (e) => {
        if (e) e.preventDefault();
        this.closeImportConflictModal();
      });
    }

    if (this.importNewTitleInput) {
      this.importNewTitleInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.confirmNewTitleImport();
        } else if (e.key === "Escape") {
          e.preventDefault();
          this.closeImportConflictModal();
        }
      });
    }

    // Back to conversations list action
    if (this.btnBackToChats) {
      this.btnBackToChats.addEventListener("click", (e) => {
        if (e) e.preventDefault();
        audio.playClick();
        this.showChatSelector();
      });
    }

    // Editor click buttons
    if (this.btnNewNode) {
      this.btnNewNode.addEventListener("click", (e) => {
        if (e) e.preventDefault();
        audio.playClick();
        this.editor.createNewNode();
      });
    }

    if (this.btnExport) {
      this.btnExport.addEventListener("click", (e) => {
        if (e) e.preventDefault();
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
    window.addEventListener("resize", () => this.tightenChoiceButtons());
  }

  toggleKnowledgeHud() {
    if (!this.phoneKnowledgeHud) return;
    const isHidden = this.phoneKnowledgeHud.classList.contains("hidden");
    if (isHidden) {
      this.phoneKnowledgeHud.classList.remove("hidden");
      this.renderKnowledgeHud(this.engine.knowledgeMatrix, this.engine.getKnowledgeSummary());
    } else {
      this.phoneKnowledgeHud.classList.add("hidden");
    }
  }

  closeKnowledgeHud() {
    if (this.phoneKnowledgeHud) {
      this.phoneKnowledgeHud.classList.add("hidden");
    }
  }

  renderKnowledgeHud(matrix, summary) {
    if (!this.phoneKnowledgeHudBody) return;
    const sum = summary || this.engine.getKnowledgeSummary();
    const characters = sum.characters || [];
    const facts = sum.facts || [];
    const mat = matrix || sum.matrix || [];

    if (facts.length === 0) {
      this.phoneKnowledgeHudBody.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.85rem; font-style: italic;">
          No facts registered in the Knowledge Matrix for this story.
        </div>
      `;
      return;
    }

    let html = `
      <table class="hud-knowledge-table">
        <thead>
          <tr>
            <th style="text-align: left; min-width: 90px;">Contact</th>
            ${facts.map(f => `<th>${f}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
    `;

    characters.forEach((charKey, charIdx) => {
      const charObj = (this.engine.story && this.engine.story.characters && this.engine.story.characters[charKey]) || { name: charKey };
      html += `
        <tr>
          <td style="text-align: left; display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 20px; height: 20px; border-radius: 50%; background-color: ${charObj.avatarColor || '#6b7280'}; color: #fff; font-size: 0.65rem; font-weight: 700; text-align: center; line-height: 20px; flex-shrink: 0;">${charObj.avatarText || charKey.substring(0, 2).toUpperCase()}</span>
            <span style="font-size: 0.8rem; font-weight: 500;">${charObj.name || charKey}</span>
          </td>
          ${facts.map((_, factIdx) => {
            const knows = Boolean(mat[charIdx] && mat[charIdx][factIdx]);
            return `<td><span class="${knows ? 'hud-knows-yes' : 'hud-knows-no'}">${knows ? '✔' : '—'}</span></td>`;
          }).join('')}
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    this.phoneKnowledgeHudBody.innerHTML = html;
  }

  async loadStoriesFromFolder() {
    if (window.IS_STANDALONE || typeof loadAllStoriesFromFolder !== 'function') {
      return;
    }

    try {
      const folderStories = await loadAllStoriesFromFolder();
      const savedHashes = JSON.parse(localStorage.getItem('phone_story_hashes') || '{}');
      let updatedAny = false;

      for (const [key, story] of Object.entries(folderStories)) {
        const storyKey = story.id || key;
        const currentHash = this.getStoryHash(story);

        // If story doesn't exist yet in this.stories, or if file on disk was modified:
        if (!this.stories[storyKey] || savedHashes[storyKey] !== currentHash) {
          this.stories[storyKey] = story;
          savedHashes[storyKey] = currentHash;
          updatedAny = true;
        }
      }

      localStorage.setItem('phone_story_hashes', JSON.stringify(savedHashes));

      if (updatedAny) {
        this.saveStoriesToLocalStorage();
      }

      // Update editor context with all loaded stories
      if (this.editor && typeof this.editor.setStories === 'function') {
        this.editor.setStories(this.stories);
      }
    } catch (err) {
      console.warn("[App] Failed to load stories from folder:", err);
    }
  }

  getStoryHash(story) {
    const str = JSON.stringify(story);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
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
    const currentSelected = this.storySelect.value || this.storySelect.dataset.lastSelected;
    this.storySelect.innerHTML = "";
    Object.keys(this.stories).forEach(key => {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = this.stories[key].title;
      this.storySelect.appendChild(option);
    });
    if (currentSelected && this.stories[currentSelected]) {
      this.storySelect.value = currentSelected;
      this.storySelect.dataset.lastSelected = currentSelected;
    }
  }

  openNewStoryModal() {
    if (!this.modalNewStory) {
      this.createNewStory("Untitled Story");
      return;
    }
    if (this.modalNewStoryInput) {
      this.modalNewStoryInput.value = "Untitled Story";
    }
    this.modalNewStory.classList.remove("hidden");
    if (this.modalNewStoryInput) {
      setTimeout(() => {
        this.modalNewStoryInput.focus();
        this.modalNewStoryInput.select();
      }, 50);
    }
  }

  closeNewStoryModal() {
    if (this.modalNewStory) {
      this.modalNewStory.classList.add("hidden");
    }
  }

  confirmNewStoryFromModal() {
    const title = (this.modalNewStoryInput && this.modalNewStoryInput.value.trim()) || "Untitled Story";
    this.closeNewStoryModal();
    this.createNewStory(title);
  }

  importStory(parsedStory) {
    if (!parsedStory || !parsedStory.title) return;

    // Save current story edits first
    if (this.editor && this.editor.currentStory && this.storySelect && this.storySelect.value) {
      this.stories[this.storySelect.value] = this.editor.currentStory;
      this.saveStoriesToLocalStorage(this.storySelect.value);
    }

    const titleToMatch = parsedStory.title.trim().toLowerCase();
    const existingKey = Object.keys(this.stories).find(key => {
      const s = this.stories[key];
      return s && s.title && s.title.trim().toLowerCase() === titleToMatch;
    });

    if (existingKey) {
      this.pendingImportStory = parsedStory;
      this.pendingConflictKey = existingKey;
      this.openImportConflictModal(parsedStory.title);
    } else {
      const storyId = "custom_story_" + Date.now();
      this.saveAndLoadImportedStory(storyId, parsedStory, `Successfully imported story "${parsedStory.title}" as a new story.`);
    }
  }

  saveAndLoadImportedStory(storyId, storyObj, successMsg) {
    this.stories[storyId] = storyObj;
    this.populateStorySelector();
    if (this.storySelect) {
      this.storySelect.value = storyId;
      this.storySelect.dataset.lastSelected = storyId;
    }
    this.engine.loadStory(storyObj);
    if (this.editor) this.editor.init(storyObj);
    this.saveStoriesToLocalStorage(storyId);
    this.openChatRoom(this.engine.activeChatId);
    if (successMsg) {
      alert(successMsg);
    }
  }

  openImportConflictModal(title) {
    if (!this.modalImportConflict) {
      const overwrite = confirm(`A story named "${title}" already exists.\n\nClick OK to overwrite the existing story, or Cancel to import it with a new title.`);
      if (overwrite) {
        this.saveAndLoadImportedStory(this.pendingConflictKey, this.pendingImportStory, `Successfully overwritten existing story "${title}".`);
      } else {
        const newTitle = prompt("Enter a new title for the imported story:", `${title} (Copy)`);
        if (newTitle && newTitle.trim()) {
          this.pendingImportStory.title = newTitle.trim();
          const storyId = "custom_story_" + Date.now();
          this.saveAndLoadImportedStory(storyId, this.pendingImportStory, `Successfully imported story as "${newTitle.trim()}".`);
        }
      }
      this.pendingImportStory = null;
      this.pendingConflictKey = null;
      return;
    }

    if (this.importConflictMsg) {
      this.importConflictMsg.innerHTML = `A story named "<strong>${title}</strong>" already exists. Would you like to overwrite it or import it with a new title?`;
    }
    if (this.importNewTitleInput) {
      this.importNewTitleInput.value = `${title} (Copy)`;
    }
    this.modalImportConflict.classList.remove("hidden");
    if (this.importNewTitleInput) {
      setTimeout(() => {
        this.importNewTitleInput.focus();
        this.importNewTitleInput.select();
      }, 50);
    }
  }

  closeImportConflictModal() {
    if (this.modalImportConflict) {
      this.modalImportConflict.classList.add("hidden");
    }
    this.pendingImportStory = null;
    this.pendingConflictKey = null;
  }

  confirmOverwriteImport() {
    if (!this.pendingImportStory || !this.pendingConflictKey) return;
    const storyKey = this.pendingConflictKey;
    const storyObj = this.pendingImportStory;
    this.closeImportConflictModal();
    this.saveAndLoadImportedStory(storyKey, storyObj, `Successfully overwritten existing story "${storyObj.title}".`);
  }

  confirmNewTitleImport() {
    if (!this.pendingImportStory) return;
    const newTitle = (this.importNewTitleInput && this.importNewTitleInput.value.trim()) || `${this.pendingImportStory.title} (Copy)`;
    const storyObj = this.pendingImportStory;
    storyObj.title = newTitle;
    const storyId = "custom_story_" + Date.now();
    this.closeImportConflictModal();
    this.saveAndLoadImportedStory(storyId, storyObj, `Successfully imported story as "${newTitle}".`);
  }

  createNewStory(customTitle) {
    const title = customTitle || "Untitled Story";

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
      facts: [],
      knowledgeMatrix: [],
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
    
    this.engine.setChatRoomOpen(false);
    this.renderChatList();
  }

  // Opens individual chat room thread view
  openChatRoom(charId) {
    this.engine.setActiveChat(charId, true);

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

    const visibleCharKeys = charKeys.filter(charId => {
      const char = characters[charId];
      if (char && char.visibleByDefault !== false) {
        return true;
      }
      const logs = this.engine.conversations[charId] || [];
      return logs.some(m => m.senderId === charId);
    });

    visibleCharKeys.forEach(charId => {
      const char = characters[charId];
      const logs = this.engine.conversations[charId] || [];
      const unreadCount = this.engine.unreadCounts[charId] || 0;
      const isUnread = unreadCount > 0;

      const item = document.createElement("div");
      item.className = `chat-list-item ${isUnread ? 'unread' : ''}`;

      let lastMsgText = "No messages yet";
      let lastMsgTime = "Now";
      if (logs.length > 0) {
        const lastMsg = logs[logs.length - 1];
        lastMsgText = lastMsg.senderId === "player" ? `You: ${lastMsg.text}` : lastMsg.text;
        if (lastMsg.time) {
          lastMsgTime = lastMsg.time;
        }
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
            <span class="chat-item-time">${lastMsgTime}</span>
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
          ${msg.time ? `<div class="msg-time">${msg.time}</div>` : ''}
        </div>
      `;

      if (isNew) {
        // 1. Measure natural height at full layout width
        const naturalHeight = msgEl.getBoundingClientRect().height;

        // 2. Set initial collapsed state before enabling transition
        msgEl.style.maxHeight = "0px";
        msgEl.style.opacity = "0";

        // 3. Queue animation on next paint frame so browser commits the 0px start frame
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            msgEl.classList.add("msg-expanding");
            msgEl.style.maxHeight = naturalHeight + "px";
            msgEl.style.opacity = "1";
          });
        });

        setTimeout(() => {
          msgEl.classList.remove("msg-expanding");
          msgEl.style.maxHeight = "";
          msgEl.style.opacity = "";
        }, 400);
      }
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

    requestAnimationFrame(() => {
      this.tightenChoiceButtons();
      this.scrollToBottom();
    });
  }

  // Tighten choice button widths to the longest wrapped text line
  tightenChoiceButtons() {
    if (!this.choicesContainer) return;
    const buttons = this.choicesContainer.querySelectorAll(".choice-btn");
    buttons.forEach(btn => {
      btn.style.width = "";
      const range = document.createRange();
      range.selectNodeContents(btn);
      const rects = range.getClientRects();
      if (rects.length > 0) {
        let maxLineWidth = 0;
        for (let i = 0; i < rects.length; i++) {
          if (rects[i].width > maxLineWidth) {
            maxLineWidth = rects[i].width;
          }
        }
        if (maxLineWidth > 0) {
          const comp = window.getComputedStyle(btn);
          const padL = parseFloat(comp.paddingLeft) || 0;
          const padR = parseFloat(comp.paddingRight) || 0;
          const borL = parseFloat(comp.borderLeftWidth) || 0;
          const borR = parseFloat(comp.borderRightWidth) || 0;
          const targetWidth = Math.ceil(maxLineWidth + padL + padR + borL + borR + 1);
          btn.style.width = `${targetWidth}px`;
        }
      }
    });
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
    this.updateClockDisplay(this.engine.getClock());
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  updateClockDisplay(timeStr) {
    const clockEl = document.getElementById("status-time");
    if (!clockEl) return;
    if (timeStr) {
      clockEl.textContent = timeStr;
    } else if (this.updateSystemTime) {
      this.updateSystemTime();
    }
  }

  startStatusBarClock() {
    const clockEl = document.getElementById("status-time");
    if (!clockEl) return;

    this.updateSystemTime = () => {
      if (this.engine && this.engine.getClock()) {
        clockEl.textContent = this.engine.getClock();
        return;
      }
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      clockEl.textContent = `${hours}:${minutes} ${ampm}`;
    };

    this.updateSystemTime();
    setInterval(this.updateSystemTime, 30000);
  }

  setupViewModeTabs() {
    if (window.IS_STANDALONE) {
      document.body.dataset.viewMode = "play";
      return;
    }
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
      let cssText, audioJs, engineJs, appJs;
      try {
        [cssText, audioJs, engineJs, appJs] = await Promise.all([
          fetch("style.css").then(res => res.text()),
          fetch("audio.js").then(res => res.text()),
          fetch("engine.js").then(res => res.text()),
          fetch("app.js").then(res => res.text())
        ]);
      } catch (err) {
        alert("Generating a standalone build requires testing on the local HTTP server (http://localhost:8000).\n\nPlease open http://localhost:8000/ in your browser to build your story.");
        return;
      }

      // Helper function to clean JS modules imports/exports
      const cleanScript = (jsText) => {
        return jsText
          .replace(/import\s+[\s\S]*?;\s*/g, "") // Remove imports
          .replace(/export\s+class\s+/g, "class ") // Remove export class
          .replace(/export\s+const\s+/g, "const ") // Remove export const
          .replace(/export\s+default\s+/g, "");
      };

      const cleanedAudio = cleanScript(audioJs);
      const cleanedEngine = cleanScript(engineJs);
      const cleanedApp = cleanScript(appJs);

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
  </style>
</head>
<body data-view-mode="play">

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

window.addEventListener("DOMContentLoaded", async () => {
  const app = new AppCoordinator();
  await app.init();
});
