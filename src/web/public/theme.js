// Applies the saved theme before the app loads, to avoid a flash.
try {
  var t = localStorage.getItem("daymark.theme");
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
} catch (e) {}
