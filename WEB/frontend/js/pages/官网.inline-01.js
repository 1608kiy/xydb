
    (function () {
      var menuBtn = document.getElementById("menuBtn"), topNav = document.getElementById("topNav"), navLinks = topNav ? topNav.querySelectorAll("a") : [];
      var progress = document.getElementById("progress"), cursor = document.getElementById("cursor");

      if (menuBtn && topNav) {
        menuBtn.addEventListener("click", function () { topNav.classList.toggle("open"); });
        navLinks.forEach(function (a) { a.addEventListener("click", function () { topNav.classList.remove("open"); }); });
      }

      if (cursor && window.matchMedia("(pointer:fine)").matches) {
        cursor.style.opacity = ".95";
        document.addEventListener("mousemove", function (e) { cursor.style.left = e.clientX + "px"; cursor.style.top = e.clientY + "px"; }, { passive: true });
      }

      var reveals = document.querySelectorAll("[data-reveal]");
      if ("IntersectionObserver" in window && reveals.length) {
        var io = new IntersectionObserver(function (entries, obs) {
          entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("show"); obs.unobserve(en.target); } });
        }, { threshold: .16 });
        reveals.forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 80 + "ms"; io.observe(el); });
      } else { reveals.forEach(function (el) { el.classList.add("show"); }); }

      var sections = ["lab","bento","flow","go"].map(function (id) { return document.getElementById(id); }).filter(Boolean);
      var items = document.querySelectorAll(".item"), meter = document.getElementById("meter"), ticking = false;
      function onScroll() {
        if (ticking) return; ticking = true;
        requestAnimationFrame(function () {
          var top = window.scrollY || document.documentElement.scrollTop || 0;
          var total = document.documentElement.scrollHeight - window.innerHeight;
          if (progress) progress.style.width = (total > 0 ? top / total * 100 : 0) + "%";
          var cursorY = top + 130, current = "";
          sections.forEach(function (s) { if (cursorY >= s.offsetTop) current = s.id; });
          navLinks.forEach(function (a) { a.classList.toggle("active", (a.getAttribute("href") || "").replace("#","") === current); });
          var active = 0;
          items.forEach(function (it, idx) {
            var r = it.getBoundingClientRect(), hit = r.top <= window.innerHeight * .58 && r.bottom >= window.innerHeight * .28;
            it.classList.toggle("active", hit); if (hit) active = idx + 1;
          });
          if (meter && items.length) meter.style.width = (active / items.length) * 100 + "%";
          ticking = false;
        });
      }
      window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

      var cards = document.querySelectorAll(".pv"), sw = document.querySelectorAll(".sw"), idx = 0, timer = null;
      function loadFrame(i) {
        var frame = cards[i] ? cards[i].querySelector("iframe[data-src]") : null; if (!frame) return;
        frame.src = frame.getAttribute("data-src"); frame.removeAttribute("data-src");
        frame.addEventListener("load", function () { var ld = cards[i].querySelector(".load"); if (ld) ld.style.display = "none"; }, { once: true });
      }
      function activate(i) {
        idx = i; cards.forEach(function (c, n) { c.classList.toggle("active", n === i); });
        sw.forEach(function (b, n) { b.classList.toggle("active", n === i); }); loadFrame(i);
      }
      function start(){ stop(); timer = setInterval(function(){ activate((idx + 1) % cards.length); }, 4200); }
      function stop(){ if (timer) { clearInterval(timer); timer = null; } }
      if (cards.length) {
        activate(0); start();
        sw.forEach(function (b) { b.addEventListener("click", function(){ activate(Number(b.getAttribute("data-target"))); }); });
        var stage = document.getElementById("stage"); if (stage) { stage.addEventListener("mouseenter", stop); stage.addEventListener("mouseleave", start); }
      }

      var collage = document.getElementById("collage"), drifts = document.querySelectorAll(".drift");
      var mx = 0, my = 0, tx = 0, ty = 0, run = false;
      function driftTick() {
        tx += (mx - tx) * .08; ty += (my - ty) * .08;
        drifts.forEach(function (d) { var dep = Number(d.getAttribute("data-depth") || 8); d.style.translate = (tx * dep / 80) + "px " + (ty * dep / 80) + "px"; });
        if (Math.abs(tx - mx) > .08 || Math.abs(ty - my) > .08) requestAnimationFrame(driftTick); else run = false;
      }
      if (collage) {
        collage.addEventListener("mousemove", function(e){
          var r = collage.getBoundingClientRect(); mx = ((e.clientX - r.left) / r.width - .5) * 14; my = ((e.clientY - r.top) / r.height - .5) * 14;
          if (!run) { run = true; requestAnimationFrame(driftTick); }
        });
        collage.addEventListener("mouseleave", function(){ mx = 0; my = 0; if (!run) { run = true; requestAnimationFrame(driftTick); } });
      }

      document.querySelectorAll(".tilt").forEach(function (card) {
        card.addEventListener("mousemove", function (e) {
          var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
          card.style.transform = "perspective(900px) rotateX(" + (-y * 4.5) + "deg) rotateY(" + (x * 6) + "deg) translateY(-4px)";
        });
        card.addEventListener("mouseleave", function () { card.style.transform = ""; });
      });

      document.querySelectorAll(".ripple-btn").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          var s = document.createElement("span"), r = btn.getBoundingClientRect(), size = Math.max(r.width, r.height);
          s.className = "ripple"; s.style.width = size + "px"; s.style.height = size + "px";
          s.style.left = (e.clientX - r.left - size / 2) + "px"; s.style.top = (e.clientY - r.top - size / 2) + "px";
          btn.appendChild(s); setTimeout(function(){ s.remove(); }, 560);
        });
      });
    })();
  
