import assert from 'node:assert/strict';
import test from 'node:test';

import { applySandwichPolicy } from './sandwichPolicy.js';
import { computeSandwich } from './sandwhichService.js';

function getDateEntry(results, dateStr) {
  return results.find((entry) => entry.date === dateStr) || null;
}

test('computeSandwich forwards approved leave data to the policy engine', () => {
  const attendance = [
    { date: '2024-11-09', status: 'absent' },
    { date: '2024-11-10', status: 'absent' },
    { date: '2024-11-11', status: 'present', check_in_time: '09:00', check_out_time: '18:00' },
  ];
  const leaves = [{ from_date: '2024-11-09', to_date: '2024-11-09', status: 'approved' }];

  const result = computeSandwich({
    attendance,
    leaves,
    holidays: [],
    joiningDate: '2024-11-01',
    year: 2024,
    month: 11,
    todayStr: '2024-11-12',
  });

  const sundayEntry = getDateEntry(result.sandwichResults, '2024-11-10');
  assert.ok(sundayEntry, 'Expected a Sunday entry for the anchor date');
  assert.equal(sundayEntry.applied, false);
  assert.equal(sundayEntry.reason, 'SATURDAY_ALLOWANCE');
});

test('applySandwichPolicy accepts the legacy approvedLeaveDates payload', () => {
  const attMap = new Map([
    ['2024-11-09', { date: '2024-11-09', status: 'absent' }],
    ['2024-11-10', { date: '2024-11-10', status: 'absent' }],
    ['2024-11-11', { date: '2024-11-11', status: 'present', check_in_time: '09:00', check_out_time: '18:00' }],
  ]);

  const result = applySandwichPolicy({
    attMap,
    holidayMap: new Map(),
    allDates: ['2024-11-09', '2024-11-10', '2024-11-11'],
    approvedLeaveDates: new Set(['2024-11-09']),
    joiningDate: '2024-11-01',
    periodStart: '2024-11-01',
    periodEnd: '2024-11-30',
    todayStr: '2024-11-12',
  });

  const sundayEntry = getDateEntry(result.sandwichResults, '2024-11-10');
  assert.ok(sundayEntry, 'Expected a Sunday entry in the legacy payload path');
  assert.equal(sundayEntry.reason, 'SATURDAY_ALLOWANCE');
});

test('first and second one-sided sandwich charges are tracked by allowance usage', () => {
  const attMap = new Map([
    ['2024-11-09', { date: '2024-11-09', status: 'absent' }],
    ['2024-11-10', { date: '2024-11-10', status: 'absent' }],
    ['2024-11-11', { date: '2024-11-11', status: 'present', check_in_time: '09:00', check_out_time: '18:00' }],
    ['2024-11-16', { date: '2024-11-16', status: 'absent' }],
    ['2024-11-17', { date: '2024-11-17', status: 'absent' }],
    ['2024-11-18', { date: '2024-11-18', status: 'present', check_in_time: '09:00', check_out_time: '18:00' }],
  ]);

  const result = applySandwichPolicy({
    attMap,
    holidayMap: new Map(),
    allDates: ['2024-11-09', '2024-11-10', '2024-11-11', '2024-11-16', '2024-11-17', '2024-11-18'],
    leaves: [],
    joiningDate: '2024-11-01',
    periodStart: '2024-11-01',
    periodEnd: '2024-11-30',
    todayStr: '2024-11-18',
  });

  const first = getDateEntry(result.sandwichResults, '2024-11-10');
  const second = getDateEntry(result.sandwichResults, '2024-11-17');

  assert.equal(first.reason, 'SATURDAY_ALLOWANCE');
  assert.equal(first.applied, false);
  assert.equal(second.reason, 'SECOND_QUALIFYING_SATURDAY');
  assert.equal(second.applied, true);
  assert.equal(result.allowanceUsage.get(':2024:11'), 2);
});

test('two-sided sandwich is charged without consuming the monthly allowance', () => {
  const attMap = new Map([
    ['2024-11-09', { date: '2024-11-09', status: 'absent' }],
    ['2024-11-10', { date: '2024-11-10', status: 'absent' }],
    ['2024-11-11', { date: '2024-11-11', status: 'absent' }],
  ]);

  const result = applySandwichPolicy({
    attMap,
    holidayMap: new Map(),
    allDates: ['2024-11-09', '2024-11-10', '2024-11-11'],
    leaves: [],
    joiningDate: '2024-11-01',
    periodStart: '2024-11-01',
    periodEnd: '2024-11-30',
    todayStr: '2024-11-12',
  });

  const sundayEntry = getDateEntry(result.sandwichResults, '2024-11-10');
  const saturdayEntry = getDateEntry(result.sandwichResults, '2024-11-09');

  assert.equal(sundayEntry.applied, true);
  assert.equal(sundayEntry.reason, 'TWO_SIDED_NON_WORKING');
  assert.equal(saturdayEntry.reason, 'TWO_SIDED_EXCEPTION_NO_ALLOWANCE');
  assert.equal(result.allowanceUsage.size, 0);
});

