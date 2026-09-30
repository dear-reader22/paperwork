/* ============================================================
   PAPERWORK
   Complete application logic
   ============================================================ */


/* ============================================================
   STORAGE
   ============================================================ */

const STORAGE_KEY = "paperwork-v2";

const defaultData = {
  tasks: [],
  events: [],
  notes: [],
  collections: [],
  countdowns: [],
  water: 0
};


function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return structuredClone(defaultData);
    }

    return {
      ...structuredClone(defaultData),
      ...JSON.parse(saved)
    };

  } catch (error) {
    console.warn("Could not load Paperwork data.", error);
    return structuredClone(defaultData);
  }
}


let data = loadData();


function saveData() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );

    setFooterStatus("Saved locally.");
  } catch (error) {
    console.warn("Could not save Paperwork data.", error);
    setFooterStatus("Could not save changes.");
  }
}


function setFooterStatus(message) {
  const element = document.getElementById("footer-status");

  if (element) {
    element.textContent = message;
  }
}


/* ============================================================
   DATE HELPERS
   ============================================================ */

function pad(number) {
  return String(number).padStart(2, "0");
}


function dateKey(date) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-");
}


function todayKey() {
  return dateKey(new Date());
}


function parseDateKey(key) {
  const [year, month, day] = key
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day);
}


function formatFullDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}


function formatShortDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short"
  }).format(date);
}


function formatMonthYear(date) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric"
  }).format(date);
}


function getMonday(date) {
  const result = new Date(date);

  const day = result.getDay();

  const difference = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + difference);

  return result;
}


function addDays(date, amount) {
  const result = new Date(date);

  result.setDate(result.getDate() + amount);

  return result;
}


function sameDate(a, b) {
  return dateKey(a) === dateKey(b);
}


/* ============================================================
   ESCAPING
   ============================================================ */

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* ============================================================
   STATE
   ============================================================ */

let currentView = "today";

let currentMonth = new Date();

let currentWeekStart = getMonday(new Date());


/* ============================================================
   DOM
   ============================================================ */

const $ = (selector) =>
  document.querySelector(selector);

const $$ = (selector) =>
  document.querySelectorAll(selector);


/* ============================================================
   INITIALISE
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  setupNavigation();

  setupCover();

  setupTaskControls();

  setupEventControls();

  setupCountdownControls();

  setupNoteControls();

  setupCollectionControls();

  setupWaterControls();

  setupFocusTimer();

  setupNotificationButton();

  setupHeaderDate();

  renderEverything();

  setInterval(checkTaskNotifications, 30 * 1000);

});


/* ============================================================
   COVER
   ============================================================ */

function setupCover() {

  const button = $("#open-notebook");

  if (!button) {
    return;
  }

  button.addEventListener("click", () => {

    $("#cover").classList.add("hidden");

    $("#app").classList.remove("hidden");

    showView("today");

  });

}


/* ============================================================
   NAVIGATION
   ============================================================ */

function setupNavigation() {

  $$(".nav-item").forEach((button) => {

    button.addEventListener("click", () => {

      const view = button.dataset.view;

      showView(view);

    });

  });


  $("#today-button").addEventListener(
    "click",
    () => showView("today")
  );

}


function showView(viewName) {

  currentView = viewName;

  $$(".nav-item").forEach((button) => {

    button.classList.toggle(
      "active",
      button.dataset.view === viewName
    );

  });


  $$(".view").forEach((view) => {

    view.classList.toggle(
      "active",
      view.dataset.viewPanel === viewName
    );

  });


  if (viewName === "today") {
    renderToday();
  }

  if (viewName === "week") {
    renderWeek();
  }

  if (viewName === "month") {
    renderMonth();
  }

  if (viewName === "collections") {
    renderCollections();
  }

  if (viewName === "notes") {
    renderNotes();
  }

}


/* ============================================================
   HEADER
   ============================================================ */

