import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

// Base URL handling for flexible hosting (Vercel, GitHub Pages, Netlify)
const BASE_PATH = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');

// Configuration and Assets
const EVENTS = {
  valima: {
    name: 'Daawat-e-Valima (Reception)',
    page1Src: `${BASE_PATH}Valima/TO_FROM Valima Invitation Card.png`,
    page2Src: `${BASE_PATH}Valima/Valima Wedding Invitation.png`,
    defaultColor: '#710512',
    defaultFontSize: 52,
    baselineY: 775,
    toStartX: 280,
    toEndX: 825,
    centerLineX: 511,
    line1Y: 803,
    defaultLineSpacing: 82,
    flowerLeftX: 185,
    flowerRightX: 837,
    line2Color: '#A7692A',
    flowerSrc: `${BASE_PATH}valima_flower.png`
  },
  nikah: {
    name: 'Daawat-e-Nikah',
    page1Src: `${BASE_PATH}Nikah/TO-FROM Nikah Invitation Card.png`,
    page2Src: `${BASE_PATH}Nikah/Nikah Invitation.png`,
    defaultColor: '#FCF0D1',
    defaultFontSize: 52,
    baselineY: 775,
    toStartX: 280,
    toEndX: 830,
    centerLineX: 511,
    line1Y: 803,
    defaultLineSpacing: 82,
    flowerLeftX: 178,
    flowerRightX: 844,
    line2Color: '#F4DAA8',
    flowerSrc: `${BASE_PATH}nikah_flower.png`
  }
};

// Application State (Royal Styling Fixed as Default)
const state = {
  currentEvent: 'valima',
  guestName: '', // Empty on load as requested!
  fontFamily: "'Great Vibes', cursive", // Fixed
  fontSize: 54,
  textColor: '#710512',
  alignStyle: 'after-to', // Fixed: Directly after "To:"
  line2Display: 'auto', // Fixed: Auto (When Big Name)
  line2Align: 'centered', // Fixed: Centered on Line
  lineSpacing: 82, // Fixed
  xOffset: 0,
  yOffset: 0,
  activePreviewPage: '1', // '1' | '2' | 'both'
  batchNames: [],
  loadedImages: {}
};

// DOM Elements
const elements = {
  // Event buttons
  btnValima: document.getElementById('btnValima'),
  btnNikah: document.getElementById('btnNikah'),

  // Modes
  tabSingleGuest: document.getElementById('tabSingleGuest'),
  tabBatchGuest: document.getElementById('tabBatchGuest'),
  singleGuestForm: document.getElementById('singleGuestForm'),
  batchGuestForm: document.getElementById('batchGuestForm'),

  // Inputs
  guestNameInput: document.getElementById('guestNameInput'),
  btnClearName: document.getElementById('btnClearName'),
  prefixPills: document.getElementById('prefixPills'),
  batchNamesInput: document.getElementById('batchNamesInput'),
  batchCountBadge: document.getElementById('batchCountBadge'),

  // Typography Controls
  toggleTypography: document.getElementById('toggleTypography'),
  typographyContent: document.getElementById('typographyContent'),
  typographyChevron: document.getElementById('typographyChevron'),
  fontSizeRange: document.getElementById('fontSizeRange'),
  fontSizeDisplay: document.getElementById('fontSizeDisplay'),
  yOffsetRange: document.getElementById('yOffsetRange'),
  yOffsetDisplay: document.getElementById('yOffsetDisplay'),
  xOffsetRange: document.getElementById('xOffsetRange'),
  xOffsetDisplay: document.getElementById('xOffsetDisplay'),
  colorPalette: document.getElementById('colorPalette'),
  customColorInput: document.getElementById('customColorInput'),
  btnResetStyles: document.getElementById('btnResetStyles'),

  // Actions
  btnShareWhatsApp: document.getElementById('btnShareWhatsApp'),
  btnDownloadPDF: document.getElementById('btnDownloadPDF'),
  btnDownloadBatchPDF: document.getElementById('btnDownloadBatchPDF'),
  btnJumpToPreview: document.getElementById('btnJumpToPreview'),
  btnJumpToForm: document.getElementById('btnJumpToForm'),
  previewPanel: document.getElementById('previewPanel'),

  // Preview elements
  previewCanvasWrapper: document.getElementById('previewCanvasWrapper'),
  tabPreviewPage1: document.getElementById('tabPreviewPage1'),
  tabPreviewPage2: document.getElementById('tabPreviewPage2'),
  tabPreviewBoth: document.getElementById('tabPreviewBoth'),
  page1Box: document.getElementById('page1Box'),
  page2Box: document.getElementById('page2Box'),
  page1Canvas: document.getElementById('page1Canvas'),
  page2Canvas: document.getElementById('page2Canvas'),
  statusText: document.getElementById('statusText'),
  btnZoomToggle: document.getElementById('btnZoomToggle'),

  // Zoom Modal
  zoomModal: document.getElementById('zoomModal'),
  btnCloseZoom: document.getElementById('btnCloseZoom'),
  modalCanvasContainer: document.getElementById('modalCanvasContainer')
};

