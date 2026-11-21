
import { lessons, getLesson } from "./lessons.js";
import { PASS_REWARDS, getPassLevel } from "./pass.js";

const $ = id => document.getElementById(id);

const views = {
    dashboard: $("dashboard-view"),
    lessons: $("lessons-view"),
    practice: $("practice-view"),
    game: $("game-view")
};

const STORAGE_KEY = "zunokeys-data";

// ------------------------------------
// USER DATA
// ------------------------------------

let oldData = {};

try {
    oldData = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
} catch (error) {
    console.error("Could not load saved data:", error);
}

const userData = {
    xp: oldData.xp || 0,
    completed: oldData.completed || 0,
    bestWpm: oldData.bestWpm || 0,
    accuracyTotal: oldData.accuracyTotal || 0,
    accuracyCount: oldData.accuracyCount || 0,
    startedLessons: oldData.startedLessons || [],
    completedLessons: oldData.completedLessons || [],
    lessonProgress: oldData.lessonProgress || {},
    keyStats: oldData.keyStats || {},
    highscore: oldData.highscore || 0,
    streak: oldData.streak || 0,
    lastActiveDate: oldData.lastActiveDate || null
};

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
}

// ------------------------------------
// NAVIGATION
// ------------------------------------

function showView(name) {
    Object.entries(views).forEach(([key, element]) => {
        element.classList.toggle("active", key === name);
    });

    document.querySelectorAll(".nav-button").forEach(button => {
        button.classList.toggle("active", button.dataset.view === name);
    });

    const titles = {
        dashboard: "Dashboard",
        lessons: "Lektionen",
        practice: "Freies Training",
        game: "Letter Rush"
    };

    $("page-title").textContent = titles[name] || name;
}

document.querySelectorAll(".nav-button").forEach(button => {
    button.addEventListener("click", () => {
        const view = button.dataset.view;

        if (view === "practice") {
            showView("practice");
            $("practice-training-panel").classList.remove("visible");
        } else {
            showView(view);
        }
    });
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
        showView(button.dataset.go);
    });
});

// ------------------------------------
// DASHBOARD
// ------------------------------------

function updateDashboard() {
    $("total-xp").textContent = `${userData.xp} XP`;
    $("header-xp").textContent = `${userData.xp} XP`;
    $("header-streak").textContent = userData.streak;
    $("completed-count").textContent = userData.completed;
    $("best-wpm").textContent = `${userData.bestWpm} WPM`;

    const averageAccuracy = userData.accuracyCount
        ? Math.round(userData.accuracyTotal / userData.accuracyCount)
        : 0;

    $("overall-accuracy").textContent = `${averageAccuracy}%`;

    const level = getPassLevel(userData.xp);

    $("profile-level").textContent =
        level === 0
            ? "Season Pass · Level 0"
            : `Season Pass · Level ${level}`;

    const profileTitle = document.querySelector(".profile-card strong");

    if (profileTitle) {
        profileTitle.textContent = userData.streak >= 10
            ? "Dedicated"
            : userData.streak >= 3
                ? "Starting out!"
                : "ZUNO Learner";
    }

    $("game-highscore").textContent = userData.highscore;

    renderKeyMastery();
}

// ------------------------------------
// LESSONS
// ------------------------------------

function createLessonCard(lesson) {
    const card = document.createElement("article");
    card.className = "lesson-card";

    const started = userData.startedLessons.includes(lesson.id);
    const completed = userData.completedLessons.includes(lesson.id);

    if (started) card.classList.add("started");
    if (completed) card.classList.add("completed");

    const number = document.createElement("span");
    number.className = "lesson-number";
    number.textContent = `LEKTION ${lesson.id}`;

    const title = document.createElement("h3");
    title.textContent = lesson.title;

    const description = document.createElement("p");
    description.textContent = lesson.description;

    const button = document.createElement("button");
    button.className = "primary-button";
    button.textContent = completed
        ? "Wiederholen →"
        : "Lektion starten →";

    button.addEventListener("click", () => startLesson(lesson.id));

    card.append(number, title, description, button);

    return card;
}

