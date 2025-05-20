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

    if (message.action === "closeActiveTab") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length > 0) {
            chrome.tabs.remove(tabs[0].id);
          }
        });
    }

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
                isBetrouwbaar = false;
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

    // ref=r198_r1_r1_r1 op 20-05-2025 veranderd naar r196_r1_r1_r1
    // TODO: Kijken of dit vaker moet veranderen
    if (message.type === "politieControleerHandelspartij") {
        const url = "https://www.politie.nl/aangifte-of-melding-doen/controleer-handelspartij.html";
        fetch(`${url}?_hn:type=action&_hn:ref=r196_r1_r1_r1&query=${message.url}`, {
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

        if (!domain || !safetyCheckResult) {
            console.error("❌ Missing domain or safety check result in message");
            sendResponse({ success: false, error: "Missing domain or safety check result" });
            return;
        }

        chrome.storage.local.get("helpInput", (result) => {
            const receiver = result.helpInput || ""; // Default to empty string if not set

            if (!receiver) {
                console.error("❌ No receiver email address found in storage");
                sendResponse({ success: false, error: "No receiver email address found" });
                return;
            }

            let mailContent = "";
            if (safetyCheckResult.veiligInternetten.date) {
                const kvkStatus = safetyCheckResult.veiligInternetten.kvkStatus
                    ? "Geregistreerd"
                    : "Niet geregistreerd (als u dingen koopt op deze website kan het lastiger zijn om uw geld terug te krijgen.)";
                const trustScore = safetyCheckResult.veiligInternetten.Scamadviser.split("(volledig rapport")[0].trim();

                mailContent = `Bericht vanuit WebAlert: ${safetyCheckResult.message}.\n` +
                    `${safetyCheckResult.veiligInternetten.date}\n` +
                    `KvK: ${kvkStatus}\n` +
                    `Malware: ${safetyCheckResult.veiligInternetten.Quad9}\n` +
                    `Phishing: ${safetyCheckResult.veiligInternetten.APWG}\n` +
                    `Scamadviser: ${trustScore}\n\n`;
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
        });

        return true;
    }


    if (message.type === "cleanUpResults") {
        const response = message.data;

        if (!response) {
            console.error("❌ Missing or invalid response data");
            sendResponse({ success: false, error: "Missing or invalid response data" });
            return;
        }

        // Overwrite when it is not available
        const kvk = response.veiligInternetten.kvkStatus;
        response.veiligInternetten.Scamadviser = response.veiligInternetten.Scamadviser || "Onbekend";
        response.veiligInternetten.APWG = response.veiligInternetten.APWG || "Onbekend";
        response.veiligInternetten.Quad9 = response.veiligInternetten.Quad9 || "Onbekend";
        response.veiligInternetten.date = response.veiligInternetten.date || "Datum onbekend";

        // Check if the date is older than 5 months
        let isOld = false;
        if(response.veiligInternetten.date !== "Onbekend"){
            const currentDate = new Date();
            const responseDate = new Date(response.veiligInternetten.date);
            const fiveMonthsAgo = new Date();
            fiveMonthsAgo.setMonth(currentDate.getMonth() - 5);
            isOld = responseDate < fiveMonthsAgo;
        }
        
        // Check the reason why the advice is given
        const trusted = response.veiligInternetten.Scamadviser.includes("hoge");
        const noPhishing = response.veiligInternetten.APWG.includes("Niet gerapporteerd voor phishing");
        const noMalware = response.veiligInternetten.Quad9.includes("Geen malware of virus gerapporteerd");
        const kvkStatusText = kvk === undefined ? "Onbekend" : (kvk === true ? "Geregistreerd"
            : "Niet geregistreerd (als u dingen koopt op deze website kan het lastiger zijn om uw geld terug te krijgen.)");
        const trustScoreText = response.veiligInternetten.Scamadviser.split("(volledig rapport")[0].trim();

        // Give back the message and highlight the reasons
        const webAlertMessage = message.format === "list" ? "" : `<p>${response.message}</p>`;
        const html = `
            ${webAlertMessage}
            <ul>
                <li class="${!isOld ? 'highlight' : ''}">${response.veiligInternetten.date}</li>
                <li class="${!kvk ? 'highlight' : ''}">Kamer van Koophandel: ${kvkStatusText}</li>
                <li class="${!noMalware ? 'highlight' : ''}">Malware: ${response.veiligInternetten.Quad9}</li>
                <li class="${!noPhishing ? 'highlight' : ''}">Phishing: ${response.veiligInternetten.APWG}</li>
                <li class="${!trusted ? 'highlight' : ''}">Vertrouwensscore: ${trustScoreText}</li>
            </ul>
        `;

        sendResponse({ success: true, html });
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

// TODO maak dit korter
        if (message.type === "updateInputEnabled") {
            chrome.storage.local.set({ inputEnabled: message.value }, () => {
                sendResponse({ success: true });
            });
            return true;
        }

        if (message.type === "updateHelpInput") {
            chrome.storage.local.set({ helpInput: message.value }, () => {
                sendResponse({ success: true });
            });
            return true;
        }

        if (message.type === "updateHelpName") {
            chrome.storage.local.set({ helpName: message.value }, () => {
                sendResponse({ success: true });
            });
            return true;
        }

        if (message.type === "getInputEnabled") {
            chrome.storage.local.get("inputEnabled", (result) => {
                const value = result.inputEnabled || false; // Default to false if not set
                console.log("ℹ️ Input enabled state retrieved:", value);
                sendResponse({ success: true, value });
            });
            return true;
        }

        if (message.type === "getHelpInput") {
            chrome.storage.local.get("helpInput", (result) => {
                const value = result.helpInput || ""; // Default to empty string if not set
                console.log("ℹ️ Help input value retrieved:", value);
                sendResponse({ success: true, value });
            });
            return true;
        }

        if (message.type === "getHelpName") {
            chrome.storage.local.get("helpName", (result) => {
                const value = result.helpName || ""; // Default to empty string if not set
                console.log("ℹ️ Help name value retrieved:", value);
                sendResponse({ success: true, value });
            });
            return true;
        }
});