function setupHeaderDate() {

  $("#header-date").textContent =
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short"
    }).format(new Date());

}


/* ============================================================
   RENDER EVERYTHING
   ============================================================ */

function renderEverything() {

  renderToday();

  renderWeek();

  renderMonth();

  renderCollections();

  renderNotes();

  renderCountdowns();

  renderWater();

  renderHeaderDate();

}


function renderHeaderDate() {

  const now = new Date();

  $("#header-date").textContent =
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short"
    }).format(now);

}


/* ============================================================
   TODAY
   ============================================================ */

function renderToday() {

  const today = new Date();

  $("#today-weekday").textContent =
    new Intl.DateTimeFormat("en-GB", {
      weekday: "long"
    })
      .format(today)
      .toUpperCase();

  $("#today-title").textContent = "Today";

  $("#today-full-date").textContent =
    formatFullDate(today);


  const key = dateKey(today);

  const tasks = data.tasks
    .filter(task => task.date === key)
    .sort(sortTasks);

  const events = data.events
    .filter(event => event.date === key)
    .sort(sortTimedItems);


  renderTodayTasks(tasks);

  renderTodayEvents(events);

  renderCountdowns();

  renderWater();

}


function sortTasks(a, b) {

  if (a.completed !== b.completed) {
    return Number(a.completed) - Number(b.completed);
  }

  const priority = {
    high: 0,
    medium: 1,
    low: 2
  };

  if (priority[a.priority] !== priority[b.priority]) {
    return priority[a.priority] - priority[b.priority];
  }

  return (a.start || "99:99")
    .localeCompare(b.start || "99:99");
}


function sortTimedItems(a, b) {

  return (a.start || "99:99")
    .localeCompare(b.start || "99:99");

}


/* ============================================================
   TASKS
   ============================================================ */

function setupTaskControls() {

  $("#add-task-button")
    .addEventListener("click", () => openTaskModal());


  document.addEventListener("click", (event) => {

    const button =
      event.target.closest("[data-action='add-task']");

    if (button) {
      openTaskModal();
    }

  });


  $("#task-form")
    .addEventListener("submit", saveTask);


  $("#today-task-list")
    .addEventListener("click", handleTaskAction);

}


function openTaskModal(task = null, presetDate = null) {

  $("#task-form").reset();

  $("#task-id").value = task?.id || "";

  $("#task-name").value = task?.name || "";

  $("#task-date").value =
    task?.date ||
    presetDate ||
    todayKey();

  $("#task-priority").value =
    task?.priority || "medium";

  $("#task-start").value =
    task?.start || "";

  $("#task-end").value =
    task?.end || "";

  $("#task-notification").checked =
    task?.notification !== false;


  $("#task-modal-title").textContent =
    task ? "Edit task" : "Add a task";


  openModal("task-modal");

  $("#task-name").focus();

}


function saveTask(event) {

  event.preventDefault();


  const id = $("#task-id").value;

  const task = {

    id: id || crypto.randomUUID(),

    name: $("#task-name").value.trim(),

    date: $("#task-date").value,

    priority: $("#task-priority").value,

    start: $("#task-start").value,

    end: $("#task-end").value,

    notification:
      $("#task-notification").checked,

    completed:
      id
        ? Boolean(
            data.tasks.find(
              taskItem => taskItem.id === id
            )?.completed
          )
        : false

  };


  if (!task.name || !task.date) {
    return;
  }


  if (id) {

    const index = data.tasks.findIndex(
      existing => existing.id === id
    );

    if (index !== -1) {
      data.tasks[index] = task;
    }

  } else {

    data.tasks.push(task);

  }


  saveData();

  closeModals();

  renderEverything();

}


