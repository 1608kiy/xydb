const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SCROLL_SCRUB = 0.95;
const FLOW_EASE = "power4.out";

const CJK_CHAR_RE = /[\u3400-\u9fff]/;
const LATIN_WORD_RE = /^[A-Za-z0-9]+$/;

function splitTextToWords() {
  document.querySelectorAll(".js-split").forEach((el) => {
    if (el.dataset.splitDone) return;
    const shouldSkipSplit = el.matches(".hero-title, .section-title, .panel-title");
    if (shouldSkipSplit) {
      el.dataset.splitDone = "1";
      return;
    }
    const tokens = (el.textContent.trim().match(/[\u3400-\u9fff]|[A-Za-z0-9]+|[^\s]/g) || []);
    el.textContent = "";
    tokens.forEach((token, index) => {
      const span = document.createElement("span");
      span.className = "split-word";
      span.style.display = "inline-block";
      const nextToken = tokens[index + 1] || "";
      const isLatin = LATIN_WORD_RE.test(token);
      const nextIsLatin = LATIN_WORD_RE.test(nextToken);
      const isCjk = CJK_CHAR_RE.test(token);
      const shouldGap = isLatin && (nextIsLatin || CJK_CHAR_RE.test(nextToken));
      span.style.marginRight = shouldGap ? "0.22em" : (isCjk ? "0" : "0.04em");
      span.textContent = token;
      el.appendChild(span);
    });
    el.dataset.splitDone = "1";
  });
}

function initSmoothEngine() {
  if (prefersReducedMotion || !window.Lenis) return null;
  const lenis = new window.Lenis({
    duration: 1.1,
    smoothWheel: true,
    wheelMultiplier: 0.82,
    lerp: 0.085
  });

  lenis.on("scroll", () => {
    if (window.ScrollTrigger) window.ScrollTrigger.update();
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }

  requestAnimationFrame(raf);
  return lenis;
}

function initAnchorScroll(lenis) {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { duration: 1.05, easing: (t) => 1 - Math.pow(1 - t, 3) });
      } else {
        target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      }
    });
  });
}

function initCursor() {
  const fog = document.querySelector(".cursor-fog");
  const cursor = document.querySelector(".cursor");
  const core = document.querySelector(".cursor-core");
  if (!cursor || !core || !fog || window.innerWidth <= 760) return;

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  let coreX = targetX;
  let coreY = targetY;
  let fogX = targetX;
  let fogY = targetY;
  let prevX = targetX;
  let prevY = targetY;

  window.addEventListener("mousemove", (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
  }, { passive: true });

  const hoverTargets = document.querySelectorAll(".interactive, .magnetic, .tilt-surface");
  hoverTargets.forEach((el) => {
    el.addEventListener("mouseenter", () => {
      cursor.classList.add("is-hover");
      gsap.to(cursor, { width: 52, height: 52, borderRadius: 20, opacity: 0.86, duration: 0.44, ease: "power4.out" });
      gsap.to(core, { scale: 0.72, opacity: 0.72, duration: 0.44, ease: "power4.out" });
      gsap.to(fog, { width: 196, height: 196, opacity: 0.46, duration: 0.58, ease: "expo.out" });
    });

    el.addEventListener("mouseleave", () => {
      cursor.classList.remove("is-hover");
      gsap.to(cursor, { width: 36, height: 36, borderRadius: 999, opacity: 0.86, duration: 0.52, ease: "expo.out" });
      gsap.to(core, { scale: 1, opacity: 1, duration: 0.52, ease: "expo.out" });
      gsap.to(fog, { width: 170, height: 170, opacity: 0.34, duration: 0.52, ease: "expo.out" });
    });
  });

  function render() {
    const velocityX = targetX - prevX;
    const velocityY = targetY - prevY;
    const speed = Math.min(Math.hypot(velocityX, velocityY), 36);
    const stretch = speed / 36;
    const rotate = Math.atan2(velocityY, velocityX) * 57.2958;

    const cursorEase = 0.14 + stretch * 0.03;
    const coreEase = 0.24 + stretch * 0.04;
    const fogEase = 0.06;

    currentX += (targetX - currentX) * cursorEase;
    currentY += (targetY - currentY) * cursorEase;
    coreX += (targetX - coreX) * coreEase;
    coreY += (targetY - coreY) * coreEase;
    fogX += (targetX - fogX) * fogEase;
    fogY += (targetY - fogY) * fogEase;

    cursor.style.setProperty("--cursor-sx", (1 + stretch * 0.08).toFixed(3));
    cursor.style.setProperty("--cursor-sy", (1 - stretch * 0.05).toFixed(3));
    cursor.style.setProperty("--cursor-rot", `${rotate.toFixed(2)}deg`);

    fog.style.left = `${fogX}px`;
    fog.style.top = `${fogY}px`;
    cursor.style.left = `${currentX}px`;
    cursor.style.top = `${currentY}px`;
    core.style.left = `${coreX}px`;
    core.style.top = `${coreY}px`;

    prevX = targetX;
    prevY = targetY;
    requestAnimationFrame(render);
  }

  render();
}

