/**
 * Status Badge Component
 * Displays status with appropriate color coding
 */

import React from 'react';
import { theme } from '../../designTokens';
import './StatusBadge.css';

const StatusBadge = ({
  status,
  variant = 'default', // 'default', 'outline', 'filled'
  size = 'default', // 'small', 'default', 'large'
  icon,
}) => {
  const getStatusColor = () => {
    const statusLower = status?.toLowerCase();
    const colorMap = {
      // Success states
      approved: theme.colors.success,
      paid: theme.colors.success,
      completed: theme.colors.success,
      online: theme.colors.success,
      present: theme.colors.success,
      visa_approved: theme.colors.success,

      // Warning states
      pending: theme.colors.warning,
      in_progress: theme.colors.warning,
      processing: theme.colors.warning,
      in_processing: theme.colors.warning,
      follow_up: theme.colors.warning,
      late: theme.colors.warning,

      // Danger states
      rejected: theme.colors.danger,
      overdue: theme.colors.danger,
      failed: theme.colors.danger,
      offline: theme.colors.text.secondary,
      absent: theme.colors.danger,
      on_hold: theme.colors.danger,

      // Info states
      new: theme.colors.info,
      active: theme.colors.info,
      draft: theme.colors.text.secondary,
      on_leave: theme.colors.info,
    };
    return colorMap[statusLower] || theme.colors.text.secondary;
  };

  const variantStyles = {
    default: {
      background: `${getStatusColor()}15`,
      color: getStatusColor(),
      border: 'none',
    },
    outline: {
      background: 'transparent',
      color: getStatusColor(),
      border: `1px solid ${getStatusColor()}`,
    },
    filled: {
      background: getStatusColor(),
      color: '#ffffff',
      border: 'none',
    },
  };

  const sizeStyles = {
    small: {
      padding: '2px 8px',
      fontSize: '11px',
    },
    default: {
      padding: '4px 12px',
      fontSize: '12px',
    },
    large: {
      padding: '6px 16px',
      fontSize: '14px',
    },
  };

  const style = {
    ...variantStyles[variant],
    ...sizeStyles[size],
  };

  return (
    <span className="status-badge" style={style}>
      {icon && <span className="status-badge__icon">{icon}</span>}
      <span className="status-badge__text">{status}</span>
    </span>
  );
};

export default StatusBadge;
