const DomUtils = {
  createElement: (tagName, options = {}) => {
    const element = document.createElement(tagName);

    if (options.classNames) {
      const classes = Array.isArray(options.classNames)
        ? options.classNames
        : [options.classNames];
      element.classList.add(...classes);
    }

    if (options.attributes) {
      Object.keys(options.attributes).forEach((key) => {
        element.setAttribute(key, options.attributes[key]);
      });
    }

    if (options.innerText) {
      element.innerText = options.innerText;
    }

    if (options.src) {
      element.src = options.src;
    }

    if (options.alt) {
      element.alt = options.alt;
    }

    return element;
  },

  addEvent: (element, eventType, handler, options) => {
    element.addEventListener(eventType, handler, options);
  },

  closestAncestor: (element, selector) => {
    return element.closest(selector);
  },

  getCleanedText: (element, defaultValue = "") => {
    return element ? element.innerText.trim() : defaultValue;
  },
};

const ChromeStorage = {
  get: (keys) => {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error retrieving data from storage:",
            chrome.runtime.lastError,
          );

          resolve({});
        } else {
          resolve(result);
        }
      });
    });
  },

  set: (items) => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(items, () => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error saving data to storage:",
            chrome.runtime.lastError,
          );

          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },
};

const ReactionModule = {
  CUSTOM_SAVE_BUTTON_CLASS: "custom-save-job-seeker",
  REACTIONS_MENU_SELECTOR: ".reactions-menu",
  SAVE_ICON_URL: chrome.runtime.getURL("public/add-icon.png"),

  addSaveJobSeekerButton: () => {
    const reactionMenus = document.querySelectorAll(
      ReactionModule.REACTIONS_MENU_SELECTOR,
    );

    reactionMenus.forEach((menu) => {
      if (menu.querySelector(`.${ReactionModule.CUSTOM_SAVE_BUTTON_CLASS}`)) {
        return;
      }

      const button = DomUtils.createElement("button", {
        classNames: [
          "reactions-menu__reaction-index",
          "reactions-menu__reaction",
          ReactionModule.CUSTOM_SAVE_BUTTON_CLASS,
        ],

        attributes: {
          "aria-label": "Save Job Seeker",
          tabindex: "-1",
          type: "button",
        },
      });

      const span = DomUtils.createElement("span", {
        classNames: "reactions-menu__reaction-description",
        innerText: "Save Seeker",
      });

      span.style.transform = "translateX(calc(-50% + -20px + 8px * (6 - 6)))";

      const img = DomUtils.createElement("img", {
        classNames: [
          "reactions-icon",
          "reactions-menu__icon",
          "reactions-icon__consumption--large",
          "data-test-reactions-icon-type-SAVE",
          "data-test-reactions-icon-theme-light",
        ],

        src: ReactionModule.SAVE_ICON_URL,

        alt: "save icon",

        attributes: {
          "data-test-reactions-icon-type": "SAVE",
          "data-test-reactions-icon-theme": "light",
          "data-test-reactions-icon-style": "consumption",
          "data-test-reactions-icon-size": "large",
        },
      });

      button.appendChild(span);
      button.appendChild(img);
      DomUtils.addEvent(
        button,
        "click",
        ReactionModule.handleSaveJobSeekerClick,
      );
      menu.appendChild(button);
    });
  },

  handleSaveJobSeekerClick: async (e) => {
    const postContainer = DomUtils.closestAncestor(
      e.target,
      ".fie-impression-container",
    );

    if (!postContainer) {
      console.log("Parent post not found.");
      alert("Post not found. Cannot save record.");
      return;
    }

    try {
      const jobSeekerRecord =
        ReactionModule.extractJobSeekerData(postContainer);
      const { jobSeekerRecords } = await ChromeStorage.get([
        "jobSeekerRecords",
      ]);

      const existingRecords = jobSeekerRecords || [];
      const isCached = existingRecords.some(
        (record) => record.postId === jobSeekerRecord.postId,
      );

      if (isCached) {
        alert("This job seeker record is already cached.");
      } else {
        await ReactionModule.saveJobSeekerRecord(jobSeekerRecord);
        alert(
          `Job Seeker record saved successfully: ${jobSeekerRecord.username}`,
        );
      }
    } catch (error) {
      console.error("Error during save operation:", error);

      if (
        error.message &&
        error.message.includes("Extension context invalidated")
      ) {
        alert(
          "Error: Extension context invalidated. Please reload the LinkedIn page and try again.",
        );
      } else {
        alert("An unexpected error occurred while saving the record.");
      }
    }
  },

  extractJobSeekerData: (postContainer) => {
    const usernameElement = postContainer.querySelector(
      ".update-components-actor__title span[aria-hidden='true']",
    );

    const username = DomUtils.getCleanedText(usernameElement, "Unknown User");

    const positionElement = postContainer.querySelector(
      ".update-components-actor__description span[aria-hidden='true']",
    );

    const desiredJobPosition = DomUtils.getCleanedText(
      positionElement,
      "Unknown Position",
    );

    const postTextElement = postContainer.querySelector(
      ".update-components-text span[dir='rtl']",
    );

    const postText = DomUtils.getCleanedText(
      postTextElement,
      "Post text not found.",
    );

    const postPublicationDate = new Date().toISOString();

    const mainPostElement = postContainer.closest("[data-urn]");

    const urn = mainPostElement
      ? mainPostElement.getAttribute("data-urn")
      : null;

    const postId = urn ? urn.split(":").pop() : "Unknown ID";

    const authorProfileLinkElement = postContainer.querySelector(
      ".update-components-actor__meta-link",
    );

    const authorProfileUrl = authorProfileLinkElement
      ? authorProfileLinkElement.href
      : "Unknown URL";

    return {
      username,
      desiredJobPosition,
      postPublicationDate,
      postId,
      postText,
      authorProfileUrl,
    };
  },

  saveJobSeekerRecord: async (jobSeekerRecord) => {
    let { jobSeekerRecords } = await ChromeStorage.get(["jobSeekerRecords"]);

    jobSeekerRecords = jobSeekerRecords || [];
    jobSeekerRecords.unshift(jobSeekerRecord);

    try {
      await ChromeStorage.set({ jobSeekerRecords });

      console.log(
        "Job Seeker record successfully added and saved:",
        jobSeekerRecords,
      );
    } catch (error) {
      console.error("Error saving job seeker record:", error);
    }
  },
};