function initMagnetic() {
  document.querySelectorAll(".magnetic").forEach((button) => {
    const xTo = gsap.quickTo(button, "x", { duration: 0.56, ease: FLOW_EASE });
    const yTo = gsap.quickTo(button, "y", { duration: 0.56, ease: FLOW_EASE });
    const scaleTo = gsap.quickTo(button, "scale", { duration: 0.42, ease: FLOW_EASE });

    button.addEventListener("mousemove", (event) => {
      const rect = button.getBoundingClientRect();
      const relX = (event.clientX - rect.left) / rect.width - 0.5;
      const relY = (event.clientY - rect.top) / rect.height - 0.5;
      xTo(relX * 9);
      yTo(relY * 6);
      scaleTo(1.015);
    });

    button.addEventListener("mouseleave", () => {
      xTo(0);
      yTo(0);
      scaleTo(1);
    });
  });
}

function initHoverPhysics() {
  if (window.innerWidth <= 1024) return;
  document.querySelectorAll(".tilt-surface").forEach((card) => {
    const rx = gsap.quickTo(card, "rotationX", { duration: 0.7, ease: FLOW_EASE });
    const ry = gsap.quickTo(card, "rotationY", { duration: 0.7, ease: FLOW_EASE });
    const tz = gsap.quickTo(card, "z", { duration: 0.7, ease: FLOW_EASE });
    const scaleTo = gsap.quickTo(card, "scale", { duration: 0.7, ease: FLOW_EASE });

    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const depth = Number(card.dataset.depth || 16);
      ry((px - 0.5) * 3.8);
      rx((0.5 - py) * 2.8);
      tz(depth * 0.42);
      scaleTo(1.008);
    });

    card.addEventListener("mouseleave", () => {
      ry(0);
      rx(0);
      tz(0);
      scaleTo(1);
    });
  });
}

function initNavMotion() {
  if (!window.gsap || !window.ScrollTrigger) return;

  const nav = document.querySelector(".site-nav");
  const underline = document.querySelector(".nav-underline");
  const progressFill = document.querySelector(".nav-progress-fill");
  if (!nav || !underline || !progressFill) return;

  const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
  let activeLink = links[0] || null;

  function moveUnderline(link, immediate = false) {
    if (!link) return;
    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const x = linkRect.left - navRect.left;
    const width = linkRect.width;

    gsap.to(underline, {
      x,
      width,
      opacity: 1,
      duration: immediate ? 0.22 : 0.46,
      delay: immediate ? 0 : 0.05,
      ease: "expo.out"
    });
  }

  function setActive(link) {
    if (!link || activeLink === link) return;
    links.forEach((item) => item.classList.remove("is-active"));
    link.classList.add("is-active");
    activeLink = link;
    moveUnderline(link);
  }

  links.forEach((link) => {
    link.addEventListener("mouseenter", () => moveUnderline(link));
    link.addEventListener("focus", () => moveUnderline(link, true));
  });

  nav.addEventListener("mouseleave", () => {
    if (activeLink) moveUnderline(activeLink);
  });

  links.forEach((link) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    ScrollTrigger.create({
      trigger: target,
      start: "top 46%",
      end: "bottom 46%",
      onEnter: () => setActive(link),
      onEnterBack: () => setActive(link)
    });
  });

  if (activeLink) {
    activeLink.classList.add("is-active");
    moveUnderline(activeLink, true);
  }

  gsap.to(progressFill, {
    scaleX: 1,
    ease: "none",
    scrollTrigger: {
      trigger: "main",
      start: "top top",
      end: "bottom bottom",
      scrub: true
    }
  });

  window.addEventListener("resize", () => {
    if (activeLink) moveUnderline(activeLink, true);
  });
}

