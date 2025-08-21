import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import apiClient from '../utils/api';

export default function CycleManagement() {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState(null);
  const [form, setForm] = useState({ name: '', formUrl: '', startDate: '', endDate: '', isActive: false });

  const fetchCycles = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/admin/cycles');
      setCycles(data);
    } catch (e) {
      setError(e.message || 'Failed to load cycles');
    } finally {
      setLoading(false);
    }
  };

  const createCycle = async () => {
    try {
      setError('');
      await apiClient.post('/admin/cycles', form);
      setCreateOpen(false);
      setForm({ name: '', formUrl: '', startDate: '', endDate: '', isActive: false });
      await fetchCycles();
    } catch (e) {
      setError(e.message || 'Failed to create cycle');
    }
  };

  const editCycle = async () => {
    try {
      setError('');
      await apiClient.patch(`/admin/cycles/${editingCycle.id}`, form);
      setEditOpen(false);
      setEditingCycle(null);
      setForm({ name: '', formUrl: '', startDate: '', endDate: '', isActive: false });
      await fetchCycles();
    } catch (e) {
      setError(e.message || 'Failed to update cycle');
    }
  };

  const openEditDialog = (cycle) => {
    setEditingCycle(cycle);
    setForm({
      name: cycle.name,
      formUrl: cycle.formUrl || '',
      startDate: cycle.startDate ? new Date(cycle.startDate).toISOString().split('T')[0] : '',
      endDate: cycle.endDate ? new Date(cycle.endDate).toISOString().split('T')[0] : '',
      isActive: cycle.isActive
    });
    setEditOpen(true);
  };

  const closeEditDialog = () => {
    setEditOpen(false);
    setEditingCycle(null);
    setForm({ name: '', formUrl: '', startDate: '', endDate: '', isActive: false });
  };

  const activateCycle = async (id) => {
    await apiClient.post(`/admin/cycles/${id}/activate`, {});
    await fetchCycles();
  };

  const deleteCycle = async (id) => {
    await apiClient.delete(`/admin/cycles/${id}`);
    await fetchCycles();
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h4">Cycle Management</Typography>
        <Button variant="contained" onClick={() => setCreateOpen(true)}>New Cycle</Button>
      </Stack>

      {error && (
        <Paper sx={{ p: 2, mb: 2, color: 'error.main' }}>{error}</Paper>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Form URL</TableCell>
              <TableCell>Start</TableCell>
              <TableCell>End</TableCell>
              <TableCell>Active</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cycles.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.formUrl || '-'}</TableCell>
                <TableCell>{c.startDate ? new Date(c.startDate).toLocaleDateString() : '-'}</TableCell>
                <TableCell>{c.endDate ? new Date(c.endDate).toLocaleDateString() : '-'}</TableCell>
                <TableCell>{c.isActive ? 'Yes' : 'No'}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title="Edit cycle">
                      <IconButton size="small" onClick={() => openEditDialog(c)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    {!c.isActive && (
                      <Button size="small" variant="outlined" onClick={() => activateCycle(c.id)}>Activate</Button>
                    )}
                    <Button size="small" color="error" variant="outlined" onClick={() => deleteCycle(c.id)}>Delete</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Recruiting Cycle</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
            <TextField label="Form URL" value={form.formUrl} onChange={(e) => setForm({ ...form, formUrl: e.target.value })} fullWidth />
            <TextField label="Start Date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="End Date" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
            <Stack direction="row" alignItems="center" spacing={1}>
              <Checkbox checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              <Typography>Set as active</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={createCycle} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={closeEditDialog} fullWidth maxWidth="sm">
        <DialogTitle>Edit Recruiting Cycle</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
            <TextField label="Form URL" value={form.formUrl} onChange={(e) => setForm({ ...form, formUrl: e.target.value })} fullWidth />
            <TextField label="Start Date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="End Date" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
            <Stack direction="row" alignItems="center" spacing={1}>
              <Checkbox checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              <Typography>Set as active</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog}>Cancel</Button>
          <Button onClick={editCycle} variant="contained">Update</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}