// Canvas Contexts
const ctx1 = elements.page1Canvas.getContext('2d');
const ctx2 = elements.page2Canvas.getContext('2d');

/**
 * Preload Image utility
 */
function preloadImage(src) {
  return new Promise((resolve, reject) => {
    if (state.loadedImages[src]) {
      return resolve(state.loadedImages[src]);
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      state.loadedImages[src] = img;
      resolve(img);
    };
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Ensure web fonts are completely ready before rendering
 */
async function ensureFontsReady() {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
}

/**
 * Draw the second decorative floral underline on Page 1
 * Matches the original gold floral divider seamlessly
 */
function drawSecondDecorativeLine(ctx, eventConfig) {
  const lineSpacing = state.lineSpacing || eventConfig.defaultLineSpacing;
  const line2Y = eventConfig.line1Y + lineSpacing;
  const flowerImg = state.loadedImages[eventConfig.flowerSrc];

  ctx.save();
  // 1. Draw horizontal connecting line between the two floral ornaments
  ctx.beginPath();
  ctx.moveTo(eventConfig.flowerLeftX + 24, line2Y);
  ctx.lineTo(eventConfig.flowerRightX - 24, line2Y);
  ctx.strokeStyle = eventConfig.line2Color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 2. Draw pristine 4-petaled floral motifs at left and right
  if (flowerImg) {
    ctx.drawImage(flowerImg, eventConfig.flowerLeftX - 24, line2Y - 24, 48, 48);
    ctx.drawImage(flowerImg, eventConfig.flowerRightX - 24, line2Y - 24, 48, 48);
  }
  ctx.restore();
}

/**
 * Fit lines within max widths, scaling down font size only if necessary
 */
function fitLines(lines, ctx, maxWidth1, maxWidth2, initialFontSize, fontFamily) {
  let fs = initialFontSize;
  ctx.font = `${fs}px ${fontFamily}`;

  let w1 = ctx.measureText(lines[0] || '').width;
  let w2 = lines.length > 1 ? ctx.measureText(lines[1]).width : 0;

  // Scale down font size gently only if lines exceed safe boundaries
  while ((w1 > maxWidth1 || (lines.length > 1 && w2 > maxWidth2)) && fs > 30) {
    fs -= 1;
    ctx.font = `${fs}px ${fontFamily}`;
    w1 = ctx.measureText(lines[0] || '').width;
    w2 = lines.length > 1 ? ctx.measureText(lines[1]).width : 0;
  }

  return { lines, fontSize: fs };
}

/**
 * Intelligently split guest name into 1 or 2 lines
 * Preserves the regal calligraphy size even for long names!
 */
function splitGuestName(fullText, ctx, maxWidth1, maxWidth2, targetFontSize, fontFamily) {
  const text = fullText.trim();
  if (!text) return { lines: [], fontSize: targetFontSize };

  // 1. Explicit multi-line split if user typed newlines, '//', or ' | '
  if (text.includes('\n') || text.includes('//') || text.includes(' | ')) {
    const parts = text.split(/\n|\/\/|\s+\|\s+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return fitLines([parts[0], parts.slice(1).join(' ')], ctx, maxWidth1, maxWidth2, targetFontSize, fontFamily);
    }
  }

  ctx.font = `${targetFontSize}px ${fontFamily}`;
  const singleWidth = ctx.measureText(text).width;

  // 2. Fits on a single line at full font size?
  if (singleWidth <= maxWidth1) {
    return { lines: [text], fontSize: targetFontSize };
  }

  // 3. Needs 2 lines to preserve regal font size!
  // Look for natural family / companions suffix first:
  // e.g. " & Family", " and Family", " aur Khandan", " & Children", " & Daughters", " & Sons"
  const familyPattern = /(\s+(&|and|aur)\s+(family|khandan|children|daughters|sons)\b.*)$/i;
  const familyMatch = text.match(familyPattern);
  if (familyMatch && familyMatch.index > 0) {
    const line1 = text.slice(0, familyMatch.index).trim();
    const line2 = text.slice(familyMatch.index).trim();
    return fitLines([line1, line2], ctx, maxWidth1, maxWidth2, targetFontSize, fontFamily);
  }

  // 4. Look for natural word boundary split that balances lines
  const words = text.split(/\s+/);
  if (words.length > 1) {
    let bestSplit = null;
    let minDifference = Infinity;

    for (let i = 1; i < words.length; i++) {
      const l1 = words.slice(0, i).join(' ');
      const l2 = words.slice(i).join(' ');
      const w1 = ctx.measureText(l1).width;
      const w2 = ctx.measureText(l2).width;

      if (w1 <= maxWidth1 && w2 <= maxWidth2) {
        const diff = Math.abs(w1 - w2);
        if (diff < minDifference) {
          minDifference = diff;
          bestSplit = [l1, l2];
        }
      }
    }

    if (bestSplit) {
      return fitLines(bestSplit, ctx, maxWidth1, maxWidth2, targetFontSize, fontFamily);
    }

    // Fallback: split near midpoint of words
    const mid = Math.ceil(words.length / 2);
    const l1 = words.slice(0, mid).join(' ');
    const l2 = words.slice(mid).join(' ');
    return fitLines([l1, l2], ctx, maxWidth1, maxWidth2, targetFontSize, fontFamily);
  }

  // Single very long word fallback
  return fitLines([text], ctx, maxWidth1, maxWidth2, targetFontSize, fontFamily);
}

/**
 * Render Page 1 (The To: Cover Card with Guest Name & Decorative Lines)
 */
async function renderPage1() {
  const eventConfig = EVENTS[state.currentEvent];
  const bgImg = await preloadImage(eventConfig.page1Src);
  if (eventConfig.flowerSrc) {
    await preloadImage(eventConfig.flowerSrc);
  }

  // Set canvas size (1024 x 1536)
  elements.page1Canvas.width = 1024;
  elements.page1Canvas.height = 1536;

  // Draw background template image
  ctx1.clearRect(0, 0, 1024, 1536);
  ctx1.drawImage(bgImg, 0, 0, 1024, 1536);

  const guestText = state.guestName.trim();
  await ensureFontsReady();

  // Width calculations for Line 1 and Line 2
  const maxWidth1 = state.alignStyle === 'centered'
    ? (eventConfig.flowerRightX - eventConfig.flowerLeftX - 40)
    : (eventConfig.toEndX - eventConfig.toStartX - 10);

  const maxWidth2 = (state.alignStyle === 'centered' || state.line2Align === 'centered')
    ? (eventConfig.flowerRightX - eventConfig.flowerLeftX - 40)
    : (eventConfig.toEndX - eventConfig.toStartX - 10);

  const { lines, fontSize } = splitGuestName(
    guestText,
    ctx1,
    maxWidth1,
    maxWidth2,
    state.fontSize,
    state.fontFamily
  );

  // Check if second line should be displayed
  const hasLine2Text = lines.length > 1 && lines[1].trim().length > 0;
  const showSecondLine = state.line2Display === 'always' || (state.line2Display === 'auto' && hasLine2Text);

  // Draw Second Decorative Line if enabled
  if (showSecondLine) {
    drawSecondDecorativeLine(ctx1, eventConfig);
  }

  if (!guestText || lines.length === 0) return;

  // Set font styling
  ctx1.font = `${fontSize}px ${state.fontFamily}`;
  ctx1.fillStyle = state.textColor;
  ctx1.textBaseline = 'alphabetic';

  const baselineY1 = eventConfig.baselineY + state.yOffset;
  const lineSpacing = state.lineSpacing || eventConfig.defaultLineSpacing;
  const baselineY2 = baselineY1 + lineSpacing;

  // Draw Line 1
  if (lines[0]) {
    if (state.alignStyle === 'centered') {
      ctx1.textAlign = 'center';
      const posX = eventConfig.centerLineX + state.xOffset;
      ctx1.fillText(lines[0], posX, baselineY1);
    } else {
      ctx1.textAlign = 'left';
      const posX = eventConfig.toStartX + state.xOffset;
      ctx1.fillText(lines[0], posX, baselineY1);
    }
  }

  // Draw Line 2
  if (lines[1]) {
    if (state.alignStyle === 'centered' || state.line2Align === 'centered') {
      ctx1.textAlign = 'center';
      const posX = eventConfig.centerLineX + state.xOffset;
      ctx1.fillText(lines[1], posX, baselineY2);
    } else {
      ctx1.textAlign = 'left';
      const posX = eventConfig.toStartX + state.xOffset;
      ctx1.fillText(lines[1], posX, baselineY2);
    }
  }
}

/**
 * Render Page 2 (The Invitation Card)
 */
async function renderPage2() {
  const eventConfig = EVENTS[state.currentEvent];
  const bgImg = await preloadImage(eventConfig.page2Src);

  elements.page2Canvas.width = 1024;
  elements.page2Canvas.height = 1536;

  ctx2.clearRect(0, 0, 1024, 1536);
  ctx2.drawImage(bgImg, 0, 0, 1024, 1536);
}

/**
 * Update the complete preview
 */
async function updatePreview() {
  try {
    elements.statusText.textContent = 'Updating preview...';
    await Promise.all([renderPage1(), renderPage2()]);
    elements.statusText.textContent = 'Real-time Calligraphy Preview Active';
  } catch (err) {
    console.error('Error updating preview:', err);
    elements.statusText.textContent = 'Preview updated';
  }
}

/**
 * Generate a 2-Page PDF for a given guest name
 */
async function generateInvitationPDF(guestName = state.guestName) {
  const eventConfig = EVENTS[state.currentEvent];
  const cleanName = (guestName.trim() || 'Guest').replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
  const eventSlug = state.currentEvent === 'valima' ? 'Valima_Reception' : 'Nikah';

  // Ensure current canvas has the exact guest name rendered
  const originalName = state.guestName;
  state.guestName = guestName;
  await renderPage1();
  await renderPage2();

  // Create jsPDF document: portrait, standard card size
  // 1024 x 1536 at 72dpi = [1024, 1536] pt
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [1024, 1536],
    compress: true
  });

  // Page 1: To/From Cover with Guest Name
  const page1Data = elements.page1Canvas.toDataURL('image/jpeg', 0.96);
  pdf.addImage(page1Data, 'JPEG', 0, 0, 1024, 1536, undefined, 'FAST');

  // Page 2: Invitation Details
  pdf.addPage([1024, 1536], 'portrait');
  const page2Data = elements.page2Canvas.toDataURL('image/jpeg', 0.96);
  pdf.addImage(page2Data, 'JPEG', 0, 0, 1024, 1536, undefined, 'FAST');

  // Restore previous name if needed
  if (originalName !== guestName) {
    state.guestName = originalName;
    await renderPage1();
  }

  return { pdf, filename: `${cleanName}_${eventSlug}_Invitation.pdf` };
}

/**
 * Download 2-Page PDF
 */
async function handleDownloadPDF() {
  const originalBtnText = elements.btnDownloadPDF.innerHTML;
  const loadingHTML = '<span class="btn-icon">⏳</span><span class="btn-content"><strong>Generating Pristine PDF...</strong><small>Compiling Page 1 & Page 2 at 300 DPI</small></span>';

  elements.btnDownloadPDF.disabled = true;
  elements.btnDownloadPDF.innerHTML = loadingHTML;

  try {
    const { pdf, filename } = await generateInvitationPDF();
    pdf.save(filename);
  } catch (err) {
    console.error('PDF Generation failed:', err);
    alert('Failed to generate PDF. Please try again.');
  } finally {
    elements.btnDownloadPDF.disabled = false;
    elements.btnDownloadPDF.innerHTML = originalBtnText;
  }
}

/**
 * Share PDF directly via WhatsApp
 * Uses Web Share API on mobile phones (Samsung S25 Ultra, iPhone 16 Pro Max, etc.)
 * Fallback to direct download + WhatsApp Web on desktop
 */
async function handleShareWhatsApp() {
  const originalBtnHTML = elements.btnShareWhatsApp.innerHTML;
  const loadingHTML = '<span class="btn-icon">⏳</span><span class="btn-content"><strong>Preparing WhatsApp PDF...</strong><small>Generating invitation...</small></span>';

  elements.btnShareWhatsApp.disabled = true;
  elements.btnShareWhatsApp.innerHTML = loadingHTML;

  try {
    const guestName = state.guestName.trim() || 'Guest';
    const eventSlug = state.currentEvent === 'valima' ? 'Valima Reception' : 'Nikah Ceremony';
    const { pdf, filename } = await generateInvitationPDF(guestName);

    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

    // 1. Mobile Web Share API with File (Native WhatsApp Direct Attachment)
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      await navigator.share({
        files: [pdfFile],
        title: `Wedding Invitation - ${guestName}`,
        text: `Assalamu Alaikum! Cordially inviting ${guestName} to the auspicious ${eventSlug} of Mohammed Dawood.`
      });
      return;
    }

    // 2. Desktop Fallback: Download the PDF to device and launch WhatsApp Web with greeting
    pdf.save(filename);

    const shareMessage = encodeURIComponent(
      `Assalamu Alaikum! Cordially inviting you to the ${eventSlug} of Mohammed Dawood.\n\nPlease find attached the official invitation PDF (${filename}).`
    );
    const whatsappUrl = `https://api.whatsapp.com/send?text=${shareMessage}`;
    window.open(whatsappUrl, '_blank');

  } catch (err) {
    // If user cancelled the share sheet, do not show alert
    if (err.name !== 'AbortError') {
      console.error('WhatsApp share error:', err);
      alert('Unable to share automatically. You can download the PDF and send it via WhatsApp.');
    }
  } finally {
    elements.btnShareWhatsApp.disabled = false;
    elements.btnShareWhatsApp.innerHTML = originalBtnHTML;
  }
}


