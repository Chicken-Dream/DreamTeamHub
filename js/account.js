/*
 * Optional sign-in, top right of the header.
 *
 * Accounts live at account.dreamteamhub.ca (the `account` Worker). Its login cookie is set on
 * .dreamteamhub.ca, so this page, and every game, sees the same signed-in player. Guests can do
 * everything except appear on leaderboards.
 */
(function () {
  "use strict";

  var API = "https://account.dreamteamhub.ca";
  var root = document.getElementById("account");
  if (!root) return;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function api(path, options) {
    options = options || {};
    options.credentials = "include";
    return fetch(API + path, options).then(function (res) {
      return res.json();
    });
  }

  function renderGuest() {
    var link = el("a", "account__signin", "Sign in");
    // Google sends the player back to this exact page afterwards.
    link.href = API + "/login?return=" + encodeURIComponent(location.href);
    link.title = "Sign in with Google to appear on leaderboards";
    root.replaceChildren(link);
  }

  function renderUser(user) {
    var button = el("button", "account__name", user.name);
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-haspopup", "true");

    var panel = el("div", "account__panel");
    panel.hidden = true;
    panel.appendChild(el("p", "account__label", "Signed in as"));
    // Hover (or tap/focus) shows the account number, same as on the leaderboard: its place in
    // sign-up order, so #0 is the first account ever (account ids start at 1).
    var tip = "Player #" + (user.id - 1);
    var current = el("span", "tip", user.name);
    current.tabIndex = 0;
    current.setAttribute("data-tip", tip);
    var currentRow = el("p", "account__current");
    currentRow.append(current, el("span", "visually-hidden", " (" + tip + ")"));
    panel.appendChild(currentRow);

    // Rename: names are a prefix + a suffix from fixed lists, like in the plaza.
    var rename = el("form", "account__rename");
    var prefix = el("select");
    var suffix = el("select");
    prefix.setAttribute("aria-label", "Name start");
    suffix.setAttribute("aria-label", "Name end");
    var save = el("button", "account__save", "Change name");
    save.type = "submit";
    var status = el("p", "account__status");
    status.setAttribute("role", "status");
    rename.append(prefix, suffix, save, status);
    panel.appendChild(rename);

    // A plain form, so signing out works even if the request can't be read back.
    var logout = el("form", "account__logout");
    logout.method = "post";
    logout.action = API + "/logout?return=" + encodeURIComponent(location.href);
    var out = el("button", "account__signout", "Sign out");
    out.type = "submit";
    logout.appendChild(out);
    panel.appendChild(logout);

    var privacy = el("a", "account__privacy", "Privacy & delete account");
    privacy.href = "privacy.html";
    panel.appendChild(privacy);

    var namesLoaded = false;
    function loadNames() {
      if (namesLoaded) return;
      namesLoaded = true;
      api("/names").then(function (names) {
        fillSelect(prefix, names.prefixes, user.name, true);
        fillSelect(suffix, names.suffixes, user.name, false);
      }).catch(function () {
        namesLoaded = false;
        status.textContent = "Couldn't load names. Try again later.";
      });
    }

    rename.addEventListener("submit", function (event) {
      event.preventDefault();
      save.disabled = true;
      status.textContent = "";
      api("/me/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ p: Number(prefix.value), s: Number(suffix.value) }),
      }).then(function (data) {
        if (!data.user) throw new Error(data.error || "rename failed");
        user = data.user;
        button.textContent = user.name;
        current.textContent = user.name;
        status.textContent = "Saved!";
      }).catch(function () {
        status.textContent = "Couldn't change your name. Try again.";
      }).then(function () {
        save.disabled = false;
      });
    });

    function setOpen(open) {
      panel.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
      if (open) loadNames();
    }

    button.addEventListener("click", function () {
      setOpen(panel.hidden);
    });
    document.addEventListener("click", function (event) {
      if (!root.contains(event.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) {
        setOpen(false);
        button.focus();
      }
    });

    root.replaceChildren(button, panel);
  }

  // Pre-selects the words that make up the current name (prefixes match the start, suffixes the end).
  function fillSelect(select, words, name, isPrefix) {
    words.forEach(function (word, i) {
      var option = el("option", "", word);
      option.value = String(i);
      var matches = isPrefix ? name.indexOf(word) === 0 : name.slice(-word.length) === word;
      if (matches) option.selected = true;
      select.appendChild(option);
    });
  }

  api("/me")
    .then(function (data) {
      if (data.user) renderUser(data.user);
      else renderGuest();
    })
    .catch(renderGuest); // account service unreachable: still offer sign-in
})();
