const hostname = window.location.hostname;
const domain = getRootDomain(hostname);

async function injectUI() {    
    // Popup HTML
    const html = await fetch(chrome.runtime.getURL("content_scripts/ui.html")).then(r => r.text());
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    wrapper.setAttribute("id", "webAlertDiv");
    wrapper.classList.add("right");
    document.body.insertBefore(wrapper, document.body.firstChild);

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
        wrapper.querySelector("#moveWebExtensionButtons").textContent = right ? "<" : ">";
        document.body.querySelector("#coloredLine").classList.toggle("right");
        wrapper.classList.toggle("right");
        right = !right;
    });

    const closebtn = wrapper.querySelector("#closeBtn");
    closebtn.addEventListener("click", () => {
        wrapper.querySelector("div").classList.toggle("open");
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
    let responseMessage;
    let status;

    if(data === null) {
        const responseVeiligInternetten = await checkSafetyDomain("checkVeiliginternetten", wrapper);
        const responsePolitie = await checkSafetyDomain("politieControleerHandelspartij", wrapper);

// TODO get text from externe json

        // conclusie if statement structuur
        if(responseVeiligInternetten.monthsDifference < 3 && responseVeiligInternetten.matched && responsePolitie.matched && !responseVeiligInternetten.kvkStatus){
            status = "warning";
            responseMessage = "De website bestaat nog niet zo lang, pas op!";
        } else if(responseVeiligInternetten.matched && responsePolitie.matched){
            status = "success";
            responseMessage = "Betrouwbaar bevonden door beide bronnen";
            // Check de veiliginternetten data
        } else if (responseVeiligInternetten.unknown && responsePolitie.matched) {
            status = "warning";
            responseMessage = "Het is mislukt om een advies te krijgen over deze website bij Veilig Internetten, hij komt echter niet voor als oplichting in de database van de politie. Wees wel voorzichtig met het klikken op linkjes en het invullen van gegevens.";
        } else if (responseVeiligInternetten.unknown && responsePolitie.unknown) {
            status = "warning";
            responseMessage = "Het is mislukt om een advies te krijgen over deze website bij beide bronnen. Wees voorzichtig met het klikken op linkjes en het invullen van gegevens.";
        } else if (responseVeiligInternetten.matched && responsePolitie.unknown) {
            status = "success";
            responseMessage = "Veilig bevonden door Veilig Internetten";
            // Check de veiliginternetten data
        } else if (responseVeiligInternetten.danger || responsePolitie.danger) {
            status = "danger";
            responseMessage = "Mogelijk onbetrouwbaar bevonden door minimaal een van beide bronnen";
            // Check de veiliginternetten data als deze bekend is
        } else {
            if(responseVeiligInternetten.error){
                console.error(responseVeiligInternetten.error);
                responseMessage = "Er is een fout opgetreden bij het ophalen van de gegevens van Veilig Internetten.";
            } else if (responsePolitie.error){
                console.error(responsePolitie.error);
                responseMessage = "Er is een fout opgetreden bij het ophalen van de gegevens van de Politie.";
            } else {
                responseMessage = "Er is een fout opgetreden bij het ophalen van de gegevens.";
            }
            status = "unknown";
        }

        responseVeiligInternetten.rawHtml = "";
        responsePolitie.rawHtml = "";

        // Create a JSON structure for the responses
        const responseData = {
            veiligInternetten: responseVeiligInternetten,
            politie: responsePolitie,
            message: responseMessage,
            status: status,
        };

        // Pass the JSON structure and response message to the feedback function
        fillExtensionFeedback(responseData, wrapper);

        // Save the JSON structure in storage
        chrome.storage.local.set({
            [domain]: responseData
        }, () => {
            console.log(`Saved ${domain} result to storage.`);
        });
    } else {
        console.log("stored:", data);
        // TODO Check if the data is still valid
        // TODO get conclusie van data en geef die en keer door 
        // fillExtensionFeedback(data.politie, "politieControleerHandelspartij", wrapper);
        // fillExtensionFeedback(data.veiligInternetten, "checkVeiliginternetten", wrapper);
        // const responseData = {
        //     message: "from stored data",
        // };
        fillExtensionFeedback(data, wrapper);
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

// updatye this
async function checkSafetyDomain(source, wrapper) {
    const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: source, url: domain }, (response) => {
            if(source === "checkVeiliginternetten") {
                const html =  cleanDom(response.rawHtml);
                console.log(response.unknown);
                if(!response.unknown){
                    const date = getWebsiteDate(html);   
                    const monthsDifference = getMonthDifference(date);
                    const kvkStatus = getWebsiteKvk(html);
                    const contentJson = getWebsiteResults(html);
                    Object.assign(response, contentJson);

                    response.date = date;
                    response.kvkStatus = kvkStatus;
                    response.monthsDifference = monthsDifference;
                }
            }
         
            resolve(response);
        });
    });

    return response;
}

async function fillExtensionFeedback(response, wrapper) {
    console.log("response", response);
    if(response.status === undefined){
        response.status = "unknown";
        response.message = "Er is een fout opgetreden bij het ophalen van de gegevens.";
    }

    const status = response.status === 'unknown' ? 'default' : response.status;
    // const status = "danger"; 
    console.log(response.message);
    status != "success" ? wrapper.querySelector("#statusText").textContent = response.message : null;
    document.body.classList.add(`${status}`);
    status != "default" ? wrapper.querySelector("#visualStatus").innerHTML =  await fetch(chrome.runtime.getURL(`icons/${status}.svg`)).then(r => r.text()) : null;
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
                let kvkStatus;
                innerDiv.textContent.trim() === "Geregistreerd" ? kvkStatus = true : kvkStatus = false;
                return kvkStatus;
            }
        }
    }

    return false;
}



function getWebsiteResults(doc) {
    console.log(doc);
    
    let content = doc.querySelectorAll(".w-check-content");
    if(content === null){
        console.log("No content found, probably on downtime");
        return
    }
    content.forEach((ele) => {
        if (ele.classList.contains("w-check-content") && ele.classList.length === 1) {
            content = ele;
        }
    });
    console.log(content);
    
    const allDivs = content.querySelectorAll("div.flex.flex-col.gap-4");
    const results = {};
    for (const div of allDivs) {
        let topic = div.querySelector("a");
        topic = topic ? topic.textContent.trim().replace(/:$/, "") : "No topic found";

        let result = div.querySelector("div:nth-child(2).flex.gap-2.w-full div:nth-child(2) p");
        result = result ? result.textContent.trim() : "No result found";

        results[topic] = result;
    }
    return results;
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

// todo
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