// Global State
const AppState = {
    rawData: [],
    networks: new Set(),
    authors: new Set(),
    chartInstance: null,
    networkInstance: null,
    wordCloudInstance: null,
    currentPage: 1,
    postsPerPage: 10,
    filters: {
        network: 'all',
        sortBy: 'relevancia'
    },
    cloudFilters: {
        network: 'all',
        author: 'all',
        date: ''
    },
    graphFilters: {
        network: 'all'
    },
    networkColors: {}
};

const NETWORK_COLORS_PALETTE = ['#2f81f7', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#ec4899', '#06b6d4'];

// Portuguese Enhanced Stop Words & Internet Slangs
const STOPWORDS = new Set([
    'a', 'o', 'e', 'de', 'da', 'do', 'em', 'um', 'uma', 'os', 'as', 'para', 'com', 'não', 'que', 'se', 'na',
    'no', 'por', 'mais', 'mas', 'como', 'ao', 'já', 'ou', 'seu', 'sua', 'lhe', 'nos', 'tem', 'também', 'até',
    'foi', 'ser', 'ele', 'ela', 'eles', 'elas', 'esse', 'essa', 'este', 'esta', 'isso', 'aquilo', 'muito',
    'são', 'quando', 'onde', 'depois', 'quem', 'me', 'te', 'minha', 'meu', 'nossa', 'nosso', 'sobre', 'pelo',
    'pela', 'aos', 'das', 'dos', 'nas', 'nos', 'qual', 'quais', 'tinha', 'temos', 'está', 'estava', 'seja',
    'pra', 'pro', 'vc', 'você', 'tudo', 'vai', 'vou', 'era', 'só', 'ainda', 'www', 'http', 'https', 'com', 'br',
    'tão', 'nem', 'sem', 'pois', 'então', 'entre', 'mesmo', 'porque', 'qualquer', 'algum', 'alguma', 'nenhum',
    'nenhuma', 'assim', 'aqui', 'ali', 'lá', 'isso', 'nada', 'tudo', 'coisa', 'fazer', 'feito', 'faz', 'ter',
    'tendo', 'ver', 'vendo', 'dizer', 'dizendo', 'poder', 'podendo', 'pode'
]);

// DOM Elements
const els = {
    uploadSection: document.getElementById('upload-section'),
    dashboardContent: document.getElementById('dashboard-content'),
    fileInput: document.getElementById('excel-upload'),
    errorMsg: document.getElementById('upload-error'),

    statPosts: document.getElementById('stat-total-posts'),
    statUsers: document.getElementById('stat-total-users'),
    statNetworks: document.getElementById('stat-total-networks'),

    filterNetwork: document.getElementById('filter-network'),
    filterSort: document.getElementById('sort-by'),
    postsContainer: document.getElementById('posts-container'),
    prevPage: document.getElementById('prev-page'),
    nextPage: document.getElementById('next-page'),
    pageInfo: document.getElementById('page-info'),
    pageInput: document.getElementById('page-input'),

    networkGraph: document.getElementById('network-graph'),
    networkSection: document.querySelector('.network-section'),
    btnFullscreenGraph: document.getElementById('btn-fullscreen-graph'),
    graphFilterNetwork: document.getElementById('graph-filter-network'),
    graphSentimentInfo: document.getElementById('graph-sentiment-info'),
    timelineChart: document.getElementById('timelineChart'),

    cloudCanvas: document.getElementById('wordcloudCanvas'),
    cloudFilterNetwork: document.getElementById('cloud-filter-network'),
    cloudFilterAuthor: document.getElementById('cloud-filter-author'),
    cloudFilterDate: document.getElementById('cloud-filter-date'),
    wordcloudWrapper: document.getElementById('wordcloud-wrapper'),
    cloudTooltip: document.getElementById('cloud-tooltip')
};

// Application Init
document.addEventListener('DOMContentLoaded', () => {
    // Resize observers for responsive canvas
    window.addEventListener('resize', debounce(() => {
        if (AppState.rawData.length > 0) {
            renderWordCloud();
        }
    }, 250));

    // File Input Listener
    els.fileInput.addEventListener('change', handleFileUpload);

    // Posts Filters
    els.filterNetwork.addEventListener('change', (e) => {
        AppState.filters.network = e.target.value;
        AppState.currentPage = 1;
        renderPosts();
    });
    els.filterSort.addEventListener('change', (e) => {
        AppState.filters.sortBy = e.target.value;
        AppState.currentPage = 1;
        renderPosts();
    });

    // Pagination
    els.prevPage.addEventListener('click', () => {
        if (AppState.currentPage > 1) {
            AppState.currentPage--;
            renderPosts();
        }
    });
    els.nextPage.addEventListener('click', () => {
        const filteredData = getFilteredPosts();
        if (AppState.currentPage * AppState.postsPerPage < filteredData.length) {
            AppState.currentPage++;
            renderPosts();
        }
    });

    // Graph Fullscreen Toggle
    if (els.btnFullscreenGraph) {
        els.btnFullscreenGraph.addEventListener('click', () => {
            const isFullscreen = els.networkSection.classList.toggle('is-fullscreen');

            // Toggle icon
            if (isFullscreen) {
                els.btnFullscreenGraph.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3h3M21 8h-3V5M3 21v-3h3M16 21v-3h3"/></svg>`;
                document.body.style.overflow = 'hidden';
            } else {
                els.btnFullscreenGraph.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
                document.body.style.overflow = '';
            }

            // Force graph redraw to fit new container dimensions
            setTimeout(() => {
                if (AppState.networkInstance) {
                    AppState.networkInstance.setSize('100%', '100%');
                    AppState.networkInstance.redraw();
                    AppState.networkInstance.fit();
                }
            }, 250); // slight delay ensures DOM layout is computed
        });
    }

    // Page Input Listener
    if (els.pageInput) {
        els.pageInput.addEventListener('change', (e) => {
            let val = parseInt(e.target.value, 10);
            const data = getFilteredPosts();
            const totalPages = Math.ceil(data.length / AppState.postsPerPage) || 1;

            if (isNaN(val) || val < 1) val = 1;
            if (val > totalPages) val = totalPages;

            AppState.currentPage = val;
            renderPosts();
        });
    }

    // Graph Filters
    if (els.graphFilterNetwork) {
        els.graphFilterNetwork.addEventListener('change', (e) => {
            AppState.graphFilters.network = e.target.value;
            renderNetworkGraph();
        });
    }

    // Cloud Filters
    els.cloudFilterNetwork.addEventListener('change', (e) => {
        AppState.cloudFilters.network = e.target.value;
        renderWordCloud();
    });
    els.cloudFilterAuthor.addEventListener('change', (e) => {
        AppState.cloudFilters.author = e.target.value;
        renderWordCloud();
    });
    els.cloudFilterDate.addEventListener('change', (e) => {
        AppState.cloudFilters.date = e.target.value;
        renderWordCloud();
    });
});

// -------------- DATA PROCESSING --------------

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    els.errorMsg.style.display = 'none';
    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            const targetSheetName = workbook.SheetNames.includes('Laminina') ? 'Laminina' : workbook.SheetNames[0];
            const worksheet = workbook.Sheets[targetSheetName];

            const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
            processData(json);
        } catch (error) {
            console.error(error);
            els.errorMsg.textContent = "Erro ao processar o arquivo. Certifique-se de que é um Excel válido.";
            els.errorMsg.style.display = 'block';
        }
    };
    reader.readAsArrayBuffer(file);
}