function handleTaskAction(event) {

  const checkbox =
    event.target.closest(".task-check");

  if (checkbox) {

    const id = checkbox.dataset.id;

    const task = data.tasks.find(
      item => item.id === id
    );

    if (task) {

      task.completed = checkbox.checked;

      saveData();

      renderEverything();

    }

    return;
  }


  const actionButton =
    event.target.closest("[data-task-action]");

  if (!actionButton) {
    return;
  }


  const id = actionButton.dataset.id;

  const task = data.tasks.find(
    item => item.id === id
  );

  if (!task) {
    return;
  }


  if (actionButton.dataset.taskAction === "edit") {

    openTaskModal(task);

  }


  if (actionButton.dataset.taskAction === "delete") {

    data.tasks = data.tasks.filter(
      item => item.id !== id
    );

    saveData();

    renderEverything();

  }

}


function renderTodayTasks(tasks) {

  const list = $("#today-task-list");

  const empty = $("#today-empty");

  $("#today-task-count").textContent =
    tasks.filter(task => !task.completed).length;


  if (!tasks.length) {

    list.innerHTML = "";

    empty.classList.remove("hidden");

    return;
  }


  empty.classList.add("hidden");


  list.innerHTML = tasks.map(task => {

    const time =
      task.start
        ? `${task.start}${task.end ? `–${task.end}` : ""}`
        : "No time set";


    return `

      <article class="task-item ${task.completed ? "completed" : ""}">

        <input
          class="task-check"
          type="checkbox"
          data-id="${escapeHTML(task.id)}"
          ${task.completed ? "checked" : ""}
          aria-label="Complete ${escapeHTML(task.name)}"
        >

        <div class="task-main">

          <p class="task-name">
            ${escapeHTML(task.name)}
          </p>

          <div class="task-meta">

            <span>${escapeHTML(time)}</span>

            <span class="priority priority-${escapeHTML(task.priority)}">
              ${escapeHTML(task.priority)}
            </span>

          </div>

        </div>

        <div class="task-actions">

          <button
            class="small-action"
            data-task-action="edit"
            data-id="${escapeHTML(task.id)}"
            aria-label="Edit task"
          >
            ✎
          </button>

          <button
            class="small-action"
            data-task-action="delete"
            data-id="${escapeHTML(task.id)}"
            aria-label="Delete task"
          >
            ×
          </button>

        </div>

      </article>

    `;

  }).join("");

}


/* ============================================================
   EVENTS
   ============================================================ */

function setupEventControls() {

  $("#add-event-today")
    .addEventListener("click", () => openEventModal());


  $("#event-form")
    .addEventListener("submit", saveEvent);


  $("#today-event-list")
    .addEventListener("click", handleEventAction);


  $("#previous-month")
    .addEventListener("click", () => {

      currentMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        1
      );

      renderMonth();

    });


  $("#next-month")
    .addEventListener("click", () => {

      currentMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1
      );

      renderMonth();

    });


  $("#previous-week")
    .addEventListener("click", () => {

      currentWeekStart =
        addDays(currentWeekStart, -7);

      renderWeek();

    });


  $("#next-week")
    .addEventListener("click", () => {

      currentWeekStart =
        addDays(currentWeekStart, 7);

      renderWeek();

    });


  $("#calendar-grid")
    .addEventListener("click", handleCalendarClick);

}


function openEventModal(eventItem = null, presetDate = null) {

  $("#event-form").reset();

  $("#event-id").value =
    eventItem?.id || "";

  $("#event-name").value =
    eventItem?.name || "";

  $("#event-date").value =
    eventItem?.date ||
    presetDate ||
    todayKey();

  $("#event-start").value =
    eventItem?.start || "";

  $("#event-end").value =
    eventItem?.end || "";

  $("#event-colour").value =
    eventItem?.colour || "blue";


  $("#event-modal-title").textContent =
    eventItem
      ? "Edit event"
      : "Add an event";


  openModal("event-modal");

  $("#event-name").focus();

}