function createWordRevealTimeline() {
  gsap.utils.toArray(".js-split").forEach((block) => {
    const words = block.querySelectorAll(".split-word");
    if (!words.length) return;
    gsap.set(words, {
      yPercent: 108,
      opacity: 0,
      scale: 0.96,
      rotationZ: 1.1,
      filter: "blur(10px)"
    });

    gsap.timeline({
      scrollTrigger: {
        trigger: block,
        start: "top 92%",
        end: "bottom 42%",
        scrub: SCROLL_SCRUB,
        fastScrollEnd: true,
        invalidateOnRefresh: true
      }
    }).to(words, {
      yPercent: 0,
      opacity: 1,
      scale: 1,
      rotationZ: 0,
      filter: "blur(0px)",
      stagger: {
        each: 0.028,
        from: "start"
      },
      ease: "expo.out",
      duration: 1.25,
      delay: 0.04
    });
  });
}

function createImageRevealTimeline() {
  gsap.utils.toArray(".media-shell").forEach((shell, index) => {
    if (shell.classList.contains("depth-bg")) {
      gsap.set(shell, {
        clipPath: "none",
        y: 0,
        scale: 1,
        rotate: 0,
        opacity: 1,
        filter: "none"
      });
      const depthImage = shell.querySelector("img");
      if (depthImage) {
        gsap.set(depthImage, {
          scale: 1,
          filter: "saturate(1.06) contrast(1.03)"
        });
      }
      return;
    }

    const fromLeft = index % 2 === 0;
    const radius = shell.classList.contains("depth-bg") ? "0px" : "14px";
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: shell,
        start: "top 94%",
        end: "top 24%",
        scrub: SCROLL_SCRUB,
        fastScrollEnd: true,
        invalidateOnRefresh: true
      }
    });

    timeline
      .fromTo(shell, {
        clipPath: fromLeft ? `inset(0 0 100% 0 round ${radius})` : `inset(0 100% 0 0 round ${radius})`,
        y: fromLeft ? 36 : 24,
        scale: 1.08,
        rotate: fromLeft ? -0.45 : 0.45,
        opacity: 0.3,
        filter: "blur(6px)"
      }, {
        clipPath: `inset(0 0 0% 0 round ${radius})`,
        y: 0,
        scale: 1,
        rotate: 0,
        opacity: 1,
        filter: "blur(0px)",
        ease: "expo.out",
        duration: 1.35
      }, 0)
      .fromTo(shell.querySelector("img"), {
        scale: 1.08
      }, {
        scale: 1,
        ease: FLOW_EASE,
        duration: 1.35
      }, 0)
      .to(shell, {
        "--mask-o": 0,
        "--mask-y": "-100%",
        "--mask-x": fromLeft ? "90%" : "-90%",
        ease: FLOW_EASE,
        duration: 1.05
      }, 0);
  });
}

