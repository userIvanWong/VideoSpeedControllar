// ==UserScript==
// @name         视频倍速插件
// @namespace    https://example.com
// @version      2.3  
// @description  Control HTML5 video speed (0.1x-20x) with a draggable, frosted glass GUI, +/- buttons, and a blue theme. Alt+S to toggle.
// @author       IvanCodes (UI Enhanced by AI & User Theme)
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    if (window.top !== window) return; // Don't run in frames

    const STORAGE_KEY = 'uvsc-rate-enhanced-blue-glass'; // Unique key for this version
    const MIN = 0.1;
    const MAX = 20;
    const STEP = 0.1;
    const PANEL_ID = 'uvsc-panel-enhanced-blue-glass';

    // --- Color Palette (Inspired by User Image, with Alpha for Glass Effect) ---
    // Use RGBA for background to control transparency
    const COLOR_BACKGROUND_RGB = '26, 43, 69'; // RGB for #1A2B45
    const BACKGROUND_ALPHA = 0.8; // Transparency level (0.0 to 1.0)
    const COLOR_BACKGROUND_GLASS = `rgba(${COLOR_BACKGROUND_RGB}, ${BACKGROUND_ALPHA})`; // Background with transparency

    const COLOR_INPUT_BG = 'rgba(17, 29, 51, 0.85)'; // Darker blue for input/button bg (slightly transparent too)
    const COLOR_SLIDER_TRACK = 'rgba(42, 74, 117, 0.9)'; // Medium blue for slider track (less transparent)
    const COLOR_ACCENT = '#4DACFF';      // Bright blue for slider thumb & active states (keep solid)
    const COLOR_TEXT_PRIMARY = '#FFFFFF'; // White text (keep solid)
    const COLOR_TEXT_SECONDARY = '#A0B0C0'; // Muted text (keep solid)
    const COLOR_SEPARATOR = 'rgba(255, 255, 255, 0.15)'; // Separator line color (slightly more opaque)
    const COLOR_SHADOW = 'rgba(0, 0, 0, 0.35)'; // Shadow color (maybe slightly darker)
    const BLUR_AMOUNT = '8px'; // Adjust blur intensity here

    let targetRate = parseFloat(localStorage.getItem(STORAGE_KEY)) || 1;
    let panelElement = null;
    let numberInput = null;
    let sliderInput = null;
    let isDragging = false;
    let offsetX, offsetY;

    // --- CSS Styles ---
    const cssStyles = `
        #${PANEL_ID} {
            position: fixed;
            z-index: 2147483647;
            top: 20px;
            left: 20px;
            background: ${COLOR_BACKGROUND_GLASS}; /* UPDATED: Background with transparency */
            color: ${COLOR_TEXT_PRIMARY};
            padding: 12px 16px;
            border-radius: 10px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            font-size: 14px;
            user-select: none;
            backdrop-filter: blur(${BLUR_AMOUNT}) saturate(120%); /* ADDED: Frosted glass effect */
            -webkit-backdrop-filter: blur(${BLUR_AMOUNT}) saturate(120%); /* For Safari compatibility */
            box-shadow: 0 4px 15px ${COLOR_SHADOW};
            border: 1px solid ${COLOR_SEPARATOR};
            display: flex;
            flex-direction: column;
            gap: 10px;
            min-width: 280px;
            transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
            overflow: hidden; /* Important for backdrop-filter + border-radius */
        }
        #${PANEL_ID} header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            padding-bottom: 8px;
            border-bottom: 1px solid ${COLOR_SEPARATOR};
            margin-bottom: 5px;
        }
        #${PANEL_ID} .uvsc-title {
            font-weight: 600;
            font-size: 15px;
            color: ${COLOR_TEXT_PRIMARY};
        }
        #${PANEL_ID} .uvsc-close-btn {
            background: none;
            border: none;
            color: ${COLOR_TEXT_SECONDARY};
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            padding: 0 5px;
            line-height: 1;
        }
        #${PANEL_ID} .uvsc-close-btn:hover {
            color: ${COLOR_TEXT_PRIMARY};
        }
        #${PANEL_ID} .uvsc-controls {
            display: flex;
            align-items: center;
            gap: 10px;
        }
         #${PANEL_ID} .uvsc-controls label {
             white-space: nowrap;
             color: ${COLOR_TEXT_PRIMARY};
         }
        #${PANEL_ID} input[type="number"].uvsc-speed-input {
            width: 55px;
            padding: 6px 8px;
            border: 1px solid ${COLOR_SEPARATOR};
            background-color: ${COLOR_INPUT_BG}; /* UPDATED: Input background with some transparency */
            color: ${COLOR_TEXT_PRIMARY};
            border-radius: 6px;
            text-align: center;
            font-size: 14px;
            -moz-appearance: textfield;
        }
        #${PANEL_ID} input[type="number"].uvsc-speed-input::-webkit-inner-spin-button,
        #${PANEL_ID} input[type="number"].uvsc-speed-input::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        #${PANEL_ID} .uvsc-speed-buttons {
            display: flex;
            gap: 5px;
        }
        #${PANEL_ID} .uvsc-speed-btn {
            background-color: ${COLOR_INPUT_BG}; /* UPDATED: Button background */
            border: 1px solid ${COLOR_SEPARATOR};
            color: ${COLOR_TEXT_PRIMARY};
            border-radius: 5px;
            padding: 4px 8px;
            font-weight: bold;
            cursor: pointer;
            transition: background-color 0.15s ease, border-color 0.15s ease;
            line-height: 1;
            font-size: 14px;
        }
        #${PANEL_ID} .uvsc-speed-btn:hover {
            /* Slightly lighten the background on hover */
            background-color: rgba(42, 74, 117, 0.9); /* Using slider track color */
            border-color: rgba(42, 74, 117, 0.9);
        }
        #${PANEL_ID} .uvsc-speed-btn:active {
             background-color: ${COLOR_ACCENT}; /* Accent color remains solid */
             border-color: ${COLOR_ACCENT};
             color: ${COLOR_BACKGROUND_RGB}; /* Text darkens for contrast */
        }

        /* --- Slider --- */
        #${PANEL_ID} input[type="range"].uvsc-speed-slider {
            flex-grow: 1;
            height: 6px;
            cursor: pointer;
            appearance: none;
            background: transparent; /* Base transparent */
            border-radius: 3px;
            outline: none;
            margin: 0;
            vertical-align: middle;
        }

        /* --- Webkit --- */
        #${PANEL_ID} input[type="range"].uvsc-speed-slider::-webkit-slider-runnable-track {
            height: 6px;
            background: ${COLOR_SLIDER_TRACK}; /* UPDATED: Track color */
            border-radius: 3px;
        }
        #${PANEL_ID} input[type="range"].uvsc-speed-slider::-webkit-slider-thumb {
            appearance: none;
            width: 16px;
            height: 16px;
            background: ${COLOR_ACCENT}; /* Accent color remains solid */
            border-radius: 50%;
            cursor: pointer;
            margin-top: -5px;
            border: none;
             transition: transform 0.1s ease;
        }
         #${PANEL_ID} input[type="range"].uvsc-speed-slider:active::-webkit-slider-thumb {
             transform: scale(1.1);
         }


        /* --- Firefox --- */
        #${PANEL_ID} input[type="range"].uvsc-speed-slider::-moz-range-track {
            height: 6px;
            background: ${COLOR_SLIDER_TRACK}; /* UPDATED: Track color */
            border-radius: 3px;
            border: none;
        }
        #${PANEL_ID} input[type="range"].uvsc-speed-slider::-moz-range-thumb {
            width: 16px;
            height: 16px;
            background: ${COLOR_ACCENT}; /* Accent color remains solid */
            border-radius: 50%;
            cursor: pointer;
            border: none;
             transition: transform 0.1s ease;
        }
         #${PANEL_ID} input[type="range"].uvsc-speed-slider:active::-moz-range-thumb {
             transform: scale(1.1);
         }
         #${PANEL_ID} input[type="range"].uvsc-speed-slider::-moz-focus-outer {
             border: 0;
         }
    `;

    // --- Rest of the script remains the same as v2.2 ---
    // (injectStyles, createPanel, update, setRate, applyRateToAll, observeVideos, GM_registerMenuCommand, Initialization)

    function injectStyles() {
        const styleTag = document.createElement('style');
        styleTag.textContent = cssStyles;
        (document.head || document.documentElement).appendChild(styleTag);
    }

    function createPanel() {
        if (document.getElementById(PANEL_ID)) return;

        injectStyles();

        panelElement = document.createElement('div');
        panelElement.id = PANEL_ID;

        // --- Header ---
        const header = document.createElement('header');
        const title = document.createElement('span');
        title.textContent = '视频倍速插件';
        title.className = 'uvsc-title';
        header.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.className = 'uvsc-close-btn';
        closeBtn.title = '隐藏面板 (Alt+S)';
        closeBtn.addEventListener('click', () => {
            panelElement.style.display = 'none';
        });
        header.appendChild(closeBtn);
        panelElement.appendChild(header);

        // --- Controls Area ---
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'uvsc-controls';

        const label = document.createElement('label');
        label.textContent = '速度:';
        label.htmlFor = 'uvsc-speed-input-field';
        controlsDiv.appendChild(label);

        numberInput = document.createElement('input');
        numberInput.type = 'number';
        numberInput.min = MIN;
        numberInput.max = MAX;
        numberInput.step = STEP;
        numberInput.value = targetRate.toFixed(1);
        numberInput.className = 'uvsc-speed-input';
        numberInput.id = 'uvsc-speed-input-field';
        controlsDiv.appendChild(numberInput);

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'uvsc-speed-buttons';
        const btnMinus = document.createElement('button');
        btnMinus.textContent = '-';
        btnMinus.className = 'uvsc-speed-btn';
        btnMinus.title = `-${STEP}`;
        btnMinus.addEventListener('click', () => update(targetRate - STEP));
        buttonsDiv.appendChild(btnMinus);

        const btnPlus = document.createElement('button');
        btnPlus.textContent = '+';
        btnPlus.className = 'uvsc-speed-btn';
        btnPlus.title = `+${STEP}`;
        btnPlus.addEventListener('click', () => update(targetRate + STEP));
        buttonsDiv.appendChild(btnPlus);
        controlsDiv.appendChild(buttonsDiv);

        panelElement.appendChild(controlsDiv);

        // --- Slider Input ---
        sliderInput = document.createElement('input');
        sliderInput.type = 'range';
        sliderInput.min = MIN;
        sliderInput.max = MAX;
        sliderInput.step = STEP;
        sliderInput.value = targetRate;
        sliderInput.className = 'uvsc-speed-slider';
        panelElement.appendChild(sliderInput);

        // --- Event Listeners ---
        numberInput.addEventListener('change', (e) => update(e.target.value));
        sliderInput.addEventListener('input', (e) => update(e.target.value));

        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.code === 'KeyS') {
                 if (panelElement) {
                     panelElement.style.display = panelElement.style.display === 'none' ? 'flex' : 'none';
                 } else if (!document.getElementById(PANEL_ID)) {
                     createPanel();
                 }
            }
        });

        // --- Draggability ---
        header.addEventListener('mousedown', (e) => {
            if (e.target === closeBtn) return;
            isDragging = true;
            offsetX = e.clientX - panelElement.offsetLeft;
            offsetY = e.clientY - panelElement.offsetTop;
            panelElement.style.transition = 'none';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
        });

        function onMouseMove(e) {
            if (!isDragging) return;
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;
            const C = document.documentElement;
            newX = Math.max(0, Math.min(newX, C.clientWidth - panelElement.offsetWidth));
            newY = Math.max(0, Math.min(newY, C.clientHeight - panelElement.offsetHeight));
            panelElement.style.left = `${newX}px`;
            panelElement.style.top = `${newY}px`;
        }

        function onMouseUp() {
            if (isDragging) {
                isDragging = false;
                panelElement.style.transition = '';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
        }

        // --- Append Panel ---
        if (document.body) {
            document.body.appendChild(panelElement);
        } else {
            const wait = setInterval(() => {
                if (document.body) {
                    document.body.appendChild(panelElement);
                    clearInterval(wait);
                }
            }, 100);
        }
    }

    function update(rate, fromStorage = false) {
        let newRate = parseFloat(rate);
        if (isNaN(newRate)) newRate = 1.0;
        newRate = Math.max(MIN, Math.min(MAX, newRate));
        newRate = Math.round(newRate / STEP) * STEP;
        targetRate = newRate;

        if (numberInput) numberInput.value = targetRate.toFixed(1);
        if (sliderInput) sliderInput.value = targetRate;

        if (!fromStorage) localStorage.setItem(STORAGE_KEY, targetRate);
        applyRateToAll();
    }

    function setRate(video) {
        try {
            if (video.playbackRate !== targetRate) video.playbackRate = targetRate;
        } catch (_) {}
    }

    function applyRateToAll() {
        document.querySelectorAll('video').forEach(setRate);
    }

    function observeVideos() {
        const seen = new WeakSet();
        const observer = new MutationObserver((records) => {
            for (const rec of records) {
                for (const node of rec.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'VIDEO' && !seen.has(node)) {
                            seen.add(node);
                            setRate(node);
                        } else if (node.querySelectorAll) {
                            node.querySelectorAll('video').forEach((v) => {
                                if (!seen.has(v)) { seen.add(v); setRate(v); }
                            });
                        }
                    }
                }
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        applyRateToAll();
    }

    GM_registerMenuCommand('⚙️ 设置视频速度 (插件)', () => {
        const currentVal = targetRate.toFixed(1);
        const valStr = prompt(`请输入播放倍速 (${MIN} – ${MAX}):`, currentVal);
        if (valStr !== null) {
             const val = parseFloat(valStr);
             if (!isNaN(val)) update(val);
             else alert("输入无效，请输入数字。");
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createPanel();
            update(localStorage.getItem(STORAGE_KEY) || 1, true);
            observeVideos();
        });
    } else {
        createPanel();
        update(localStorage.getItem(STORAGE_KEY) || 1, true);
        observeVideos();
    }

})();