/**
 * VJC Overseas Unified Portal - Executive Dashboard
 * Professional enterprise-grade management dashboard
 * Updated to use real data from HRMS, Invoice/CRM, and OPS APIs
 */

import { useState, useEffect, useCallback } from 'react';
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
  ResponsiveContainer,
} from 'recharts';
import { AttendanceTrendChart } from '../../components/Charts';
import api from '../../services/api';
import { api as opsApi } from '../../modules/ops/services/opsApi';
import { useOpsAuth } from '../../context/OpsAuthContext';
import { fetchAttendanceStats } from '../../services/attendanceApi';
import './AdminOverview.css';

// Use the same API configuration as the Finance Dashboard
const INVOICE_API = axios.create({
  baseURL: import.meta.env.VITE_INVOICE_API_URL || "http://localhost:5000/api"
});

const AdminOverview = () => {
  const navigate = useNavigate();

  const opsAuth = useOpsAuth();
  const hasOpsAuth = opsAuth.enabled && opsAuth.ready;
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
      approvals: { approved: 0, pending: 0, rejected: 0 },
      monthlyData: [],
    },
    crm: {
      totalLeads: 0,
      leadsCreatedToday: 0,
      leadsByStatus: {},
    },
    ops: {
      totalLeads: 0,
      leadsCreatedToday: 0,
      casesPendingAudit: 0,
      auditCalls: {
        approved: 0,
        rejected: 0,
      },
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
  
  const [showTableView, setShowTableView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceChartData, setAttendanceChartData] = useState({
    labels: [],
    present: [],
    late: [],
    absent: [],
  });

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchHRMSData = useCallback(async () => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const start = startOfMonth.toISOString().split('T')[0];
      const end = endOfMonth.toISOString().split('T')[0];
      const todayStr = today.toISOString().split('T')[0];
      
      console.log('Fetching HRMS data with params:', { start, end, today: todayStr, branch: 'all' });
      
      const response = await api.get('/admin/dashboard/attendance', {
        params: {
          start,
          end,
          today: todayStr,
          branch: 'all',
        },
      });
      
      console.log('HRMS API response:', response.data);
      console.log('Summary:', response.data.summary);
      console.log('Daily attendance length:', response.data.dailyAttendance?.length);
      
      const hrmsData = response.data;
      
      // Check if summary exists and has data
      if (!hrmsData.summary || Object.keys(hrmsData.summary).length === 0) {
        console.warn('Summary is empty, using monthly stats as fallback');
        // Use monthly totals as fallback if summary is empty
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

      // Update attendance chart data
      // The HRMS API returns dailySummary array with day, present, late, absent
      console.log('[Executive Dashboard] HRMS data for chart:', {
        dailySummary: hrmsData.dailySummary,
        dailyAttendance: hrmsData.dailyAttendance
      });
      
      if (hrmsData.dailySummary && hrmsData.dailySummary.length > 0) {
        console.log('[Executive Dashboard] Using dailySummary for attendance chart');
        setAttendanceChartData({
          labels: hrmsData.dailySummary.map(d => d.day),
          present: hrmsData.dailySummary.map(d => d.present),
          late: hrmsData.dailySummary.map(d => d.late),
          absent: hrmsData.dailySummary.map(d => d.absent),
        });
      } else if (hrmsData.dailyAttendance && hrmsData.dailyAttendance.length > 0) {
        // Fallback to dailyAttendance if dailySummary is not available
        console.log('[Executive Dashboard] Using dailyAttendance for attendance chart');
        setAttendanceChartData({
          labels: hrmsData.dailyAttendance.map(d => new Date(d.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })),
          present: hrmsData.dailyAttendance.map(d => d.present),
          late: hrmsData.dailyAttendance.map(d => d.late),
          absent: hrmsData.dailyAttendance.map(d => d.absent),
        });
      } else {
        console.log('[Executive Dashboard] No attendance data available for chart');
      }
    } catch (error) {
      console.error('Error fetching HRMS data:', error);
      console.error('Error response:', error.response);
      // Show error instead of dummy data
      setData(prev => ({
        ...prev,
        hrms: {
          totalEmployees: 0,
          presentToday: 0,
          absentToday: 0,
          lateToday: 0,
          pendingLeaveRequests: 0,
          lateMTD: 0,
          absencesMTD: 0,
        },
      }));
      setAttendanceChartData({
        labels: [],
        present: [],
        late: [],
        absent: [],
      });
    }
  }, []);

  const fetchInvoiceData = useCallback(async () => {
    console.log('[Executive Dashboard] fetchInvoiceData called');
    const token = localStorage.getItem('vjc_invoice_auth');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    const year = new Date().getFullYear();

    if (!token) {
      console.log('[Executive Dashboard] Invoice auth not available - showing zeros');
      setData(prev => ({
        ...prev,
        invoice: {
          totalSales: 0,
          paymentsReceived: 0,
          pendingAmount: 0,
          customers: 0,
          totalInvoices: 0,
          approvals: { approved: 0, pending: 0, rejected: 0 },
          monthlyData: [],
        },
      }));
      return;
    }

    try {
      // Get KPI data (same as Finance Dashboard)
      const kpiRes = await INVOICE_API.get("/dashboard/kpis", config);
      console.log('[Executive Dashboard] KPI data received:', kpiRes.data.data);
      
      // Get chart data (same as Finance Dashboard)
      const chartRes = await INVOICE_API.get(`/dashboard/sales-overview?year=${year}`, config);
      console.log('[Executive Dashboard] Chart data received:', chartRes.data.data);

      const invoiceData = kpiRes.data.data || {};
      const monthlyData = chartRes.data.data.chart || [];

      console.log('[Executive Dashboard] Chart response structure:', Object.keys(chartRes.data.data));
      console.log('[Executive Dashboard] Monthly data extracted:', monthlyData);
      console.log('[Executive Dashboard] Monthly data is array:', Array.isArray(monthlyData));
      console.log('[Executive Dashboard] Monthly data length:', monthlyData.length);

      // Try to get approval counts, but don't let failures affect main data
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

        // Filter all invoices for approved status - case-insensitive
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

        console.log('[Executive Dashboard] Approvals:', approvals);
      } catch (approvalError) {
        console.warn('[Executive Dashboard] Approval endpoints failed, using zeros:', approvalError);
      }

      setData(prev => ({
        ...prev,
        invoice: {
          totalSales: invoiceData.totalSales || ((invoiceData.paymentsReceived || 0) + (invoiceData.pendingAmount || 0)),
          paymentsReceived: invoiceData.paymentsReceived || 0,
          pendingAmount: invoiceData.pendingAmount || 0,
          customers: invoiceData.totalCustomers || 0,
          totalInvoices: invoiceData.totalInvoices || 0,
          approvals: approvals,
          monthlyData: monthlyData,
        },
      }));

      console.log('[Executive Dashboard] Invoice data updated successfully');
    } catch (error) {
      console.error('[Executive Dashboard] Error fetching Invoice data:', error);
      console.log('[Executive Dashboard] Invoice API not available - showing zeros');
      setData(prev => ({
        ...prev,
        invoice: {
          totalSales: 0,
          paymentsReceived: 0,
          pendingAmount: 0,
          customers: 0,
          totalInvoices: 0,
          approvals: { approved: 0, pending: 0, rejected: 0 },
          monthlyData: [],
        },
      }));
    }
  }, []);

  const fetchCRMData = useCallback(async () => {
    console.log('[Executive Dashboard] fetchCRMData called');

    try {
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem("vjc_invoice_auth")}` }
      };

      const leadsRes = await INVOICE_API.get("/leads", config);
      const leads = leadsRes.data.leads || [];

      const totalLeads = leads.length;
      const today = new Date().toISOString().split('T')[0];
      const leadsCreatedToday = leads.filter(l => l.created_at && l.created_at.startsWith(today)).length;

      const leadsByStatus = leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {});

      console.log('[Executive Dashboard] CRM data received:', { totalLeads, leadsCreatedToday, leadsByStatus });

      setData(prev => ({
        ...prev,
        crm: {
          totalLeads,
          leadsCreatedToday,
          leadsByStatus,
        },
      }));

      console.log('[Executive Dashboard] CRM data updated successfully');
    } catch (error) {
      console.error('[Executive Dashboard] Error fetching CRM data:', error);
      console.log('[Executive Dashboard] CRM API not available - showing zeros');
      setData(prev => ({
        ...prev,
        crm: {
          totalLeads: 0,
          leadsCreatedToday: 0,
          leadsByStatus: {},
        },
      }));
    }
  }, []);

  const fetchOpsData = useCallback(async () => {
    console.log('[Executive Dashboard] fetchOpsData called');
    console.log('[Executive Dashboard] hasOpsAuth:', hasOpsAuth);
    console.log('[Executive Dashboard] opsAuth.enabled:', opsAuth.enabled);
    console.log('[Executive Dashboard] opsAuth.ready:', opsAuth.ready);

    // If OPS access is disabled for this user, show zeros
    if (!opsAuth.enabled) {
      console.log('[Executive Dashboard] OPS access disabled for user - showing zeros');
      setData(prev => ({
        ...prev,
        ops: {
          totalLeads: 0,
          leadsCreatedToday: 0,
          casesPendingAudit: 0,
          auditCalls: { approved: 0, rejected: 0 },
          casePipeline: { counselor: 0, qualityAudit: 0, ops: 0, caseOfficer: 0, visaOutcome: 0 },
        },
      }));
      return;
    }

    // If OPS auth is not ready yet, don't update (wait for it to be ready)
    if (!opsAuth.ready) {
      console.log('[Executive Dashboard] OPS auth not ready yet - waiting...');
      return;
    }
    
    try {
      console.log('[Executive Dashboard] Fetching OPS data from: /dashboard/stats using opsApi');
      console.log('[Executive Dashboard] OPS origin:', import.meta.env.VITE_OPS_API_URL || 'http://localhost:4000');

      // Use the existing opsApi to fetch data (it handles authentication internally)
      // Note: opsApi already adds /api to the base URL, so we call /dashboard/stats not /api/dashboard/stats
      const opsData = await opsApi.get('/dashboard/stats');
      console.log('[Executive Dashboard] OPS data received:', opsData);

      // OPS backend returns nested structure: leads, audits, cases, pipeline, recentAudits
      const leads = opsData.leads || {};
      const audits = opsData.audits || {};
      const cases = opsData.cases || {};
      const pipeline = opsData.pipeline || {};

      setData(prev => ({
        ...prev,
        ops: {
          totalLeads: leads.total || 0,
          leadsCreatedToday: leads.today || 0,
          casesPendingAudit: audits.pending || 0,
          auditCalls: {
            approved: audits.approved || 0,
            rejected: audits.rejected || 0,
          },
          casePipeline: {
            counselor: pipeline.counselor || pipeline.leads || leads.total || 0,
            qualityAudit: pipeline.qualityAudit || pipeline.audit || audits.pending || 0,
            ops: pipeline.ops || pipeline.inProcess || cases.inProgress || 0,
            caseOfficer: pipeline.caseOfficer || pipeline.case_officer || cases.inProgress || 0,
            visaOutcome: pipeline.visaOutcome || pipeline.visa_outcome || cases.completed || 0,
          },
        },
      }));
      
      console.log('[Executive Dashboard] OPS data updated successfully');
    } catch (error) {
      console.error('[Executive Dashboard] Error fetching OPS data:', error);
      console.error('[Executive Dashboard] OPS error message:', error.message);
      console.error('[Executive Dashboard] OPS error status:', error.status);
      console.error('[Executive Dashboard] OPS error stack:', error.stack);
      console.log('[Executive Dashboard] OPS API not available - showing zeros');
      setData(prev => ({
        ...prev,
        ops: {
          totalLeads: 0,
          leadsCreatedToday: 0,
          casesPendingAudit: 0,
          auditCalls: { today: { approved: 0, rejected: 0 }, month: { approved: 0, rejected: 0 } },
          casePipeline: { counselor: 0, qualityAudit: 0, ops: 0, caseOfficer: 0, visaOutcome: 0 },
        },
      }));
    }
  }, [hasOpsAuth, opsAuth]);

  const generateAlerts = useCallback((hrms, invoice, ops) => {
    const alerts = [];
    
    if (hrms.absentToday > 0) {
      alerts.push({
        icon: '👥',
        title: 'Employees absent today',
        value: hrms.absentToday,
        route: '/admin/attendance',
      });
    }

    if (invoice.pendingAmount > 0) {
      alerts.push({
        icon: '💰',
        title: 'Payment pending amount',
        value: formatIndianCurrency(invoice.pendingAmount),
        route: '/admin/crm/customers',
      });
    }

    if (ops.casesPendingAudit > 0) {
      alerts.push({
        icon: '📋',
        title: 'Cases pending audit',
        value: ops.casesPendingAudit,
        route: '/admin/ops/cases',
      });
    }

    if (ops.auditCalls && (ops.auditCalls.approved || 0) + (ops.auditCalls.rejected || 0) > 0) {
      alerts.push({
        icon: '🔍',
        title: 'Quality audits',
        value: (ops.auditCalls.approved || 0) + (ops.auditCalls.rejected || 0),
        route: '/admin/ops/audit',
      });
    }

    const pendingApprovals = (hrms.pendingLeaveRequests || 0) + (invoice.approvals?.pending || 0);
    if (pendingApprovals > 0) {
      alerts.push({
        icon: '✅',
        title: 'Pending approvals',
        value: pendingApprovals,
        route: '/admin/invoice/approvals',
      });
    }
    
    return alerts;
  }, []);

  const generatePendingWork = useCallback((hrms, invoice, crm, ops) => {
    const pendingWork = [];

    // Always show these 4 items
    pendingWork.push({
      icon: '👤',
      title: 'Approve leave requests',
      count: hrms.pendingLeaveRequests || 0,
      route: '/admin/leave',
    });

    pendingWork.push({
      icon: '📄',
      title: 'Invoice approvals',
      count: invoice.approvals?.pending || 0,
      route: '/admin/invoice/approvals',
    });

    pendingWork.push({
      icon: '🔍',
      title: 'Quality audits',
      count: ops.casesPendingAudit || 0,
      route: '/admin/ops/audit',
    });

    pendingWork.push({
      icon: '🎯',
      title: 'OPS leads on remaining white spaces',
      count: ops.totalLeads || 0,
      route: '/admin/ops/leads',
    });

    return pendingWork;
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchHRMSData(),
      fetchInvoiceData(),
      fetchCRMData(),
      fetchOpsData(),
    ]);
    setLoading(false);
  }, [fetchHRMSData, fetchInvoiceData, fetchCRMData, fetchOpsData, hasOpsAuth]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-refresh OPS data every 30 seconds
  useEffect(() => {
    const opsTimer = setInterval(() => {
      fetchOpsData();
    }, 30000); // 30 seconds
    return () => clearInterval(opsTimer);
  }, [fetchOpsData, hasOpsAuth]);

  // Auto-refresh HRMS data every 60 seconds
  useEffect(() => {
    const hrmsTimer = setInterval(() => {
      fetchHRMSData();
    }, 60000); // 60 seconds
    return () => clearInterval(hrmsTimer);
  }, [fetchHRMSData]);

  // Auto-refresh Invoice data every 60 seconds
  useEffect(() => {
    const invoiceTimer = setInterval(() => {
      fetchInvoiceData();
    }, 60000); // 60 seconds
    return () => clearInterval(invoiceTimer);
  }, [fetchInvoiceData]);

  // Auto-refresh CRM data every 60 seconds
  useEffect(() => {
    const crmTimer = setInterval(() => {
      fetchCRMData();
    }, 60000); // 60 seconds
    return () => clearInterval(crmTimer);
  }, [fetchCRMData]);

  useEffect(() => {
    setData(prev => ({
      ...prev,
      alerts: generateAlerts(prev.hrms, prev.invoice, prev.ops),
      pendingWork: generatePendingWork(prev.hrms, prev.invoice, prev.crm, prev.ops),
      lastUpdated: new Date().toISOString(),
    }));
  }, [data.hrms, data.invoice, data.crm, data.ops, generateAlerts, generatePendingWork]);

  const handleRefresh = () => {
    fetchAllData();
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

  const formatIndianCurrency = (amount) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)} K`;
    }
    return `₹${amount}`;
  };

  const formatCompactCurrency = (amount) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return formatIndianCurrency(amount);
  };

  const calculateCollectionPercentage = (received, total) => {
    if (total === 0) return 0;
    return ((received / total) * 100).toFixed(1);
  };

  const calculateApprovalPercentage = (approved, total) => {
    if (total === 0) return 0;
    return ((approved / total) * 100).toFixed(1);
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
    
    // Holidays (estimated as 2 per month)
    const holidays = 2;
    
    return {
      totalDays,
      workingDays,
      sundays,
      holidays
    };
  };

  const formatFullDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDay = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
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

  const totalAuditCalls = (data.ops.auditCalls.approved || 0) + (data.ops.auditCalls.rejected || 0);
  const approvalRate = totalAuditCalls > 0
    ? calculateApprovalPercentage(data.ops.auditCalls.approved || 0, totalAuditCalls)
    : 0;
  const safeApprovalRate = Number.isFinite(parseFloat(approvalRate)) ? parseFloat(approvalRate) : 0;

  const monthStats = getMonthStats(currentTime);

  if (loading) {
    return (
      <div className="admin-overview admin-overview--loading">
        <div className="loading-skeleton">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="admin-overview">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header__top">
          <div className="dashboard-header__titles">
            <h1 className="dashboard-header__title">{getGreeting()}, {userName}! 👋</h1>
            <p className="dashboard-header__date">{formatFullDate(currentTime)} • {currentTime.toLocaleTimeString()}</p>
            <div className="dashboard-header__stats">
              <span className="dashboard-header__stat"><span className="dashboard-header__stat-icon">📅</span> Total Days: {monthStats.totalDays}</span>
              <span className="dashboard-header__stat"><span className="dashboard-header__stat-icon">💼</span> Working Days: {monthStats.workingDays}</span>
              <span className="dashboard-header__stat"><span className="dashboard-header__stat-icon">☀️</span> Sundays: {monthStats.sundays}</span>
              <span className="dashboard-header__stat"><span className="dashboard-header__stat-icon">🎁</span> Holidays: {monthStats.holidays}</span>
            </div>
          </div>
        </div>
        <div className="dashboard-header__bottom">
          <div className="dashboard-header__actions">
            <button
              className="dashboard-header__button"
              onClick={handleRefresh}
              title="Refresh Data"
            >
              🔄
            </button>
          </div>
        </div>
      </div>



      {/* Needs Attention Section */}
      {data.alerts && data.alerts.length > 0 && (
        <div className="attention-section">
          {data.alerts.map((alert, index) => (
            <div
              key={index}
              className="attention-card"
              onClick={() => handleAlertClick(alert)}
            >
              <div className="attention-card__icon">{alert.icon}</div>
              <div className="attention-card__content">
                <div className="attention-card__label">{alert.title}</div>
                <div className="attention-card__value">{alert.value}</div>
              </div>
              <div className="attention-card__action">
                <span className="attention-card__action-text">View</span>
                <span className="attention-card__arrow">→</span>
              </div>
            </div>
          ))}
        </div>
      )}

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
                  <td>{data.invoice.approvals.approved}</td>
                </tr>
                <tr>
                  <td>Invoice</td>
                  <td>Pending Invoices</td>
                  <td>{data.invoice.approvals.pending}</td>
                </tr>
                <tr>
                  <td>Invoice</td>
                  <td>Rejected Invoices</td>
                  <td>{data.invoice.approvals.rejected}</td>
                </tr>
                <tr>
                  <td>CRM</td>
                  <td>Total Leads</td>
                  <td>{data.crm.totalLeads}</td>
                </tr>
                <tr>
                  <td>CRM</td>
                  <td>Leads Created Today</td>
                  <td>{data.crm.leadsCreatedToday}</td>
                </tr>
                <tr>
                  <td>OPS</td>
                  <td>Cases Pending Audit</td>
                  <td>{data.ops.casesPendingAudit}</td>
                </tr>
                <tr>
                  <td>OPS</td>
                  <td>Cases Pending Audit</td>
                  <td>{data.ops.casesPendingAudit}</td>
                </tr>
                <tr>
                  <td>OPS</td>
                  <td>Audit Calls Approved</td>
                  <td>{data.ops.auditCalls.approved}</td>
                </tr>
                <tr>
                  <td>OPS</td>
                  <td>Audit Calls Rejected</td>
                  <td>{data.ops.auditCalls.rejected}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          {/* Section Cards */}
          <div className="section-cards">
            {/* HRMS Section */}
            <div className="section-card section-card--hrms">
              <div className="section-card__header">
                <span className="section-card__icon">👥</span>
                <span className="section-card__title">HRMS</span>
              </div>
              <div className="section-card__metrics">
                <div className="small-card">
                  <div className="small-card__label">Present Today</div>
                  <div className="small-card__value">{data.hrms.presentToday}</div>
                </div>
                <div className="small-card">
                  <div className="small-card__label">Absent Today</div>
                  <div className="small-card__value">{data.hrms.absentToday}</div>
                </div>
                <div className="small-card">
                  <div className="small-card__label">Total Employees</div>
                  <div className="small-card__value">{data.hrms.totalEmployees}</div>
                </div>
                <div className="small-card">
                  <div className="small-card__label">Late</div>
                  <div className="small-card__value">{data.hrms.lateToday}</div>
                </div>
              </div>
            </div>

            {/* Invoice Section */}
            <div className="section-card section-card--invoice">
              <div className="section-card__header">
                <span className="section-card__icon">💰</span>
                <span className="section-card__title">Invoice</span>
              </div>
              <div className="section-card__metrics">
                <div className="small-card">
                  <div className="small-card__label">Total Sales</div>
                  <div className="small-card__value">{formatCompactCurrency(data.invoice.totalSales)}</div>
                </div>
                <div className="small-card">
                  <div className="small-card__label">Payments</div>
                  <div className="small-card__value">{formatCompactCurrency(data.invoice.paymentsReceived)}</div>
                </div>
                <div className="small-card">
                  <div className="small-card__label">Pending</div>
                  <div className="small-card__value">{formatCompactCurrency(data.invoice.pendingAmount)}</div>
                </div>
                <div className="small-card">
                  <div className="small-card__label">Customers</div>
                  <div className="small-card__value">{data.invoice.customers}</div>
                </div>
              </div>
            </div>

            {/* CRM Section */}
            <div className="section-card section-card--crm">
              <div className="section-card__header">
                <span className="section-card__icon">🎯</span>
                <span className="section-card__title">CRM</span>
              </div>
              <div className="section-card__metrics">
                <div className="small-card">
                  <div className="small-card__label">Total Leads</div>
                  <div className="small-card__value">{data.crm.totalLeads}</div>
                </div>
                <div className="small-card">
                  <div className="small-card__label">Today's Leads</div>
                  <div className="small-card__value">{data.crm.leadsCreatedToday}</div>
                </div>
                <div className="small-card">
                  <div className="small-card__label">New Status</div>
                  <div className="small-card__value">{data.crm.leadsByStatus?.new || 0}</div>
                </div>
              </div>
            </div>

            {/* OPS Section */}
            <div className="section-card section-card--ops">
              <div className="section-card__header">
                <span className="section-card__icon">📋</span>
                <span className="section-card__title">OPS</span>
              </div>
              <div className="section-card__metrics">
                <div className="small-card">
                  <div className="small-card__label">Total Leads</div>
                  <div className="small-card__value">{data.ops.totalLeads}</div>
                </div>
                <div className="small-card">
                  <div className="small-card__label">Today's Leads</div>
                  <div className="small-card__value">{data.ops.leadsCreatedToday}</div>
                </div>
                <div className="small-card">
                  <div className="small-card__label">Cases Pending</div>
                  <div className="small-card__value">{data.ops.casesPendingAudit}</div>
                </div>
                <div className="small-card">
                  <div className="small-card__label">Audit Calls</div>
                  <div className="small-card__value">{(data.ops.auditCalls.approved || 0) + (data.ops.auditCalls.rejected || 0)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
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
              <AttendanceTrendChart
                labels={attendanceChartData.labels}
                present={attendanceChartData.present}
                late={attendanceChartData.late}
                absent={attendanceChartData.absent}
              />
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
                <BarChart data={Array.isArray(data.invoice.monthlyData) ? data.invoice.monthlyData : []}>
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
              <div className="case-pipeline">
                {[
                  { label: 'Counselor', value: data.ops.casePipeline.counselor, color: '#2a78d6' },
                  { label: 'Quality audit', value: data.ops.casePipeline.qualityAudit, color: '#eb6834' },
                  { label: 'OPS', value: data.ops.casePipeline.ops, color: '#1baf7a' },
                  { label: 'Case officer', value: data.ops.casePipeline.caseOfficer, color: '#9333ea' },
                  { label: 'Visa outcome', value: data.ops.casePipeline.visaOutcome, color: '#f59e0b' },
                ].map((stage, index) => (
                  <div key={index} className="pipeline-item">
                    <div className="pipeline-item__label">{stage.label}</div>
                    <div className="pipeline-item__bar">
                      <div
                        className="pipeline-item__bar-fill"
                        style={{
                          width: `${(stage.value / Math.max(100, data.ops.casePipeline.counselor)) * 100}%`,
                          backgroundColor: stage.color,
                        }}
                      ></div>
                      <span className="pipeline-item__value">{stage.value}</span>
                    </div>
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
                    <span className="audit-calls__period">Overall</span>
                    <span className="audit-calls__rate">{safeApprovalRate}% approved</span>
                  </div>
                  <div className="audit-calls__bars">
                    <div className="audit-bar audit-bar--approved">
                      <div className="audit-bar__bar" style={{ width: `${safeApprovalRate}%` }}></div>
                      <span className="audit-bar__value">{data.ops.auditCalls.approved || 0}</span>
                    </div>
                    <div className="audit-bar audit-bar--rejected">
                      <div className="audit-bar__bar" style={{ width: `${100 - safeApprovalRate}%` }}></div>
                      <span className="audit-bar__value">{data.ops.auditCalls.rejected || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 3: Payments Status */}
            <div className="ops-panel">
              <h3 className="ops-panel__title">Payments Status</h3>
              <div className="payments-summary">
                <div className="payments-summary__item">
                  <div className="payments-summary__label">Total</div>
                  <div className="payments-summary__value">{formatIndianCurrency(data.invoice.totalSales)}</div>
                </div>
                <div className="payments-summary__item payments-summary__item--received">
                  <div className="payments-summary__label">Received</div>
                  <div className="payments-summary__value">{formatIndianCurrency(data.invoice.paymentsReceived)}</div>
                </div>
                <div className="payments-summary__item payments-summary__item--pending">
                  <div className="payments-summary__label">Pending</div>
                  <div className="payments-summary__value">{formatIndianCurrency(data.invoice.pendingAmount)}</div>
                </div>
              </div>
              <div className="payments-donut">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Received', value: data.invoice.paymentsReceived || 0 },
                        { name: 'Pending', value: data.invoice.pendingAmount || 0 },
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
                    <div className="pending-work-item__icon">{item.icon}</div>
                    <div className="pending-work-item__label">{item.title}</div>
                    <div className="pending-work-item__count">{item.count || 0}</div>
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
                    <div className="approval-card__value">{data.invoice.approvals.approved}</div>
                  </div>
                </div>
                <div className="approval-card approval-card--pending">
                  <div className="approval-card__dot"></div>
                  <div className="approval-card__content">
                    <div className="approval-card__label">Pending</div>
                    <div className="approval-card__value">{data.invoice.approvals.pending}</div>
                  </div>
                </div>
                <div className="approval-card approval-card--rejected">
                  <div className="approval-card__dot"></div>
                  <div className="approval-card__content">
                    <div className="approval-card__label">Rejected</div>
                    <div className="approval-card__value">{data.invoice.approvals.rejected}</div>
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
          <span>Updated: {new Date(data.lastUpdated).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
