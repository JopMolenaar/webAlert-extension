chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    
    // if (message.action === "open_settings") {
    //     chrome.runtime.openOptionsPage();
    // }

    // if (message.type === "sendDataToBackend") {
    //     fetch("https://your-api.com/endpoint", {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify(message.payload)
    //     });
    // }

    if (message.type === "checkVeiliginternetten") {
        const url = `https://check.veiliginternetten.nl/controleer/${message.url}`;
        fetch(url, {
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
                rawHtml: html,
                source: url,
            });
        })
        .catch(err => {
            console.error("Fout bij ophalen:", err);
            sendResponse({ error: err.toString() });
        });
        return true;
    }


    if (message.type === "politieControleerHandelspartij") {
        const url = "https://www.politie.nl/aangifte-of-melding-doen/controleer-handelspartij.html";
        fetch(`${url}?_hn:type=action&_hn:ref=r198_r1_r1_r1&query=${message.url}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        })
        .then(res => res.text())
        .then(html => {
            const isBetrouwbaar = html.includes("Er zijn geen meldingen over deze verkoper.");
            const isOnbetrouwbaar = html.includes("Er zijn meldingen over deze verkoper!");
            let result = "❓ Onbekend";

            if (isOnbetrouwbaar) {
                result = "❌ Mogelijk onbetrouwbaar";
            } else if (isBetrouwbaar) {
                result = "✅ Betrouwbaar";
            }
            sendResponse({
                result,
                matched: isBetrouwbaar,
                rawHtml: html,
                source: url,
            });
        })
        .catch(err => {
            console.error("Fout bij ophalen:", err);
            sendResponse({ error: err.toString() });
        });
        return true;
    }
});