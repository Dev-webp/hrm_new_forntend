/**
 * KPI Card Component
 * Displays a key performance indicator with value, label, and optional trend
 */

import React from 'react';
import { theme } from '../../designTokens';
import './KPICard.css';

const KPICard = ({
  title,
  value,
  label,
  trend,
  trendDirection = 'neutral', // 'up', 'down', 'neutral'
  icon,
  color = 'primary',
  size = 'default', // 'default', 'large', 'small'
  loading = false,
  onClick,
}) => {
  const getTrendIcon = () => {
    if (trendDirection === 'up') return '↗';
    if (trendDirection === 'down') return '↘';
    return '→';
  };

  const getTrendColor = () => {
    if (trendDirection === 'up') return theme.colors.success;
    if (trendDirection === 'down') return theme.colors.danger;
    return theme.colors.text.secondary;
  };

  if (loading) {
    return (
      <div className="kpi-card kpi-card--loading">
        <div className="kpi-card__skeleton">
          <div className="kpi-card__skeleton-icon"></div>
          <div className="kpi-card__skeleton-content">
            <div className="kpi-card__skeleton-title"></div>
            <div className="kpi-card__skeleton-value"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`kpi-card kpi-card--${size} ${onClick ? 'kpi-card--clickable' : ''}`}
      onClick={onClick}
    >
      {icon && (
        <div className="kpi-card__icon" style={{ color: theme.colors[color] }}>
          {icon}
        </div>
      )}
      <div className="kpi-card__content">
        <div className="kpi-card__header">
          <h3 className="kpi-card__title">{title}</h3>
          {trend && (
            <div className="kpi-card__trend" style={{ color: getTrendColor() }}>
              <span className="kpi-card__trend-icon">{getTrendIcon()}</span>
              <span className="kpi-card__trend-value">{trend}</span>
            </div>
          )}
        </div>
        <div className="kpi-card__value">{value}</div>
        {label && <div className="kpi-card__label">{label}</div>}
      </div>
    </div>
  );
};

export default KPICard;