function renderLessons() {
    $("dashboard-lessons").replaceChildren();
    $("all-lessons").replaceChildren();

    lessons.forEach(lesson => {
        $("all-lessons").appendChild(createLessonCard(lesson));
    });

    lessons.slice(0, 3).forEach(lesson => {
        $("dashboard-lessons").appendChild(createLessonCard(lesson));
    });
}

// ------------------------------------
// KEY MASTERY
// ------------------------------------

function renderKeyMastery() {
    const container = $("key-mastery");
    container.replaceChildren();

    const keys = "abcdefghijklmnopqrstuvwxyzäöüß".split("");

    keys.forEach(key => {
        const stats = userData.keyStats[key] || {
            attempts: 0,
            errors: 0
        };

        const tile = document.createElement("div");
        tile.className = "key-tile";
        tile.textContent = key.toUpperCase();

        if (stats.attempts >= 5) {
            const accuracy = 1 - stats.errors / stats.attempts;

            if (accuracy >= 0.95) {
                tile.classList.add("mastered");
            } else {
                tile.classList.add("learning");
            }
        } else if (stats.attempts > 0) {
            tile.classList.add("learning");
        }

        container.appendChild(tile);
    });
}

// ------------------------------------
// TRAINING STATE
// ------------------------------------

let currentLesson = null;
let currentExercise = 0;
let targetText = "";
let startTime = null;
let finished = false;
let previousInput = "";
let trainingMode = "lesson";
let currentWpm = 0;
let currentAccuracy = 100;

const typingInput = $("typing-input");

// ------------------------------------
// START LESSON
// ------------------------------------

function startLesson(lessonId) {
    currentLesson = getLesson(lessonId);

    if (!currentLesson) return;

    trainingMode = "lesson";

    const completed = userData.completedLessons.includes(lessonId);
    const savedProgress = Number(userData.lessonProgress[lessonId]) || 0;

    currentExercise = completed
        ? 0
        : Math.min(savedProgress, currentLesson.exercises.length - 1);

    if (!userData.startedLessons.includes(lessonId)) {
        userData.startedLessons.push(lessonId);
    }

    userData.lessonProgress[lessonId] = currentExercise;

    saveData();
    renderLessons();
    updateDashboard();

    $("training-label").textContent = `LEKTION ${lessonId}`;
    $("training-title").textContent = currentLesson.title;
    $("training-description").textContent = currentLesson.description;

    $("practice-training-panel").classList.add("visible");

    showView("practice");
    loadExercise();
}

// ------------------------------------
// AUTO CONTINUE
// ------------------------------------

function continueLearning() {
    lessons.forEach(lesson => {
        const progress = Number(userData.lessonProgress[lesson.id]) || 0;

        if (
            progress >= lesson.exercises.length &&
            !userData.completedLessons.includes(lesson.id)
        ) {
            userData.completedLessons.push(lesson.id);
        }
    });

    saveData();

    const nextLesson = lessons.find(
        lesson => !userData.completedLessons.includes(lesson.id)
    );

    if (!nextLesson) {
        showView("dashboard");
        alert("🏆 Du hast alle Lektionen abgeschlossen! Großartige Arbeit!");
        return;
    }

    startLesson(nextLesson.id);
}

$("continue-button").addEventListener("click", continueLearning);

// ------------------------------------
// LOAD EXERCISE
// ------------------------------------

