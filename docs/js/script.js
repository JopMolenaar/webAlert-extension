const form = document.querySelector("form");
const backBtn = document.querySelector("#controls button:nth-of-type(1)");
const nextBtn = document.querySelector("#controls button:nth-of-type(2)");
const output = document.querySelector("#output");
const resetBtn = document.querySelector("#reset");
const nextStepsText = document.querySelector(".endText")
const startText = document.querySelector(".startText")
const deviceInputs = document.querySelectorAll("input[name='device']");
const appInputs = document.querySelectorAll("input[name='app']");
const outputLink = document.querySelector(".placeholder");
const whoCheckbox = document.querySelector('#who1');
const whoInput = document.querySelector('#who2');



whoInput.addEventListener("input", () => {
  if (whoInput.value.trim() !== "") {
    whoCheckbox.checked = false;
    whoInput.classList.add("blue-border");
  } else {
    whoInput.classList.remove("blue-border");
  }
});

whoCheckbox.addEventListener("change", () => {
  if (whoCheckbox.checked) {
    whoInput.value = "";
    whoInput.classList.remove("blue-border");
  }
});

// Make button ready
deviceInputs.forEach((input)=>{
  input.addEventListener("click", () => {
    const btn = document.querySelector(".index1")
    btn.style.opacity = "0.6"
    // TODO add classlist and un disable the button
  })
});

// Change the format of the next question
appInputs.forEach((input)=>{
  input.addEventListener("click", () => {
    console.log(input.value);
    let typeOfContact = "emailadres"
    if (input.value === "sms" || input.value === "whatsapp") typeOfContact = "telefoonnummer";
    document.querySelector("#formatWho").textContent = typeOfContact
    const customInputReceiver = document.querySelector("input#who2");
    
    (input.value === "sms" || input.value === "whatsapp") ? customInputReceiver.setAttribute("type", "tel") : customInputReceiver.setAttribute("type", "email");
    (input.value === "sms" || input.value === "whatsapp") ? customInputReceiver.setAttribute("placeholder", "06123456789") : customInputReceiver.setAttribute("placeholder", "voorbeeld@mail.com");

    // Make button ready
    const btn = document.querySelector(".index2")
    btn.style.opacity = "0.6"
    // TODO add classlist and un disable the button

  })
});



// Form submission
form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const deviceInput = document.querySelector('input[name="device"]:checked');
    const appInput = document.querySelector('input[name="app"]:checked');

    const device = deviceInput ? deviceInput.value : null;
    const app = appInput ? appInput.value : null;

    const who = [];
    if (whoCheckbox.checked) who.push(whoCheckbox.value);
    if (whoInput.value.trim() !== "") who.push(whoInput.value.trim());

    const title = 'help';
    // if (title1.checked) title.push(title1.value);
    // if (title2.checked) title.push(title2.value);
    // if (title3.value.trim() !== "") title.push("customTitle");

    try {
        const res = await fetch('shortcuts.json');
        if (!res.ok) {
          throw new Error("shortcuts.json kon niet geladen worden.");
        }
  
        const linkMap = await res.json();
        const link = getLink(linkMap, device, app, who, title);

        // Do something with the link
        console.log("Generated Link:", link);
        const a = document.createElement("a");
        a.href = link;
        a.target = "_blank";
        a.textContent = link;
        outputLink.textContent = "";
        outputLink.appendChild(a);

        form.style.display = "none";
        output.style.display = "block"
        nextStepsText.style.display = "block"
        resetBtn.style.display = "inline"
        questionIndex = 4
    } catch (err) {
        console.error(err);
        // TODO ALERT THE USER IN THE FORM
        alert("Er is een fout opgetreden: " + err.message);
    }    
});


// Function to determine the final link
function getLink(linkMap, device, app, who, title) {
  if (!device) throw new Error("Geen apparaat geselecteerd.");
  if (!app) throw new Error("Geen app geselecteerd.");

  let platform = "windows";
  if (device === "iphone") platform = "ios";
  else if (["samsung", "huawei", "oppo", "onePlus"].includes(device)) platform = "android";

  const whoType = who.includes("decideMyself") ? "decideMyself" : who.length > 0 ? "customContact" : null;
  if (!whoType) throw new Error("Geen ontvanger gekozen of ingevuld.");

  let titleType = "customTitle";
  if (title.includes("help")) titleType = "help";
  else if (title.includes("decideMyself")) titleType = "decideMyself";
  else if (!title.includes("customTitle")) throw new Error("Geen titel geselecteerd of ingevuld.");

  const link = linkMap?.[platform]?.[app]?.[whoType]?.[titleType];
  if (!link) {
    throw new Error("Geen geldige combinatie gevonden in shortcuts.json.");
  }

  return link;
}


// Question click through logic
let questionIndex = 1
function showCurrentQuestion(){
  form.style.display = "block";
  
  if(!document.querySelector(`#question${questionIndex}`)){
    questionIndex >= 3 ? questionIndex = 3 : questionIndex = 1;
    return
  }

  output.style.display = "none"
  nextStepsText.style.display = "none"
  resetBtn.style.display = "none"
  const divs = document.querySelectorAll("form > div");
  divs.forEach((div)=>{
    div.style.display = "none";
  })

  startText.style.display = "none";
  if(questionIndex === 1) startText.style.display = "block"

  questionIndex === 3 ? (nextBtn.style.opacity = "0", nextBtn.disabled = true) : (nextBtn.style.opacity = "1", nextBtn.disabled = false)
  questionIndex === 1 ? (backBtn.style.opacity = "0", backBtn.disabled = true) : (backBtn.style.opacity = "1", backBtn.disabled = false)

  document.querySelector(`#question${questionIndex}`).style.display = "flex";
}

nextBtn.addEventListener("click", () => {
  nextBtn.classList.remove(`index${questionIndex}`)
  questionIndex++
  nextBtn.classList.add(`index${questionIndex}`)
  showCurrentQuestion()
})

backBtn.addEventListener("click", () => {
  nextBtn.classList.remove(`index${questionIndex}`)
  questionIndex--
  nextBtn.classList.add(`index${questionIndex}`)
  showCurrentQuestion()
})

nextBtn.classList.add(`index${questionIndex}`)
showCurrentQuestion()



// const title1 = document.querySelector('#title1');
// const title2 = document.querySelector('#title2');
// const title3 = document.querySelector('#title3');

// if (!title1.checked && !title2.checked) {
//     title3.setAttribute("required", "required");
// }

// title3.addEventListener("input", () => {
//   if (title3.value.trim() !== "") {
//     title1.checked = false;
//     title2.checked = false;
//     title3.classList.add("blue-border");
//   } else {
//     title3.classList.remove("blue-border");
//   }
// });

// [title1, title2].forEach(cb => {
//   cb.addEventListener("change", () => {
//     if (cb.checked) {
//       title3.value = "";
//       title3.removeAttribute("required");
//       title3.classList.remove("blue-border");
//     } else if (!title1.checked && !title2.checked) {
//         title3.setAttribute("required", "required");
//     }
//   });
// });
