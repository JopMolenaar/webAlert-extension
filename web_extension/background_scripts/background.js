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
            let isBetrouwbaar = html.includes("betrouwbaar");
            const isOnbetrouwbaar = html.includes("niet veilig");
            const jeMoetDrukken = html.includes("PLEASE PRESS THE BUTTON");
            const jeMoetDrukken2 = html.includes("DRUK OP DE KNOP");
            const downtime = jeMoetDrukken || jeMoetDrukken2;
            let result = "❓ Onbekend";

            if (downtime) {
                result = "❗️ Onbekend (downtime)";
                isBetrouwbaar = false;
            } else if (isOnbetrouwbaar) {
                result = "❌ Mogelijk onbetrouwbaar";
            } else if (isBetrouwbaar) {
                result = "✅ Betrouwbaar";
            }
            sendResponse({
                result,
                matched: isBetrouwbaar,
                danger: isOnbetrouwbaar,
                unknown: downtime,
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
                danger: isOnbetrouwbaar,
                unknown: !isBetrouwbaar && !isOnbetrouwbaar,
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

    if (message.type === "getStoredData") {
        chrome.storage.local.get(null, (items) => {
            sendResponse({ data: items });
        });
        // true to indicate asynchronously response 
        return true;
    }

    // TODO ook via sms?
    // const smstoUrl = `sms:?subject=${subject}&body=${body}`; werkt ook gewoon. Maar er wordt wel gevraagd om messages te openen
    if (message.type === "sendSafetyCheckResultsToMail") {
        const { domain, safetyCheckResult } = message;
        const receiver = ""

        if (!domain || !safetyCheckResult) {
            console.error("❌ Missing domain or safety check result in message");
            sendResponse({ success: false, error: "Missing domain or safety check result" });
            return;
        }

        let mailContent = ""
        if(safetyCheckResult.veiligInternetten.date){
            mailContent = `Bericht vanuit WebAlert: ${safetyCheckResult.message}.\n` +
            `${safetyCheckResult.veiligInternetten.date}\n` +
            `KvK: ${safetyCheckResult.veiligInternetten.KamervanKoophandel}\n` +
            `Malware gevonden: ${safetyCheckResult.veiligInternetten.Quad9}\n` +
            `Phishing: ${safetyCheckResult.veiligInternetten.APWG}\n` +
            `Scamadviser: ${safetyCheckResult.veiligInternetten.Scamadviser}\n\n`;
        } else {
            mailContent = `Bericht vanuit WebAlert: ${safetyCheckResult.message}\n` +
            `De bron Veilig Internetten kon niet worden gebruikt voor deze website.`;
        }

        console.log("📋 Preparing safety check results email");

        // Open mail client with safety check results
        const subject = encodeURIComponent(`Help! Is dit phishing? Ik twijfel over: ${domain}`);
        const body = encodeURIComponent(
            `Voor uw context zijn dit de resultaten vanuit de gebruikte webextensie: WebAlert.\n\n` +
            `Domein: ${domain}\n` +
            `Link: https://${domain}\n\n` +
            `Veiligheidscheck resultaten: \n\n` +
            mailContent +
            `Als u mij z.s.m. een berichtje wilt sturen over wat u denkt over wat ik moet doen zou dit heel fijn zijn.\n\n Groetjes!`
        );
        const mailtoUrl = `mailto:${receiver}?subject=${subject}&body=${body}`;

        chrome.tabs.create({ url: mailtoUrl }, () => {
            console.log("📬 Mail client opened with safety check results");
            sendResponse({ success: true });
        });

        return true;
    } 


    // if (message.type === "sendScreenshotToMail") {
    //     chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
    //         if (chrome.runtime.lastError || !dataUrl) {
    //             console.error("❌ Screenshot capture failed:", chrome.runtime.lastError);
    //             sendResponse({ success: false, error: "Screenshot capture failed" });
    //             return;
    //         }
    
    //         console.log("📸 Screenshot captured");
    
    //         // Open mail client first
    //         const subject = encodeURIComponent("Screenshot from Extension");
    //         const body = encodeURIComponent(
    //             "Hi,\n\nI've attached a screenshot. Please find it attached.\n\n(Saved as screenshot.png)"
    //         );
    //         const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
    
    //         chrome.tabs.create({ url: mailtoUrl }, () => {
    //             console.log("📬 Mail client opened");
    
    //             setTimeout(() => {
    //                 chrome.downloads.download({
    //                     url: dataUrl, // directly use base64 URL
    //                     filename: "screenshot.png",
    //                     saveAs: true
    //                 }, (downloadId) => {
    //                     if (chrome.runtime.lastError) {
    //                         console.error("❌ Download failed:", chrome.runtime.lastError);
    //                     } else {
    //                         console.log("✅ Download started. ID:", downloadId);
    //                     }
    //                 });
    //             }, 500); // delay helps avoid popup suppression
    //         });
    
    //         sendResponse({ success: true });
    //     });
    
    //     return true;
    // }
});