/* WeddingBudget calculators — pure math + DOM wiring.
   All figures are ESTIMATES, not quotes. */
(function () {
  'use strict';

  // Category model — shares sum to 100%
  var CATEGORIES = [
    { key: 'venue',        name: 'Venue',                        pct: 30 },
    { key: 'catering',     name: 'Catering & bar',               pct: 23 },
    { key: 'photo',        name: 'Photography & videography',    pct: 12 },
    { key: 'attire',       name: 'Attire & beauty',              pct: 8  },
    { key: 'flowers',      name: 'Flowers & decor',              pct: 8  },
    { key: 'music',        name: 'Music & entertainment',        pct: 7  },
    { key: 'cake',         name: 'Cake & desserts',              pct: 3  },
    { key: 'invites',      name: 'Invitations & stationery',     pct: 3  },
    { key: 'transport',    name: 'Transportation',               pct: 2  },
    { key: 'contingency',  name: 'Contingency fund',             pct: 4  }
  ];

  var REGION_RATES = {
    metro: 150,   // major metro — estimated avg catering+bar per guest
    mid:   110,   // mid-size city
    town:   85,   // small town
    rural:  65    // rural
  };

  var STYLE_MULT = {
    luxury:  1.4,
    classic: 1.0,
    budget:  0.65
  };

  function round10(n) { return Math.round(n / 10) * 10; }

  // Mode A: estimate from guests × region rate × style.
  // Catering is anchored at 23% of the total budget.
  function estimateCost(guests, regionKey, styleKey) {
    guests = Math.max(1, Math.min(1000, Math.round(Number(guests) || 100)));
    var rate = REGION_RATES[regionKey] || REGION_RATES.mid;
    var mult = STYLE_MULT[styleKey] || 1.0;
    var cateringCost = guests * rate * mult;
    var rawTotal = cateringCost / 0.23;
    var items = CATEGORIES.map(function (c) {
      return { key: c.key, name: c.name, pct: c.pct, amount: round10(rawTotal * c.pct / 100) };
    });
    var total = items.reduce(function (s, i) { return s + i.amount; }, 0);
    return {
      guests: guests, regionKey: regionKey, styleKey: styleKey,
      total: total, perGuest: total / guests, items: items
    };
  }

  // Mode B: allocate a fixed total budget across categories.
  function allocateBudget(budget) {
    budget = Math.max(1000, Math.round(Number(budget) || 35000));
    var items = CATEGORIES.map(function (c) {
      return { key: c.key, name: c.name, pct: c.pct, amount: round10(budget * c.pct / 100) };
    });
    var total = items.reduce(function (s, i) { return s + i.amount; }, 0);
    return { budget: budget, total: total, items: items };
  }

  function fmt(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  function renderItems(tbody, items) {
    var maxPct = Math.max.apply(null, items.map(function (i) { return i.pct; }));
    tbody.innerHTML = items.map(function (i) {
      var w = Math.round(i.pct / maxPct * 100);
      return '<div class="alloc-row">' +
        '<span>' + i.name + ' <span style="color:var(--muted)">(' + i.pct + '%)</span></span>' +
        '<span class="bar-track"><span class="bar-fill" style="display:block;width:' + w + '%"></span></span>' +
        '<span class="amt">' + fmt(i.amount) + '</span>' +
      '</div>';
    }).join('');
  }

  // ---- DOM wiring (browser only) ----
  function wire() {
    var tabBtns = document.querySelectorAll('.tab-btn');
    var panels = document.querySelectorAll('.tab-panel');
    tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        tabBtns.forEach(function (b) { b.classList.remove('active'); });
        panels.forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
      });
    });

    // Mode A controls
    var slider = document.getElementById('guests-slider');
    var num = document.getElementById('guests-num');
    var aTotal = document.getElementById('a-total');
    var aPerGuest = document.getElementById('a-perguest');
    var aBody = document.getElementById('a-breakdown');

    function recalcA() {
      var guests = Number(num.value) || 0;
      if (guests < 1) guests = 1;
      if (slider && document.activeElement !== slider) slider.value = Math.min(300, guests);
      if (num && document.activeElement !== num) num.value = guests;
      var region = (document.querySelector('input[name="region"]:checked') || {}).value || 'mid';
      var style = (document.querySelector('input[name="style"]:checked') || {}).value || 'classic';
      var r = estimateCost(guests, region, style);
      if (aTotal) aTotal.textContent = fmt(r.total);
      if (aPerGuest) aPerGuest.textContent = 'About ' + fmt(r.perGuest) + ' per guest — estimate, not a quote.';
      if (aBody) renderItems(aBody, r.items);
    }

    if (slider && num) {
      slider.addEventListener('input', function () { num.value = slider.value; recalcA(); });
      num.addEventListener('input', recalcA);
      document.querySelectorAll('input[name="region"], input[name="style"]').forEach(function (el) {
        el.addEventListener('change', recalcA);
      });
      recalcA();
    }

    // Mode B controls
    var bInput = document.getElementById('b-budget');
    var bTotal = document.getElementById('b-total');
    var bBody = document.getElementById('b-breakdown');

    function recalcB() {
      var r = allocateBudget(Number(bInput.value) || 35000);
      if (bTotal) bTotal.textContent = fmt(r.total);
      if (bBody) renderItems(bBody, r.items);
    }

    if (bInput) {
      bInput.addEventListener('input', recalcB);
      document.querySelectorAll('[data-budget]').forEach(function (chip) {
        chip.addEventListener('click', function () {
          bInput.value = chip.dataset.budget;
          recalcB();
        });
      });
      recalcB();
    }
  }

  var api = {
    CATEGORIES: CATEGORIES,
    estimateCost: estimateCost,
    allocateBudget: allocateBudget,
    fmt: fmt
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api; // node self-test
  } else if (typeof window !== 'undefined') {
    window.WeddingCalc = api;
    document.addEventListener('DOMContentLoaded', wire);
  }
})();
