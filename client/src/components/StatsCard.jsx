import { Card, CardContent, Typography, Grid } from '@mui/material';

export default function StatCard({ label, value, change, isNegative }) {
  return (
    <Grid item xs={12} sm={6} md={3}>
      <Card>
        <CardContent>
          <Typography variant="body2" color="textSecondary">{label}</Typography>
          <Typography variant="h5">{value}</Typography>
          {change && (
            <Typography
              variant="body2"
              sx={{ color: isNegative ? 'error.main' : 'success.main' }}
            >
              {change} from last cycle
            </Typography>
          )}
        </CardContent>
      </Card>
    </Grid>
  );
}
