const form = document.querySelector("form");

document.addEventListener("DOMContentLoaded", function () {
  
    const whoCheckbox = document.querySelector('#who1');
    const whoInput = document.querySelector('#who2');
  
    const title1 = document.querySelector('#title1');
    const title2 = document.querySelector('#title2');
    const title3 = document.querySelector('#title3');

    if (!title1.checked && !title2.checked) {
        title3.setAttribute("required", "required");
    }

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
  
    title3.addEventListener("input", () => {
      if (title3.value.trim() !== "") {
        title1.checked = false;
        title2.checked = false;
        title3.classList.add("blue-border");
      } else {
        title3.classList.remove("blue-border");
      }
    });
  
    [title1, title2].forEach(cb => {
      cb.addEventListener("change", () => {
        if (cb.checked) {
          title3.value = "";
          title3.removeAttribute("required");
          title3.classList.remove("blue-border");
        } else if (!title1.checked && !title2.checked) {
            title3.setAttribute("required", "required");
        }
      });
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
    
        const title = [];
        if (title1.checked) title.push(title1.value);
        if (title2.checked) title.push(title2.value);
        if (title3.value.trim() !== "") title.push("customTitle");

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
            document.querySelector(".placeholder").textContent = "";
            document.querySelector(".placeholder").appendChild(a);
            document.querySelector(".linkDiv button").removeAttribute("disabled")

            form.style.display = "none";
            output.style.display = "block"
            questionIndex = 4
        } catch (err) {
            console.error(err);
            // TODO ALERT THE USER IN THE FORM
            alert("Er is een fout opgetreden: " + err.message);
        }    
    });
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

// <!-- <svg xmlns="http://www.w3.org/2000/svg" width="28.567" height="28.577" viewBox="0 0 28.567 28.577">
// <g id="Group_3" data-name="Group 3" transform="translate(-9906.433 -297)">
// <path id="Icon_metro-arrow-up-right" data-name="Icon metro-arrow-up-right" d="M9.718,28.356,25.707,12.367V19.28a1.928,1.928,0,0,0,3.856,0V7.712a1.925,1.925,0,0,0-1.928-1.927H16.067a1.928,1.928,0,1,0,0,3.856H22.98L6.992,25.629a1.928,1.928,0,0,0,2.727,2.727Z" transform="translate(9905.437 291.216)"/>
// <path id="Path_18" data-name="Path 18" d="M9875.164,294h-9.231v23.37h23.38v-9.259" transform="translate(42 6.707)" fill="none" stroke="#000" stroke-width="3"/>
// </g>
// </svg> -->


const backBtn = document.querySelector("#controls button:nth-of-type(1)");
const nextBtn = document.querySelector("#controls button:nth-of-type(2)");
const output = document.querySelector("#output");

let questionIndex = 1

function showCurrentQuestion(){
  form.style.display = "block";
  
  if(!document.querySelector(`#question${questionIndex}`)){
    questionIndex >= 3 ? questionIndex = 3 : questionIndex = 1;
    return
  }

  output.style.display = "none"
  const divs = document.querySelectorAll("form > div");
  divs.forEach((div)=>{
    div.style.display = "none";
  })

  questionIndex === 3 ? (nextBtn.style.opacity = "0", nextBtn.disabled = true) : (nextBtn.style.opacity = "1", nextBtn.disabled = false)
  questionIndex === 1 ? (backBtn.style.opacity = "0", backBtn.disabled = true) : (backBtn.style.opacity = "1", backBtn.disabled = false)

  document.querySelector(`#question${questionIndex}`).style.display = "flex";
}

nextBtn.addEventListener("click", () => {
  questionIndex++
  showCurrentQuestion()
})

backBtn.addEventListener("click", () => {
  questionIndex--
  showCurrentQuestion()
})

showCurrentQuestion()