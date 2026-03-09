const express = require('express');
const app = express();
const port = 3000;

// Middleware to parse JSON
app.use(express.json());

const agentRoutes = require('./routes/agents.cjs');
app.use('/api/agents', agentRoutes);

app.get('/', (req, res) => {
  res.send('Mission Control Backend is running!');
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});