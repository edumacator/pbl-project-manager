const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    const parts = dateStr.substring(0, 10).split('-');
    if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    }
    return new Date(dateStr);
};

// Simulate what TimelineView is doing exactly
const todayMidnight = new Date();
todayMidnight.setHours(0, 0, 0, 0);
const todayTime = todayMidnight.getTime();

// "Community Presentation" has start_date "2026-02-21" in the DB based on the old DB snapshot
const taskStr = "2026-02-20"; // User says it's 2/20 in their UI
const projectStr = "2026-02-18"; // Guessing based on "W 18" in the grid screenshot

const allDates = [
    todayTime,
    parseDate(projectStr).getTime(),
    parseDate(taskStr).getTime()
];

const minDate = Math.min(...allDates);
const startDate = new Date(minDate);
startDate.setHours(0, 0, 0, 0);
startDate.setDate(startDate.getDate() - 3); // Padding!

const date = parseDate(taskStr);
date.setHours(0, 0, 0, 0);

console.log("StartDate (Column 1):", startDate);
console.log("Task Date:", date);

const diff = Math.round((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
console.log("Diff (Days):", diff);
console.log("Column (diff + 1):", diff + 1);