function loadExercise() {
    if (!currentLesson) return;

    targetText = currentLesson.exercises[currentExercise];

    startTime = null;
    finished = false;
    previousInput = "";
    currentWpm = 0;
    currentAccuracy = 100;

    typingInput.value = "";
    typingInput.disabled = false;
    typingInput.focus();

    $("exercise-number").textContent =
        `Übung ${currentExercise + 1} / ${currentLesson.exercises.length}`;

    $("exercise-progress-label").textContent =
        `${Math.round(
            currentExercise / currentLesson.exercises.length * 100
        )}%`;

    $("live-wpm").textContent = "0 WPM";
    $("live-accuracy").textContent = "100%";
    $("live-errors").textContent = "0";

    $("next-button").disabled = true;
    $("next-button").textContent = "Weiter →";

    $("completion-message").textContent = "";

    renderTypingText("");
}

// ------------------------------------
// DISPLAY TEXT
// ------------------------------------

function renderTypingText(typedText) {
    const display = $("text-display");
    display.replaceChildren();

    for (let i = 0; i < targetText.length; i++) {
        const character = document.createElement("span");
        character.textContent = targetText[i];

        if (i < typedText.length) {
            character.className =
                typedText[i] === targetText[i]
                    ? "correct"
                    : "incorrect";
        } else if (i === typedText.length) {
            character.className = "current";
        } else {
            character.className = "pending";
        }

        display.appendChild(character);
    }
}

// ------------------------------------
// STRICT TYPING
// ------------------------------------

typingInput.addEventListener("keydown", event => {
    if (finished) return;

    if (
        event.key === "Backspace" ||
        event.key === "Delete" ||
        event.key === "Insert"
    ) {
        event.preventDefault();
        return;
    }

    if (typingInput.selectionStart !== typingInput.selectionEnd) {
        event.preventDefault();
    }

    if (
        (event.ctrlKey || event.metaKey) &&
        ["v", "x", "a"].includes(event.key.toLowerCase())
    ) {
        event.preventDefault();
    }
});

typingInput.addEventListener("paste", event => event.preventDefault());
typingInput.addEventListener("cut", event => event.preventDefault());
typingInput.addEventListener("drop", event => event.preventDefault());

typingInput.addEventListener("input", handleTyping);

// ------------------------------------
// GLOBAL SPACEBAR
// ------------------------------------

function exitTraining() {
    $("practice-training-panel").classList.remove("visible");
    showView("dashboard");
}

document.addEventListener("keydown", event => {
    if (
        event.code !== "Space" ||
        event.repeat ||
        !finished ||
        !$("practice-training-panel").classList.contains("visible")
    ) {
        return;
    }

    event.preventDefault();

    if ($("next-button").textContent === "Zum Dashboard →") {
        exitTraining();
    } else {
        nextExercise();
    }
});

// ------------------------------------
// HANDLE TYPING
// ------------------------------------

function handleTyping() {
    if (finished) return;

    const input = typingInput;
    let typedText = input.value;

    if (
        typedText.length < previousInput.length ||
        !typedText.startsWith(previousInput)
    ) {
        input.value = previousInput;
        return;
    }

    if (typedText.length > targetText.length) {
        typedText = typedText.slice(0, targetText.length);
        input.value = typedText;
    }

    if (typedText.length > 0 && !startTime) {
        startTime = Date.now();
    }

    const previousLength = previousInput.length;
    previousInput = typedText;

    let correctCharacters = 0;
    let errors = 0;

    for (let i = 0; i < typedText.length; i++) {
        if (typedText[i] === targetText[i]) {
            correctCharacters++;
        } else {
            errors++;
        }
    }

    if (typedText.length > previousLength) {
        const newIndex = typedText.length - 1;
        const key = targetText[newIndex].toLowerCase();

        if (/^[a-zäöüß]$/.test(key)) {
            if (!userData.keyStats[key]) {
                userData.keyStats[key] = {
                    attempts: 0,
                    errors: 0
                };
            }

            userData.keyStats[key].attempts++;

            if (typedText[newIndex] !== targetText[newIndex]) {
                userData.keyStats[key].errors++;
            }
        }
    }

    currentAccuracy = typedText.length
        ? Math.round(correctCharacters / typedText.length * 100)
        : 100;

    currentWpm = 0;

    if (startTime) {
        const elapsedMinutes = (Date.now() - startTime) / 60000;

        if (elapsedMinutes > 0) {
            currentWpm = Math.round(
                (correctCharacters / 5) / elapsedMinutes
            );
        }
    }

    $("live-wpm").textContent = `${currentWpm} WPM`;
    $("live-accuracy").textContent = `${currentAccuracy}%`;
    $("live-errors").textContent = errors;

    renderTypingText(typedText);

    if (typedText.length === targetText.length) {
        completeExercise();
    }
}

