
import { lessons, getLesson } from "./lessons.js";

const $ = id => document.getElementById(id);

const views = {
    dashboard: $("dashboard-view"),
    lessons: $("lessons-view"),
    practice: $("practice-view"),
    game: $("game-view")
};

const STORAGE_KEY = "zunokeys-data";

const oldData = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

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
    streak: oldData.streak || 0
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

    const level = Math.floor(userData.xp / 100) + 1;
    $("profile-level").textContent = `Level ${level} · ${getLevelName(level)}`;

    $("game-highscore").textContent = userData.highscore;

    renderKeyMastery();
}

function getLevelName(level) {
    if (level >= 10) return "Profi";
    if (level >= 5) return "Fortgeschritten";
    if (level >= 2) return "Geübt";
    return "Anfänger";
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

    const status = document.createElement("div");
    status.className = "lesson-status";

    if (completed) {
        status.textContent = "✓ ABGESCHLOSSEN";
    } else if (started) {
        status.textContent = "● ANGEFANGEN";
    }

    const button = document.createElement("button");
    button.className = "primary-button";
    button.textContent = completed ? "Wiederholen →" : "Lektion starten →";

    button.addEventListener("click", () => startLesson(lesson.id));

    card.append(number, title, description);

    if (status.textContent) card.append(status);

    card.append(button);

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
        const stats = userData.keyStats[key] || { attempts: 0, errors: 0 };

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

function startLesson(lessonId) {
    currentLesson = getLesson(lessonId);

    if (!currentLesson) return;

    trainingMode = "lesson";
    currentExercise = 0;

    if (!userData.startedLessons.includes(lessonId)) {
        userData.startedLessons.push(lessonId);
    }

    userData.lessonProgress[lessonId] = 0;

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

    const input = $("typing-input");

    input.value = "";
    input.disabled = false;
    input.focus();

    $("exercise-number").textContent =
        `Übung ${currentExercise + 1} / ${currentLesson.exercises.length}`;

    $("exercise-progress-label").textContent =
        `${Math.round(currentExercise / currentLesson.exercises.length * 100)}%`;

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
                typedText[i] === targetText[i] ? "correct" : "incorrect";
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

const typingInput = $("typing-input");

typingInput.addEventListener("keydown", event => {
    if (finished) {
        if (event.code === "Space") {
            event.preventDefault();
            nextExercise();
        }
        return;
    }

    // No deleting or replacing previously typed characters.
    if (
        event.key === "Backspace" ||
        event.key === "Delete" ||
        event.key === "Insert"
    ) {
        event.preventDefault();
        return;
    }

    // No selecting and replacing text.
    if (typingInput.selectionStart !== typingInput.selectionEnd) {
        event.preventDefault();
    }

    // Block shortcuts that could paste or replace text.
    if ((event.ctrlKey || event.metaKey) &&
        ["v", "x", "a"].includes(event.key.toLowerCase())) {
        event.preventDefault();
    }
});

typingInput.addEventListener("paste", event => event.preventDefault());
typingInput.addEventListener("cut", event => event.preventDefault());
typingInput.addEventListener("drop", event => event.preventDefault());

typingInput.addEventListener("input", handleTyping);

function handleTyping() {
    if (finished) return;

    const input = typingInput;
    let typedText = input.value;

    // Reject deletion or editing of previous characters.
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

    previousInput = typedText;

    let correctCharacters = 0;
    let errors = 0;

    for (let i = 0; i < typedText.length; i++) {
        const correct = typedText[i] === targetText[i];

        if (correct) {
            correctCharacters++;
        } else {
            errors++;
        }

        const key = targetText[i].toLowerCase();

        if (/^[a-zäöüß]$/.test(key)) {
            if (!userData.keyStats[key]) {
                userData.keyStats[key] = { attempts: 0, errors: 0 };
            }

            userData.keyStats[key].attempts++;

            if (!correct) {
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
// COMPLETE EXERCISE
// ------------------------------------

function completeExercise() {
    if (finished) return;

    finished = true;
    typingInput.disabled = true;

    $("next-button").disabled = false;

    $("completion-message").textContent =
        `✓ Übung geschafft! ${currentAccuracy}% Genauigkeit · Leertaste zum Weitermachen`;

    userData.xp += currentAccuracy >= 95 ? 10 : 5;
    userData.completed++;
    userData.bestWpm = Math.max(userData.bestWpm, currentWpm);
    userData.accuracyTotal += currentAccuracy;
    userData.accuracyCount++;

    if (trainingMode === "lesson") {
        userData.lessonProgress[currentLesson.id] = currentExercise + 1;
    }

    saveData();
    updateDashboard();
}

// ------------------------------------
// NEXT EXERCISE
// ------------------------------------

function nextExercise() {
    if (!finished) return;

    if (currentExercise < currentLesson.exercises.length - 1) {
        currentExercise++;

        if (trainingMode === "lesson") {
            userData.lessonProgress[currentLesson.id] = currentExercise;
            saveData();
        }

        loadExercise();
        return;
    }

    if (trainingMode === "lesson") {
        if (!userData.completedLessons.includes(currentLesson.id)) {
            userData.completedLessons.push(currentLesson.id);
        }

        saveData();
        renderLessons();
        updateDashboard();

        $("completion-message").textContent =
            "🏆 Lektion abgeschlossen! Du kannst jetzt weitermachen.";

        $("next-button").textContent = "Zum Dashboard →";
        $("next-button").disabled = false;

        $("next-button").onclick = () => {
            $("next-button").onclick = null;
            $("practice-training-panel").classList.remove("visible");
            showView("dashboard");
        };
    } else {
        $("completion-message").textContent =
            "🎉 Alle Übungen geschafft! Stark!";
        $("next-button").textContent = "Zum Dashboard →";
        $("next-button").onclick = () => {
            $("next-button").onclick = null;
            $("practice-training-panel").classList.remove("visible");
            showView("dashboard");
        };
    }
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
    const letter = alphabet[Math.floor(Math.random() * alphabet.length)];

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

    gameSpawnTimer = setInterval(
        spawnGameLetter,
        1100
    );

    gameLoopTimer = setInterval(() => {
        gameLetters.forEach((item, index) => {
            item.y += item.speed;
            item.element.style.top = `${item.y}px`;

            if (item.y > gameArena.clientHeight - 35) {
                item.element.remove();
                gameLetters.splice(index, 1);

                gameLives--;
                updateGameStats();

                if (gameLives <= 0) {
                    endGame();
                }
            }
        });
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
    $("game-hint").textContent = `Du hast ${gameScore} Punkte erreicht.`;

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
// INITIALIZATION
// ------------------------------------

renderLessons();
updateDashboard();
showView("dashboard");
