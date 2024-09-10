


import { Hono } from 'hono';
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server';
import { getTokens } from './controllers/tokenizerController';

const app = new Hono();

app.use(
  '/api/*',
  cors({
    origin: ['http://localhost:3000'],
  })
)

app.post('/api/tokenize', async (c) => {
  try {
    const paragraphs = await c.req.json();

    if (!paragraphs || !Array.isArray(paragraphs)) {
      return c.json({ error: 'Invalid paragraphs input' }, 400);
    }

    const parsedText = await getTokens(paragraphs);
    return c.json({ parsedText }, 200);
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

const port = 8080
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})