// ------------------------------------
// DAILY STREAK
// ------------------------------------

function recordDailyStreak() {
    const today = new Date();

    const todayKey =
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    if (userData.lastActiveDate === todayKey) return;

    if (userData.lastActiveDate) {
        const previous = new Date(`${userData.lastActiveDate}T00:00:00`);
        const current = new Date(`${todayKey}T00:00:00`);

        const daysBetween = Math.round(
            (current - previous) / 86400000
        );

        userData.streak = daysBetween === 1
            ? userData.streak + 1
            : 1;
    } else {
        userData.streak = Math.max(1, userData.streak);
    }

    userData.lastActiveDate = todayKey;
}

// ------------------------------------
// COMPLETE EXERCISE
// ------------------------------------

function completeExercise() {
    if (finished) return;

    finished = true;
    recordDailyStreak();
    typingInput.disabled = true;

    const isLastExercise =
        currentExercise === currentLesson.exercises.length - 1;

    $("next-button").disabled = false;

    if (isLastExercise) {
        $("next-button").textContent = "Zum Dashboard →";

        $("completion-message").textContent =
            trainingMode === "lesson"
                ? "🏆 Lektion abgeschlossen! Leertaste zum Dashboard."
                : "🎉 Alle Übungen geschafft! Leertaste zum Dashboard.";
    } else {
        $("next-button").textContent = "Weiter →";

        $("completion-message").textContent =
            `✓ Übung geschafft! ${currentAccuracy}% Genauigkeit · Leertaste zum Weitermachen`;
    }

    userData.xp += currentAccuracy >= 95 ? 10 : 5;
    userData.completed++;
    userData.bestWpm = Math.max(userData.bestWpm, currentWpm);
    userData.accuracyTotal += currentAccuracy;
    userData.accuracyCount++;

    if (trainingMode === "lesson") {
        userData.lessonProgress[currentLesson.id] = currentExercise + 1;

        if (
            isLastExercise &&
            !userData.completedLessons.includes(currentLesson.id)
        ) {
            userData.completedLessons.push(currentLesson.id);
        }
    }

    saveData();
    renderLessons();
    updateDashboard();
}

// ------------------------------------
// NEXT EXERCISE
// ------------------------------------

function nextExercise() {
    if (!finished || !currentLesson) return;

    if (currentExercise < currentLesson.exercises.length - 1) {
        currentExercise++;

        if (trainingMode === "lesson") {
            userData.lessonProgress[currentLesson.id] = currentExercise;
            saveData();
        }

        loadExercise();
        return;
    }

    exitTraining();
}

$("next-button").addEventListener("click", nextExercise);

$("restart-button").addEventListener("click", () => {
    loadExercise();
});

$("back-button").addEventListener("click", () => {
    $("practice-training-panel").classList.remove("visible");
    showView("lessons");
});

// ------------------------------------
// FREE PRACTICE
// ------------------------------------

