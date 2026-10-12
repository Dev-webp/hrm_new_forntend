export function toDateStr(value) {
  if (!value) return '';

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  if (typeof value === 'string') {
    const match = /^\d{4}-\d{2}-\d{2}/.exec(value);
    if (match) return match[0];
  }

  if (value && typeof value === 'object' && 'toISOString' in value) {
    const iso = value.toISOString();
    if (iso) return iso.slice(0, 10);
  }

  return '';
}

export function addDays(dateStr, days) {
  if (!dateStr) return '';

  const [year, month, day] = String(dateStr).split('-').map(Number);
  const next = new Date(year, month - 1, day + Number(days || 0));

  const nextYear = next.getFullYear();
  const nextMonth = String(next.getMonth() + 1).padStart(2, '0');
  const nextDay = String(next.getDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function getDayOfWeek(dateStr) {
  if (!dateStr) return -1;

  const [year, month, day] = String(dateStr).split('-').map(Number);
  return new Date(year, month - 1, day).getDay();
}

export function getYearMonth(dateStr) {
  if (!dateStr) {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }

  const [year, month] = String(dateStr).split('-').map(Number);
  return {
    year,
    month,
  };
}
