/**
 * Dialogue Tree Story Editor
 * Manages tree traversal, node configurations, recursive lists rendering, and JSON uploads.
 */

import { defaultStories } from './stories.js';

export class StoryEditor {
  constructor(engine) {
    this.engine = engine;
    this.currentStory = null;
    this.selectedNodeId = null; // Stored as path string, e.g. "0" or "0,choices,1,nodes,2"

    // UI Cache Elements
    this.nodeListContainer = null;
    this.editFormContainer = null;
    this.storySelect = null;

    this.init = this.init.bind(this);
    this.renderNodeList = this.renderNodeList.bind(this);
    this.selectNode = this.selectNode.bind(this);
    this.saveNodeFromForm = this.saveNodeFromForm.bind(this);
    this.saveCharactersFromForm = this.saveCharactersFromForm.bind(this);
    this.saveVariablesFromForm = this.saveVariablesFromForm.bind(this);
    this.createNewNode = this.createNewNode.bind(this);
    this.createChildNode = this.createChildNode.bind(this);
    this.createTopLevelNode = this.createTopLevelNode.bind(this);
    this.moveNode = this.moveNode.bind(this);
    this.deleteCurrentNode = this.deleteCurrentNode.bind(this);
    this.exportJSON = this.exportJSON.bind(this);
    this.importJSON = this.importJSON.bind(this);
    this.triggerLocalStorageSave = this.triggerLocalStorageSave.bind(this);
  }

  init(storyData) {
    this.currentStory = JSON.parse(JSON.stringify(storyData));
    
    this.nodeListContainer = document.getElementById("node-list");
    this.editFormContainer = document.getElementById("node-form-container");
    this.storySelect = document.getElementById("story-select");

    // Automatically save node changes on any input or change event in the form
    this.editFormContainer.addEventListener("input", () => {
      this.saveNodeFromForm();
    });
    this.editFormContainer.addEventListener("change", () => {
      this.saveNodeFromForm();
      this.triggerLocalStorageSave();
    });

    this.renderNodeList();
    this.renderCharactersList();
    this.renderVariablesList();

    // Select first root node
    if (this.currentStory.nodes && this.currentStory.nodes.length > 0) {
      this.selectNode("0");
    } else {
      this.editFormContainer.innerHTML = `<span class="empty-vars">No nodes in story. Click "+ New" in sidebar.</span>`;
    }
  }

