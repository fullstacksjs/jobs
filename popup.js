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
        if (tagName === "input" && key === "checked") {
          element.checked = options.attributes[key];
        } else {
          element.setAttribute(key, options.attributes[key]);
        }
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

let recordsListDiv;
let noRecordsMessage;
let mentionSelectedBtn;
let deleteAllBtn;
let filterJobTitleInput;
let sortDateSelect;

let allJobSeekerRecords = [];
const selectedRecords = new Set();

function updateActionButtons() {
  const hasSelection = selectedRecords.size > 0;
  mentionSelectedBtn.disabled = !hasSelection;
  deleteAllBtn.disabled = allJobSeekerRecords.length === 0;
}

function displayNoRecordsMessage(show, text = "") {
  if (show) {
    noRecordsMessage.style.display = "block";
    noRecordsMessage.innerText = text;

    recordsListDiv.innerHTML = "";
  } else {
    noRecordsMessage.style.display = "none";
  }
}

function handleRecordCheckboxChange(index, checkbox) {
  if (checkbox.checked) {
    selectedRecords.add(index);
  } else {
    selectedRecords.delete(index);
  }
  updateActionButtons();
}

function createPostToggleButton(postTextP) {
  const toggleButton = DomUtils.createElement("span", {
    classNames: "read-more-btn",
    innerText: "Read More",
  });

  postTextP.classList.add("truncated");

  DomUtils.addEvent(toggleButton, "click", () => {
    if (postTextP.classList.contains("truncated")) {
      postTextP.classList.remove("truncated");
      toggleButton.innerText = "Show Less";
    } else {
      postTextP.classList.add("truncated");
      toggleButton.innerText = "Read More";
    }
  });
  return toggleButton;
}

function createRecordItemElement(record, index) {
  const recordItem = DomUtils.createElement("div", {
    classNames: "record-item",
    attributes: {
      "data-index": index,
      "data-id": record.authorProfileUrl + record.timestamp,
    },
  });

  const checkbox = DomUtils.createElement("input", {
    classNames: "select-checkbox",
    attributes: { type: "checkbox", checked: selectedRecords.has(index) },
  });
  DomUtils.addEvent(checkbox, "change", () =>
    handleRecordCheckboxChange(index, checkbox),
  );

  const deleteButton = DomUtils.createElement("button", {
    classNames: "delete-btn",
    innerText: "Delete",
    attributes: { title: "Delete this record" },
  });
  DomUtils.addEvent(deleteButton, "click", () => deleteRecord(index));

  const usernameLink = DomUtils.createElement("a", {
    innerText: record.username,
    attributes: { href: record.authorProfileUrl, target: "_blank" },
  });
  const usernameP = DomUtils.createElement("p", { innerText: "Username: " });
  usernameP.appendChild(usernameLink);

  const desiredJobPositionP = DomUtils.createElement("p", {
    innerText: `Position: ${record.desiredJobPosition}`,
  });

  const postTextP = DomUtils.createElement("p", {
    classNames: "post-text-content",
    innerText: record.postText,
  });

  recordItem.appendChild(usernameP);
  recordItem.appendChild(desiredJobPositionP);
  recordItem.appendChild(postTextP);

  if (record.postText && record.postText.length > 0) {
    recordItem.appendChild(createPostToggleButton(postTextP));
  }

  if (record.postUrl) {
    const postLinkP = DomUtils.createElement("p");
    const postLink = DomUtils.createElement("a", {
      innerText: "View Post",
      attributes: { href: record.postUrl, target: "_blank" },
    });
    postLinkP.appendChild(postLink);
    recordItem.appendChild(postLinkP);
  }

  const actionsContainer = DomUtils.createElement("div", {
    classNames: "record-actions",
  });
  actionsContainer.appendChild(checkbox);
  actionsContainer.appendChild(deleteButton);
  recordItem.appendChild(actionsContainer);

  return recordItem;
}

function renderJobSeekerRecords(recordsToRender) {
  recordsListDiv.innerHTML = "";
  selectedRecords.clear();
  updateActionButtons();

  if (recordsToRender.length > 0) {
    displayNoRecordsMessage(false);
    recordsToRender.forEach((record, index) => {
      recordsListDiv.appendChild(createRecordItemElement(record, index));
    });
  } else {
    displayNoRecordsMessage(true, "No job seeker records saved yet.");
  }
}

