const express = require('express');
const router = express.Router();

// Mock agent data
const agents = [
  { id: 1, name: 'John Doe', email: 'john.doe@example.com', phone: '123-456-7890', commissionSplit: 0.5, team: 'Team A' },
  { id: 2, name: 'Jane Smith', email: 'jane.smith@example.com', phone: '987-654-3210', commissionSplit: 0.6, team: 'Team B' },
];

// GET all agents
router.get('/', (req, res) => {
  res.json(agents);
});

module.exports = router;