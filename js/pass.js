
export const PASS_REWARDS = [
    { level: 1, xp: 1000, name: "First Step", reward: "Blaues Profil-Abzeichen", type: "badge", id: "blue-badge" },
    { level: 2, xp: 2000, name: "Keyboard Rookie", reward: "Neues Tastatur-Design", type: "keyboard", id: "keyboard-2" },
    { level: 3, xp: 3000, name: "Rookie", reward: "Exklusiver Titel", type: "title", id: "rookie" },
    { level: 4, xp: 4000, name: "Speed Demon", reward: "Speed-Demon-Abzeichen", type: "badge", id: "speed-demon" },
    { level: 5, xp: 5000, name: "Halfway There", reward: "Besonderer Pass-Hintergrund", type: "pass-background", id: "pass-background-2" },
    { level: 6, xp: 6000, name: "Night Owl", reward: "Exklusiver Titel", type: "title", id: "night-owl" },
    { level: 7, xp: 7000, name: "Key Master", reward: "Goldenes Tastatur-Design", type: "keyboard", id: "gold-keyboard" },
    { level: 8, xp: 8000, name: "Elite Typist", reward: "Exklusiver Profilrahmen", type: "profile-frame", id: "elite-frame" },
    { level: 9, xp: 9000, name: "Almost There", reward: "Animierter Profil-Akzent", type: "profile-accent", id: "animated-accent" },
    { level: 10, xp: 10000, name: "ZUNO Legend", reward: "Legendäres ZUNO-Abzeichen", type: "badge", id: "zuno-legend" }
];

export function getPassLevel(xp) {
    let level = 0;

    for (const reward of PASS_REWARDS) {
        if (xp >= reward.xp) {
            level = reward.level;
        } else {
            break;
        }
    }

    return level;
}

export function getPassProgress(xp) {
    const level = getPassLevel(xp);

    if (level === 10) {
        return {
            level: 10,
            progress: 100,
            currentXP: xp,
            nextXP: 10000,
            remainingXP: 0,
            completed: true
        };
    }

    const currentXP = level === 0
        ? 0
        : PASS_REWARDS[level - 1].xp;

    const nextXP = PASS_REWARDS[level].xp;

    return {
        level,
        progress: Math.max(
            0,
            Math.min(100, ((xp - currentXP) / (nextXP - currentXP)) * 100)
        ),
        currentXP: xp,
        nextXP,
        remainingXP: nextXP - xp,
        completed: false
    };
}

export function getUnlockedRewards(xp) {
    return PASS_REWARDS.filter(reward => xp >= reward.xp);
}

export function isRewardUnlocked(xp, rewardId) {
    return getUnlockedRewards(xp).some(reward => reward.id === rewardId);
}
