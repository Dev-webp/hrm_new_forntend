// Run with: node --test src/modules/ops/opsPaths.test.js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeOpsLink, opsBaseFromPath, withOpsBase } from "./opsPaths.js";

describe("opsBaseFromPath", () => {
  it("keeps every role inside its own OPS area", () => {
    assert.equal(opsBaseFromPath("/admin/ops/cases"), "/admin/ops");
    assert.equal(opsBaseFromPath("/manager/ops/leads"), "/manager/ops");
    assert.equal(opsBaseFromPath("/operations/ops/dashboard"), "/operations/ops");
    assert.equal(opsBaseFromPath("/sub-admin/ops/reports"), "/sub-admin/ops");
    assert.equal(opsBaseFromPath("/employee/ops/employees/new"), "/employee/ops");
    assert.equal(opsBaseFromPath("/admin/ops"), "/admin/ops");
  });

  it("does not match look-alike paths", () => {
    assert.equal(opsBaseFromPath("/admin/opsx/cases"), "/ops");
    assert.equal(opsBaseFromPath("/admin/crm/ops"), "/ops");
    assert.equal(opsBaseFromPath("/ops/cases"), "/ops");
    assert.equal(opsBaseFromPath(""), "/ops");
  });
});

describe("withOpsBase", () => {
  it("prefixes absolute OPS paths and keeps the query string", () => {
    assert.equal(withOpsBase("/admin/ops", "/cases"), "/admin/ops/cases");
    assert.equal(withOpsBase("/employee/ops", "/cases?view=processing"), "/employee/ops/cases?view=processing");
    assert.equal(withOpsBase("/admin/ops", "/employees/new"), "/admin/ops/employees/new");
  });

  it("never double-prefixes", () => {
    assert.equal(withOpsBase("/admin/ops", "/admin/ops/cases"), "/admin/ops/cases");
    assert.equal(withOpsBase("/admin/ops", "/admin/ops"), "/admin/ops");
  });

  it("handles relative targets", () => {
    assert.equal(withOpsBase("/admin/ops", "cases"), "/admin/ops/cases");
  });
});

describe("normalizeOpsLink (links stored by the old multi-page OPS app)", () => {
  it("maps legacy .html links to router paths", () => {
    assert.equal(normalizeOpsLink("/cases.html"), "/cases");
    assert.equal(normalizeOpsLink("/cases.html?view=processing"), "/cases?view=processing");
    assert.equal(normalizeOpsLink("leads.html"), "/leads");
    assert.equal(normalizeOpsLink("/view-employees.html"), "/employees");
    assert.equal(normalizeOpsLink("/add-employee.html"), "/employees/new");
    assert.equal(normalizeOpsLink("/index.html"), "/dashboard");
  });

  it("passes modern links through and ignores empty ones", () => {
    assert.equal(normalizeOpsLink("/audit"), "/audit");
    assert.equal(normalizeOpsLink(null), null);
    assert.equal(normalizeOpsLink(""), null);
  });
});