function saveEvent(event) {

  event.preventDefault();


  const id = $("#event-id").value;


  const eventItem = {

    id: id || crypto.randomUUID(),

    name: $("#event-name").value.trim(),

    date: $("#event-date").value,

    start: $("#event-start").value,

    end: $("#event-end").value,

    colour: $("#event-colour").value

  };


  if (!eventItem.name || !eventItem.date) {
    return;
  }


  if (id) {

    const index = data.events.findIndex(
      existing => existing.id === id
    );

    if (index !== -1) {
      data.events[index] = eventItem;
    }

  } else {

    data.events.push(eventItem);

  }


  saveData();

  closeModals();

  renderEverything();

}


function handleEventAction(event) {

  const button =
    event.target.closest("[data-event-action]");

  if (!button) {
    return;
  }


  const id = button.dataset.id;


  if (button.dataset.eventAction === "delete") {

    data.events = data.events.filter(
      item => item.id !== id
    );

    saveData();

    renderEverything();

  }


  if (button.dataset.eventAction === "edit") {

    const eventItem = data.events.find(
      item => item.id === id
    );

    if (eventItem) {
      openEventModal(eventItem);
    }

  }

}


function renderTodayEvents(events) {

  const list = $("#today-event-list");

  const empty = $("#today-event-empty");


  if (!events.length) {

    list.innerHTML = "";

    empty.classList.remove("hidden");

    return;
  }


  empty.classList.add("hidden");


  list.innerHTML = events.map(eventItem => {

    const time =
      eventItem.start
        ? `${eventItem.start}${eventItem.end ? `–${eventItem.end}` : ""}`
        : "All day";


    return `

      <article class="event-item">

        <span class="event-dot ${escapeHTML(eventItem.colour)}"></span>

        <div class="event-info">

          <p class="event-name">
            ${escapeHTML(eventItem.name)}
          </p>

          <p class="event-time">
            ${escapeHTML(time)}
          </p>

        </div>

        <button
          class="event-delete"
          data-event-action="edit"
          data-id="${escapeHTML(eventItem.id)}"
        >
          ✎
        </button>

        <button
          class="event-delete"
          data-event-action="delete"
          data-id="${escapeHTML(eventItem.id)}"
        >
          ×
        </button>

      </article>

    `;

  }).join("");

}


/* ============================================================
   WEEK
   ============================================================ */

function renderWeek() {

  const grid = $("#week-grid");

  const end = addDays(
    currentWeekStart,
    6
  );


  $("#week-title").textContent =
    `${formatShortDate(currentWeekStart)} – ${formatShortDate(end)}`;


  grid.innerHTML =
    Array.from({ length: 7 }, (_, index) => {

      const date =
        addDays(currentWeekStart, index);

      const key = dateKey(date);

      const tasks = data.tasks
        .filter(task => task.date === key)
        .sort(sortTasks);

      const events = data.events
        .filter(event => event.date === key)
        .sort(sortTimedItems);


      const entries = [

        ...events.map(eventItem => ({
          type: "event",
          text: eventItem.name,
          time: eventItem.start
            ? eventItem.start
            : ""
        })),

        ...tasks.map(task => ({
          type: "task",
          text: task.name,
          time: task.start
            ? task.start
            : ""
        }))

      ];


      return `

        <article
          class="week-day ${sameDate(date, new Date()) ? "today" : ""}"
          data-date="${key}"
        >

          <div class="week-day-name">
            ${new Intl.DateTimeFormat("en-GB", {
              weekday: "short"
            }).format(date)}
          </div>

          <div class="week-day-number">
            ${date.getDate()}
          </div>

          ${
            entries.length

              ? entries.map(entry => `

                  <div class="week-entry ${entry.type}">

                    ${
                      entry.time
                        ? `<strong>${escapeHTML(entry.time)}</strong> `
                        : ""
                    }

                    ${escapeHTML(entry.text)}

                  </div>

                `).join("")

              : `<div class="week-empty">Nothing planned.</div>`
          }

        </article>

      `;

    }).join("");

}


