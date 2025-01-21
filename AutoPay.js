// ==UserScript==
// @name         Offene Belege Lexoffice
// @namespace    http://tampermonkey.net/
// @version      v5
// @description  Offene Einnahmen werden automatisch vervollständigt.
// @author       r7
// @match        https://app.lexoffice.de/vouchers
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lexoffice.de
// @grant        none
// ==/UserScript==
(function() {
    'use strict';

    // Konstanten
    const SELECTORS = {
        PARENT_DIV: '.grld-main-padding-left-15',
        DIV_BLOCKS: '.list-group-item.grld-bs-list-group-item-hover.grld-main-unselectable',
        CHECKMARK: '.grld-icon.grld-icon-checkbox, .grld-icon.grld-icon-checked',
        CHECKED: '.grld-icon.grld-icon-checked',
        FIRST_BUTTON: '.btn.btn-primary.grld-js-disable-on-click',
        SECOND_BUTTON: '.modal-footer .btn.btn-primary.grld-js-disable-on-click',
        DATE_INPUT: '#postingDate',
        PAGE_TITLE: 'div[style*="justify-content: space-between;"] h1',
        SCROLL_CONTAINER: '.list-group.grld-bs-list-group'
    };

    const WAIT_TIME = 400;
    const MONITOR_INTERVAL = 500;
    const SCROLL_INTERVAL = 200;
    const SCROLL_STEP = 800;
    const MAX_SCROLL_ATTEMPTS = 50;

    const BUTTON_STYLES = {
        margin: '5px',
        background: '#0e9e57',
        color: '#fff',
        borderRadius: '4px',
        border: 'none',
        padding: '9px 10px',
        fontWeight: '700',
        textShadow: 'none',
        outline: 'none',
        boxShadow: 'none',
        cursor: 'pointer'
    };

    const STATUS_STYLES = {
        margin: '5px',
        padding: '5px 10px',
        borderRadius: '4px',
        backgroundColor: '#f5f5f5',
        color: '#333',
        display: 'none'
    };

    const MODAL_STYLES = {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '9999'
    };

    const MODAL_CONTENT_STYLES = {
        backgroundColor: '#fff',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        width: '400px',
        maxWidth: '90%'
    };

    const MONTH_BUTTON_STYLES = {
        ...BUTTON_STYLES,
        width: '100%',
        marginBottom: '10px',
        background: '#fff',
        color: '#0e9e57',
        border: '2px solid #0e9e57'
    };

    const DROPDOWN_STYLES = {
        position: 'absolute',
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '4px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        marginTop: '5px',
        zIndex: 1000,
        display: 'none'
    };

    const DROPDOWN_ITEM_STYLES = {
        padding: '8px 15px',
        cursor: 'pointer',
        borderBottom: '1px solid #eee',
        color: '#333',
        backgroundColor: '#fff'
    };

    let ui = {
        markAllButton: null,
        bookSelectedButton: null,
        bookMonthButton: null,
        monthDropdown: null,
        statusText: null,
        container: null
    };

    // Hilfsfunktionen
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    
    const applyStyles = (element, styles) => {
        Object.entries(styles).forEach(([key, value]) => {
            element.style[key] = value;
        });
    };

    const showStatus = (message, isError = false) => {
        if (!ui.statusText) return;
        ui.statusText.textContent = message;
        ui.statusText.style.display = 'block';
        ui.statusText.style.backgroundColor = isError ? '#ffe6e6' : '#f5f5f5';
        ui.statusText.style.color = isError ? '#cc0000' : '#333';
    };

    const hideStatus = () => {
        if (!ui.statusText) return;
        ui.statusText.style.display = 'none';
    };

    const disableButtons = (disabled = true) => {
        Object.values(ui).forEach(element => {
            if (element && element.tagName === 'BUTTON') {
                element.disabled = disabled;
                element.style.opacity = disabled ? '0.6' : '1';
                element.style.cursor = disabled ? 'not-allowed' : 'pointer';
            }
        });
    };

    const getLastThreeMonths = () => {
        const months = [];
        const currentDate = new Date();
        for (let i = 0; i < 3; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i - 1, 1);
            months.push(date.toLocaleString('default', { month: 'long' }));
        }
        return months;
    };

    const createButton = (text) => {
        const button = document.createElement('button');
        button.innerText = text;
        applyStyles(button, BUTTON_STYLES);
        return button;
    };

    const createMonthDropdown = (months) => {
        const dropdown = document.createElement('select');
        applyStyles(dropdown, {
            margin: '10px',
            borderRadius: '4px',
            borderColor: '#0e9e57',
            height: '40px',
            width: '200px',
            cursor: 'pointer',
            display: 'none'
        });
        
        months.forEach(month => {
            const option = document.createElement('option');
            option.value = month;
            option.innerText = month;
            dropdown.appendChild(option);
        });
        
        return dropdown;
    };

    const createStatusText = () => {
        const status = document.createElement('div');
        applyStyles(status, STATUS_STYLES);
        return status;
    };

    const extractDate = (divBlock) => {
        const dateRegex = /vom (\d{2}\.\d{2}\.\d{4})/;
        const dateSpan = divBlock.querySelector('.list-group-item-text span');
        const dateMatch = dateSpan?.textContent.match(dateRegex);
        return dateMatch ? dateMatch[1] : null;
    };

    const setDateInput = async (dateText) => {
        if (!dateText) return false;
        
        const dateInput = document.querySelector(SELECTORS.DATE_INPUT);
        if (!dateInput) return false;

        dateInput.value = dateText;
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
    };

    const clickButton = async (selector) => {
        const button = document.querySelector(selector);
        if (!button) return false;
        
        button.click();
        return true;
    };

    const loadAllInvoices = async () => {
        showStatus('Lade alle Rechnungen...');
        const container = document.querySelector(SELECTORS.SCROLL_CONTAINER);
        if (!container) {
            showStatus('Fehler: Container nicht gefunden', true);
            return false;
        }

        let previousHeight = 0;
        let attempts = 0;
        
        while (attempts < MAX_SCROLL_ATTEMPTS) {
            container.scrollTop = container.scrollHeight;
            await sleep(SCROLL_INTERVAL);
            
            if (container.scrollHeight === previousHeight) {
                break;
            }
            
            previousHeight = container.scrollHeight;
            attempts++;
            showStatus(`Lade Rechnungen... (${attempts}/${MAX_SCROLL_ATTEMPTS})`);
        }

        container.scrollTop = 0;
        hideStatus();
        return true;
    };

    async function processBlock(divBlock, index, total, selectedMonth = null) {
        const dateText = extractDate(divBlock);
        if (selectedMonth) {
            const month = dateText ? 
                new Date(dateText.split('.').reverse().join('-')).toLocaleString('default', { month: 'long' }) : 
                null;
            if (month !== selectedMonth) return true;
        }

        showStatus(`Verarbeite Rechnung ${index + 1} von ${total}...`);

        const checkmark = divBlock.querySelector(SELECTORS.CHECKMARK);
        if (!checkmark) {
            showStatus(`Warnung: Checkbox für Rechnung ${index + 1} nicht gefunden`, true);
            return false;
        }

        checkmark.click();
        await sleep(WAIT_TIME);

        if (!await clickButton(SELECTORS.FIRST_BUTTON)) {
            showStatus(`Fehler: Erster Button für Rechnung ${index + 1} nicht gefunden`, true);
            return false;
        }
        await sleep(WAIT_TIME);

        if (!await setDateInput(dateText)) {
            showStatus(`Fehler: Datum für Rechnung ${index + 1} konnte nicht gesetzt werden`, true);
            return false;
        }
        
        if (!await clickButton(SELECTORS.SECOND_BUTTON)) {
            showStatus(`Fehler: Zweiter Button für Rechnung ${index + 1} nicht gefunden`, true);
            return false;
        }
        await sleep(WAIT_TIME);

        const finalCheckmark = divBlock.querySelector(SELECTORS.CHECKED);
        if (finalCheckmark) finalCheckmark.click();

        return true;
    }

    async function processBlocks(blocks, selectedMonth = null) {
        disableButtons(true);
        
        try {
            await loadAllInvoices();
            const total = blocks.length;
            
            for (let i = 0; i < blocks.length; i++) {
                await processBlock(blocks[i], i, total, selectedMonth);
            }
            
            showStatus(`Fertig! ${total} Rechnungen verarbeitet.`);
            await sleep(2000);
            hideStatus();
        } catch (error) {
            showStatus(`Ein Fehler ist aufgetreten: ${error.message}`, true);
        } finally {
            disableButtons(false);
        }
    }

    function addButton() {
        const parentDiv = document.querySelector(SELECTORS.PARENT_DIV);
        if (!parentDiv || Object.values(ui).some(el => el)) return;

        // Container für besseres Layout
        ui.container = document.createElement('div');
        applyStyles(ui.container, {
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '5px'
        });

        ui.markAllButton = createButton('🔄 Alle Rechnungen als bezahlt markieren');
        ui.bookSelectedButton = createButton('✓ Ausgewählte Rechnungen als bezahlt markieren');
        ui.bookMonthButton = createButton('📅 Rechnungen eines Monats als bezahlt markieren');
        ui.statusText = createStatusText();

        // Erstelle das Dropdown
        const months = getLastThreeMonths();
        ui.monthDropdown = createMonthDropdown(months);

        // Event Listeners
        ui.markAllButton.addEventListener('click', async () => {
            const blocks = document.querySelectorAll(SELECTORS.DIV_BLOCKS);
            await processBlocks(blocks);
        });

        ui.bookSelectedButton.addEventListener('click', async () => {
            const markedBlocks = Array.from(document.querySelectorAll(SELECTORS.DIV_BLOCKS))
                .filter(block => block.querySelector(SELECTORS.CHECKED));

            if (markedBlocks.length === 0) {
                showStatus('Bitte wählen Sie zuerst einige Rechnungen aus.', true);
                await sleep(2000);
                hideStatus();
                return;
            }

            const allCheckmarks = document.querySelectorAll(SELECTORS.CHECKED);
            allCheckmarks.forEach(checkmark => checkmark.click());
            await sleep(WAIT_TIME);
            
            await processBlocks(markedBlocks);
        });

        ui.bookMonthButton.addEventListener('click', () => {
            ui.monthDropdown.style.display = ui.monthDropdown.style.display === 'none' ? 'inline-block' : 'none';
        });

        ui.monthDropdown.addEventListener('change', async () => {
            const selectedMonth = ui.monthDropdown.value;
            ui.monthDropdown.style.display = 'none';
            const blocks = document.querySelectorAll(SELECTORS.DIV_BLOCKS);
            await processBlocks(blocks, selectedMonth);
        });

        // Füge Elemente zum Container hinzu
        Object.values(ui).forEach(element => {
            if (element && element !== ui.container) {
                ui.container.appendChild(element);
            }
        });

        // Füge Container zum Parent hinzu
        parentDiv.appendChild(ui.container);
    }

    function monitorPage() {
        const pageTitle = document.querySelector(SELECTORS.PAGE_TITLE);
        const titleText = pageTitle?.textContent.trim();
        
        const validTitles = [
            'Offene Einnahmen',
            'Offene Einnahmenminderungen',
            'Offene Ausgaben',
            'Offene Ausgabenminderungen'
        ];
        
        if (validTitles.includes(titleText)) {
            if (!ui.markAllButton || !document.body.contains(ui.markAllButton)) {
                addButton();
            }
        } else {
            if (ui.container && document.body.contains(ui.container)) {
                ui.container.remove();
                ui = Object.fromEntries(Object.keys(ui).map(key => [key, null]));
            }
        }
    }

    setInterval(monitorPage, MONITOR_INTERVAL);
    console.log("Script gestartet");
})();
