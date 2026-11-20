(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const body = document.body;
  const lab = document.getElementById("lab");
  const progress = document.querySelector(".progress i");
  const r1 = document.querySelector(".ribbon-1");
  const r2 = document.querySelector(".ribbon-2");
  const nav = document.querySelector(".nav");
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".navlinks");

  function closeNavigation(returnFocus = false){
    if (!nav || !navToggle) return;
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open navigation");
    if (returnFocus) navToggle.focus();
  }

  navToggle?.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    nav.classList.toggle("is-open", !isOpen);
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
  });

  navLinks?.addEventListener("click", event => {
    if (event.target.closest("a")) closeNavigation();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && nav?.classList.contains("is-open")) closeNavigation(true);
  });

  document.addEventListener("click", event => {
    if (nav?.classList.contains("is-open") && !nav.contains(event.target)) closeNavigation();
  });

  // Portfolio chrome stays hidden during the immersive lab intro.
  function updateMode(){
    const trigger = Math.max(120, lab.offsetHeight * .58);
    if (scrollY > trigger) {
      body.classList.remove("lab-active");
      body.classList.add("portfolio-active");
    } else {
      body.classList.add("lab-active");
      body.classList.remove("portfolio-active");
    }
  }

  // Reveal content smoothly when entering view (fast threshold for mobile/landscape).
  const reveals = [...document.querySelectorAll("[data-reveal]")];
  const revealNow = el => el.classList.add("in");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          revealNow(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, {threshold:.02, rootMargin:"0px 0px 4% 0px"});
    reveals.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < innerHeight * 1.02) revealNow(el);
      else observer.observe(el);
    });
  } else {
    reveals.forEach(revealNow);
  }

  // Metrics count once.
  const counterState = new WeakSet();
  const counters = [...document.querySelectorAll("[data-count]")];
  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting || counterState.has(entry.target)) return;
      counterState.add(entry.target);
      const el = entry.target;
      const end = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || "";
      const start = performance.now();
      const dur = 880;
      function tick(now){
        const p = Math.min(1,(now-start)/dur);
        const e = 1-Math.pow(1-p,3);
        const v = end*e;
        if (end < 2) el.textContent = v.toFixed(4)+suffix;
        else if (end < 30) el.textContent = v.toFixed(1)+suffix;
        else el.textContent = v.toFixed(2)+suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      counterObserver.unobserve(el);
    });
  }, {threshold:.42});
  counters.forEach(el => counterObserver.observe(el));

  // Anchor navigation: native fast scroll, smooth jumps only.
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      closeNavigation();
      const el = document.querySelector(a.getAttribute("href"));
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({behavior:reduce?"auto":"smooth",block:"start"});
    });
  });

  // Refined project/portrait depth.
  document.querySelectorAll(".tilt").forEach(card => {
    const isPortrait = card.classList.contains("portrait-card");
    let portraitTimer;
    let holoRaf = 0;
    let holoCurrentX = 50;
    let holoCurrentY = 50;
    let holoTargetX = 50;
    let holoTargetY = 50;
    const moveHoloSpotlight = () => {
      holoCurrentX += (holoTargetX - holoCurrentX) * .38;
      holoCurrentY += (holoTargetY - holoCurrentY) * .38;
      card.style.setProperty("--holo-x",holoCurrentX.toFixed(2)+"%");
      card.style.setProperty("--holo-y",holoCurrentY.toFixed(2)+"%");
      if (Math.abs(holoTargetX - holoCurrentX) > .08 || Math.abs(holoTargetY - holoCurrentY) > .08) {
        holoRaf = requestAnimationFrame(moveHoloSpotlight);
      } else {
        holoCurrentX = holoTargetX;
        holoCurrentY = holoTargetY;
        card.style.setProperty("--holo-x",holoCurrentX.toFixed(2)+"%");
        card.style.setProperty("--holo-y",holoCurrentY.toFixed(2)+"%");
        holoRaf = 0;
      }
    };
    const setHoloTarget = (x,y) => {
      holoTargetX = x;
      holoTargetY = y;
      if (!holoRaf) holoRaf = requestAnimationFrame(moveHoloSpotlight);
    };
    const setPortraitAura = e => {
      if (!isPortrait || reduce) return;
      const r = card.getBoundingClientRect();
      const px = Math.max(0, Math.min(1, (e.clientX-r.left)/r.width));
      const py = Math.max(0, Math.min(1, (e.clientY-r.top)/r.height));
      card.classList.add("portrait-active");
      card.style.setProperty("--aura-x",(px*100).toFixed(2)+"%");
      card.style.setProperty("--aura-y",(py*100).toFixed(2)+"%");
      setHoloTarget(px*100,py*100);
      card.style.setProperty("--portrait-img-x",((px-.5)*10).toFixed(2)+"px");
      card.style.setProperty("--portrait-img-y",((py-.5)*10).toFixed(2)+"px");
      card.style.setProperty("--portrait-img-scale","1.12");
    };
    const resetPortrait = () => {
      if (!isPortrait) return;
      card.classList.remove("portrait-active");
      card.classList.remove("is-pressed");
      card.style.setProperty("--aura-x","50%");
      card.style.setProperty("--aura-y","50%");
      setHoloTarget(50,50);
      card.style.setProperty("--portrait-img-x","0px");
      card.style.setProperty("--portrait-img-y","0px");
      card.style.setProperty("--portrait-img-scale","1.09");
    };
    card.addEventListener("pointermove", e => {
      if (reduce) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX-r.left)/r.width-.5;
      const y = (e.clientY-r.top)/r.height-.5;
      setPortraitAura(e);
      if (innerWidth < 641 || e.pointerType === "touch") return;
      card.style.transform =
        `perspective(1100px) rotateX(${(-y*3.8).toFixed(2)}deg) rotateY(${(x*5.2).toFixed(2)}deg) translateY(-2px)`;
    });
    card.addEventListener("pointerenter", () => {
      if (isPortrait && !reduce) {
        card.classList.add("portrait-active");
      }
    });
    card.addEventListener("pointerdown", e => {
      if (!isPortrait || reduce) return;
      clearTimeout(portraitTimer);
      card.classList.add("is-pressed");
      setPortraitAura(e);
      if (innerWidth < 641 || e.pointerType === "touch") {
        portraitTimer = setTimeout(resetPortrait, 1400);
      }
    }, {passive:true});
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
      resetPortrait();
    });
  });

  // Magnetic controls.
  document.querySelectorAll(".magnetic").forEach(el => {
    el.addEventListener("pointermove", e => {
      if (innerWidth < 760 || reduce) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX-(r.left+r.width/2);
      const dy = e.clientY-(r.top+r.height/2);
      el.style.transform = `translate(${dx*.055}px,${dy*.055}px)`;
      el.style.setProperty("--bx",(e.clientX-r.left)+"px");
      el.style.setProperty("--by",(e.clientY-r.top)+"px");
    });
    el.addEventListener("pointerleave", () => el.style.transform = "");
  });

  // Custom cursor runs only on fine-pointer desktop devices; mobile/touch uses native pointers.
  const finePointer = matchMedia("(pointer: fine) and (hover: hover)").matches;
  const cursor = document.querySelector(".cursor");
  const dot = document.querySelector(".cursor-dot");
  const trail = document.querySelector(".cursor-trail");
  let cx=innerWidth/2, cy=innerHeight/2, tx=cx, ty=cy, gx=cx, gy=cy;
  let lastX=tx, lastY=ty, cursorMoveTimer=0;
  let lastCursorFrame=performance.now();

  if (finePointer) {
    addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse") return;
      tx=e.clientX; ty=e.clientY;
      const dx = tx-lastX;
      const dy = ty-lastY;
      const speed = Math.min(34, Math.hypot(dx,dy));
      const angle = Math.atan2(dy,dx) * 180 / Math.PI;
      lastX = tx;
      lastY = ty;
      document.documentElement.style.setProperty("--mx",e.clientX+"px");
      document.documentElement.style.setProperty("--my",e.clientY+"px");
      document.documentElement.style.setProperty("--cursor-speed",speed.toFixed(2)+"px");
      document.documentElement.style.setProperty("--cursor-angle",angle.toFixed(2)+"deg");
      body.classList.add("cursor-moving");
      clearTimeout(cursorMoveTimer);
      cursorMoveTimer = setTimeout(() => body.classList.remove("cursor-moving"), 140);
      if (dot) dot.style.transform=`translate3d(${tx}px,${ty}px,0) translate(-50%,-50%)`;
    }, {passive:true});

    addEventListener("pointerdown", e => { if (e.pointerType === "mouse") body.classList.add("cursor-down"); }, {passive:true});
    addEventListener("pointerup", () => body.classList.remove("cursor-down"), {passive:true});
    addEventListener("pointercancel", () => body.classList.remove("cursor-down"), {passive:true});
  }

  const interactiveItems = document.querySelectorAll(
    "a,.project,.service-card,.stack-card,.stack-node,.stack-core,.paper,.mini-project,.cert,.metric-card,.profile-mini,.detail-card,.clarity-callout,.skill-pill,.social-orb,.btn,.tilt"
  );

  interactiveItems.forEach(el => {
    el.addEventListener("pointerenter",()=>body.classList.add("hovering"));
    el.addEventListener("pointerleave",()=>body.classList.remove("hovering"));
  });

  document.querySelectorAll(".portrait-card").forEach(el => {
    el.addEventListener("pointerenter",()=>body.classList.add("profile-cursor-safe"));
    el.addEventListener("pointerleave",()=>body.classList.remove("profile-cursor-safe"));
    el.addEventListener("pointercancel",()=>body.classList.remove("profile-cursor-safe"));
  });

  const setInteractionPoint = (el, e) => {
    const point = e.touches?.[0] || e.changedTouches?.[0] || e;
    if (!point || point.clientX == null) return;
    const r = el.getBoundingClientRect();
    const x = point.clientX - r.left;
    const y = point.clientY - r.top;
    const nx = Math.max(-.5, Math.min(.5, x / r.width - .5));
    const ny = Math.max(-.5, Math.min(.5, y / r.height - .5));
    el.style.setProperty("--sx", x + "px");
    el.style.setProperty("--sy", y + "px");
    el.style.setProperty("--motion-x", (nx * 12).toFixed(2) + "px");
    el.style.setProperty("--motion-y", (ny * 9).toFixed(2) + "px");
  };

  document.querySelectorAll(".project,.service-card,.stack-card,.stack-node,.stack-core,.paper,.mini-project,.cert,.metric-card,.profile-mini,.detail-card,.clarity-callout,.skill-pill,.social-orb,.btn").forEach(el => {
    let pressTimer = 0;
    const delayedClear = () => {
      clearTimeout(pressTimer);
      pressTimer = setTimeout(() => el.classList.remove("is-pressed"), 620);
    };
    const clearPressed = e => {
      if (e?.pointerType === "touch" || e?.type?.startsWith("touch")) {
        delayedClear();
        return;
      }
      clearTimeout(pressTimer);
      el.classList.remove("is-pressed");
    };
    const setPressed = e => {
      clearTimeout(pressTimer);
      setInteractionPoint(el, e);
      el.classList.add("is-pressed");
      if (e?.pointerType === "touch" || e?.type === "touchstart") delayedClear();
    };
    el.addEventListener("pointerdown", setPressed, {passive:true});
    el.addEventListener("pointerup", clearPressed, {passive:true});
    el.addEventListener("pointercancel", clearPressed, {passive:true});
    el.addEventListener("pointerleave", clearPressed, {passive:true});
    el.addEventListener("mousedown", setPressed, {passive:true});
    el.addEventListener("mouseup", clearPressed, {passive:true});
    el.addEventListener("touchstart", setPressed, {passive:true});
    el.addEventListener("touchend", clearPressed, {passive:true});
    el.addEventListener("touchcancel", clearPressed, {passive:true});
  });

  // Spotlight values for cards.
  document.querySelectorAll(".project,.service-card,.stack-card,.stack-node,.stack-core,.paper,.mini-project,.cert,.metric-card,.profile-mini,.detail-card,.clarity-callout,.profile-panel,.social-orb").forEach(card => {
    card.addEventListener("pointermove", e => {
      setInteractionPoint(card, e);
    });
    card.addEventListener("touchstart", e => setInteractionPoint(card, e), {passive:true});
  });

  let lastScrollPos = -1;
  function updateScrollDriven(){
    if (scrollY === lastScrollPos) return;
    lastScrollPos = scrollY;
    const max = Math.max(1,document.documentElement.scrollHeight-innerHeight);
    const p = scrollY/max;
    if (progress) progress.style.width = (p*100)+"%";
    if (r1) r1.style.transform=`translate3d(${-p*360}px,0,0)`;
    if (r2) r2.style.transform=`translate3d(${(-18+p*23)}%,0,0)`;
    updateMode();
  }

  function frame(now=performance.now()){
    updateScrollDriven();
    if (finePointer) {
      const dt = Math.min(48, Math.max(16, now-lastCursorFrame));
      lastCursorFrame = now;
      const ringEase = 1 - Math.pow(.0008, dt / 72);
      const trailEase = 1 - Math.pow(.002, dt / 110);
      if (cursor) {
        cx += (tx-cx)*ringEase;
        cy += (ty-cy)*ringEase;
        cursor.style.transform=`translate3d(${cx}px,${cy}px,0) translate(-50%,-50%)`;
      }
      if (trail) {
        gx += (tx-gx)*trailEase;
        gy += (ty-gy)*trailEase;
        trail.style.transform=`translate3d(${gx}px,${gy}px,0) translate(-50%,-50%) rotate(var(--cursor-angle,0deg))`;
      }
      const inLab = scrollY < lab.offsetHeight*.92;
      if (cursor) cursor.style.opacity = inLab ? "0" : ".74";
      if (dot) dot.style.opacity = inLab ? "0" : ".58";
      if (trail) trail.style.opacity = inLab ? "0" : "";
      requestAnimationFrame(frame);
    }
  }

  addEventListener("resize", () => { lastScrollPos = -1; updateScrollDriven(); }, {passive:true});
  if (!finePointer) {
    addEventListener("scroll", updateScrollDriven, {passive:true});
  }

  updateScrollDriven();
  if (finePointer) requestAnimationFrame(frame);

  // Contact form: low-latency submission + copy email + mailto fallback.
  const copyBtn = document.querySelector(".copy-email-btn");
  if (copyBtn) {
    let copyTimer = 0;
    copyBtn.addEventListener("click", async () => {
      const email = copyBtn.dataset.email || "hhnain1006@gmail.com";
      const label = copyBtn.querySelector(".contact-button-label");
      try {
        await navigator.clipboard.writeText(email);
        if (label) label.textContent = "Copied ✓";
        copyBtn.classList.add("is-copied");
      } catch {
        if (label) label.textContent = email;
      }
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        if (label) label.textContent = "Copy email";
        copyBtn.classList.remove("is-copied");
      }, 2200);
    });
  }

  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    const topicInput = document.getElementById("contact-topic");
    const topicChips = [...contactForm.querySelectorAll(".topic-chip")];
    const nameInput = document.getElementById("contact-name");
    const emailInput = document.getElementById("contact-email");
    const subjectInput = document.getElementById("contact-subject");
    const messageInput = document.getElementById("contact-message");
    const websiteInput = document.getElementById("contact-website");
    const submitBtn = contactForm.querySelector(".contact-submit");
    const submitLabel = submitBtn?.querySelector(".contact-button-label");
    const statusBox = document.getElementById("contact-status");
    const emailRegex = /^[^\s@<>()[\]\\,;:\s@"]+@[^\s@]+\.[^\s@]{2,}$/i;

    topicChips.forEach(chip => {
      chip.addEventListener("click", () => {
        topicChips.forEach(item => item.classList.remove("is-active"));
        chip.classList.add("is-active");
        if (topicInput) topicInput.value = chip.dataset.topic || "General Inquiry";
      });
    });

    const clearFieldErrors = () => {
      [nameInput, emailInput, subjectInput, messageInput].forEach(el => el?.classList.remove("is-invalid"));
    };

    [nameInput, emailInput, subjectInput, messageInput].forEach(el => {
      el?.addEventListener("input", () => el.classList.remove("is-invalid"));
    });

    const showStatus = (kind, text, fallbackHref = "") => {
      if (!statusBox) return;
      statusBox.hidden = false;
      statusBox.className = `form-status ${kind === "success" ? "is-success" : "is-error"}`;
      statusBox.replaceChildren();
      const msgSpan = document.createElement("span");
      msgSpan.textContent = text;
      statusBox.appendChild(msgSpan);
      if (fallbackHref) {
        const link = document.createElement("a");
        link.className = "form-fallback-link";
        link.href = fallbackHref;
        link.textContent = "Open in email app ↗";
        statusBox.appendChild(link);
      }
    };

    contactForm.addEventListener("submit", async event => {
      event.preventDefault();
      clearFieldErrors();
      if (submitBtn?.disabled) return;

      const name = (nameInput?.value || "").trim();
      const email = (emailInput?.value || "").trim();
      const topic = (topicInput?.value || "Collaboration").trim();
      const subject = (subjectInput?.value || "").trim();
      const message = (messageInput?.value || "").trim();
      const website = (websiteInput?.value || "").trim();

      if (name.length < 2) {
        nameInput?.classList.add("is-invalid");
        nameInput?.focus();
        showStatus("error", "Please enter your name (at least 2 characters).");
        return;
      }
      if (!emailRegex.test(email)) {
        emailInput?.classList.add("is-invalid");
        emailInput?.focus();
        showStatus("error", "Please enter a valid email address.");
        return;
      }
      if (subject.length < 2) {
        subjectInput?.classList.add("is-invalid");
        subjectInput?.focus();
        showStatus("error", "Please add a short subject line.");
        return;
      }
      if (message.length < 5) {
        messageInput?.classList.add("is-invalid");
        messageInput?.focus();
        showStatus("error", "Please write a brief message (at least 5 characters).");
        return;
      }

      const mailtoFallback =
        "mailto:hhnain1006@gmail.com?subject=" +
        encodeURIComponent(`[${topic}] ${subject}`) +
        "&body=" +
        encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);

      if (submitBtn) submitBtn.disabled = true;
      submitBtn?.classList.add("is-loading");
      if (submitLabel) submitLabel.textContent = "Sending...";
      if (statusBox) statusBox.hidden = true;

      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, topic, subject, message, website })
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data?.ok) {
          if (data?.field === "name") nameInput?.classList.add("is-invalid");
          if (data?.field === "email") emailInput?.classList.add("is-invalid");
          if (data?.field === "subject") subjectInput?.classList.add("is-invalid");
          if (data?.field === "message") messageInput?.classList.add("is-invalid");
          showStatus(
            "error",
            data?.error || "Could not deliver right now.",
            response.status >= 500 || response.status === 404 ? mailtoFallback : ""
          );
          return;
        }

        const speedNote = typeof data.latencyMs === "number" ? ` (${data.latencyMs}ms)` : "";
        showStatus("success", `Message delivered to Hasnain${speedNote}. I'll reply to ${email} soon.`);
        contactForm.reset();
        topicChips.forEach((chip, idx) => chip.classList.toggle("is-active", idx === 0));
        if (topicInput && topicChips[0]) topicInput.value = topicChips[0].dataset.topic || "Research Collaboration";
      } catch {
        showStatus("error", "Network unavailable. You can still send via email:", mailtoFallback);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        submitBtn?.classList.remove("is-loading");
        if (submitLabel) submitLabel.textContent = "Send message";
      }
    });
  }
})();