test('approved leave is treated as off while pending, rejected, and cancelled leave are not', () => {
  const attMap = new Map([
    ['2024-11-08', { date: '2024-11-08', status: 'absent' }],
    ['2024-11-09', { date: '2024-11-09', status: 'absent' }],
    ['2024-11-10', { date: '2024-11-10', status: 'absent' }],
    ['2024-11-11', { date: '2024-11-11', status: 'present', check_in_time: '09:00', check_out_time: '18:00' }],
  ]);

  const result = applySandwichPolicy({
    attMap,
    holidayMap: new Map(),
    allDates: ['2024-11-08', '2024-11-09', '2024-11-10', '2024-11-11'],
    leaves: [
      { from_date: '2024-11-09', to_date: '2024-11-09', status: 'approved' },
      { from_date: '2024-11-08', to_date: '2024-11-08', status: 'pending' },
      { from_date: '2024-11-08', to_date: '2024-11-08', status: 'rejected' },
      { from_date: '2024-11-08', to_date: '2024-11-08', status: 'cancelled' },
    ],
    joiningDate: '2024-11-01',
    periodStart: '2024-11-01',
    periodEnd: '2024-11-30',
    todayStr: '2024-11-11',
  });

  const anchor = getDateEntry(result.sandwichResults, '2024-11-10');
  assert.equal(anchor.reason, 'SATURDAY_ALLOWANCE');
  assert.equal(anchor.applied, false);
});

test('manual present, half-day, and absent statuses stay authoritative', () => {
  const attMap = new Map([
    ['2024-11-09', { date: '2024-11-09', status: 'absent' }],
    ['2024-11-10', { date: '2024-11-10', status: 'half_day', check_in_time: '09:00', check_out_time: '13:00' }],
    ['2024-11-11', { date: '2024-11-11', status: 'present', check_in_time: '09:00', check_out_time: '18:00' }],
  ]);

  const result = applySandwichPolicy({
    attMap,
    holidayMap: new Map(),
    allDates: ['2024-11-09', '2024-11-10', '2024-11-11'],
    leaves: [],
    joiningDate: '2024-11-01',
    periodStart: '2024-11-01',
    periodEnd: '2024-11-30',
    todayStr: '2024-11-12',
  });

  const sundayEntry = getDateEntry(result.sandwichResults, '2024-11-10');
  assert.equal(sundayEntry.reason, 'SUNDAY_WORKED');
  assert.equal(sundayEntry.applied, false);
});

test('pending Saturday values remain pending when the prior day is still incomplete', () => {
  const attMap = new Map([
    ['2024-11-23', { date: '2024-11-23', status: 'absent' }],
    ['2024-11-24', { date: '2024-11-24', status: 'absent' }],
    ['2024-11-25', { date: '2024-11-25', status: 'present', check_in_time: '09:00', check_out_time: '18:00' }],
  ]);

  const result = applySandwichPolicy({
    attMap,
    holidayMap: new Map(),
    allDates: ['2024-11-23', '2024-11-24', '2024-11-25'],
    leaves: [],
    joiningDate: '2024-11-01',
    periodStart: '2024-11-01',
    periodEnd: '2024-11-30',
    todayStr: '2024-11-23',
  });

  const anchor = getDateEntry(result.sandwichResults, '2024-11-23');
  assert.equal(anchor.reason, 'SATURDAY_PENDING');
  assert.equal(anchor.applied, false);
});

test('joining-date restrictions skip pre-join anchors', () => {
  const attMap = new Map([
    ['2024-11-09', { date: '2024-11-09', status: 'absent' }],
    ['2024-11-10', { date: '2024-11-10', status: 'absent' }],
    ['2024-11-11', { date: '2024-11-11', status: 'present', check_in_time: '09:00', check_out_time: '18:00' }],
  ]);

  const result = applySandwichPolicy({
    attMap,
    holidayMap: new Map(),
    allDates: ['2024-11-09', '2024-11-10', '2024-11-11'],
    leaves: [],
    joiningDate: '2024-11-11',
    periodStart: '2024-11-01',
    periodEnd: '2024-11-30',
    todayStr: '2024-11-12',
  });

  assert.equal(getDateEntry(result.sandwichResults, '2024-11-10'), null);
});

test('consecutive holiday context does not create duplicate charges across month boundaries', () => {
  const holidayMap = new Map([
    ['2024-10-31', { date: '2024-10-31' }],
    ['2024-11-01', { date: '2024-11-01' }],
  ]);

  const attMap = new Map([
    ['2024-10-30', { date: '2024-10-30', status: 'absent' }],
    ['2024-10-31', { date: '2024-10-31', status: 'absent' }],
    ['2024-11-01', { date: '2024-11-01', status: 'absent' }],
    ['2024-11-02', { date: '2024-11-02', status: 'present', check_in_time: '09:00', check_out_time: '18:00' }],
  ]);

  const result = applySandwichPolicy({
    attMap,
    holidayMap,
    allDates: ['2024-10-30', '2024-10-31', '2024-11-01', '2024-11-02'],
    leaves: [],
    joiningDate: '2024-10-01',
    periodStart: '2024-11-01',
    periodEnd: '2024-11-30',
    todayStr: '2024-11-02',
  });

  const monthBoundaryAnchor = getDateEntry(result.sandwichResults, '2024-10-31');
  assert.equal(monthBoundaryAnchor.reason, 'HOLIDAY_HOLIDAY_EXCLUDED');
  assert.equal(monthBoundaryAnchor.applied, false);
  assert.equal(getDateEntry(result.sandwichResults, '2024-11-01'), null);
});

test('duplicate attendance rows are deduplicated by the date map', () => {
  const duplicates = [
    { date: '2024-11-09', status: 'absent' },
    { date: '2024-11-09', status: 'absent' },
    { date: '2024-11-10', status: 'absent' },
    { date: '2024-11-11', status: 'present', check_in_time: '09:00', check_out_time: '18:00' },
  ];

  const result = computeSandwich({
    attendance: duplicates,
    leaves: [],
    holidays: [],
    joiningDate: '2024-11-01',
    year: 2024,
    month: 11,
    todayStr: '2024-11-12',
  });

  const sundayEntry = getDateEntry(result.sandwichResults, '2024-11-10');
  assert.equal(sundayEntry.reason, 'SATURDAY_ALLOWANCE');
  assert.equal(sundayEntry.applied, false);
});
