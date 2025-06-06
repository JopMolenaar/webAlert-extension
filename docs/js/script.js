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
  deviceInputs.forEach((input) => input.addEventListener("click", () => handleDeviceSelection(input)));
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
function handleDeviceSelection(input) {
  enableButton(".index1");

  appInputs.forEach((app) => app.parentElement.parentElement.style.display = "flex");
  if(input.value !== "mac" && input.value !== "iphone"){
    appInputs.forEach((app) => (app.value === "sms" || app.value === "whatsapp") ? (app.parentElement.parentElement.style.display = "none", app.parentElement.parentElement.style.order = "1") : null);    
  }
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

  // Scroll to the button using the target mechanism
  btn.scrollIntoView({ behavior: "smooth", block: "center" });
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
    const res = await fetch("data/shortcuts.json");
    if (!res.ok) throw new Error("data/shortcuts.json kon niet geladen worden.");

    const linkMap = await res.json();
    const link = getLink(linkMap, device, app, who, title);

    // displayGeneratedLink(link);
  } catch (err) {
    alert("Er is een fout opgetreden: " + err.message);
  }
}

// // Display the generated link
// function displayGeneratedLink(link) {
//   const a = document.createElement("a");
//   a.classList.add("btn-primary");
//   a.href = link;
//   a.target = "_blank";
//   a.textContent = "Voeg het hulpmiddel toe aan uw apparaat";

//   outputLink.textContent = "";
//   outputLink.appendChild(a);
//   updateProgress(4) 
//   // document.querySelector(".progress-meter").style.display = "none"
  
//   form.style.display = "none";
//   output.style.display = "flex";
//   nextStepsText.style.display = "block";
//   resetBtn.style.display = "inline";
//   questionIndex = 4;
// }

// Determine the final link
function getLink(linkMap, device, app, who, title) {
  if (!device) throw new Error("Geen apparaat geselecteerd.");
  if (!app) throw new Error("Geen app geselecteerd.");

  const platform = device === "iphone" ? "ios" 
                  : ["samsung", "huawei", "oppo", "onePlus"].includes(device) ? "android" 
                  : device === "mac" ? "macOs" 
                  : "windows";

                  
  const whoType = who.includes("decideMyself") ? "decideMyself" : who.length > 0 ? "customContact" : null;
  if (!whoType) throw new Error("Geen ontvanger gekozen of ingevuld.");

  const titleType = title === "help" ? "help" : "customTitle";
  const link = linkMap?.[platform]?.[app]?.[whoType]?.[titleType];

  getSteps(platform, link);
  if (!link) throw new Error("Geen geldige combinatie gevonden in shortcuts.json.");

  return link;
}

// Fetch the steps matching the answers from the form.
async function getSteps(platform, link) {
    try {
        const res = await fetch("data/installationStepsDevice.json");
        if (!res.ok) throw new Error("data/installationStepsDevice.json kon niet geladen worden.");

        const data = await res.json();
        const steps = data[platform].english;

        const ol = document.createElement("ol");
        steps.forEach((step, index) => {

        // Place the output link in step 2
        if(index === 1){
          fillOutputLink(link)
          const outputLi = document.createElement("li");
          outputLi.dataset.index = "Stap: " + (index + 1);
          Array.from(output.children).forEach((child) => {
            outputLi.appendChild(child.cloneNode(true));
          });
          ol.appendChild(outputLi);
          output.remove()
        }

        const li = document.createElement("li");
        index = index > 0 ? index + 2 : index + 1;
        li.dataset.index = "Stap: " + (index);

        if(step.mainStep) {
          const details = document.createElement("details");
          const sum = document.createElement("summary");
          const detailsContent = document.createElement("p");
          const div = document.createElement("div");
          const p = document.createElement("p");
          sum.textContent = "Meer informatie";
          detailsContent.textContent = step.description;
          p.textContent = step.mainStep;

          const img = document.createElement("img");   
          img.src = `images/${platform}Steps/${step.image}`;
  
          if(step.logo) img.classList.add("logo");
          // TODO ALT 
          if (step.link) {
              const a = document.createElement("a");
              a.href = step.link;
              a.target = "_blank";
              a.textContent = "hier.";
              p.appendChild(document.createTextNode(" "));
              p.appendChild(a);
          }

          details.appendChild(sum)
          details.appendChild(detailsContent)
          // p.appendChild(details)
          div.appendChild(p);
          div.appendChild(details);
          li.appendChild(div);
          li.appendChild(img);
          ol.appendChild(li);
        } else {

          const p = document.createElement("p");
          p.textContent = step.description;
  
          const img = document.createElement("img");   
          img.src = `images/${platform}Steps/${step.image}`;
  
          if(step.logo) img.classList.add("logo");
          // TODO ALT 
          if (step.link) {
              const a = document.createElement("a");
              a.href = step.link;
              a.target = "_blank";
              a.textContent = "hier.";
              p.appendChild(document.createTextNode(" "));
              p.appendChild(a);
          }
  
          li.appendChild(p);
          li.appendChild(img);
          ol.appendChild(li);
        }
      });

      // Replce the new list for the old one
      const prevOl = nextStepsText.querySelector("ol");
      prevOl ? nextStepsText.replaceChild(ol, prevOl) : nextStepsText.appendChild(ol);
    } catch (err) {
      alert("Er is een fout opgetreden (getSteps): " + err.message);
    }
}

