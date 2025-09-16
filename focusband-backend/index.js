const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Set in Render dashboard!

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + GEMINI_API_KEY;

app.post("/ask-gemini", async (req, res) => {
  try {
    const { userCommand } = req.body;
    const prompt = `
Return ONLY valid JSON.
Do not add explanations or markdown text.
JSON Rules:
- "action" must be one of: createTab, addTask, deleteTask, deleteTab, completeTask, updateTaskStatus
- "tabName" is required
- "tasks" and "completedTasks" must be arrays (completedTasks for finished items)
- Mark completed tasks with "isComplete": true and move to completedTasks
- Never delete a tab unless explicitly commanded
User Command: "${userCommand}"
`
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => { console.log("Server running on port " + PORT); });