const freeExercises = {
    easy: [
        "Haus Baum Katze Hund",
        "Sonne Mond Sterne Wolken",
        "Apfel Banane Birne Erdbeere",
        "Schule Bücher Hefte Stifte",
        "Wasser Feuer Erde Luft"
    ],

    medium: [
        "Heute ist ein schöner Tag.",
        "Der Hund läuft durch den Garten.",
        "Ich spiele gerne Fußball.",
        "Morgen gehe ich wieder zur Schule.",
        "Nach der Schule mache ich meine Hausaufgaben."
    ],

    hard: [
        "Übung macht den Meister, also bleib konzentriert!",
        "Könntest du mir bitte das Wörterbuch geben?",
        "Wenn ich ein Ziel habe, arbeite ich Schritt für Schritt darauf hin.",
        "Man sollte nicht aufgeben, nur weil etwas am Anfang schwierig ist.",
        "Jeder kleine Fortschritt bringt dich deinem nächsten Ziel näher."
    ]
};

$("start-practice-button").addEventListener("click", () => {
    const difficulty = $("practice-difficulty").value;
    const exercises = [...freeExercises[difficulty]];

    exercises.sort(() => Math.random() - 0.5);

    currentLesson = {
        id: 0,
        title: "Freies Training",
        description: "Trainiere mit deutschen Texten.",
        exercises
    };

    trainingMode = "free";
    currentExercise = 0;

    $("training-label").textContent = "FREIES TRAINING";
    $("training-title").textContent = "Freies Training";
    $("training-description").textContent =
        "Tippe den angezeigten Text möglichst genau ab.";

    $("practice-training-panel").classList.add("visible");

    showView("practice");
    loadExercise();
});

// ------------------------------------
// LETTER RUSH
// ------------------------------------

let gameActive = false;
let gameScore = 0;
let gameLevel = 1;
let gameLives = 3;
let gameLetters = [];
let gameSpawnTimer = null;
let gameLoopTimer = null;

const gameArena = $("game-arena");

function updateGameStats() {
    $("game-score").textContent = gameScore;
    $("game-level").textContent = gameLevel;
    $("game-lives").textContent = gameLives;
    $("game-highscore").textContent = userData.highscore;
}

function spawnGameLetter() {
    if (!gameActive) return;

    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    const letter = alphabet[
        Math.floor(Math.random() * alphabet.length)
    ];

    const element = document.createElement("div");
    element.className = "game-letter";
    element.textContent = letter.toUpperCase();

    const x = 7 + Math.random() * 86;
    element.style.left = `${x}%`;

    gameArena.appendChild(element);

    gameLetters.push({
        letter,
        element,
        y: 0,
        speed: 1.1 + gameLevel * 0.25
    });
}

function startGame() {
    stopGame();

    gameActive = true;
    gameScore = 0;
    gameLevel = 1;
    gameLives = 3;
    gameLetters = [];

    $("game-overlay").style.display = "none";
    $("game-status").textContent = "SPIEL LÄUFT";
    $("game-hint").textContent = "Tippe die fallenden Buchstaben!";

    updateGameStats();

    gameSpawnTimer = setInterval(spawnGameLetter, 1100);

    gameLoopTimer = setInterval(() => {
        for (let i = gameLetters.length - 1; i >= 0; i--) {
            const item = gameLetters[i];

            item.y += item.speed;
            item.element.style.top = `${item.y}px`;

            if (item.y > gameArena.clientHeight - 35) {
                item.element.remove();
                gameLetters.splice(i, 1);

                gameLives--;
                updateGameStats();

                if (gameLives <= 0) {
                    endGame();
                    break;
                }
            }
        }
    }, 35);
}

function stopGame() {
    gameActive = false;

    clearInterval(gameSpawnTimer);
    clearInterval(gameLoopTimer);

    gameLetters.forEach(item => item.element.remove());
    gameLetters = [];
}

function endGame() {
    stopGame();

    if (gameScore > userData.highscore) {
        userData.highscore = gameScore;
        saveData();
    }

    updateGameStats();

    $("game-status").textContent = "SPIEL BEENDET";
    $("game-hint").textContent =
        `Du hast ${gameScore} Punkte erreicht.`;

    $("game-overlay-title").textContent = "Game Over!";
    $("game-overlay-text").textContent =
        `Dein Ergebnis: ${gameScore} Punkte.`;

    $("game-start-button").textContent = "Nochmal spielen →";
    $("game-overlay").style.display = "grid";
}

