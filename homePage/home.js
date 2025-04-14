function injectUI() {
    const params = new URLSearchParams(window.location.search);
    let domainParam = params.get("domain");
    const domainInput = document.querySelector("#domain");
    domainParam ? domainInput.style.display = "block" : domainInput.style.display = "none";
    domainParam ? domainInput.querySelector("strong").textContent = domainParam : "Geen domein gevonden";

    chrome.runtime.sendMessage({ type: "getStoredData" }, (response) => {
        const resultsContainer = document.querySelector("#results");
        const expResultContainer = document.querySelector("#expResult");
        const items = response.data;
    
        for (const [domain, response] of Object.entries(items)) {
            if(response.politie && response.veiligInternetten){
                const resultAndSourcesDiv = document.createElement("div");
                resultAndSourcesDiv.innerHTML = `<p><strong>${domain}</strong>:</p>`;
                for (const [key, object] of Object.entries(response)) {
                        const resultDiv = document.createElement("div");
                        resultDiv.innerHTML = `
                            <p>Result: ${object.result}</p>
                            <a href="${object.source}" target="_blank">Source: ${object.source}</a>
                            `;
                        resultAndSourcesDiv.appendChild(resultDiv);  
                        resultsContainer.appendChild(resultAndSourcesDiv);  
                        // add extra info if the domain matches and key is "veiligInternetten"
                        domainParam === domain && key === "veiligInternetten" ? addExtraInfo(object) : null; 
                    }
            }
        }
    });
}

function addExtraInfo(data) {
    const expResultContainer = document.querySelector("#expResult");
    const extraInfoDiv = document.createElement("div");
    extraInfoDiv.innerHTML = `
        <p>Result: ${data.result}</p>
        <a href="${data.source}" target="_blank">Source: ${data.source}</a>
    `;

    for (const [key, object] of Object.entries(data.htmlSources)) {
        extraInfoDiv.innerHTML += `<p>${key}: ${object}</p>`       
    }
    expResultContainer.appendChild(extraInfoDiv);
}

window.onload = injectUI;