const QuillEditorModule = {
  QUILL_EDITOR_SELECTOR: ".ql-editor",

  MENTION_DROPDOWN_SELECTOR:
    '.editor-typeahead__typeahead-tray[role="listbox"]',

  MENTION_SUGGESTION_SELECTOR:
    ".basic-typeahead__selectable.editor-typeahead__typeahead-item",

  simulateTypingCharacters: (text, editor) => {
    const pElement = editor.querySelector("p");

    if (!pElement) {
      console.error("pElement not found in editor.");

      return;
    }

    const ensureLastTextNode = () => {
      const lastChild = pElement.lastChild;

      if (!lastChild || lastChild.nodeType !== Node.TEXT_NODE) {
        const newTextNode = document.createTextNode("");
        pElement.appendChild(newTextNode);
        return newTextNode;
      }

      return lastChild;
    };

    const lastTextNode = ensureLastTextNode();

    lastTextNode.nodeValue += text;

    const range = document.createRange();

    const sel = window.getSelection();

    range.setStart(lastTextNode, lastTextNode.length);

    range.collapse(true);

    sel.removeAllRanges();

    sel.addRange(range);

    editor.dispatchEvent(new Event("input", { bubbles: true }));

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      editor.dispatchEvent(
        new KeyboardEvent("keydown", { key: char, bubbles: true }),
      );

      editor.dispatchEvent(
        new KeyboardEvent("keypress", { key: char, bubbles: true }),
      );

      editor.dispatchEvent(
        new KeyboardEvent("keyup", { key: char, bubbles: true }),
      );
    }
  },

  waitForAndSelectMention: (
    targetName,
    targetProfileSlug,
    maxRetries = 20,
    retryDelay = 200,
  ) => {
    return new Promise((resolve) => {
      let retries = 0;

      const checkAndSelect = async () => {
        const mentionDropdown = document.querySelector(
          QuillEditorModule.MENTION_DROPDOWN_SELECTOR,
        );

        if (mentionDropdown) {
          await new Promise((r) => {
            setTimeout(r, 100);
          });

          const suggestions = mentionDropdown.querySelectorAll(
            QuillEditorModule.MENTION_SUGGESTION_SELECTOR,
          );

          let foundSuggestion = null;

          for (const suggestion of suggestions) {
            const nameElement = suggestion.querySelector(
              ".search-typeahead-v2__hit-text",
            );

            const nameMatches =
              nameElement &&
              nameElement.innerText.trim().toLowerCase() ===
                targetName.toLowerCase();

            if (nameMatches) {
              foundSuggestion = suggestion;

              break;
            }
          }

          if (foundSuggestion) {
            foundSuggestion.click();
            console.log(`Mention suggestion for: ${targetName} clicked.`);
            resolve(true);

            return;
          } else {
            console.warn(
              `Dropdown appeared but no exact match for: ${targetName} found. Retrying... (${
                retries + 1
              }/${maxRetries})`,
            );
          }
        } else {
          console.log(
            `Mention dropdown for ${targetName} not visible yet. Retrying... (${
              retries + 1
            }/${maxRetries})`,
          );
        }

        retries++;

        if (retries < maxRetries) {
          setTimeout(checkAndSelect, retryDelay);
        } else {
          console.warn(
            `Maximum retries reached. No exact mention suggestion found for: ${targetName}.`,
          );
          resolve(false);
        }
      };

      checkAndSelect();
    });
  },

  mentionUsersFromArrayByTyping: async (usersToMention, editor) => {
    if (!editor) {
      console.warn("Quill editor not found. Cannot start mention process.");
      return;
    }

    editor.focus();

    editor.innerHTML = "<p><br></p>";
    for (const user of usersToMention) {
      const mentionText = `@${user.username}`;

      console.log(
        `Attempting to mention: ${user.username} (URL: ${user.authorProfileUrl})`,
      );

      QuillEditorModule.simulateTypingCharacters(mentionText, editor);

      console.log(`Typing for: ${user.username} completed.`);

      // eslint-disable-next-line no-await-in-loop
      const selected = await QuillEditorModule.waitForAndSelectMention(
        user.username,
        user.authorProfileUrl,
      );

      if (selected) {
        console.log(`Successfully mentioned ${user.username}.`);

        QuillEditorModule.simulateTypingCharacters(" ", editor);
      } else {
        console.warn(
          `Could not mention ${user.username}. Clearing editor for the next user.`,
        );

        editor.setContents([{ insert: "\n" }]);

        QuillEditorModule.resetCursor(editor);
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => {
        setTimeout(r, 500);
      });
    }

    console.log("All requested users processed.");
  },

  resetCursor: (editor) => {
    const pElement = editor.querySelector("p");

    if (!pElement) return;

    const range = document.createRange();

    const sel = window.getSelection();

    if (
      pElement.firstChild === null ||
      pElement.firstChild.nodeType !== Node.TEXT_NODE
    ) {
      pElement.appendChild(document.createTextNode(""));
    }

    range.setStart(pElement.firstChild, 0);

    range.collapse(true);

    sel.removeAllRanges();

    sel.addRange(range);

    editor.dispatchEvent(new Event("input", { bubbles: true }));
  },

  findActiveQuillEditor: () => {
    let activeEditor = document.activeElement;

    while (activeEditor && !activeEditor.classList.contains("ql-editor")) {
      activeEditor = activeEditor.parentElement;
    }

    if (activeEditor && activeEditor.classList.contains("ql-editor")) {
      console.log("Currently focused Quill editor found.");

      return activeEditor;
    } else {
      console.warn(
        "No Quill editor currently focused. Attempting to find the first available editor.",
      );

      return document.querySelector(QuillEditorModule.QUILL_EDITOR_SELECTOR);
    }
  },
};

const observer = new MutationObserver(() => {
  ReactionModule.addSaveJobSeekerButton();
});

observer.observe(document.body, { childList: true, subtree: true });

ReactionModule.addSaveJobSeekerButton();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "mentionUsers") {
    const usersToMention = message.users;

    console.log("Received 'mentionUsers' message from popup:", usersToMention);

    const editor = QuillEditorModule.findActiveQuillEditor();

    if (editor) {
      QuillEditorModule.mentionUsersFromArrayByTyping(usersToMention, editor)
        .then(() => {
          sendResponse({
            status: "success",
            message: "Users successfully mentioned.",
          });
        })
        .catch((error) => {
          console.error(
            "Error during mention process in content script:",
            error,
          );

          sendResponse({
            status: "error",
            message: "Error during mention process.",
          });
        });

      return true;
    } else {
      console.error("No Quill editor found on the page.");

      sendResponse({
        status: "error",
        message: "No Quill editor found.",
      });

      return false;
    }
  }
});
