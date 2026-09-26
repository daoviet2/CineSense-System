import express from 'express';

const app = express();
const port = Number(process.env.PORT || 4000);

app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening on port ${port}`);
});