function createStoryFlowTimelines() {
  const heroTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: "#hero",
      start: "top top",
      end: "+=130%",
      scrub: SCROLL_SCRUB,
      fastScrollEnd: true,
      invalidateOnRefresh: true
    }
  });

  heroTimeline
    .to(".hero-title", { yPercent: -9, ease: "none" }, 0)
    .to(".hero-sub", { yPercent: -5, opacity: 0.76, ease: "none" }, 0)
    .to(".hero-visual img", { scale: 1.08, yPercent: -4, ease: "none" }, 0)
    .to(".site-header", { backgroundColor: "rgba(245,243,239,0.86)", borderColor: "rgba(18,18,18,0.14)", ease: "none" }, 0);

  const narrativeTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: "#narrative",
      start: "top top",
      end: "+=320%",
      scrub: SCROLL_SCRUB,
      pin: true,
      anticipatePin: 1,
      fastScrollEnd: true,
      invalidateOnRefresh: true
    }
  });

  narrativeTimeline
    .set(".narrative-panel", { opacity: 0, y: 90, z: -120, scale: 0.94 })
    .fromTo(".depth-back", { opacity: 0.12, scale: 0.95 }, { opacity: 0.3, scale: 1, ease: "none", duration: 1.2 }, 0)
    .fromTo(".depth-front", { opacity: 0.42, yPercent: 12 }, { opacity: 0.22, yPercent: -8, ease: "none", duration: 1.6 }, 0)
    .to(".panel-a", { opacity: 1, y: 0, z: 0, scale: 1, ease: FLOW_EASE, duration: 0.9 }, 0)
    .to(".panel-a", { opacity: 0, y: -80, z: 120, scale: 1.04, ease: "power2.in", duration: 0.8 }, 1.05)
    .to(".panel-b", { opacity: 1, y: 0, z: 0, scale: 1, ease: FLOW_EASE, duration: 0.95 }, 1)
    .to(".panel-b", { opacity: 0, y: -70, z: 130, scale: 1.05, ease: "power2.in", duration: 0.85 }, 2.1)
    .to(".panel-c", { opacity: 1, y: 0, z: 0, scale: 1, ease: "expo.out", duration: 1 }, 2)
    .to(".panel-c", { opacity: 0, y: -30, ease: "power1.out", duration: 0.65 }, 3.1)
    .to(".depth-back", { opacity: 0.22, scale: 1.08, ease: "none", duration: 0.7 }, 3.05)
    .to(".depth-front", { opacity: 0.44, yPercent: -16, ease: "none", duration: 0.7 }, 3.05);

  gsap.utils.toArray(".chapter").forEach((chapter, index) => {
    const media = chapter.querySelector(".chapter-media");
    const copy = chapter.querySelector(".chapter-copy");
    const direction = index % 2 === 0 ? 1 : -1;

    gsap.timeline({
      scrollTrigger: {
        trigger: chapter,
        start: "top 88%",
        end: "bottom 16%",
        scrub: SCROLL_SCRUB,
        fastScrollEnd: true,
        invalidateOnRefresh: true
      }
    })
      .fromTo(copy, { x: 82 * direction, opacity: 0.14 }, { x: 0, opacity: 1, ease: FLOW_EASE, duration: 1.2 }, 0)
      .fromTo(media, { x: -64 * direction, rotateY: -4.5 * direction }, { x: 0, rotateY: 0, ease: FLOW_EASE, duration: 1.35 }, 0)
      .to(chapter, { opacity: 0.78, ease: "none", duration: 0.8 }, 0.8);
  });

  gsap.utils.toArray(".portfolio-card").forEach((card, i) => {
    const speed = 55 + i * 22;
    gsap.timeline({
      scrollTrigger: {
        trigger: card,
        start: "top 92%",
        end: "bottom 20%",
        scrub: SCROLL_SCRUB,
        fastScrollEnd: true,
        invalidateOnRefresh: true
      }
    })
      .fromTo(card, { y: speed * 0.9, opacity: 0.28 }, { y: -speed * 0.12, opacity: 1, ease: FLOW_EASE, duration: 1 }, 0)
      .fromTo(card.querySelector("img"), { scale: 1.14 }, { scale: 1, ease: FLOW_EASE, duration: 1.15 }, 0);
  });
}