function applyFiltersAndSort() {
  let filteredRecords = [...allJobSeekerRecords];

  const jobTitleFilter = filterJobTitleInput
    ? filterJobTitleInput.value.toLowerCase()
    : "";

  if (jobTitleFilter) {
    filteredRecords = filteredRecords.filter(
      (record) =>
        record.desiredJobPosition &&
        record.desiredJobPosition.toLowerCase().includes(jobTitleFilter),
    );
  }

  const sortOrder = sortDateSelect ? sortDateSelect.value : "";
  if (sortOrder) {
    filteredRecords.sort((a, b) => {
      const dateA = new Date(a.postPublicationDate);
      const dateB = new Date(b.postPublicationDate);

      if (sortOrder === "asc") {
        return dateA.getTime() - dateB.getTime();
      } else if (sortOrder === "desc") {
        return dateB.getTime() - dateA.getTime();
      }
      return 0;
    });
  }

  renderJobSeekerRecords(filteredRecords);
}

async function deleteRecord(indexToDelete) {
  const recordToDelete = allJobSeekerRecords[indexToDelete];
  if (!recordToDelete) {
    console.warn(`Record at index ${indexToDelete} not found for deletion.`);
    return;
  }
  const recordIdToDelete =
    recordToDelete.authorProfileUrl + recordToDelete.timestamp;

  allJobSeekerRecords = allJobSeekerRecords.filter(
    (record) => record.authorProfileUrl + record.timestamp !== recordIdToDelete,
  );

  try {
    await ChromeStorage.set({ jobSeekerRecords: allJobSeekerRecords });
    console.log(`Record with ID: ${recordIdToDelete} deleted.`);
    alert("Record deleted successfully.");
    applyFiltersAndSort();
  } catch (error) {
    console.error("Error deleting record:", error);
    alert("Error deleting record.");
  }
}

async function handleDeleteAllClick() {
  if (
    confirm(
      "Are you sure you want to delete all records? This action is irreversible.",
    )
  ) {
    try {
      await ChromeStorage.set({ jobSeekerRecords: [] });
      allJobSeekerRecords = [];
      console.log("All records deleted.");
      alert("All records deleted successfully.");
      applyFiltersAndSort();
    } catch (error) {
      console.error("Error deleting all records:", error);
      alert("Error deleting all records.");
    }
  }
}

function handleMentionSelectedClick() {
  if (selectedRecords.size === 0) {
    alert("Please select at least one record to mention.");
    return;
  }

  const recordsToMention = Array.from(selectedRecords).map(
    (index) => allJobSeekerRecords[index],
  );

  console.log("Records selected for mention:", recordsToMention);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: "mentionUsers",
          users: recordsToMention,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error sending message to content script:",
              chrome.runtime.lastError,
            );
            alert(
              "Error sending mention command. Make sure you are on a LinkedIn page.",
            );
          } else if (response && response.status === "success") {
            alert("Mention command sent successfully. ");
          } else {
            alert(
              "Please click on the comment button to activate the comment input box.",
            );
          }
        },
      );
    } else {
      alert("Active LinkedIn tab not found.");
    }
  });
}

function setupDOMElements() {
  recordsListDiv = document.getElementById("postsList");
  noRecordsMessage = document.getElementById("noRecordsMessage");
  mentionSelectedBtn = document.getElementById("mentionSelectedBtn");
  deleteAllBtn = document.getElementById("deleteAllBtn");
  filterJobTitleInput = document.getElementById("filterJobTitle");
  sortDateSelect = document.getElementById("sortDate");
}

function setupEventListeners() {
  if (filterJobTitleInput) {
    DomUtils.addEvent(filterJobTitleInput, "input", applyFiltersAndSort);
  }
  if (sortDateSelect) {
    DomUtils.addEvent(sortDateSelect, "change", applyFiltersAndSort);
  }
  DomUtils.addEvent(deleteAllBtn, "click", handleDeleteAllClick);
  DomUtils.addEvent(mentionSelectedBtn, "click", handleMentionSelectedClick);
}

async function loadInitialData() {
  try {
    const result = await ChromeStorage.get(["jobSeekerRecords"]);
    allJobSeekerRecords = result.jobSeekerRecords || [];
    applyFiltersAndSort();
  } catch (error) {
    console.error("Error loading initial data:", error);
    displayNoRecordsMessage(true, "Error loading data.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  setupDOMElements();
  setupEventListeners();
  await loadInitialData();
});
