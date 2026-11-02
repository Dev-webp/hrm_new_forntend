/**
 * Module Card Component
 * Displays a business module summary (HRMS, Invoice, CRM, OPS)
 */

import React from 'react';
import { theme } from '../../designTokens';
import './ModuleCard.css';

const ModuleCard = ({
  moduleName,
  icon,
  metrics,
  color,
  onClick,
  loading = false,
}) => {
  const getModuleColor = () => {
    const colorMap = {
      hrms: theme.colors.primary.blue,
      invoice: theme.colors.success,
      crm: theme.colors.warning,
      ops: theme.colors.info,
    };
    return colorMap[moduleName.toLowerCase()] || color || theme.colors.primary.blue;
  };

  if (loading) {
    return (
      <div className="module-card module-card--loading">
        <div className="module-card__skeleton-header">
          <div className="module-card__skeleton-icon"></div>
          <div className="module-card__skeleton-title"></div>
        </div>
        <div className="module-card__skeleton-metrics">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="module-card__skeleton-metric"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="module-card"
      onClick={onClick}
      style={{ borderColor: getModuleColor() }}
    >
      <div className="module-card__header">
        <div
          className="module-card__icon"
          style={{ background: `${getModuleColor()}15`, color: getModuleColor() }}
        >
          {icon}
        </div>
        <h3 className="module-card__title">{moduleName}</h3>
      </div>
      <div className="module-card__metrics">
        {metrics.map((metric, index) => (
          <div key={index} className="module-card__metric">
            <div className="module-card__metric-value">{metric.value}</div>
            <div className="module-card__metric-label">{metric.label}</div>
          </div>
        ))}
      </div>
      <div className="module-card__footer">
        <span className="module-card__link">View Details →</span>
      </div>
    </div>
  );
};

export default ModuleCard;
