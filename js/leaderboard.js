/*
 * Leaderboards on leaderboard.html, one tab per game.
 *
 * Results come from the account service (account.dreamteamhub.ca), which game servers report to
 * when a match between two signed-in players ends. To add a game, add a tab here and the same
 * key to GAMES in the account Worker.
 *   game  ~ the key the game server records results under
 *   title ~ the tab label
 */
(function () {
  "use strict";

  var LEADERBOARDS = [
    { game: "mineduel", title: "Mine Duel" },
    { game: "flappyduel", title: "Flappy Duel" },
  ];

  var API = window.DTH_ACCOUNT_API || "https://account.dreamteamhub.ca";
  var tabs = document.getElementById("leaderboard-tabs");
  var panel = document.getElementById("leaderboard-panel");
  if (!tabs || !panel) return;

  var cache = {};

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Text that shows `tip` on hover, or on tap/focus for touch and keyboard users.
  function withTip(text, tip) {
    var span = el("span", "tip", text);
    span.tabIndex = 0;
    span.setAttribute("data-tip", tip);
    // The tooltip is CSS-only, so screen readers get the same text from a hidden copy.
    span.appendChild(el("span", "visually-hidden", " (" + tip + ")"));
    return span;
  }

  function renderTable(board) {
    if (!board.players.length) {
      panel.replaceChildren(el("p", "leaderboard__empty",
        "No ranked games yet. Sign in and play someone who's signed in too!"));
      return;
    }

    var table = el("table", "leaderboard__table");
    var caption = el("caption", "visually-hidden", board.title + " leaderboard");
    var head = el("thead");
    var headRow = el("tr");
    [["#", "rank"], ["Username", ""], ["Wins", "num"], ["W/L Ratio (last " + board.recentGames + ")", "num"]]
      .forEach(function (col) {
        var th = el("th", col[1], col[0]);
        th.scope = "col";
        headRow.appendChild(th);
      });
    head.appendChild(headRow);

    var body = el("tbody");
    board.players.forEach(function (player, i) {
      var row = el("tr");
      row.appendChild(el("td", "rank", String(i + 1)));

      var name = el("td");
      // The account number is its place in sign-up order: #0 was the first account ever made.
      name.appendChild(withTip(player.name, "Player #" + player.number));
      row.appendChild(name);

      row.appendChild(el("td", "num", player.wins.toLocaleString()));

      var recent = player.recent;
      var games = recent.wins + recent.losses;
      var ratio = el("td", "num");
      ratio.appendChild(games
        ? withTip(Math.round((recent.wins / games) * 100) + "%", recent.wins + " W / " + recent.losses + " L")
        : withTip("–", "No games in the last " + board.recentGames));
      row.appendChild(ratio);

      body.appendChild(row);
    });

    table.append(caption, head, body);
    panel.replaceChildren(table);
  }

  function show(entry, button) {
    Array.prototype.forEach.call(tabs.children, function (tab) {
      var selected = tab === button;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panel.setAttribute("aria-labelledby", button.id);

    if (cache[entry.game]) return renderTable(cache[entry.game]);
    panel.replaceChildren(el("p", "leaderboard__empty", "Loading…"));
    fetch(API + "/leaderboard?game=" + encodeURIComponent(entry.game))
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        return res.json();
      })
      .then(function (board) {
        cache[entry.game] = board;
        if (button.getAttribute("aria-selected") === "true") renderTable(board);
      })
      .catch(function () {
        panel.replaceChildren(el("p", "leaderboard__empty", "Couldn't load the leaderboard. Try again later."));
      });
  }

  LEADERBOARDS.forEach(function (entry, i) {
    var button = el("button", "leaderboard__tab", entry.title);
    button.type = "button";
    button.id = "leaderboard-tab-" + entry.game;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", "leaderboard-panel");
    button.addEventListener("click", function () {
      show(entry, button);
    });
    tabs.appendChild(button);
    if (i === 0) show(entry, button);
  });

  // Arrow keys move between tabs, as screen reader users expect.
  tabs.addEventListener("keydown", function (event) {
    var list = Array.prototype.slice.call(tabs.children);
    var at = list.indexOf(document.activeElement);
    if (at < 0) return;
    var step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    var next = list[(at + step + list.length) % list.length];
    next.focus();
    next.click();
  });
})();
