const TOOLKIT_CONFIG = window.INTEP_FLEX_TOOLKIT || {};

const PHASE_DOCUMENT_LINKS = TOOLKIT_CONFIG.documentLinks || {};

const JOURNEY_LAYOUT = TOOLKIT_CONFIG.journeyLayout || {
  desktopPoints: [],
  mobilePoints: [],
};

const ADDITIONAL_MATERIALS = TOOLKIT_CONFIG.materials || [];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeText(value) {
  return String(value || "").trim();
}

function formatMultiline(text) {
  if (!text) {
    return "";
  }

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const sectionHeading = /^(desarrollo sugerido)$/i.exec(line);
      if (sectionHeading) {
        return `<p class="rich-copy-heading">${escapeHtml(sectionHeading[1].toUpperCase())}</p>`;
      }

      const labelOnly = /^(actividad\s+\d+|paso\s+[\d-]+|complemento de la sesión)$/i.exec(line);
      if (labelOnly) {
        return `<p class="rich-copy-label"><strong>${escapeHtml(labelOnly[1])}</strong></p>`;
      }

      const lineWithLabel = /^(actividad\s+\d+|paso\s+[\d-]+|momento\s+\d+)\s*:\s*(.+)$/i.exec(line);
      if (lineWithLabel) {
        return `
          <p class="rich-copy-line">
            <strong>${escapeHtml(`${lineWithLabel[1]}:`)}</strong>
            ${escapeHtml(lineWithLabel[2])}
          </p>
        `;
      }

      return `<p>${escapeHtml(line)}</p>`;
    })
    .join("");
}

function buildSmoothPath(points) {
  if (points.length < 2) {
    return "";
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const controlX = (previous.x + current.x) / 2;
    const controlY = (previous.y + current.y) / 2;
    path += ` Q ${previous.x} ${previous.y} ${controlX} ${controlY}`;
  }

  const last = points[points.length - 1];
  path += ` T ${last.x} ${last.y}`;
  return path;
}

function renderStats(target, phases) {
  const totalSessions = phases.reduce((sum, phase) => sum + phase.sessionCount, 0);
  target.innerHTML = `
    <article class="stat-card">
      <strong>${phases.length}</strong>
      <span>fases</span>
    </article>
    <article class="stat-card">
      <strong>${totalSessions}</strong>
      <span>sesiones</span>
    </article>
  `;
}

function renderBoard(board, phases) {
  const points = window.matchMedia("(max-width: 760px)").matches
    ? JOURNEY_LAYOUT.mobilePoints
    : JOURNEY_LAYOUT.desktopPoints;
  const path = buildSmoothPath(points);
  const svg = board.querySelector("[data-route-svg]");
  const stationsHost = board.querySelector("[data-journey-stations]");

  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.innerHTML = `
    <path class="route-guide" d="${path}" pathLength="100"></path>
    <path class="route-dots" d="${path}" pathLength="100"></path>
  `;

  stationsHost.innerHTML = phases
    .map((phase, index) => {
      const point = points[index];
      return `
        <button
          class="station station-tone-${phase.number}"
          type="button"
          data-phase-id="${phase.id}"
          aria-label="${phase.name}"
          style="left:${point.x}%; top:${point.y}%"
        >
          <span class="station-label">${phase.label}</span>
          <strong>${escapeHtml(phase.title)}</strong>
          <span class="station-meta">${phase.sessionCount} sesiones</span>
        </button>
      `;
    })
    .join("");
}

function renderAdditionalMaterials(host, materials) {
  if (!host) {
    return;
  }

  host.innerHTML = materials
    .map((material, index) => {
      const itemCount = Array.isArray(material.rows) ? material.rows.length : material.links.length;
      const itemLabel = itemCount === 1 ? "recurso" : "recursos";
      return `
        <button
          class="resource-card resource-tone-${(index % 2) + 1}"
          type="button"
          data-resource-id="${material.id}"
          aria-label="${escapeHtml(material.title)}"
        >
          <strong>${escapeHtml(material.title)}</strong>
          <p>${escapeHtml(material.description)}</p>
          <span class="resource-card-meta">${itemCount} ${itemLabel}</span>
        </button>
      `;
    })
    .join("");
}