function createSectionTransitions() {
  const sections = gsap.utils.toArray("main section");
  sections.forEach((section, index) => {
    if (index === 0 || section.id === "contact" || section.id === "depth" || section.id === "portfolio") return;
    gsap.fromTo(section, {
      y: 42,
      opacity: 0.65,
      filter: "blur(1.5px)"
    }, {
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      duration: 1,
      ease: FLOW_EASE,
      scrollTrigger: {
        trigger: section,
        start: "top 90%",
        end: "top 28%",
        scrub: SCROLL_SCRUB,
        fastScrollEnd: true,
        invalidateOnRefresh: true
      }
    });

    gsap.to(section, {
      y: -44,
      opacity: 0.82,
      scale: 0.995,
      filter: "blur(0px)",
      ease: "power2.inOut",
      scrollTrigger: {
        trigger: section,
        start: "bottom 68%",
        end: "bottom top",
        scrub: SCROLL_SCRUB,
        fastScrollEnd: true,
        invalidateOnRefresh: true
      }
    });
  });
}

function createSceneLifecycleTimelines() {
  const sceneTargets = gsap.utils.toArray("#hero, #flow-a, #flow-b, #portfolio, #contact");
  sceneTargets.forEach((scene) => {
    gsap.timeline({
      scrollTrigger: {
        trigger: scene,
        start: "top 88%",
        end: "bottom top",
        scrub: SCROLL_SCRUB,
        fastScrollEnd: true,
        invalidateOnRefresh: true
      }
    })
      .fromTo(scene, {
        y: 56,
        opacity: 0.52,
        scale: 0.985,
        filter: "blur(1.2px)"
      }, {
        y: 0,
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        ease: "expo.out",
        duration: 0.55
      }, 0)
      .to(scene, {
        y: -28,
        opacity: 0.88,
        scale: 0.998,
        filter: "blur(0px)",
        ease: "power2.inOut",
        duration: 0.45
      }, 0.55);
  });
}

function createHeroActionSequence() {
  const heroButtons = gsap.utils.toArray("#hero .hero-actions .btn");
  if (!heroButtons.length) return;

  gsap.fromTo(heroButtons, {
    y: 20,
    opacity: 0,
    scale: 0.96
  }, {
    y: 0,
    opacity: 1,
    scale: 1,
    ease: "expo.out",
    duration: 0.9,
    stagger: 0.12,
    delay: 0.2
  });
}

function createAmbientMotion() {
  const orbs = gsap.utils.toArray(".bg-orb");
  if (!orbs.length) return;

  gsap.to(".orb-a", {
    yPercent: -16,
    xPercent: 8,
    duration: 9,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });

  gsap.to(".orb-b", {
    yPercent: 14,
    xPercent: -9,
    duration: 11,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });

  gsap.to(".orb-c", {
    yPercent: -10,
    xPercent: 6,
    duration: 10,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });

  gsap.timeline({
    scrollTrigger: {
      trigger: "main",
      start: "top top",
      end: "bottom bottom",
      scrub: SCROLL_SCRUB,
      fastScrollEnd: true,
      invalidateOnRefresh: true
    }
  })
    .to(".ambient-layer", { opacity: 0.7, ease: "none", duration: 0.4 }, 0)
    .to(".ambient-layer", { opacity: 1, ease: "none", duration: 0.6 }, 0.45);
}

function initDynamicGridMotion() {
  const grid = document.querySelector(".dynamic-grid");
  if (!grid || !window.gsap) return;
  const cards = Array.from(grid.querySelectorAll(".portfolio-card"));
  if (!cards.length) return;

  const xTo = gsap.quickTo(grid, "--grid-x", { duration: 1.05, ease: FLOW_EASE });
  const yTo = gsap.quickTo(grid, "--grid-y", { duration: 1.05, ease: FLOW_EASE });

  grid.addEventListener("mousemove", (event) => {
    const rect = grid.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    xTo((px * 1.12).toFixed(3));
    yTo((py * 1.12).toFixed(3));
  });

  grid.addEventListener("mouseleave", () => {
    xTo(0);
    yTo(0);
    grid.classList.remove("is-focused");
    cards.forEach((card) => card.classList.remove("is-active"));
  });

  cards.forEach((card) => {
    card.addEventListener("mouseenter", () => {
      grid.classList.add("is-focused");
      cards.forEach((item) => item.classList.remove("is-active"));
      card.classList.add("is-active");
    });
  });
}

