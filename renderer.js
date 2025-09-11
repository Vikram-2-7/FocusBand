const form = document.getElementById("commandForm");
const input = document.getElementById("commandInput");
const output = document.getElementById("output");
const tabContainer = document.getElementById("tab-container");
const contentContainer = document.getElementById("content-container");

const GEMINI_API_KEY = "AIzaSyAm1ufAQB-aIuRM7MR8w7WorY2RzcI38F0";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
  GEMINI_API_KEY;

let tabs = {};
let activeTab = null;

// --- Submit form ---
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userCommand = input.value.trim();
  if (!userCommand) return;

  output.textContent = "⏳ Sending command to Gemini...";

  try {
    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `
Return ONLY valid JSON. 
Do not add explanations or markdown text.

JSON Rules:
- "action" must be one of: createTab, addTask, deleteTask, deleteTab
- "tabName" is required
- "tasks" must be an array of objects like {title, time, objectives[], productivity{completed,total}}
- For deleteTask, include "taskTitle"

User Command: "${userCommand}"
`
              },
            ],
          },
        ],
      }),
    });

    const data = await res.json();
    console.log("🔍 RAW Gemini Response:", data);

    let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // --- Cleanup ---
    let cleaned = textResponse
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    output.textContent = "📦 Parsed Gemini JSON:\n" + cleaned;

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      output.textContent += "\n\n⚠️ Failed to parse JSON: " + e.message;
      return;
    }

    if (!parsed.action) {
      output.textContent += "\n⚠️ No action found in response.";
      return;
    }

    updateUI(parsed);

  } catch (err) {
    output.textContent = "❌ Error: " + err.message;
  }
});

// --- Update UI ---
function updateUI(data) {
  const tabName = data.tabName;
  if (!tabName) return;

  if (data.action === "createTab") {
    if (!tabs[tabName]) tabs[tabName] = [];
    if (data.tasks) {
      const newTasks = Array.isArray(data.tasks) ? data.tasks : [data.tasks];
      tabs[tabName].push(...newTasks);
    }
    activeTab = tabName;
  }

  if (data.action === "addTask") {
    if (!tabs[tabName]) tabs[tabName] = [];
    if (data.tasks) {
      const newTasks = Array.isArray(data.tasks) ? data.tasks : [data.tasks];
      tabs[tabName].push(...newTasks);
    }
    activeTab = tabName;
  }

  if (data.action === "deleteTask") {
    if (tabs[tabName]) {
      tabs[tabName] = tabs[tabName].filter(
        (task) => task.title.toLowerCase() !== data.taskTitle?.toLowerCase()
      );
    }
  }

  if (data.action === "deleteTab") {
    delete tabs[tabName];
    if (activeTab === tabName) activeTab = Object.keys(tabs)[0] || null;
  }

  renderTabs();
}

// --- Render Tabs ---
function renderTabs() {
  tabContainer.innerHTML = "";
  Object.keys(tabs).forEach((tabName) => {
    const btn = document.createElement("button");
    btn.textContent = tabName;
    btn.className =
      "tab px-4 py-2 mr-2 rounded-full " +
      (tabName === activeTab ? "bg-[#00A3C9] text-white" : "bg-gray-200 text-gray-700");
    btn.onclick = () => {
      activeTab = tabName;
      renderTabs();
    };
    tabContainer.appendChild(btn);
  });

  contentContainer.innerHTML = "";
  if (!activeTab || !tabs[activeTab]) return;

  const tasks = tabs[activeTab];
  const wrapper = document.createElement("div");
  wrapper.className = "bg-[#F5F8FA] rounded-xl p-6 animate-fade-in-scale";

  const header = document.createElement("h3");
  header.className = "text-2xl font-bold text-[#2E4756] mb-4";
  header.textContent = activeTab;
  wrapper.appendChild(header);

  const subTabBtns = document.createElement("div");
  subTabBtns.className = "flex mb-4 space-x-2";

  ["Tasks", "Objectives", "Analysis"].forEach((sub) => {
    const subBtn = document.createElement("button");
    subBtn.textContent = sub;
    subBtn.className =
      "sub-tab py-2 px-4 rounded-full text-sm font-semibold " +
      (sub === "Tasks" ? "bg-[#00A3C9] text-white" : "bg-gray-200 text-gray-600");
    subBtn.onclick = () => renderSubTab(wrapper, tasks, sub);
    subTabBtns.appendChild(subBtn);
  });

  wrapper.appendChild(subTabBtns);

  renderSubTab(wrapper, tasks, "Tasks");
  contentContainer.appendChild(wrapper);
}

// --- Render SubTabs ---
function renderSubTab(wrapper, tasks, type) {
  while (wrapper.children.length > 2) {
    wrapper.removeChild(wrapper.lastChild);
  }

  if (type === "Tasks") {
    tasks.forEach((task) => {
      const taskDiv = document.createElement("div");
      taskDiv.className = "task-card bg-white p-4 rounded-lg mb-2 shadow";
      taskDiv.innerHTML = `<h4 class="font-bold text-[#2E4756]">${task.title}</h4>
        <p class="text-sm text-gray-600">⏰ ${task.time || "no time"}</p>`;
      wrapper.appendChild(taskDiv);
    });
  }

  if (type === "Objectives") {
    const objDiv = document.createElement("div");
    objDiv.className = "bg-white rounded-lg p-4 shadow-sm";
    if (tasks.length > 0 && tasks[tasks.length - 1].objectives?.length > 0) {
      const ul = document.createElement("ul");
      ul.className = "list-disc list-inside space-y-2 text-sm text-gray-600";
      tasks[tasks.length - 1].objectives.forEach((obj) => {
        const li = document.createElement("li");
        li.textContent = obj.text;
        li.style.color = obj.isComplete ? "green" : "gray";
        ul.appendChild(li);
      });
      objDiv.appendChild(ul);
    } else {
      objDiv.textContent = "No objectives.";
    }
    wrapper.appendChild(objDiv);
  }

  if (type === "Analysis") {
    const anaDiv = document.createElement("div");
    anaDiv.className = "bg-white rounded-lg p-4 shadow-sm";
    if (tasks.length > 0 && tasks[tasks.length - 1].productivity) {
      const prod = tasks[tasks.length - 1].productivity;
      const pct = Math.round((prod.completed / prod.total) * 100);
      anaDiv.innerHTML = `<p class="mb-2 text-gray-700 text-sm">Progress: ${prod.completed} of ${prod.total} completed.</p>
        <div class="w-full bg-gray-200 rounded-full h-4">
          <div class="bg-[#00A3C9] h-4 rounded-full" style="width:${pct}%"></div>
        </div>
        <p class="mt-1 text-sm text-gray-500">${pct}% complete</p>`;
    } else {
      anaDiv.textContent = "No productivity data.";
    }
    wrapper.appendChild(anaDiv);
  }
}
