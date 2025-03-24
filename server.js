const express = require('express');
const app = express();
const port = 3000;

app.get('/callback', (req, res) => {
  const { code, state } = req.query;
  // Here, you can just display the code and state
  res.send(`Authorization code received: ${code}<br>State: ${state}<br><br>Copy this code into Obsidian!`);
  console.log('Received code:', code);
  console.log('Received state:', state);
});

app.listen(port, () => {
  console.log(`Server listening at http://127.0.0.1:${port}`);
});