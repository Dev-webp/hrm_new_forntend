export const formatTime12Hour = (time) => {
  if (!time || time === "--" || time === "—" || time === "-") return "-";

  const match = String(time).match(/(\d{1,2}):(\d{2})/);
  if (!match) return String(time);

  const [, hours, minutes] = match;
  const date = new Date();
  date.setHours(Number(hours));
  date.setMinutes(Number(minutes));
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatProductionMinutes = (productionMinutes) => {
  const totalMinutes = Math.max(0, Math.round(Number(productionMinutes) || 0));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours} hrs ${minutes.toString().padStart(2, "0")} min`;
};

export const formatProductionHours = (productionHours) => {
  const totalMinutes = Math.round((Number(productionHours) || 0) * 60);
  return formatProductionMinutes(totalMinutes);
};