function initPageTransitions() {
  const layer = document.querySelector(".page-transition");
  if (!layer) return;

  function leaveTransition(url) {
    if (window.gsap && !prefersReducedMotion) {
      gsap.timeline()
        .set(layer, { pointerEvents: "auto" })
        .to(layer, { opacity: 1, scale: 1, duration: 0.5, ease: "power2.inOut" })
        .call(() => { window.location.href = url; });
      return;
    }
    layer.style.opacity = "1";
    window.setTimeout(() => { window.location.href = url; }, 260);
  }

  if (window.gsap && !prefersReducedMotion) {
    gsap.set(layer, { opacity: 1, scale: 1.04 });
    gsap.to(layer, { opacity: 0, scale: 1, duration: 1, ease: FLOW_EASE });
  } else {
    layer.style.opacity = "0";
  }

  document.querySelectorAll('a[href]').forEach((link) => {
    const href = link.getAttribute("href");
    if (!href) return;
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    if (link.target === "_blank" || link.hasAttribute("download")) return;
    link.addEventListener("click", (event) => {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      event.preventDefault();
      leaveTransition(url.href);
    });
  });
}

function createCinematicTransitions() {
  const shutter = document.querySelector(".cinematic-shutter");
  if (!shutter || !window.gsap || !window.ScrollTrigger) return;

  const sections = gsap.utils.toArray("main section");
  sections.forEach((section, index) => {
    if (index === 0) return;
    ScrollTrigger.create({
      trigger: section,
      start: "top 62%",
      end: "top 52%",
      onEnter: () => {
        gsap.fromTo(shutter,
          { opacity: 0, scale: 1.04 },
          { opacity: 0.28, scale: 1, duration: 0.34, ease: "power2.out", yoyo: true, repeat: 1 }
        );
      },
      onEnterBack: () => {
        gsap.fromTo(shutter,
          { opacity: 0, scale: 1.04 },
          { opacity: 0.22, scale: 1, duration: 0.28, ease: "power2.out", yoyo: true, repeat: 1 }
        );
      }
    });
  });
}

function initGsapSystem() {
  if (!window.gsap || !window.ScrollTrigger || prefersReducedMotion) return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: FLOW_EASE, overwrite: "auto" });
  ScrollTrigger.defaults({
    fastScrollEnd: true,
    invalidateOnRefresh: true
  });
  gsap.ticker.lagSmoothing(800, 16);
  ScrollTrigger.config({ ignoreMobileResize: true });

  createWordRevealTimeline();
  createImageRevealTimeline();
  createStoryFlowTimelines();
  createSectionTransitions();
  createSceneLifecycleTimelines();
  createAmbientMotion();
  initNavMotion();
  initDynamicGridMotion();
  createCinematicTransitions();
  createHeroActionSequence();

  ScrollTrigger.refresh();
}

function initFallbackForNoGsap() {
  if (window.gsap && window.ScrollTrigger && !prefersReducedMotion) return;
  document.querySelectorAll(".split-word").forEach((word, index) => {
    word.style.transform = "translate3d(0, 0, 0)";
    word.style.opacity = "1";
    word.style.filter = "blur(0px)";
    word.style.transition = `all 0.65s cubic-bezier(0.22,1,0.36,1) ${index * 18}ms`;
  });
  document.querySelectorAll(".media-shell").forEach((shell) => {
    shell.style.clipPath = "inset(0 0 0 0)";
    shell.style.transform = "translate3d(0, 0, 0) scale(1)";
    shell.style.filter = "blur(0px)";
    shell.style.setProperty("--mask-o", "0");
  });
}

function bootstrap() {
  initPageTransitions();
  splitTextToWords();
  const lenis = initSmoothEngine();
  initAnchorScroll(lenis);

  if (window.gsap && !prefersReducedMotion) {
    initCursor();
    initMagnetic();
    initHoverPhysics();
  }

  initGsapSystem();
  initFallbackForNoGsap();
}

bootstrap();
