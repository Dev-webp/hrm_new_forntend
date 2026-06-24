import api from "./api";

const clientCache = new Map();
const CLIENT_TTL = 90_000;

function cGet(key) {
  const entry = clientCache.get(key);
  if (!entry || Date.now() - entry.ts > CLIENT_TTL) {
    clientCache.delete(key);
    return null;
  }
  return entry.v;
}

function cSet(key, value) {
  clientCache.set(key, { v: value, ts: Date.now() });
}

export function invalidateAnalysisCache(pattern) {
  for (const key of clientCache.keys()) {
    if (key.includes(pattern)) clientCache.delete(key);
  }
}

/** GET /api/admin/employees?branch= */
export async function fetchAnalysisEmployees(branch, signal) {
  const ck = `employees|${branch}`;
  const cached = cGet(ck);
  if (cached) return cached;

  const { data } = await api.get("/admin/employees", {
    params: { branch },
    signal,
  });
  cSet(ck, data);
  return data;
}

/** GET /api/attendance-analysis/summary?month=&branch= */
export async function fetchAnalysisSummary(month, branch, signal) {
  const ck = `summary|${month}|${branch}`;
  const cached = cGet(ck);
  if (cached) return cached;

  const { data } = await api.get("/attendance-analysis/summary", {
    params: { month, branch },
    signal,
  });
  cSet(ck, data);
  return data;
}

/** GET /api/attendance-analysis/individual?userId=&month= */
export async function fetchAnalysisIndividual(userId, month, signal) {
  const ck = `individual|${userId}|${month}`;
  const cached = cGet(ck);
  if (cached) return cached;

  const { data } = await api.get("/attendance-analysis/individual", {
    params: { userId, month },
    signal,
  });
  cSet(ck, data);
  return data;
}

/** GET /api/attendance-analysis/trends?branch=&months= */
export async function fetchAnalysisTrends(branch, months = 6, signal) {
  const ck = `trends|${branch}|${months}`;
  const cached = cGet(ck);
  if (cached) return cached;

  const { data } = await api.get("/attendance-analysis/trends", {
    params: { branch, months },
    signal,
  });
  cSet(ck, data);
  return data;
}

/** GET /api/leaves/approved-monthly?userId=&month=YYYY-MM */
export async function fetchEmployeeLeaves(userId, month, signal) {
  const ck = `leaves|${userId}|${month}`;
  const cached = cGet(ck);
  if (cached) return cached;

  const { data } = await api.get("/leaves/approved-monthly", {
    params: { userId, month },
    signal,
  });
  cSet(ck, data);
  return data;
}
