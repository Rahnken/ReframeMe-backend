export const createWeeklyGoalsArray = (
  weeksRemaining: number,
  trackedAmount: number
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