/* ============================================================
   MONTH
   ============================================================ */

function renderMonth() {

  const year =
    currentMonth.getFullYear();

  const month =
    currentMonth.getMonth();


  $("#month-title").textContent =
    formatMonthYear(currentMonth);


  const firstDay =
    new Date(year, month, 1);


  const lastDay =
    new Date(year, month + 1, 0);


  const firstWeekday =
    firstDay.getDay() === 0
      ? 6
      : firstDay.getDay() - 1;


  const totalCells =
    Math.ceil(
      (firstWeekday + lastDay.getDate()) / 7
    ) * 7;


  const cells = [];


  for (
    let index = 0;
    index < totalCells;
    index++
  ) {

    const dayNumber =
      index - firstWeekday + 1;


    const date =
      new Date(year, month, dayNumber);


    const key =
      dateKey(date);


    const inMonth =
      date.getMonth() === month;


    const tasks =
      data.tasks.filter(
        task => task.date === key
      );


    const events =
      data.events.filter(
        event => event.date === key
      );


    const entries = [

      ...events.map(item => ({
        text: item.name,
        type: "event"
      })),

      ...tasks.map(item => ({
        text: item.name,
        type: "task"
      }))

    ];


    cells.push(`

      <button
        class="
          calendar-day
          ${inMonth ? "" : "other-month"}
          ${sameDate(date, new Date()) ? "today" : ""}
        "
        data-date="${key}"
        type="button"
      >

        <span class="calendar-number">
          ${date.getDate()}
        </span>


        ${entries
          .slice(0, 3)
          .map(entry => `

            <div class="calendar-entry ${entry.type}">
              ${escapeHTML(entry.text)}
            </div>

          `)
          .join("")}


        ${
          entries.length > 3

            ? `
              <div class="calendar-more">
                +${entries.length - 3} more
              </div>
            `

            : ""
        }

      </button>

    `);

  }


  $("#calendar-grid").innerHTML =
    cells.join("");

}


function handleCalendarClick(event) {

  const day =
    event.target.closest(".calendar-day");

  if (!day) {
    return;
  }


  const date =
    day.dataset.date;


  openDayMenu(date);

}


function openDayMenu(date) {

  const shouldAdd =
    window.confirm(
      `Add an item for ${formatFullDate(parseDateKey(date))}?\n\nOK = event\nCancel = task`
    );


  if (shouldAdd) {

    openEventModal(null, date);

  } else {

    openTaskModal(null, date);

  }

}


/* ============================================================
   WATER
   ============================================================ */

function setupWaterControls() {

  $("#add-water")
    .addEventListener("click", () => {

      data.water =
        Math.min(12, data.water + 1);

      saveData();

      renderWater();

    });


  $("#remove-water")
    .addEventListener("click", () => {

      data.water =
        Math.max(0, data.water - 1);

      saveData();

      renderWater();

    });

}


function renderWater() {

  $("#water-count").textContent =
    data.water;


  const percentage =
    Math.min(
      100,
      (data.water / 8) * 100
    );


  $("#water-progress").style.width =
    `${percentage}%`;

}


/* ============================================================
   COUNTDOWNS
   ============================================================ */

function setupCountdownControls() {

  $("#add-countdown-button")
    .addEventListener(
      "click",
      () => openCountdownModal()
    );


  $("#countdown-form")
    .addEventListener(
      "submit",
      saveCountdown
    );


  $("#countdown-list")
    .addEventListener(
      "click",
      handleCountdownAction
    );

}


function openCountdownModal() {

  $("#countdown-form").reset();

  openModal("countdown-modal");

  $("#countdown-name").focus();

}


function saveCountdown(event) {

  event.preventDefault();


  const countdown = {

    id: crypto.randomUUID(),

    name:
      $("#countdown-name")
        .value
        .trim(),

    date:
      $("#countdown-date")
        .value

  };


  if (!countdown.name || !countdown.date) {
    return;
  }


  data.countdowns.push(countdown);

  saveData();

  closeModals();

  renderCountdowns();

}


