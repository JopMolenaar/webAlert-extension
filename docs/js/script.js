// document.addEventListener("DOMContentLoaded", function () {
//     const form = document.querySelector("form");

//     // WHO logic
//     const whoCheckbox = document.querySelector('#who1');
//     const whoInput = document.querySelector('#who2');

//     whoInput.addEventListener("input", () => {
//         if (whoInput.value.trim() !== "") {
//             whoCheckbox.checked = false;
//         }
//     });

//     whoCheckbox.addEventListener("change", () => {
//         if (whoCheckbox.checked) {
//             whoInput.value = "";
//         }
//     });

//     // TITLE logic
//     const title1 = document.querySelector('#title1');
//     const title2 = document.querySelector('#title2');
//     const title3 = document.querySelector('#title3');

//     title3.addEventListener("input", () => {
//         if (title3.value.trim() !== "") {
//             title1.checked = false;
//             title2.checked = false;
//         }
//     });

//     [title1, title2].forEach(checkbox => {
//         checkbox.addEventListener("change", () => {
//             if (checkbox.checked) {
//                 title3.value = "";
//             }
//         });
//     });

//     // Submit behavior
//     form.addEventListener("submit", function (e) {
//         e.preventDefault();

//         const result = {};

//         const device = document.querySelector('input[name="device"]:checked');
//         result.device = device ? device.nextSibling.textContent.trim() : null;

//         const app = document.querySelector('input[name="app"]:checked');
//         result.app = app ? app.nextSibling.textContent.trim() : null;

//         result.who = [];
//         if (whoCheckbox.checked) {
//             result.who.push(whoCheckbox.value);
//         }
//         if (whoInput.value.trim() !== "") {
//             result.who.push(whoInput.value.trim());
//         }

//         result.title = [];
//         if (title1.checked) {
//             result.title.push(title1.value);
//         }
//         if (title2.checked) {
//             result.title.push(title2.value);
//         }
//         if (title3.value.trim() !== "") {
//             result.title.push(title3.value.trim());
//         }

//         console.log(JSON.stringify(result, null, 2));
//         const generatedLink = getLink(result.device, result.app, result.who[0], result.title[0]);
//         console.log(generatedLink);

//     });
// });

// function getLink(device, app, who, title) {
//     console.log(device, app, who, title);
    
//     // Determine platform
//     const platform = (device === "Iphone") ? "ios" : "android";
  
//     // Who type
//     const whoType = who.includes("Bepaal ik op het moment zelf") ? "decideMyself" : "customContact";
  
//     // Title type
//     let titleType = null;
//     if (title.includes("Help! Is dit veilig of niet?")) {
//       titleType = "Help";
//     } else if (title.includes("Bepaald ik op het moment zelf")) {
//       titleType = "decideMyself";
//     } else if (title.length > 0) {
//       titleType = "customTitle";
//     }
  
//     // Try getting the link
//     try {
//       const link = linkMap[platform][app][whoType][titleType];
//       return link || "No matching link found.";
//     } catch (err) {
//       return "No matching link found.";
//     }
//   }
  





document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form");
  
    const whoCheckbox = document.querySelector('#who1');
    const whoInput = document.querySelector('#who2');
  
    const title1 = document.querySelector('#title1');
    const title2 = document.querySelector('#title2');
    const title3 = document.querySelector('#title3');
  
    whoInput.addEventListener("input", () => {
      if (whoInput.value.trim() !== "") {
        whoCheckbox.checked = false;
      }
    });
  
    whoCheckbox.addEventListener("change", () => {
      if (whoCheckbox.checked) {
        whoInput.value = "";
      }
    });
  
    title3.addEventListener("input", () => {
      if (title3.value.trim() !== "") {
        title1.checked = false;
        title2.checked = false;
      }
    });
  
    [title1, title2].forEach(cb => {
      cb.addEventListener("change", () => {
        if (cb.checked) {
          title3.value = "";
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
  
      const res = await fetch('shortcuts.json');
      const linkMap = await res.json();
      const link = getLink(linkMap, device, app, who, title);
      console.log("Generated Link:", link);
    });
  });
  
  // Function to determine the final link
  function getLink(linkMap, device, app, who, title) {
    console.log(device, app, who, title);
    
    if (!device || !app) return "Geen apparaat of app geselecteerd.";
  
    let platform = "windows";
    if (device === "iphone") platform = "ios";
    else if (["samsung", "huawei", "oppo", "onePlus"].includes(device)) platform = "android";
  
    const whoType = who.includes("decideMyself") ? "decideMyself" : "customContact";
  
    let titleType = "customTitle";
    if (title.includes("help")) titleType = "help";
    else if (title.includes("decideMyself")) titleType = "decideMyself";
    console.log(linkMap[platform][app][whoType][titleType]);
  
    try {
      return linkMap[platform][app][whoType][titleType] || "Geen geldige link gevonden.";
    } catch {
      return "Geen geldige link gevonden.";
    }
  }