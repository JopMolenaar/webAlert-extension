const helpInput = document.querySelector("#helpInput");

helpInput.addEventListener("blur", (e) => {
    const value = e.target.value;

    if (value === ""){
        helpInput.classList.remove("valid");
        helpInput.classList.remove("invalid");

        const statusDiv = helpInput.parentNode.querySelector("div.feedback");
        if(statusDiv){
            statusDiv.remove();
        }
        chrome.runtime.sendMessage({ type: "updateHelpInput", value });
        return
    }
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || /^\d{10}$/.test(value); // Validate email or exactly 10-digit number

    if (isValid) {
        chrome.runtime.sendMessage({ type: "updateHelpInput", value }, (response) => {
            helpInput.classList.remove("invalid");
            helpInput.classList.add("valid");

            const inputFeedback = document.createElement("img");
            inputFeedback.src = "../icons/success.svg";
            inputFeedback.classList.add("feedback");

            if (!helpInput.parentNode.querySelector("div.feedback")) {
                helpInput.parentNode.appendChild(inputFeedback);
            }
            
            const statusDiv = helpInput.parentNode.querySelector("div.feedback");
            if(statusDiv){
                statusDiv.remove();
            }
  
            // Remove feedback after a few seconds
            setTimeout(() => {
                helpInput.classList.remove("valid");
                inputFeedback.remove();

            }, 7000);
        });
    } else {
            helpInput.classList.remove("valid");
            helpInput.classList.add("invalid");

            const inputFeedback = document.createElement("div");
            inputFeedback.classList.add("feedback");

            // Laat zien wanneer de gebruiker het veld los laat
            inputFeedback.textContent = "Je antwoord is niet geldig";

            if (!helpInput.parentNode.querySelector("div.feedback")) {
                helpInput.parentNode.appendChild(inputFeedback);
            }
    }
});
helpInput.addEventListener("click", (e) => {
    const statusDiv = helpInput.parentNode.querySelector("div.feedback");
    if(statusDiv){
        statusDiv.remove();
    }
})

document.querySelector("#helpName").addEventListener("input", (e) => {
    chrome.runtime.sendMessage({ type: "updateHelpName", value: e.target.value });
});

document.addEventListener("DOMContentLoaded", () => {
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