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
});
// chrome.action.onClicked.addListener((tab) => {
//     const url = chrome.runtime.getURL("index.html"); // or whatever your internal page is
//     chrome.tabs.create({ url });
// });