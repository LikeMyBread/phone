/**
 * Dialogue Tree Story Editor
 * Manages tree traversal, node configurations, recursive lists rendering, and JSON uploads.
 */

import { defaultStories } from './stories.js';

export class StoryEditor {
  constructor(engine) {
    this.engine = engine;
    this.currentStory = null;
    this.stories = null;
    this.selectedNodeId = null; // Stored as path string, e.g. "0" or "0,choices,1,nodes,2"

    // UI Cache Elements
    this.nodeListContainer = null;
    this.editFormContainer = null;
    this.storySelect = null;

    this.init = this.init.bind(this);
    this.setStories = this.setStories.bind(this);
    this.renderNodeList = this.renderNodeList.bind(this);
    this.selectNode = this.selectNode.bind(this);
    this.saveNodeFromForm = this.saveNodeFromForm.bind(this);
    this.saveCharactersFromForm = this.saveCharactersFromForm.bind(this);
    this.saveVariablesFromForm = this.saveVariablesFromForm.bind(this);
    this.renderKnowledgeMatrix = this.renderKnowledgeMatrix.bind(this);
    this.syncKnowledgeMatrixDimensions = this.syncKnowledgeMatrixDimensions.bind(this);
    this.addFact = this.addFact.bind(this);
    this.deleteFact = this.deleteFact.bind(this);
    this.renameFact = this.renameFact.bind(this);
    this.createNewNode = this.createNewNode.bind(this);
    this.createChildNode = this.createChildNode.bind(this);
    this.createTopLevelNode = this.createTopLevelNode.bind(this);
    this.insertNodeAfter = this.insertNodeAfter.bind(this);
    this.moveNode = this.moveNode.bind(this);
    this.deleteCurrentNode = this.deleteCurrentNode.bind(this);
    this.exportJSON = this.exportJSON.bind(this);
    this.importJSON = this.importJSON.bind(this);
    this.triggerLocalStorageSave = this.triggerLocalStorageSave.bind(this);
  }

  init(storyData) {
    this.currentStory = JSON.parse(JSON.stringify(storyData));
    if (!Array.isArray(this.currentStory.facts)) {
      this.currentStory.facts = [];
    }
    
    this.nodeListContainer = document.getElementById("node-list");
    this.editFormContainer = document.getElementById("node-form-container");
    this.storySelect = document.getElementById("story-select");

    if (this.editFormContainer) {
      this.editFormContainer.addEventListener("input", () => {
        this.saveNodeFromForm();
      });
      this.editFormContainer.addEventListener("change", () => {
        this.saveNodeFromForm();
        this.triggerLocalStorageSave();
      });
    }

    this.renderNodeList();
    this.renderCharactersList();
    this.renderVariablesList();
    this.syncKnowledgeMatrixDimensions();
    this.renderKnowledgeMatrix();

    // Select first root node
    if (this.currentStory.nodes && this.currentStory.nodes.length > 0) {
      this.selectNode("0");
    }
  }

