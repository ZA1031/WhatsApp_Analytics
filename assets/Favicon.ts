function prefersDarkColorScheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function updateFavicon() {
    const favicon = document.querySelector("link[rel=icon]") as HTMLLinkElement;
    const url = "http://localhost:3000/"

    favicon.href = url + (prefersDarkColorScheme() ? "favicon-32x32.png" : "favicon-32x32.png");
}

updateFavicon();
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => updateFavicon());
