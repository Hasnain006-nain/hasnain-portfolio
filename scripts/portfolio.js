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
    body.classList.remove("menu-open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open navigation");
    if (returnFocus) navToggle.focus();
  }

  navToggle?.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    nav.classList.toggle("is-open", !isOpen);
    body.classList.toggle("menu-open", !isOpen);
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

  // Refined project/portrait depth + mobile & desktop hologram scan tap/hover reveal.
  document.querySelectorAll(".tilt").forEach(card => {
    const isPortrait = card.classList.contains("portrait-card");
    const mediaEl = isPortrait ? (card.querySelector(".portrait-media") || card) : card;
    const holoEl = isPortrait ? card.querySelector(".portrait-holo") : null;
    let portraitTimer = 0;
    let holoScanRaf = 0;
    let holoRaf = 0;
    let holoCurrentX = 50;
    let holoCurrentY = 50;
    let holoTargetX = 50;
    let holoTargetY = 50;
    const moveHoloSpotlight = () => {
      holoCurrentX += (holoTargetX - holoCurrentX) * .42;
      holoCurrentY += (holoTargetY - holoCurrentY) * .42;
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
    const getPoint = e => e?.touches?.[0] || e?.changedTouches?.[0] || e;
    const getLocalizedLensSize = width => {
      if (width <= 190) return Math.round(Math.max(24, Math.min(36, width * 0.23)));
      return Math.round(Math.max(36, Math.min(52, width * 0.165)));
    };
    const setPortraitAura = (e, sizeOverride) => {
      if (!isPortrait || reduce) return null;
      const pt = getPoint(e);
      if (!pt || pt.clientX == null) return null;
      const r = mediaEl.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      const px = Math.max(0, Math.min(1, (pt.clientX-r.left)/r.width));
      const py = Math.max(0, Math.min(1, (pt.clientY-r.top)/r.height));
      const lensSize = sizeOverride || getLocalizedLensSize(r.width);
      card.classList.add("portrait-active");
      if (holoEl) {
        holoEl.style.setProperty("opacity", "0.94", "important");
        holoEl.style.setProperty("filter", "saturate(1.24) contrast(1.12) brightness(1.06)", "important");
      }
      card.style.setProperty("--aura-x",(px*100).toFixed(2)+"%");
      card.style.setProperty("--aura-y",(py*100).toFixed(2)+"%");
      card.style.setProperty("--holo-size",lensSize+"px");
      setHoloTarget(px*100,py*100);
      card.style.setProperty("--portrait-img-x",((px-.5)*7).toFixed(2)+"px");
      card.style.setProperty("--portrait-img-y",((py-.5)*7).toFixed(2)+"px");
      card.style.setProperty("--portrait-img-scale","1.115");
      return { px: px * 100, py: py * 100, lensSize };
    };
    const resetPortrait = () => {
      if (!isPortrait) return;
      cancelAnimationFrame(holoScanRaf);
      card.classList.remove("portrait-active");
      card.classList.remove("is-pressed");
      if (holoEl) {
        holoEl.style.removeProperty("opacity");
        holoEl.style.removeProperty("filter");
      }
      card.style.setProperty("--aura-x","50%");
      card.style.setProperty("--aura-y","50%");
      card.style.setProperty("--holo-size","38px");
      setHoloTarget(50,50);
      card.style.setProperty("--portrait-img-x","0px");
      card.style.setProperty("--portrait-img-y","0px");
      card.style.setProperty("--portrait-img-scale","1.09");
    };
    const runTapHoloScan = e => {
      if (!isPortrait || reduce) return;
      clearTimeout(portraitTimer);
      cancelAnimationFrame(holoScanRaf);
      card.classList.add("is-pressed","portrait-active");
      const hit = setPortraitAura(e);
      if (!hit) return;
      // Snap spotlight directly to tapped region (forehead/eyes/nose) with subtle localized micro-shimmer
      holoCurrentX = hit.px;
      holoCurrentY = hit.py;
      card.style.setProperty("--holo-x", hit.px.toFixed(2) + "%");
      card.style.setProperty("--holo-y", hit.py.toFixed(2) + "%");
      const t0 = performance.now();
      const stepScan = now => {
        const p = Math.min(1, (now - t0) / 760);
        const sx = Math.max(8, Math.min(92, hit.px + Math.sin(p * Math.PI * 2) * 2.4));
        const sy = Math.max(8, Math.min(92, hit.py + Math.cos(p * Math.PI * 2) * 2.0));
        card.style.setProperty("--aura-x",sx.toFixed(1)+"%");
        card.style.setProperty("--aura-y",sy.toFixed(1)+"%");
        setHoloTarget(sx, sy);
        if (p < 1 && card.classList.contains("is-pressed")) {
          holoScanRaf = requestAnimationFrame(stepScan);
        }
      };
      holoScanRaf = requestAnimationFrame(stepScan);
      portraitTimer = setTimeout(resetPortrait, 2200);
    };
    card.addEventListener("pointermove", e => {
      if (reduce) return;
      const r = mediaEl.getBoundingClientRect();
      const x = (e.clientX-r.left)/r.width-.5;
      const y = (e.clientY-r.top)/r.height-.5;
      if (isPortrait) setPortraitAura(e);
      if (innerWidth < 641 || e.pointerType === "touch") return;
      card.style.transform =
        `perspective(1100px) rotateX(${(-y*3.8).toFixed(2)}deg) rotateY(${(x*5.2).toFixed(2)}deg) translateY(-2px)`;
    });
    mediaEl.addEventListener("pointerenter", e => {
      if (isPortrait && !reduce) setPortraitAura(e);
    });
    mediaEl.addEventListener("pointerdown", e => {
      if (isPortrait && !reduce) runTapHoloScan(e);
    }, {passive:true});
    mediaEl.addEventListener("touchstart", e => {
      if (isPortrait && !reduce) runTapHoloScan(e);
    }, {passive:true});
    mediaEl.addEventListener("touchmove", e => {
      if (isPortrait && !reduce) {
        clearTimeout(portraitTimer);
        cancelAnimationFrame(holoScanRaf);
        card.classList.add("is-pressed","portrait-active");
        setPortraitAura(e);
        portraitTimer = setTimeout(resetPortrait, 1600);
      }
    }, {passive:true});
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
      if (!card.classList.contains("is-pressed")) resetPortrait();
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

  // Robot cursor + subtle smoke plume (active on both desktop and mobile, suppressed over profile portrait).
  const finePointer = matchMedia("(pointer: fine) and (hover: hover)").matches;
  const cursor = document.querySelector(".cursor");
  const dot = document.querySelector(".cursor-dot");
  const trail = document.querySelector(".cursor-trail");
  const smokeLayer = document.querySelector(".cursor-smoke-layer");
  const portraitMediaEls = [...document.querySelectorAll(".portrait-media, .portrait-card")];

  const smokePool = [];
  let smokeIdx = 0;
  let lastSmokeAt = 0;
  let lastSmokeX = -999;
  let lastSmokeY = -999;
  if (smokeLayer && !reduce) {
    for (let i = 0; i < 14; i++) {
      const puff = document.createElement("span");
      puff.className = "cursor-smoke-puff";
      smokeLayer.appendChild(puff);
      smokePool.push(puff);
    }
  }

  const isOverPortrait = (x, y, target) => {
    if (target?.closest?.(".portrait-card, .portrait-media")) return true;
    if (x == null || y == null) return false;
    return portraitMediaEls.some(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 4 && y <= r.bottom + 4;
    });
  };

  const clearSmoke = () => {
    smokePool.forEach(p => {
      p.classList.remove("is-active", "is-flame");
      p.getAnimations?.().forEach(a => a.cancel());
      p.style.opacity = "0";
    });
  };

  const emitSmoke = (x, y) => {
    if (reduce || !smokePool.length || body.classList.contains("profile-cursor-safe")) return;
    const now = performance.now();
    const dist = Math.hypot(x - lastSmokeX, y - lastSmokeY);
    if (now - lastSmokeAt < 44 || dist < 9) return;
    lastSmokeAt = now;
    lastSmokeX = x;
    lastSmokeY = y;
    const idx = smokeIdx++;
    const puff = smokePool[idx % smokePool.length];
    const isFlame = idx % 3 === 0;
    const dx = ((Math.random() - .5) * (isFlame ? 12 : 18)).toFixed(1);
    const dy = (isFlame ? 11 + Math.random() * 8 : 13 + Math.random() * 14).toFixed(1);
    puff.classList.toggle("is-flame", isFlame);
    puff.classList.add("is-active");
    puff.style.left = x.toFixed(1) + "px";
    puff.style.top = (y + 15).toFixed(1) + "px";
    if (typeof puff.animate === "function") {
      puff.getAnimations?.().forEach(a => a.cancel());
      const anim = puff.animate([
        { opacity: isFlame ? 0.56 : 0.30, transform: `translate(-50%,-50%) scale(${isFlame ? 0.55 : 0.48})` },
        { opacity: isFlame ? 0.34 : 0.18, offset: 0.42 },
        { opacity: 0, transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(${isFlame ? 1.35 : 1.82})` }
      ], { duration: isFlame ? 380 : 540, easing: "cubic-bezier(.16,1,.3,1)", fill: "forwards" });
      anim.onfinish = () => puff.classList.remove("is-active");
    } else {
      puff.style.setProperty("--dx", dx + "px");
      puff.style.setProperty("--dy", dy + "px");
    }
  };

  let cx=innerWidth/2, cy=innerHeight/2, tx=cx, ty=cy, gx=cx, gy=cy;
  let lastX=tx, lastY=ty, cursorMoveTimer=0, touchCursorTimer=0;
  let lastCursorFrame=performance.now();

  const updatePointerState = (x, y, target, isTouch = false) => {
    if (x == null || y == null) return;
    tx = x;
    ty = y;
    const dx = tx - lastX;
    const dy = ty - lastY;
    const speed = Math.min(34, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    lastX = tx;
    lastY = ty;
    document.documentElement.style.setProperty("--mx", x + "px");
    document.documentElement.style.setProperty("--my", y + "px");
    document.documentElement.style.setProperty("--cursor-speed", speed.toFixed(2) + "px");
    document.documentElement.style.setProperty("--cursor-angle", angle.toFixed(2) + "deg");
    const safe = isOverPortrait(x, y, target);
    body.classList.toggle("profile-cursor-safe", safe);
    if (safe) {
      clearSmoke();
    } else {
      emitSmoke(x, y);
    }
    if (dot) dot.style.transform = `translate3d(${tx}px,${ty}px,0) translate(-50%,-50%)`;
    if (isTouch) {
      cx = tx;
      cy = ty;
      if (cursor) cursor.style.transform = `translate3d(${cx}px,${cy}px,0) translate(-50%,-50%)`;
      clearTimeout(touchCursorTimer);
      body.classList.add("touch-cursor-active");
      touchCursorTimer = setTimeout(() => body.classList.remove("touch-cursor-active"), 1050);
    } else {
      body.classList.add("cursor-moving");
      clearTimeout(cursorMoveTimer);
      cursorMoveTimer = setTimeout(() => body.classList.remove("cursor-moving"), 140);
    }
  };

  addEventListener("pointermove", e => {
    if (e.pointerType === "mouse") {
      updatePointerState(e.clientX, e.clientY, e.target, false);
    }
  }, {passive:true});

  addEventListener("pointerdown", e => {
    body.classList.add("cursor-down");
    if (e.pointerType !== "mouse") {
      updatePointerState(e.clientX, e.clientY, e.target, true);
    }
  }, {passive:true});
  addEventListener("pointerup", () => body.classList.remove("cursor-down"), {passive:true});
  addEventListener("pointercancel", () => body.classList.remove("cursor-down"), {passive:true});

  addEventListener("touchstart", e => {
    const pt = e.touches?.[0];
    if (pt) updatePointerState(pt.clientX, pt.clientY, e.target, true);
  }, {passive:true});
  addEventListener("touchmove", e => {
    const pt = e.touches?.[0];
    if (pt) updatePointerState(pt.clientX, pt.clientY, e.target, true);
  }, {passive:true});

  const interactiveItems = document.querySelectorAll(
    "a,button,.project,.service-card,.stack-card,.stack-node,.stack-core,.paper,.mini-project,.cert,.cert-extra,.metric-card,.profile-mini,.detail-card,.detail-item,.edu-hero-card,.edu-honor-card,.edu-course-pill,.honor-link,.exp-row,.time-row,.clarity-callout,.skill-pill,.social-orb,.btn,.navcta,.nav-toggle,.navlinks a,.nav-drawer-mail,.nav-drawer-socials a,.brand,.topic-chip,.portrait-bottom,.tilt"
  );

  interactiveItems.forEach(el => {
    el.addEventListener("pointerenter",()=>body.classList.add("hovering"));
    el.addEventListener("pointerleave",()=>body.classList.remove("hovering"));
  });

  document.querySelectorAll(".portrait-card,.portrait-media").forEach(el => {
    el.addEventListener("pointerenter",()=>{body.classList.add("profile-cursor-safe");clearSmoke();});
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

  document.querySelectorAll(".project,.service-card,.stack-card,.stack-node,.stack-core,.paper,.mini-project,.cert,.cert-extra,.metric-card,.profile-mini,.detail-card,.detail-item,.edu-hero-card,.edu-honor-card,.edu-course-pill,.honor-link,.exp-row,.time-row,.clarity-callout,.skill-pill,.social-orb,.contact-email-hero,.contact-copy-inline,.btn,.navcta,.nav-toggle,.navlinks a,.nav-drawer-mail,.nav-drawer-socials a,.brand,.topic-chip,.portrait-bottom,.evidence-link,.about-work-link").forEach(el => {
    let pressTimer = 0;
    const delayedClear = () => {
      clearTimeout(pressTimer);
      pressTimer = setTimeout(() => el.classList.remove("is-pressed"), 820);
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

  // Spotlight values for cards on both desktop hover and mobile touch/drag.
  document.querySelectorAll(".project,.service-card,.stack-card,.stack-node,.stack-core,.paper,.mini-project,.cert,.metric-card,.profile-mini,.detail-card,.detail-item,.edu-hero-card,.edu-honor-card,.exp-row,.time-row,.clarity-callout,.profile-panel,.social-orb,.contact-form-panel").forEach(card => {
    card.addEventListener("pointermove", e => {
      setInteractionPoint(card, e);
    }, {passive:true});
    card.addEventListener("touchstart", e => setInteractionPoint(card, e), {passive:true});
    card.addEventListener("touchmove", e => setInteractionPoint(card, e), {passive:true});
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
      const ringEase = 1 - Math.pow(.0002, dt / 48);
      const trailEase = 1 - Math.pow(.001, dt / 95);
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
      if (cursor) cursor.style.opacity = inLab ? "0" : ".95";
      if (dot) dot.style.opacity = inLab ? "0" : ".72";
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
    const defaultLabel = copyBtn.querySelector(".contact-button-label")?.textContent || "Copy";
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
        if (label) label.textContent = defaultLabel;
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
        if (subjectInput && chip.dataset.placeholder) subjectInput.placeholder = chip.dataset.placeholder;
      });
    });

    const clearFieldErrors = () => {
      [nameInput, emailInput, subjectInput, messageInput].forEach(el => el?.classList.remove("is-invalid"));
    };

    [nameInput, emailInput, subjectInput, messageInput].forEach(el => {
      el?.addEventListener("input", () => el.classList.remove("is-invalid"));
    });

    const showStatus = (kind, text, fallbackHref = "", gmailHref = "", fallbackLabel = "Open in email app ↗") => {
      if (!statusBox) return;
      statusBox.hidden = false;
      statusBox.className = `form-status ${kind === "success" ? "is-success" : "is-error"}`;
      statusBox.replaceChildren();
      const msgSpan = document.createElement("span");
      msgSpan.textContent = text;
      statusBox.appendChild(msgSpan);
      if (gmailHref) {
        const gLink = document.createElement("a");
        gLink.className = "form-fallback-link";
        gLink.href = gmailHref;
        gLink.target = "_blank";
        gLink.rel = "noopener noreferrer";
        gLink.textContent = "Send via Gmail ↗";
        statusBox.appendChild(gLink);
      }
      if (fallbackHref) {
        const link = document.createElement("a");
        link.className = "form-fallback-link";
        link.href = fallbackHref;
        link.textContent = fallbackLabel;
        statusBox.appendChild(link);
      }
    };

    let serverConfigured = null;
    let warmedContactApi = false;
    const warmContactApi = () => {
      if (warmedContactApi) return;
      warmedContactApi = true;
      fetch("/api/contact", { method: "GET", headers: { Accept: "application/json" } })
        .then(r => r.json())
        .then(info => {
          if (typeof info?.configured === "boolean") serverConfigured = info.configured;
        })
        .catch(() => {});
    };
    contactForm.addEventListener("focusin", warmContactApi, { once: true, passive: true });
    contactForm.addEventListener("pointerenter", warmContactApi, { once: true, passive: true });

    const relayThroughBrowser = async (toEmail, payload) => {
      const target = toEmail || "hhnain1006@gmail.com";
      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(target)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          _replyto: payload.email,
          topic: payload.topic,
          _subject: `[Portfolio · ${payload.topic}] ${payload.subject} — ${payload.name}`,
          message: payload.message,
          _template: "box",
          _captcha: "false"
        }),
        signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(5500) : undefined
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || (json?.success !== "true" && json?.success !== true)) {
        const msg = String(json?.message || "");
        const needsActivation = /activate|confirm/i.test(msg);
        const err = new Error(msg || "Direct relay failed");
        err.needsActivation = needsActivation;
        throw err;
      }
      return json;
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

      const fullSubject = `[${topic}] ${subject} — ${name}`;
      const fullBody = `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`;
      const mailtoFallback =
        "mailto:hhnain1006@gmail.com?subject=" +
        encodeURIComponent(fullSubject) +
        "&body=" +
        encodeURIComponent(fullBody);
      const gmailCompose =
        "https://mail.google.com/mail/?view=cm&fs=1&to=hhnain1006@gmail.com&su=" +
        encodeURIComponent(fullSubject) +
        "&body=" +
        encodeURIComponent(fullBody);

      if (submitBtn) submitBtn.disabled = true;
      submitBtn?.classList.add("is-loading");
      if (submitLabel) submitLabel.textContent = "Sending...";
      if (statusBox) statusBox.hidden = true;

      const started = performance.now();

      try {
        if (serverConfigured === false && !website) {
          try {
            await relayThroughBrowser("hhnain1006@gmail.com", { name, email, topic, subject, message });
            const elapsed = Math.round(performance.now() - started);
            showStatus("success", `Message sent to Hasnain (${elapsed}ms). I'll reply to ${email} soon.`);
            contactForm.reset();
            topicChips.forEach((chip, idx) => chip.classList.toggle("is-active", idx === 0));
            if (topicInput && topicChips[0]) topicInput.value = topicChips[0].dataset.topic || "Research Collaboration";
            return;
          } catch (fastErr) {
            if (fastErr?.needsActivation) {
              showStatus(
                "error",
                "One-time activation link sent to hhnain1006@gmail.com — click Activate once, or send right now via Gmail:",
                mailtoFallback,
                gmailCompose,
                "Email app ↗"
              );
              return;
            }
          }
        }

        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, topic, subject, message, website })
        });
        const data = await response.json().catch(() => ({}));

        if (response.ok && data?.ok) {
          const speedNote = typeof data.latencyMs === "number" ? ` (${data.latencyMs}ms)` : "";
          showStatus("success", `Message delivered to Hasnain${speedNote}. I'll reply to ${email} soon.`);
          contactForm.reset();
          topicChips.forEach((chip, idx) => chip.classList.toggle("is-active", idx === 0));
          if (topicInput && topicChips[0]) topicInput.value = topicChips[0].dataset.topic || "Research Collaboration";
          return;
        }

        if (response.status >= 400 && response.status < 500 && data?.field) {
          if (data.field === "name") nameInput?.classList.add("is-invalid");
          if (data.field === "email") emailInput?.classList.add("is-invalid");
          if (data.field === "subject") subjectInput?.classList.add("is-invalid");
          if (data.field === "message") messageInput?.classList.add("is-invalid");
          showStatus("error", data?.error || "Please check the highlighted field.");
          return;
        }

        // Fall back seamlessly to browser FormSubmit relay so Gmail delivery works zero-config.
        try {
          await relayThroughBrowser(data?.toEmail || "hhnain1006@gmail.com", { name, email, topic, subject, message });
          const elapsed = Math.round(performance.now() - started);
          showStatus("success", `Message sent to Hasnain (${elapsed}ms). I'll reply to ${email} soon.`);
          contactForm.reset();
          topicChips.forEach((chip, idx) => chip.classList.toggle("is-active", idx === 0));
          if (topicInput && topicChips[0]) topicInput.value = topicChips[0].dataset.topic || "Research Collaboration";
        } catch (relayErr) {
          const promptText = relayErr?.needsActivation
            ? "One-time activation link sent to hhnain1006@gmail.com — click Activate once, or send right now via Gmail:"
            : "Automatic relay blocked in this browser — send in one click:";
          showStatus("error", promptText, mailtoFallback, gmailCompose, "Email app ↗");
        }
      } catch {
        try {
          await relayThroughBrowser("hhnain1006@gmail.com", { name, email, topic, subject, message });
          const elapsed = Math.round(performance.now() - started);
          showStatus("success", `Message sent to Hasnain (${elapsed}ms). I'll reply to ${email} soon.`);
          contactForm.reset();
          topicChips.forEach((chip, idx) => chip.classList.toggle("is-active", idx === 0));
          if (topicInput && topicChips[0]) topicInput.value = topicChips[0].dataset.topic || "Research Collaboration";
        } catch {
          showStatus("error", "Network unavailable — send in one click:", mailtoFallback, gmailCompose, "Email app ↗");
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        submitBtn?.classList.remove("is-loading");
        if (submitLabel) submitLabel.textContent = "Send message";
      }
    });
  }
})();