function processData(data) {
    if (!data || data.length === 0) {
        els.errorMsg.textContent = "Arquivo vazio ou não formatado corretamente.";
        els.errorMsg.style.display = 'block';
        return;
    }

    AppState.rawData = [];
    AppState.networks.clear();
    AppState.authors.clear();

    data.forEach(row => {
        // Encontrar colunas de forma case-insensitive
        const rowKeys = Object.keys(row);
        const getVal = (keyStr) => {
            const match = rowKeys.find(k => k.toLowerCase() === keyStr.toLowerCase());
            return match ? row[match] : '';
        };

        const likes = Number(getVal('likes')) || 0;
        const comments = Number(getVal('comments')) || 0;
        const shares = Number(getVal('shares')) || 0;

        // Custom Relevance Formula (Somareacoes & proportional inverse weights)
        const somaReacoes = comments + likes + shares;
        let relevance = 0;

        if (somaReacoes > 0) {
            const pesoComentarios = 1 / ((comments / somaReacoes) * 3 || 1); // fallback logic to prevent Infinity if value is 0
            const pesoCurtidas = 1 / ((likes / somaReacoes) * 3 || 1);
            const pesoCompartilhamentos = 1 / ((shares / somaReacoes) * 3 || 1);

            // Adjusted logic to apply weights ONLY if specific val > 0 to match formula proportionally
            const relComm = comments > 0 ? comments * pesoComentarios : 0;
            const relLikes = likes > 0 ? likes * pesoCurtidas : 0;
            const relShares = shares > 0 ? shares * pesoCompartilhamentos : 0;

            relevance = relComm + relLikes + relShares;
        }

        const network = getVal('socialNetwork') || 'Unknown';
        const author = getVal('usernameAuthor') || 'Unknown';
        const rawDate = getVal('createdAt');
        let dateObj = new Date(rawDate);
        if (isNaN(dateObj.getTime())) {
            // Failsafe format
            if (typeof rawDate === 'number') {
                // Excel date number
                dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
            } else {
                dateObj = new Date();
            }
        }

        const sentiment = (getVal('sentiment') || 'NEUTRAL').toUpperCase();

        AppState.networks.add(network);
        AppState.authors.add(author);

        AppState.rawData.push({
            id: generateId(),
            socialNetwork: network,
            likes,
            comments,
            shares,
            relevance,
            usernameAuthor: author,
            message: String(getVal('message')),
            sentiment: sentiment,
            createdAt: dateObj,
            dateString: dateObj.toISOString().split('T')[0] // yyyy-mm-dd
        });
    });

    els.uploadSection.style.display = 'none';
    els.dashboardContent.style.display = 'block';

    updateGlobalStats();
    populateSelectFilters();

    // Render Components
    renderPosts();
    renderTimelineChart();
    renderNetworkGraph();
    // Use timeout to ensure canvas width is rendered
    setTimeout(renderWordCloud, 100);
}

