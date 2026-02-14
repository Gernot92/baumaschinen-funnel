// script.js — FINAL (Safari/Vercel-safe)
(() => {
  const badge = document.createElement("div");
  badge.style.cssText =
    "position:fixed;top:18px;right:18px;z-index:2147483647;" +
    "background:#ff0000;color:#fff;padding:10px 14px;border-radius:10px;" +
    "font:14px/1.2 system-ui;font-weight:800;box-shadow:0 10px 30px rgba(0,0,0,.35)";
  const setBadge = (t) => (badge.textContent = t);

  // NIE an body hängen (kann in Safari timing-mäßig null sein)
  document.documentElement.appendChild(badge);
  setBadge("JS: geladen…");

  const € = (n) => `${Math.round(n)} €`;
  const parseNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const run = () => {
    const modal = document.getElementById("modal") || document.querySelector(".modal");
    const form = document.getElementById("reserveForm");

    if (!modal || !form) {
      badge.style.background = "#16a34a";
      setBadge("JS: OK (Detailseite)");
      return;
    }

    badge.style.background = "#16a34a";
    setBadge("JS: OK (Index) – warte Klick…");

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

    const required = [
      titleEl, priceHintEl, fMaschine, fMode, driverOption, hoursWrap, fHours,
      dateWrap, fFrom, fTo, fDeliveryType, kmWrap, fKmBand, fuelWrap, fFuelNotFull,
      calcLine, totalPrice
    ];
    if (required.some((x) => !x)) {
      badge.style.background = "#b91c1c";
      setBadge("JS: FEHLENDE FELDER (DOM)");
      return;
    }

    let current = null;
    const DELIVERY_PRICES = [30, 55, 90, null];

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

    // Buttons (delegation)
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-item]");
      if (!btn) return;

      badge.style.background = "#0ea5e9";
      setBadge("JS: Klick erkannt ✅");

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

    modal.addEventListener("click", (e) => {
      const t = e.target;
      if (t?.dataset?.close) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
    });

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

    // Deep-link
    const params = new URLSearchParams(window.location.search);
    const item = params.get("reserve");
    if (item) {
      window.addEventListener("load", () => {
        const b = document.querySelector(`button[data-item="${item}"]`);
        if (b) b.click();
      });
    }
  };

  // DOM-ready (extra safe)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      try { run(); } catch (err) {
        badge.style.background = "#b91c1c";
        setBadge("JS ERROR: " + (err?.message || String(err)));
      }
    });
  } else {
    try { run(); } catch (err) {
      badge.style.background = "#b91c1c";
      setBadge("JS ERROR: " + (err?.message || String(err)));
    }
  }
})();
