/**
 * Multi-character Tree-based CYOA Dialogue Engine
 * Groups message history by character, tracks unread counts, and resolves thread-filtered choices.
 */

import { audio } from './audio.js';

export class GameEngine {
  constructor() {
    this.story = null;
    this.variables = {};
    
    // Stack of active execution contexts: [{ nodesList: Array, currentIndex: Number }]
    this.stack = [];
    this.conversations = {}; // Grouped: { characterId: Array<Message> }
    this.unreadCounts = {};  // Tracking: { characterId: Number }
    this.activeChoices = []; // Currently waiting choice options
    this.activeChatId = null;// Currently opened conversation channel
    this.isTyping = false;
    this.typingTimeout = null;
    this.delayTimeout = null;

    this.callbacks = {
      onMessageAdded: () => {}, // (msg, targetChatId)
      onTypingStateChange: () => {},
      onChoicesDisplay: () => {},
      onStoryRestart: () => {},
      onVariableUpdate: () => {}
    };
  }

  on(event, callback) {
    if (this.callbacks[event] !== undefined) {
      this.callbacks[event] = callback;
    }
  }

  loadStory(storyData) {
    this.story = JSON.parse(JSON.stringify(storyData));
    this.reset();
  }

  reset() {
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    if (this.delayTimeout) clearTimeout(this.delayTimeout);

    this.variables = this.story.variables ? { ...this.story.variables } : {};
    this.conversations = {};
    this.unreadCounts = {};
    this.activeChoices = [];
    this.isTyping = false;
    
    // Choose default active chat (first contact)
    const charKeys = Object.keys(this.story.characters);
    this.activeChatId = charKeys.find(k => k !== "player") || charKeys[0] || "system";

    // Initialize context stack with root story nodes
    this.stack = [{
      nodesList: this.story.nodes,
      currentIndex: 0
    }];

    this.callbacks.onStoryRestart();
    this.callbacks.onVariableUpdate(this.variables);

    // Begin playback
    this.playCurrentNode();
  }

  setActiveChat(chatId) {
    this.activeChatId = chatId;
    this.unreadCounts[chatId] = 0;
  }

  // Play the node at the top of the context stack
  playCurrentNode() {
    if (this.stack.length === 0) {
      console.log("Dialogue tree fully completed.");
      return;
    }

    const context = this.stack[this.stack.length - 1];
    const index = context.currentIndex;
    const list = context.nodesList;

    if (!list || index >= list.length) {
      // Reached the end of this sub-tree branch. Pop and return to parent level.
      this.stack.pop();
      if (this.stack.length > 0) {
        const parentContext = this.stack[this.stack.length - 1];
        parentContext.currentIndex += 1;
        this.playCurrentNode();
      } else {
        console.log("End of main storyline tree.");
      }
      return;
    }

    const node = list[index];

    // Check if the node is a conditional branch director
    if (node.type === "conditional") {
      this.evaluateConditionalNode(node);
      return;
    }

    this.playNormalNode(node);
  }

  // Evaluates variables condition check and pushes result branch to context stack
  evaluateConditionalNode(node) {
    const varName = node.variable;
    const currentVal = this.variables[varName] !== undefined ? this.variables[varName] : 0;
    const checkVal = Number(node.value);

    let isTrue = false;
    switch (node.operator) {
      case "==": isTrue = currentVal == checkVal; break;
      case "!=": isTrue = currentVal != checkVal; break;
      case ">": isTrue = currentVal > checkVal; break;
      case ">=": isTrue = currentVal >= checkVal; break;
      case "<": isTrue = currentVal < checkVal; break;
      case "<=": isTrue = currentVal <= checkVal; break;
    }

    const nextBranch = isTrue ? (node.trueNodes || []) : (node.falseNodes || []);
    
    // Push conditional branch context onto stack
    this.stack.push({
      nodesList: nextBranch,
      currentIndex: 0
    });

    this.playCurrentNode();
  }

  // Handles standard dialogue node typing and display delay
  playNormalNode(node) {
    this.isTyping = true;
    const sender = this.story.characters[node.sender];
    const isPlayer = sender ? sender.isPlayer : false;

    this.callbacks.onTypingStateChange(true, node.sender);

    const delay = node.delay !== undefined ? node.delay : 1000;

    // Trigger haptic vibration before incoming non-player texts
    if (!isPlayer && node.sender !== "system") {
      this.delayTimeout = setTimeout(() => {
        audio.playVibrate();
      }, Math.max(0, delay - 400));
    }

    this.delayTimeout = setTimeout(() => {
      this.typeMessage(node, isPlayer);
    }, delay);
  }

  // Display message instantly
  typeMessage(node, isPlayer) {
    this.callbacks.onTypingStateChange(false, null);

    const messageId = "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    
    // Route system messages to current active chat, others to the actual sender's chat
    const targetChatId = node.sender === "system" ? this.activeChatId : node.sender;

    if (!this.conversations[targetChatId]) {
      this.conversations[targetChatId] = [];
    }

    const messageObj = {
      id: messageId,
      senderId: node.sender,
      character: this.story.characters[node.sender] || { name: "System", avatarColor: "#6b7280", avatarText: "SYS", isPlayer: false },
      text: node.text || "",
      isComplete: true
    };

    this.conversations[targetChatId].push(messageObj);
    this.isTyping = false;

    // Increment unread count if it's arriving in a background channel
    if (targetChatId !== this.activeChatId) {
      if (this.unreadCounts[targetChatId] === undefined) {
        this.unreadCounts[targetChatId] = 0;
      }
      this.unreadCounts[targetChatId] += 1;
    }

    // Call UI update, passing targetChatId
    this.callbacks.onMessageAdded(messageObj, targetChatId);

    if (isPlayer) {
      audio.playSend();
    } else {
      audio.playReceive();
    }

    this.finishNodePlayback(node);
  }