function updateGlobalStats() {
    els.statPosts.textContent = AppState.rawData.length.toLocaleString();
    els.statUsers.textContent = AppState.authors.size.toLocaleString();
    els.statNetworks.textContent = AppState.networks.size.toLocaleString();
}

function populateSelectFilters() {
    // Network Filter & Colors Assignments (Multiple targets)
    let networkOptions = '<option value="all">Todas as Redes</option>';
    const networksArray = Array.from(AppState.networks);
    networksArray.forEach((net, idx) => {
        networkOptions += `<option value="${net}">${net}</option>`;
        AppState.networkColors[net] = NETWORK_COLORS_PALETTE[idx % NETWORK_COLORS_PALETTE.length];
    });
    els.filterNetwork.innerHTML = networkOptions;
    els.cloudFilterNetwork.innerHTML = networkOptions;
    if (els.graphFilterNetwork) els.graphFilterNetwork.innerHTML = networkOptions;

    // Author Filter (Wordcloud)
    let authorOptions = '<option value="all">Todos os Autores</option>';
    const sortedAuthors = Array.from(AppState.authors).sort((a, b) => a.localeCompare(b));
    sortedAuthors.forEach(auth => {
        authorOptions += `<option value="${auth}">${auth}</option>`;
    });
    els.cloudFilterAuthor.innerHTML = authorOptions;
}

// -------------- POSTS RENDERING --------------

function getFilteredPosts() {
    let filtered = AppState.rawData;

    // Filter Network
    if (AppState.filters.network !== 'all') {
        filtered = filtered.filter(p => p.socialNetwork === AppState.filters.network);
    }

    // Sort
    const sort = AppState.filters.sortBy;
    filtered = [...filtered].sort((a, b) => {
        if (sort === 'relevancia') return b.relevance - a.relevance;
        if (sort === 'likes') return b.likes - a.likes;
        if (sort === 'comments') return b.comments - a.comments;
        if (sort === 'shares') return b.shares - a.shares;
        return 0;
    });

    return filtered;
}

