export const createWeeklyGoalsArray = (
  trackedAmount: number,
  weeksRemaining: number = 12 // Default to 12 weeks
) => {
  const array = [];
  for (let index = 0; index < weeksRemaining; index++) {
    array.push({
      weekNumber: index,
      completedAmount: 0,
      targetAmount: trackedAmount,
    });
  }
  return array;
};
