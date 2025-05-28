const showHistory = document.querySelector("#watchHistory")
const backBtn = document.querySelector("header nav button")
const history = document.querySelector(".history")
const settings = document.querySelector(".settings")

const params = new URLSearchParams(window.location.search);
let domainParam = params.get("domain");

// Get the history and place it on the page
function injectUI() {
    const domainInput = document.querySelector("#domain");
    domainParam ? domainInput.style.display = "block" : domainInput.style.display = "none";
    domainParam ? domainInput.querySelector("strong").textContent = domainParam : "Geen domein gevonden";

    chrome.runtime.sendMessage({ type: "getStoredData" }, (response) => {
        const resultsContainer = document.querySelector("#results");
    
        const sortedItems = Object.entries(response.data).sort(([, a], [, b]) => {
            const parseDate = (dateStr) => new Date(dateStr);
            return parseDate(b.logDate) - parseDate(a.logDate);
        });
        
        for (const [domain, response] of sortedItems) {
            if(response.politie && response.veiligInternetten){
                const resultAndSourcesDiv = document.createElement("details");
                const summary = document.createElement("summary");
                summary.textContent = `${domain}`;
                resultAndSourcesDiv.appendChild(summary);
                const resultDiv = document.createElement("div");

                const status = response.status === 'unknown' ? 'default' : response.status;
                resultAndSourcesDiv.classList.add(status);

                domainParam === domain ? addExtraInfo(response) : null; 
                
                chrome.runtime.sendMessage({ type: "cleanUpResults", data: response}, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("Runtime error:", chrome.runtime.lastError.message);
                        return;
                    }
                    resultDiv.innerHTML = response.html
                });

                resultAndSourcesDiv.appendChild(resultDiv);  
                resultsContainer.appendChild(resultAndSourcesDiv);  
            }
        }
    });

    history.classList.add("v-h");
}

// Function to add extra information about the current website
function addExtraInfo(data) {
    const expResultContainer = document.querySelector("#expResult");
    // const extraInfoDiv = document.createElement("div");

    chrome.runtime.sendMessage({ type: "cleanUpResults", data: data}, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Runtime error:", chrome.runtime.lastError.message);
            return;
        }
        expResultContainer.innerHTML = response.html
        
        if(data.status === "success" || data.status === "warning"){
            // change the text of the button
            const warningTextContent = 'Wel zeker? Zet dit advies op <span class="success">Veilig</span> voor extra zekerheid';
            const changeAdviceBtn = document.querySelector("#changeAdviceBtn");
            data.status === "warning" ? changeAdviceBtn.innerHTML = warningTextContent : null;
        }

        const colorStatus = data.status === "success" 
            ? "var(--color-success" 
            : data.status === "warning" 
            ? "var(--color-warning" 
            : "var(--color-danger";
        document.documentElement.style.setProperty('--color-status', `${colorStatus})`);
        document.documentElement.style.setProperty('--color-status-text', `${colorStatus}-text)`);
    });

    if(data.status === "danger"){
        document.querySelector(".explDomain div:nth-of-type(2)").innerHTML = `<p>U kunt dit advies niet aanpassen, wij verzoeken u naar het advies te luisteren en de website te verlaten.</p>`;
        
    }

    // Add line if advice is changed
    if(data.changedStatus && data.originalStatus !== data.status) {
        changeTextChangeStatus(data.status)
    }

    // expResultContainer.appendChild(extraInfoDiv);
}

// Close the page and go back to the previous page
backBtn.addEventListener("click", (e) => {
    window.close();
})

const adviceBtn = document.querySelector("#changeAdviceBtn")
adviceBtn.addEventListener("click", () => {

    const succesTextContent = 'Niet zeker? Zet dit advies op <span class="warning">Waarschuwing</span> voor de zekerheid';
    const warningTextContent = 'Wel zeker? Zet dit advies op <span class="success">Veilig</span> voor extra zekerheid';
    const span = adviceBtn.querySelector("span")    
    span.classList.contains("warning") ? adviceBtn.innerHTML = warningTextContent :  adviceBtn.innerHTML = succesTextContent;
    const status = span.classList.contains("warning") ? "warning" : "success";
    

    chrome.runtime.sendMessage({ type: "changeStatus", status: status, domain: domainParam}, (response) => {
        if (response && response.success) {
            if (response.result.originalStatus !== response.result.status) {
                changeTextChangeStatus(response.result.status);
            } else {
                if(document.querySelector(".explDomain div:nth-of-type(2) p:nth-of-type(2)")){
                    document.querySelector(".explDomain div:nth-of-type(2) p:nth-of-type(2)").remove();
                }
            }
            document.documentElement.style.setProperty('--color-status', response.result.status === "success" ? "var(--color-success)" : "var(--color-warning)");
            document.documentElement.style.setProperty('--color-status-text', response.result.status === "success" ? "var(--color-success-text)" : "var(--color-warning-text)");

            // TODO CHANGE STATUS IN LOGBOEK
        } else {
            console.error("❌ Failed to change status.");
        }
    });
});

function changeTextChangeStatus(status) {
    const p = document.createElement("p")
    const prev = status === "success" ? "Waarschuwing" : "Veilig"
    const now = status === "success" ? "Veilig" : "Waarschuwing"

    p.textContent = `U heeft het advies veranderd van "${prev}" naar "${now}"`
    document.querySelector(".explDomain div:nth-of-type(2)").appendChild(p)
}

// Show the history and hide the settings or the other way around
showHistory.addEventListener("click", (e) => {
    history.classList.toggle("v-h");
    showHistory.textContent = history.classList.contains("v-h") ? "Bekijk uw eerder bezochte websites" : "Stel uw vertrouwens-contact in";
    settings.classList.toggle("v-h");
});

window.onload = injectUI;
