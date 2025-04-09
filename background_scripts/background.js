chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
    if (message.action === "open_settings") {
        chrome.runtime.openOptionsPage();
    }

    if (message.type === "sendDataToBackend") {
        fetch("https://your-api.com/endpoint", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(message.payload)
        });
    }

    if (message.type === "checkVeiliginternetten") {
        fetch(`https://check.veiliginternetten.nl/controleer/${message.url}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        })
        .then(res => res.text())
        .then(html => {
            const isBetrouwbaar = html.includes("betrouwbaar");
            const isOnbetrouwbaar = html.includes("niet veilig");
            const jeMoetDrukken = html.includes("PLEASE PRESS THE BUTTON");
            let result = "❓ Onbekend";

            if (jeMoetDrukken) {
                result = "❗️ Onbekend (downtime)";
            } else if (isOnbetrouwbaar) {
                result = "❌ Mogelijk onbetrouwbaar";
            } else if (isBetrouwbaar) {
                result = "✅ Betrouwbaar";
            }
            sendResponse({
                result,
                matched: isBetrouwbaar,
                rawHtml: html // optioneel, alleen als je dat wil gebruiken
            });
        })
        .catch(err => {
            console.error("Fout bij ophalen:", err);
            sendResponse({ error: err.toString() });
        });

        // Return true zorgt ervoor dat sendResponse async mag zijn
        return true;
    }

});
// chrome.action.onClicked.addListener((tab) => {
//     const url = chrome.runtime.getURL("index.html"); // or whatever your internal page is
//     chrome.tabs.create({ url });
// });