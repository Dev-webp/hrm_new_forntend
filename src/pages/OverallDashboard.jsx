/**
 * VJC Overall Dashboard
 * Unified dashboard combining HRMS, Invoice/CRM and Operations metrics
 * Updated to use real data from HRMS, Invoice/CRM, and OPS APIs
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  overallDashboardMockData,
  formatIndianCurrency,
  formatCompactCurrency,
  calculateCollectionPercentage,
  calculateApprovalPercentage,
} from '../data/overallDashboardMockData';
import api from '../services/api';
import { api as opsApi, hasOpsSession } from '../modules/ops/services/opsApi';
import { fetchAttendanceStats } from '../services/attendanceApi';
import './OverallDashboard.css';

// Use the same API configuration as the Finance Dashboard
const INVOICE_API = axios.create({
  baseURL: import.meta.env.VITE_INVOICE_API_URL || "http://localhost:5000/api"
});

const OverallDashboard = () => {
  const navigate = useNavigate();
  const hasOpsAuth = hasOpsSession();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = user.name || user.username || 'Admin';
  
  const [data, setData] = useState({
    hrms: {
      totalEmployees: 0,
      presentToday: 0,
      absentToday: 0,
      lateToday: 0,
      pendingLeaveRequests: 0,
      lateMTD: 0,
      absencesMTD: 0,
      dailyAttendance: [],
    },
    invoice: {
      totalSales: 0,
      paymentsReceived: 0,
      pendingAmount: 0,
      customers: 0,
      totalInvoices: 0,
      invoiceApprovals: { approved: 0, pending: 0, rejected: 0 },
      monthlyData: [],
    },
    ops: {
      totalLeads: 0,
      leadsCreatedToday: 0,
      casesPendingAudit: 0,
      auditCallsToday: { approved: 0, rejected: 0 },
      auditCallsMonth: { approved: 0, rejected: 0 },
      casePipeline: {
        counselor: 0,
        qualityAudit: 0,
        ops: 0,
        caseOfficer: 0,
        visaOutcome: 0,
      },
    },
    alerts: [],
    pendingWork: [],
    lastUpdated: new Date().toISOString(),
  });
  
  const [selectedPeriod, setSelectedPeriod] = useState('This month');
  const [selectedBranch, setSelectedBranch] = useState('Hyderabad');
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [showTableView, setShowTableView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh OPS data every 30 seconds
  useEffect(() => {
    const opsTimer = setInterval(() => {
      fetchOpsData();
    }, 30000); // 30 seconds
    return () => clearInterval(opsTimer);
  }, [fetchOpsData]);

  useEffect(() => {
    // Calculate date range based on current date
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const formatDateRange = (date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    
    setDateRange(`${formatDateRange(startOfMonth)} - ${formatDateRange(endOfMonth)}`);
  }, []);

  // Fetch all data on mount and when branch changes
  useEffect(() => {
    fetchHRMSData();
    fetchInvoiceData();
    fetchOpsData();
  }, [selectedBranch]);

  // Update alerts based on real data
  useEffect(() => {
    const alerts = [];
    
    if (data.hrms.absentToday > 0) {
      alerts.push({
        type: 'absent',
        label: 'Employees absent today',
        count: data.hrms.absentToday,
        route: '/admin/attendance',
        severity: 'warning',
      });
    }
    
    if (data.invoice.pendingAmount > 0) {
      alerts.push({
        type: 'payments',
        label: 'Payment pending amount',
        count: data.invoice.pendingAmount,
        route: '/admin/invoice',
        severity: 'danger',
      });
    }
    
    if (data.ops.casesPendingAudit > 0) {
      alerts.push({
        type: 'audit',
        label: 'Cases pending audit',
        count: data.ops.casesPendingAudit,
        route: '/admin/ops/cases',
        severity: 'warning',
      });
    }
    
    if (data.hrms.pendingLeaveRequests > 0) {
      alerts.push({
        type: 'approvals',
        label: 'Pending leave requests',
        count: data.hrms.pendingLeaveRequests,
        route: '/admin/leave',
        severity: 'good',
      });
    }
    
    setData(prev => ({ ...prev, alerts }));
  }, [data.hrms.absentToday, data.invoice.pendingAmount, data.ops.casesPendingAudit, data.hrms.pendingLeaveRequests]);

  // Update pending work based on real data
  useEffect(() => {
    const pendingWork = [];
    
    // Always show these 4 items
    pendingWork.push({
      icon: '👤',
      title: 'Approve leave requests',
      count: data.hrms.pendingLeaveRequests || 0,
      route: '/admin/leave',
    });
    
    pendingWork.push({
      icon: '📄',
      title: 'Invoice approvals',
      count: data.invoice.invoiceApprovals?.pending || 0,
      route: '/admin/invoice/invoices',
    });
    
    pendingWork.push({
      icon: '🔍',
      title: 'Quality audits',
      count: data.ops.casesPendingAudit || 0,
      route: '/admin/ops/audit',
    });
    
    pendingWork.push({
      icon: '🎯',
      title: 'OPS leads on remaining white spaces',
      count: data.ops.totalLeads || 0,
      route: '/admin/ops/leads',
    });
    
    setData(prev => ({ ...prev, pendingWork }));
  }, [data.hrms.pendingLeaveRequests, data.invoice.invoiceApprovals?.pending, data.ops.casesPendingAudit, data.ops.totalLeads]);

  const fetchHRMSData = useCallback(async () => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const start = startOfMonth.toISOString().split('T')[0];
      const end = endOfMonth.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];
      
      const branchParam = selectedBranch === 'Hyderabad' ? 'Hyderabad' : selectedBranch === 'Bengaluru' ? 'Bangalore' : 'all';
      
      const response = await api.get('/admin/dashboard/attendance', {
        params: { start, end, today: todayStr, branch: branchParam },
      });
      
      const hrmsData = response.data;
      
      if (!hrmsData.summary || Object.keys(hrmsData.summary).length === 0) {
        const monthlyStats = hrmsData.monthlyStats || {};
        setData(prev => ({
          ...prev,
          hrms: {
            totalEmployees: hrmsData.totalEmployees || 0,
            presentToday: monthlyStats.present || 0,
            absentToday: monthlyStats.absent || 0,
            lateToday: monthlyStats.late || 0,
            pendingLeaveRequests: hrmsData.pendingLeaves || 0,
            lateMTD: monthlyStats.late || 0,
            absencesMTD: monthlyStats.absent || 0,
            dailyAttendance: hrmsData.dailyAttendance || [],
          },
        }));
      } else {
        setData(prev => ({
          ...prev,
          hrms: {
            totalEmployees: hrmsData.totalEmployees || 0,
            presentToday: (hrmsData.summary?.present || 0) + (hrmsData.summary?.working || 0),
            absentToday: hrmsData.summary?.absent || 0,
            lateToday: hrmsData.summary?.late || 0,
            pendingLeaveRequests: hrmsData.pendingLeaves || 0,
            lateMTD: hrmsData.lateMTD || 0,
            absencesMTD: hrmsData.absencesMTD || 0,
            dailyAttendance: hrmsData.dailyAttendance || [],
          },
        }));
      }
    } catch (error) {
      console.error('Error fetching HRMS data:', error);
    }
  }, [selectedBranch]);

  const fetchInvoiceData = useCallback(async () => {
    const token = localStorage.getItem('vjc_invoice_auth');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const year = new Date().getFullYear();

    if (!token) {
      setData(prev => ({
        ...prev,
        invoice: {
          totalSales: 0,
          paymentsReceived: 0,
          pendingAmount: 0,
          customers: 0,
          totalInvoices: 0,
          invoiceApprovals: { approved: 0, pending: 0, rejected: 0 },
          monthlyData: [],
        },
      }));
      return;
    }

    try {
      const kpiRes = await INVOICE_API.get("/dashboard/kpis", config);
      const chartRes = await INVOICE_API.get(`/dashboard/sales-overview?year=${year}`, config);

      const invoiceData = kpiRes.data.data || {};
      const monthlyData = chartRes.data.data.chart || [];

      let approvals = { approved: 0, pending: 0, rejected: 0 };
      try {
        const [pendingRes, allRes, rejectedRes] = await Promise.all([
          INVOICE_API.get("/invoices/pending", config).catch(() => ({ data: { invoices: [] } })),
          INVOICE_API.get("/invoices", config).catch(() => ({ data: { invoices: [] } })),
          INVOICE_API.get("/invoices/rejected", config).catch(() => ({ data: { invoices: [] } })),
        ]);

        if (pendingRes.data?.invoices) {
          approvals.pending = Array.isArray(pendingRes.data.invoices) ? pendingRes.data.invoices.length : 0;
        }

        if (allRes.data?.invoices) {
          const allInvoices = Array.isArray(allRes.data.invoices) ? allRes.data.invoices : [];
          const approvedInvoices = allInvoices.filter(inv => {
            const status = (inv.status || '').toLowerCase();
            return status === 'approved' || status === 'paid';
          });
          approvals.approved = approvedInvoices.length;
        }

        if (rejectedRes.data?.invoices) {
          approvals.rejected = Array.isArray(rejectedRes.data.invoices) ? rejectedRes.data.invoices.length : 0;
        }
      } catch (approvalError) {
        console.warn('Approval endpoints failed, using zeros:', approvalError);
      }

      setData(prev => ({
        ...prev,
        invoice: {
          totalSales: invoiceData.totalSales || ((invoiceData.paymentsReceived || 0) + (invoiceData.pendingAmount || 0)),
          paymentsReceived: invoiceData.paymentsReceived || 0,
          pendingAmount: invoiceData.pendingAmount || 0,
          customers: invoiceData.totalCustomers || 0,
          totalInvoices: invoiceData.totalInvoices || 0,
          invoiceApprovals: approvals,
          monthlyData: monthlyData,
        },
      }));
    } catch (error) {
      console.error('Error fetching Invoice data:', error);
    }
  }, []);

  const fetchOpsData = useCallback(async () => {
    if (!hasOpsAuth) {
      console.log('OPS auth not available - showing zeros');
      setData(prev => ({
        ...prev,
        ops: {
          totalLeads: 0,
          leadsCreatedToday: 0,
          casesPendingAudit: 0,
          auditCallsToday: { approved: 0, rejected: 0 },
          auditCallsMonth: { approved: 0, rejected: 0 },
          casePipeline: {
            counselor: 0,
            qualityAudit: 0,
            ops: 0,
            caseOfficer: 0,
            visaOutcome: 0,
          },
        },
      }));
      return;
    }

    try {
      const stats = await opsApi.get('/dashboard/stats');
      const leads = await opsApi.get('/leads');
      
      const leadsData = leads.data || [];
      const totalLeads = Array.isArray(leadsData) ? leadsData.length : 0;
      const todayLeads = Array.isArray(leadsData) 
        ? leadsData.filter(lead => {
            const leadDate = new Date(lead.created_at);
            const today = new Date();
            return leadDate.toDateString() === today.toDateString();
          }).length
        : 0;

      setData(prev => ({
        ...prev,
        ops: {
          totalLeads: totalLeads,
          leadsCreatedToday: todayLeads,
          casesPendingAudit: stats.data?.cases_pending_audit || 0,
          auditCallsToday: { 
            approved: stats.data?.audit_calls_today_approved || 0, 
            rejected: stats.data?.audit_calls_today_rejected || 0 
          },
          auditCallsMonth: { 
            approved: stats.data?.audit_calls_month_approved || 0, 
            rejected: stats.data?.audit_calls_month_rejected || 0 
          },
          casePipeline: {
            counselor: stats.data?.case_pipeline_counselor || 0,
            qualityAudit: stats.data?.case_pipeline_quality_audit || 0,
            ops: stats.data?.case_pipeline_ops || 0,
            caseOfficer: stats.data?.case_pipeline_case_officer || 0,
            visaOutcome: stats.data?.case_pipeline_visa_outcome || 0,
          },
        },
      }));
    } catch (error) {
      console.error('Error fetching OPS data:', error);
      // Set default values on error
      setData(prev => ({
        ...prev,
        ops: {
          totalLeads: 0,
          leadsCreatedToday: 0,
          casesPendingAudit: 0,
          auditCallsToday: { approved: 0, rejected: 0 },
          auditCallsMonth: { approved: 0, rejected: 0 },
          casePipeline: {
            counselor: 0,
            qualityAudit: 0,
            ops: 0,
            caseOfficer: 0,
            visaOutcome: 0,
          },
        },
      }));
    }
  }, [hasOpsAuth]);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const formatDay = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatFullDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getMonthStats = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Total days in month
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Calculate Sundays
    let sundays = 0;
    for (let day = 1; day <= totalDays; day++) {
      const currentDate = new Date(year, month, day);
      if (currentDate.getDay() === 0) {
        sundays++;
      }
    }
    
    // Working days (total days - Sundays)
    const workingDays = totalDays - sundays;
    
    // Holidays (this is a simplified calculation - in production, you'd fetch from a holidays API)
    // For now, we'll estimate holidays as ~2 per month on average
    const holidays = 2;
    
    return {
      totalDays,
      workingDays,
      sundays,
      holidays
    };
  };

  const handleRefresh = () => {
    fetchHRMSData();
    fetchInvoiceData();
    fetchOpsData();
  };

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
    document.body.classList.toggle('dark-theme', !isDarkTheme);
  };

  const handleAlertClick = (alert) => {
    if (alert.route) {
      navigate(alert.route);
    }
  };

  const handlePendingWorkClick = (item) => {
    if (item.route) {
      navigate(item.route);
    }
  };

  const COLORS = {
    hrms: '#2a78d6',
    invoice: '#eb6834',
    ops: '#1baf7a',
    good: '#10b981',
    warning: '#f59e0b',
    bad: '#ef4444',
    present: '#10b981',
    late: '#f59e0b',
    absent: '#ef4444',
    sales: '#3b82f6',
    receipts: '#10b981',
    expenses: '#ef4444',
    bg: '#f8fafc',
    card: '#ffffff',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    navy: '#17283a',
  };

  const collectionPercentage = calculateCollectionPercentage(
    data.invoice.paymentsReceived,
    data.invoice.totalSales
  );

  const todayApprovalRate = calculateApprovalPercentage(
    data.ops.auditCallsToday.approved,
    data.ops.auditCallsToday.approved + data.ops.auditCallsToday.rejected
  );

  const monthApprovalRate = calculateApprovalPercentage(
    data.ops.auditCallsMonth.approved,
    data.ops.auditCallsMonth.approved + data.ops.auditCallsMonth.rejected
  );

  const monthStats = getMonthStats(currentDateTime);

  if (loading) {
    return (
      <div className="overall-dashboard overall-dashboard--loading">
        <div className="loading-skeleton">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className={`overall-dashboard ${isDarkTheme ? 'dark-theme' : ''}`}>
      {/* Compact Header */}
      <div className="dashboard-header">
        <div className="dashboard-header__left">
          <h1 className="dashboard-header__title">{getGreeting()}, {userName} 👋</h1>
        </div>
        <div className="dashboard-header__right">
          <div className="dashboard-header__date-display">
            <span className="dashboard-header__date-icon">📅</span>
            <span className="dashboard-header__date-text">{formatFullDate(currentDateTime)} • {formatTime(currentDateTime)}</span>
          </div>
          <button
            className="dashboard-header__button dashboard-header__button--refresh"
            onClick={handleRefresh}
            title="Refresh Data"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Monthly Statistics Strip */}
      <div className="monthly-stats-strip">
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--blue">
            <i className="fas fa-calendar-days"></i>
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Total Days</span>
            <span className="stat-card__value">{monthStats.totalDays}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--green">
            <i className="fas fa-briefcase"></i>
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Working Days</span>
            <span className="stat-card__value">{monthStats.workingDays}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--orange">
            <i className="fas fa-sun"></i>
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Sundays</span>
            <span className="stat-card__value">{monthStats.sundays}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon stat-card__icon--purple">
            <i className="fas fa-umbrella-beach"></i>
          </div>
          <div className="stat-card__content">
            <span className="stat-card__label">Holidays</span>
            <span className="stat-card__value">{monthStats.holidays}</span>
          </div>
        </div>
      </div>

      {/* Pending Work Section */}
      {data.pendingWork && data.pendingWork.length > 0 && (
        <div className="pending-work-section">
          <div className="pending-work-section__header">
            <h3 className="pending-work-section__title">Pending Work</h3>
            <span className="pending-work-section__view-all">View All &gt;</span>
          </div>
          <div className="pending-work-grid">
            {data.pendingWork.map((item, index) => (
              <div
                key={index}
                className="pending-work-card"
                onClick={() => handlePendingWorkClick(item)}
              >
                <div className="pending-work-card__icon">{item.icon}</div>
                <div className="pending-work-card__content">
                  <div className="pending-work-card__label">{item.title}</div>
                  <div className="pending-work-card__count">{item.count}</div>
                </div>
                <div className="pending-work-card__action">
                  <span className="pending-work-card__arrow">→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Period Controls */}
      <div className="dashboard-controls">
        <div className="dashboard-controls__presets">
          {['Today', 'Last 7 days', 'This month', 'Last 30 days'].map((preset) => (
            <button
              key={preset}
              className={`dashboard-controls__preset ${selectedPeriod === preset ? 'active' : ''}`}
              onClick={() => setSelectedPeriod(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
        <div className="dashboard-controls__filters">
          <div className="dashboard-controls__date-range">
            <span className="dashboard-controls__date-icon">📅</span>
            <span className="dashboard-controls__date-text">{dateRange}</span>
          </div>
          <select
            className="dashboard-controls__select"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option>Hyderabad</option>
            <option>Bengaluru</option>
          </select>
        </div>
      </div>

      {/* Pending Work Section */}
      {data.pendingWork && data.pendingWork.length > 0 && (
        <div className="pending-work-section">
          <div className="pending-work-grid">
            {data.pendingWork.map((item, index) => (
              <div
                key={index}
                className="pending-work-card"
                onClick={() => handlePendingWorkClick(item)}
              >
                <span className="pending-work-card__icon">{item.icon}</span>
                <span className="pending-work-card__label">{item.title}</span>
                <span className="pending-work-card__count">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Needs Attention Section */}
      <div className="attention-section">
        {data.alerts.map((alert, index) => (
          <div
            key={index}
            className={`attention-card attention-card--${alert.severity}`}
            onClick={() => handleAlertClick(alert)}
          >
            <div className="attention-card__icon">
              {alert.type === 'absent' && '👥'}
              {alert.type === 'payments' && '💰'}
              {alert.type === 'audit' && '📋'}
              {alert.type === 'approvals' && '✅'}
            </div>
            <div className="attention-card__content">
              <div className="attention-card__label">{alert.label}</div>
              <div className="attention-card__value">
                {alert.type === 'payments' ? formatIndianCurrency(alert.count) : alert.count}
              </div>
            </div>
            <div className="attention-card__action">
              <span className="attention-card__action-text">View</span>
              <span className="attention-card__arrow">→</span>
            </div>
          </div>
        ))}
      </div>

      {showTableView ? (
        /* Table View */
        <div className="table-view-container">
          <div className="table-view-header">
            <h2 className="table-view__title">Table View (All Metrics)</h2>
            <button
              className="table-view__toggle"
              onClick={() => setShowTableView(false)}
            >
              ✕ Close
            </button>
          </div>
          <div className="table-view-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>System</th>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>HRMS</td>
                  <td>Total Employees</td>
                  <td>{data.hrms.totalEmployees}</td>
                </tr>
                <tr>
                  <td>HRMS</td>
                  <td>Present Today</td>
                  <td>{data.hrms.presentToday}</td>
                </tr>
                <tr>
                  <td>HRMS</td>
                  <td>Absent Today</td>
                  <td>{data.hrms.absentToday}</td>
                </tr>
                <tr>
                  <td>HRMS</td>
                  <td>Late Today</td>
                  <td>{data.hrms.lateToday}</td>
                </tr>
                <tr>
                  <td>HRMS</td>
                  <td>Pending Leave Requests</td>
                  <td>{data.hrms.pendingLeaveRequests}</td>
                </tr>
                <tr>
                  <td>HRMS</td>
                  <td>Late MTD</td>
                  <td>{data.hrms.lateMTD}</td>
                </tr>
                <tr>
                  <td>HRMS</td>
                  <td>Absences MTD</td>
                  <td>{data.hrms.absencesMTD}</td>
                </tr>
                <tr>
                  <td>Invoice</td>
                  <td>Total Sales</td>
                  <td>{formatIndianCurrency(data.invoice.totalSales)}</td>
                </tr>
                <tr>
                  <td>Invoice</td>
                  <td>Payments Received</td>
                  <td>{formatIndianCurrency(data.invoice.paymentsReceived)}</td>
                </tr>
                <tr>
                  <td>Invoice</td>
                  <td>Pending Amount</td>
                  <td>{formatIndianCurrency(data.invoice.pendingAmount)}</td>
                </tr>
                <tr>
                  <td>Invoice</td>
                  <td>Customers</td>
                  <td>{data.invoice.customers}</td>
                </tr>
                <tr>
                  <td>Invoice</td>
                  <td>Total Invoices</td>
                  <td>{data.invoice.totalInvoices}</td>
                </tr>
                <tr>
                  <td>Invoice</td>
                  <td>Approved Invoices</td>
                  <td>{data.invoice.invoiceApprovals.approved}</td>
                </tr>
                <tr>
                  <td>Invoice</td>
                  <td>Pending Invoices</td>
                  <td>{data.invoice.invoiceApprovals.pending}</td>
                </tr>
                <tr>
                  <td>Invoice</td>
                  <td>Rejected Invoices</td>
                  <td>{data.invoice.invoiceApprovals.rejected}</td>
                </tr>
                <tr>
                  <td>OPS</td>
                  <td>Total Leads</td>
                  <td>{data.ops.totalLeads}</td>
                </tr>
                <tr>
                  <td>OPS</td>
                  <td>Leads Created Today</td>
                  <td>{data.ops.leadsCreatedToday}</td>
                </tr>
                <tr>
                  <td>OPS</td>
                  <td>Cases Pending Audit</td>
                  <td>{data.ops.casesPendingAudit}</td>
                </tr>
                <tr>
                  <td>OPS</td>
                  <td>Audit Calls Approved (Today)</td>
                  <td>{data.ops.auditCallsToday.approved}</td>
                </tr>
                <tr>
                  <td>OPS</td>
                  <td>Audit Calls Rejected (Today)</td>
                  <td>{data.ops.auditCallsToday.rejected}</td>
                </tr>
                <tr>
                  <td>OPS</td>
                  <td>Audit Calls Approved (Month)</td>
                  <td>{data.ops.auditCallsMonth.approved}</td>
                </tr>
                <tr>
                  <td>OPS</td>
                  <td>Audit Calls Rejected (Month)</td>
                  <td>{data.ops.auditCallsMonth.rejected}</td>
                </tr>
                <tr>
                  <td>OPS</td>
                  <td>Counselor Pipeline</td>
                  <td>{data.ops.casePipeline.counselor}</td>
                </tr>
                <tr>
                  <td>OPS</td>
                  <td>Quality Audit Pipeline</td>
                  <td>{data.ops.casePipeline.qualityAudit}</td>
                </tr>
                <tr>
                  <td>OPS</td>
                  <td>OPS Pipeline</td>
                  <td>{data.ops.casePipeline.ops}</td>
                </tr>
                <tr>
                  <td>OPS</td>
                  <td>Case Officer Pipeline</td>
                  <td>{data.ops.casePipeline.caseOfficer}</td>
                </tr>
                <tr>
                  <td>OPS</td>
                  <td>Visa Outcome Pipeline</td>
                  <td>{data.ops.casePipeline.visaOutcome}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            {/* Row 1 - Leads and Attendance */}
            <div className="kpi-card kpi-card--ops">
              <div className="kpi-card__icon">🎯</div>
              <div className="kpi-card__content">
                <div className="kpi-card__label">Total Leads</div>
                <div className="kpi-card__value">{data.ops.totalLeads}</div>
                <div className="kpi-card__sub">All time</div>
              </div>
              <div className="kpi-card__arrow">→</div>
            </div>

            <div className="kpi-card kpi-card--ops">
              <div className="kpi-card__icon">📊</div>
              <div className="kpi-card__content">
                <div className="kpi-card__label">Today's Leads</div>
                <div className="kpi-card__value">{data.ops.leadsCreatedToday}</div>
                <div className="kpi-card__sub">Created today</div>
              </div>
              <div className="kpi-card__arrow">→</div>
            </div>

            <div className="kpi-card kpi-card--hrms">
              <div className="kpi-card__icon">✅</div>
              <div className="kpi-card__content">
                <div className="kpi-card__label">Present Today</div>
                <div className="kpi-card__value">{data.hrms.presentToday}</div>
                <div className="kpi-card__sub">of {data.hrms.totalEmployees} employees</div>
              </div>
              <div className="kpi-card__arrow">→</div>
            </div>

            <div className="kpi-card kpi-card--hrms">
              <div className="kpi-card__icon">❌</div>
              <div className="kpi-card__content">
                <div className="kpi-card__label">Absent Today</div>
                <div className="kpi-card__value">{data.hrms.absentToday}</div>
                <div className="kpi-card__sub">of {data.hrms.totalEmployees} employees</div>
              </div>
              <div className="kpi-card__arrow">→</div>
            </div>

            {/* Row 2 - Financial Performance */}
            <div className="kpi-card kpi-card--invoice">
              <div className="kpi-card__icon">💰</div>
              <div className="kpi-card__content">
                <div className="kpi-card__label">Total Sales</div>
                <div className="kpi-card__value">{formatCompactCurrency(data.invoice.totalSales)}</div>
                <div className="kpi-card__sub">This month</div>
              </div>
              <div className="kpi-card__arrow">→</div>
            </div>

            <div className="kpi-card kpi-card--invoice">
              <div className="kpi-card__icon">✅</div>
              <div className="kpi-card__content">
                <div className="kpi-card__label">Payments Received</div>
                <div className="kpi-card__value">{formatCompactCurrency(data.invoice.paymentsReceived)}</div>
                <div className="kpi-card__sub">Collected</div>
              </div>
              <div className="kpi-card__arrow">→</div>
            </div>

            <div className="kpi-card kpi-card--invoice">
              <div className="kpi-card__icon">⏳</div>
              <div className="kpi-card__content">
                <div className="kpi-card__label">Pending Amount</div>
                <div className="kpi-card__value">{formatCompactCurrency(data.invoice.pendingAmount)}</div>
                <div className="kpi-card__sub">Outstanding</div>
              </div>
              <div className="kpi-card__arrow">→</div>
            </div>

            <div className="kpi-card kpi-card--invoice">
              <div className="kpi-card__icon">👥</div>
              <div className="kpi-card__content">
                <div className="kpi-card__label">Customers</div>
                <div className="kpi-card__value">{data.invoice.customers}</div>
                <div className="kpi-card__sub">Total customers</div>
              </div>
              <div className="kpi-card__arrow">→</div>
            </div>
          </div>

          {/* Monthly Comparison Charts */}
          <div className="charts-section">
            <div className="chart-card">
              <div className="chart-card__header">
                <h3 className="chart-card__title">Daily Attendance (This Month)</h3>
                <div className="chart-card__legend">
                  <span className="legend-item legend-item--present">Present</span>
                  <span className="legend-item legend-item--late">Late</span>
                  <span className="legend-item legend-item--absent">Absent</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.hrms.dailyAttendance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value, name) => [value, name]}
                    labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                  />
                  <Bar dataKey="present" stackId="a" fill={COLORS.present} name="Present" />
                  <Bar dataKey="late" stackId="a" fill={COLORS.late} name="Late" />
                  <Bar dataKey="absent" stackId="a" fill={COLORS.absent} name="Absent" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <div className="chart-card__header">
                <h3 className="chart-card__title">Monthly Sales, Receipts and Expenses</h3>
                <div className="chart-card__legend">
                  <span className="legend-item legend-item--sales">Sales</span>
                  <span className="legend-item legend-item--receipts">Receipts</span>
                  <span className="legend-item legend-item--expenses">Expenses</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.invoice.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(value) => formatCompactCurrency(value)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatIndianCurrency(value)} />
                  <Bar dataKey="sales" fill={COLORS.sales} name="Sales" />
                  <Bar dataKey="receipts" fill={COLORS.receipts} name="Receipts" />
                  <Bar dataKey="expenses" fill={COLORS.expenses} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Operations Section */}
          <div className="operations-section">
            {/* Panel 1: Case Pipeline */}
            <div className="ops-panel">
              <h3 className="ops-panel__title">Operations - Case Pipeline</h3>
              <div className="pipeline-list">
                {[
                  { label: 'Counselor', count: data.ops.casePipeline.counselor },
                  { label: 'Quality Audit', count: data.ops.casePipeline.qualityAudit },
                  { label: 'OPS', count: data.ops.casePipeline.ops },
                  { label: 'Case Officer', count: data.ops.casePipeline.caseOfficer },
                  { label: 'Visa Outcome', count: data.ops.casePipeline.visaOutcome },
                ].map((item, index) => (
                  <div key={index} className="pipeline-item">
                    <div className="pipeline-item__label">{item.label}</div>
                    <div className="pipeline-item__track">
                      <div 
                        className="pipeline-item__bar" 
                        style={{ width: `${(item.count / 100) * 100}%` }}
                      ></div>
                    </div>
                    <div className="pipeline-item__count">{item.count}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 2: Audit Calls */}
            <div className="ops-panel">
              <h3 className="ops-panel__title">Audit Calls</h3>
              <div className="audit-calls">
                <div className="audit-calls__section">
                  <div className="audit-calls__header">
                    <span className="audit-calls__period">Today</span>
                    <span className="audit-calls__rate">{todayApprovalRate}% approved</span>
                  </div>
                  <div className="audit-calls__bars">
                    <div className="audit-bar audit-bar--approved">
                      <div className="audit-bar__bar" style={{ width: `${todayApprovalRate}%` }}></div>
                      <span className="audit-bar__value">{data.ops.auditCallsToday.approved}</span>
                    </div>
                    <div className="audit-bar audit-bar--rejected">
                      <div className="audit-bar__bar" style={{ width: `${100 - todayApprovalRate}%` }}></div>
                      <span className="audit-bar__value">{data.ops.auditCallsToday.rejected}</span>
                    </div>
                  </div>
                </div>
                <div className="audit-calls__section">
                  <div className="audit-calls__header">
                    <span className="audit-calls__period">This Month</span>
                    <span className="audit-calls__rate">{monthApprovalRate}% approved</span>
                  </div>
                  <div className="audit-calls__bars">
                    <div className="audit-bar audit-bar--approved">
                      <div className="audit-bar__bar" style={{ width: `${monthApprovalRate}%` }}></div>
                      <span className="audit-bar__value">{data.ops.auditCallsMonth.approved}</span>
                    </div>
                    <div className="audit-bar audit-bar--rejected">
                      <div className="audit-bar__bar" style={{ width: `${100 - monthApprovalRate}%` }}></div>
                      <span className="audit-bar__value">{data.ops.auditCallsMonth.rejected}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 3: Payments Status */}
            <div className="ops-panel">
              <h3 className="ops-panel__title">Payments Status</h3>
              <div className="payments-donut">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Received', value: data.invoice.paymentsReceived },
                        { name: 'Pending', value: data.invoice.pendingAmount },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill={COLORS.receipts} />
                      <Cell fill={COLORS.warning} />
                    </Pie>
                    <Tooltip formatter={(value) => formatIndianCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="payments-donut__center">
                  <div className="payments-donut__percentage">{collectionPercentage}%</div>
                  <div className="payments-donut__label">Collected</div>
                </div>
              </div>
              <div className="payments-donut__legend">
                <div className="payments-donut__legend-item">
                  <span className="payments-donut__dot payments-donut__dot--received"></span>
                  <span className="payments-donut__label">Received: {formatIndianCurrency(data.invoice.paymentsReceived)}</span>
                </div>
                <div className="payments-donut__legend-item">
                  <span className="payments-donut__dot payments-donut__dot--pending"></span>
                  <span className="payments-donut__label">Pending: {formatIndianCurrency(data.invoice.pendingAmount)}</span>
                </div>
              </div>
            </div>

            {/* Panel 4: Pending Work */}
            <div className="ops-panel">
              <h3 className="ops-panel__title">Pending Work</h3>
              <div className="pending-work-list">
                {data.pendingWork.map((item, index) => (
                  <div
                    key={index}
                    className="pending-work-item"
                    onClick={() => handlePendingWorkClick(item)}
                  >
                    <div className="pending-work-item__icon">
                      {item.system === 'HRMS' && '👤'}
                      {item.system === 'Invoice' && '💰'}
                      {item.system === 'OPS' && '📋'}
                      {item.system === 'CRM' && '🎯'}
                    </div>
                    <div className="pending-work-item__label">{item.label}</div>
                    <div className="pending-work-item__count">{item.count}</div>
                    <div className="pending-work-item__arrow">→</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="bottom-section">
            {/* Invoice Approval Status */}
            <div className="bottom-panel">
              <h3 className="bottom-panel__title">Invoice Approval Status</h3>
              <div className="approval-cards">
                <div className="approval-card approval-card--approved">
                  <div className="approval-card__dot"></div>
                  <div className="approval-card__content">
                    <div className="approval-card__label">Approved</div>
                    <div className="approval-card__value">{data.invoice.invoiceApprovals.approved}</div>
                  </div>
                </div>
                <div className="approval-card approval-card--pending">
                  <div className="approval-card__dot"></div>
                  <div className="approval-card__content">
                    <div className="approval-card__label">Pending</div>
                    <div className="approval-card__value">{data.invoice.invoiceApprovals.pending}</div>
                  </div>
                </div>
                <div className="approval-card approval-card--rejected">
                  <div className="approval-card__dot"></div>
                  <div className="approval-card__content">
                    <div className="approval-card__label">Rejected</div>
                    <div className="approval-card__value">{data.invoice.invoiceApprovals.rejected}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Table View Toggle */}
            <div className="bottom-panel">
              <div className="table-view-toggle-panel">
                <h3 className="bottom-panel__title">Table View (All Metrics)</h3>
                <button
                  className="table-view-toggle-button"
                  onClick={() => setShowTableView(true)}
                >
                  View Table →
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="dashboard-footer">
        <div className="dashboard-footer__status">
          <div className="status-item">
            <span className="status-dot status-dot--online"></span>
            <span className="status-label">HRMS Online</span>
          </div>
          <div className="status-item">
            <span className="status-dot status-dot--online"></span>
            <span className="status-label">Invoice/CRM Online</span>
          </div>
          <div className="status-item">
            <span className="status-dot status-dot--online"></span>
            <span className="status-label">Ops Online</span>
          </div>
        </div>
        <div className="dashboard-footer__info">
          <span className="dashboard-footer__name">Overall Dashboard</span>
          <span className="dashboard-footer__separator">|</span>
          <span className="dashboard-footer__updated">Updated: {new Date(data.lastUpdated).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default OverallDashboard;
