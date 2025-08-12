import React, { useEffect, useState } from 'react';
import { Box, Paper, Stack, Typography, Button } from '@mui/material';
import apiClient from '../utils/api';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalApplicants: 0, tasks: 0, candidates: 0, currentRound: 'SUBMITTED' });
  const [activeCycle, setActiveCycle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [s, c] = await Promise.all([
        apiClient.get('/admin/stats'),
        apiClient.get('/admin/cycles/active'),
      ]);
      setStats(s);
      setActiveCycle(c);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4">Dashboard</Typography>
        <Button variant="outlined" onClick={load} disabled={loading}>Refresh</Button>
      </Stack>

      {error && <Paper sx={{ p: 2, mb: 2, color: 'error.main' }}>{error}</Paper>}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Active Cycle</Typography>
          {activeCycle ? (
            <>
              <Typography variant="h6">{activeCycle.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {activeCycle.startDate ? new Date(activeCycle.startDate).toLocaleDateString() : '—'}
                {' '}to{' '}
                {activeCycle.endDate ? new Date(activeCycle.endDate).toLocaleDateString() : '—'}
              </Typography>
            </>
          ) : (
            <Typography variant="body1">No active cycle</Typography>
          )}
        </Paper>

        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Total Candidates (cycle)</Typography>
          <Typography variant="h4">{stats.totalApplicants}</Typography>
        </Paper>

        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">In Pipeline</Typography>
          <Typography variant="h4">{stats.candidates}</Typography>
        </Paper>

        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Current Stage</Typography>
          <Typography variant="h6">{stats.currentRound?.replace('_', ' ') || '—'}</Typography>
        </Paper>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Assigned Tasks</Typography>
        <Typography variant="body2" color="text.secondary">No assigned tasks yet.</Typography>
      </Paper>
    </Box>
  );
}