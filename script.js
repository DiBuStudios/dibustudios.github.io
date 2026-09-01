(function () {
  "use strict";

  const panelIds = ["home", "games", "about", "contact"];
  const panels = Array.from(document.querySelectorAll(".panel"));
  const panelLinks = Array.from(document.querySelectorAll(".panel-link"));
  const stage = document.querySelector(".stage");
  const menuButton = document.querySelector(".menu-button");
  const contactForm = document.getElementById("contact-form");
  const exitDuration = 240;
  const enterDuration = 300;

  let activeIndex = 0;
  let transitionLocked = false;
  let queuedPanelId = null;
  let wheelLocked = false;
  let touchStartY = null;
  let touchStartX = null;
  let touchStartScrollY = 0;

  function setMenuOpen(isOpen) {
    document.body.classList.toggle("menu-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  }

  function normalizePanelId(value) {
    const id = value.replace(/^#/, "");
    return panelIds.includes(id) ? id : "home";
  }

  function updateChrome(panelId) {
    panelLinks.forEach(function (link) {
      const isActive = link.dataset.panel === panelId;
      link.classList.toggle("is-active", isActive);
      if (link.closest("nav")) {
        if (isActive) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      }
    });

    document.body.dataset.activePanel = panelId;
  }

  function activateImmediately(panelId) {
    const nextId = normalizePanelId(panelId);
    const nextIndex = panelIds.indexOf(nextId);

    panels.forEach(function (panel) {
      const isActive = panel.id === nextId;
      panel.classList.toggle("is-active", isActive);
      panel.classList.remove("is-entering", "is-exiting");
      panel.setAttribute("aria-hidden", String(!isActive));
      panel.inert = !isActive;
    });

    activeIndex = nextIndex;
    updateChrome(nextId);
  }

  function completeTransition() {
    transitionLocked = false;
    document.body.classList.remove("is-transitioning");

    if (queuedPanelId && queuedPanelId !== panelIds[activeIndex]) {
      const nextId = queuedPanelId;
      queuedPanelId = null;
      transitionToPanel(nextId, false);
    } else {
      queuedPanelId = null;
    }
  }

  function transitionToPanel(panelId, updateHistory) {
    const nextId = normalizePanelId(panelId);
    const nextIndex = panelIds.indexOf(nextId);
    setMenuOpen(false);

    if (updateHistory && window.location.hash !== "#" + nextId) {
      window.history.pushState(null, "", "#" + nextId);
    }

    if (nextIndex === activeIndex && !transitionLocked) {
      return;
    }

    if (transitionLocked) {
      queuedPanelId = nextId;
      return;
    }

    const currentPanel = panels[activeIndex];
    const nextPanel = panels[nextIndex];
    transitionLocked = true;
    document.body.classList.add("is-transitioning");
    currentPanel.classList.add("is-exiting");

    window.setTimeout(function () {
      currentPanel.classList.remove("is-active", "is-exiting");
      currentPanel.setAttribute("aria-hidden", "true");
      currentPanel.inert = true;

      nextPanel.classList.add("is-active", "is-entering");
      nextPanel.setAttribute("aria-hidden", "false");
      nextPanel.inert = false;
      activeIndex = nextIndex;
      updateChrome(nextId);

      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          nextPanel.classList.remove("is-entering");
        });
      });

      window.setTimeout(completeTransition, enterDuration);
    }, exitDuration);
  }

  function movePanel(direction) {
    const nextIndex = Math.min(
      panelIds.length - 1,
      Math.max(0, activeIndex + direction)
    );

    if (nextIndex !== activeIndex) {
      transitionToPanel(panelIds[nextIndex], true);
    }
  }

  panelLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      setMenuOpen(false);
      transitionToPanel(link.dataset.panel, true);
    });
  });

  menuButton.addEventListener("click", function () {
    setMenuOpen(!document.body.classList.contains("menu-open"));
  });

  stage.addEventListener("pointerdown", function () {
    if (document.body.classList.contains("menu-open")) {
      setMenuOpen(false);
    }
  });

  window.addEventListener("hashchange", function () {
    transitionToPanel(window.location.hash, false);
  });

  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && document.body.classList.contains("menu-open")) {
      setMenuOpen(false);
      menuButton.focus();
      return;
    }

    if (event.target.matches("input, textarea")) {
      return;
    }

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      movePanel(1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      movePanel(-1);
    }
  });

  window.addEventListener("wheel", function (event) {
    event.preventDefault();

    if (
      wheelLocked ||
      transitionLocked ||
      document.activeElement.matches("input, textarea") ||
      Math.abs(event.deltaY) < 24
    ) {
      return;
    }

    wheelLocked = true;
    movePanel(event.deltaY > 0 ? 1 : -1);
    window.setTimeout(function () {
      wheelLocked = false;
    }, exitDuration + enterDuration);
  }, { passive: false });

  stage.addEventListener("touchmove", function (event) {
    const activeContact = document.querySelector(".panel-contact.is-active");
    if (!event.target.closest("input, textarea") && !activeContact) {
      event.preventDefault();
    }
  }, { passive: false });

  stage.addEventListener("touchstart", function (event) {
    if (!event.target.closest("input, textarea, button")) {
      touchStartY = event.changedTouches[0].clientY;
      touchStartX = event.changedTouches[0].clientX;
      touchStartScrollY = document.querySelector(".panel-contact.is-active")?.scrollTop || 0;
    }
  }, { passive: true });

  stage.addEventListener("touchend", function (event) {
    if (touchStartY === null || transitionLocked) {
      touchStartY = null;
      touchStartX = null;
      return;
    }

    const distanceY = touchStartY - event.changedTouches[0].clientY;
    const distanceX = touchStartX - event.changedTouches[0].clientX;
    const activeContact = document.querySelector(".panel-contact.is-active");
    const contactScrolled = activeContact && Math.abs(activeContact.scrollTop - touchStartScrollY) > 2;
    touchStartY = null;
    touchStartX = null;
    if (!contactScrolled && Math.abs(distanceY) > 55 && Math.abs(distanceY) > Math.abs(distanceX) * 1.2) {
      movePanel(distanceY > 0 ? 1 : -1);
    }
  }, { passive: true });

  stage.addEventListener("touchcancel", function () {
    touchStartY = null;
    touchStartX = null;
  }, { passive: true });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 620) {
      setMenuOpen(false);
    }
  });

  contactForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const name = document.getElementById("contact-name").value.trim();
    const email = document.getElementById("contact-email").value.trim();
    const message = document.getElementById("contact-message").value.trim();
    const subject = encodeURIComponent("Dibu Studios Website Contact");
    const body = encodeURIComponent(
      "Name: " + name + "\nEmail: " + email + "\n\n" + message
    );

    window.location.href =
      "mailto:dibustudiosofficial@gmail.com?subject=" + subject + "&body=" + body;
  });

  activateImmediately(window.location.hash || "#home");
  window.requestAnimationFrame(function () {
    document.body.classList.add("is-ready");
  });
}());
