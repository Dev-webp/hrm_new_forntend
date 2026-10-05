
import { getSundayDisplay, getBadgeClass, getDayClass } from "../utils/sundaySandwich";

/**
 * SundayBadge Component
 * Displays Sunday status with sandwich penalty information
 * Uses the shared sundaySandwich helper for consistent display across all calendar views
 */
export default function SundayBadge({ sandwichResult, date, _onClick }) {
  const display = getSundayDisplay(sandwichResult);
  const badgeClass = getBadgeClass(display.badgeVariant);
  const dayClass = getDayClass(display.isPenalized);

  return (
    <div className={`cal-day ${dayClass}`}>
      <div className="day-num">{date}</div>
      <div className={`day-badge ${badgeClass}`}>
        {display.label}
      </div>
      <div className="tooltip-card">
        <div className="tt-title">Sunday</div>
        <div>{display.tooltip}</div>
      </div>
    </div>
  );
}