function renderPosts() {
    const data = getFilteredPosts();
    const totalPages = Math.ceil(data.length / AppState.postsPerPage) || 1;

    if (AppState.currentPage > totalPages) AppState.currentPage = totalPages;
    if (AppState.currentPage < 1) AppState.currentPage = 1;

    const start = (AppState.currentPage - 1) * AppState.postsPerPage;
    const end = start + AppState.postsPerPage;
    const pageData = data.slice(start, end);

    els.postsContainer.innerHTML = '';

    if (pageData.length === 0) {
        els.postsContainer.innerHTML = '<p style="color:var(--text-secondary)">Nenhuma postagem encontrada com os filtros atuais.</p>';
        els.prevPage.disabled = true;
        els.nextPage.disabled = true;
        els.pageInfo.textContent = ` de 0`;
        els.pageInput.value = 0;
        els.pageInput.disabled = true;
        return;
    }

    els.pageInput.disabled = false;

    pageData.forEach(post => {
        const d = new Date(post.createdAt);
        const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const el = document.createElement('div');
        el.className = 'post-item';
        el.innerHTML = `
            <div class="post-header">
                <div>
                    <span class="post-author">@${post.usernameAuthor}</span>
                    <span style="color:var(--text-secondary); margin-left:8px; font-size:12px">${dateStr}</span>
                </div>
                <span class="post-network">${post.socialNetwork}</span>
            </div>
            <div class="post-message">${escapeHtml(post.message)}</div>
            <div class="post-metrics">
                <span class="metric">🌟 <span class="metric-hl">${post.relevance.toFixed(1)}</span> Rel.</span>
                <span class="metric">👍 ${post.likes}</span>
                <span class="metric">💬 ${post.comments}</span>
                <span class="metric">🔗 ${post.shares}</span>
            </div>
        `;
        els.postsContainer.appendChild(el);
    });

    els.pageInfo.textContent = ` de ${totalPages}`;
    els.pageInput.value = AppState.currentPage;
    els.pageInput.max = totalPages;
    els.prevPage.disabled = AppState.currentPage === 1;
    els.nextPage.disabled = AppState.currentPage === totalPages;
}

// -------------- NETWORK GRAPH --------------

