import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Avatar, 
  Chip, 
  LinearProgress,
  Stack,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid
} from '@mui/material';
import { 
  PlusIcon, 
  UserPlusIcon, 
  TrashIcon,
  UserIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import apiClient from '../utils/api';

export default function ReviewTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newTeamDialogOpen, setNewTeamDialogOpen] = useState(false);
  const [addCandidateDialogOpen, setAddCandidateDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [newTeamData, setNewTeamData] = useState({ 
    name: '', 
    description: '', 
    memberOne: '', 
    memberTwo: '', 
    memberThree: '' 
  });
  const [candidates, setCandidates] = useState([]);
  const [expandedTeams, setExpandedTeams] = useState(new Set());
  const [users, setUsers] = useState([]);
  const [availableCandidates, setAvailableCandidates] = useState([]);

  // Calculate team progress for different review types
  const calculateTeamProgress = (team) => {
    if (team.candidates.length === 0) return { resume: 0, coverLetter: 0, video: 0 };
    
    const totalCandidates = team.candidates.length;
    const resumeCompleted = team.candidates.filter(c => c.resumeProgress === 100).length;
    const coverLetterCompleted = team.candidates.filter(c => c.coverLetterProgress === 100).length;
    const videoCompleted = team.candidates.filter(c => c.videoProgress === 100).length;
    
    return {
      resume: Math.round((resumeCompleted / totalCandidates) * 100),
      coverLetter: Math.round((coverLetterCompleted / totalCandidates) * 100),
      video: Math.round((videoCompleted / totalCandidates) * 100)
    };
  };

    // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load teams, available candidates, and users in parallel
        const [teamsResponse, candidatesResponse, usersResponse] = await Promise.all([
          apiClient.get('/review-teams'),
          apiClient.get('/review-teams/available-candidates'),
          apiClient.get('/review-teams/users')
        ]);

        setTeams(teamsResponse);
        setCandidates(candidatesResponse);
        setAvailableCandidates(candidatesResponse);
        setUsers(usersResponse);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load teams data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCreateTeam = async () => {
    if (newTeamData.name.trim()) {
      try {
        // Get the active cycle ID
        const activeCycle = await apiClient.get('/admin/cycles/active');
        
        const newTeam = await apiClient.post('/review-teams', {
          memberOne: newTeamData.memberOne || null,
          memberTwo: newTeamData.memberTwo || null,
          memberThree: newTeamData.memberThree || null,
          cycleId: activeCycle.id
        });
        
        setTeams([newTeam, ...teams]);
        setNewTeamData({ 
          name: '', 
          description: '', 
          memberOne: '', 
          memberTwo: '', 
          memberThree: '' 
        });
        setNewTeamDialogOpen(false);
      } catch (err) {
        console.error('Error creating team:', err);
        setError('Failed to create team');
      }
    }
  };

  const handleAddCandidate = (teamId) => {
    setSelectedTeam(teamId);
    setAddCandidateDialogOpen(true);
  };

    const handleAddCandidateToTeam = async (candidateId) => {
    try {
      const newCandidate = await apiClient.post(`/review-teams/${selectedTeam}/assign-candidate`, {
        candidateId
      });
      
      // Update teams state
      const updatedTeams = teams.map(team => {
        if (team.id === selectedTeam) {
          return {
            ...team,
            candidates: [...team.candidates, newCandidate]
          };
        }
        return team;
      });
      
      // Remove candidate from available candidates
      const updatedAvailableCandidates = availableCandidates.filter(c => c.id !== candidateId);
      
      setTeams(updatedTeams);
      setAvailableCandidates(updatedAvailableCandidates);
      setAddCandidateDialogOpen(false);
      setSelectedTeam(null);
    } catch (err) {
      console.error('Error assigning candidate:', err);
      setError('Failed to assign candidate to team');
    }
  };

  const handleRemoveCandidateFromTeam = async (teamId, candidateId) => {
    try {
      await apiClient.delete(`/review-teams/${teamId}/remove-candidate/${candidateId}`);
      
      // Update teams state
      const updatedTeams = teams.map(team => {
        if (team.id === teamId) {
          return {
            ...team,
            candidates: team.candidates.filter(c => c.id !== candidateId)
          };
        }
        return team;
      });
      
      // Add candidate back to available candidates
      const candidateToRemove = teams
        .find(team => team.id === teamId)
        ?.candidates.find(c => c.id === candidateId);
      
      if (candidateToRemove) {
        setAvailableCandidates([...availableCandidates, candidateToRemove]);
      }
      
      setTeams(updatedTeams);
    } catch (err) {
      console.error('Error removing candidate:', err);
      setError('Failed to remove candidate from team');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUBMITTED':
        return 'primary';
      case 'REVIEWING':
        return 'warning';
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'error';
      default:
        return 'default';
    }
  };

  const toggleTeamExpansion = (teamId) => {
    const newExpandedTeams = new Set(expandedTeams);
    if (newExpandedTeams.has(teamId)) {
      newExpandedTeams.delete(teamId);
    } else {
      newExpandedTeams.add(teamId);
    }
    setExpandedTeams(newExpandedTeams);
  };

  const isTeamExpanded = (teamId) => expandedTeams.has(teamId);

  const refreshData = async () => {
    try {
      setLoading(true);
      const [teamsResponse, candidatesResponse, usersResponse] = await Promise.all([
        apiClient.get('/review-teams'),
        apiClient.get('/review-teams/available-candidates'),
        apiClient.get('/review-teams/users')
      ]);
      setTeams(teamsResponse);
      setCandidates(candidatesResponse);
      setAvailableCandidates(candidatesResponse);
      setUsers(usersResponse);
      setError('');
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Review Teams</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
          Review Teams
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<ArrowPathIcon style={{ width: '1.25rem', height: '1.25rem' }} />}
            onClick={refreshData}
            disabled={loading}
            sx={{
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                borderColor: 'primary.dark',
                backgroundColor: 'rgba(4, 39, 66, 0.04)'
              }
            }}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<PlusIcon style={{ width: '1.25rem', height: '1.25rem' }} />}
            onClick={() => setNewTeamDialogOpen(true)}
            sx={{
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                borderColor: 'primary.dark',
                backgroundColor: 'rgba(4, 39, 66, 0.04)'
              }
            }}
          >
            New Team
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Paper sx={{ p: 2, mb: 3, backgroundColor: 'error.light', color: 'error.contrastText' }}>
          {error}
        </Paper>
      )}

      {/* Total Teams Stats */}
      <Paper sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Total Teams
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 700, color: 'primary.main' }}>
          {teams.length}
        </Typography>
      </Paper>

      {/* Teams List */}
      {teams.map((team) => (
        <Paper key={team.id} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider' }}>
          {/* Team Header with Expand/Collapse */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton
                onClick={() => toggleTeamExpansion(team.id)}
                size="small"
                sx={{
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'rgba(4, 39, 66, 0.04)'
                  }
                }}
              >
                {isTeamExpanded(team.id) ? (
                  <ChevronDownIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                ) : (
                  <ChevronRightIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                )}
              </IconButton>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {team.name}: {team.code}
              </Typography>
            </Stack>
            <Chip
              label={`${team.candidates.length} candidates`}
              size="small"
              variant="outlined"
              sx={{
                borderColor: 'primary.main',
                color: 'primary.main',
                fontWeight: 500
              }}
            />
          </Stack>

          {/* Collapsible Content */}
          {isTeamExpanded(team.id) && (
            <>
              {/* Team Progress Overview */}
              <Box mb={3}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  Review Progress:
                </Typography>
                <Stack spacing={2}>
                  {(() => {
                    const progress = calculateTeamProgress(team);
                    return (
                      <>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              Resume Review
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {progress.resume}% Complete
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={progress.resume}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                backgroundColor: 'primary.main'
                              }
                            }}
                          />
                        </Box>
                        
                        <Box>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              Cover Letter Review
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {progress.coverLetter}% Complete
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={progress.coverLetter}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                backgroundColor: 'secondary.main'
                              }
                            }}
                          />
                        </Box>
                        
                        <Box>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              Video Review
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {progress.video}% Complete
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={progress.video}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: 'grey.200',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                backgroundColor: 'success.main'
                              }
                            }}
                          />
                        </Box>
                      </>
                    );
                  })()}
                </Stack>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Team Members */}
              <Box mb={3}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                  Team members:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {team.members.map((member) => (
                    <Avatar
                      key={member.id}
                      sx={{ 
                        width: 40, 
                        height: 40, 
                        bgcolor: 'primary.main',
                        fontSize: '0.875rem'
                      }}
                    >
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} />
                      ) : (
                        member.name.split(' ').map(n => n[0]).join('')
                      )}
                    </Avatar>
                  ))}
                  <IconButton
                    size="small"
                    sx={{
                      width: 40,
                      height: 40,
                      border: '1px dashed',
                      borderColor: 'divider',
                      color: 'text.secondary'
                    }}
                  >
                    <UserPlusIcon style={{ width: '1.25rem', height: '1.25rem' }} />
                  </IconButton>
                </Stack>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Assigned Candidates */}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Assigned candidates to Review:
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PlusIcon style={{ width: '1rem', height: '1rem' }} />}
                    onClick={() => handleAddCandidate(team.id)}
                    sx={{
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      fontSize: '0.75rem',
                      '&:hover': {
                        borderColor: 'primary.dark',
                        backgroundColor: 'rgba(4, 39, 66, 0.04)'
                      }
                    }}
                  >
                    Add Candidate
                  </Button>
                </Stack>

                {team.candidates.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No candidates assigned yet.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {team.candidates.map((candidate) => (
                      <Paper
                        key={candidate.id}
                        sx={{
                          p: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          backgroundColor: 'background.paper'
                        }}
                      >
                        <Grid container spacing={2} alignItems="center">
                          <Grid item>
                            <Avatar
                              sx={{
                                width: 48,
                                height: 48,
                                bgcolor: 'primary.main',
                                fontSize: '1rem'
                              }}
                            >
                              {candidate.avatar ? (
                                <img src={candidate.avatar} alt={candidate.name} />
                              ) : (
                                candidate.name.split(' ').map(n => n[0]).join('')
                              )}
                            </Avatar>
                          </Grid>
                          
                          <Grid item xs>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {candidate.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {candidate.major} - {candidate.graduationYear} - GPA: {candidate.gpa}
                            </Typography>
                          </Grid>
                          
                          <Grid item>
                            <Chip
                              label={candidate.status}
                              color={getStatusColor(candidate.status)}
                              size="small"
                              sx={{ fontWeight: 500 }}
                            />
                          </Grid>
                          
                          <Grid item>
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveCandidateFromTeam(team.id, candidate.id)}
                              sx={{
                                color: 'error.main',
                                '&:hover': {
                                  backgroundColor: 'error.light',
                                  color: 'error.contrastText'
                                }
                              }}
                            >
                              <TrashIcon style={{ width: '1rem', height: '1rem' }} />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            </>
          )}
        </Paper>
      ))}

      {/* New Team Dialog */}
      <Dialog open={newTeamDialogOpen} onClose={() => setNewTeamDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Create New Team</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              label="Team Name"
              fullWidth
              variant="outlined"
              value={newTeamData.name}
              onChange={(e) => setNewTeamData({ ...newTeamData, name: e.target.value })}
              helperText="Enter a descriptive name for the team"
            />
            
            <TextField
              label="Description (Optional)"
              fullWidth
              variant="outlined"
              multiline
              rows={2}
              value={newTeamData.description}
              onChange={(e) => setNewTeamData({ ...newTeamData, description: e.target.value })}
              helperText="Brief description of the team's purpose"
            />

            <Typography variant="h6" sx={{ fontWeight: 600, mt: 2 }}>
              Team Members
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Member 1</InputLabel>
                  <Select
                    value={newTeamData.memberOne}
                    onChange={(e) => setNewTeamData({ ...newTeamData, memberOne: e.target.value })}
                    label="Member 1"
                  >
                    <MenuItem value="">
                      <em>Select a member</em>
                    </MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.fullName} ({user.role})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Member 2</InputLabel>
                  <Select
                    value={newTeamData.memberTwo}
                    onChange={(e) => setNewTeamData({ ...newTeamData, memberTwo: e.target.value })}
                    label="Member 2"
                  >
                    <MenuItem value="">
                      <em>Select a member</em>
                    </MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.fullName} ({user.role})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Member 3</InputLabel>
                  <Select
                    value={newTeamData.memberThree}
                    onChange={(e) => setNewTeamData({ ...newTeamData, memberThree: e.target.value })}
                    label="Member 3"
                  >
                    <MenuItem value="">
                      <em>Select a member</em>
                    </MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.fullName} ({user.role})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Typography variant="h6" sx={{ fontWeight: 600, mt: 2 }}>
              Initial Candidates (Optional)
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              You can assign candidates to this team after creation, or select some now:
            </Typography>
            
            <FormControl fullWidth>
              <InputLabel>Select Candidates</InputLabel>
              <Select
                multiple
                value={[]}
                onChange={() => {}} // Will implement candidate selection later
                label="Select Candidates"
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => {
                      const candidate = availableCandidates.find(c => c.id === value);
                      return (
                        <Chip 
                          key={value} 
                          label={candidate?.name || value} 
                          size="small"
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {availableCandidates.map((candidate) => (
                  <MenuItem key={candidate.id} value={candidate.id}>
                    {candidate.name} - {candidate.major} ({candidate.year})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewTeamDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateTeam} 
            variant="contained"
            disabled={!newTeamData.name.trim()}
          >
            Create Team
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Candidate Dialog */}
      <Dialog open={addCandidateDialogOpen} onClose={() => setAddCandidateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Add Candidate to Team</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select a candidate to add to the team:
          </Typography>
          {availableCandidates.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 3 }}>
              No available candidates to assign. All candidates are already assigned to teams.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {availableCandidates.map((candidate) => (
                <Paper
                  key={candidate.id}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'rgba(4, 39, 66, 0.04)'
                    }
                  }}
                  onClick={() => handleAddCandidateToTeam(candidate.id)}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {candidate.name.split(' ').map(n => n[0]).join('')}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {candidate.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {candidate.major} - {candidate.year} - GPA: {candidate.gpa}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddCandidateDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
