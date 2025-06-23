chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "test-menu",
    title: "🛡️ Test Menu",
    contexts: ["image"]
  });
});

console.log("Soft-Armor test extension loaded!");