const form = document.querySelector("form");
const backBtn = document.querySelector("#controls button:nth-of-type(1)");
const nextBtn = document.querySelector("#controls button:nth-of-type(2)");
const output = document.querySelector("#output");
const resetBtn = document.querySelector("#reset");
const nextStepsText = document.querySelector(".endText");
const startText = document.querySelector(".startText");
const deviceInputs = document.querySelectorAll("input[name='device']");
const appInputs = document.querySelectorAll("input[name='app']");
const outputLink = document.querySelector(".placeholder");
const whoCheckbox = document.querySelector("#who1");
const whoInput = document.querySelector("#who2");

let questionIndex = 1;

// Initialize event listeners
function initializeEventListeners() {
  whoInput.addEventListener("input", handleWhoInputChange);
  whoCheckbox.addEventListener("change", handleWhoCheckboxChange);
  deviceInputs.forEach((input) => input.addEventListener("click", handleDeviceSelection));
  appInputs.forEach((input) => input.addEventListener("click", handleAppSelection));
  form.addEventListener("submit", handleFormSubmission);
  nextBtn.addEventListener("click", handleNextClick);
  backBtn.addEventListener("click", handleBackClick);
}

// Handle input changes for "who" field
function handleWhoInputChange() {
  if (whoInput.value.trim() !== "") {
    whoCheckbox.checked = false;
    whoInput.classList.add("blue-border");
  } else {
    whoInput.classList.remove("blue-border");
  }
}

function handleWhoCheckboxChange() {
  if (whoCheckbox.checked) {
    whoInput.value = "";
    whoInput.classList.remove("blue-border");
  }
}

// Enable the next button when a device is selected
function handleDeviceSelection() {
  enableButton(".index1");
}

// Update the format and enable the next button when an app is selected
function handleAppSelection(event) {
  const input = event.target;
  const typeOfContact = input.value === "sms" || input.value === "whatsapp" ? "telefoonnummer" : "emailadres";
  const customInputReceiver = document.querySelector("input#who2");

  document.querySelector("#formatWho").textContent = typeOfContact;
  customInputReceiver.setAttribute("type", input.value === "sms" || input.value === "whatsapp" ? "tel" : "email");
  customInputReceiver.setAttribute("placeholder", input.value === "sms" || input.value === "whatsapp" ? "06123456789" : "voorbeeld@mail.com");

  enableButton(".index2");
}

// Enable a button by selector
function enableButton(selector) {
  const btn = document.querySelector(selector);
  btn.removeAttribute("disabled");
  btn.style.opacity = "1";
}

// Handle form submission
async function handleFormSubmission(event) {
  event.preventDefault();

  const deviceInput = document.querySelector('input[name="device"]:checked');
  const appInput = document.querySelector('input[name="app"]:checked');
  const device = deviceInput ? deviceInput.value : null;
  const app = appInput ? appInput.value : null;

  const who = [];
  if (whoCheckbox.checked) who.push(whoCheckbox.value);
  if (whoInput.value.trim() !== "") who.push(whoInput.value.trim());

  const title = "help";

  try {
    const res = await fetch("shortcuts.json");
    if (!res.ok) throw new Error("shortcuts.json kon niet geladen worden.");

    const linkMap = await res.json();
    const link = getLink(linkMap, device, app, who, title);

    displayGeneratedLink(link);
  } catch (err) {
    alert("Er is een fout opgetreden: " + err.message);
  }
}

// Display the generated link
function displayGeneratedLink(link) {
  const a = document.createElement("a");
  a.href = link;
  a.target = "_blank";
  a.textContent = link;

  outputLink.textContent = "";
  outputLink.appendChild(a);

  form.style.display = "none";
  output.style.display = "block";
  nextStepsText.style.display = "block";
  resetBtn.style.display = "inline";
  questionIndex = 4;
}

// Determine the final link
function getLink(linkMap, device, app, who, title) {
  if (!device) throw new Error("Geen apparaat geselecteerd.");
  if (!app) throw new Error("Geen app geselecteerd.");

  const platform = device === "iphone" ? "ios" : ["samsung", "huawei", "oppo", "onePlus"].includes(device) ? "android" : "windows";
  const whoType = who.includes("decideMyself") ? "decideMyself" : who.length > 0 ? "customContact" : null;
  if (!whoType) throw new Error("Geen ontvanger gekozen of ingevuld.");

  const titleType = title === "help" ? "help" : "customTitle";
  const link = linkMap?.[platform]?.[app]?.[whoType]?.[titleType];
  if (!link) throw new Error("Geen geldige combinatie gevonden in shortcuts.json.");

  return link;
}

// Show the current question
function showCurrentQuestion() {
  form.style.display = "block";

  if (!document.querySelector(`#question${questionIndex}`)) {
    questionIndex = Math.min(Math.max(questionIndex, 1), 3);
    return;
  }

  output.style.display = "none";
  nextStepsText.style.display = "none";
  resetBtn.style.display = "none";

  document.querySelectorAll("form > div").forEach((div) => (div.style.display = "none"));
  startText.style.display = questionIndex === 1 ? "block" : "none";

  const deviceSelected = !!document.querySelector('input[name="device"]:checked');
  const appSelected = !!document.querySelector('input[name="app"]:checked');

  nextBtn.style.opacity = questionIndex === 3 ? "0" : deviceSelected && questionIndex === 1 || appSelected && questionIndex === 2 ? "1" : "0.5";
  nextBtn.disabled = questionIndex === 3;
  backBtn.style.opacity = questionIndex === 1 ? "0" : "0.5";
  backBtn.disabled = questionIndex === 1;

  document.querySelector(`#question${questionIndex}`).style.display = "flex";
}

// Handle next button click
function handleNextClick() {
  updateQuestionIndex(1);
}

// Handle back button click
function handleBackClick() {
  updateQuestionIndex(-1);
}

// Update question index and refresh the view
function updateQuestionIndex(delta) {
  nextBtn.classList.remove(`index${questionIndex}`);
  questionIndex += delta;
  nextBtn.classList.add(`index${questionIndex}`);
  showCurrentQuestion();
}

// Initialize the application
function initialize() {
  nextBtn.classList.add(`index${questionIndex}`);
  showCurrentQuestion();
  initializeEventListeners();
}

initialize();
