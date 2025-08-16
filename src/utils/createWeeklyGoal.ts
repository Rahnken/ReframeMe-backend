export const createWeeklyGoalsArray = (
  trackedAmount: number,
  cycleDuration: number = 12 // Default to 12 weeks
) => {
  const array = [];
  for (let week = 1; week <= cycleDuration; week++) {
    array.push({
      weekNumber: week,
      completedAmount: 0,
      targetAmount: trackedAmount,
    });
  }
  return array;
};