function makeDocumentsMarkup(documents) {
  const noticesMarkup = `
    <ul class="document-notice-list">
      <li><span class="document-notice-icon" aria-hidden="true">⚠️</span> Es necesario tener sesión de Google iniciada con correo <code>@intep.edu.co</code> para acceder al material.</li>
      <li><span class="document-notice-icon" aria-hidden="true">⚠️</span> Todo el material compartido es propiedad del <strong>MEN/INTEP</strong>. Prohibido divulgar.</li>
    </ul>
  `;

  if (!documents.length) {
    return `
      <p class="empty-copy">No hay documento referenciado para esta sesión.</p>
      ${noticesMarkup}
    `;
  }

  return `
    <ul class="document-list">
      ${documents
        .map((documentName) => {
          const label = normalizeText(documentName);
          const href = PHASE_DOCUMENT_LINKS[label];
          const tag = label.toLowerCase().endsWith(".docx") ? "DOCX" : "PDF";

          if (!href) {
            return `
              <li>
                <span class="document-link is-muted">
                  <span class="document-tag">${tag}</span>
                  ${escapeHtml(label)}
                </span>
              </li>
            `;
          }

          return `
            <li>
              <a
                class="document-link"
                href="${escapeHtml(href)}"
                target="_blank"
                rel="noreferrer noopener"
              >
                <span class="document-tag">${tag}</span>
                ${escapeHtml(label)}
              </a>
            </li>
          `;
        })
        .join("")}
    </ul>
    ${noticesMarkup}
  `;
}

function makeResourceLinksMarkup(links) {
  if (!links.length) {
    return `<p class="empty-copy">No hay enlaces disponibles todavía.</p>`;
  }

  return `
    <ul class="document-list">
      ${links
        .map((link) => {
          const href = normalizeText(link.href) || "#";
          const disabled = href === "#";

          if (disabled) {
            return `
              <li>
                <a
                  class="document-link is-muted"
                  href="#"
                  aria-disabled="true"
                  data-placeholder-link
                >
                  <span class="document-tag">Pronto</span>
                  ${escapeHtml(link.label)}
                </a>
              </li>
            `;
          }

          return `
            <li>
              <a
                class="document-link"
                href="${escapeHtml(href)}"
                target="_blank"
                rel="noreferrer noopener"
              >
                <span class="document-tag">Link</span>
                ${escapeHtml(link.label)}
              </a>
            </li>
          `;
        })
        .join("")}
    </ul>
  `;
}

function makeMatrixCellMarkup(item) {
  if (!item || !normalizeText(item.href) || normalizeText(item.href) === "#") {
    return `<span class="valuation-empty" aria-hidden="true"></span>`;
  }

  return `
    <a
      class="valuation-link"
      href="${escapeHtml(item.href)}"
      target="_blank"
      rel="noreferrer noopener"
    >
      ${escapeHtml(item.label)}
    </a>
  `;
}

