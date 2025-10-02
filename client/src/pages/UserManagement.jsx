import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Avatar, 
  Chip, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Alert, 
  IconButton,
  CircularProgress,
  Stack,
  Divider
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  PhotoCamera as PhotoCameraIcon,
  Close as CloseIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import apiClient from '../utils/api';
import AccessControl from '../components/AccessControl';

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [copySuccess, setCopySuccess] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Form states
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    fullName: '',
    graduationClass: '',
    role: 'USER'
  });

  const [editForm, setEditForm] = useState({
    fullName: '',
    graduationClass: '',
    email: ''
  });

  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchUsers();
    } else if (user && user.role !== 'ADMIN') {
      setLoading(false); // Stop loading if user is not admin
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/users');
      setUsers(response);
    } catch (err) {
      setError('Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/users', createForm);
      setShowCreateModal(false);
      setCreateForm({
        email: '',
        password: '',
        fullName: '',
        graduationClass: '',
        role: 'USER'
      });
      fetchUsers();
    } catch (err) {
      setError('Failed to create user');
      console.error('Error creating user:', err);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await apiClient.patch(`/users/${selectedUser.id}`, editForm);
      setShowEditModal(false);
      setSelectedUser(null);
      setSuccess('User information updated successfully!');
      fetchUsers();
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update user');
      console.error('Error updating user:', err);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await apiClient.patch(`/users/${userId}/role`, { role: newRole });
      setSuccess('User role updated successfully!');
      fetchUsers();
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update user role');
      console.error('Error updating role:', err);
    }
  };

  const handleUploadImage = async (e) => {
    e.preventDefault();
    if (!imageFile) return;

    const formData = new FormData();
    formData.append('profileImage', imageFile);

    try {
      const response = await apiClient.post(`/users/${selectedUser.id}/profile-image`, formData);
      setShowImageModal(false);
      setSelectedUser(null);
      setImageFile(null);
      setSuccess('Profile image uploaded successfully!');
      fetchUsers();
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to upload image');
      console.error('Error uploading image:', err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await apiClient.delete(`/users/${userId}`);
      fetchUsers();
    } catch (err) {
      setError('Failed to delete user');
      console.error('Error deleting user:', err);
    }
  };

  const handleCopyMemberSignupLink = async () => {
    const memberSignupLink = `${window.location.origin}/member-signup?token=member-access-2024`;
    
    try {
      await navigator.clipboard.writeText(memberSignupLink);
      setCopySuccess('Member signup link copied to clipboard!');
      // Clear success message after 3 seconds
      setTimeout(() => setCopySuccess(null), 3000);
    } catch (err) {
      setError('Failed to copy link to clipboard');
      console.error('Error copying to clipboard:', err);
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      fullName: user.fullName,
      graduationClass: user.graduationClass || '',
      email: user.email
    });
    setShowEditModal(true);
  };

  const openImageModal = (user) => {
    setSelectedUser(user);
    setShowImageModal(true);
  };

  const filteredUsers = users.filter(userItem => {
    const matchesSearch = userItem.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userItem.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || userItem.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'error';
      case 'MEMBER':
        return 'success';
      case 'USER':
        return 'primary';
      default:
        return 'default';
    }
  };


  return (
    <AccessControl allowedRoles={['ADMIN']}>
      <Box sx={{ 
        p: 2, 
        width: '100%', 
      maxWidth: 'none',
      minWidth: 0
    }}>
                  {/* Header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Box>
              <Typography variant="h4" gutterBottom>
                User Management
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Manage user accounts, roles, and permissions
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyMemberSignupLink}
              >
                Copy Member Signup Link
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setShowCreateModal(true)}
              >
                Add New User
              </Button>
            </Stack>
          </Stack>

        {/* Error Message */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              <IconButton
                color="inherit"
                size="small"
                onClick={() => setError(null)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            {error}
          </Alert>
        )}

        {/* Success Message */}
        {success && (
          <Alert 
            severity="success" 
            sx={{ mb: 3 }}
            action={
              <IconButton
                color="inherit"
                size="small"
                onClick={() => setSuccess(null)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            {success}
          </Alert>
        )}

        {/* Copy Success Message */}
        {copySuccess && (
          <Alert 
            severity="success" 
            sx={{ mb: 3 }}
            action={
              <IconButton
                color="inherit"
                size="small"
                onClick={() => setCopySuccess(null)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            {copySuccess}
          </Alert>
        )}

                            {/* Search and Filters */}
          <Paper sx={{ p: 1, mb: 2, width: '100%', boxSizing: 'border-box' }}>
            <Grid container spacing={1} sx={{ width: '100%' }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Search Users"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter by Role</InputLabel>
                  <Select
                    value={roleFilter}
                    label="Filter by Role"
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <MenuItem value="ALL">All Roles</MenuItem>
                    <MenuItem value="USER">User</MenuItem>
                    <MenuItem value="MEMBER">Member</MenuItem>
                    <MenuItem value="ADMIN">Admin</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

        {/* Users Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
                            ) : (
            <Grid container spacing={1} sx={{ width: '100%' }}>
              {filteredUsers.map(userItem => (
                <Grid item xs={12} sm={6} lg={4} key={userItem.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1, p: 1.5 }}>
                                          {/* User Header */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                        <Avatar
                          key={`${userItem.id}-${userItem.profileImage || 'no-image'}`}
                          src={userItem.profileImage ? `${userItem.profileImage}?t=${Date.now()}` : undefined}
                          sx={{ 
                            width: 48, 
                            height: 48, 
                            mr: 1.5,
                            bgcolor: 'primary.main',
                            fontSize: '1.25rem'
                          }}
                          onError={(e) => {
                            // Hide the image and show the fallback initials
                            e.target.style.display = 'none';
                          }}
                        >
                          {userItem.fullName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography variant="h6" noWrap sx={{ fontSize: '1rem' }}>
                            {userItem.fullName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.75rem' }}>
                            {userItem.email}
                          </Typography>
                        </Box>
                      </Box>

                    {/* User Details */}
                    <Stack spacing={1} sx={{ mb: 2 }}>
                      {userItem.graduationClass && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" color="text.secondary">Class:</Typography>
                          <Typography variant="body2">{userItem.graduationClass}</Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Joined:</Typography>
                        <Typography variant="body2">
                          {new Date(userItem.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Role:</Typography>
                        <Chip 
                          label={userItem.role} 
                          color={getRoleColor(userItem.role)}
                          size="small"
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Activity:</Typography>
                        <Typography variant="body2">
                          {userItem._count?.comments || 0} comments, {userItem._count?.evaluations || 0} evaluations
                        </Typography>
                      </Box>
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    {/* Role Selector */}
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                      <InputLabel>Change Role</InputLabel>
                      <Select
                        value={userItem.role}
                        label="Change Role"
                        onChange={(e) => handleUpdateRole(userItem.id, e.target.value)}
                        disabled={userItem.id === user?.id}
                      >
                        <MenuItem value="USER">User</MenuItem>
                        <MenuItem value="MEMBER">Member</MenuItem>
                        <MenuItem value="ADMIN">Admin</MenuItem>
                      </Select>
                    </FormControl>
                  </CardContent>

                  {/* Actions */}
                  <CardActions sx={{ justifyContent: 'space-between', p: 1, flexWrap: 'wrap', gap: 1 }}>
                    <Button
                      size="small"
                      startIcon={<PhotoCameraIcon />}
                      onClick={() => openImageModal(userItem)}
                      sx={{ minWidth: 'auto', px: 1 }}
                    >
                      Upload
                    </Button>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => openEditModal(userItem)}
                      sx={{ minWidth: 'auto', px: 1 }}
                    >
                      Edit
                    </Button>
                    {userItem.id !== user?.id && (
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteUser(userItem.id)}
                        sx={{ minWidth: 'auto', px: 1 }}
                      >
                        Delete
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

                  {/* Empty State */}
          {!loading && filteredUsers.length === 0 && (
            <Paper sx={{ p: 3, textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
            <Typography variant="h6" gutterBottom>
              No users found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchTerm || roleFilter !== 'ALL' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating a new user.'
              }
            </Typography>
          </Paper>
        )}

        {/* Create User Modal */}
        <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New User</DialogTitle>
          <form onSubmit={handleCreateUser}>
            <DialogContent>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                />
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                />
                <TextField
                  fullWidth
                  label="Full Name"
                  required
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({...createForm, fullName: e.target.value})}
                />
                <TextField
                  fullWidth
                  label="Graduation Class"
                  value={createForm.graduationClass}
                  onChange={(e) => setCreateForm({...createForm, graduationClass: e.target.value})}
                />
                <FormControl fullWidth>
                  <InputLabel>Role</InputLabel>
                  <Select
                    value={createForm.role}
                    label="Role"
                    onChange={(e) => setCreateForm({...createForm, role: e.target.value})}
                  >
                    <MenuItem value="USER">User</MenuItem>
                    <MenuItem value="MEMBER">Member</MenuItem>
                    <MenuItem value="ADMIN">Admin</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                Create User
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Edit User Modal */}
        <Dialog open={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit User</DialogTitle>
          <form onSubmit={handleUpdateUser}>
            <DialogContent>
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Full Name"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
                />
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                />
                <TextField
                  fullWidth
                  label="Graduation Class"
                  value={editForm.graduationClass}
                  onChange={(e) => setEditForm({...editForm, graduationClass: e.target.value})}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                Update User
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Upload Image Modal */}
        <Dialog open={showImageModal} onClose={() => setShowImageModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Upload Profile Image</DialogTitle>
          <form onSubmit={handleUploadImage}>
            <DialogContent>
              <TextField
                fullWidth
                type="file"
                accept="image/*"
                required
                onChange={(e) => setImageFile(e.target.files[0])}
                helperText="Max file size: 5MB. Supported formats: JPG, PNG, GIF"
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowImageModal(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                Upload Image
              </Button>
            </DialogActions>
          </form>
                 </Dialog>
       </Box>
    </AccessControl>
   );
 };

export default UserManagement;