$("game-start-button").addEventListener("click", startGame);

document.addEventListener("keydown", event => {
    if (!gameActive) return;

    if (event.ctrlKey || event.metaKey || event.altKey) return;

    const key = event.key.toLowerCase();

    if (!/^[a-z]$/.test(key)) return;

    const index = gameLetters.findIndex(item => item.letter === key);

    if (index === -1) return;

    const item = gameLetters[index];

    item.element.remove();
    gameLetters.splice(index, 1);

    gameScore += 10;
    gameLevel = Math.floor(gameScore / 100) + 1;

    updateGameStats();
});

// ------------------------------------
// ZUNO SEASON PASS
// ------------------------------------

const passStyle = document.createElement("style");

passStyle.textContent = `
.pass-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: none;
    overflow-y: auto;
    padding: 28px 18px;
    background: rgba(8, 7, 15, .88);
    backdrop-filter: blur(12px);
}

.pass-overlay.visible {
    display: block;
}

.pass-window {
    width: min(1180px, 100%);
    margin: 24px auto;
    padding: 28px;
    color: var(--text);
    background: linear-gradient(145deg, #211d32, #151320 72%);
    border: 1px solid #39324e;
    border-radius: 20px;
    box-shadow: 0 25px 90px rgba(0,0,0,.5);
}

.pass-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 18px;
    margin-bottom: 24px;
}

.pass-kicker {
    color: #a997ff;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 2px;
}

.pass-top h2 {
    font-size: clamp(25px, 4vw, 36px);
    margin: 7px 0;
}

.pass-top p {
    color: var(--muted);
    font-size: 12px;
}

.pass-close {
    flex: 0 0 auto;
    width: 38px;
    height: 38px;
    color: white;
    background: #302b43;
    border-radius: 10px;
    font-size: 21px;
}

.pass-progress-panel {
    padding: 18px 20px;
    margin-bottom: 26px;
    background: linear-gradient(100deg, #453777, #29233e);
    border: 1px solid #6754a8;
    border-radius: 14px;
}

.pass-progress-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    font-size: 12px;
}

.pass-progress-head strong {
    font-size: 14px;
}

.pass-progress-head span {
    color: #d1c9f0;
}

.pass-progress-track {
    height: 9px;
    overflow: hidden;
    background: rgba(0,0,0,.3);
    border-radius: 20px;
}

.pass-progress-fill {
    width: 0;
    height: 100%;
    background: linear-gradient(90deg, #9d8aff, #d6caff);
    border-radius: inherit;
    transition: width .3s ease;
}

.pass-next-info {
    margin-top: 10px;
    color: #ded7f5;
    font-size: 11px;
}

.pass-rail-scroll {
    overflow-x: auto;
    padding: 18px 4px 28px;
    scrollbar-color: #6956ad #211d32;
}

.pass-rail {
    position: relative;
    display: grid;
    grid-template-columns: repeat(10, 154px);
    gap: 10px;
    min-width: max-content;
    padding: 0 8px;
}

.pass-rail::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 34px;
    right: 34px;
    height: 7px;
    transform: translateY(-50%);
    background: linear-gradient(90deg, #7760d7, #4c426d);
    border: 1px solid #8c79ed;
    border-radius: 20px;
    box-shadow: 0 0 18px rgba(139,117,255,.3);
}

.pass-stop {
    position: relative;
    z-index: 1;
    display: flex;
    min-height: 330px;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    text-align: center;
}

.pass-stop:nth-child(even) {
    flex-direction: column-reverse;
}

.pass-reward-card {
    width: 145px;
    min-height: 124px;
    padding: 12px 9px;
    background: #242033;
    border: 1px solid #48415f;
    border-radius: 12px;
    transition: .2s ease;
}

.pass-reward-card.unlocked {
    background: linear-gradient(145deg, #37305a, #242033);
    border-color: #a18cff;
    box-shadow: 0 0 18px rgba(139,117,255,.17);
}

.pass-reward-card.current {
    border-color: #e2c77b;
    box-shadow: 0 0 18px rgba(226,199,123,.22);
}

.pass-reward-icon {
    display: block;
    margin-bottom: 7px;
    font-size: 25px;
}

.pass-reward-card h3 {
    font-size: 11px;
    margin-bottom: 6px;
}

.pass-reward-card p {
    min-height: 28px;
    color: var(--muted);
    font-size: 10px;
    line-height: 1.4;
}

.pass-reward-status {
    display: block;
    margin-top: 8px;
    color: #bdb3e9;
    font-size: 9px;
    font-weight: 800;
}

.pass-reward-card.unlocked .pass-reward-status {
    color: #a8ffb1;
}

.pass-node {
    display: grid;
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    place-items: center;
    color: #c9c0e9;
    background: #302a45;
    border: 3px solid #7160b5;
    border-radius: 50%;
    box-shadow: 0 0 0 5px #1c1929;
    font-size: 12px;
    font-weight: 900;
}

.pass-stop.unlocked .pass-node {
    color: #171322;
    background: #c4b5ff;
    border-color: #e1d9ff;
}

.pass-stop.current .pass-node {
    background: #f1d78f;
    border-color: #fff0c2;
    color: #211a2d;
    box-shadow: 0 0 0 5px #1c1929, 0 0 20px rgba(241,215,143,.55);
}

.pass-xp-label {
    position: absolute;
    top: calc(50% + 31px);
    width: 100%;
    color: #d4c9ff;
    font-size: 10px;
    font-weight: 800;
}

.pass-stop:nth-child(even) .pass-xp-label {
    top: auto;
    bottom: calc(50% + 31px);
}

.pass-footer-note {
    margin-top: 12px;
    color: var(--muted);
    font-size: 10px;
    text-align: center;
}

.profile-card {
    cursor: pointer;
}

.profile-card:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 5px;
    border-radius: 8px;
}

@media (max-width: 600px) {
    .pass-window {
        padding: 20px 14px;
        margin: 5px auto;
    }

    .pass-top h2 {
        font-size: 25px;
    }

    .pass-progress-head {
        flex-direction: column;
    }
}
`;