function fillOutputLink(link) {
   const a = document.createElement("a");
   a.classList.add("btn-primary");
   a.href = link;
   a.target = "_blank";
   a.textContent = "Voeg het hulpmiddel toe aan uw apparaat";

   outputLink.textContent = "";
   outputLink.appendChild(a);
   updateProgress(4) 
   
   form.style.display = "none";
   output.style.display = "flex";
   nextStepsText.style.display = "block";
   resetBtn.style.display = "inline";
   questionIndex = 4;
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
  questionIndex === 1 ? startText.classList.remove("hidden") : startText.classList.add("hidden");

  const deviceSelected = !!document.querySelector('input[name="device"]:checked');
  const appSelected = !!document.querySelector('input[name="app"]:checked');

  nextBtn.style.opacity = questionIndex === 3 ? "0" : deviceSelected && questionIndex === 1 || appSelected && questionIndex === 2 ? "1" : "0.5";
  nextBtn.disabled = questionIndex === 3 || (questionIndex === 1 && !deviceSelected) || (questionIndex === 2 && !appSelected);
  backBtn.style.opacity = questionIndex === 1 ? "0" : "1";
  backBtn.disabled = questionIndex === 1;

  document.querySelector(`#question${questionIndex}`).style.display = "flex";

  questionIndex !== 1 ? window.scrollTo({ top: 0, behavior: "smooth" }) : null;
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
  // document.querySelector(".progress-meter").style.display = "flex"
  updateProgress(questionIndex) 
  nextBtn.classList.add(`index${questionIndex}`);
  showCurrentQuestion();
}

const inputWho = document.querySelector("#who1");
const radioBtnWho = document.querySelector("#who2");
const submitBtn = document.querySelector("button[type='submit']");
submitBtn.disabled = true; // Disable the submit button initially

// Separate target function to help the user find the next action
function targetSubmitButton() {
  submitBtn.disabled = false;
  submitBtn.scrollIntoView({ behavior: "smooth", block: "center" });
}

inputWho.addEventListener("input", () => {  
  targetSubmitButton()
});
radioBtnWho.addEventListener("click", () => {  
  targetSubmitButton()
});

// Reset the form and start over
const resetButton = document.querySelector("#reset")
resetButton.addEventListener("click", (e) => {
  location.reload();
});

// Update the progress in the progress bar
const progressMeter = document.querySelector('.progress-meter');
const spans = progressMeter.querySelectorAll('span:not(.middle-line)');
const middleLine = progressMeter.querySelector('.middle-line span');

function updateProgress(step) {
  spans.forEach((span, index) => {
    if (index < step) {
      const percentage = step === 1 ? 0 : 10 + (step - 1) * 20; 
      middleLine.style.width = `${percentage}%`;
      span.classList.add("active");
    } else {
      span.classList.remove("active");
    }
  });
}

// Initialize the application
function initialize() {
  nextBtn.classList.add(`index${questionIndex}`);
  showCurrentQuestion();
  updateProgress(1)
  initializeEventListeners();
}

initialize();