function renderNetworkGraph() {
    const nodesMap = new Map();
    const edgesMap = new Map();

    const authorTokensMaps = new Map(); // tokenized author ids
    Array.from(AppState.authors).forEach(a => {
        authorTokensMaps.set(a.toLowerCase().replace(/[^a-z0-9]/g, ''), a);
    });

    const getSentimentColor = (sentiment) => {
        if (sentiment === 'POSITIVE') return '#10b981';
        if (sentiment === 'NEGATIVE') return '#ef4444';
        return '#8b5cf6'; // NEUTRAL
    };

    AppState.rawData.forEach(post => {
        // Filter out post if network doesn't match Graph Filter
        if (AppState.graphFilters.network !== 'all' && post.socialNetwork !== AppState.graphFilters.network) {
            return; // Skip this post
        }

        // Create/Update Post Author Node
        const me = post.usernameAuthor;
        if (!nodesMap.has(me)) {
            nodesMap.set(me, {
                id: me,
                label: me,
                color: { background: getSentimentColor(post.sentiment), border: 'rgba(255,255,255,0.2)' },
                font: { color: '#e6edf3' },
                value: 1, // default
                posts: []
            });
        }

        // Add the post to the node's list for the tooltip
        nodesMap.get(me).posts.push({ msg: post.message, net: post.socialNetwork });

        // Tokenize message to detect mentions (case insensitive, alphanumeric)
        const msgTokens = new Set(post.message.toLowerCase().split(/[^a-z0-9_]+/));

        msgTokens.forEach(token => {
            if (token && authorTokensMaps.has(token)) {
                const mentionedUser = authorTokensMaps.get(token);
                if (mentionedUser !== me) {
                    const edgeId = `${me}___${mentionedUser}`;
                    if (edgesMap.has(edgeId)) {
                        edgesMap.get(edgeId).value += 1;
                    } else {
                        edgesMap.set(edgeId, {
                            id: edgeId,
                            from: me,
                            to: mentionedUser,
                            value: 1,
                            color: { color: 'rgba(255,255,255,0.1)', highlight: 'rgba(47, 129, 247, 0.8)' }
                        });
                    }

                    // Add mentioned user if doesn't exist (assuming default neutral sentiment)
                    if (!nodesMap.has(mentionedUser)) {
                        nodesMap.set(mentionedUser, {
                            id: mentionedUser,
                            label: mentionedUser,
                            color: { background: '#8b5cf6', border: 'rgba(255,255,255,0.2)' },
                            font: { color: '#e6edf3' },
                            value: 1,
                            posts: []
                        });
                    }
                }
            }
        });
    });

    // Calculate Node Degrees based on Edges
    const degreeMap = new Map();
    Array.from(edgesMap.values()).forEach(edge => {
        degreeMap.set(edge.from, (degreeMap.get(edge.from) || 0) + edge.value);
        degreeMap.set(edge.to, (degreeMap.get(edge.to) || 0) + edge.value);
    });

    // Compute Sentiment Totals for current Graph View
    let posCount = 0;
    let negCount = 0;
    let neuCount = 0;

    AppState.rawData.forEach(post => {
        if (AppState.graphFilters.network !== 'all' && post.socialNetwork !== AppState.graphFilters.network) return;

        if (post.sentiment === 'POSITIVE') posCount++;
        else if (post.sentiment === 'NEGATIVE') negCount++;
        else neuCount++;
    });

    const totalCount = posCount + negCount + neuCount;
    const posPct = totalCount > 0 ? ((posCount / totalCount) * 100).toFixed(1) : "0.0";
    const negPct = totalCount > 0 ? ((negCount / totalCount) * 100).toFixed(1) : "0.0";
    const neuPct = totalCount > 0 ? ((neuCount / totalCount) * 100).toFixed(1) : "0.0";

    if (els.graphSentimentInfo) {
        els.graphSentimentInfo.style.display = 'block';
        els.graphSentimentInfo.innerHTML = `
            <div style="margin-bottom:6px; font-weight:bold; color:#fff; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:4px;">
                Total Sentimentos
            </div>
            <div style="margin-bottom:2px;"><span style="display:inline-block; width:10px; height:10px; background:#10b981; border-radius:50%; margin-right:6px;"></span>Positivos: <strong>${posCount}</strong> <span style="font-size:10px; color:#aaa">(${posPct}%)</span></div>
            <div style="margin-bottom:2px;"><span style="display:inline-block; width:10px; height:10px; background:#ef4444; border-radius:50%; margin-right:6px;"></span>Negativos: <strong>${negCount}</strong> <span style="font-size:10px; color:#aaa">(${negPct}%)</span></div>
            <div><span style="display:inline-block; width:10px; height:10px; background:#8b5cf6; border-radius:50%; margin-right:6px;"></span>Neutros: <strong>${neuCount}</strong> <span style="font-size:10px; color:#aaa">(${neuPct}%)</span></div>
        `;
    }

    // Process nodes map arrays for formatting properties
    const finalNodes = Array.from(nodesMap.values()).map(node => {
        node.value = Math.max((degreeMap.get(node.id) || 0), 1);

        // Build Custom HTML tooltip content
        if (node.posts && node.posts.length > 0) {
            let postsHtml = node.posts.map(p => {
                const netColor = AppState.networkColors[p.net] || '#7d8590';
                return `<div style="margin-bottom:10px; border-left:4px solid ${netColor}; padding-left:10px; background:rgba(255,255,255,0.05); border-radius:0 6px 6px 0; padding-top:6px; padding-bottom:6px;">
                    <strong style="font-size:11px; color:${netColor}; text-transform:uppercase; letter-spacing:0.5px;">${escapeHtml(p.net)}</strong><br>
                    <span style="color:#e6edf3; display:block; margin-top:4px;">${escapeHtml(p.msg)}</span>
                </div>`;
            }).join('');

            node.customHtml = `<div style="padding:14px;">
                <h4 style="margin-bottom:12px; font-size:14px; color:var(--text-primary); border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">@${escapeHtml(node.id)}</h4>
                ${postsHtml}
            </div>`;
        } else {
            node.customHtml = `<div style="padding:14px; color:var(--text-secondary); text-align:center;">Apenas Mencionado (Sem postagens cadastradas)</div>`;
        }

        return node;
    });

    const data = {
        nodes: new vis.DataSet(finalNodes),
        edges: new vis.DataSet(Array.from(edgesMap.values()))
    };

    const options = {
        nodes: {
            shape: 'dot',
            scaling: { min: 10, max: 40 } // Size proportional to degree logic exists in mapping
        },
        physics: {
            barnesHut: {
                gravitationalConstant: -2000,
                centralGravity: 0.3,
                springLength: 95,
                springConstant: 0.04,
                damping: 0.09,
                avoidOverlap: 0.1
            }
        },
        interaction: { hover: true }
    };

    if (AppState.networkInstance) {
        AppState.networkInstance.destroy();
    }
    AppState.networkInstance = new vis.Network(els.networkGraph, data, options);

    // Custom Tooltip DOM Interaction Engine
    const tooltipEl = document.getElementById('custom-network-tooltip');
    let tooltipTimeout;

    AppState.networkInstance.on("hoverNode", function (e) {
        clearTimeout(tooltipTimeout);
        const nodeId = e.node;
        const node = finalNodes.find(n => n.id === nodeId);
        if (node && node.customHtml) {
            tooltipEl.innerHTML = node.customHtml;
            tooltipEl.style.display = 'block';

            // Positioning carefully avoiding getting under mouse immediately to prevent hover flicker
            // Note: Canvas coordinates to DOM
            const domPos = AppState.networkInstance.canvasToDOM(AppState.networkInstance.getPositions([nodeId])[nodeId]);
            const canvasRect = els.networkGraph.getBoundingClientRect();

            // Keeping it bounded within canvas right
            let leftPos = domPos.x + 20;
            if (leftPos + tooltipEl.offsetWidth > canvasRect.width) {
                leftPos = domPos.x - tooltipEl.offsetWidth - 20;
            }

            tooltipEl.style.left = leftPos + 'px';
            tooltipEl.style.top = Math.max(domPos.y - 40, 0) + 'px';
        }
    });

    AppState.networkInstance.on("blurNode", function (e) {
        tooltipTimeout = setTimeout(() => { tooltipEl.style.display = 'none'; }, 300);
    });

    tooltipEl.addEventListener('mouseenter', () => clearTimeout(tooltipTimeout));
    tooltipEl.addEventListener('mouseleave', () => { tooltipEl.style.display = 'none'; });
}

