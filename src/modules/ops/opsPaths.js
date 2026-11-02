// OPS pages are mounted at "<role base>/ops/*" inside each HRMS role's route
// tree (/admin, /manager, /operations, /sub-admin, /employee). Every link the
// OPS pages build must keep the person inside that same role tree, so the base
// is derived from the current URL instead of being hard-coded.

const OPS_BASE_PATTERN = /^(\/(?:admin|manager|operations|sub-admin|subadmin|employee)\/ops)(?=\/|$)/;

export function opsBaseFromPath(pathname = "") {
  const match = OPS_BASE_PATTERN.exec(pathname);
  return match ? match[1] : "/ops";
}

// "/cases?view=processing" -> "/admin/ops/cases?view=processing"
export function withOpsBase(base, target) {
  const path = String(target || "");
  if (!path.startsWith("/")) return `${base}/${path}`;
  if (path === base || path.startsWith(`${base}/`) || path.startsWith(`${base}?`)) return path;
  return `${base}${path}`;
}

// The OPS backend stores notification links from its old multi-page app
// ("/cases.html", "/view-employees.html"). Translate them to router paths.
const LEGACY_LINK_TARGETS = {
  index: "/dashboard",
  "view-employees": "/employees",
  "add-employee": "/employees/new",
};

export function normalizeOpsLink(link) {
  if (!link) return null;
  const m = String(link).match(/^\/?([\w-]+)\.html(.*)$/);
  if (!m) return String(link);
  return (LEGACY_LINK_TARGETS[m[1]] || `/${m[1]}`) + m[2];
}
