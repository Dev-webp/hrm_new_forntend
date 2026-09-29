/**
 * Sunday Sandwich Display Helper
 * Maps sandwich policy results to display labels, tooltips, badge variants, and absent counting.
 * No policy logic - only display mapping based on backend-calculated { applied, reason }.
 */

/**
 * Get Sunday display configuration based on sandwich policy result
 * @param {Object} sandwichResult - { applied: boolean, reason: string }
 * @returns {Object} - { label, tooltip, badgeVariant, countsAsAbsent, isPenalized }
 */
export function getSundayDisplay(sandwichResult) {
  // Default: no sandwich data or not applied
  if (!sandwichResult || !sandwichResult.applied) {
    // If there's a reason but not applied, show it in tooltip
    const reasonLabel = getReasonLabel(sandwichResult?.reason);
    return {
      label: "📆 Sunday",
      tooltip: reasonLabel ? `Sunday (${reasonLabel})` : "Sunday / Weekly Off",
      badgeVariant: "sunday",
      countsAsAbsent: false,
      isPenalized: false,
    };
  }

  // Applied sandwich penalty
  const reasonLabel = getReasonLabel(sandwichResult.reason);
  return {
    label: "Absent (Sandwich)",
    tooltip: `Sunday (${reasonLabel})`,
    badgeVariant: "absent",
    countsAsAbsent: true,
    isPenalized: true,
  };
}

/**
 * Get human-readable label for sandwich reason code
 * @param {string} reason - Sandwich reason code from backend
 * @returns {string} - Human-readable label
 */
function getReasonLabel(reason) {
  const reasonMap = {
    TWO_SIDED_NON_WORKING: "Two-sided non-working",
    FRI_SAT_SUN_NON_WORKING: "Fri-Sat-Sun non-working",
    FRI_SAT_PATTERN_NO_ALLOWANCE: "Fri-Sat pattern (no allowance)",
    SATURDAY_ALLOWANCE: "Monthly allowance",
    FIRST_QUALIFYING_SATURDAY: "First qualifying Saturday",
    SECOND_QUALIFYING_SATURDAY: "Second qualifying Saturday",
    THIRD_QUALIFYING_SATURDAY: "Third qualifying Saturday",
    FOURTH_QUALIFYING_SATURDAY: "Fourth qualifying Saturday",
    SATURDAY_PENDING: "Saturday pending",
    HOLIDAY_EXCLUDED: "Holiday excluded",
    SATURDAY_WORKED: "Saturday worked",
    SUNDAY_WORKED: "Sunday worked",
    TWO_SIDED_EXCEPTION_NO_ALLOWANCE: "Two-sided exception (no allowance)",
  };

  return reasonMap[reason] || reason || "Weekly Off";
}

/**
 * Get CSS class for badge variant
 * @param {string} variant - Badge variant
 * @returns {string} - CSS class name
 */
export function getBadgeClass(variant) {
  const classMap = {
    sunday: "badge-sunday",
    absent: "badge-absent",
  };

  return classMap[variant] || "badge-sunday";
}

/**
 * Get day CSS class for sandwich status
 * @param {boolean} isPenalized - Whether the day is penalized
 * @returns {string} - CSS class name
 */
export function getDayClass(isPenalized) {
  return isPenalized ? "is-absent" : "is-sunday calendar-holiday";
}
