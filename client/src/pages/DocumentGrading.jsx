import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Stack,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Description as DocumentIcon,
  Edit as EditIcon,
  Videocam as VideoIcon,
  Flag as FlagIcon,
  FlagOutlined as FlagOutlinedIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

// Tab Panel component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`grading-tabpanel-${index}`}
      aria-labelledby={`grading-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function DocumentGrading() {
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-az');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [firstGenFilter, setFirstGenFilter] = useState('all');
  const [transferFilter, setTransferFilter] = useState('all');

  // Progress data
  const progressData = [
    {
      title: 'Resume Completion',
      icon: <DocumentIcon />,
      completed: 50,
      total: 175,
      deadline: 'Oct 5th, EOD',
      percentage: 29,
      color: 'success'
    },
    {
      title: 'Cover Letter Completion',
      icon: <EditIcon />,
      completed: 90,
      total: 135,
      deadline: 'Oct 5th, EOD',
      percentage: 67,
      color: 'success'
    },
    {
      title: 'Video Review Completion',
      icon: <VideoIcon />,
      completed: 70,
      total: 75,
      deadline: 'Oct 5th, EOD',
      percentage: 93,
      color: 'success'
    }
  ];

  // Sample grading data
  const gradingData = [
    {
      id: 1,
      candidate: 'Ksenya Gotlieb',
      document: 'Resume',
      flagged: true,
      status: 'completed'
    },
    {
      id: 2,
      candidate: 'Ksenya Gotlieb',
      document: 'Resume',
      flagged: false,
      status: 'pending'
    },
    {
      id: 3,
      candidate: 'Alex Johnson',
      document: 'Cover Letter',
      flagged: false,
      status: 'pending'
    },
    {
      id: 4,
      candidate: 'Sarah Chen',
      document: 'Video',
      flagged: true,
      status: 'completed'
    },
    {
      id: 5,
      candidate: 'Michael Rodriguez',
      document: 'Resume',
      flagged: false,
      status: 'pending'
    }
  ];

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Grade Now';
      default:
        return 'Unknown';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Main Title */}
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: 'primary.dark', mb: 4 }}>
        Document Grading
      </Typography>

      {/* Progress Section */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 600, color: 'primary.dark', mb: 3 }}>
          Document Grading Progress
        </Typography>
        
        <Stack spacing={3}>
          {progressData.map((item, index) => (
            <Box key={index}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ color: 'primary.main', mr: 2 }}>
                  {item.icon}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.completed} / {item.total} Tasks Complete | Deadline: {item.deadline}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                  Complete {item.percentage}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={item.percentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: 'success.main'
                  }
                }}
              />
            </Box>
          ))}
        </Stack>
      </Paper>

      {/* Start Grading Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600, color: 'primary.dark', mb: 3 }}>
          Start Grading
        </Typography>

        {/* Search and Sort Row */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
          <TextField
            placeholder="Search candidates..."
            variant="outlined"
            size="small"
            sx={{ flex: 1, maxWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <SortIcon />
                </InputAdornment>
              }
            >
              <MenuItem value="name-az">Name (A-Z)</MenuItem>
              <MenuItem value="name-za">Name (Z-A)</MenuItem>
              <MenuItem value="date-new">Date (Newest)</MenuItem>
              <MenuItem value="date-old">Date (Oldest)</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Filters Row */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <FilterIcon />
                </InputAdornment>
              }
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Year</InputLabel>
            <Select
              value={yearFilter}
              label="Year"
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="2025">2025</MenuItem>
              <MenuItem value="2024">2024</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Gender</InputLabel>
            <Select
              value={genderFilter}
              label="Gender"
              onChange={(e) => setGenderFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="male">Male</MenuItem>
              <MenuItem value="female">Female</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>First Gen</InputLabel>
            <Select
              value={firstGenFilter}
              label="First Gen"
              onChange={(e) => setFirstGenFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Transfer</InputLabel>
            <Select
              value={transferFilter}
              label="Transfer"
              onChange={(e) => setTransferFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Document Type Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="document grading tabs">
            <Tab
              icon={<DocumentIcon />}
              label="Resumes"
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
            <Tab
              icon={<EditIcon />}
              label="Cover Letters"
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
            <Tab
              icon={<VideoIcon />}
              label="Videos"
              iconPosition="start"
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
          </Tabs>
        </Box>

        {/* Grading Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Candidate</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Document</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Flag</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gradingData.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {row.candidate}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DocumentIcon />}
                      sx={{ textTransform: 'none' }}
                    >
                      {row.document}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small">
                      {row.flagged ? (
                        <FlagIcon sx={{ color: 'black' }} />
                      ) : (
                        <FlagOutlinedIcon />
                      )}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusText(row.status)}
                      color={getStatusColor(row.status)}
                      size="small"
                      icon={row.status === 'completed' ? <CheckCircleIcon /> : <ScheduleIcon />}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
