const hostname = window.location.hostname;
const domain = getRootDomain(hostname);

const green = "#0FA52C";

async function injectUI() {    
    // Popup HTML
    const html = await fetch(chrome.runtime.getURL("content_scripts/ui.html")).then(r => r.text());
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    wrapper.setAttribute("id", "webAlertDiv");
    wrapper.classList.add("right");
    document.body.insertBefore(wrapper, document.body.firstChild);
    // wrapper.querySelector("#domain span").textContent = domain;

    // add colored line for feedback
    const coloredLine = document.createElement("div");
    coloredLine.setAttribute("id", "coloredLine");
    coloredLine.classList.add("right");
    document.body.insertBefore(coloredLine, document.body.firstChild);
    
    // Popup CSS
    const css = await fetch(chrome.runtime.getURL("content_scripts/style.css")).then(r => r.text());
    const styleEl = document.createElement("style");
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
    
    // Open settings page
    const homeButton = wrapper.querySelector("#openHomeBtn");
    homeButton.addEventListener("click", () => {
        const url = chrome.runtime.getURL("homePage/index.html?domain=" + encodeURIComponent(domain));
        window.open(url, "_blank");
    });

    getAndStoreSafetyDomain(wrapper);
   
    const moveBtn = document.body.querySelector("#moveWebExtensionButtons");
    let right = false;
    moveBtn.addEventListener("click", () => {        
        wrapper.querySelector("#moveWebExtensionButtons span").textContent = right ? "<" : ">";
        document.body.querySelector("#coloredLine").classList.toggle("right");
        document.body.querySelector("#visualStatus").classList.toggle("right");
        wrapper.querySelector("#visualStatus").classList.toggle("right");
        wrapper.classList.toggle("right");
        right = !right;
    });

    // Check all links, form actions and inputs of the webpage
    // const dangerousContent = checkWebContents();
    // if(dangerousContent){
    //     console.log("Pas op! Er zijn verdachte elementen op deze pagina gevonden.");
    //     // TODO markeer de elementen die verdacht zijn
    // }
}

async function getAndStoreSafetyDomain(wrapper) {
    const data = await getStoredData(domain);
        
    if(data === null) {
        const responseVeiligInternetten = await checkSafetyDomain("checkVeiliginternetten", wrapper);
        const responsePolitie = await checkSafetyDomain("politieControleerHandelspartij", wrapper);

        // Save the responses in storage
        chrome.storage.local.set({
            [domain]: {
                veiligInternetten: {
                    result: responseVeiligInternetten.result,
                    matched: responseVeiligInternetten.matched,
                    unknown: responseVeiligInternetten.unknown,
                    source: responseVeiligInternetten.source,
                    date: responseVeiligInternetten.date,
                    kvkStatus: responseVeiligInternetten.kvkStatus,
                    monthsDifference: responseVeiligInternetten.monthsDifference  
                },
                politie: {
                    result: responsePolitie.result,
                    matched: responsePolitie.matched,
                    unknown: responsePolitie.unknown,
                    source: responsePolitie.source
                }
            }
        }, () => {
            console.log(`Saved ${domain} result to storage.`);
        });
    } else {
        console.log("stored:", data);
        fillExtensionFeedback(data.politie, "politieControleerHandelspartij", wrapper);
        fillExtensionFeedback(data.veiligInternetten, "checkVeiliginternetten", wrapper);
    }   
}

async function getStoredData(domain) {
    return new Promise((resolve) => {
        chrome.storage.local.get([domain], (result) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                resolve(null);
            } else {
                resolve(result[domain] ?? null); // return value OR null if undefined
            }
        });
    });
}

function getRootDomain(hostname) {
    const parts = hostname.split('.');
    if (parts.length <= 2 || /^[0-9.]+$/.test(hostname) || hostname === 'localhost') {
      return hostname;
    }
    // Return the last two parts of the domain
    return parts.slice(-2).join('.');
}

async function checkSafetyDomain(source, wrapper) {
    const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: source, url: domain }, (response) => {
            if(source === "checkVeiliginternetten") {
                const html =  cleanDom(response.rawHtml);
                const date = getWebsiteDate(html);   
                const monthsDifference = getMonthDifference(date);
                const kvkStatus = getWebsiteKvk(html);

                response.date = date;
                response.kvkStatus = kvkStatus;
                response.monthsDifference = monthsDifference;
            }
            fillExtensionFeedback(response, source, wrapper);
            resolve(response);
        });
    });

    return response;
}

async function fillExtensionFeedback(response, source, wrapper) {
    // const safetySpan = wrapper.querySelector("#safety ul");
    // const resultDiv = document.createElement("li");

    // Add the result to the popup
    const resultSpan = document.createElement("span");
    resultSpan.textContent = response.result + " | Bron: ";

    const statusColor = response.matched ? green : (response.unknown ? "yellow" : "red");
    document.body.querySelector("#coloredLine").style.backgroundColor = statusColor;
    wrapper.style.background = statusColor;
 
    // wrapper.querySelector("#visualStatus").src =
    // wrapper.querySelector("#visualStatus").src = chrome.runtime.getURL(`icons/${statusColor}.svg`);
    const visualColor = response.matched ? "green" : (response.unknown ? "yellow" : "red");
    wrapper.querySelector("#visualStatus").innerHTML =  await fetch(chrome.runtime.getURL(`icons/${visualColor}.svg`)).then(r => r.text());
    wrapper.querySelector("#visualStatus").classList.add("right");

    // // Add the source link
    // const anchorSource = document.createElement("a");
    // anchorSource.href = response.source;

    // anchorSource.target = "_blank";
    // anchorSource.textContent = getRootDomain(source);
    // anchorSource.style.display = "block";

    // // Add the result to the list
    // resultDiv.appendChild(resultSpan);
    // resultDiv.appendChild(anchorSource);
    // safetySpan.appendChild(resultDiv);
    // wrapper.querySelector("#safety").style.display = "list-item";

    // if(source === "checkVeiliginternetten") {
    //     displayData(wrapper, "#date", response.date);
    //     displayData(wrapper, "#KVK", response.kvkStatus);
    // }
}
function displayData(wrapper, id, info) {
    const infoDiv = wrapper.querySelector(`${id}`);
    const newDiv = document.createElement("div");
    newDiv.textContent = info;
    infoDiv.appendChild(newDiv);
    infoDiv.style.display = "block";
}

function cleanDom(html) {
    const parser = new DOMParser();
    html = html.replace(/<!DOCTYPE[^>]*>/i, ''); // Verwijdert de DOCTYPE
    html = html.replace(/<html[^>]*>[\s\S]*?<body[^>]*>/i, '<body>'); // Verwijdert alles tot aan de eerste <body> tag
    html = html.replace(/<\/body>[\s\S]*<\/html>/i, '</body>'); // Verwijdert alles van de laatste </body> tot de laatste </html>
    html = html.replace(/<script[^>]*id="app-script"[^>]*>[\s\S]*?<\/script>/gi, '');
    const doc = parser.parseFromString(html, "text/html");
    return doc;
}

// functies in 1 functie, alles pakken van de pagina -> in json zetten, kijken wat je wel of niet nodig hebt. 
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

// 
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