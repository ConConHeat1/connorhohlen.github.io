(() => {
  "use strict";

  const root = document.documentElement;
  const themeButtons = Array.from(document.querySelectorAll("[data-theme-value]"));
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const validThemes = new Set(["dark", "slate", "light"]);
  const themeColors = {
    dark: "#070b10",
    slate: "#242a30",
    light: "#f5f8fa",
  };
  const navigationGroups = [
    {
      label: "Projects",
      href: "/#projects",
      section: "projects",
      menuLabel: "Project pages",
      items: [
        { title: "Flexin", url: "/projects/flexin.html" },
        { title: "Custom FPV Drone", url: "/projects/fpv-drone.html" },
        { title: "Portfolio Website", url: "/projects/portfolio.html" },
        { title: "Wi-Fi LED Lighting", url: "/projects/led-lighting.html" },
        { title: "Plant Monitor", url: "/projects/plant-monitor.html" },
        { title: "SQL + Java Data System", url: "/projects/sql-java-data-system.html" },
        { title: "Rocket Computer", url: "/projects/rocket-computer.html" },
      ],
    },
    {
      label: "Experience",
      href: "/#experience",
      section: "experience",
      menuLabel: "Experience pages",
      items: [
        { title: "Amur Equipment Finance", url: "/workspace1.html" },
        { title: "Menards", url: "/workspace2.html" },
      ],
    },
    {
      label: "Education",
      href: "/#education",
      section: "education",
      menuLabel: "Education pages",
      items: [
        { title: "University of Nebraska–Lincoln", url: "/college.html" },
        { title: "Northwest High School", url: "/highschool.html" },
      ],
    },
  ];

  function applyTheme(theme, persist = true) {
    if (!validThemes.has(theme)) return;
    root.dataset.theme = theme;

    themeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.themeValue === theme));
    });

    if (themeColor) {
      themeColor.setAttribute("content", themeColors[theme]);
    }

    if (persist) {
      try {
        localStorage.setItem("portfolio-theme", theme);
      } catch {
        // The theme still works when storage is unavailable.
      }
    }
  }

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => applyTheme(button.dataset.themeValue));
  });

  applyTheme(root.dataset.theme || "slate", false);

  const siteHeader = document.querySelector("[data-site-header]");
  const menuButton = document.querySelector("[data-menu-toggle]");
  const primaryNav = document.querySelector("[data-primary-nav]");
  const pageMain = document.querySelector("main");
  const siteFooter = document.querySelector(".site-footer");
  const desktopMenu = window.matchMedia("(min-width: 1121px)");

  function enhanceNavigationDropdowns() {
    if (!primaryNav) return;
    const currentPath = window.location.pathname;
    const dropdowns = [];

    navigationGroups.forEach((group) => {
      const sourceLink = primaryNav.querySelector(`.nav-link[href="${group.href}"]`);
      if (!sourceLink) return;

      const dropdown = document.createElement("details");
      dropdown.className = "nav-dropdown";

      const summary = document.createElement("summary");
      summary.className = "nav-link nav-dropdown-summary";
      summary.textContent = group.label;

      const menu = document.createElement("div");
      menu.className = "nav-dropdown-menu";
      menu.setAttribute("aria-label", group.menuLabel);

      let containsCurrentPage = false;
      group.items.forEach((item) => {
        const link = document.createElement("a");
        link.href = item.url;
        link.textContent = item.title;
        if (currentPath === item.url) {
          link.setAttribute("aria-current", "page");
          containsCurrentPage = true;
        }
        menu.append(link);
      });

      if (containsCurrentPage || sourceLink.getAttribute("aria-current") === "page") {
        summary.setAttribute("aria-current", "page");
      } else if (sourceLink.hasAttribute("data-section-link")) {
        summary.dataset.sectionLink = group.section;
      }

      dropdown.append(summary, menu);
      sourceLink.replaceWith(dropdown);
      dropdowns.push(dropdown);

      dropdown.addEventListener("toggle", () => {
        if (!dropdown.open) return;
        dropdowns.forEach((otherDropdown) => {
          if (otherDropdown !== dropdown) otherDropdown.removeAttribute("open");
        });
      });

      dropdown.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !dropdown.open) return;
        event.preventDefault();
        event.stopPropagation();
        dropdown.removeAttribute("open");
        summary.focus();
      });
    });

    document.addEventListener("click", (event) => {
      dropdowns.forEach((dropdown) => {
        if (dropdown.open && !dropdown.contains(event.target)) dropdown.removeAttribute("open");
      });
    });
  }

  enhanceNavigationDropdowns();

  function setBackgroundInert(isInert) {
    [pageMain, siteFooter].forEach((element) => {
      if (element) element.inert = isInert;
    });
  }

  function closeMenu({ returnFocus = false } = {}) {
    if (!menuButton || !primaryNav) return;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation");
    primaryNav.classList.remove("is-open");
    primaryNav.querySelectorAll("details[open]").forEach((details) => details.removeAttribute("open"));
    primaryNav.inert = !desktopMenu.matches;
    document.body.classList.remove("menu-open");
    setBackgroundInert(false);
    if (returnFocus) menuButton.focus();
  }

  function openMenu() {
    if (!menuButton || !primaryNav) return;
    menuButton.setAttribute("aria-expanded", "true");
    menuButton.setAttribute("aria-label", "Close navigation");
    primaryNav.classList.add("is-open");
    primaryNav.inert = false;
    document.body.classList.add("menu-open");
    setBackgroundInert(true);
    const firstLink = primaryNav.querySelector("a, button, summary");
    firstLink?.focus();
  }

  menuButton?.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  primaryNav?.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (!primaryNav?.classList.contains("is-open")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu({ returnFocus: true });
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = Array.from(
      primaryNav.querySelectorAll('a[href], button:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'),
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  desktopMenu.addEventListener("change", (event) => {
    if (event.matches) {
      closeMenu();
      primaryNav.inert = false;
    } else if (menuButton?.getAttribute("aria-expanded") !== "true") {
      primaryNav.inert = true;
    }
  });

  if (primaryNav) primaryNav.inert = !desktopMenu.matches;

  function updateHeader() {
    siteHeader?.classList.toggle("is-scrolled", window.scrollY > 12);
  }

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  const sectionLinks = Array.from(document.querySelectorAll("[data-section-link]"));
  const trackedSections = Array.from(document.querySelectorAll("[data-nav-section]"));

  if (sectionLinks.length && trackedSections.length && "IntersectionObserver" in window) {
    const visibleSections = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => visibleSections.set(entry.target.id, entry.intersectionRatio));
        const active = [...visibleSections.entries()]
          .filter(([, ratio]) => ratio > 0)
          .sort((a, b) => b[1] - a[1])[0]?.[0];

        if (!active) return;
        sectionLinks.forEach((link) => {
          if (link.dataset.sectionLink === active) {
            link.setAttribute("aria-current", "location");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      },
      { rootMargin: "-22% 0px -62% 0px", threshold: [0, 0.1, 0.35, 0.6] },
    );

    trackedSections.forEach((section) => observer.observe(section));
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const resumeToggle = document.querySelector("[data-resume-toggle]");
  const resumeDialog = document.querySelector("[data-resume-dialog]");
  const resumeClose = document.querySelector("[data-resume-close]");
  const resumeActions = Array.from(document.querySelectorAll("[data-contact-action], [data-resume-action]"));
  let resumeReturnFocus = null;

  function updateResumeHash(expanded) {
    if (!window.history?.replaceState) return;
    const url = new URL(window.location.href);
    url.hash = expanded ? "resume" : "contact";
    window.history.replaceState(null, "", url);
  }

  function openResume({ updateHash = false } = {}) {
    if (!resumeToggle || !resumeDialog || resumeDialog.open) return;
    resumeReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : resumeToggle;
    resumeToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("dialog-open");
    resumeDialog.showModal();
    resumeDialog.scrollTop = 0;
    if (updateHash) updateResumeHash(true);
    window.requestAnimationFrame(() => resumeClose?.focus({ preventScroll: true }));
  }

  function closeResume({ updateHash = true, restoreFocus = true } = {}) {
    if (!resumeToggle || !resumeDialog?.open) return;
    resumeDialog.close();
    resumeToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("dialog-open");
    if (updateHash) updateResumeHash(false);
    if (restoreFocus) {
      const focusTarget = resumeReturnFocus?.isConnected ? resumeReturnFocus : resumeToggle;
      window.requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
    }
    resumeReturnFocus = null;
  }

  resumeToggle?.addEventListener("click", () => {
    openResume({ updateHash: true });
  });

  resumeClose?.addEventListener("click", () => {
    closeResume();
  });

  resumeActions.forEach((action) => {
    action.addEventListener("click", () => {
      if (resumeDialog?.open) closeResume({ restoreFocus: false });
    });
  });

  resumeDialog?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeResume();
  });

  resumeDialog?.addEventListener("click", (event) => {
    if (event.target === resumeDialog) closeResume();
  });

  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#resume") {
      openResume();
    } else if (resumeDialog?.open) {
      closeResume({ updateHash: false });
    }
  });

  if (window.location.hash === "#resume") {
    openResume();
  }

  const year = document.querySelector("[data-current-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  const carousel = document.querySelector("[data-project-carousel]");
  const projectTrack = carousel?.querySelector("[data-project-track]");
  const projectCards = projectTrack ? Array.from(projectTrack.querySelectorAll("[data-project-card]")) : [];
  const previousProject = carousel?.querySelector("[data-project-previous]");
  const nextProject = carousel?.querySelector("[data-project-next]");
  const projectPosition = carousel?.querySelector("[data-project-position]");

  if (projectTrack && projectCards.length) {
    let activeProjectIndex = 0;
    let scrollFrame = 0;

    function visibleProjectCount() {
      const value = Number.parseInt(getComputedStyle(carousel).getPropertyValue("--visible-projects"), 10);
      return Number.isFinite(value) && value > 0 ? value : 1;
    }

    function projectLeft(index) {
      return Math.max(0, projectCards[index].offsetLeft - projectTrack.offsetLeft);
    }

    function updateProjectControls() {
      const visible = visibleProjectCount();
      const maximumStart = Math.max(0, projectCards.length - visible);
      activeProjectIndex = Math.min(activeProjectIndex, maximumStart);
      const canCycle = maximumStart > 0;
      if (previousProject) previousProject.disabled = !canCycle;
      if (nextProject) nextProject.disabled = !canCycle;

      if (projectPosition) {
        const first = activeProjectIndex + 1;
        const last = Math.min(projectCards.length, activeProjectIndex + visible);
        projectPosition.textContent = `Showing projects ${first}–${last} of ${projectCards.length}`;
      }
    }

    function showProject(index, { wrap = true } = {}) {
      const maximumStart = Math.max(0, projectCards.length - visibleProjectCount());
      if (maximumStart === 0) {
        activeProjectIndex = 0;
      } else if (wrap && index < 0) {
        activeProjectIndex = maximumStart;
      } else if (wrap && index > maximumStart) {
        activeProjectIndex = 0;
      } else {
        activeProjectIndex = Math.min(Math.max(index, 0), maximumStart);
      }
      projectTrack.scrollTo({
        left: projectLeft(activeProjectIndex),
        behavior: reducedMotion ? "auto" : "smooth",
      });
      updateProjectControls();
    }

    previousProject?.addEventListener("click", () => showProject(activeProjectIndex - 1));
    nextProject?.addEventListener("click", () => showProject(activeProjectIndex + 1));

    projectTrack.addEventListener("scroll", () => {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => {
        const nearest = projectCards.reduce((best, card, index) => {
          const distance = Math.abs(projectTrack.scrollLeft - projectLeft(index));
          return distance < best.distance ? { index, distance } : best;
        }, { index: 0, distance: Number.POSITIVE_INFINITY });
        const maximumStart = Math.max(0, projectCards.length - visibleProjectCount());
        activeProjectIndex = Math.min(nearest.index, maximumStart);
        updateProjectControls();
      });
    }, { passive: true });

    window.addEventListener("resize", () => showProject(activeProjectIndex, { wrap: false }));
    updateProjectControls();
  }

  const zoomableFigures = Array.from(
    document.querySelectorAll(".visual-hero-media, .gallery-tile, .media-grid figure, figure.case-media"),
  ).filter((figure) => figure.querySelector("img"));

  if (zoomableFigures.length) {
    const lightbox = document.createElement("dialog");
    const lightboxFrame = document.createElement("div");
    const lightboxClose = document.createElement("button");
    const lightboxFigure = document.createElement("figure");
    const lightboxImage = document.createElement("img");
    const lightboxCaption = document.createElement("figcaption");
    let lightboxReturnFocus = null;

    lightbox.className = "image-lightbox";
    lightbox.setAttribute("aria-label", "Full-size image viewer");
    lightboxFrame.className = "image-lightbox-frame";
    lightboxClose.className = "image-lightbox-close";
    lightboxClose.type = "button";
    lightboxClose.setAttribute("aria-label", "Close full-size image");
    lightboxClose.textContent = "×";
    lightboxFigure.className = "image-lightbox-figure";
    lightboxImage.alt = "";
    lightboxFigure.append(lightboxImage, lightboxCaption);
    lightboxFrame.append(lightboxClose, lightboxFigure);
    lightbox.append(lightboxFrame);
    document.body.append(lightbox);

    function closeLightbox() {
      if (!lightbox.open) return;
      lightbox.close();
      document.body.classList.remove("dialog-open");
      const focusTarget = lightboxReturnFocus;
      lightboxReturnFocus = null;
      if (focusTarget?.isConnected) {
        window.requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
      }
    }

    function openLightbox(figure) {
      const sourceImage = figure.querySelector("img");
      if (!sourceImage) return;
      if (typeof lightbox.showModal !== "function") {
        window.open(sourceImage.currentSrc || sourceImage.src, "_blank", "noopener");
        return;
      }

      const caption = figure.querySelector("figcaption")?.textContent.trim();
      lightboxImage.src = sourceImage.currentSrc || sourceImage.src;
      lightboxImage.alt = sourceImage.alt;
      lightboxCaption.textContent = caption || sourceImage.alt;
      lightboxCaption.hidden = !lightboxCaption.textContent;
      lightboxReturnFocus = figure;
      document.body.classList.add("dialog-open");
      lightbox.showModal();
      lightboxClose.focus({ preventScroll: true });
    }

    lightboxClose.addEventListener("click", closeLightbox);
    lightbox.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeLightbox();
    });
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });

    zoomableFigures.forEach((figure) => {
      const image = figure.querySelector("img");
      figure.classList.add("is-zoomable");
      figure.tabIndex = 0;
      figure.setAttribute("role", "button");
      figure.setAttribute("aria-label", `View ${image.alt} full size`);

      figure.addEventListener("click", (event) => {
        if (event.target.closest("a, button")) return;
        openLightbox(figure);
      });
      figure.addEventListener("keydown", (event) => {
        if (!["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        openLightbox(figure);
      });
    });
  }

  const backToTop = document.createElement("button");
  backToTop.className = "back-to-top";
  backToTop.type = "button";
  backToTop.hidden = true;
  backToTop.setAttribute("aria-label", "Back to top");
  backToTop.textContent = "↑";
  if (siteFooter) {
    siteFooter.before(backToTop);
  } else {
    document.body.append(backToTop);
  }

  function updateBackToTop() {
    backToTop.hidden = window.scrollY < 560;
  }

  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  });
  updateBackToTop();
  window.addEventListener("scroll", updateBackToTop, { passive: true });

  const revealItems = Array.from(document.querySelectorAll(".reveal"));

  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 },
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  }
})();
