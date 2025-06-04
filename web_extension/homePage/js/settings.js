// document.querySelector("#inputEnabled").addEventListener("click", (e) => {
//     chrome.runtime.sendMessage({ type: "updateInputEnabled", value: e.target.checked });
// });

document.querySelector("#helpInput").addEventListener("input", (e) => {
    // TODO VALIDATE EMAIL OF NUMBER -> IF NOT VALID, SEND ERROR MESSAGE
    chrome.runtime.sendMessage({ type: "updateHelpInput", value: e.target.value });
});
document.querySelector("#helpName").addEventListener("input", (e) => {
    chrome.runtime.sendMessage({ type: "updateHelpName", value: e.target.value });
});

document.addEventListener("DOMContentLoaded", () => {
    // chrome.runtime.sendMessage({ type: "getInputEnabled" }, (response) => {
    //     if (response && response.success) {
    //         console.log("ℹ️ Input enabled state on load:", response.value);
    //         document.querySelector("#inputEnabled").checked = response.value;
    //     } else {
    //         console.error("❌ Failed to retrieve input enabled state.");
    //     }
    // });

    chrome.runtime.sendMessage({ type: "getHelpInput" }, (response) => {
        if (response && response.success) {
            console.log("ℹ️ Help input value on load:", response.value);
            document.querySelector("#helpInput").value = response.value;
        } else {
            console.error("❌ Failed to retrieve help input value.");
        }
    });
    chrome.runtime.sendMessage({ type: "getHelpName" }, (response) => {
        if (response && response.success) {
            console.log("ℹ️ Help input value on load:", response.value);
            document.querySelector("#helpName").value = response.value;
        } else {
            console.error("❌ Failed to retrieve help input value.");
        }
    });
});