/**
 * Batch generation: one separate 2-page PDF per guest, all bundled into a ZIP
 */
async function handleBatchPDFDownload() {
  const lines = elements.batchNamesInput.value
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    alert('Please enter at least one guest name (one name per line).');
    return;
  }

  const btn = elements.btnDownloadBatchPDF;
  const originalBtnHTML = btn.innerHTML;
  btn.disabled = true;

  try {
    const eventSlug = state.currentEvent === 'valima' ? 'Valima_Reception' : 'Nikah';
    const zip = new JSZip();

    // Track duplicate names so filenames stay unique
    const nameCounts = {};

    for (let i = 0; i < lines.length; i++) {
      const name = lines[i];

      btn.innerHTML = `<span class="btn-icon">⏳</span><span class="btn-content"><strong>Generating ${i + 1} of ${lines.length}...</strong><small>${name}</small></span>`;

      // Render both pages for this guest
      state.guestName = name;
      await renderPage1();
      await renderPage2();

      // Build a clean filename
      const cleanName = name.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_').slice(0, 60) || `Guest_${i + 1}`;
      nameCounts[cleanName] = (nameCounts[cleanName] || 0) + 1;
      const suffix = nameCounts[cleanName] > 1 ? `_${nameCounts[cleanName]}` : '';
      const filename = `${cleanName}${suffix}_${eventSlug}_Invitation.pdf`;

      // Create individual 2-page PDF
      const guestPdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [1024, 1536],
        compress: true
      });

      const page1Data = elements.page1Canvas.toDataURL('image/jpeg', 0.95);
      guestPdf.addImage(page1Data, 'JPEG', 0, 0, 1024, 1536, undefined, 'FAST');

      guestPdf.addPage([1024, 1536], 'portrait');
      const page2Data = elements.page2Canvas.toDataURL('image/jpeg', 0.95);
      guestPdf.addImage(page2Data, 'JPEG', 0, 0, 1024, 1536, undefined, 'FAST');

      // Add this guest's PDF to the ZIP as a Uint8Array
      const pdfBytes = guestPdf.output('arraybuffer');
      zip.file(filename, pdfBytes);
    }

    // Generate the ZIP and trigger download
    btn.innerHTML = `<span class="btn-icon">📦</span><span class="btn-content"><strong>Packaging ZIP (${lines.length} PDFs)...</strong><small>Almost done!</small></span>`;
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const zipUrl = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = zipUrl;
    link.download = `All_Guests_${eventSlug}_Invitations.zip`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(zipUrl), 10000);

  } catch (err) {
    console.error('Batch PDF generation failed:', err);
    alert('Batch generation encountered an error. Please try again.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalBtnHTML;
    // Restore the active single-guest preview
    state.guestName = elements.guestNameInput.value;
    updatePreview();
  }
}