  // Resolve a path string (e.g. "0,choices,1,nodes,2") to its parent list and index
  resolvePath(pathStr) {
    const parts = pathStr.split(",");
    let current = this.currentStory.nodes;

    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!isNaN(p)) {
        current = current[parseInt(p)];
      } else {
        current = current[p];
      }
    }

    const lastKey = parts[parts.length - 1];
    return {
      parentList: current,
      index: parseInt(lastKey),
      lastKey
    };
  }

  // Retrieve node data by path
  getNodeByPath(pathStr) {
    if (!pathStr) return null;
    try {
      const { parentList, index } = this.resolvePath(pathStr);
      return parentList[index];
    } catch (e) {
      console.warn("Failed to find node at path: ", pathStr, e);
      return null;
    }
  }

  // Recursive Tree Rendering
  renderNodeList() {
    if (!this.nodeListContainer) return;
    this.nodeListContainer.innerHTML = "";

    const traverse = (list, depth, path = []) => {
      if (!list) return;
      list.forEach((node, idx) => {
        const currentPath = [...path, idx];
        const pathStr = currentPath.join(",");

        const nodeDiv = document.createElement("div");
        nodeDiv.className = `node-item ${pathStr === this.selectedNodeId ? 'active' : ''}`;
        nodeDiv.style.paddingLeft = `${depth * 16 + 10}px`;
        nodeDiv.dataset.path = pathStr;
        nodeDiv.draggable = true;

        nodeDiv.addEventListener("dragstart", (e) => {
          e.stopPropagation();
          this.draggedPathStr = pathStr;
          nodeDiv.classList.add("dragging");
          e.dataTransfer.setData("text/plain", pathStr);
          e.dataTransfer.effectAllowed = "move";
        });

        nodeDiv.addEventListener("dragend", (e) => {
          e.stopPropagation();
          nodeDiv.classList.remove("dragging");
          document.querySelectorAll(".node-item, .node-choice-sidebar-item, .top-level-add-container").forEach(el => {
            el.classList.remove("drag-over-top", "drag-over-bottom", "drag-over-child", "drag-over-choice", "drag-over-toplevel");
          });
          this.draggedPathStr = null;
        });

        nodeDiv.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!this.draggedPathStr || this.draggedPathStr === pathStr) return;
          // Prevent dropping a node into its own descendant
          if (pathStr.startsWith(this.draggedPathStr + ",")) return;

          e.dataTransfer.dropEffect = "move";
          const rect = nodeDiv.getBoundingClientRect();
          const offsetY = e.clientY - rect.top;
          const height = rect.height;

          nodeDiv.classList.remove("drag-over-top", "drag-over-bottom", "drag-over-child");

          if (offsetY < height * 0.25) {
            nodeDiv.classList.add("drag-over-top");
          } else if (offsetY > height * 0.75) {
            nodeDiv.classList.add("drag-over-bottom");
          } else {
            nodeDiv.classList.add("drag-over-child");
          }
        });

        nodeDiv.addEventListener("dragleave", (e) => {
          e.stopPropagation();
          nodeDiv.classList.remove("drag-over-top", "drag-over-bottom", "drag-over-child");
        });

        nodeDiv.addEventListener("drop", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const draggedPath = this.draggedPathStr || e.dataTransfer.getData("text/plain");
          if (!draggedPath || draggedPath === pathStr) return;
          if (pathStr.startsWith(draggedPath + ",")) return; // Prevent dropping parent into child

          const rect = nodeDiv.getBoundingClientRect();
          const offsetY = e.clientY - rect.top;
          const height = rect.height;

          let position = "child";
          if (offsetY < height * 0.25) {
            position = "before";
          } else if (offsetY > height * 0.75) {
            position = "after";
          }

          this.moveNode(draggedPath, pathStr, position);
        });

        const label = document.createElement("div");
        label.className = "node-label";

        const title = document.createElement("span");
        title.className = "node-id-txt";

        if (node.type === "conditional") {
          title.textContent = `⚡ If ${node.variable || '?'} ${node.operator || '=='} ${node.value || 0}`;
        } else {
          const char = this.currentStory.characters[node.sender] || { name: "System" };
          title.textContent = `💬 ${char.name} (${node.sender})`;
        }
        label.appendChild(title);
        nodeDiv.appendChild(label);

        const snippet = document.createElement("div");
        snippet.className = "node-snippet";
        snippet.textContent = node.text || `[Conditional Branch]`;
        nodeDiv.appendChild(snippet);

        // Quick add child button container
        const btnAddChild = document.createElement("button");
        btnAddChild.type = "button";
        btnAddChild.className = "btn-node-add-child";
        btnAddChild.title = "Add child node";
        btnAddChild.innerHTML = "+ Add Child";
        btnAddChild.addEventListener("click", (e) => {
          e.stopPropagation();
          this.createChildNode(pathStr);
        });

        // Append quick add button under node content inside nodeDiv
        nodeDiv.appendChild(btnAddChild);

        nodeDiv.addEventListener("click", () => this.selectNode(pathStr));
        this.nodeListContainer.appendChild(nodeDiv);

        // Process Choices
        if (node.choices && node.choices.length > 0) {
          node.choices.forEach((choice, choiceIdx) => {
            const choiceDiv = document.createElement("div");
            choiceDiv.className = "node-choice-sidebar-item";
            choiceDiv.style.paddingLeft = `${(depth + 1) * 16 + 10}px`;
            choiceDiv.innerHTML = `
              <span class="choice-sidebar-bullet">↳</span> 
              <span class="choice-sidebar-txt">${choice.text}</span>
            `;

            const choicePathStr = `${pathStr},choices,${choiceIdx}`;

            choiceDiv.addEventListener("dragover", (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!this.draggedPathStr || choicePathStr.startsWith(this.draggedPathStr + ",")) return;
              e.dataTransfer.dropEffect = "move";
              choiceDiv.classList.add("drag-over-choice");
            });

            choiceDiv.addEventListener("dragleave", (e) => {
              e.stopPropagation();
              choiceDiv.classList.remove("drag-over-choice");
            });

            choiceDiv.addEventListener("drop", (e) => {
              e.preventDefault();
              e.stopPropagation();
              choiceDiv.classList.remove("drag-over-choice");
              const draggedPath = this.draggedPathStr || e.dataTransfer.getData("text/plain");
              if (!draggedPath || choicePathStr.startsWith(draggedPath + ",")) return;

              this.moveNode(draggedPath, choicePathStr, "choice");
            });

            this.nodeListContainer.appendChild(choiceDiv);

            if (choice.nodes && choice.nodes.length > 0) {
              traverse(choice.nodes, depth + 2, [...currentPath, "choices", choiceIdx, "nodes"]);
            }
          });
        }

        // Process Condition true/false sub-lists
        if (node.type === "conditional") {
          if (node.trueNodes && node.trueNodes.length > 0) {
            const header = document.createElement("div");
            header.className = "node-choice-sidebar-item cond-header-label";
            header.style.paddingLeft = `${(depth + 1) * 16 + 10}px`;
            header.innerHTML = `<span>✔ True branch:</span>`;
            this.nodeListContainer.appendChild(header);
            traverse(node.trueNodes, depth + 2, [...currentPath, "trueNodes"]);
          }
          if (node.falseNodes && node.falseNodes.length > 0) {
            const header = document.createElement("div");
            header.className = "node-choice-sidebar-item cond-header-label";
            header.style.paddingLeft = `${(depth + 1) * 16 + 10}px`;
            header.innerHTML = `<span>✖ False branch:</span>`;
            this.nodeListContainer.appendChild(header);
            traverse(node.falseNodes, depth + 2, [...currentPath, "falseNodes"]);
          }
        }
      });
    };

    traverse(this.currentStory.nodes, 0, []);

    // Button at the end to make a new top-level node after the others
    const addTopLevelContainer = document.createElement("div");
    addTopLevelContainer.className = "top-level-add-container";
    addTopLevelContainer.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.draggedPathStr) {
        e.dataTransfer.dropEffect = "move";
        addTopLevelContainer.classList.add("drag-over-toplevel");
      }
    });

    addTopLevelContainer.addEventListener("dragleave", (e) => {
      e.stopPropagation();
      addTopLevelContainer.classList.remove("drag-over-toplevel");
    });

    addTopLevelContainer.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      addTopLevelContainer.classList.remove("drag-over-toplevel");
      const draggedPath = this.draggedPathStr || e.dataTransfer.getData("text/plain");
      if (!draggedPath) return;

      const lastTopIndex = this.currentStory.nodes.length - 1;
      if (lastTopIndex >= 0) {
        this.moveNode(draggedPath, String(lastTopIndex), "after");
      } else {
        // If story has no nodes, move as child of none / top level
        this.moveNode(draggedPath, "0", "after");
      }
    });

    const btnAddTopLevel = document.createElement("button");
    btnAddTopLevel.type = "button";
    btnAddTopLevel.className = "btn btn-secondary btn-sm";
    btnAddTopLevel.style.width = "100%";
    btnAddTopLevel.style.marginTop = "8px";
    btnAddTopLevel.innerHTML = "+ Add Top-Level Node";
    btnAddTopLevel.addEventListener("click", () => {
      this.createTopLevelNode();
    });
    addTopLevelContainer.appendChild(btnAddTopLevel);
    this.nodeListContainer.appendChild(addTopLevelContainer);
  }

  // Load a single node into form editor
  selectNode(pathStr) {
    this.selectedNodeId = pathStr;
    const node = this.getNodeByPath(pathStr);
    if (!node) return;

    // Highlight sidebar active item
    document.querySelectorAll(".node-item").forEach(item => {
      item.classList.toggle("active", item.dataset.path === pathStr);
    });

    const isRootNode = !pathStr.includes(",");

    // Generate Form HTML dynamically
    let html = `
      <div class="form-row">
        <label>Tree Path</label>
        <input type="text" value="${pathStr}" disabled style="background: rgba(255, 255, 255, 0.05); color: var(--text-muted);">
      </div>

      <div class="form-row">
        <label>Node Type</label>
        <div class="flow-mode-selector">
          <label class="radio-btn">
            <input type="radio" name="node-type" value="normal" ${node.type !== 'conditional' ? 'checked' : ''}> Standard Dialogue
          </label>
          <label class="radio-btn">
            <input type="radio" name="node-type" value="conditional" ${node.type === 'conditional' ? 'checked' : ''}> Conditional Branch
          </label>
        </div>
      </div>

      <!-- Dialogue Node Panel -->
      <div id="panel-normal-editor" class="${node.type === 'conditional' ? 'hidden' : ''}">
        <div class="form-row">
          <label for="edit-sender">Sender / Character</label>
          <select id="edit-sender">
            <option value="system" ${node.sender === 'system' ? 'selected' : ''}>[System Message]</option>
            ${Object.keys(this.currentStory.characters).map(charKey => `
              <option value="${charKey}" ${node.sender === charKey ? 'selected' : ''}>
                ${this.currentStory.characters[charKey].name} (${charKey})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-row">
          <label for="edit-text">Message Content</label>
          <textarea id="edit-text" rows="3">${node.text || ''}</textarea>
        </div>

        <div class="form-row">
          <label for="edit-delay">Delay Before Showing (ms)</label>
          <input type="number" id="edit-delay" value="${node.delay !== undefined ? node.delay : 1000}" min="0">
        </div>

        <hr class="editor-divider">

        <div class="form-row">
          <label>Player Branching Choices</label>
          <div id="choices-list-editor">
            <!-- Choice fields -->
          </div>
          <button type="button" id="btn-add-choice" class="btn btn-secondary btn-sm">+ Add Choice Option</button>
        </div>
      </div>

      <!-- Conditional Node Panel -->
      <div id="panel-conditional-editor" class="${node.type !== 'conditional' ? 'hidden' : ''}">
        <div class="form-row math-row" style="display: flex; align-items: center; gap: 8px;">
          <div style="flex: 1;">
            <label>If Variable</label>
            <input type="text" id="cond-var" value="${node.variable || ''}" placeholder="trust">
          </div>
          <div style="width: 80px;">
            <label>Check</label>
            <select id="cond-op">
              <option value="==" ${(node.operator === '==') ? 'selected' : ''}>==</option>
              <option value="!=" ${(node.operator === '!=') ? 'selected' : ''}>!=</option>
              <option value=">" ${(node.operator === '>') ? 'selected' : ''}>&gt;</option>
              <option value=">=" ${(node.operator === '>=') ? 'selected' : ''}>&gt;=</option>
              <option value="<" ${(node.operator === '<') ? 'selected' : ''}>&lt;</option>
              <option value="<=" ${(node.operator === '<=') ? 'selected' : ''}>&lt;=</option>
            </select>
          </div>
          <div style="width: 80px;">
            <label>Value</label>
            <input type="number" id="cond-val" value="${node.value !== undefined ? node.value : 0}">
          </div>
        </div>

        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button type="button" id="btn-add-true-node" class="btn btn-secondary btn-sm" style="flex: 1;">+ Add Node to True</button>
          <button type="button" id="btn-add-false-node" class="btn btn-secondary btn-sm" style="flex: 1;">+ Add Node to False</button>
        </div>
      </div>

      <hr class="editor-divider">

       <div class="editor-actions">
        <button type="button" id="btn-play-node" class="btn btn-accent" style="flex: 1;">Play from Here</button>
        <button type="button" id="btn-delete-node" class="btn btn-danger">Delete Node</button>
      </div>
    `;

    this.editFormContainer.innerHTML = html;

    // Attach listeners
    document.getElementById("btn-play-node").addEventListener("click", () => {
      this.saveNodeFromForm();
      this.engine.loadStory(this.currentStory);
      this.engine.advanceToPath(pathStr);
      if (window.appCoordinator) {
        window.appCoordinator.switchViewMode("play");
      }
    });
    document.getElementById("btn-delete-node").addEventListener("click", this.deleteCurrentNode);

    // Switch Panel layouts based on radio button selection
    const normalPanel = document.getElementById("panel-normal-editor");
    const condPanel = document.getElementById("panel-conditional-editor");

    document.querySelectorAll("input[name='node-type']").forEach(radio => {
      radio.addEventListener("change", (e) => {
        normalPanel.classList.toggle("hidden", e.target.value === 'conditional');
        condPanel.classList.toggle("hidden", e.target.value !== 'conditional');
      });
    });

    // Populate standard choices
    this.renderChoicesListEditor(node.choices || [], pathStr);

    document.getElementById("btn-add-choice").addEventListener("click", () => {
      const list = document.getElementById("choices-list-editor");
      const idx = list.children.length;
      list.appendChild(this.createChoiceItemMarkup("", null, idx, pathStr));
      this.saveNodeFromForm();
      this.triggerLocalStorageSave();
    });

    // Add branches listeners for conditional lists
    if (node.type === "conditional") {
      document.getElementById("btn-add-true-node").addEventListener("click", () => {
        this.addNodeToConditionalBranch(pathStr, "trueNodes");
      });
      document.getElementById("btn-add-false-node").addEventListener("click", () => {
        this.addNodeToConditionalBranch(pathStr, "falseNodes");
      });
    }
  }

  // Create HTML inputs for editing choices in standard dialogue nodes
  createChoiceItemMarkup(text, actions, choiceIndex, parentPathStr) {
    const wrapper = document.createElement("div");
    wrapper.className = "choice-edit-item";
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.gap = "6px";
    wrapper.dataset.index = choiceIndex;

    const row1 = document.createElement("div");
    row1.style.display = "flex";
    row1.style.gap = "8px";
    row1.style.alignItems = "center";

    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.className = "choice-text-input";
    textInput.placeholder = "Option text (what player clicks)";
    textInput.value = text;
    textInput.style.flex = "1";

    const btnDel = document.createElement("button");
    btnDel.type = "button";
    btnDel.className = "btn btn-danger btn-xs";
    btnDel.textContent = "✖";
    btnDel.addEventListener("click", () => {
      wrapper.remove();
      this.saveNodeFromForm();
      this.triggerLocalStorageSave();
    });

    row1.appendChild(textInput);
    row1.appendChild(btnDel);

    // Variables modifiers row
    const row2 = document.createElement("div");
    row2.className = "choice-action-row";
    row2.style.display = "flex";
    row2.style.alignItems = "center";
    row2.style.gap = "6px";
    row2.style.fontSize = "0.75rem";
    row2.style.color = "var(--text-muted)";

    let actKey = "";
    let actVal = "";
    if (actions && Object.keys(actions).length > 0) {
      actKey = Object.keys(actions)[0];
      actVal = actions[actKey];
    }

    // Get current choice chat target
    const node = this.getNodeByPath(parentPathStr);
    const selectedChat = (node && node.choices && node.choices[choiceIndex] && node.choices[choiceIndex].chat) || "";

    const chatSelectHtml = `
      <select class="choice-chat-select" style="max-width: 130px; padding: 4px; font-size: 0.8rem; background: rgba(0,0,0,0.3); color: #fff; border: 1px solid var(--border-translucent); border-radius: 4px;">
        <option value="" ${selectedChat === "" ? "selected" : ""}>[Current Sender]</option>
        ${Object.keys(this.currentStory.characters).map(charKey => `
          <option value="${charKey}" ${selectedChat === charKey ? "selected" : ""}>
            ${this.currentStory.characters[charKey].name} (${charKey})
          </option>
        `).join("")}
      </select>
    `;

    const varKeys = Object.keys(this.currentStory.variables || {});
    const effectSelectHtml = `
      <select class="choice-act-key" style="max-width: 100px; padding: 4px; font-size: 0.8rem; background: rgba(0,0,0,0.3); color: #fff; border: 1px solid var(--border-translucent); border-radius: 4px;">
        <option value="" ${actKey === "" ? "selected" : ""}>[None]</option>
        ${varKeys.map(varKey => `
          <option value="${varKey}" ${actKey === varKey ? "selected" : ""}>${varKey}</option>
        `).join("")}
      </select>
    `;

    row2.innerHTML = `
      <span>In Chat:</span>
      ${chatSelectHtml}
      <span style="margin-left: 8px;">Effect:</span>
      ${effectSelectHtml}
      <span>+</span>
      <input type="number" class="choice-act-val" placeholder="value" value="${actVal}" style="width: 45px; padding: 4px;">
    `;

    // Direct Add/Go buttons for nested tree nodes
    const row3 = document.createElement("div");
    row3.style.display = "flex";
    row3.style.gap = "8px";
    
    const hasChildren = node && node.choices && node.choices[choiceIndex] && node.choices[choiceIndex].nodes && node.choices[choiceIndex].nodes.length > 0;

    const btnAddSubNode = document.createElement("button");
    btnAddSubNode.type = "button";
    btnAddSubNode.className = "btn btn-secondary btn-xs";
    btnAddSubNode.textContent = hasChildren ? "➕ Append Sub-Node" : "➕ Create Dialogue Branch";
    btnAddSubNode.style.flex = "1";
    btnAddSubNode.addEventListener("click", () => {
      this.saveNodeFromForm(); // Save active edits first
      this.addChildNodeToChoice(parentPathStr, choiceIndex);
    });

    row3.appendChild(btnAddSubNode);

    wrapper.appendChild(row1);
    wrapper.appendChild(row2);
    wrapper.appendChild(row3);

    return wrapper;
  }

  renderChoicesListEditor(choices, parentPathStr) {
    const container = document.getElementById("choices-list-editor");
    container.innerHTML = "";
    choices.forEach((ch, idx) => {
      container.appendChild(this.createChoiceItemMarkup(ch.text, ch.actions, idx, parentPathStr));
    });
  }

  // Appends a child dialogue node directly under a choice array in-place
  addChildNodeToChoice(parentPathStr, choiceIndex) {
    const node = this.getNodeByPath(parentPathStr);
    if (!node) return;

    // Ensure the choice object exists in the array
    if (!node.choices[choiceIndex]) {
      node.choices[choiceIndex] = { text: "" };
    }

    const choice = node.choices[choiceIndex];
    if (!choice.nodes) {
      choice.nodes = [];
    }

    const newIndex = choice.nodes.length;
    choice.nodes.push({
      sender: "astro",
      text: "New branch message content.",
      delay: 500
    });

    const targetPath = `${parentPathStr},choices,${choiceIndex},nodes,${newIndex}`;
    this.renderNodeList();
    this.selectNode(targetPath);
    this.triggerLocalStorageSave();
  }

  // Appends a child dialogue node under conditional true/false array in-place
  addNodeToConditionalBranch(parentPathStr, branchKey) {
    const node = this.getNodeByPath(parentPathStr);
    if (!node) return;

    if (!node[branchKey]) {
      node[branchKey] = [];
    }

    const newIndex = node[branchKey].length;
    node[branchKey].push({
      sender: "astro",
      text: "New branch message content.",
      delay: 500
    });

    const targetPath = `${parentPathStr},${branchKey},${newIndex}`;
    this.renderNodeList();
    this.selectNode(targetPath);
    this.triggerLocalStorageSave();
  }

  // Save changes from form back to draft story
  saveNodeFromForm() {
    if (!this.selectedNodeId) return;

    const nodeType = document.querySelector("input[name='node-type']:checked").value;
    const { parentList, index } = this.resolvePath(this.selectedNodeId);

    const oldNode = parentList[index];

    if (nodeType === 'conditional') {
      const condVar = document.getElementById("cond-var").value.trim();
      const condOp = document.getElementById("cond-op").value;
      const condVal = parseInt(document.getElementById("cond-val").value) || 0;

      parentList[index] = {
        type: "conditional",
        variable: condVar,
        operator: condOp,
        value: condVal,
        trueNodes: oldNode.trueNodes || [],
        falseNodes: oldNode.falseNodes || []
      };
    } else {
      const sender = document.getElementById("edit-sender").value;
      const text = document.getElementById("edit-text").value;
      const delay = parseInt(document.getElementById("edit-delay").value) || 0;

      // Extract choices list
      const choices = [];
      document.querySelectorAll(".choice-edit-item").forEach((item, chIdx) => {
        const textVal = item.querySelector(".choice-text-input").value.trim();
        const actKey = item.querySelector(".choice-act-key").value.trim();
        const actVal = parseInt(item.querySelector(".choice-act-val").value);
        const chatVal = item.querySelector(".choice-chat-select").value;

        const choiceObj = { text: textVal || "" };
        if (chatVal) {
          choiceObj.chat = chatVal;
        }
        if (actKey && !isNaN(actVal)) {
          choiceObj.actions = { [actKey]: actVal };
        }
        // Retain sub-nodes list if it exists in the original choice object
        if (oldNode.choices && oldNode.choices[chIdx] && oldNode.choices[chIdx].nodes) {
          choiceObj.nodes = oldNode.choices[chIdx].nodes;
        }
        choices.push(choiceObj);
      });

      parentList[index] = {
        sender,
        text,
        delay,
        choices
      };
    }

    this.renderNodeList();
    // Live update the engine
    this.engine.loadStory(this.currentStory);
  }

  // Move node from source path to target path (before, after, or as child)
  moveNode(sourcePathStr, targetPathStr, position = "child") {
    if (!sourcePathStr || !targetPathStr || sourcePathStr === targetPathStr) return;
    if (targetPathStr.startsWith(sourcePathStr + ",")) return; // Prevent moving node into its own descendant

    this.saveNodeFromForm();

    // 1. Get the source node object
    const sourceNode = this.getNodeByPath(sourcePathStr);
    if (!sourceNode) return;

    // Deep clone source node to preserve its data and child trees cleanly
    const sourceNodeCopy = JSON.parse(JSON.stringify(sourceNode));

    // 2. Remove source node from its current parent array
    const { parentList: srcList, index: srcIndex } = this.resolvePath(sourcePathStr);
    srcList.splice(srcIndex, 1);

    // 3. Insert into target location
    if (position === "choice") {
      // targetPathStr looks like "0,choices,1"
      const { parentList: choiceList, index: choiceIndex } = this.resolvePath(targetPathStr);
      const choice = choiceList[choiceIndex];
      if (choice) {
        if (!choice.nodes) choice.nodes = [];
        choice.nodes.push(sourceNodeCopy);
      }
    } else if (position === "child") {
      const targetNode = this.getNodeByPath(targetPathStr);
      if (!targetNode) return;

      if (targetNode.type === "conditional") {
        if (!targetNode.trueNodes) targetNode.trueNodes = [];
        targetNode.trueNodes.push(sourceNodeCopy);
      } else {
        if (!targetNode.choices) targetNode.choices = [];
        if (targetNode.choices.length === 0) {
          targetNode.choices.push({ text: "Continue", nodes: [] });
        }
        const choice = targetNode.choices[0];
        if (!choice.nodes) choice.nodes = [];
        choice.nodes.push(sourceNodeCopy);
      }
    } else {
      // Re-resolve target path since removing sourceNode might have altered indices in the same array
      const { parentList: tgtList, index: tgtIndex } = this.resolvePath(targetPathStr);
      let insertIndex = position === "before" ? tgtIndex : tgtIndex + 1;
      // Clamp index within target list bounds
      insertIndex = Math.max(0, Math.min(insertIndex, tgtList.length));
      tgtList.splice(insertIndex, 0, sourceNodeCopy);
    }

    this.selectedNodeId = null;
    this.renderNodeList();
    this.engine.loadStory(this.currentStory);
    this.triggerLocalStorageSave();
  }

  // Create a child node under a specific node path (appending after existing children)
  createChildNode(parentPathStr) {
    this.saveNodeFromForm();

    const node = this.getNodeByPath(parentPathStr);
    if (!node) return;

    const newNode = {
      sender: "astro",
      text: "New branch message content.",
      delay: 500
    };

    let newPath;
    if (node.type === "conditional") {
      if (!node.trueNodes) {
        node.trueNodes = [];
      }
      const newIndex = node.trueNodes.length;
      node.trueNodes.push(newNode);
      newPath = `${parentPathStr},trueNodes,${newIndex}`;
    } else {
      if (!node.choices) {
        node.choices = [];
      }
      if (node.choices.length === 0) {
        node.choices.push({
          text: "Continue",
          nodes: []
        });
      }
      const choice = node.choices[0];
      if (!choice.nodes) {
        choice.nodes = [];
      }
      const newIndex = choice.nodes.length;
      choice.nodes.push(newNode);
      newPath = `${parentPathStr},choices,0,nodes,${newIndex}`;
    }

    this.renderNodeList();
    this.selectNode(newPath);
    this.engine.loadStory(this.currentStory);
    this.triggerLocalStorageSave();
  }

  // Create a new top-level node at the end of the root nodes list
  createTopLevelNode() {
    this.saveNodeFromForm();

    const newNode = {
      sender: "system",
      text: "New dialogue node.",
      delay: 500
    };

    if (!this.currentStory.nodes) {
      this.currentStory.nodes = [];
    }

    this.currentStory.nodes.push(newNode);
    const newIndex = this.currentStory.nodes.length - 1;
    const newPath = String(newIndex);

    this.renderNodeList();
    this.selectNode(newPath);
    this.engine.loadStory(this.currentStory);
    this.triggerLocalStorageSave();
  }

  // Create a new blank dialogue node (as a child if a node is selected, else at root level)
  createNewNode() {
    if (this.selectedNodeId) {
      this.createChildNode(this.selectedNodeId);
    } else {
      this.createTopLevelNode();
    }
  }

  // Delete the currently selected node
  deleteCurrentNode() {
    if (!this.selectedNodeId) return;

    if (confirm(`Are you sure you want to delete this node from the tree?`)) {
      const { parentList, index } = this.resolvePath(this.selectedNodeId);
      parentList.splice(index, 1);

      this.selectedNodeId = null;
      this.renderNodeList();
      
      // Select another node
      if (this.currentStory.nodes.length > 0) {
        this.selectNode("0");
      } else {
        this.editFormContainer.innerHTML = `<span class="empty-vars">No nodes in story. Click "+ New" in sidebar.</span>`;
      }
      
      this.engine.loadStory(this.currentStory);
      this.triggerLocalStorageSave();
    }
  }

  saveVariablesFromForm() {
    const newVars = {};
    document.querySelectorAll(".var-config-row").forEach(row => {
      const k = row.querySelector(".var-key-input").value.trim();
      const v = parseInt(row.querySelector(".var-val-input").value) || 0;
      if (k) newVars[k] = v;
    });
    this.currentStory.variables = newVars;
    this.engine.loadStory(this.currentStory);
    if (this.selectedNodeId) {
      // Re-render the form to update any variable selection dropdowns dynamically
      this.selectNode(this.selectedNodeId);
    }
  }

  renderVariablesList() {
    const list = document.getElementById("variables-config-list");
    if (!list) return;
    list.innerHTML = "";

    const vars = this.currentStory.variables || {};
    Object.keys(vars).forEach(key => {
      const row = document.createElement("div");
      row.className = "var-config-row";
      row.innerHTML = `
        <input type="text" class="var-key-input" placeholder="variable" value="${key}">
        <input type="number" class="var-val-input" placeholder="value" value="${vars[key]}">
        <button type="button" class="btn btn-danger btn-xs btn-del-var">✖</button>
      `;

      row.querySelectorAll("input").forEach(input => {
        input.addEventListener("input", () => this.saveVariablesFromForm());
        input.addEventListener("change", () => {
          this.saveVariablesFromForm();
          this.triggerLocalStorageSave();
        });
      });

      row.querySelector(".btn-del-var").addEventListener("click", () => {
        row.remove();
        this.saveVariablesFromForm();
        this.triggerLocalStorageSave();
      });
      list.appendChild(row);
    });

    // Add button
    const btnAdd = document.getElementById("btn-add-var");
    if (btnAdd) {
      const newBtn = btnAdd.cloneNode(true);
      btnAdd.parentNode.replaceChild(newBtn, btnAdd);
      newBtn.addEventListener("click", () => {
        const row = document.createElement("div");
        row.className = "var-config-row";
        row.innerHTML = `
          <input type="text" class="var-key-input" placeholder="variable" value="new_var">
          <input type="number" class="var-val-input" placeholder="value" value="0">
          <button type="button" class="btn btn-danger btn-xs btn-del-var">✖</button>
        `;
        row.querySelectorAll("input").forEach(input => {
          input.addEventListener("input", () => this.saveVariablesFromForm());
          input.addEventListener("change", () => {
            this.saveVariablesFromForm();
            this.triggerLocalStorageSave();
          });
        });
        row.querySelector(".btn-del-var").addEventListener("click", () => {
          row.remove();
          this.saveVariablesFromForm();
          this.triggerLocalStorageSave();
        });
        list.appendChild(row);
        this.saveVariablesFromForm();
        this.triggerLocalStorageSave();
      });
    }
  }

  saveCharactersFromForm(showAlert = false) {
    const updatedCharacters = {};
    const idMap = {};

    document.querySelectorAll(".char-config-row").forEach(row => {
      const oldId = row.dataset.oldId;
      const newId = row.querySelector(".char-id-input").value.trim();
      const name = row.querySelector(".char-name-input").value.trim();
      const color = row.querySelector(".char-color-input").value;
      const avatar = row.querySelector(".char-avatar-input").value.trim();
      const isPlayer = row.querySelector(".char-player-check").checked;

      if (newId) {
        updatedCharacters[newId] = {
          name: name,
          avatarColor: color,
          avatarText: avatar,
          isPlayer: isPlayer
        };

        if (oldId && oldId !== newId) {
          idMap[oldId] = newId;
          row.dataset.oldId = newId;
        }
      }
    });

    this.currentStory.characters = updatedCharacters;

    // Cascade ID changes to all nodes in the story
    if (Object.keys(idMap).length > 0) {
      const updateNodeRefs = (list) => {
        if (!list) return;
        list.forEach(node => {
          if (idMap[node.sender]) {
            node.sender = idMap[node.sender];
          }
          if (node.choices) {
            node.choices.forEach(choice => {
              if (idMap[choice.chat]) {
                choice.chat = idMap[choice.chat];
              }
              if (choice.nodes) {
                updateNodeRefs(choice.nodes);
              }
            });
          }
          if (node.trueNodes) {
            updateNodeRefs(node.trueNodes);
          }
          if (node.falseNodes) {
            updateNodeRefs(node.falseNodes);
          }
        });
      };
      updateNodeRefs(this.currentStory.nodes);
    }

    this.engine.loadStory(this.currentStory);
    if (showAlert) {
      alert("Characters saved!");
    }
    this.renderNodeList();
    if (this.selectedNodeId) {
      // Re-render the form to update any character select/dropdowns dynamically
      this.selectNode(this.selectedNodeId);
    }
  }

  renderCharactersList() {
    const list = document.getElementById("characters-config-list");
    if (!list) return;
    list.innerHTML = "";

    const chars = this.currentStory.characters || {};
    Object.keys(chars).forEach(key => {
      const char = chars[key];
      const row = document.createElement("div");
      row.className = "char-config-row";
      row.dataset.oldId = key;
      row.innerHTML = `
        <div class="char-keys-inputs">
          <input type="text" class="char-id-input" placeholder="ID" value="${key}">
          <input type="text" class="char-name-input" placeholder="Display Name" value="${char.name}">
        </div>
        <div class="char-visuals-inputs">
          <input type="color" class="char-color-input" value="${char.avatarColor || '#6b7280'}">
          <input type="text" class="char-avatar-input" placeholder="Avatar" value="${char.avatarText || 'A'}">
          <label class="player-checkbox">
            <input type="checkbox" class="char-player-check" ${char.isPlayer ? 'checked' : ''}> Is Player
          </label>
          <button type="button" class="btn btn-danger btn-xs btn-del-char">✖</button>
        </div>
      `;

      // Automatically save character fields whenever they change
      row.querySelectorAll("input").forEach(input => {
        input.addEventListener("input", () => this.saveCharactersFromForm(false));
        input.addEventListener("change", () => {
          this.saveCharactersFromForm(false);
          this.triggerLocalStorageSave();
        });
      });

      row.querySelector(".btn-del-char").addEventListener("click", () => {
        if (confirm(`Remove character "${key}"?`)) {
          row.remove();
          this.saveCharactersFromForm(false);
          this.triggerLocalStorageSave();
        }
      });
      list.appendChild(row);
    });

    // Add character button
    const btnAdd = document.getElementById("btn-add-char");
    if (btnAdd) {
      const newBtn = btnAdd.cloneNode(true);
      btnAdd.parentNode.replaceChild(newBtn, btnAdd);
      newBtn.addEventListener("click", () => {
        let baseKey = "char";
        let index = 1;
        while (this.currentStory.characters[`${baseKey}_${index}`]) {
          index++;
        }
        const newCharKey = `${baseKey}_${index}`;
        
        this.currentStory.characters[newCharKey] = {
          name: "New Character",
          avatarColor: "#3b82f6",
          avatarText: "NC",
          isPlayer: false
        };

        this.renderCharactersList();
        this.saveCharactersFromForm(false);
        this.triggerLocalStorageSave();
      });
    }

    // Save character mappings
    const btnSaveChars = document.getElementById("btn-save-chars");
    if (btnSaveChars) {
      const newBtn = btnSaveChars.cloneNode(true);
      btnSaveChars.parentNode.replaceChild(newBtn, btnSaveChars);
      newBtn.addEventListener("click", () => {
        this.saveCharactersFromForm(true);
        this.triggerLocalStorageSave();
      });
    }
  }

  exportJSON() {
    this.saveNodeFromForm();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.currentStory, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `${this.currentStory.title.toLowerCase().replace(/\s+/g, '_')}_story.json`);
    dlAnchorElem.click();
  }

  importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.title || !parsed.nodes || !Array.isArray(parsed.nodes)) {
          throw new Error("Invalid Story JSON schema. Must have title and a nodes array.");
        }
        
        this.init(parsed);
        this.engine.loadStory(parsed);
        alert(`Successfully imported tree story: ${parsed.title}`);
        this.triggerLocalStorageSave();
      } catch (err) {
        alert("Failed to parse tree story JSON: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  triggerLocalStorageSave() {
    if (window.appCoordinator && typeof window.appCoordinator.saveStoriesToLocalStorage === 'function') {
      window.appCoordinator.saveStoriesToLocalStorage();
    }
  }
}