  finishNodePlayback(node) {
    // Apply immediate variable updates
    if (node.actions) {
      this.applyActions(node.actions);
    }

    if (node.choices && node.choices.length > 0) {
      // Set active choices
      this.activeChoices = node.choices;
      // Notify UI to render choices
      this.callbacks.onChoicesDisplay(this.activeChoices);
    } else {
      // Auto-advance: increment current index and proceed
      const context = this.stack[this.stack.length - 1];
      context.currentIndex += 1;

      const autoDelay = node.autoAdvanceDelay !== undefined ? node.autoAdvanceDelay : 1000;
      this.delayTimeout = setTimeout(() => {
        this.playCurrentNode();
      }, autoDelay);
    }
  }

  applyActions(actions) {
    for (const key in actions) {
      const val = Number(actions[key]);
      if (this.variables[key] === undefined) {
        this.variables[key] = 0;
      }
      this.variables[key] += val;
    }
    this.callbacks.onVariableUpdate(this.variables);
  }

  // Process player clicking a choice
  selectChoice(choice) {
    if (this.isTyping) return;

    // Determine target chat (either targeted choice.chat or current activeChatId)
    const targetChatId = choice.chat || this.activeChatId;

    if (!this.conversations[targetChatId]) {
      this.conversations[targetChatId] = [];
    }

    // Display selection as user message
    const userMsgObj = {
      id: "choice_" + Date.now(),
      senderId: "player",
      character: this.story.characters["player"] || { name: "You", avatarColor: "#a855f7", avatarText: "ME", isPlayer: true },
      text: choice.text,
      isComplete: true
    };

    this.conversations[targetChatId].push(userMsgObj);
    this.callbacks.onMessageAdded(userMsgObj, targetChatId);
    audio.playSend();

    // Clear active options
    this.activeChoices = [];
    this.callbacks.onChoicesDisplay([]);

    if (choice.actions) {
      this.applyActions(choice.actions);
    }

    if (choice.restart) {
      this.delayTimeout = setTimeout(() => {
        this.reset();
      }, 800);
      return;
    }

    this.delayTimeout = setTimeout(() => {
      if (choice.nodes && choice.nodes.length > 0) {
        // Push sub-nodes list onto context stack
        this.stack.push({
          nodesList: choice.nodes,
          currentIndex: 0
        });
        this.playCurrentNode();
      } else {
        // Choice completes the parent branch. Advance past the parent node.
        const context = this.stack[this.stack.length - 1];
        context.currentIndex += 1;
        this.playCurrentNode();
      }
    }, 800);
  }

  // Resolve a node reference from a path string (e.g. "0,choices,1,nodes,0")
  getNodeByPath(pathStr) {
    if (!pathStr) return null;
    const parts = pathStr.split(",");
    let current = this.story.nodes;

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (!isNaN(p)) {
        const idx = parseInt(p);
        if (Array.isArray(current)) {
          if (i === parts.length - 1) {
            return current[idx];
          }
          current = current[idx];
        } else {
          return null;
        }
      } else {
        current = current[p];
      }
    }
    return null;
  }

  // Advance playtest directly to a targeted tree path
  advanceToPath(pathStr) {
    if (!this.story) return;
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    if (this.delayTimeout) clearTimeout(this.delayTimeout);

    this.conversations = {};
    this.unreadCounts = {};
    this.activeChoices = [];
    this.isTyping = false;
    this.callbacks.onStoryRestart();

    // Rebuild context call stack to match the target path depth
    this.stack = [];
    const parts = pathStr.split(",");
    let currentList = this.story.nodes;

    let idx = 0;
    while (idx < parts.length) {
      const listIndex = parseInt(parts[idx]);
      this.stack.push({
        nodesList: currentList,
        currentIndex: listIndex
      });

      if (idx + 1 < parts.length) {
        const key = parts[idx + 1];
        const currentNode = currentList[listIndex];

        if (key === "choices") {
          const choiceIdx = parseInt(parts[idx + 2]);
          const choice = currentNode.choices[choiceIdx];
          currentList = choice.nodes || [];
          idx += 4; // Skip listIndex, "choices", choiceIndex, "nodes"
        } else if (key === "trueNodes" || key === "falseNodes") {
          currentList = currentNode[key] || [];
          idx += 2; // Skip listIndex, key
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // Set active chat from the node at the top of the stack
    const targetNode = this.stack[this.stack.length - 1].nodesList[this.stack[this.stack.length - 1].currentIndex];
    if (targetNode && targetNode.sender && targetNode.sender !== "system") {
      this.activeChatId = targetNode.sender;
    }

    // Play the target node
    this.playCurrentNode();
  }
}