function makeValuationMatrixMarkup(rows) {
  if (!rows.length) {
    return `<p class="empty-copy">No hay enlaces disponibles todavía.</p>`;
  }

  return `
    <table class="valuation-table">
      <colgroup>
        <col style="width: 16.6667%" />
        <col style="width: 41.6667%" />
        <col style="width: 41.6667%" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Fases</th>
          <th scope="col">Diarios de campo</th>
          <th scope="col">Entregable</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <td class="valuation-phase">${escapeHtml(row.phase)}</td>
                <td class="valuation-cell">
                  ${makeMatrixCellMarkup(row.fieldJournal)}
                </td>
                <td class="valuation-cell">
                  ${makeMatrixCellMarkup(row.deliverable)}
                </td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function makeSessionMarkup(session, isOpen) {
  const objective = normalizeText(session.objective);
  const activity = normalizeText(session.activity);
  const pages = normalizeText(session.pages);
  const skills = Array.isArray(session.skills) ? session.skills : [];

  return `
    <details class="session-card"${isOpen ? " open" : ""}>
      <summary>
        <span>${escapeHtml(session.title)}</span>
        <span class="session-chevron" aria-hidden="true"></span>
      </summary>
      <div class="session-content">
        ${
          objective
            ? `
              <section class="detail-block detail-objective">
                <h4>Objetivo</h4>
                <p>${escapeHtml(objective)}</p>
              </section>
            `
            : ""
        }
        ${
          skills.length
            ? `
              <section class="detail-block detail-skills">
                <h4>Habilidades del siglo XXI</h4>
                <div class="chip-row">
                  ${skills.map((skill) => `<span class="chip">${escapeHtml(skill)}</span>`).join("")}
                </div>
              </section>
            `
            : ""
        }
        ${
          activity
            ? `
              <section class="detail-block detail-activity">
                <h4>Actividad recomendada</h4>
                <div class="rich-copy">${formatMultiline(activity)}</div>
              </section>
            `
            : ""
        }
        ${
          pages
            ? `
              <section class="detail-block detail-pages">
                <h4>Páginas</h4>
                <p>${escapeHtml(pages)}</p>
              </section>
            `
            : ""
        }
        <section class="detail-block detail-documents">
          <h4>Documento referenciado</h4>
          ${makeDocumentsMarkup(session.documents || [])}
        </section>
      </div>
    </details>
  `;
}

function setupModal(page, phases, materials) {
  const modal = page.querySelector("[data-phase-modal]");
  const title = modal.querySelector("[data-modal-title]");
  const description = modal.querySelector("[data-modal-description]");
  const counter = modal.querySelector("[data-modal-count]");
  const sessionsHost = modal.querySelector("[data-modal-sessions]");
  const linksHost = modal.querySelector("[data-modal-links]");
  const closeButton = modal.querySelector("[data-close-modal]");
  let lastTrigger = null;

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (lastTrigger) {
      lastTrigger.focus();
    }
  }

  function openModal(phase, trigger) {
    lastTrigger = trigger;
    title.textContent = phase.name;
    description.textContent = phase.description;
    counter.textContent = `${phase.sessionCount} sesiones`;
    linksHost.hidden = true;
    linksHost.innerHTML = "";
    sessionsHost.hidden = false;
    sessionsHost.innerHTML = phase.sessions
      .map((session) => makeSessionMarkup(session, false))
      .join("");

    const renderedDetails = sessionsHost.querySelectorAll(".session-card");
    renderedDetails.forEach((details) => {
      details.addEventListener("toggle", () => {
        if (details.open) {
          enforceSingleOpenSession(details);
        }
      });
    });

    modal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function openResourceModal(material, trigger) {
    lastTrigger = trigger;
    title.textContent = material.title;
    description.textContent = material.description;
    const itemCount = Array.isArray(material.rows) ? material.rows.length : material.links.length;
    counter.textContent = `${itemCount} ${itemCount === 1 ? "fase" : "fases"}`;
    sessionsHost.hidden = true;
    sessionsHost.innerHTML = "";
    linksHost.hidden = false;
    linksHost.innerHTML = Array.isArray(material.rows)
      ? makeValuationMatrixMarkup(material.rows)
      : makeResourceLinksMarkup(material.links);
    modal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function enforceSingleOpenSession(openDetails) {
    const allDetails = sessionsHost.querySelectorAll(".session-card");
    allDetails.forEach((details) => {
      if (details !== openDetails) {
        details.open = false;
      }
    });
  }

  if (!page.dataset.boundEvents) {
    page.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-phase-id]");
      if (trigger) {
        const phase = phases.find((item) => item.id === trigger.dataset.phaseId);
        if (phase) {
          openModal(phase, trigger);
        }
        return;
      }

      const resourceTrigger = event.target.closest("[data-resource-id]");
      if (resourceTrigger) {
        const material = materials.find((item) => item.id === resourceTrigger.dataset.resourceId);
        if (material) {
          openResourceModal(material, resourceTrigger);
        }
        return;
      }

      if (event.target.closest("[data-placeholder-link]")) {
        event.preventDefault();
      }
    });

    closeButton.addEventListener("click", closeModal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) {
        closeModal();
      }
    });

    page.dataset.boundEvents = "true";
  }
}

function initToolkitPage(page) {
  const phases = TOOLKIT_CONFIG.phases || [];
  const board = page.querySelector("[data-journey-board]");
  const materialsHost = page.querySelector("[data-additional-materials]");
  const statsHost = page.querySelector("[data-stats]");
  const view = page.dataset.toolkitView || "journey";

  if (statsHost) {
    renderStats(statsHost, phases);
  }

  if (view === "journey" && board) {
    renderBoard(board, phases);
  }

  if (view === "materials" && materialsHost) {
    renderAdditionalMaterials(materialsHost, ADDITIONAL_MATERIALS);
  }

  setupModal(page, phases, ADDITIONAL_MATERIALS);

  if (view === "journey" && board) {
    let resizeFrame = null;
    window.addEventListener("resize", () => {
      if (resizeFrame) {
        window.cancelAnimationFrame(resizeFrame);
      }

      resizeFrame = window.requestAnimationFrame(() => {
        renderBoard(board, phases);
      });
    });
  }
}

document.querySelectorAll("[data-toolkit-page]").forEach(initToolkitPage);
