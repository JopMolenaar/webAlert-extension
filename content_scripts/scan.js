async function injectUI() {
    document.body.style.border = "5px solid red"; // testing purposes

    const html = await fetch(chrome.runtime.getURL("content_scripts/ui.html")).then(r => r.text());
    const css = await fetch(chrome.runtime.getURL("content_scripts/style.css")).then(r => r.text());

    const styleEl = document.createElement("style");
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);


    // Event listeners
    const button = wrapper.querySelector("#openSettingsBtn");
    const homeButton = wrapper.querySelector("#openHomeBtn");
    button.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "open_settings" });
    });
    homeButton.addEventListener("click", () => {
        const url = chrome.runtime.getURL("index.html");
        window.open(url, "_blank");
    });
}

window.onload = injectUI;