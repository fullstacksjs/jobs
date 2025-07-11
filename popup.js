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
      for (const key in options.attributes) {
        if (tagName === "input" && key === "checked") {
          element.checked = options.attributes[key];
        } else {
          element.setAttribute(key, options.attributes[key]);
        }
      }
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

            chrome.runtime.lastError
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

            chrome.runtime.lastError
          );

          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },
};

document.addEventListener("DOMContentLoaded", async () => {
  const recordsListDiv = document.getElementById("postsList");

  const noRecordsMessage = document.getElementById("noRecordsMessage");

  const mentionSelectedBtn = document.getElementById("mentionSelectedBtn");

  const deleteAllBtn = document.getElementById("deleteAllBtn");

  const filterJobTitleInput = document.getElementById("filterJobTitle");

  const sortDateSelect = document.getElementById("sortDate");

  let allJobSeekerRecords = [];

  let selectedRecords = new Set();

  function renderJobSeekerRecords(recordsToRender) {
    recordsListDiv.innerHTML = "";

    selectedRecords.clear();

    updateActionButtons();

    if (recordsToRender.length > 0) {
      noRecordsMessage.style.display = "none";

      recordsToRender.forEach((record, index) => {
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

        DomUtils.addEvent(checkbox, "change", () => {
          if (checkbox.checked) {
            selectedRecords.add(index);
          } else {
            selectedRecords.delete(index);
          }

          updateActionButtons();
        });

        const deleteButton = DomUtils.createElement("button", {
          classNames: "delete-btn",

          innerText: "Delete",

          attributes: { title: "Delete this record" },
        });

        DomUtils.addEvent(deleteButton, "click", () => {
          deleteRecord(index);
        });

        const usernameLink = DomUtils.createElement("a", {
          innerText: record.username,

          attributes: { href: record.authorProfileUrl, target: "_blank" },
        });

        const usernameP = DomUtils.createElement("p", {
          innerText: "Username: ",
        });

        usernameP.appendChild(usernameLink);

        const desiredJobPositionP = DomUtils.createElement("p", {
          innerText: `Position: ${record.desiredJobPosition}`,
        });

        const postTextP = DomUtils.createElement("p", {
          classNames: "post-text-content",
        });

        postTextP.innerText = record.postText;

        recordItem.appendChild(usernameP);

        recordItem.appendChild(desiredJobPositionP);

        recordItem.appendChild(postTextP);

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

        if (record.postText && record.postText.length > 0) {
          recordItem.appendChild(toggleButton);
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

        recordsListDiv.appendChild(recordItem);
      });
    } else {
      recordsListDiv.appendChild(noRecordsMessage);

      noRecordsMessage.style.display = "block";

      noRecordsMessage.innerText = "No job seeker records saved yet.";
    }

    updateActionButtons();
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
          record.desiredJobPosition.toLowerCase().includes(jobTitleFilter)
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

  if (filterJobTitleInput)
    DomUtils.addEvent(filterJobTitleInput, "input", applyFiltersAndSort);

  if (sortDateSelect)
    DomUtils.addEvent(sortDateSelect, "change", applyFiltersAndSort);

  function updateActionButtons() {
    const hasSelection = selectedRecords.size > 0;

    mentionSelectedBtn.disabled = !hasSelection;

    deleteAllBtn.disabled = allJobSeekerRecords.length === 0;
  }

  async function deleteRecord(indexToDelete) {
    allJobSeekerRecords = allJobSeekerRecords.filter(
      (_, index) => index !== indexToDelete
    );

    try {
      await ChromeStorage.set({ jobSeekerRecords: allJobSeekerRecords });

      console.log(`Record at index ${indexToDelete} deleted.`);

      applyFiltersAndSort();

      alert("Record deleted successfully.");
    } catch (error) {
      console.error("Error deleting record:", error);

      alert("Error deleting record.");
    }
  }

  DomUtils.addEvent(deleteAllBtn, "click", async () => {
    if (
      confirm(
        "Are you sure you want to delete all records? This action is irreversible."
      )
    ) {
      try {
        await ChromeStorage.set({ jobSeekerRecords: [] });

        allJobSeekerRecords = [];

        console.log("All records deleted.");

        applyFiltersAndSort();

        alert("All records deleted successfully.");
      } catch (error) {
        console.error("Error deleting all records:", error);

        alert("Error deleting all records.");
      }
    }
  });

  DomUtils.addEvent(mentionSelectedBtn, "click", () => {
    if (selectedRecords.size === 0) {
      alert("Please select at least one record to mention.");

      return;
    }

    const recordsToMention = Array.from(selectedRecords).map(
      (index) => allJobSeekerRecords[index]
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

                chrome.runtime.lastError
              );

              alert(
                "Error sending mention command. Make sure you are on a LinkedIn page."
              );
            } else if (response && response.status === "success") {
              alert("Mention command sent successfully. ");
            } else {
              alert(
                "Please click on the comment button to activate the comment input box."
              );
            }
          }
        );
      } else {
        alert("Active LinkedIn tab not found.");
      }
    });

    selectedRecords.clear();

    applyFiltersAndSort();
  });

  try {
    const result = await ChromeStorage.get(["jobSeekerRecords"]);

    allJobSeekerRecords = result.jobSeekerRecords || [];

    applyFiltersAndSort();
  } catch (error) {
    console.error("Error loading initial data:", error);

    noRecordsMessage.innerText = "Error loading data.";
  }
});