  // Update editor's context of all available stories
  setStories(stories) {
    this.stories = stories;
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

  // Recursive Tree Rendering with Full Inline Editable Node Cards
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
        nodeDiv.style.marginLeft = `${depth * 20}px`;
        nodeDiv.dataset.path = pathStr;
        nodeDiv.draggable = true;

        // Drag and Drop Event Handlers
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
          if (pathStr.startsWith(draggedPath + ",")) return;

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

        nodeDiv.addEventListener("click", () => this.selectNode(pathStr));

        // 1. Node Card Header
        const headerDiv = document.createElement("div");
        headerDiv.className = "node-card-header";

        const leftHead = document.createElement("div");
        leftHead.className = "node-header-left";
        leftHead.innerHTML = `
          <span class="drag-handle" title="Drag to reorder or nest">⋮⋮</span>
          <span class="node-path-badge">Node #${pathStr}</span>
        `;

        const typeSelect = document.createElement("select");
        typeSelect.className = "node-type-select";
        typeSelect.innerHTML = `
          <option value="normal" ${node.type !== 'conditional' ? 'selected' : ''}>💬 Dialogue</option>
          <option value="conditional" ${node.type === 'conditional' ? 'selected' : ''}>⚡ Conditional</option>
        `;
        typeSelect.addEventListener("change", (e) => {
          e.stopPropagation();
          const val = e.target.value;
          if (val === "conditional") {
            node.type = "conditional";
            node.variable = node.variable || "";
            node.operator = node.operator || "==";
            node.value = node.value !== undefined ? node.value : 0;
            node.trueNodes = node.trueNodes || [];
            node.falseNodes = node.falseNodes || [];
          } else {
            node.type = "normal";
            node.sender = node.sender || "system";
            node.text = node.text || "";
            node.delay = node.delay !== undefined ? node.delay : 500;
            node.choices = node.choices || [];
          }
          this.renderNodeList();
          this.engine.loadStory(this.currentStory);
          this.triggerLocalStorageSave();
        });

        const rightHead = document.createElement("div");
        rightHead.className = "node-header-right";

        const btnPlay = document.createElement("button");
        btnPlay.type = "button";
        btnPlay.className = "btn btn-accent btn-xs";
        btnPlay.title = "Play from here";
        btnPlay.innerHTML = "▶ Play";
        btnPlay.addEventListener("click", (e) => {
          e.stopPropagation();
          this.engine.loadStory(this.currentStory);
          this.engine.advanceToPath(pathStr);
          if (window.appCoordinator) {
            window.appCoordinator.switchViewMode("play");
          }
        });

        const btnDelete = document.createElement("button");
        btnDelete.type = "button";
        btnDelete.className = "btn btn-danger btn-xs";
        btnDelete.title = "Delete node";
        btnDelete.innerHTML = "🗑";
        btnDelete.addEventListener("click", (e) => {
          e.stopPropagation();
          if (confirm(`Delete node #${pathStr}?`)) {
            const { parentList, index } = this.resolvePath(pathStr);
            parentList.splice(index, 1);
            this.selectedNodeId = null;
            this.renderNodeList();
            this.engine.loadStory(this.currentStory);
            this.triggerLocalStorageSave();
          }
        });

        rightHead.appendChild(typeSelect);
        rightHead.appendChild(btnPlay);
        rightHead.appendChild(btnDelete);

        headerDiv.appendChild(leftHead);
        headerDiv.appendChild(rightHead);
        nodeDiv.appendChild(headerDiv);

        // 2. Node Card Body Inputs
        const bodyDiv = document.createElement("div");
        bodyDiv.className = "node-card-body";

        if (node.type === "conditional") {
          const condRow = document.createElement("div");
          condRow.className = "node-card-row cond-row";
          const isKnowledge = node.conditionType === "knowledge" || Boolean(node.fact && (node.character || node.sender));
          const charKeys = Object.keys(this.currentStory.characters || {});
          const facts = this.currentStory.facts || [];

          condRow.innerHTML = `
            <div class="field-group" style="width: 145px;">
              <label>Condition Type</label>
              <select class="cond-type-select">
                <option value="variable" ${!isKnowledge ? 'selected' : ''}>Variable Check</option>
                <option value="knowledge" ${isKnowledge ? 'selected' : ''}>Character Knowledge</option>
              </select>
            </div>
            <div class="cond-fields-wrapper" style="flex: 1; display: flex; gap: 8px;">
              ${isKnowledge ? `
                <div class="field-group" style="flex: 1;">
                  <label>Character</label>
                  <select class="cond-char-select">
                    ${charKeys.map(ck => `<option value="${ck}" ${(node.character === ck || (!node.character && ck === 'player')) ? 'selected' : ''}>${this.currentStory.characters[ck].name} (${ck})</option>`).join('')}
                  </select>
                </div>
                <div class="field-group" style="flex: 1;">
                  <label>Fact</label>
                  <select class="cond-fact-select">
                    ${facts.length === 0 ? '<option value="">[No facts created yet]</option>' : facts.map(f => `<option value="${f}" ${node.fact === f ? 'selected' : ''}>${f}</option>`).join('')}
                  </select>
                </div>
                <div class="field-group" style="width: 130px;">
                  <label>State</label>
                  <select class="cond-knows-select">
                    <option value="true" ${node.knows !== false ? 'selected' : ''}>Knows (True)</option>
                    <option value="false" ${node.knows === false ? 'selected' : ''}>Doesn't Know (False)</option>
                  </select>
                </div>
              ` : `
                <div class="field-group" style="flex: 1;">
                  <label>If Variable</label>
                  <input type="text" class="cond-var-input" placeholder="variable" value="${node.variable || ''}">
                </div>
                <div class="field-group" style="width: 80px;">
                  <label>Check</label>
                  <select class="cond-op-select">
                    <option value="==" ${(node.operator === '==') ? 'selected' : ''}>==</option>
                    <option value="!=" ${(node.operator === '!=') ? 'selected' : ''}>!=</option>
                    <option value=">" ${(node.operator === '>') ? 'selected' : ''}>&gt;</option>
                    <option value=">=" ${(node.operator === '>=') ? 'selected' : ''}>&gt;=</option>
                    <option value="<" ${(node.operator === '<') ? 'selected' : ''}>&lt;</option>
                    <option value="<=" ${(node.operator === '<=') ? 'selected' : ''}>&lt;=</option>
                  </select>
                </div>
                <div class="field-group" style="width: 80px;">
                  <label>Value</label>
                  <input type="number" class="cond-val-input" value="${node.value !== undefined ? node.value : 0}">
                </div>
              `}
            </div>
          `;

          const typeSelect = condRow.querySelector(".cond-type-select");
          typeSelect.addEventListener("change", () => {
            if (typeSelect.value === "knowledge") {
              node.conditionType = "knowledge";
              node.character = charKeys[0] || "player";
              node.fact = facts[0] || "";
              node.knows = true;
              delete node.variable;
              delete node.operator;
            } else {
              node.conditionType = "variable";
              node.variable = "new_var";
              node.operator = "==";
              node.value = 1;
              delete node.character;
              delete node.fact;
              delete node.knows;
            }
            this.renderNodeList();
            this.engine.loadStory(this.currentStory);
            this.triggerLocalStorageSave();
          });

          if (isKnowledge) {
            const charSelect = condRow.querySelector(".cond-char-select");
            const factSelect = condRow.querySelector(".cond-fact-select");
            const knowsSelect = condRow.querySelector(".cond-knows-select");

            const saveKnowledgeCond = () => {
              node.conditionType = "knowledge";
              node.character = charSelect ? charSelect.value : "";
              node.fact = factSelect ? factSelect.value : "";
              node.knows = knowsSelect ? (knowsSelect.value === "true") : true;
              this.engine.loadStory(this.currentStory);
              this.triggerLocalStorageSave();
            };

            [charSelect, factSelect, knowsSelect].filter(Boolean).forEach(el => {
              el.addEventListener("change", saveKnowledgeCond);
            });
          } else {
            const varInput = condRow.querySelector(".cond-var-input");
            const opSelect = condRow.querySelector(".cond-op-select");
            const valInput = condRow.querySelector(".cond-val-input");

            const saveVarCond = () => {
              node.conditionType = "variable";
              node.variable = varInput.value.trim();
              node.operator = opSelect.value;
              node.value = parseInt(valInput.value) || 0;
              this.engine.loadStory(this.currentStory);
              this.triggerLocalStorageSave();
            };

            [varInput, opSelect, valInput].forEach(el => {
              el.addEventListener("input", saveVarCond);
              el.addEventListener("change", saveVarCond);
            });
          }

          bodyDiv.appendChild(condRow);
        } else {
          const metaRow = document.createElement("div");
          metaRow.className = "node-card-row two-cols";

          const charOptionsHtml = Object.keys(this.currentStory.characters || {}).map(charKey => `
            <option value="${charKey}" ${node.sender === charKey ? 'selected' : ''}>
              ${this.currentStory.characters[charKey].name} (${charKey})
            </option>
          `).join('');

          metaRow.innerHTML = `
            <div class="field-group" style="flex: 1;">
              <label>Sender / Character</label>
              <select class="node-sender-select">
                <option value="system" ${node.sender === 'system' ? 'selected' : ''}>[System Message]</option>
                ${charOptionsHtml}
              </select>
            </div>
            <div class="field-group" style="width: 140px;">
              <label>Delay (ms)</label>
              <input type="number" class="node-delay-input" min="0" value="${node.delay !== undefined ? node.delay : 500}">
            </div>
          `;

          const senderSelect = metaRow.querySelector(".node-sender-select");
          const delayInput = metaRow.querySelector(".node-delay-input");

          const saveMeta = () => {
            node.sender = senderSelect.value;
            node.delay = parseInt(delayInput.value) || 0;
            this.engine.loadStory(this.currentStory);
            this.triggerLocalStorageSave();
          };

          senderSelect.addEventListener("change", saveMeta);
          delayInput.addEventListener("input", saveMeta);
          delayInput.addEventListener("change", saveMeta);

          bodyDiv.appendChild(metaRow);

          const textRow = document.createElement("div");
          textRow.className = "node-card-row";
          textRow.style.flexDirection = "column";
          textRow.style.alignItems = "stretch";
          textRow.innerHTML = `
            <label>Message Content</label>
            <textarea class="node-text-input" rows="2" placeholder="Enter message content...">${node.text || ''}</textarea>
          `;

          const textInput = textRow.querySelector(".node-text-input");
          const saveText = () => {
            node.text = textInput.value;
            this.engine.loadStory(this.currentStory);
            this.triggerLocalStorageSave();
          };
          textInput.addEventListener("input", saveText);
          textInput.addEventListener("change", saveText);

          bodyDiv.appendChild(textRow);

          if (node.choices && node.choices.length > 0) {
            const choicesHead = document.createElement("div");
            choicesHead.className = "choices-head-row";
            choicesHead.innerHTML = `
              <span class="choices-title">Player Branching Choices</span>
            `;
            bodyDiv.appendChild(choicesHead);
          }
        }

        nodeDiv.appendChild(bodyDiv);

        // 3. Node Card Footer Actions
        const footerDiv = document.createElement("div");
        footerDiv.className = "node-card-footer";

        const btnAddChildNode = document.createElement("button");
        btnAddChildNode.type = "button";
        btnAddChildNode.className = "btn-node-add-action btn-node-add-child";
        btnAddChildNode.innerHTML = "+ Add Child Node";
        btnAddChildNode.addEventListener("click", (e) => {
          e.stopPropagation();
          this.createChildNode(pathStr);
        });

        const btnInsertNodeBelow = document.createElement("button");
        btnInsertNodeBelow.type = "button";
        btnInsertNodeBelow.className = "btn-node-add-action btn-node-insert-below";
        btnInsertNodeBelow.innerHTML = "+ Insert Node Below";
        btnInsertNodeBelow.addEventListener("click", (e) => {
          e.stopPropagation();
          this.insertNodeAfter(pathStr);
        });

        footerDiv.appendChild(btnAddChildNode);
        footerDiv.appendChild(btnInsertNodeBelow);

        if (node.type !== "conditional") {
          const btnAddChoiceOpt = document.createElement("button");
          btnAddChoiceOpt.type = "button";
          btnAddChoiceOpt.className = "btn-node-add-action btn-node-add-option";
          btnAddChoiceOpt.innerHTML = "+ Option";
          btnAddChoiceOpt.addEventListener("click", (e) => {
            e.stopPropagation();
            if (!node.choices) node.choices = [];
            node.choices.push({ text: "New Option", nodes: [] });
            this.renderNodeList();
            this.engine.loadStory(this.currentStory);
            this.triggerLocalStorageSave();
          });
          footerDiv.appendChild(btnAddChoiceOpt);
        }

        nodeDiv.appendChild(footerDiv);

        this.nodeListContainer.appendChild(nodeDiv);

        // Process Choices
        if (node.choices && node.choices.length > 0) {
          node.choices.forEach((choice, choiceIdx) => {
            const choiceDiv = document.createElement("div");
            choiceDiv.className = "node-choice-sidebar-item";
            choiceDiv.style.marginLeft = `${(depth + 1) * 20}px`;

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

            let actKey = "";
            let actVal = "";
            if (choice.actions && Object.keys(choice.actions).length > 0) {
              actKey = Object.keys(choice.actions)[0];
              actVal = choice.actions[actKey];
            }

            let learnChar = "";
            let learnFact = "";
            if (choice.learn) {
              if (typeof choice.learn === "string") {
                learnFact = choice.learn;
              } else if (typeof choice.learn === "object") {
                learnChar = choice.learn.character || "";
                learnFact = choice.learn.fact || "";
              }
            }

            const varKeys = Object.keys(this.currentStory.variables || {});
            const charKeys = Object.keys(this.currentStory.characters || {});
            const facts = this.currentStory.facts || [];

            choiceDiv.innerHTML = `
              <div class="choice-card-inner">
                <div class="choice-text-row">
                  <span class="choice-bullet">↳</span>
                  <div class="choice-input-wrapper">
                    <label class="choice-input-label">Choice Text (Player Option)</label>
                    <input type="text" class="choice-text-input" placeholder="Choice option text (what player clicks)..." value="${choice.text || ''}">
                  </div>
                </div>
                <div class="choice-options-row">
                  <div class="choice-option-group">
                    <label>In Chat:</label>
                    <select class="choice-chat-select" title="Target chat conversation" style="width: 120px;">
                      <option value="" ${!choice.chat ? 'selected' : ''}>[Current Chat]</option>
                      ${charKeys.map(ck => `<option value="${ck}" ${choice.chat === ck ? 'selected' : ''}>${this.currentStory.characters[ck].name}</option>`).join('')}
                    </select>
                  </div>
                  <div class="choice-option-group choice-learn-group" title="Teach a fact to a character in Knowledge Matrix">
                    <label class="choice-learn-label">Teaches Fact:</label>
                    <select class="choice-learn-char" style="width: 105px;" title="Character who learns this fact">
                      <option value="" ${!learnChar ? 'selected' : ''}>[Chat Contact]</option>
                      ${charKeys.map(ck => `<option value="${ck}" ${learnChar === ck ? 'selected' : ''}>${this.currentStory.characters[ck].name}</option>`).join('')}
                    </select>
                    <select class="choice-learn-fact" style="width: 110px;" title="Fact to learn">
                      <option value="" ${!learnFact ? 'selected' : ''}>[None]</option>
                      ${facts.map(f => `<option value="${f}" ${learnFact === f ? 'selected' : ''}>${f}</option>`).join('')}
                    </select>
                  </div>
                  <div class="choice-option-group">
                    <label>Effect:</label>
                    <select class="choice-act-key" title="Effect variable" style="width: 95px;">
                      <option value="" ${!actKey ? 'selected' : ''}>[No Effect]</option>
                      ${varKeys.map(vk => `<option value="${vk}" ${actKey === vk ? 'selected' : ''}>${vk}</option>`).join('')}
                    </select>
                    <input type="number" class="choice-act-val" placeholder="+val" value="${actVal !== undefined ? actVal : ''}" style="width: 55px;" title="Effect amount">
                  </div>
                  <div class="choice-actions-group">
                    <button type="button" class="btn btn-secondary btn-xs btn-add-choice-child" title="Add child node to this choice">+ Child Node</button>
                    <button type="button" class="btn btn-danger btn-xs btn-del-choice" title="Delete choice">✖</button>
                  </div>
                </div>
              </div>
            `;

            const chTextInput = choiceDiv.querySelector(".choice-text-input");
            const chChatSelect = choiceDiv.querySelector(".choice-chat-select");
            const chLearnChar = choiceDiv.querySelector(".choice-learn-char");
            const chLearnFact = choiceDiv.querySelector(".choice-learn-fact");
            const chActKey = choiceDiv.querySelector(".choice-act-key");
            const chActVal = choiceDiv.querySelector(".choice-act-val");

            const saveChoice = () => {
              choice.text = chTextInput.value;
              if (chChatSelect.value) {
                choice.chat = chChatSelect.value;
              } else {
                delete choice.chat;
              }

              const lChar = chLearnChar.value;
              const lFact = chLearnFact.value;
              if (lFact) {
                choice.learn = lChar ? { character: lChar, fact: lFact } : { fact: lFact };
              } else {
                delete choice.learn;
              }

              const k = chActKey.value;
              const v = parseInt(chActVal.value);
              if (k && !isNaN(v)) {
                choice.actions = { [k]: v };
              } else {
                delete choice.actions;
              }
              this.engine.loadStory(this.currentStory);
              this.triggerLocalStorageSave();
            };

            [chTextInput, chChatSelect, chLearnChar, chLearnFact, chActKey, chActVal].forEach(el => {
              el.addEventListener("input", saveChoice);
              el.addEventListener("change", saveChoice);
            });

            choiceDiv.querySelector(".btn-del-choice").addEventListener("click", (e) => {
              e.stopPropagation();
              node.choices.splice(choiceIdx, 1);
              this.renderNodeList();
              this.engine.loadStory(this.currentStory);
              this.triggerLocalStorageSave();
            });

            choiceDiv.querySelector(".btn-add-choice-child").addEventListener("click", (e) => {
              e.stopPropagation();
              this.addChildNodeToChoice(pathStr, choiceIdx);
            });

            this.nodeListContainer.appendChild(choiceDiv);

            if (choice.nodes && choice.nodes.length > 0) {
              traverse(choice.nodes, depth + 2, [...currentPath, "choices", choiceIdx, "nodes"]);
            }
          });
        }

        // Process Condition true/false sub-lists
        if (node.type === "conditional") {
          const trueHeader = document.createElement("div");
          trueHeader.className = "node-choice-sidebar-item cond-header-label";
          trueHeader.style.marginLeft = `${(depth + 1) * 20}px`;
          trueHeader.innerHTML = `
            <span style="color: var(--color-success); font-weight: 600;">✔ True Branch:</span>
            <button type="button" class="btn btn-secondary btn-xs btn-add-true-child" style="margin-left: 8px;">+ Node</button>
          `;
          trueHeader.querySelector(".btn-add-true-child").addEventListener("click", (e) => {
            e.stopPropagation();
            this.addNodeToConditionalBranch(pathStr, "trueNodes");
          });
          this.nodeListContainer.appendChild(trueHeader);
          if (node.trueNodes && node.trueNodes.length > 0) {
            traverse(node.trueNodes, depth + 2, [...currentPath, "trueNodes"]);
          }

          const falseHeader = document.createElement("div");
          falseHeader.className = "node-choice-sidebar-item cond-header-label";
          falseHeader.style.marginLeft = `${(depth + 1) * 20}px`;
          falseHeader.innerHTML = `
            <span style="color: var(--color-danger); font-weight: 600;">✖ False Branch:</span>
            <button type="button" class="btn btn-secondary btn-xs btn-add-false-child" style="margin-left: 8px;">+ Node</button>
          `;
          falseHeader.querySelector(".btn-add-false-child").addEventListener("click", (e) => {
            e.stopPropagation();
            this.addNodeToConditionalBranch(pathStr, "falseNodes");
          });
          this.nodeListContainer.appendChild(falseHeader);
          if (node.falseNodes && node.falseNodes.length > 0) {
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

  // Load / highlight a single node
  selectNode(pathStr, autoScroll = false) {
    this.selectedNodeId = pathStr;
    const node = this.getNodeByPath(pathStr);
    if (!node) return;

    document.querySelectorAll(".node-item").forEach(item => {
      item.classList.toggle("active", item.dataset.path === pathStr);
    });

    if (autoScroll) {
      const targetEl = document.querySelector(`.node-item[data-path='${pathStr}']`);
      if (targetEl && typeof targetEl.scrollIntoView === 'function') {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }

  saveNodeFromForm() {
    if (this.currentStory) {
      this.engine.loadStory(this.currentStory);
    }
  }

  // Insert a new sibling node directly after pathStr
  insertNodeAfter(pathStr) {
    this.saveNodeFromForm();

    const { parentList, index } = this.resolvePath(pathStr);
    const newNode = {
      sender: "astro",
      text: "New dialogue node content.",
      delay: 500
    };

    parentList.splice(index + 1, 0, newNode);

    const parts = pathStr.split(",");
    parts[parts.length - 1] = index + 1;
    const newPath = parts.join(",");

    this.renderNodeList();
    this.selectNode(newPath);
    this.engine.loadStory(this.currentStory);
    this.triggerLocalStorageSave();
  }

  // Appends a child dialogue node directly under a choice array in-place
  addChildNodeToChoice(parentPathStr, choiceIndex) {
    const node = this.getNodeByPath(parentPathStr);
    if (!node) return;

    if (!node.choices) node.choices = [];
    if (!node.choices[choiceIndex]) {
      node.choices[choiceIndex] = { text: "Option", nodes: [] };
    }
    const choice = node.choices[choiceIndex];
    if (!choice.nodes) choice.nodes = [];

    const newIndex = choice.nodes.length;
    choice.nodes.push({
      sender: "astro",
      text: "New branch message content.",
      delay: 500
    });

    const targetPath = `${parentPathStr},choices,${choiceIndex},nodes,${newIndex}`;
    this.renderNodeList();
    this.selectNode(targetPath);
    this.engine.loadStory(this.currentStory);
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
    this.engine.loadStory(this.currentStory);
    this.triggerLocalStorageSave();
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
      this.selectNode(this.selectedNodeId, false);
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
      const visibleByDefault = row.querySelector(".char-visible-check").checked;

      if (newId) {
        updatedCharacters[newId] = {
          name: name,
          avatarColor: color,
          avatarText: avatar,
          isPlayer: isPlayer,
          visibleByDefault: visibleByDefault
        };

        if (oldId && oldId !== newId) {
          idMap[oldId] = newId;
          row.dataset.oldId = newId;
        }
      }
    });

    this.currentStory.characters = updatedCharacters;
    this.syncKnowledgeMatrixDimensions();
    this.renderKnowledgeMatrix();

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
      this.selectNode(this.selectedNodeId, false);
    }
  }

  renderCharactersList() {
    const list = document.getElementById("characters-config-list");
    if (!list) return;
    list.innerHTML = "";

    const chars = this.currentStory.characters || {};
    Object.keys(chars).forEach(key => {
      const char = chars[key];
      const isVisible = char.visibleByDefault !== false;
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
          <label class="visible-checkbox">
            <input type="checkbox" class="char-visible-check" ${isVisible ? 'checked' : ''}> Visible Default
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
          isPlayer: false,
          visibleByDefault: true
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

  // Synchronize 2D knowledge matrix dimensions with characters (rows) and facts (cols)
  syncKnowledgeMatrixDimensions() {
    if (!this.currentStory) return;
    if (!Array.isArray(this.currentStory.facts)) {
      this.currentStory.facts = [];
    }
    const charKeys = Object.keys(this.currentStory.characters || {});

    if (!Array.isArray(this.currentStory.knowledgeMatrix)) {
      this.currentStory.knowledgeMatrix = charKeys.map(() => this.currentStory.facts.map(() => false));
    } else {
      this.currentStory.knowledgeMatrix = charKeys.map((_, charIdx) => {
        const oldRow = Array.isArray(this.currentStory.knowledgeMatrix[charIdx]) ? this.currentStory.knowledgeMatrix[charIdx] : [];
        return this.currentStory.facts.map((_, factIdx) => Boolean(oldRow[factIdx]));
      });
    }
  }

  // Render 2D Knowledge Matrix interactive table
  renderKnowledgeMatrix() {
    const container = document.getElementById("knowledge-matrix-container");
    if (!container) return;
    container.innerHTML = "";

    this.syncKnowledgeMatrixDimensions();

    const facts = this.currentStory.facts || [];
    const chars = this.currentStory.characters || {};
    const charKeys = Object.keys(chars);

    if (facts.length === 0) {
      container.innerHTML = `
        <div class="matrix-empty-facts">
          No facts defined yet. Click <strong>"+ Add Fact"</strong> above to create facts for characters to know.
        </div>
      `;
    } else {
      const table = document.createElement("table");
      table.className = "knowledge-matrix-table";

      // Table Header
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");

      const charTh = document.createElement("th");
      charTh.className = "matrix-char-th";
      charTh.innerHTML = `<span>Character (${charKeys.length})</span>`;
      headerRow.appendChild(charTh);

      facts.forEach((factName, factIdx) => {
        const factTh = document.createElement("th");
        factTh.className = "matrix-fact-header";

        const innerDiv = document.createElement("div");
        innerDiv.className = "matrix-fact-header-inner";

        const factInput = document.createElement("input");
        factInput.type = "text";
        factInput.className = "matrix-fact-name-input";
        factInput.value = factName;
        factInput.title = "Click to edit fact name";
        factInput.addEventListener("change", (e) => {
          this.renameFact(factIdx, e.target.value.trim());
        });

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "matrix-fact-del-btn";
        delBtn.title = `Delete fact: ${factName}`;
        delBtn.innerHTML = "✖";
        delBtn.addEventListener("click", () => {
          this.deleteFact(factIdx);
        });

        innerDiv.appendChild(factInput);
        innerDiv.appendChild(delBtn);
        factTh.appendChild(innerDiv);
        headerRow.appendChild(factTh);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Table Body
      const tbody = document.createElement("tbody");
      charKeys.forEach((charKey, charIdx) => {
        const charObj = chars[charKey];
        const row = document.createElement("tr");

        const charTd = document.createElement("td");
        charTd.className = "matrix-char-cell";

        const wrapper = document.createElement("div");
        wrapper.className = "matrix-char-wrapper";

        const avatar = document.createElement("div");
        avatar.className = "matrix-char-avatar";
        avatar.style.backgroundColor = charObj.avatarColor || "#6b7280";
        avatar.textContent = charObj.avatarText || charKey.substring(0, 2).toUpperCase();

        const nameSpan = document.createElement("span");
        nameSpan.className = "matrix-char-name";
        nameSpan.textContent = charObj.name || charKey;

        wrapper.appendChild(avatar);
        wrapper.appendChild(nameSpan);
        if (charObj.isPlayer) {
          const playerTag = document.createElement("span");
          playerTag.className = "matrix-char-player-tag";
          playerTag.textContent = "ME";
          wrapper.appendChild(playerTag);
        }
        charTd.appendChild(wrapper);
        row.appendChild(charTd);

        // Checkboxes for each fact
        facts.forEach((_, factIdx) => {
          const cellTd = document.createElement("td");
          cellTd.className = "matrix-cell";

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = "matrix-checkbox";
          checkbox.title = `${charObj.name} knows "${facts[factIdx]}"`;
          checkbox.checked = Boolean(this.currentStory.knowledgeMatrix[charIdx] && this.currentStory.knowledgeMatrix[charIdx][factIdx]);

          checkbox.addEventListener("change", () => {
            if (!this.currentStory.knowledgeMatrix[charIdx]) {
              this.currentStory.knowledgeMatrix[charIdx] = [];
            }
            this.currentStory.knowledgeMatrix[charIdx][factIdx] = checkbox.checked;
            this.engine.loadStory(this.currentStory);
            this.triggerLocalStorageSave();
          });

          cellTd.appendChild(checkbox);
          row.appendChild(cellTd);
        });

        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      container.appendChild(table);
    }

    // Bind Add Fact Button
    const btnAddFact = document.getElementById("btn-add-fact");
    if (btnAddFact) {
      const newBtn = btnAddFact.cloneNode(true);
      btnAddFact.parentNode.replaceChild(newBtn, btnAddFact);
      newBtn.addEventListener("click", () => this.addFact());
    }
  }

  // Add a new fact to the knowledge matrix
  addFact(customName) {
    if (!this.currentStory.facts) {
      this.currentStory.facts = [];
    }
    const count = this.currentStory.facts.length + 1;
    const newName = customName || `fact_${count}`;
    this.currentStory.facts.push(newName);

    const charKeys = Object.keys(this.currentStory.characters || {});
    if (!Array.isArray(this.currentStory.knowledgeMatrix)) {
      this.currentStory.knowledgeMatrix = [];
    }
    charKeys.forEach((_, charIdx) => {
      if (!this.currentStory.knowledgeMatrix[charIdx]) {
        this.currentStory.knowledgeMatrix[charIdx] = [];
      }
      this.currentStory.knowledgeMatrix[charIdx].push(false);
    });

    this.renderKnowledgeMatrix();
    this.renderNodeList();
    this.engine.loadStory(this.currentStory);
    this.triggerLocalStorageSave();
  }

  // Delete a fact and its column in the knowledge matrix
  deleteFact(factIdx) {
    if (!this.currentStory.facts || factIdx < 0 || factIdx >= this.currentStory.facts.length) return;
    const factName = this.currentStory.facts[factIdx];
    if (confirm(`Delete fact "${factName}" from the Knowledge Matrix?`)) {
      this.currentStory.facts.splice(factIdx, 1);
      if (Array.isArray(this.currentStory.knowledgeMatrix)) {
        this.currentStory.knowledgeMatrix.forEach(row => {
          if (Array.isArray(row)) {
            row.splice(factIdx, 1);
          }
        });
      }
      this.renderKnowledgeMatrix();
      this.renderNodeList();
      this.engine.loadStory(this.currentStory);
      this.triggerLocalStorageSave();
    }
  }

  // Rename a fact and cascade changes to referencing nodes/choices
  renameFact(factIdx, newName) {
    if (!newName || !this.currentStory.facts || factIdx < 0 || factIdx >= this.currentStory.facts.length) return;
    const oldName = this.currentStory.facts[factIdx];
    if (oldName === newName) return;

    this.currentStory.facts[factIdx] = newName;

    // Cascade rename to choices and conditional nodes
    const updateFactRefs = (list) => {
      if (!list) return;
      list.forEach(node => {
        if (node.fact === oldName) node.fact = newName;
        if (node.choices) {
          node.choices.forEach(ch => {
            if (ch.learn) {
              if (typeof ch.learn === "string" && ch.learn === oldName) ch.learn = newName;
              else if (ch.learn.fact === oldName) ch.learn.fact = newName;
            }
            if (ch.nodes) updateFactRefs(ch.nodes);
          });
        }
        if (node.trueNodes) updateFactRefs(node.trueNodes);
        if (node.falseNodes) updateFactRefs(node.falseNodes);
      });
    };
    updateFactRefs(this.currentStory.nodes);

    this.renderKnowledgeMatrix();
    this.renderNodeList();
    this.engine.loadStory(this.currentStory);
    this.triggerLocalStorageSave();
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
        
        if (window.appCoordinator && typeof window.appCoordinator.importStory === 'function') {
          window.appCoordinator.importStory(parsed);
        } else {
          this.init(parsed);
          this.engine.loadStory(parsed);
          alert(`Successfully imported tree story: ${parsed.title}`);
          this.triggerLocalStorageSave();
        }
      } catch (err) {
        alert("Failed to parse tree story JSON: " + err.message);
      } finally {
        event.target.value = '';
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
