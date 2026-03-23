(function () {
  var configScript = document.querySelector("script.wb-book-config");
  if (!configScript) {
    return;
  }

  var config;
  try {
    config = JSON.parse(configScript.textContent);
  } catch (e) {
    return;
  }

  var path = window.location.pathname || "";
  var segments = path.split("/").filter(Boolean);
  var key = "";
  if (segments.length >= 2) {
    key = segments.slice(-2).join("/");
  } else if (segments.length === 1) {
    key = segments[0];
  }

  var configUrl = new URL("../wb-webhooks.json", window.location.href);
  var request = new XMLHttpRequest();
  try {
    request.open("GET", configUrl.toString(), false);
    request.send(null);
  } catch (e) {
    return;
  }

  if (request.status !== 200 && request.status !== 0) {
    return;
  }

  var data;
  try {
    data = JSON.parse(request.responseText);
  } catch (e) {
    return;
  }

  var map = data.map || {};
  var webhookUrl = map[key] || data.default || "";
  if (!webhookUrl) {
    return;
  }

  config.webhookUrl = webhookUrl;
  configScript.textContent = JSON.stringify(config, null, 2);
})();