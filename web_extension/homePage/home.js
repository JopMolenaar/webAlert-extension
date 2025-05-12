const showHistory = document.querySelector("#watchHistory")
const backBtn = document.querySelector("header nav button")
const history = document.querySelector(".history")

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

    history.classList.add("hidden");
}

backBtn.addEventListener("click", (e) => {
    window.close();
})
showHistory.addEventListener("click", (e) => {
    history.classList.toggle("hidden");
});

function addExtraInfo(data) {
    const expResultContainer = document.querySelector("#expResult");
    const extraInfoDiv = document.createElement("div");

    const kvkStatus = data.veiligInternetten.kvkStatus ? "Geregistreerd" : "Niet geregistreerd (als u dingen koopt op deze website kan het lastiger zijn om uw geld terug te krijgen.)";
    const trustScore = data.veiligInternetten.Scamadviser.split("(volledig rapport")[0].trim();

    // TODO DIT DOEN IN EEN BACKGROUND SCRIPT
    extraInfoDiv.innerHTML = `
    <h3>Extra informatie</h3>
    <p>${data.message}</p>
    <p>${data.veiligInternetten.date}</p>
    <p>KvK: ${kvkStatus}</p>
    <p>Malware: ${data.veiligInternetten.Quad9}</p>
    <p>Phishing: ${data.veiligInternetten.APWG}</p>
    <p>Vertrouwensscore: ${trustScore}</p>
    `;

    expResultContainer.appendChild(extraInfoDiv);
}



window.onload = injectUI;
