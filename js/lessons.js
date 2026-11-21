
export const lessons = [
    {
        id: 1,
        title: "Die Grundreihe",
        description: "Lerne die Tasten A, S, D, F, J, K, L und Ö.",
        keys: ["a", "s", "d", "f", "j", "k", "l", "ö"],
        exercises: [
            "asdf jklö",
            "asdf jklö asdf jklö",
            "ff jj dd kk ss ll aa öö",
            "asdf fdsa jklö ölkj",
            "fall lass das",
            "das lass fall"
        ]
    },
    {
        id: 2,
        title: "Die obere Reihe",
        description: "Lerne die Tasten Q, W, E, R, T, Z, U, I, O und P.",
        keys: ["q", "w", "e", "r", "t", "z", "u", "i", "o", "p"],
        exercises: [
            "qwer tzui op",
            "wert zuiop",
            "qwer qwer tzui tzui",
            "rot top wort tier"
        ]
    },
    {
        id: 3,
        title: "Die untere Reihe",
        description: "Lerne die Tasten Y, X, C, V, B, N und M.",
        keys: ["y", "x", "c", "v", "b", "n", "m"],
        exercises: [
            "yxcv bnm",
            "cvbnm yxcv",
            "mama name baby",
            "viele kleine namen"
        ]
    }
];

export function getLesson(id) {
    return lessons.find(lesson => lesson.id === id);
}
