const hostname = window.location.hostname;
const domain = getRootDomain(hostname);

async function injectUI() {    
    // Popup HTML
    const html = await fetch(chrome.runtime.getURL("content_scripts/ui.html")).then(r => r.text());
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);
    wrapper.querySelector("#domain span").textContent = domain;
    
    // Popup CSS
    const css = await fetch(chrome.runtime.getURL("content_scripts/style.css")).then(r => r.text());
    const styleEl = document.createElement("style");
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
    
    // Open settings page
    const homeButton = wrapper.querySelector("#openHomeBtn");
    homeButton.addEventListener("click", () => {
        const url = chrome.runtime.getURL("homePage/index.html");
        window.open(url, "_blank");
    });

    // Check safety of the domain
    const checkButton = wrapper.querySelector("#check");
    checkButton.addEventListener("click", () => {
        // TODO als de domein naam hetzelfde is als wat er al eerder is gefetched dan gewoon de data ophalen
        checkSafetyDomain("checkVeiliginternetten", wrapper);
        checkSafetyDomain("politieControleerHandelspartij", wrapper);
    });

    // Check all links, form actions and inputs of the webpage
    // const dangerousContent = checkWebContents();
    // if(dangerousContent){
    //     console.log("Pas op! Er zijn verdachte elementen op deze pagina gevonden.");
    //     // TODO markeer de elementen die verdacht zijn
    // }
}

function getRootDomain(hostname) {
    const parts = hostname.split('.');
    if (parts.length <= 2 || /^[0-9.]+$/.test(hostname) || hostname === 'localhost') {
      return hostname;
    }
    // Return the last two parts of the domain
    return parts.slice(-2).join('.');
}

function checkSafetyDomain(source, wrapper) {
    const safetySpan = wrapper.querySelector("#safety ul");
    const resultDiv = document.createElement("li");

    chrome.runtime.sendMessage({ type: source, url: domain }, (response) => {
        wrapper.querySelector("#safety").style.display = "list-item";

        if(source === "checkVeiliginternetten") {
            const dateSpan = wrapper.querySelector("#date");

            const date = getWebsiteDate(response.rawHtml);   
            const dateDiv = document.createElement("div");
            dateDiv.textContent = date;
            console.log(dateSpan);

            dateSpan.appendChild(dateDiv);
            dateSpan.style.display = "block";
        }

        // Add the result to the popup
        const resultSpan = document.createElement("span");
        resultSpan.textContent = response.result + " | Bron: ";

        // Add the source link
        const anchorSource = document.createElement("a");
        anchorSource.href = response.source;
        
        anchorSource.target = "_blank";
        anchorSource.textContent = getRootDomain(source);
        anchorSource.style.display = "block";

        // Add the result to the list
        resultDiv.appendChild(resultSpan);
        resultDiv.appendChild(anchorSource);
        
        safetySpan.appendChild(resultDiv);

        // Save the result to chrome.storage.local
        chrome.storage.local.set({ [source]: response }, () => {
            console.log(`Saved ${source} result to storage.`);
        });
    });
}

function getWebsiteDate(html) {
    const parser = new DOMParser();
    html = html.replace(/<!DOCTYPE[^>]*>/i, ''); // Verwijdert de DOCTYPE
    html = html.replace(/<html[^>]*>[\s\S]*?<body[^>]*>/i, '<body>'); // Verwijdert alles tot aan de eerste <body> tag
    html = html.replace(/<\/body>[\s\S]*<\/html>/i, '</body>'); // Verwijdert alles van de laatste </body> tot de laatste </html>
    html = html.replace(/<script[^>]*id="app-script"[^>]*>[\s\S]*?<\/script>/gi, '');
    const doc = parser.parseFromString(html, "text/html");
    const allDivs = doc.querySelectorAll("div");
    for (const div of allDivs) {
        if (div.textContent.trim().includes("Website bestaat sinds:")) {
            const parentEle = div.parentElement;
            const innerDiv = parentEle.querySelector("div:nth-child(2).flex.gap-2.w-full div");
            if (innerDiv && innerDiv.classList.length === 0) {
                const date = innerDiv.textContent.trim();
                return "Website bestaat sinds: " + date;
            }
        }
    }

    return "Website bestaat sinds: onbekend";
}



function checkWebContents() {
    const forms = document.body.querySelectorAll("form");
    // console.log("Found forms:", forms);
    forms.forEach((form) => {
        const formData = new FormData(form);
        const formObj = {};
        formData.forEach((value, key) => {
            formObj[key] = value;
        });
        // console.log("Form data:", formObj);

        // Submits
        const submitBtn = form.querySelector("button[type='submit']");
        const submitInput = form.querySelector("input[type='submit']");
        // console.log("submit:", submitBtn, submitInput);
    });

    const inputs = document.body.querySelectorAll("input");
    inputs.forEach((input) => {
        // console.log("Input name:", input.name);
        // console.log("Input value:", input.value);
    });

    const anchors = document.body.querySelectorAll("a");
    anchors.forEach((anchor) => {
        // console.log("Anchor href:", anchor.href);
        // console.log("Anchor text:", anchor.textContent);
    });
}


window.onload = injectUI;