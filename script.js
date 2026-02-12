// Baumaschinen Funnel – Reservierung/Preislogik
(() => {
  const € = (n) => `${Math.round(n)} €`;

  // ===== Elemente =====
  const modal = document.getElementById("modal");
  const titleEl = document.getElementById("mTitle");
  const priceHintEl = document.getElementById("mPriceHint");

  const form = document.getElementById("reserveForm");
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

  // ===== State (aus Button data-*) =====
  let current = null; // { item,name,day,week,driverHour,driverMinHours,fuelSurcharge }

  const DELIVERY_PRICES = [30, 55, 90, 0]; // 0–20, 21–40, 41–70, >70 auf Anfrage (0 = nicht berechenbar)

  // ===== Utils =====
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

  const parseNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Inclusive day count: Von=2026-02-12, Bis=2026-02-12 => 1 Tag
  const daysBetweenInclusive = (fromStr, toStr) => {
    if (!fromStr || !toStr) return 0;
    const from = new Date(fromStr + "T00:00:00");
    const to = new Date(toStr + "T00:00:00");
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 0;
    const diff = Math.round((to - from) / 86400000);
    return diff >= 0 ? diff + 1 : 0;
  };

  const weeksCeilFromDays = (days) => {
    if (!days) return 0;
    return Math.ceil(days / 7);
  };

  const showDriver = () => {
    driverOption.hidden = false;
    if (fMode.value === "driver") {
      hoursWrap.hidden = false;
      dateWrap.hidden = true;
    }
  };

  const hideDriver = () => {
    driverOption.hidden = true;
    if (fMode.value === "driver") fMode.value = "day";
    hoursWrap.hidden = true;
    dateWrap.hidden = false;
  };

  const setFuelVisible = (fuelSurcharge) => {
    if (fuelSurcharge > 0) {
      fuelWrap.hidden = false;
    } else {
      fuelWrap.hidden = true;
      fFuelNotFull.checked = false;
    }
  };

  const setDeliveryVisible = () => {
    const isDelivery = fDeliveryType.value === "delivery";
    kmWrap.hidden = !isDelivery;
    if (!isDelivery) fKmBand.value = "0";
  };

  // ===== Pricing =====
  const compute = () => {
    if (!current) return;

    const dayPrice = current.day;
    const weekPrice = current.week;
    const driverHour = current.driverHour;
    const driverMinHours = current.driverMinHours;
    const fuelSurcharge = current.fuelSurcharge;

    const mode = fMode.value;

    let base = 0;
    let line = "";

    if (mode === "driver") {
      let hours = parseNum(fHours.value);
      if (hours < driverMinHours) hours = driverMinHours;
      fHours.value = String(hours);
      base = hours * driverHour;
      line = `${hours} Std × ${€(driverHour)} = ${€(base)} (mit Fahrer)`;
    } else {
      const days = daysBetweenInclusive(fFrom.value, fTo.value);

      if (!days) {
        totalPrice.textContent = "0 €";
        calcLine.textContent = "Bitte Zeitraum wählen (Von/Bis)";
        return;
      }

      if (mode === "day") {
        base = days * dayPrice;
        line = `${days} Tag(e) × ${€(dayPrice)} = ${€(base)}`;
      } else if (mode === "week") {
        const weeks = weeksCeilFromDays(days);
        base = weeks * weekPrice;
        line = `${weeks} Woche(n) × ${€(weekPrice)} = ${€(base)} (entspricht ${weeks * 7} Tage)`;
      }
    }

    // Delivery
    let deliveryFee = 0;
    let deliveryLine = "";
    if (fDeliveryType.value === "delivery") {
      const band = parseInt(fKmBand.value, 10);
      deliveryFee = DELIVERY_PRICES[band] ?? 0;

      if (band === 3) {
        deliveryLine = `Lieferung: über 70 km → auf Anfrage`;
        // keine Berechnung für >70 km
      } else {
        deliveryLine = `Lieferung: + ${€(deliveryFee)}`;
      }
    }

    // Fuel
    let fuelFee = 0;
    let fuelLine = "";
    if (fuelSurcharge > 0 && fFuelNotFull.checked) {
      fuelFee = fuelSurcharge;
      fuelLine = `Tankpauschale: + ${€(fuelFee)}`;
    }

    // Total
    const total = base + deliveryFee + fuelFee;
    totalPrice.textContent = €(total);

    const parts = [line];
    if (deliveryLine) parts.push(deliveryLine);
    if (fuelLine) parts.push(fuelLine);
    calcLine.textContent = parts.join(" · ");
  };

  // ===== Bind card buttons =====
  document.querySelectorAll("button[data-item]").forEach((btn) => {
    btn.addEventListener("click", () => {
      current = {
        item: btn.dataset.item,
        name: btn.dataset.name || "",
        day: parseNum(btn.dataset.day),
        week: parseNum(btn.dataset.week),
        driverHour: parseNum(btn.dataset.driverHour),
        driverMinHours: parseNum(btn.dataset.driverMinHours) || 3,
        fuelSurcharge: parseNum(btn.dataset.fuelSurcharge),
      };

      // Fill
      titleEl.textContent = current.name;
      fMaschine.value = current.name;

      // Hint
      const hintParts = [];
      if (current.day) hintParts.push(`${€(current.day)}/Tag`);
      if (current.week) hintParts.push(`${€(current.week)}/Woche`);
      if (current.driverHour) hintParts.push(`${€(current.driverHour)}/Std (min. ${current.driverMinHours}h)`);
      priceHintEl.textContent = hintParts.join(" · ");

      // Driver option only for items with driverHour
      if (current.driverHour > 0) showDriver();
      else hideDriver();

      // Fuel checkbox visible only if surcharge exists
      setFuelVisible(current.fuelSurcharge);

      // Default mode
      fMode.value = "day";
      hoursWrap.hidden = true;
      dateWrap.hidden = false;

      // Reset some fields
      fDeliveryType.value = "pickup";
      setDeliveryVisible();
      fKmBand.value = "0";
      fFuelNotFull.checked = false;

      // Dates: set today/tomorrow if empty (makes it easier)
      const today = new Date();
      const isoToday = today.toISOString().slice(0, 10);
      const tomorrow = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);
      if (!fFrom.value) fFrom.value = isoToday;
      if (!fTo.value) fTo.value = isoToday;

      openModal();
      compute();
    });
  });

  // Close handlers
  modal.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.close) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });

  // Reactivity
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

  // Submit – noch ohne Mail (kommt als nächster Schritt)
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // einfache Bestätigung (für jetzt)
    alert("Danke! Deine Reservierung wurde gespeichert (Mail folgt im nächsten Schritt).");
    closeModal();

    // Optional: Formular zurücksetzen
    // form.reset();
  });
})();
