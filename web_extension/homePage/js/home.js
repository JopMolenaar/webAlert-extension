const showHistory = document.querySelector("#watchHistory")
const backBtn = document.querySelector("header nav button")
const history = document.querySelector(".history")
const settings = document.querySelector(".settings")

// Get the history and place it on the page
function injectUI() {
    const params = new URLSearchParams(window.location.search);
    let domainParam = params.get("domain");
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
    });

    expResultContainer.appendChild(extraInfoDiv);
}

// Close the page and go back to the previous page
backBtn.addEventListener("click", (e) => {
    window.close();
})

// Show the history and hide the settings or the other way around
showHistory.addEventListener("click", (e) => {
    history.classList.toggle("v-h");
    showHistory.textContent = history.classList.contains("v-h") ? "Bekijk uw eerder bezochte websites" : "Bekijk uw instellingen";
    settings.classList.toggle("v-h");
});

window.onload = injectUI;
