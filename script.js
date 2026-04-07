document.addEventListener('DOMContentLoaded', () => {
    // --- Data for Dynamic Info Card ---
    const algoData = {
        "FIFO": {
            title: "📖 Understanding FIFO (First-In-First-Out)",
            desc: "FIFO is the simplest page replacement algorithm used by operating systems.",
            bullets: `<li><strong>How it works:</strong> The OS tracks all pages in memory in a queue. When memory is full, it evicts the oldest page (the one that entered first).</li>
                      <li><strong>Analogy:</strong> Think of a queue at a grocery store. The person who has been in line the longest gets served and leaves first.</li>
                      <li><strong>The Catch:</strong> It suffers from Belady's Anomaly, where giving the system more memory frames can sometimes cause more page faults!</li>`
        },
        "LRU": {
            title: "📖 Understanding LRU (Least Recently Used)",
            desc: "LRU is a highly effective algorithm based on the idea that pages used recently will likely be used again soon.",
            bullets: `<li><strong>How it works:</strong> When memory is full, the OS evicts the page that has not been accessed for the longest amount of time.</li>
                      <li><strong>Analogy:</strong> Think of a messy desk. To make room for a new paper, you throw away the paper at the very bottom of the pile that you haven't looked at in weeks.</li>
                      <li><strong>Pros & Cons:</strong> It doesn't suffer from Belady's Anomaly and performs very well, but it requires the OS to keep constant track of "time since last use" for every page.</li>`
        },
        "OPTIMAL": {
            title: "📖 Understanding Optimal Replacement",
            desc: "The Optimal algorithm (also known as OPT or MIN) represents the absolute perfect way to manage memory.",
            bullets: `<li><strong>How it works:</strong> When memory is full, it looks into the future and evicts the page that will not be needed for the longest amount of time.</li>
                      <li><strong>Analogy:</strong> Imagine packing for a trip while knowing exactly what the weather will be every single day. You know exactly what to throw out of your suitcase to make room.</li>
                      <li><strong>The Catch:</strong> It is impossible to implement in a real OS because an OS cannot predict the future! It is used purely as a theoretical benchmark.</li>`
        }
    };

    const infoBtn = document.getElementById('info-btn');
    const infoWrapper = document.getElementById('info-wrapper');
    const algorithmSelect = document.getElementById('algorithm');
    
    function updateInfoCard() {
        const algo = algorithmSelect.value;
        const data = algoData[algo];
        document.getElementById('info-title').innerHTML = data.title;
        document.getElementById('info-desc').innerHTML = data.desc;
        document.getElementById('info-bullets').innerHTML = data.bullets;
        
        infoBtn.innerHTML = infoWrapper.classList.contains('open') ? `Close ${algo} Info ❌` : `What is ${algo}? ℹ️`;
    }

    updateInfoCard();
    algorithmSelect.addEventListener('change', updateInfoCard);
    infoBtn.addEventListener('click', () => {
        infoWrapper.classList.toggle('open');
        updateInfoCard(); 
    });

    // --- Core UI Elements ---
    const simulateBtn = document.getElementById('simulate-btn');
    const compareBtn = document.getElementById('compare-btn');
    const resetBtn = document.getElementById('reset-btn');
    const framesInput = document.getElementById('frames');
    const refStringInput = document.getElementById('reference-string');
    
    const outputSection = document.getElementById('output-section');
    const controlsSection = document.getElementById('controls-section');
    const liveStatsSection = document.getElementById('live-stats-section');
    const comparisonSection = document.getElementById('comparison-section');

    let isPaused = false;
    let isSimulating = false;
    let abortSimulation = false;
    const delayMs = 1200; 
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    simulateBtn.addEventListener('click', () => startProcess('simulate'));
    compareBtn.addEventListener('click', () => startProcess('compare'));
    resetBtn.addEventListener('click', resetSimulation);

    function getInputs() {
        const numFrames = parseInt(framesInput.value);
        const refStringRaw = refStringInput.value;
        if (isNaN(numFrames) || numFrames < 1) {
            alert("Please enter a valid number of frames.");
            return null;
        }
        const pages = refStringRaw.split(',').map(item => parseInt(item.trim())).filter(item => !isNaN(item));
        if (pages.length === 0) {
            alert("Please enter a valid reference string.");
            return null;
        }
        return { numFrames, pages, selectedAlgo: algorithmSelect.value };
    }

    async function startProcess(mode) {
        if (isSimulating) return;
        const inputs = getInputs();
        if (!inputs) return;

        resetSimulationState(); 
        
        // BUG FIX: We must tell the new simulation it is allowed to run!
        abortSimulation = false; 

        if (mode === 'simulate') {
            isSimulating = true;
            simulateBtn.disabled = true;
            compareBtn.disabled = true;
            setupVisualUI(inputs.numFrames);
            await runVisualSimulation(inputs.pages, inputs.numFrames, inputs.selectedAlgo);
        } else if (mode === 'compare') {
            runInstantComparison(inputs.pages, inputs.numFrames);
        }
    }

    // --- INSTANT COMPARISON LOGIC ---
    function runInstantComparison(pages, numFrames) {
        comparisonSection.classList.remove('hidden');
        document.getElementById('comp-frames').textContent = numFrames;
        document.getElementById('comp-pages').textContent = pages.length;

        const results = [
            { name: 'Optimal', faults: headlessSimulate(pages, numFrames, 'OPTIMAL') },
            { name: 'LRU', faults: headlessSimulate(pages, numFrames, 'LRU') },
            { name: 'FIFO', faults: headlessSimulate(pages, numFrames, 'FIFO') }
        ];

        const minFaults = Math.min(...results.map(r => r.faults));
        const tbody = document.getElementById('comparison-table-body');
        tbody.innerHTML = '';

        results.forEach(res => {
            let hits = pages.length - res.faults;
            let ratio = ((hits / pages.length) * 100).toFixed(1) + "%";
            let isWinner = res.faults === minFaults;
            
            const tr = document.createElement('tr');
            if (isWinner) tr.classList.add('winner-row');
            
            tr.innerHTML = `
                <td>${res.name} ${isWinner ? '🏆 (Winner)' : ''}</td>
                <td><span style="color: #ef4444; font-weight:bold;">${res.faults}</span></td>
                <td><span style="color: #10b981; font-weight:bold;">${hits}</span></td>
                <td>${ratio}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function headlessSimulate(pages, numFrames, algo) {
        let frames = [];
        let faults = 0;
        let fifoIndex = 0;
        let lruHistory = [];

        for (let step = 0; step < pages.length; step++) {
            let page = pages[step];
            
            if (frames.includes(page)) {
                if (algo === 'LRU') {
                    lruHistory = lruHistory.filter(p => p !== page);
                    lruHistory.push(page);
                }
            } else {
                faults++;
                if (frames.length < numFrames) {
                    frames.push(page);
                    if (algo === 'LRU') lruHistory.push(page);
                } else {
                    if (algo === 'FIFO') {
                        frames[fifoIndex] = page;
                        fifoIndex = (fifoIndex + 1) % numFrames;
                    } else if (algo === 'LRU') {
                        let replacedPage = lruHistory[0];
                        let replacedIndex = frames.indexOf(replacedPage);
                        frames[replacedIndex] = page;
                        lruHistory.shift();
                        lruHistory.push(page);
                    } else if (algo === 'OPTIMAL') {
                        let farthestUse = step;
                        let replacedIndex = -1;
                        for (let i = 0; i < frames.length; i++) {
                            let nextUse = pages.indexOf(frames[i], step + 1);
                            if (nextUse === -1) { replacedIndex = i; break; }
                            if (nextUse > farthestUse) { farthestUse = nextUse; replacedIndex = i; }
                        }
                        if (replacedIndex === -1) replacedIndex = 0;
                        frames[replacedIndex] = page;
                    }
                }
            }
        }
        return faults;
    }

    // --- VISUAL SIMULATION LOGIC ---
    function setupVisualUI(numFrames) {
        controlsSection.classList.remove('hidden');
        liveStatsSection.classList.remove('hidden');
        infoWrapper.classList.remove('open');
        updateInfoCard();
        
        document.getElementById('explanation-text').innerHTML = "Simulation starting...";
        document.getElementById('stat-hits').textContent = "0";
        document.getElementById('stat-faults').textContent = "0";
        document.getElementById('stat-hit-ratio').textContent = "0.0%";
        document.getElementById('stat-miss-ratio').textContent = "0.0%";

        controlsSection.innerHTML = `
            <button id="pause-btn" class="btn secondary">Pause ⏸️</button>
            <button id="resume-btn" class="btn primary hidden">Resume ▶️</button>
        `;

        document.getElementById('pause-btn').addEventListener('click', () => {
            isPaused = true;
            document.getElementById('pause-btn').classList.add('hidden');
            document.getElementById('resume-btn').classList.remove('hidden');
        });
        document.getElementById('resume-btn').addEventListener('click', () => {
            isPaused = false;
            document.getElementById('resume-btn').classList.add('hidden');
            document.getElementById('pause-btn').classList.remove('hidden');
        });

        outputSection.innerHTML = `
            <h3 class="view-header">Visual Grid Representation</h3>
            <div id="grid-container"></div>
            <h3 class="view-header">Detailed Step Log</h3>
            <table class="simulation-table">
                <thead><tr><th>Step</th><th>Page</th><th>Frames State</th><th>Status</th></tr></thead>
                <tbody id="table-body"></tbody>
            </table>
        `;

        let tableHTML = `<div class="table-container"><table class="horizontal-table"><tbody><tr id="row-time"><th>TIME</th></tr><tr id="row-ref"><th>Ref</th></tr>`;
        for(let i = 0; i < numFrames; i++) tableHTML += `<tr id="row-frame-${i}"><th>Frame ${i + 1}</th></tr>`;
        tableHTML += `<tr id="row-result"><th>Result</th></tr></tbody></table></div>`;
        document.getElementById('grid-container').innerHTML = tableHTML;
    }

    async function runVisualSimulation(pages, numFrames, algorithm) {
        const tableBody = document.getElementById('table-body');
        let frames = [];
        let pageFaults = 0, pageHits = 0;
        let fifoIndex = 0; 
        let lruHistory = []; 

        for (let step = 0; step < pages.length; step++) {
            if (abortSimulation) break;
            while (isPaused) { if (abortSimulation) break; await sleep(100); }
            if (abortSimulation) break;

            const page = pages[step];
            let isFault = false, replacedIndex = -1, explanationString = "";

            if (frames.includes(page)) {
                pageHits++;
                explanationString = `Page <strong>${page}</strong> is already in memory. <span style="color: #10b981; font-weight: bold;">Hit!</span>`;
                if (algorithm === "LRU") {
                    lruHistory = lruHistory.filter(p => p !== page);
                    lruHistory.push(page);
                }
            } else {
                pageFaults++;
                isFault = true;
                if (frames.length < numFrames) {
                    replacedIndex = frames.length; 
                    frames.push(page);
                    explanationString = `Placed page <strong>${page}</strong> in an empty frame. <span style="color: #f43f5e; font-weight: bold;">Fault!</span>`;
                    if (algorithm === "LRU") lruHistory.push(page);
                } else {
                    let replacedPage;
                    if (algorithm === "FIFO") {
                        replacedIndex = fifoIndex;
                        replacedPage = frames[fifoIndex];
                        frames[fifoIndex] = page;
                        fifoIndex = (fifoIndex + 1) % numFrames;
                        explanationString = `Memory full. <strong>FIFO</strong> evicts oldest page (<strong>${replacedPage}</strong>) for <strong>${page}</strong>. <span style="color: #f43f5e; font-weight: bold;">Fault!</span>`;
                    } else if (algorithm === "LRU") {
                        replacedPage = lruHistory[0]; 
                        replacedIndex = frames.indexOf(replacedPage);
                        frames[replacedIndex] = page;
                        lruHistory.shift(); lruHistory.push(page); 
                        explanationString = `Memory full. <strong>LRU</strong> evicts least recently used (<strong>${replacedPage}</strong>) for <strong>${page}</strong>. <span style="color: #f43f5e; font-weight: bold;">Fault!</span>`;
                    } else if (algorithm === "OPTIMAL") {
                        let farthestUse = step;
                        for (let i = 0; i < frames.length; i++) {
                            let nextUse = pages.indexOf(frames[i], step + 1);
                            if (nextUse === -1) { replacedIndex = i; break; }
                            if (nextUse > farthestUse) { farthestUse = nextUse; replacedIndex = i; }
                        }
                        if (replacedIndex === -1) replacedIndex = 0;
                        replacedPage = frames[replacedIndex];
                        frames[replacedIndex] = page;
                        explanationString = `Memory full. <strong>Optimal</strong> evicts (<strong>${replacedPage}</strong>) for <strong>${page}</strong>. <span style="color: #f43f5e; font-weight: bold;">Fault!</span>`;
                    }
                }
            }

            document.getElementById('explanation-text').innerHTML = explanationString;
            document.getElementById('stat-hits').textContent = pageHits;
            document.getElementById('stat-faults').textContent = pageFaults;
            document.getElementById('stat-hit-ratio').textContent = ((pageHits / (step + 1)) * 100).toFixed(1) + "%";
            document.getElementById('stat-miss-ratio').textContent = ((pageFaults / (step + 1)) * 100).toFixed(1) + "%";

            let statusText = isFault ? "FAULT" : "HIT";
            let statusClass = isFault ? "status-fault" : "status-hit";
            tableBody.insertAdjacentHTML('beforeend', `<tr><td>${step + 1}</td><td><strong>${page}</strong></td><td class="frames-cell">[ ${[...frames].join(', ')} ]</td><td><span class="${statusClass}">${statusText}</span></td></tr>`);

            document.getElementById('row-time').insertAdjacentHTML('beforeend', `<td><div class="cell time-cell">${step + 1}</div></td>`);
            document.getElementById('row-ref').insertAdjacentHTML('beforeend', `<td><div class="cell ref-cell">${page}</div></td>`);
            for(let i = 0; i < numFrames; i++) {
                let cellContent = frames[i] !== undefined ? frames[i] : "";
                let highlightClass = (i === replacedIndex) ? "highlight-replace" : "";
                document.getElementById(`row-frame-${i}`).insertAdjacentHTML('beforeend', `<td><div class="cell ${highlightClass}">${cellContent}</div></td>`);
            }
            let gridResultClass = isFault ? "result-miss" : "result-hit";
            document.getElementById('row-result').insertAdjacentHTML('beforeend', `<td><div class="cell ${gridResultClass}">${isFault ? "M" : "H"}</div></td>`);

            const tableContainer = document.querySelector('.table-container');
            if (tableContainer) tableContainer.scrollLeft = tableContainer.scrollWidth;

            await sleep(delayMs);
        }

        isSimulating = false;
        simulateBtn.disabled = false;
        compareBtn.disabled = false;
        if (!abortSimulation) {
            controlsSection.innerHTML = `<p style="color: #f8fafc; font-weight: bold; font-size: 1.2rem;">Simulation Complete! 🎉</p>`;
            document.getElementById('explanation-text').innerHTML = "Simulation finished successfully.";
        }
    }

    function resetSimulationState() {
        abortSimulation = true;
        isSimulating = false;
        isPaused = false;
        simulateBtn.disabled = false;
        compareBtn.disabled = false;
        
        outputSection.innerHTML = "";
        controlsSection.classList.add('hidden');
        liveStatsSection.classList.add('hidden');
        comparisonSection.classList.add('hidden');
    }

    function resetSimulation() {
        resetSimulationState();
        framesInput.value = "3";
        refStringInput.value = "7,0,1,2,0,3,0,4,2,3,0,3,2";
        infoWrapper.classList.remove('open');
        updateInfoCard();
    }
});
