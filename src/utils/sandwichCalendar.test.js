import assert from "node:assert/strict";
import test from "node:test";
import {
  computeEmployeeSandwichByDate,
  computeHeatmapSandwichByEmployee,
  getSandwichCellClass,
  hasAppliedSandwichPenalty,
} from "./sandwichCalendar.js";

const worked = (date) => ({
  date,
  status: "present",
  check_in_time: "09:00",
  check_out_time: "18:00",
});

function oneSidedInputs(overrides = {}) {
  return {
    month: "2024-11",
    attendance: [
      { date: "2024-11-09", status: "absent" },
      { date: "2024-11-10", status: "absent" },
      worked("2024-11-11"),
    ],
    holidays: [],
    leaves: [],
    joiningDate: "2024-11-01",
    todayStr: "2024-11-12",
    ...overrides,
  };
}

test("sandwich LOP adds the red override only when the policy actually applies", () => {
  assert.equal(hasAppliedSandwichPenalty([{ date: "2024-11-10", applied: false }]), false);
  assert.equal(hasAppliedSandwichPenalty([{ date: "2024-11-10", applied: true }]), true);
  assert.equal(getSandwichCellClass("cal-sunday", [{ date: "2024-11-10", applied: false }]), "cal-sunday");
  assert.equal(getSandwichCellClass("cal-sunday", [{ date: "2024-11-10", applied: true }]), "cal-sunday sandwich-lop");
});

test("employee calendar mapping keeps original attendance unchanged", () => {
  const attendance = oneSidedInputs().attendance;
  const results = computeEmployeeSandwichByDate(oneSidedInputs({ attendance }));

  assert.equal(results.get("2024-11-10")[0].reason, "SATURDAY_ALLOWANCE");
  assert.equal(results.get("2024-11-10")[0].applied, false);
  assert.equal(attendance[1].status, "absent");
  assert.equal(attendance[1].sandwich, undefined);
});

test("heatmap mapping isolates employees with the same calendar date", () => {
  const employees = [
    { id: 17, ...oneSidedInputs() },
    {
      id: 18,
      ...oneSidedInputs({
        attendance: [
          { date: "2024-11-09", status: "absent" },
          { date: "2024-11-10", status: "absent" },
          { date: "2024-11-11", status: "absent" },
        ],
      }),
    },
  ];
  const result = computeHeatmapSandwichByEmployee(employees, "2024-11");

  assert.equal(result.get("17").get("2024-11-10")[0].reason, "SATURDAY_ALLOWANCE");
  assert.equal(result.get("18").get("2024-11-10")[0].reason, "TWO_SIDED_NON_WORKING");
  assert.notEqual(
    result.get("17").get("2024-11-10"),
    result.get("18").get("2024-11-10")
  );
});

test("missing attendance and missing results do not manufacture policy entries", () => {
  const result = computeEmployeeSandwichByDate({
    month: "2024-11",
    attendance: [],
    leaves: [],
    holidays: [],
    joiningDate: "2024-11-01",
    todayStr: "2024-11-30",
  });
  assert.equal(result.has("2024-11-10"), false);
  assert.deepEqual(computeHeatmapSandwichByEmployee([], "2024-11"), new Map());
});

test("manual present overrides and approved leaves are respected, unapproved leaves are ignored", () => {
  const manualPresent = computeEmployeeSandwichByDate(oneSidedInputs({
    attendance: [
      worked("2024-11-09"),
      { date: "2024-11-10", status: "absent" },
      worked("2024-11-11"),
    ],
  }));
  assert.equal(manualPresent.get("2024-11-09")[0].reason, "SATURDAY_WORKED");

  const leaveInputs = {
    attendance: [
      { date: "2024-11-10", status: "absent" },
      worked("2024-11-11"),
    ],
    todayStr: "2024-11-08",
  };
  for (const status of ["approved", "pending", "rejected", "cancelled"]) {
    const result = computeEmployeeSandwichByDate(oneSidedInputs({
      ...leaveInputs,
      leaves: [{
        from_date: "2024-11-09",
        to_date: "2024-11-09",
        status,
      }],
    }));
    if (status === "approved") {
      assert.equal(result.get("2024-11-10")[0].reason, "SATURDAY_ALLOWANCE");
    } else {
      assert.equal(result.has("2024-11-10"), false);
      assert.equal(result.get("2024-11-09")[0].reason, "SATURDAY_PENDING");
    }
  }
});

test("adjacent-month context influences decisions but only in-month anchors are returned", () => {
  const month = "2024-11";
  const results = computeEmployeeSandwichByDate({
    month,
    attendance: [
      { date: "2024-10-31", status: "absent" },
      { date: "2024-11-01", status: "absent" },
      worked("2024-11-02"),
    ],
    holidays: [{ date: "2024-11-01", type: "holiday" }],
    leaves: [],
    joiningDate: "2024-10-01",
    todayStr: "2024-11-03",
  });

  assert.equal(results.has("2024-10-31"), false);
  assert.equal(results.get("2024-11-01")[0].anchorType, "HOLIDAY");
  assert.equal(results.get("2024-11-01")[0].reason, "HOLIDAY_SATURDAY_ALLOWANCE");
  assert.equal(results.get("2024-11-01")[0].applied, false);
  assert.ok([...results.keys()].every((date) => date.startsWith(month)));
});

test("branch-specific holiday context produces independent policy mappings", () => {
  const employees = [
    { id: 17, branch: "North", ...oneSidedInputs() },
    {
      id: 18,
      branch: "South",
      ...oneSidedInputs({
        holidays: [{ date: "2024-11-09", type: "holiday" }],
      }),
    },
  ];
  const result = computeHeatmapSandwichByEmployee(employees, "2024-11");

  assert.equal(result.get("17").has("2024-11-10"), true);
  assert.ok(
    result.get("18").get("2024-11-09").some((entry) => entry.reason === "HOLIDAY_EXCLUDED")
  );
});

test("month and employee changes produce isolated heatmap mappings", () => {
  const nov = computeHeatmapSandwichByEmployee(
    [{ id: 17, ...oneSidedInputs() }],
    "2024-11"
  );
  const dec = computeHeatmapSandwichByEmployee(
    [{ id: 17, ...oneSidedInputs({ attendance: [] }) }],
    "2024-12"
  );
  assert.equal(nov.get("17").has("2024-11-10"), true);
  assert.equal(dec.get("17").has("2024-11-10"), false);
});

test("employee and heatmap mappings agree for the same employee and month", () => {
  const input = oneSidedInputs();
  const employee = computeEmployeeSandwichByDate(input);
  const heatmap = computeHeatmapSandwichByEmployee([{ id: 17, ...input }], "2024-11");

  assert.deepEqual(
    heatmap.get("17").get("2024-11-10"),
    employee.get("2024-11-10")
  );
});
