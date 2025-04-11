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
            const html =  getWebsiteElementsInDom(response.rawHtml);

            const date = getWebsiteDate(html);   
            displayData(wrapper, "#date", date);
            
            const monthsDifference = getMonthDifference(date);
            console.log(`Deze website is ${monthsDifference} maanden uit.`);
            
            const kvkStatus = getWebsiteKvk(html);   
            displayData(wrapper, "#KVK", kvkStatus);
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

function displayData(wrapper, id, info) {
    const infoDiv = wrapper.querySelector(`${id}`);
    const newDiv = document.createElement("div");
    newDiv.textContent = info;
    infoDiv.appendChild(newDiv);
    infoDiv.style.display = "block";
}

function getWebsiteElementsInDom(html) {
    const parser = new DOMParser();
    html = html.replace(/<!DOCTYPE[^>]*>/i, ''); // Verwijdert de DOCTYPE
    html = html.replace(/<html[^>]*>[\s\S]*?<body[^>]*>/i, '<body>'); // Verwijdert alles tot aan de eerste <body> tag
    html = html.replace(/<\/body>[\s\S]*<\/html>/i, '</body>'); // Verwijdert alles van de laatste </body> tot de laatste </html>
    html = html.replace(/<script[^>]*id="app-script"[^>]*>[\s\S]*?<\/script>/gi, '');
    const doc = parser.parseFromString(html, "text/html");
    return doc;
}

function getWebsiteDate(doc) {
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

function getWebsiteKvk(doc) {
    const allDivs = doc.querySelectorAll("a");
    for (const div of allDivs) {
        if (div.textContent.trim().includes("Kamer van Koophandel:")) {
            const parentEle1 = div.parentElement;
            const parentEle = parentEle1.parentElement;
            const innerDiv = parentEle.querySelector("div:nth-child(2).flex.gap-2.w-full div:nth-child(2) p");
            if (innerDiv && innerDiv.classList.length === 0) {
                const kvkStatus = innerDiv.textContent.trim();
                return "Kamer van Koophandel: " + kvkStatus;
            }
        }
    }

    return "Kamer van Koophandel: onbekend";
}


function getMonthDifference(dateString) {
    // Maanden vertalen van Nederlandse maand naar numerieke waarde
    const monthMap = {
        'januari': 0,
        'februari': 1,
        'maart': 2,
        'april': 3,
        'mei': 4,
        'juni': 5,
        'juli': 6,
        'augustus': 7,
        'september': 8,
        'oktober': 9,
        'november': 10,
        'december': 11
    };

    // Extract de dag, maand en jaar uit de tekst (bijv. "6 oktober 2021")
    const regex = /(\d+)\s([a-zA-Z]+)\s(\d{4})/;
    const match = dateString.match(regex);
    
    if (match) {
        const day = parseInt(match[1]);
        const month = monthMap[match[2].toLowerCase()];
        const year = parseInt(match[3]);

        // Maak een Date object van de opgegeven datum
        const inputDate = new Date(year, month, day);

        // Haal de huidige datum op
        const currentDate = new Date();

        // Bereken het verschil in maanden
        const monthDifference = (currentDate.getFullYear() - inputDate.getFullYear()) * 12 + currentDate.getMonth() - inputDate.getMonth();

        // Return het resultaat
        return monthDifference;
    }

    return null; // Als de datum niet goed is geparsed
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