// -------------- TIMELINE CHART --------------

function renderTimelineChart() {
    const ctx = els.timelineChart.getContext('2d');

    // Group by Date + Network
    // Structure: { date: { NetworkA: count, NetworkB: count } }
    const timeMap = {};

    AppState.rawData.forEach(post => {
        const d = post.dateString;
        if (!timeMap[d]) timeMap[d] = {};
        if (!timeMap[d][post.socialNetwork]) timeMap[d][post.socialNetwork] = 0;
        timeMap[d][post.socialNetwork] += 1;
    });

    // Create sorted array of dates
    const sortedDates = Object.keys(timeMap).sort();

    // Prepare datasets for Chart.js
    const networksArray = Array.from(AppState.networks);

    const datasets = networksArray.map((net) => {
        const color = AppState.networkColors[net] || '#7d8590';
        return {
            label: net,
            data: sortedDates.map(date => timeMap[date][net] || 0),
            borderColor: color,
            backgroundColor: color + '20', // Add transparency
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 2,
            pointHoverRadius: 5
        };
    });

    // Compute Total Sum Line
    const totalData = sortedDates.map(date => {
        return Object.values(timeMap[date]).reduce((sum, count) => sum + count, 0);
    });

    datasets.push({
        label: 'Todas as Redes (Total)',
        data: totalData,
        borderColor: '#e2e8f0', // Brighter neutral color for total
        backgroundColor: 'rgba(226, 232, 240, 0.1)',
        borderDash: [5, 5], // Dashed line to distinguish it
        fill: false,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0, // hide points until hover to avoid clutter
        pointHoverRadius: 6,
        order: -1 // brings this line to the front
    });

    if (AppState.chartInstance) {
        AppState.chartInstance.destroy();
    }

    Chart.defaults.color = '#7d8590';
    Chart.defaults.font.family = "'Inter', sans-serif";

    AppState.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } },
                tooltip: {
                    backgroundColor: 'rgba(22, 27, 34, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#e6edf3',
                    itemSort: (a, b) => b.raw - a.raw // Ordenação decrescente de postagens no hint
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    title: { display: true, text: 'Nº Postagens' }
                }
            }
        }
    });
}

