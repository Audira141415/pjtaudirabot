import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import OperationalOverview from './OperationalOverview';

const props = {
  ticketOverview: {
    openTickets: 18,
    priorityCounts: [
      { name: 'CRITICAL', value: 4 },
      { name: 'HIGH', value: 8 },
      { name: 'MEDIUM', value: 6 },
    ],
    categoryCounts: [
      { name: 'NETWORK', value: 9 },
      { name: 'POWER', value: 5 },
      { name: 'WAN', value: 4 },
    ],
  },
  slaDashboard: {
    totalTracked: 22,
    responseBreaches: 3,
    resolutionBreaches: 2,
    complianceRate: 91.2,
    activeTracking: [
      {
        id: 'sla-1',
        responseDeadline: '2026-04-12T02:00:00.000Z',
        resolutionDeadline: '2026-04-12T04:00:00.000Z',
        ticket: { ticketNumber: 'TK-001', priority: 'CRITICAL', customer: 'Acme' },
      },
    ],
  },
  alerts: [
    {
      id: 'alert-1',
      title: 'SLA breach on TK-001',
      message: 'Response deadline exceeded',
      severity: 'CRITICAL',
      status: 'ACTIVE',
      rule: { name: 'SLA Violation' },
    },
  ],
  incidents: [
    {
      id: 'incident-1',
      title: 'Core switch failure',
      description: 'Backbone switch is unreachable',
      severity: 'MAJOR',
      status: 'OPEN',
    },
  ],
  escalations: [
    {
      id: 'esc-1',
      createdAt: '2026-04-12T01:00:00.000Z',
      resolvedAt: null,
      fromLevel: 'L1',
      toLevel: 'L2',
      reason: 'SLA breach',
      ticket: { ticketNumber: 'TK-001', customer: 'Acme', priority: 'CRITICAL', status: 'OPEN' },
    },
  ],
  openClusters: [
    {
      id: 'cluster-1',
      clusterNumber: 'CL-001',
      status: 'OPEN',
      severity: 'HIGH',
      memberCount: 3,
      impactScore: 88.5,
      commonCustomer: 'Acme',
      commonService: 'Internet',
      detectedAt: '2026-04-12T01:30:00.000Z',
    },
  ],
  health: {
    overallStatus: 'healthy',
    components: [
      {
        name: 'TELEGRAM Bot',
        status: 'online',
        latency: 11,
        details: 'Running on port 4010',
        lastCheck: '2026-04-12T03:00:00.000Z',
        meta: {
          connectionStatus: 'CONNECTED',
          lastConnectedAt: '2026-04-12T02:55:00.000Z',
          ready: true,
        },
      },
      {
        name: 'WHATSAPP Bot',
        status: 'degraded',
        latency: 18,
        details: 'WA: connecting',
        lastCheck: '2026-04-12T03:00:00.000Z',
        meta: {
          connectionStatus: 'DEGRADED',
          lastConnectedAt: '2026-04-12T02:40:00.000Z',
          ready: false,
        },
      },
    ],
    metrics: {
      memoryUsedPct: 30,
      memoryUsedGB: 8,
      memoryTotalGB: 24,
      cpuCores: 4,
      loadAvg1m: 0.8,
      uptime: 3600,
      activeSessions: 2,
      recentErrors: 0,
      openAlerts: 1,
    },
    timestamp: '2026-04-12T03:00:00.000Z',
  },
};

describe('OperationalOverview', () => {
  it('shows SLA, incident, alert, cluster, and bot readiness summaries', () => {
    render(
      <MemoryRouter>
        <OperationalOverview
          ticketOverview={props.ticketOverview as never}
          slaDashboard={props.slaDashboard as never}
          alerts={props.alerts as never}
          incidents={props.incidents as never}
          escalations={props.escalations as never}
          openClusters={props.openClusters as never}
          health={props.health as never}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Operational Overview')).toBeInTheDocument();
    expect(screen.getByText('SLA risk + backlog')).toBeInTheDocument();
    expect(screen.getByText('Active incidents + alerts')).toBeInTheDocument();
    expect(screen.getByText('Bot connectivity detail')).toBeInTheDocument();

    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/left|overdue/i)).toBeInTheDocument();
    expect(screen.getByText('Core switch failure')).toBeInTheDocument();
    expect(screen.getByText('TELEGRAM Bot')).toBeInTheDocument();
    expect(screen.getAllByText('Last reconnect')).toHaveLength(2);
  });
});
