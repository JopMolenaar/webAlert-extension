function injectUI() {
    const params = new URLSearchParams(window.location.search);
    let domainParam = params.get("domain");
    const domainInput = document.querySelector("#domain");
    domainParam ? domainInput.style.display = "block" : domainInput.style.display = "none";
    domainParam ? domainInput.querySelector("strong").textContent = domainParam : "Geen domein gevonden";

    chrome.runtime.sendMessage({ type: "getStoredData" }, (response) => {
        const resultsContainer = document.querySelector("#results");
        const items = response.data;
    
        for (const [domain, response] of Object.entries(items)) {
            if(response.politie && response.veiligInternetten){
                const resultAndSourcesDiv = document.createElement("details");
                const summary = document.createElement("summary");
                summary.textContent = `${domain}`;
                resultAndSourcesDiv.appendChild(summary);
                const resultDiv = document.createElement("div");
                for (const [key, object] of Object.entries(response)) {
                        const status = object.matched ? 'success' : (object.unknown ? "warning" : "danger");
                        resultAndSourcesDiv.classList.add(status);

                        if(key === "veiligInternetten"){
                            for (const [key, obj] of Object.entries(object)) {
                                if(key != "matched" && key != "unknown" && key != "monthsDifference"){
                                    resultDiv.innerHTML += `<p>${obj}</p>`;
                                }
                                // TODO zet het mooi neer zodat de gebruiker het mooi kan lezen. 
                            }
                        } else {
                            resultDiv.innerHTML += `
                            <p>Result: ${object.result}</p>
                            <a href="${object.source}" target="_blank">Source: ${object.source}</a>
                            `;
                        }
                       
                        resultAndSourcesDiv.appendChild(resultDiv);  
                        resultsContainer.appendChild(resultAndSourcesDiv);  

                        // add extra info if the domain matches and key is "veiligInternetten"
                        domainParam === domain && key === "veiligInternetten" ? addExtraInfo(object) : null; 
                    }
            }
        }
    });
}

document.querySelector("header nav button").addEventListener("click", (e) => {
    // close this tab
    window.close();
})

function addExtraInfo(data) {
    const expResultContainer = document.querySelector("#expResult");
    const extraInfoDiv = document.createElement("div");

    for (const [key, object] of Object.entries(data)) {
        extraInfoDiv.innerHTML += `<p>${key}: ${object}</p>`;
    }
    expResultContainer.appendChild(extraInfoDiv);
}

window.onload = injectUI;
