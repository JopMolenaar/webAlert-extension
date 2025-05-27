const hostname = window.location.hostname;
const domain = getRootDomain(hostname);

async function injectUI() {
    // Popup HTML
    const html = await fetch(browser.runtime.getURL("content_scripts/ui.html")).then(r => r.text());
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    wrapper.setAttribute("id", "webAlertDiv");
    wrapper.classList.add("right");

    wrapper.querySelector("#visualStatus").innerHTML = await fetch(browser.runtime.getURL(`icons/loading.svg`)).then(r => r.text());
    wrapper.querySelector("#visualStatus").classList.add("loading");

    document.body.insertBefore(wrapper, document.body.firstChild);

    // add colored line for feedback
    const coloredLine = document.createElement("div");
    coloredLine.setAttribute("id", "coloredLine");
    coloredLine.classList.add("right");
    document.body.insertBefore(coloredLine, document.body.firstChild);

    // Popup CSS
    const css = await fetch(browser.runtime.getURL("content_scripts/style.css")).then(r => r.text());
    const styleEl = document.createElement("style");
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    // Open settings page
    const homeButton = wrapper.querySelector("#openHomeBtn");
    homeButton.addEventListener("click", () => {
        const url = browser.runtime.getURL("homePage/index.html?domain=" + encodeURIComponent(domain));
        window.open(url, "_blank");
    });

    getAndStoreSafetyDomain(wrapper);

    const moveBtn = document.body.querySelector("#moveWebExtensionButtons");
    let right = false;
    if (moveBtn) {
        moveBtn.addEventListener("click", () => {
            wrapper.querySelector("#moveWebExtensionButtons").textContent = right ? "<" : ">";
            document.body.querySelector("#coloredLine").classList.toggle("right");
            wrapper.classList.toggle("right");
            right = !right;
        });
    }

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

const rules = [
    {
        condition: r => r.v.monthsDifference < 3 && r.v.matched && r.p.matched && !r.v.kvkStatus,
        status: "warning",
        message: "De website bestaat nog niet zo lang, pas op!"
    },
    {
        condition: r => r.v.matched && r.p.matched,
        status: "success",
        message: "Betrouwbaar bevonden door beide bronnen."
    },
    {
        condition: r => r.v.unknown && r.p.matched,
        status: "warning",
        message: "Het is mislukt om een advies te krijgen over deze website bij Veilig Internetten, hij komt echter niet voor als oplichting in de database van de politie. Wees wel voorzichtig met het klikken op linkjes en het invullen van gegevens."
    },
    {
        condition: r => r.v.unknown && r.p.unknown,
        status: "warning",
        message: "Het is mislukt om een advies te krijgen over deze website bij beide bronnen. Wees voorzichtig met het klikken op linkjes en het invullen van gegevens."
    },
    {
        condition: r => r.v.matched && r.p.unknown,
        status: "success",
        message: "Veilig bevonden door Veilig Internetten"
    },
    {
        condition: r => r.v.danger || r.p.danger,
        status: "danger",
        message: "Mogelijk onbetrouwbaar bevonden door minimaal een van beide bronnen"
    },
    {
        condition: r => true, // Default fallback
        status: "unknown",
        message: "Er is een fout opgetreden bij het ophalen van de gegevens."
    }
];
function determineStatus(responseVeiligInternetten, responsePolitie) {
    const context = {
        v: responseVeiligInternetten,
        p: responsePolitie
    };

    for (const rule of rules) {
        if (rule.condition(context)) {
            console.log(rule.status, rule.message);
            
            return {
                status1: rule.status,
                message1: rule.message
            };
        }
    }
}
async function getAndStoreSafetyDomain(wrapper) {
    let data = await getStoredData(domain);
    let status;
    let responseMessage;

    if (data === null) {
        const responseVeiligInternetten = await checkSafetyDomain("checkVeiliginternetten", wrapper);
        const responsePolitie = await checkSafetyDomain("politieControleerHandelspartij", wrapper);

        if (responseVeiligInternetten.error || responsePolitie.error) {
            responseMessage = responseVeiligInternetten.error ? 
                "Er is een fout opgetreden bij het ophalen van de gegevens van Veilig Internetten." : 
                "Er is een fout opgetreden bij het ophalen van de gegevens van de Politie.";
            status = "unknown";
        } else {
            let { status1, message1 } = determineStatus(responseVeiligInternetten, responsePolitie);
            status = status1;
            responseMessage = message1;
        }

        responseVeiligInternetten.rawHtml = "";
        responsePolitie.rawHtml = "";
        const formattedDate = getCurrentDate();

        data = {
            veiligInternetten: responseVeiligInternetten,
            politie: responsePolitie,
            message: responseMessage,
            status: status,
            logDate: formattedDate
        };

        // Pass the JSON structure and response message to the feedback function
        fillExtensionFeedback(data, wrapper);

        // Save the JSON structure in storage
        await browser.storage.local.set({ [domain]: data });
        console.log(`Saved ${domain} result to storage.`);
    } else {
        data.logDate = getCurrentDate();

        // Update the feedback UI with the stored data
        fillExtensionFeedback(data, wrapper);

        // Re-save the data with the updated logDate
        await browser.storage.local.set({ [domain]: data });
        console.log(`Re-saved ${domain} result with updated logDate.`);
    }

    // Help button listener
    const helpBtn = document.body.querySelector("#getHelp");
    if (helpBtn) {
        helpBtn.addEventListener("click", async () => {
            const response = await browser.runtime.sendMessage({
                type: "sendSafetyCheckResultsToMail",
                domain: domain,
                safetyCheckResult: data
            });
            console.log(response);
        });
    }
}

function getCurrentDate() {
    const currentDate = new Date();
    return new Date(currentDate.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, 19);
}

async function getStoredData(domain) {
    try {
        const result = await browser.storage.local.get(domain);
        return result[domain] ?? null;
    } catch (e) {
        console.error(e);
        return null;
    }
}

function getRootDomain(hostname) {
    const parts = hostname.split('.');
    if (parts.length <= 2 || /^[0-9.]+$/.test(hostname) || hostname === 'localhost') {
        return hostname;
    }
    // Return the last two parts of the domain
    return parts.slice(-2).join('.');
}

// update this
async function checkSafetyDomain(source, wrapper) {
    const response = await browser.runtime.sendMessage({ type: source, url: domain });

    if (source === "checkVeiliginternetten") {
        console.log(response);
        
        const html = cleanDom(response.rawHtml);
        if (!response.unknown) {
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

    return response;
}

async function fillExtensionFeedback(response, wrapper) {
    if (response.status === undefined) {
        response.status = "unknown";
        response.message = "Er is een fout opgetreden bij het ophalen van de gegevens.";
    }

    const status = response.status === 'unknown' ? 'default' : response.status;
    if (status !== "success") wrapper.querySelector("#statusText").textContent = response.message;
    document.body.classList.add(`${status}`);

    if (status !== "default") {
        wrapper.querySelector("#visualStatus").innerHTML = await fetch(browser.runtime.getURL(`icons/${status}.svg`)).then(r => r.text());
    }

    wrapper.querySelector("#visualStatus").classList.remove("loading");
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
        topic = topic ? topic.textContent.trim().replace(/\s+/g, "").replace(/:$/, "") : "No topic found";

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