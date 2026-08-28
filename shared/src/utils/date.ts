export const getDatePresets = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  return {
    thisMonth: {
      start: formatDateString(new Date(year, month, 1)),
      end: formatDateString(new Date(year, month + 1, 0)),
    },
    lastMonth: {
      start: formatDateString(new Date(year, month - 1, 1)),
      end: formatDateString(new Date(year, month, 0)),
    },
  };
};

export const formatDateString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const toLocalDate = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};


export const clampToMonthEnd = (original: Date, advanced: Date): Date => {
  const intendedDay = original.getDate();
  const year = advanced.getFullYear();
  const month = advanced.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(intendedDay, lastDay);
  return new Date(year, month, clampedDay);
};


export const addPeriod = (
  date: Date,
  original: Date,
  frequency: "daily" | "weekly" | "monthly" | "yearly" | "none",
): Date => {
  const result = new Date(date);
  switch (frequency) {
    case "daily":
      result.setDate(result.getDate() + 1);
      return result;
    case "weekly":
      result.setDate(result.getDate() + 7);
      return result;
    case "monthly": {

      const target = new Date(result.getFullYear(), result.getMonth() + 1, 1);
      return clampToMonthEnd(original, target);
    }
    case "yearly": {
      const target = new Date(result.getFullYear() + 1, result.getMonth(), 1);
      return clampToMonthEnd(original, target);
    }
    default:
      return result;
  }
};