// -------------- WORD CLOUD --------------

function renderWordCloud() {
    // Collect text from filtered Data
    let textBlob = '';
    AppState.rawData.forEach(post => {
        const matchNetwork = AppState.cloudFilters.network === 'all' || post.socialNetwork === AppState.cloudFilters.network;
        const matchAuthor = AppState.cloudFilters.author === 'all' || post.usernameAuthor === AppState.cloudFilters.author;
        const matchDate = !AppState.cloudFilters.date || post.dateString === AppState.cloudFilters.date;

        if (matchNetwork && matchAuthor && matchDate) {
            textBlob += ' ' + post.message.toLowerCase();
        }
    });

    if (!textBlob.trim()) {
        const ctx = els.cloudCanvas.getContext('2d');
        ctx.clearRect(0, 0, els.cloudCanvas.width, els.cloudCanvas.height);
        ctx.fillStyle = "#7d8590";
        ctx.font = "14px Inter";
        ctx.textAlign = "center";
        ctx.fillText("Sem dados para a nuvem", els.cloudCanvas.width / 2, els.cloudCanvas.height / 2);
        return;
    }

    // Tokenize with comprehensive Portuguese accented characters match
    const words = textBlob.split(/[^a-záéíóúãõñçâêîôûà]+/);
    const wordCounts = {};

    words.forEach(w => {
        if (w.length > 2 && !STOPWORDS.has(w) && !w.startsWith('http')) {
            wordCounts[w] = (wordCounts[w] || 0) + 1;
        }
    });

    // Convert to Array
    const list = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 100); // top 100 words

    if (list.length === 0) return;

    // Resize canvas to match container
    els.cloudCanvas.width = els.wordcloudWrapper.clientWidth;
    els.cloudCanvas.height = els.wordcloudWrapper.clientHeight;

    const baseWeight = list[0][1];
    const weightFactor = 60 / Math.max(baseWeight, 1);

    WordCloud(els.cloudCanvas, {
        list: list,
        fontFamily: "'Inter', sans-serif",
        weightFactor: (size) => Math.max(size * weightFactor, 14),
        color: function (word, weight) {
            // Colors pallet similar to accent
            const colors = ['#2f81f7', '#a78bfa', '#388bfd', '#8b5cf6', '#60a5fa'];
            return colors[Math.floor(Math.random() * colors.length)];
        },
        backgroundColor: 'transparent',
        rotateRatio: 0.3,
        rotationSteps: 2,
        gridSize: 8,
        shape: 'circle',
        hover: function (item, dimension, event) {
            if (item && els.cloudTooltip) {
                els.cloudTooltip.style.display = 'block';
                els.cloudTooltip.innerHTML = `<strong>${escapeHtml(item[0])}</strong>: ${item[1]} ocorrência(s)`;

                const wrapperRect = els.wordcloudWrapper.getBoundingClientRect();
                let left = event.clientX - wrapperRect.left + 15;
                let top = event.clientY - wrapperRect.top + 15;

                els.cloudTooltip.style.left = left + 'px';
                els.cloudTooltip.style.top = top + 'px';
            } else if (els.cloudTooltip) {
                els.cloudTooltip.style.display = 'none';
            }
        }
    });

    els.wordcloudWrapper.addEventListener('mouseleave', () => {
        if (els.cloudTooltip) els.cloudTooltip.style.display = 'none';
    });
}

// -------------- UTILS --------------
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
