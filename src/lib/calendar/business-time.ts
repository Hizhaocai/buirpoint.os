export const BUSINESS_TIME_ZONE = "Asia/Shanghai";

function dateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type === "year" || part.type === "month" || part.type === "day")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

export function businessDateKey(date = new Date(), timeZone = BUSINESS_TIME_ZONE) {
  const { year, month, day } = dateParts(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function tomorrowBusinessDateKey(date = new Date(), timeZone = BUSINESS_TIME_ZONE) {
  const { year, month, day } = dateParts(date, timeZone);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1, 12));
  return businessDateKey(nextDay, "UTC");
}
