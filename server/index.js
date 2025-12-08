const express = require('express');
const app = express();
const port = 3000;

const cors = require('cors');
const corsOptions = {origin: 'http://localhost:5173'};
app.use(cors(corsOptions));

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});