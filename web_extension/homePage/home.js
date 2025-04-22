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

                for (const [key, object] of Object.entries(response)) {
                        if(key === "veiligInternetten"){
                            for (const [key, obj] of Object.entries(object)) {
                                if(key != "matched" && key != "unknown" && key != "monthsDifference"){
                                    resultDiv.innerHTML += `<p>${obj}</p>`;
                                }
                                // TODO zet het mooi neer zodat de gebruiker het mooi kan lezen. 
                            }
                        } else {
                            console.log(object);
                            resultDiv.innerHTML += `
                            <p>Result: ${object.result}</p>
                            <a href="${object.source}" target="_blank">Source: ${object.source}</a>
                            `;
                        }
                       
                        resultAndSourcesDiv.appendChild(resultDiv);  
                        resultsContainer.appendChild(resultAndSourcesDiv);  
                    }
            }
        }
    });
}

document.querySelector("header nav button").addEventListener("click", (e) => {
    window.close();
})

function addExtraInfo(data) {
    const expResultContainer = document.querySelector("#expResult");
    const extraInfoDiv = document.createElement("div");
    extraInfoDiv.innerHTML = `
    <h3>Extra informatie</h3>
    <p>${data.message}</p>
    <p>${data.veiligInternetten.date}</p>
    <p>KvK: ${data.veiligInternetten.KamervanKoophandel}</p>
    <p>Malware gevonden: ${data.veiligInternetten.Quad9}</p>
    <p>Gerapporteerd voor phishing: ${data.veiligInternetten.APWG}</p>
    <p>${data.veiligInternetten.Scamadviser}</p>
    `;

    expResultContainer.appendChild(extraInfoDiv);
}

window.onload = injectUI;
