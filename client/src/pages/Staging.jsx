import React from "react";
import { Box, Typography, Card, CardContent, Grid, LinearProgress } from "@mui/material";

const categories = {
  graduation: {
    title: "By Graduation Year",
    groups: [
      { label: "Class of 2026", yes: 0, no: 0, maybe: 0, pending: 1 },
      { label: "Class of 2027", yes: 0, no: 0, maybe: 0, pending: 1 },
      { label: "Class of 2028", yes: 0, no: 0, maybe: 1, pending: 2 },
    ]
  },
  gender: {
    title: "By Gender",
    groups: [
      { label: "Male", yes: 0, no: 0, maybe: 0, pending: 5 },
      { label: "Female", yes: 0, no: 1, maybe: 1, pending: 4 },
      { label: "Other", yes: 0, no: 0, maybe: 0, pending: 0 },
    ]
  }
};

const CountRow = ({ yes, no, maybe, pending }) => {
  const total = yes + no + maybe + pending;

  return (
    <Box mt={1}>
      <Grid container spacing={1}>
        {[
          { label: "Yes", value: yes, color: "#4caf50" },
          { label: "No", value: no, color: "#f44336" },
          { label: "Maybe", value: maybe, color: "#ff9800" },
          { label: "Pending", value: pending, color: "#9e9e9e" }
        ].map((item) => (
          <Grid item xs={6} sm={3} key={item.label}>
            <Card sx={{ backgroundColor: item.color + "22" }}>
              <CardContent sx={{ textAlign: "center", py: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{item.label}</Typography>
                <Typography variant="h6">{item.value}</Typography>
                {total > 0 && (
                  <LinearProgress
                    variant="determinate"
                    value={(item.value / total) * 100}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      mt: 1,
                      backgroundColor: "#e0e0e0",
                      "& .MuiLinearProgress-bar": {
                        backgroundColor: item.color
                      }
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default function Staging() {
  return (
    <Box p={3}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        📊 Demographics Overview
      </Typography>

      {/* Summary Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>Overall Summary</Typography>

          {(() => {
            const all = [...categories.graduation.groups, ...categories.gender.groups];
            const total = all.reduce((sum, g) => sum + g.yes + g.no + g.maybe + g.pending, 0);

            return (
              <Typography variant="body1">
                Total Applicants: <b>{total}</b>
              </Typography>
            );
          })()}
        </CardContent>
      </Card>

      {/* Demographic Sections */}
      {Object.values(categories).map((section) => (
        <Box key={section.title} mb={4}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            {section.title}
          </Typography>
          <Grid container spacing={3}>
            {section.groups.map((group) => {
              const total = group.yes + group.no + group.maybe + group.pending;
              return (
                <Grid item xs={12} md={4} key={group.label}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {group.label} ({total} total)
                      </Typography>
                      <CountRow
                        yes={group.yes}
                        no={group.no}
                        maybe={group.maybe}
                        pending={group.pending}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}
