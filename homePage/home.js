document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get(null, (items) => {
        console.log("Retrieved items from storage:", items);

        const resultsContainer = document.querySelector("#results");
        for (const [source, response] of Object.entries(items)) {
            const resultDiv = document.createElement("div");
            resultDiv.innerHTML = `
                <p><strong>${source}</strong>: ${response.result}</p>
                <a href="${response.source}" target="_blank">${response.source}</a>
            `;
            resultsContainer.appendChild(resultDiv);
        }
    });
});