document.head.appendChild(passStyle);

const passOverlay = document.createElement("div");
passOverlay.className = "pass-overlay";
passOverlay.id = "zuno-pass-overlay";

passOverlay.innerHTML = `
    <section class="pass-window" role="dialog" aria-modal="true" aria-labelledby="pass-title">

        <div class="pass-top">
            <div>
                <span class="pass-kicker">ZUNOkeys · SEASON 1</span>
                <h2 id="pass-title">Season Pass</h2>
                <p>Sammle XP und schalte Belohnungen entlang des Fortschritts-Strahls frei.</p>
            </div>

            <button class="pass-close" id="pass-close" aria-label="Pass schließen">
                ×
            </button>
        </div>

        <div class="pass-progress-panel">
            <div class="pass-progress-head">
                <strong id="pass-current-level">Level 0</strong>
                <span id="pass-xp-text">0 XP insgesamt</span>
            </div>

            <div class="pass-progress-track">
                <div class="pass-progress-fill" id="pass-progress-fill"></div>
            </div>

            <p class="pass-next-info" id="pass-next-info"></p>
        </div>

        <div class="pass-rail-scroll">
            <div class="pass-rail" id="pass-rail"></div>
        </div>

        <p class="pass-footer-note">
            Jede Belohnung bleibt dauerhaft freigeschaltet. XP werden nicht ausgegeben.
        </p>

    </section>
`;

document.body.appendChild(passOverlay);

const passRewardIcons = {
    badge: "🏅",
    keyboard: "⌨️",
    title: "✦",
    "pass-background": "🎨",
    "profile-frame": "🖼️",
    "profile-accent": "✨"
};