function handleCountdownAction(event) {

  const button =
    event.target.closest(
      "[data-countdown-delete]"
    );

  if (!button) {
    return;
  }


  const id =
    button.dataset.countdownDelete;


  data.countdowns =
    data.countdowns.filter(
      item => item.id !== id
    );


  saveData();

  renderCountdowns();

}


function getDaysUntil(dateString) {

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const target =
    parseDateKey(dateString);

  target.setHours(0, 0, 0, 0);


  return Math.ceil(
    (target - today) /
    (1000 * 60 * 60 * 24)
  );

}


function renderCountdowns() {

  const list =
    $("#countdown-list");

  const empty =
    $("#countdown-empty");


  if (!data.countdowns.length) {

    list.innerHTML = "";

    empty.classList.remove("hidden");

    return;
  }


  empty.classList.add("hidden");


  list.innerHTML =
    data.countdowns.map(countdown => {

      const days =
        getDaysUntil(countdown.date);


      let label;


      if (days < 0) {
        label = "passed";

      } else if (days === 0) {
        label = "today";

      } else if (days === 1) {
        label = "tomorrow";

      } else {
        label = `${days} days`;

      }


      return `

        <div class="countdown-item">

          <span class="countdown-name">
            ${escapeHTML(countdown.name)}
          </span>

          <span class="countdown-days">
            ${escapeHTML(label)}
          </span>

          <button
            class="countdown-delete"
            data-countdown-delete="${escapeHTML(countdown.id)}"
            aria-label="Delete countdown"
          >
            ×
          </button>

        </div>

      `;

    }).join("");

}


/* ============================================================
   STICKY NOTES
   ============================================================ */

function setupNoteControls() {

  $("#add-note-button")
    .addEventListener(
      "click",
      () => openNoteModal()
    );


  document.addEventListener("click", event => {

    const button =
      event.target.closest(
        "[data-action='add-note']"
      );

    if (button) {
      openNoteModal();
    }

  });


  $("#note-form")
    .addEventListener(
      "submit",
      saveNote
    );


  $("#notes-board")
    .addEventListener(
      "click",
      handleNoteAction
    );

}


function openNoteModal(note = null) {

  $("#note-form").reset();

  $("#note-id").value =
    note?.id || "";

  $("#note-title").value =
    note?.title || "";

  $("#note-text").value =
    note?.text || "";

  $("#note-colour").value =
    note?.colour || "blue";


  $("#note-modal-title").textContent =
    note
      ? "Edit note"
      : "New note";


  openModal("note-modal");

  $("#note-text").focus();

}


function saveNote(event) {

  event.preventDefault();


  const id =
    $("#note-id").value;


  const note = {

    id:
      id || crypto.randomUUID(),

    title:
      $("#note-title")
        .value
        .trim(),

    text:
      $("#note-text")
        .value
        .trim(),

    colour:
      $("#note-colour")
        .value,

    rotation:
      id
        ? (
            data.notes.find(
              item => item.id === id
            )?.rotation || 0
          )
        : (Math.random() * 4 - 2)

  };


  if (!note.text) {
    return;
  }


  if (id) {

    const index =
      data.notes.findIndex(
        item => item.id === id
      );


    if (index !== -1) {
      data.notes[index] = note;
    }

  } else {

    data.notes.push(note);

  }


  saveData();

  closeModals();

  renderNotes();

}


function handleNoteAction(event) {

  const button =
    event.target.closest(
      "[data-note-action]"
    );

  if (!button) {
    return;
  }


  const id =
    button.dataset.id;


  if (button.dataset.noteAction === "edit") {

    const note =
      data.notes.find(
        item => item.id === id
      );

    if (note) {
      openNoteModal(note);
    }

  }


  if (button.dataset.noteAction === "delete") {

    data.notes =
      data.notes.filter(
        item => item.id !== id
      );

    saveData();

    renderNotes();

  }

}


