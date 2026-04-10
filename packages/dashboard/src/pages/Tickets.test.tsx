import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TicketsPage from './Tickets';

const getTicketsMock = vi.fn();
const getTicketMock = vi.fn();
const updateTicketMock = vi.fn();
const bulkResolveTicketsMock = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    getTickets: (...args: unknown[]) => getTicketsMock(...args),
    getTicket: (...args: unknown[]) => getTicketMock(...args),
    updateTicket: (...args: unknown[]) => updateTicketMock(...args),
    bulkResolveTickets: (...args: unknown[]) => bulkResolveTicketsMock(...args),
  },
}));

describe('TicketsPage bulk resolve modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getTicketsMock.mockResolvedValue({
      data: [
        {
          id: 'ticket-1',
          ticketNumber: 'TK-001',
          customer: 'Acme',
          status: 'OPEN',
          priority: 'HIGH',
          category: 'NETWORK',
          createdAt: '2026-04-10T10:00:00.000Z',
          slaTracking: null,
        },
      ],
      pagination: { total: 1 },
    });

    getTicketMock.mockResolvedValue({ data: {} });
    updateTicketMock.mockResolvedValue({ data: {} });

    bulkResolveTicketsMock.mockImplementation((payload?: { dryRun?: boolean }) => {
      if (payload?.dryRun) {
        return Promise.resolve({ data: { candidateCount: 3 } });
      }

      return Promise.resolve({
        data: {
          resolvedCount: 2,
          jobId: 'abcdefgh1234',
        },
      });
    });
  });

  it('opens step 1, proceeds to step 2, and executes after RESOLVE confirmation', async () => {
    const user = userEvent.setup();

    render(<TicketsPage />);

    await screen.findByText('TK-001');

    const searchInput = screen.getByPlaceholderText('Search tickets...');
    await user.type(searchInput, 'TK-001{Enter}');

    const bulkButton = screen.getByRole('button', { name: 'Resolve All Filtered Tickets' });
    await waitFor(() => expect(bulkButton).toBeEnabled());
    await user.click(bulkButton);

    await waitFor(() => {
      expect(bulkResolveTicketsMock).toHaveBeenCalledWith({
        filter: { search: 'TK-001' },
        dryRun: true,
      });
    });

    expect(await screen.findByRole('heading', { name: 'Resolve All Filtered Tickets' })).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Candidate tickets to resolve')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Step 2 of 2')).toBeInTheDocument();
    const executeButton = screen.getByRole('button', { name: 'Execute Bulk Resolve' });
    expect(executeButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText('Type RESOLVE'), 'RESOLVE');
    expect(executeButton).toBeEnabled();

    await user.click(executeButton);

    await waitFor(() => {
      expect(bulkResolveTicketsMock).toHaveBeenCalledWith({
        filter: { search: 'TK-001' },
      });
    });

    expect(await screen.findByText(/Bulk resolve berhasil: 2 tiket di-resolve\./i)).toBeInTheDocument();
    expect(screen.queryByText('Step 2 of 2')).not.toBeInTheDocument();
  });
});
