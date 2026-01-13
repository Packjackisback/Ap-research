import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://aifumynkocrvizeccwtb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_R0uHqn-OqznkKVURp2zFwA_GERBW8FT";

const HACKCLUB_API_KEY =
  "sk-hc-v1-b443235639074582be4eeb1ffe9a184a408c474eb4a246c89d48c494dcba893c";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const participantId = crypto.randomUUID();

const stages = [
  {
    id: 1,
    prompt: "Describe a personal challenge you faced and how you handled it.",
    allowAI: false,
  },
  {
    id: 2,
    prompt: "Discuss your views on remote work. You may use the chatbot below.",
    allowAI: true,
  },
  {
    id: 3,
    prompt: "Reflect on how technology affects creativity.",
    allowAI: false,
  },
];

let stageIndex = 0;
let startTime = 0;
let keystrokes = [];

const consentScreen = document.getElementById("consent-screen");
const taskScreen = document.getElementById("task-screen");
const questionnaireScreen = document.getElementById("questionnaire-screen");

const stageEl = document.getElementById("stage-indicator");
const promptEl = document.getElementById("prompt");
const responseEl = document.getElementById("response");
const certifyEl = document.getElementById("certify");
const certifyBox = document.getElementById("certify-box");

const chatbotEl = document.getElementById("chatbot");
const chatInput = document.getElementById("chatInput");
const chatOutput = document.getElementById("chatOutput");

document.getElementById("consent-continue").onclick = () => {
  if (!document.getElementById("consent-checkbox").checked) {
    alert("You must consent to participate.");
    return;
  }
  consentScreen.hidden = true;
  taskScreen.hidden = false;
  loadStage();
};

function prevent(e) {
  e.preventDefault();
}

function loadStage() {
  const stage = stages[stageIndex];

  stageEl.innerText = `Stage ${stage.id}`;
  promptEl.innerText = stage.prompt;

  responseEl.value = "";
  certifyEl.checked = false;
  chatInput.value = "";
  chatOutput.innerText = "";

  keystrokes = [];
  startTime = Date.now();

  chatbotEl.hidden = !stage.allowAI;
  certifyBox.hidden = stage.allowAI;

  if (!stage.allowAI) {
    document.addEventListener("paste", prevent);
    document.addEventListener("copy", prevent);
    document.addEventListener("cut", prevent);

    let tabBlurred = false;

    window.addEventListener("blur", () => {
      const stage = stages[stageIndex];
      if (!stage || stage.allowAI) return;

      tabBlurred = true;
      document.getElementById("focus-warning").hidden = false;
    });

    window.addEventListener("focus", () => {
      tabBlurred = false;
      document.getElementById("focus-warning").hidden = true;
    });
  } else {
    document.removeEventListener("paste", prevent);
    document.removeEventListener("copy", prevent);
    document.removeEventListener("cut", prevent);
    window.onblur = null;
  }
}

responseEl.addEventListener("keydown", () => {
  keystrokes.push(Date.now());
});

document.getElementById("submit").onclick = async () => {
  const stage = stages[stageIndex];
  const text = responseEl.value.trim();
  const duration = Date.now() - startTime;

  if (!stage.allowAI && !certifyEl.checked) {
    alert("You must certify authorship for this stage.");
    return;
  }

  if (text.length < 200) {
    alert("Please write a full paragraph.");
    return;
  }

  await supabase.from("responses").insert({
    participant_id: participantId,
    stage: stage.id,
    prompt: stage.prompt,
    response: text,
    duration_ms: duration,
    keystroke_count: keystrokes.length,
    used_ai: stage.allowAI,
  });

  stageIndex++;

  if (stageIndex < stages.length) {
    loadStage();
  } else {
    taskScreen.hidden = true;
    loadQuestionnaire();
  }
};

document.getElementById("chatSend").onclick = async () => {
  if (!stages[stageIndex].allowAI) return;

  const userMessage = chatInput.value.trim();
  if (!userMessage) return;

  chatOutput.innerText = "Thinking...";

  const res = await fetch("https://ai.hackclub.com/proxy/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HACKCLUB_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-5-mini",
      messages: [
        {
          role: "system",
          content: "You are a writing assistant for a research study.",
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
    }),
  });

  const data = await res.json();
  chatOutput.innerText = data.choices[0].message.content;
};

function loadQuestionnaire() {
  questionnaireScreen.hidden = false;
  const form = document.getElementById("questionnaire-form");
  form.innerHTML = "";

  stages.forEach((stage) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <h4>Stage ${stage.id}</h4>

      <label>
        Perceived difficulty (0–100):
        <input type="number" min="0" max="100" id="diff-${stage.id}" required>
      </label><br><br>

      <label>
        AI usage (0–100):<br>
        <small>
          0 = only for editing<br>
          100 = fully written by AI, did not engage with output
        </small><br>
        <input type="number" min="0" max="100" id="ai-${stage.id}" required>
      </label>
      <hr>
    `;
    form.appendChild(div);
  });
}

document.getElementById("submit-questionnaire").onclick = async () => {
  for (const stage of stages) {
    await supabase.from("questionnaire").insert({
      participant_id: participantId,
      stage: stage.id,
      difficulty: Number(document.getElementById(`diff-${stage.id}`).value),
      perceived_ai_use: Number(document.getElementById(`ai-${stage.id}`).value),
    });
  }

  document.body.innerHTML =
    "<h2>Thank you for participating in the study.</h2>";
};