// ------------------------------------
// RENDER SEASON PASS
// ------------------------------------

function renderSeasonPass() {
    const nextReward = PASS_REWARDS.find(
        reward => userData.xp < reward.xp
    );

    const currentLevel = getPassLevel(userData.xp);

    const currentThreshold = currentLevel === 0
        ? 0
        : PASS_REWARDS[currentLevel - 1].xp;

    const targetXP = nextReward ? nextReward.xp : 10000;

    const progressPercent = nextReward
        ? Math.max(
            0,
            Math.min(
                100,
                ((userData.xp - currentThreshold) /
                    (targetXP - currentThreshold)) * 100
            )
        )
        : 100;

    $("pass-current-level").textContent = currentLevel >= 10
        ? "Level 10 · ZUNO Legend"
        : `Level ${currentLevel} erreicht`;

    $("pass-xp-text").textContent =
        `${userData.xp.toLocaleString("de-DE")} XP insgesamt`;

    $("pass-progress-fill").style.width =
        `${progressPercent}%`;

    $("pass-next-info").textContent = nextReward
        ? `Noch ${(nextReward.xp - userData.xp).toLocaleString("de-DE")} XP bis Level ${nextReward.level} · Belohnung: ${nextReward.reward}`
        : "🏆 Season Pass abgeschlossen! Alle Belohnungen freigeschaltet.";

    const rail = $("pass-rail");
    rail.replaceChildren();

    PASS_REWARDS.forEach(reward => {
        const unlocked = userData.xp >= reward.xp;
        const isNext = !unlocked && nextReward &&
            reward.level === nextReward.level;

        const stop = document.createElement("div");

        stop.className =
            `pass-stop${unlocked ? " unlocked" : ""}${isNext ? " current" : ""}`;

        const card = document.createElement("div");

        card.className =
            `pass-reward-card${unlocked ? " unlocked" : ""}${isNext ? " current" : ""}`;

        const icon = document.createElement("span");
        icon.className = "pass-reward-icon";
        icon.textContent = passRewardIcons[reward.type] || "🎁";

        const title = document.createElement("h3");
        title.textContent = `LEVEL ${reward.level} · ${reward.name}`;

        const description = document.createElement("p");
        description.textContent = reward.reward;

        const status = document.createElement("span");
        status.className = "pass-reward-status";

        status.textContent = unlocked
            ? "✓ FREIGESCHALTET"
            : `${(reward.xp - userData.xp).toLocaleString("de-DE")} XP FEHLEN`;

        card.append(icon, title, description, status);

        const node = document.createElement("div");
        node.className = "pass-node";
        node.textContent = unlocked ? "✓" : reward.level;

        const xpLabel = document.createElement("span");
        xpLabel.className = "pass-xp-label";
        xpLabel.textContent =
            `${reward.xp.toLocaleString("de-DE")} XP`;

        stop.append(card, node, xpLabel);
        rail.appendChild(stop);
    });
}

// ------------------------------------
// OPEN / CLOSE PASS
// ------------------------------------

function openSeasonPass() {
    renderSeasonPass();
    passOverlay.classList.add("visible");
}

function closeSeasonPass() {
    passOverlay.classList.remove("visible");
}

$("pass-close").addEventListener("click", closeSeasonPass);

passOverlay.addEventListener("click", event => {
    if (event.target === passOverlay) {
        closeSeasonPass();
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeSeasonPass();
    }
});

const profileCard = document.querySelector(".profile-card");

if (profileCard) {
    profileCard.setAttribute("tabindex", "0");
    profileCard.setAttribute("role", "button");
    profileCard.setAttribute("aria-label", "ZUNO Season Pass öffnen");

    profileCard.addEventListener("click", openSeasonPass);

    profileCard.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openSeasonPass();
        }
    });
}

// ------------------------------------
// INITIALIZATION
// ------------------------------------

renderLessons();
updateDashboard();
showView("dashboard");
