document.addEventListener('DOMContentLoaded', () => {
    // Info Card Toggle Logic
    const infoBtn = document.getElementById('info-btn');
    const infoCard = document.getElementById('fifo-info-card');

    infoBtn.addEventListener('click', () => {
        infoCard.classList.toggle('hidden');
        if (infoCard.classList.contains('hidden')) {
            infoBtn.innerHTML = "What is FIFO? ℹ️";
        } else {
            infoBtn.innerHTML = "Close Info ❌";
        }
    });

    // Simulation Elements
    const simulateBtn = document.getElementById('simulate-btn');
    const resetBtn = document.getElementById('reset-btn');
    const framesInput = document.getElementById('frames');
    const refStringInput = document.getElementById('reference-string');
    
    const outputSection = document.getElementById('output-section');
    const controlsSection = document.getElementById('controls-section');
    const liveStatsSection = document.getElementById('live-stats-section');

    const explanationText = document.getElementById('explanation-text');
    const statHits = document.getElementById('stat-hits');
    const statFaults = document.getElementById('stat-faults');
    const statHitRatio = document.getElementById('stat-hit-ratio');
    const statMissRatio = document.getElementById('stat-miss-ratio');

    let isPaused = false;
    let isSimulating = false;
    let abortSimulation = false;
    const delayMs = 1200; 

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    simulateBtn.addEventListener('click', startSimulation);
    resetBtn.addEventListener('click', resetSimulation);

    async function startSimulation() {
        if (isSimulating) return;

        const numFrames = parseInt(framesInput.value);
        const refStringRaw = refStringInput.value;

        if (isNaN(numFrames) || numFrames < 1) {
            alert("Please enter a valid number of frames.");
            return;
        }

        const pages = refStringRaw.split(',').map(item => parseInt(item.trim())).filter(item => !isNaN(item));
        if (pages.length === 0) {
            alert("Please enter a valid reference string.");
            return;
        }

        isSimulating = true;
        abortSimulation = false;
        isPaused = false;
        simulateBtn.disabled = true;

        setupUI(numFrames);
        await runFIFO(pages, numFrames);
    }

    function setupUI(numFrames) {
        controlsSection.classList.remove('hidden');
        liveStatsSection.classList.remove('hidden');
        
        // Hide info card if open to save space during simulation
        infoCard.classList.add('hidden');
        infoBtn.innerHTML = "What is FIFO? ℹ️";
        
        explanationText.innerHTML = "Simulation starting...";
        statHits.textContent = "0";
        statFaults.textContent = "0";
        statHitRatio.textContent = "0.0%";
        statMissRatio.textContent = "0.0%";

        controlsSection.innerHTML = `
            <button id="pause-btn" class="btn secondary">Pause ⏸️</button>
            <button id="resume-btn" class="btn primary hidden">Resume ▶️</button>
        `;

        document.getElementById('pause-btn').addEventListener('click', () => {
            isPaused = true;
            document.getElementById('pause-btn').classList.add('hidden');
            document.getElementById('resume-btn').classList.remove('hidden');
            explanationText.innerHTML += " <strong>(Paused)</strong>";
        });

        document.getElementById('resume-btn').addEventListener('click', () => {
            isPaused = false;
            document.getElementById('resume-btn').classList.add('hidden');
            document.getElementById('pause-btn').classList.remove('hidden');
            explanationText.innerHTML = explanationText.innerHTML.replace(" <strong>(Paused)</strong>", "");
        });

        let htmlContent = `
            <h3 class="view-header">Visual Grid Representation</h3>
            <div id="grid-container"></div>
            
            <h3 class="view-header">Detailed Step Log</h3>
            <table class="simulation-table">
                <thead>
                    <tr>
                        <th>Step</th>
                        <th>Page Referenced</th>
                        <th>Frames State</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="table-body"></tbody>
            </table>
        `;
        outputSection.innerHTML = htmlContent;

        let tableHTML = `<div class="table-container"><table class="horizontal-table"><tbody>`;
        tableHTML += `<tr id="row-time"><th>TIME</th></tr>`;
        tableHTML += `<tr id="row-ref"><th>Ref</th></tr>`;
        for(let i = 0; i < numFrames; i++) {
            tableHTML += `<tr id="row-frame-${i}"><th>Frame ${i + 1}</th></tr>`;
        }
        tableHTML += `<tr id="row-result"><th>Result</th></tr>`;
        tableHTML += `</tbody></table></div>`;
        
        document.getElementById('grid-container').innerHTML = tableHTML;
    }

    async function runFIFO(pages, numFrames) {
        const tableBody = document.getElementById('table-body');
        let frames = [];
        let fifoIndex = 0;
        let pageFaults = 0;
        let pageHits = 0;

        for (let step = 0; step < pages.length; step++) {
            if (abortSimulation) break;

            while (isPaused) {
                if (abortSimulation) break;
                await sleep(100);
            }
            if (abortSimulation) break;

            const page = pages[step];
            let isFault = false;
            let replacedIndex = -1; 
            let explanationString = "";

            if (frames.includes(page)) {
                pageHits++;
                isFault = false;
                explanationString = `Page <strong>${page}</strong> is already in memory. <span style="color: #10b981; font-weight: bold;">Page Hit!</span>`;
            } else {
                pageFaults++;
                isFault = true;

                if (frames.length < numFrames) {
                    replacedIndex = frames.length; 
                    frames.push(page);
                    explanationString = `Page <strong>${page}</strong> is not in memory. Placed in an empty frame. <span style="color: #ef4444; font-weight: bold;">Page Fault!</span>`;
                } else {
                    replacedIndex = fifoIndex; 
                    let replacedPage = frames[fifoIndex];
                    frames[fifoIndex] = page;
                    fifoIndex = (fifoIndex + 1) % numFrames;
                    explanationString = `Page <strong>${page}</strong> is not in memory. Memory is full. Replaced oldest page (<strong>${replacedPage}</strong>) with <strong>${page}</strong>. <span style="color: #ef4444; font-weight: bold;">Page Fault!</span>`;
                }
            }

            // --- UPDATE LIVE STATS & EXPLANATION ---
            explanationText.innerHTML = explanationString;
            statHits.textContent = pageHits;
            statFaults.textContent = pageFaults;
            
            let totalProcessed = step + 1;
            statHitRatio.textContent = ((pageHits / totalProcessed) * 100).toFixed(1) + "%";
            statMissRatio.textContent = ((pageFaults / totalProcessed) * 100).toFixed(1) + "%";

            // --- UPDATE TABLE 1 (VERTICAL DETAILED LOG) ---
            let statusText = isFault ? "FAULT" : "HIT";
            let statusClass = isFault ? "status-fault" : "status-hit";
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${step + 1}</td>
                <td><strong>${page}</strong></td>
                <td class="frames-cell">[ ${[...frames].join(', ')} ]</td>
                <td><span class="${statusClass}">${statusText}</span></td>
            `;
            tableBody.appendChild(tr);

            // --- UPDATE TABLE 2 (HORIZONTAL GRID) ---
            document.getElementById('row-time').insertAdjacentHTML('beforeend', `<td><div class="cell time-cell">${step + 1}</div></td>`);
            document.getElementById('row-ref').insertAdjacentHTML('beforeend', `<td><div class="cell ref-cell">${page}</div></td>`);

            for(let i = 0; i < numFrames; i++) {
                let cellContent = frames[i] !== undefined ? frames[i] : "";
                let highlightClass = (i === replacedIndex) ? "highlight-replace" : "";
                document.getElementById(`row-frame-${i}`).insertAdjacentHTML('beforeend', `<td><div class="cell ${highlightClass}">${cellContent}</div></td>`);
            }

            let gridResultText = isFault ? "M" : "H";
            let gridResultClass = isFault ? "result-miss" : "result-hit";
            document.getElementById('row-result').insertAdjacentHTML('beforeend', `<td><div class="cell ${gridResultClass}">${gridResultText}</div></td>`);

            const tableContainer = document.querySelector('.table-container');
            tableContainer.scrollLeft = tableContainer.scrollWidth;

            await sleep(delayMs);
        }

        isSimulating = false;
        simulateBtn.disabled = false;
        if (!abortSimulation) {
            controlsSection.innerHTML = `<p style="color: var(--text-main); font-weight: bold;">Simulation Complete! 🎉</p>`;
            explanationText.innerHTML = "Simulation finished successfully. Check the final stats below.";
        }
    }

    function resetSimulation() {
        abortSimulation = true;
        isSimulating = false;
        isPaused = false;
        simulateBtn.disabled = false;
        
        framesInput.value = "3";
        refStringInput.value = "7,0,1,2,0,3,0,4,2,3,0,3,2";
        
        outputSection.innerHTML = "";
        controlsSection.classList.add('hidden');
        controlsSection.innerHTML = "";
        liveStatsSection.classList.add('hidden');
    }
});