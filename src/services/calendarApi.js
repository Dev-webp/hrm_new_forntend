import api from "./api";

// Fetch holidays for a specific month or year
export async function fetchHolidaysForMonth(year, month, branch) {
  const params = {
    _t: Date.now(),
  };

  if (year) {
    params.year = year;
  }

  if (month) {
    const mm = String(month).padStart(2, "0");
    params.month = `${year}-${mm}`;
  }

  if (branch && branch !== "all") {
    params.branch = branch;
  }

  const response = await api.get("/holidays", { params });

  console.log("HOLIDAYS FROM API:", response.data);
  return Array.isArray(response.data) ? response.data : [];
}

// Add a new holiday
export async function addHoliday({ date, name, type, branch }) {
  const response = await api.post("/holidays", {
    date,
    name,
    type,
    branch,
  });

  return response.data;
}

// Delete a holiday
export async function deleteHoliday(date) {
  const response = await api.delete(`/holidays/${date}`);
  return response.data;
}

// Fetch attendance stats for a date range
export async function fetchAttendanceRange(start, end, branch) {
  const params = {
    start,
    end,
    _t: Date.now(),
  };

  if (branch && branch !== "all") {
    params.branch = branch;
  }

  const response = await api.get("/attendance/range/summary", { params });

  console.log("CALENDAR RANGE SUMMARY:", {
    start,
    end,
    branch,
    data: response.data,
  });

  return Array.isArray(response.data) ? response.data : [];
}

// Fetch attendance for a specific date
export async function fetchAttendanceForDate(date, branch) {
  const params = {
    date,
    _t: Date.now(),
  };

  if (branch && branch !== "all") {
    params.branch = branch;
  }

  const response = await api.get("/attendance", { params });
  return Array.isArray(response.data) ? response.data : [];
}


