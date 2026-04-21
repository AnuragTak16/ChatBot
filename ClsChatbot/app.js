import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import Groq from 'groq-sdk';

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// delete the data after 24 hours : currently we use frontend for history
// const myCache = new NodeCache({ stdTTL: 60 * 60 * 24 })

const MAX_STEPS = 3;
const MAX_HISTORY = 10;

// 🔹 API endpoint
app.post('/api/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  // base messages
  const messages = [
    {
      role: 'system',
      content: `
You are an AI assistant.

Rules:
- Use tools ONLY when necessary
- If tool result exists → give final answer
- Do NOT loop tool calls
- Do NOT output <function=...>
`,
    },
    ...history, // previous conversation
    { role: 'user', content: message },
  ];

  // 🔒 Trim history
  if (messages.length > MAX_HISTORY) {
    messages.splice(1, messages.length - MAX_HISTORY);
  }

  let step = 0;

  try {
    while (step < MAX_STEPS) {
      step++;

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
        messages,
        tools: [
          {
            type: 'function',
            function: {
              name: 'webSearch',
              description: 'Search real-time info',
              parameters: {
                type: 'object',
                properties: {
                  query: { type: 'string' },
                },
                required: ['query'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: 'auto',
      });

      const msg = response.choices[0].message;
      messages.push(msg);

      // ✅ Final answer
      if (!msg.tool_calls) {
        return res.json({
          reply: msg.content,
          history: messages,
        });
      }

      // 🔧 Execute tools
      for (const tool of msg.tool_calls) {
        let args;

        try {
          args = JSON.parse(tool.function.arguments);
        } catch {
          return res.json({ error: 'Invalid tool arguments' });
        }

        let result = '';

        if (tool.function.name === 'webSearch') {
          result = await safeWebSearch(args);
        }

        messages.push({
          role: 'tool',
          tool_call_id: tool.id,
          content: result,
        });
      }
    }

    return res.json({
      reply: 'Too many tool calls. Try again.',
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message,
    });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

// 🔹 Tool function
async function safeWebSearch({ query }) {
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: 3,
      }),
    });

    const data = await res.json();

    if (!data.results) return 'No results found.';

    return data.results
      .map((item) => item.content)
      .slice(0, 3)
      .join('\n\n');
  } catch {
    return 'Error fetching search results.';
  }
}