/**
 * Event Switcher Handler (Valima vs Nikah)
 */
function setEvent(eventName) {
  state.currentEvent = eventName;
  const eventConfig = EVENTS[eventName];

  if (eventName === 'valima') {
    elements.btnValima.classList.add('active');
    elements.btnNikah.classList.remove('active');
    state.textColor = eventConfig.defaultColor;
  } else {
    elements.btnNikah.classList.add('active');
    elements.btnValima.classList.remove('active');
    state.textColor = eventConfig.defaultColor;
  }

  // Update active color swatch in UI
  updateColorPaletteUI(state.textColor);
  updatePreview();
}

/**
 * Update UI for Color Palette
 */
function updateColorPaletteUI(hexColor) {
  const swatches = elements.colorPalette.querySelectorAll('.color-swatch');
  let matched = false;
  swatches.forEach((s) => {
    if (s.dataset.color.toLowerCase() === hexColor.toLowerCase()) {
      s.classList.add('active');
      matched = true;
    } else {
      s.classList.remove('active');
    }
  });
  elements.customColorInput.value = hexColor;
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Event switchers
  elements.btnValima.addEventListener('click', () => setEvent('valima'));
  elements.btnNikah.addEventListener('click', () => setEvent('nikah'));

  // Single Guest Input
  elements.guestNameInput.addEventListener('input', (e) => {
    state.guestName = e.target.value;
    updatePreview();
  });

  elements.btnClearName.addEventListener('click', () => {
    elements.guestNameInput.value = '';
    state.guestName = '';
    elements.guestNameInput.focus();
    updatePreview();
  });

  // Prefix Pills
  elements.prefixPills.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill-btn');
    if (!btn) return;

    let currentVal = elements.guestNameInput.value.trim();
    if (btn.dataset.prefix) {
      if (!currentVal.startsWith(btn.dataset.prefix)) {
        currentVal = btn.dataset.prefix + currentVal;
      }
    }
    if (btn.dataset.suffix) {
      if (!currentVal.endsWith(btn.dataset.suffix)) {
        currentVal = currentVal + btn.dataset.suffix;
      }
    }
    elements.guestNameInput.value = currentVal;
    state.guestName = currentVal;
    elements.guestNameInput.focus();
    updatePreview();
  });

  // Mode Switcher (Single vs Batch)
  elements.tabSingleGuest.addEventListener('click', () => {
    elements.tabSingleGuest.classList.add('active');
    elements.tabBatchGuest.classList.remove('active');
    elements.singleGuestForm.classList.remove('hidden');
    elements.batchGuestForm.classList.add('hidden');
  });

  elements.tabBatchGuest.addEventListener('click', () => {
    elements.tabBatchGuest.classList.add('active');
    elements.tabSingleGuest.classList.remove('active');
    elements.batchGuestForm.classList.remove('hidden');
    elements.singleGuestForm.classList.add('hidden');
  });

  // Batch names counter
  elements.batchNamesInput.addEventListener('input', (e) => {
    const lines = e.target.value
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    elements.batchCountBadge.textContent = `${lines.length} Guest${lines.length === 1 ? '' : 's'}`;
  });

  // Typography Accordion Toggle
  elements.toggleTypography.addEventListener('click', () => {
    elements.typographyContent.classList.toggle('collapsed');
    elements.typographyChevron.classList.toggle('collapsed');
  });


  // Sliders
  elements.fontSizeRange.addEventListener('input', (e) => {
    state.fontSize = parseInt(e.target.value, 10);
    elements.fontSizeDisplay.textContent = `${state.fontSize}px`;
    updatePreview();
  });

  elements.yOffsetRange.addEventListener('input', (e) => {
    state.yOffset = parseInt(e.target.value, 10);
    elements.yOffsetDisplay.textContent = `${state.yOffset > 0 ? '+' : ''}${state.yOffset}px`;
    updatePreview();
  });

  elements.xOffsetRange.addEventListener('input', (e) => {
    state.xOffset = parseInt(e.target.value, 10);
    elements.xOffsetDisplay.textContent = `${state.xOffset > 0 ? '+' : ''}${state.xOffset}px`;
    updatePreview();
  });

  // Color Swatches
  elements.colorPalette.addEventListener('click', (e) => {
    const swatch = e.target.closest('.color-swatch');
    if (!swatch) return;
    state.textColor = swatch.dataset.color;
    updateColorPaletteUI(state.textColor);
    updatePreview();
  });

  elements.customColorInput.addEventListener('input', (e) => {
    state.textColor = e.target.value;
    updateColorPaletteUI(state.textColor);
    updatePreview();
  });

  // Reset Styles
  elements.btnResetStyles.addEventListener('click', () => {
    const eventConfig = EVENTS[state.currentEvent];
    state.fontFamily = "'Great Vibes', cursive";
    state.fontSize = eventConfig.defaultFontSize;
    elements.fontSizeRange.value = state.fontSize;
    elements.fontSizeDisplay.textContent = `${state.fontSize}px`;
    state.yOffset = 0;
    elements.yOffsetRange.value = 0;
    elements.yOffsetDisplay.textContent = '0px';
    state.lineSpacing = eventConfig.defaultLineSpacing || 82;
    state.xOffset = 0;
    elements.xOffsetRange.value = 0;
    elements.xOffsetDisplay.textContent = '0px';
    state.textColor = eventConfig.defaultColor;
    updateColorPaletteUI(state.textColor);
    state.alignStyle = 'after-to';
    state.line2Display = 'auto';
    state.line2Align = 'centered';
    updatePreview();
  });

  // Actions
  if (elements.btnShareWhatsApp) {
    elements.btnShareWhatsApp.addEventListener('click', handleShareWhatsApp);
  }
  elements.btnDownloadPDF.addEventListener('click', handleDownloadPDF);
  elements.btnDownloadBatchPDF.addEventListener('click', handleBatchPDFDownload);

  // Mobile Jump navigation
  if (elements.btnJumpToPreview) {
    elements.btnJumpToPreview.addEventListener('click', () => {
      if (elements.previewPanel) {
        elements.previewPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
  if (elements.btnJumpToForm) {
    elements.btnJumpToForm.addEventListener('click', () => {
      elements.guestNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      elements.guestNameInput.focus();
    });
  }

  // Preview Tabs (Page 1, Page 2, Side-by-Side)
  elements.tabPreviewPage1.addEventListener('click', () => setPreviewMode('1'));
  elements.tabPreviewPage2.addEventListener('click', () => setPreviewMode('2'));
  elements.tabPreviewBoth.addEventListener('click', () => setPreviewMode('both'));

  // Zoom Modal
  elements.btnZoomToggle.addEventListener('click', openZoomModal);
  elements.btnCloseZoom.addEventListener('click', closeZoomModal);
  elements.zoomModal.addEventListener('click', (e) => {
    if (e.target === elements.zoomModal) closeZoomModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeZoomModal();
  });
}

/**
 * Preview Mode Selector
 */
function setPreviewMode(mode) {
  state.activePreviewPage = mode;
  [elements.tabPreviewPage1, elements.tabPreviewPage2, elements.tabPreviewBoth].forEach((t) => {
    t.classList.toggle('active', t.dataset.page === mode);
  });

  if (mode === '1') {
    elements.previewCanvasWrapper.classList.remove('side-by-side');
    elements.page1Box.classList.remove('hidden');
    elements.page2Box.classList.add('hidden');
  } else if (mode === '2') {
    elements.previewCanvasWrapper.classList.remove('side-by-side');
    elements.page1Box.classList.add('hidden');
    elements.page2Box.classList.remove('hidden');
  } else {
    // Both Side-by-Side
    elements.previewCanvasWrapper.classList.add('side-by-side');
    elements.page1Box.classList.remove('hidden');
    elements.page2Box.classList.remove('hidden');
  }
}

/**
 * Open Fullscreen Zoom Modal
 */
function openZoomModal() {
  const activeCanvas = state.activePreviewPage === '2' ? elements.page2Canvas : elements.page1Canvas;
  elements.modalCanvasContainer.innerHTML = '';
  const img = document.createElement('img');
  img.src = activeCanvas.toDataURL('image/png');
  img.alt = 'Full-resolution Wedding Invitation Preview';
  elements.modalCanvasContainer.appendChild(img);
  elements.zoomModal.classList.remove('hidden');
}

function closeZoomModal() {
  elements.zoomModal.classList.add('hidden');
}

/**
 * Initialize Application
 */
async function init() {
  setupEventListeners();

  // Preload primary assets including transparent floral motifs
  try {
    await Promise.all([
      preloadImage(EVENTS.valima.page1Src),
      preloadImage(EVENTS.valima.page2Src),
      preloadImage(EVENTS.valima.flowerSrc),
      preloadImage(EVENTS.nikah.page1Src),
      preloadImage(EVENTS.nikah.page2Src),
      preloadImage(EVENTS.nikah.flowerSrc),
      ensureFontsReady()
    ]);
  } catch (err) {
    console.warn('Preload warning:', err);
  }

  // Initial render
  await updatePreview();
}

// Boot
init();
