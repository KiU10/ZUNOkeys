
import { lessons, getLesson } from "./lessons.js";

// ELEMENTS
const $ = (id) => document.getElementById(id);

const views = {
    dashboard: $("dashboard-view"),
    lessons: $("lessons-view"),
    practice: $("practice-view")
};

// USER DATA
const savedData = JSON.parse(
    localStorage.getItem("zunokeys-data") || "{}"
);

const userData = {
    xp: savedData.xp || 0,
    completed: savedData.completed || 0,
    bestWpm: savedData.bestWpm || 0
};

// TRAINING STATE
let currentLesson = null;
let currentExercise = 0;
let targetText = "";
let startTime = null;
let finished = false;
let previousInput = "";

// SAVE DATA
function saveData() {
    localStorage.setItem(
        "zunokeys-data",
        JSON.stringify(userData)
    );
}

// NAVIGATION
function showView(viewName) {
    Object.entries(views).forEach(([name, element]) => {
        element.classList.toggle("hidden", name !== viewName);
    });

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === viewName
        );
    });

    const titles = {
        dashboard: "Dashboard",
        lessons: "Lektionen",
        practice: "Training"
    };

    $("page-title").textContent = titles[viewName];
}

// DASHBOARD STATS
function updateDashboard() {
    $("xp").textContent = userData.xp;
    $("total-xp").textContent = userData.xp;
    $("completed-count").textContent = userData.completed;
    $("best-wpm").textContent = userData.bestWpm;
}

// LESSON CARDS
function createLessonCard(lesson) {
    const card = document.createElement("article");
    card.className = "lesson-card";

    const number = document.createElement("span");
    number.className = "lesson-number";
    number.textContent = `LEKTION ${lesson.id}`;

    const title = document.createElement("h3");
    title.textContent = lesson.title;

    const description = document.createElement("p");
    description.textContent = lesson.description;

    const button = document.createElement("button");
    button.className = "primary-button";
    button.textContent = "Lektion starten →";

    button.addEventListener("click", () => {
        startLesson(lesson.id);
    });

    card.append(number, title, description, button);

    return card;
}

function renderLessons() {
    $("dashboard-lessons").replaceChildren();
    $("all-lessons").replaceChildren();

    lessons.forEach(lesson => {
        $("all-lessons").appendChild(
            createLessonCard(lesson)
        );
    });

    lessons.slice(0, 3).forEach(lesson => {
        $("dashboard-lessons").appendChild(
            createLessonCard(lesson)
        );
    });
}

// START LESSON
function startLesson(lessonId) {
    currentLesson = getLesson(lessonId);

    if (!currentLesson) return;

    currentExercise = 0;

    $("training-label").textContent =
        `LEKTION ${currentLesson.id}`;

    $("training-title").textContent =
        currentLesson.title;

    $("training-description").textContent =
        currentLesson.description;

    showView("practice");
    loadExercise();
}

// LOAD EXERCISE
function loadExercise() {
    targetText = currentLesson.exercises[currentExercise];

    startTime = null;
    finished = false;
    previousInput = "";

    $("typing-input").value = "";
    $("typing-input").disabled = false;

    $("exercise-number").textContent =
        `Übung ${currentExercise + 1} / ${currentLesson.exercises.length}`;

    $("wpm").textContent = "0";
    $("accuracy").textContent = "100%";
    $("errors").textContent = "0";

    $("next-button").disabled = true;
    $("completion-message").classList.add("hidden");

    renderTypingText("");
    $("typing-input").focus();
}

// RENDER TYPING TEXT
function renderTypingText(typedText) {
    const display = $("text-display");
    display.replaceChildren();

    for (let i = 0; i < targetText.length; i++) {
        const character = document.createElement("span");
        character.textContent = targetText[i];

        if (i < typedText.length) {
            if (typedText[i] === targetText[i]) {
                character.className = "correct";
            } else {
                character.className = "incorrect";
            }
        } else if (i === typedText.length) {
            character.className = "current";
        } else {
            character.className = "pending";
        }

        display.appendChild(character);
    }
}

// TYPING ENGINE
function handleTyping() {
    const input = $("typing-input");
    let typedText = input.value;

    // Do not allow typing beyond the target
    if (typedText.length > targetText.length) {
        typedText = typedText.slice(0, targetText.length);
        input.value = typedText;
    }

    if (typedText.length > 0 && !startTime) {
        startTime = Date.now();
    }

    previousInput = typedText;

    const correctCharacters = [...typedText].filter(
        (char, index) => char === targetText[index]
    ).length;

    const errorCount = [...typedText].filter(
        (char, index) => char !== targetText[index]
    ).length;

    const accuracy = typedText.length > 0
        ? Math.round(
            (correctCharacters / typedText.length) * 100
        )
        : 100;

    let wpm = 0;

    if (startTime) {
        const elapsedMinutes =
            (Date.now() - startTime) / 60000;

        if (elapsedMinutes > 0) {
            wpm = Math.round(
                (correctCharacters / 5) / elapsedMinutes
            );
        }
    }

    $("wpm").textContent = wpm;
    $("accuracy").textContent = `${accuracy}%`;
    $("errors").textContent = errorCount;

    renderTypingText(typedText);

    if (typedText === targetText) {
        completeExercise(wpm);
    }
}

// COMPLETE EXERCISE
function completeExercise(wpm) {
    if (finished) return;

    finished = true;

    $("typing-input").disabled = true;
    $("next-button").disabled = false;

    $("completion-message").classList.remove("hidden");

    userData.xp += 10;
    userData.completed += 1;
    userData.bestWpm = Math.max(userData.bestWpm, wpm);

    updateDashboard();
    saveData();
}

// NEXT EXERCISE

function nextExercise() {
    if (!finished) return;

    currentExercise++;

    if (currentExercise < currentLesson.exercises.length) {
        $("next-button").textContent = "Weiter →";
        loadExercise();
    } else {
        $("completion-message").textContent =
            "🏆 Lektion abgeschlossen! Großartige Arbeit!";

        $("next-button").textContent = "Zum Dashboard →";

        $("next-button").onclick = () => {
            $("next-button").onclick = null;
            $("next-button").textContent = "Weiter →";
            showView("dashboard");
        };
    }
}


// FREE PRACTICE
function startFreePractice() {
    currentLesson = {
        id: 0,
        title: "Freies Training",
        description: "Übe in deinem eigenen Tempo.",
        exercises: [
            "the quick brown fox jumps over the lazy dog"
        ]
    };

    currentExercise = 0;

    $("training-label").textContent = "FREIES TRAINING";
    $("training-title").textContent = currentLesson.title;
    $("training-description").textContent =
        currentLesson.description;

    showView("practice");
    loadExercise();
}

// EVENT LISTENERS
document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => {
        const view = button.dataset.view;

        if (view === "practice") {
            startFreePractice();
        } else {
            showView(view);
        }
    });
});

$("continue-button").addEventListener("click", () => {
    startLesson(1);
});

$("typing-input").addEventListener("input", handleTyping);

$("restart-button").addEventListener("click", () => {
    loadExercise();
});

$("next-button").addEventListener("click", nextExercise);

$("back-button").addEventListener("click", () => {
    showView("lessons");
});

// INITIALIZATION
renderLessons();
updateDashboard();
showView("dashboard");

