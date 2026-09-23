(function () {
  try {
    var pref = localStorage.getItem("carbutarn:theme") || "system"
    var dark =
      pref === "dark" ||
      (pref !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    document.documentElement.dataset.theme = dark ? "dark" : "light"
    document.documentElement.style.colorScheme = dark ? "dark" : "light"
  } catch (e) {
    document.documentElement.dataset.theme = "light"
  }
})()