function renderNotes() {

  const board =
    $("#notes-board");

  const empty =
    $("#notes-empty");


  if (!data.notes.length) {

    board.innerHTML = "";

    empty.classList.remove("hidden");

    return;
  }


  empty.classList.add("hidden");


  board.innerHTML =
    data.notes.map(note => `

      <article
        class="note-card ${escapeHTML(note.colour)}"
        style="--rotation:${Number(note.rotation || 0)}deg"
      >

        <h3>
          ${escapeHTML(note.title || "Untitled")}
        </h3>

        <p>
          ${escapeHTML(note.text)}
        </p>

        <div class="note-actions">

          <button
            class="small-action"
            data-note-action="edit"
            data-id="${escapeHTML(note.id)}"
            aria-label="Edit note"
          >
            ✎
          </button>

          <button
            class="small-action"
            data-note-action="delete"
            data-id="${escapeHTML(note.id)}"
            aria-label="Delete note"
          >
            ×
          </button>

        </div>

      </article>

    `).join("");

}


/* ============================================================
   COLLECTIONS
   ============================================================ */

function setupCollectionControls() {

  $("#add-collection-button")
    .addEventListener(
      "click",
      () => openCollectionModal()
    );


  document.addEventListener("click", event => {

    const button =
      event.target.closest(
        "[data-action='add-collection']"
      );

    if (button) {
      openCollectionModal();
    }

  });


  $("#collection-form")
    .addEventListener(
      "submit",
      saveCollection
    );


  $("#collection-list")
    .addEventListener(
      "click",
      handleCollectionAction
    );

}


function openCollectionModal() {

  $("#collection-form").reset();

  openModal("collection-modal");

  $("#collection-name").focus();

}


function saveCollection(event) {

  event.preventDefault();


  const collection = {

    id: crypto.randomUUID(),

    name:
      $("#collection-name")
        .value
        .trim(),

    description:
      $("#collection-description")
        .value
        .trim(),

    items: []

  };


  if (!collection.name) {
    return;
  }


  data.collections.push(collection);

  saveData();

  closeModals();

  renderCollections();

}


function handleCollectionAction(event) {

  const button =
    event.target.closest(
      "[data-collection-action]"
    );

  if (!button) {
    return;
  }


  const id =
    button.dataset.id;


  if (
    button.dataset.collectionAction ===
    "delete"
  ) {

    data.collections =
      data.collections.filter(
        item => item.id !== id
      );

    saveData();

    renderCollections();

  }

}


function renderCollections() {

  const list =
    $("#collection-list");

  const empty =
    $("#collection-empty");


  if (!data.collections.length) {

    list.innerHTML = "";

    empty.classList.remove("hidden");

    return;
  }


  empty.classList.add("hidden");


  list.innerHTML =
    data.collections.map(collection => `

      <article class="collection-card">

        <div class="collection-clip">
          ⌇
        </div>

        <p class="section-kicker">
          COLLECTION
        </p>

        <h3>
          ${escapeHTML(collection.name)}
        </h3>

        <p>
          ${escapeHTML(
            collection.description ||
            "A collection of things."
          )}
        </p>

        <p>
          ${collection.items.length} clipped item${collection.items.length === 1 ? "" : "s"}
        </p>

        <button
          class="collection-delete"
          data-collection-action="delete"
          data-id="${escapeHTML(collection.id)}"
        >
          Delete
        </button>

      </article>

    `).join("");

}


/* ============================================================
   FOCUS TIMER
   ============================================================ */

let focusSeconds = 25 * 60;

let focusInterval = null;

let focusRunning = false;


function setupFocusTimer() {

  $("#focus-start")
    .addEventListener(
      "click",
      toggleFocusTimer
    );


  $("#focus-reset")
    .addEventListener(
      "click",
      resetFocusTimer
    );


  renderFocusTimer();

}


