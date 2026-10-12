import assert from "node:assert/strict";
import test from "node:test";

import { getCalendarAttendanceStatus } from "./calendarStatusColors.js";

test("explicit absent status is not overridden by paid-leave metadata", () => {
  const status = getCalendarAttendanceStatus({
    status: "absent",
    leave_type: "paid",
    leave_status: "approved",
    check_in_time: "14:26:00",
    check_out_time: "14:28:00",
  });

  assert.equal(status, "absent");
});

test("explicit attendance status is not overridden by unpaid-leave metadata", () => {
  const status = getCalendarAttendanceStatus({
    status: "present",
    leave_type: "unpaid",
    is_paid_leave: false,
    check_in_time: "10:00:00",
    check_out_time: "19:00:00",
  });

  assert.equal(status, "present");
});

test("half-day leave without punches shows no record instead of paid leave", () => {
  const status = getCalendarAttendanceStatus({
    half_day_slot: "SLOT_A",
    leave_type: "paid",
    leave_status: "approved",
    is_paid_leave: true,
  });

  assert.equal(status, "no_record");
});

test("approved half-day leave without a slot does not inherit paid or unpaid status", () => {
  for (const leaveType of ["paid", "unpaid"]) {
    assert.equal(
      getCalendarAttendanceStatus({
        status: leaveType === "paid" ? "paid_leave" : "unpaid_leave",
        leave_type: leaveType,
        leave_duration_type: "half_day",
        leave_request_status: "approved",
        is_paid_leave: leaveType === "paid",
      }),
      "no_record"
    );
  }
});

test("half-day leave with insufficient-work attendance keeps the absent result", () => {
  const status = getCalendarAttendanceStatus({
    status: "absent",
    half_day_slot: "SLOT_A",
    leave_type: "paid",
    leave_status: "approved",
    is_paid_leave: true,
    check_in_time: "14:26:00",
    check_out_time: "14:28:00",
  });

  assert.equal(status, "absent");
});

test("legacy leave rows still use their leave type", () => {
  assert.equal(
    getCalendarAttendanceStatus({ status: "leave", is_paid_leave: true }),
    "paid_leave"
  );
  assert.equal(
    getCalendarAttendanceStatus({ leave_type: "unpaid" }),
    "unpaid_leave"
  );
});
