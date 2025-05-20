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
    const extraInfoDiv = document.createElement("div");

    chrome.runtime.sendMessage({ type: "cleanUpResults", data: data}, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Runtime error:", chrome.runtime.lastError.message);
            return;
        }
        extraInfoDiv.innerHTML = response.html
        
        // change the text of the button
        const changeAdviceBtn = document.querySelector("#changeAdviceBtn span");
        data.status === "success" ? changeAdviceBtn.classList.remove("success") : changeAdviceBtn.classList.add("success");
        data.status === "warning" ? changeAdviceBtn.classList.remove("warning") : changeAdviceBtn.classList.add("warning");
        changeAdviceBtn.textContent = changeAdviceBtn.classList.contains("warning") ? "Waarschuwing" : "Succes";
    });

    // Add line if advice is changed
    if(data.changedStatus && data.originalStatus !== data.status) {
        const p = document.createElement("p")
        p.textContent = `U heeft het advies veranderd`
        document.querySelector(".explDomain div:nth-of-type(2)").appendChild(p)
    }

    expResultContainer.appendChild(extraInfoDiv);
}

// Close the page and go back to the previous page
backBtn.addEventListener("click", (e) => {
    window.close();
})

const adviceBtn = document.querySelector("#changeAdviceBtn")
adviceBtn.addEventListener("click", () => {
    adviceBtn.querySelector("span").classList.toggle("warning");
    adviceBtn.querySelector("span").classList.toggle("success");
    adviceBtn.querySelector("span").textContent = adviceBtn.querySelector("span").classList.contains("warning") ? "Waarschuwing" : "Succes";
    const status = adviceBtn.querySelector("span").classList.contains("warning") ? "success" : "warning";

    chrome.runtime.sendMessage({ type: "changeStatus", status: status, domain: domainParam}, (response) => {
        if (response && response.success) {
            if(response.result.originalStatus !== response.result.status ){
                const p = document.createElement("p")
                p.textContent = `U heeft het advies veranderd`
                document.querySelector(".explDomain div:nth-of-type(2)").appendChild(p)
            } else {
                document.querySelector(".explDomain div:nth-of-type(2) p:nth-of-type(2)").remove()
            }

            // TODO CHANGE STATUS IN LOGBOEK
        } else {
            console.error("❌ Failed to change status.");
        }
    });
});

// Show the history and hide the settings or the other way around
showHistory.addEventListener("click", (e) => {
    history.classList.toggle("v-h");
    showHistory.textContent = history.classList.contains("v-h") ? "Bekijk uw eerder bezochte websites" : "Bekijk uw instellingen";
    settings.classList.toggle("v-h");
});

window.onload = injectUI;