function toggleFocusTimer() {

  if (focusRunning) {

    pauseFocusTimer();

  } else {

    startFocusTimer();

  }

}


function startFocusTimer() {

  if (focusSeconds <= 0) {
    resetFocusTimer();
  }


  focusRunning = true;

  $("#focus-start").textContent =
    "Pause";

  $("#focus-status").textContent =
    "FOCUSING";


  focusInterval =
    setInterval(() => {

      focusSeconds--;

      renderFocusTimer();


      if (focusSeconds <= 0) {

        pauseFocusTimer();

        $("#focus-status").textContent =
          "SESSION COMPLETE";

        notifyUser(
          "Focus session complete",
          "You did the thing. Take a break."
        );

      }

    }, 1000);

}


function pauseFocusTimer() {

  focusRunning = false;

  clearInterval(focusInterval);

  focusInterval = null;

  $("#focus-start").textContent =
    "Start";

  $("#focus-status").textContent =
    "PAUSED";

}


function resetFocusTimer() {

  pauseFocusTimer();

  focusSeconds = 25 * 60;

  $("#focus-status").textContent =
    "READY";

  renderFocusTimer();

}


function renderFocusTimer() {

  const minutes =
    Math.floor(focusSeconds / 60);

  const seconds =
    focusSeconds % 60;


  $("#focus-display").textContent =
    `${pad(minutes)}:${pad(seconds)}`;

}


/* ============================================================
   NOTIFICATIONS
   ============================================================ */

function setupNotificationButton() {

  $("#notification-button")
    .addEventListener(
      "click",
      requestNotificationPermission
    );

}


async function requestNotificationPermission() {

  if (!("Notification" in window)) {

    setFooterStatus(
      "Notifications are not supported here."
    );

    return;

  }


  if (
    Notification.permission ===
    "granted"
  ) {

    notifyUser(
      "Paperwork",
      "Notifications are already enabled."
    );

    return;

  }


  try {

    const permission =
      await Notification.requestPermission();


    if (permission === "granted") {

      setFooterStatus(
        "Notifications enabled."
      );

      notifyUser(
        "Paperwork",
        "I'll remind you when tasks start."
      );

    } else {

      setFooterStatus(
        "Notifications were not enabled."
      );

    }

  } catch (error) {

    console.warn(
      "Notification permission failed.",
      error
    );

  }

}


function notifyUser(title, body) {

  if (
    "Notification" in window &&
    Notification.permission === "granted"
  ) {

    new Notification(title, {
      body
    });

  }

}


function checkTaskNotifications() {

  const now = new Date();

  const today =
    dateKey(now);

  const currentTime =
    `${pad(now.getHours())}:${pad(now.getMinutes())}`;


  data.tasks.forEach(task => {

    if (
      task.date !== today ||
      !task.start ||
      task.completed ||
      task.notification
    ) {
      return;
    }

  });

}


/* ============================================================
   MODALS
   ============================================================ */

function openModal(id) {

  const modal =
    document.getElementById(id);

  if (!modal) {
    return;
  }

  modal.classList.remove("hidden");

  document.body.style.overflow =
    "hidden";

}


function closeModals() {

  $$(".modal").forEach(modal => {

    modal.classList.add("hidden");

  });

  document.body.style.overflow =
    "";

}


document.addEventListener("click", event => {

  if (
    event.target.matches(
      "[data-close-modal]"
    )
  ) {

    closeModals();

  }

});


document.addEventListener("keydown", event => {

  if (event.key === "Escape") {
    closeModals();
  }

});


/* ============================================================
   STORAGE SYNC
   ============================================================ */

window.addEventListener(
  "storage",
  event => {

    if (event.key !== STORAGE_KEY) {
      return;
    }

    data = loadData();

    renderEverything();

  }
);