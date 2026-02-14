// script.js — robust + self-diagnose
(() => {
  // ===== Sichtbares Status-Badge (IMMER) =====
  const badge = document.createElement("div");
  badge.style.cssText =
    "position:fixed;top:18px;right:18px;z-index:2147483647;" +
    "background:#ff0000;color:#fff;padding:10px 14px;border-radius:10px;" +
    "font:14px/1.2 system-ui;font-weight:800;box-shadow:0 10px 30px rgba(0,0,0,.35)";
  badge.textContent = "JS: geladen…";
  // defer => body existiert
  document.body.appendChild(badge);

  const setBadge = (txt) => (badge.textContent = txt);

  const € = (n) => `${Math.round(n)} €`;
  const parseNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // ===== Elemente (extra tolerant, falls irgendwo Tippfehler sind) =====
  const modal =
    document.getElementById("modal") ||
    document.getElementById("moda1") || // fallback falls typo im Repo ist
    document.querySelector(".modal");

  const form =
    document.getElementById("reserveForm") ||
    document.getElementById("reservForm") || // fallback
    document.querySelector("form#reserveForm");

  // Wenn Modal/Form nicht existieren, sind wir auf Detailseiten → ok
  if (!modal || !form) {
    setBadge("JS: OK (Detailseite)");
    badge.style.background = "#16a34a";
    return;
  }

  // Jetzt sind wir auf index.html
  setBadge("JS: OK (Index) – warte Klick…");
  badge.style.background = "#16a34a";

  const titleEl = document.getElementById("mTitle");
  const priceHintEl = document.getElementById("mPriceHint");
  const fMaschine = document.getElementById("fMaschine");

  const fMode = document.getElementById("fMode");
  const driverOption = document.getElementById("driverOption");
  const hoursWrap = document.getElementById("hoursWrap");
  const fHours = document.getElementById("fHours");

  const dateWrap = document.getElementById("dateWrap");
  const fFrom = document.getElementById("fFrom");
  const fTo = document.getElementById("fTo");

  const fDeliveryType = document.getElementById("fDeliveryType");
  const kmWrap = document.getElementById("kmWrap");
  const fKmBand = document.getElementById("fKmBand");

  const fuelWrap = document.getElementById("fuelWrap");
  const fFuelNotFull = document.getElementById("fFuelNotFull");

  const calcLine = document.getElementById("calcLine");
  const totalPrice = document.getElementById("totalPrice");

  // ===== Harte Validierung: wenn was fehlt, zeigen wir’s im Badge =====
  const required = [
    ["mTitle", titleEl],
    ["mPriceHint", priceHintEl],
    ["fMaschine", fMaschine],
    ["fMode", fMode],
    ["driverOption", driverOption],
    ["hoursWrap", hoursWrap],
    ["fHours", fHours],
    ["dateWrap", dateWrap],
    ["fFrom", fFrom],
    ["fTo", fTo],
    ["fDeliveryType", fDeliveryType],
    ["kmWrap", kmWrap],
    ["fKmBand", fKmBand],
    ["fuelWrap", fuelWrap],
    ["fFuelNotFull", fFuelNotFull],
    ["calcLine", calcLine],
    ["totalPrice", totalPrice],
  ];

  const missing = required.filter(([, el]) => !el).map(([id]) => id);
  if (missing.length) {
    badge.style.background = "#b91c1c";
    setBadge("JS FEHLT: " + missing.join(", "));
    // Ohne diese Elemente macht Rechnen/Modal keinen Sinn
    return;
  }

  // ===== Logik =====
  let current = null;
  const DELIVERY_PRICES = [30, 55, 90, null]; // null = auf Anfrage

  const daysBetweenInclusive = (fromStr, toStr) => {
    if (!fromStr || !toStr) return 0;
    const from = new Date(fromStr + "T00:00:00");
    const to = new Date(toStr + "T00:00:00");
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
    const diff = Math.round((to - from) / 86400000);
    return diff >= 0 ? diff + 1 : 0;
  };

  const openModal = () => {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  const setDeliveryVisible = () => {
    const isDelivery = fDeliveryType.value === "delivery";
    kmWrap.hidden = !isDelivery;
    if (!isDelivery) fKmBand.value = "0";
  };

  const setFuelVisible = (fuelSurcharge) => {
    const hasFuel = fuelSurcharge > 0;
    fuelWrap.hidden = !hasFuel;
    if (!hasFuel) fFuelNotFull.checked = false;
  };

  const setDriverVisible = (hasDriver) => {
    driverOption.hidden = !hasDriver;
    if (!hasDriver && fMode.value === "driver") fMode.value = "day";
  };

  const compute = () => {
    if (!current) return;

    const mode = fMode.value;
    let base = 0;
    let line = "";

    if (mode === "driver") {
      const minH = current.driverMinHours || 3;
      let hours = parseNum(fHours.value);
      if (hours < minH) hours = minH;
      fHours.value = String(hours);

      base = hours * current.driverHour;
      line = `${hours} Std × ${€(current.driverHour)} = ${€(base)} (mit Fahrer)`;
    } else {
      const days = daysBetweenInclusive(fFrom.value, fTo.value);
      if (!days) {
        totalPrice.textContent = "0 €";
        calcLine.textContent = "Bitte Zeitraum wählen (Von/Bis)";
        return;
      }

      if (mode === "day") {
        base = days * current.day;
        line = `${days} Tag(e) × ${€(current.day)} = ${€(base)}`;
      } else {
        const weeks = Math.max(1, Math.ceil(days / 7));
        base = weeks * current.week;
        line = `${weeks} Woche(n) × ${€(current.week)} = ${€(base)}`;
      }
    }

    let deliveryLine = "Abholung";
    let deliveryFee = 0;

    if (fDeliveryType.value === "delivery") {
      const band = parseInt(fKmBand.value, 10);
      const price = DELIVERY_PRICES[band];

      if (price == null) {
        calcLine.textContent = `${line} · Lieferung: über 70 km → auf Anfrage`;
        totalPrice.textContent = "auf Anfrage";
        return;
      }

      deliveryFee = price;
      deliveryLine = `Lieferung: + ${€(deliveryFee)}`;
    }

    let fuelFee = 0;
    let fuelLine = "";
    if (current.fuelSurcharge > 0 && fFuelNotFull.checked) {
      fuelFee = current.fuelSurcharge;
      fuelLine = `Tankpauschale: + ${€(fuelFee)}`;
    }

    const total = base + deliveryFee + fuelFee;
    totalPrice.textContent = €(total);

    const parts = [line, deliveryLine];
    if (fuelLine) parts.push(fuelLine);
    calcLine.textContent = parts.join(" · ");
  };

  // ===== Buttons (Event Delegation) =====
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-item]");
    if (!btn) return;

    setBadge("JS: Klick erkannt ✅");
    badge.style.background = "#0ea5e9";

    current = {
      item: btn.dataset.item,
      name: btn.dataset.name || "",
      day: parseNum(btn.dataset.day),
      week: parseNum(btn.dataset.week),
      driverHour: parseNum(btn.dataset.driverHour),
      driverMinHours: parseNum(btn.dataset.driverMinHours) || 3,
      fuelSurcharge: parseNum(btn.dataset.fuelSurcharge),
    };

    titleEl.textContent = current.name || "Maschine";
    fMaschine.value = current.name || "";

    const hint = [];
    if (current.day) hint.push(`${€(current.day)}/Tag`);
    if (current.week) hint.push(`${€(current.week)}/Woche`);
    if (current.driverHour) hint.push(`${€(current.driverHour)}/Std (min. ${current.driverMinHours}h)`);
    priceHintEl.textContent = hint.join(" · ");

    setDriverVisible(current.driverHour > 0);
    setFuelVisible(current.fuelSurcharge);

    fMode.value = "day";
    hoursWrap.hidden = true;
    dateWrap.hidden = false;

    fDeliveryType.value = "pickup";
    setDeliveryVisible();
    fFuelNotFull.checked = false;

    const today = new Date().toISOString().slice(0, 10);
    if (!fFrom.value) fFrom.value = today;
    if (!fTo.value) fTo.value = today;

    openModal();
    compute();
  });

  // Close via data-close="1"
  modal.addEventListener("click", (e) => {
    const t = e.target;
    if (t?.dataset?.close) closeModal();
  });

  // ESC close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  // Recalc
  fMode.addEventListener("change", () => {
    if (!current) return;
    if (fMode.value === "driver") {
      hoursWrap.hidden = false;
      dateWrap.hidden = true;
    } else {
      hoursWrap.hidden = true;
      dateWrap.hidden = false;
    }
    compute();
  });

  [fFrom, fTo].forEach((el) => el.addEventListener("change", compute));
  fHours.addEventListener("input", compute);

  fDeliveryType.addEventListener("change", () => {
    setDeliveryVisible();
    compute();
  });

  fKmBand.addEventListener("change", compute);
  fFuelNotFull.addEventListener("change", compute);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("Danke! Reservierung erfasst. (Mail/Backend als nächster Schritt)");
    closeModal();
  });
})();

// Deep-Link: index.html?reserve=bagger
(() => {
  const params = new URLSearchParams(window.location.search);
  const item = params.get("reserve");
  if (!item) return;

  window.addEventListener("load", () => {
    const btn = document.querySelector(`button[data-item="${item}"]`);
    if (btn) btn.click();
  });
})();
