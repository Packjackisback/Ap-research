import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://aifumynkocrvizeccwtb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_R0uHqn-OqznkKVURp2zFwA_GERBW8FT";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const HACKCLUB_API_KEY =
  "sk-hc-v1-b443235639074582be4eeb1ffe9a184a408c474eb4a246c89d48c494dcba893c";

const stages = [
  {
    id: 1,
    prompt: "Describe a personal challenge you faced and how you handled it.",
    allowAI: false,
  },
  {
    id: 2,
    prompt: "Discuss your views on remote work. You may use the chatbot.",
    allowAI: true,
  },
  {
    id: 3,
    prompt: "Reflect on how technology affects creativity.",
    allowAI: false,
  },
];

let stageIndex = 0;
let startTime = Date.now();
let keystrokes = [];

const promptEl = document.getElementById("prompt");
const stageEl = document.getElementById("stage-indicator");
const responseEl = document.getElementById("response");
const certifyEl = document.getElementById("certify");
const chatbotEl = document.getElementById("chatbot");
const chatInput = document.getElementById("chatInput");
const chatOutput = document.getElementById("chatOutput");

function loadStage() {
  const stage = stages[stageIndex];
  stageEl.innerText = `Stage ${stage.id}`;
  promptEl.innerText = stage.prompt;
  responseEl.value = "";
  certifyEl.checked = false;
  keystrokes = [];
  startTime = Date.now();

  chatbotEl.hidden = !stage.allowAI;
  document.getElementById("certify-box").hidden = stage.allowAI;

  if (!stage.allowAI) {
    document.addEventListener("paste", prevent);
    document.addEventListener("copy", prevent);
    window.onblur = () => alert("Please stay on this tab.");
  } else {
    document.removeEventListener("paste", prevent);
    document.removeEventListener("copy", prevent);
    window.onblur = null;
  }
}

function prevent(e) {
  e.preventDefault();
}

responseEl.addEventListener("keydown", () => {
  keystrokes.push(Date.now());
});

document.getElementById("submit").onclick = async () => {
  const stage = stages[stageIndex];
  const duration = Date.now() - startTime;
  const text = responseEl.value.trim();

  if (!stage.allowAI && !certifyEl.checked) {
    alert("You must certify authorship.");
    return;
  }

  if (text.length < 200) {
    alert("Response too short.");
    return;
  }

  await supabase.from("responses").insert({
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
    document.body.innerHTML = "<h2>Thank you for participating.</h2>";
  }
};

document.getElementById("chatSend").onclick = async () => {
  const msg = chatInput.value;

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
        { role: "user", content: msg },
      ],
    }),
  });

  const data = await res.json();
  chatOutput.innerText = data.choices[0].message.content;
};

loadStage();
