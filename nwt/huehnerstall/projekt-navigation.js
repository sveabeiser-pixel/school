(function () {
  "use strict";

  const pages = [
    ["index.html", "Projektübersicht"],
    ["01-systemaufbau.html", "1 · System"],
    ["02-esp32.html", "2 · ESP32"],
    ["03-sensoren.html", "3 · KY-015"],
    ["04-ldr-adc.html", "4 · LDR & ADC"],
    ["05-messdaten.html", "5 · Messdaten"],
    ["06-netzwerk-http.html", "6 · Netzwerk"],
    ["07-pi-linux.html", "7 · Raspberry Pi"],
    ["08-kamera-noir.html", "8 · Kamera"],
    ["09-streaming-homepage.html", "9 · Streaming"],
    ["10-ausfallsicherheit-abgabe.html", "10 · Abnahme"]
  ];

  const current = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const currentIndex = pages.findIndex(([file]) => file === current);
  const root = document.querySelector("[data-wb-book]");
  if (!root || document.querySelector(".coop-project-nav")) return;

  const nav = document.createElement("nav");
  nav.className = "coop-project-nav";
  nav.setAttribute("aria-label", "Navigation im Projekt Smart Chicken Coop");

  const previous = currentIndex > 0 ? pages[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null;
  const position = currentIndex < 0 ? "Arbeitsroute" : `${currentIndex + 1} von ${pages.length}`;

  nav.innerHTML = `
    <div class="coop-project-nav__top">
      <span class="coop-project-nav__title">🐔 Smart Chicken Coop</span>
      <span class="coop-project-nav__status">${position}</span>
    </div>
    <div class="coop-project-nav__links">
      <a href="index.html">⌂ Übersicht</a>
      ${previous ? `<a href="${previous[0]}">← ${previous[1]}</a>` : ""}
      ${next ? `<a href="${next[0]}">${next[1]} →</a>` : ""}
      <a href="gruppe-a.html">Gruppe A</a>
      <a href="gruppe-b.html">Gruppe B</a>
    </div>`;

  const bookPages = root.querySelectorAll("section[data-wb-page]");
  if (bookPages.length) {
    bookPages.forEach((page, index) => page.prepend(index === 0 ? nav : nav.cloneNode(true)));
  } else {
    root.prepend(nav);
  }
})();
