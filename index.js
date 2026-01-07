        /**
         * Consolidated JavaScript for the Link Generator App
         */
        
        const QRCode = window.QRCode

        // --- Configuration & Initialization ---
        

        let serverDomains = [];
        let urlList = [];
     
        let defaultProxyUrl = "listProxy.txt";
        const API_STATUS_URL = "https://proxyip.afrcloudn.qzz.io";
        const itemsPerPage = 10
        let currentPage = 1
        const pathTemplate = "/{ip}={port}"
        let proxyList = []
        let filteredProxyList = []
        let selectedProxy = null
        let selectedServerDomain = "";

        // --- Helper Functions ---
        
        async function fetchList(filename) {
            try {
                const response = await fetch(filename);
                if (!response.ok) throw new Error(`Gagal memuat ${filename}`);
                const text = await response.text();
                return text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            } catch (error) {
                console.error(error);
                return [];
            }
        }

        function generateRandomUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        function generateUUID(id) {
            document.getElementById(id).value = generateRandomUUID();
        }
        function generatePassword(id) {
            document.getElementById(id).value = generateRandomUUID();
        }
        function selectRandomDomain(domains) {
            if (!domains || domains.length === 0) return "";
            const randomIndex = Math.floor(Math.random() * domains.length);
            return domains[randomIndex];
        }
        function showModal(message) {
            const messageBox = document.createElement('div');
            messageBox.innerHTML = `<div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"><div class="bg-slate-800 p-6 rounded-2xl shadow-2xl text-white max-w-sm w-full border border-purple-500/50 transform scale-100 transition-all"><p class="mb-6 text-center text-slate-200">${message}</p><button onclick="this.parentElement.parentElement.remove()" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold w-full p-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-purple-500/30">Tutup</button></div></div>`;
            document.body.appendChild(messageBox);
        }
        
        function populateBugOptions() {
            // Build bug options dynamically based on loaded urlList
            const bugOptions = [
                { value: "", label: "Default" },
                { value: "manual", label: "Input Manual" }, 
                ...urlList.map(url => ({ value: url, label: url }))
            ];

            const bugSelects = [
                document.getElementById("vless-bug"),
                document.getElementById("trojan-bug"),
                document.getElementById("ss-bug"),
            ]
            bugSelects.forEach((select) => {
                if (select) {
                    select.innerHTML = ""
                    bugOptions.forEach((option) => {
                        const optionElement = document.createElement("option")
                        optionElement.value = option.value
                        optionElement.textContent = option.label
                        select.appendChild(optionElement)
                    })
                }
            })
        }
        
        // --- DOM elements ---
        const proxyListSection = document.getElementById("proxy-list-section")
        const accountCreationSection = document.getElementById("account-creation-section")
        const resultSection = document.getElementById("result-section")
        const loadingIndicator = document.getElementById("loading-indicator")
        const proxyListContainer = document.getElementById("proxy-list-container")
        const noProxiesMessage = document.getElementById("no-proxies-message")
        const customUrlInput = document.getElementById("custom-url-input")
        const proxyUrlInput = document.getElementById("proxy-url")
        const paginationContainer = document.getElementById("pagination-container")
        const proxyCountInfo = document.getElementById("proxy-count-info")
        const searchInput = document.getElementById("search-input")
        const donationModal = document.getElementById('donation-modal');
        const donationButton = document.getElementById('donation-button');
        const closeDonation = document.getElementById('close-donation');
        
        const proxyListMaster = document.getElementById('proxy-list-master-container');
        const formResultMaster = document.getElementById('form-and-result-master-container');

        // --- Filter Variables ---
        let searchField = 'provider';
        const filterProviderBtn = document.getElementById('filter-provider');
        const filterCountryBtn = document.getElementById('filter-country');
        
        // --- Favorites Variables ---
        const FAVORITES_KEY = 'afr_fav_proxies';
        let filterMode = 'all'; 
        const filterAllBtn = document.getElementById('filter-all');
        const filterFavBtn = document.getElementById('filter-favorites');

        // --- Favorites Functions ---
        function getFavorites() {
            try {
                const favorites = localStorage.getItem(FAVORITES_KEY);
                return favorites ? JSON.parse(favorites) : [];
            } catch (e) {
                console.error("Gagal memuat favorit:", e);
                return [];
            }
        }
        
        function saveFavorites(favorites) {
            try {
                localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
            } catch (e) {
                console.error("Gagal menyimpan favorit:", e);
            }
        }
        
        function getProxyKey(proxy) {
            return `${proxy.ip}:${proxy.port}`;
        }

        function isFavorite(proxy) {
            const favorites = getFavorites();
            return favorites.includes(getProxyKey(proxy));
        }

        function toggleFavorite(proxy, starIcon) {
            const favorites = getFavorites();
            const key = getProxyKey(proxy);
            const index = favorites.indexOf(key);

            if (index > -1) {
                favorites.splice(index, 1);
                starIcon.classList.remove('fas', 'text-amber-400');
                starIcon.classList.add('far', 'text-slate-500', 'hover:text-amber-300');
            } else {
                favorites.push(key);
                starIcon.classList.add('fas', 'text-amber-400');
                starIcon.classList.remove('far', 'text-slate-500', 'hover:text-amber-300');
            }
            saveFavorites(favorites);
            
            if (filterMode === 'favorites') {
                applyFilters();
            }
        }

        // --- Filter Logic ---
        function applyFilters() {
            const searchTerm = searchInput.value.toLowerCase().trim();
            let tempProxies = [...proxyList];

            if (filterMode === 'favorites') {
                const favorites = getFavorites();
                tempProxies = tempProxies.filter(proxy => favorites.includes(getProxyKey(proxy)));
            }
            
            if (searchTerm !== "") {
                 tempProxies = tempProxies.filter(
                    (proxy) => {
                        const searchTarget = searchField === 'country' ? proxy.country : proxy.provider;
                        return searchTarget.toLowerCase().includes(searchTerm);
                    }
                );
            }

            filteredProxyList = tempProxies;
            currentPage = 1;
            renderProxyList();
        }

        function updateFilterUI(field) {
            searchField = field;
            if (!filterProviderBtn || !filterCountryBtn) return; 

            if (field === 'provider') {
                filterProviderBtn.classList.add('bg-purple-600', 'text-white', 'shadow-md');
                filterProviderBtn.classList.remove('bg-transparent', 'text-slate-400', 'hover:text-white');
                filterCountryBtn.classList.add('bg-transparent', 'text-slate-400', 'hover:text-white');
                filterCountryBtn.classList.remove('bg-purple-600', 'text-white', 'shadow-md');
                searchInput.placeholder = 'Cari berdasarkan penyedia...';
            } else {
                filterCountryBtn.classList.add('bg-purple-600', 'text-white', 'shadow-md');
                filterCountryBtn.classList.remove('bg-transparent', 'text-slate-400', 'hover:text-white');
                filterProviderBtn.classList.add('bg-transparent', 'text-slate-400', 'hover:text-white');
                filterProviderBtn.classList.remove('bg-purple-600', 'text-white', 'shadow-md');
                searchInput.placeholder = 'Cari berdasarkan negara (contoh: ID, SG)...';
            }
            applyFilters();
        }
        
        function updateFavoriteFilterUI(mode) {
            filterMode = mode;
            if (!filterAllBtn || !filterFavBtn) return;
            
            if (mode === 'all') {
                filterAllBtn.classList.add('bg-purple-600', 'text-white', 'shadow-md');
                filterAllBtn.classList.remove('bg-transparent', 'text-slate-400', 'hover:text-white');
                filterFavBtn.classList.add('bg-transparent', 'text-slate-400', 'hover:text-white');
                filterFavBtn.classList.remove('bg-purple-600', 'text-white', 'shadow-md');
            } else {
                filterFavBtn.classList.add('bg-purple-600', 'text-white', 'shadow-md');
                filterFavBtn.classList.remove('bg-transparent', 'text-slate-400', 'hover:text-white');
                filterAllBtn.classList.add('bg-transparent', 'text-slate-400', 'hover:text-white');
                filterAllBtn.classList.remove('bg-purple-600', 'text-white', 'shadow-md');
            }
            applyFilters();
        }

        // --- UI Logic Functions ---
        function showProxyListSection() {
            proxyListSection.classList.remove("hidden");
            
            if (window.innerWidth < 1024) { 
                formResultMaster.classList.add("hidden");
                proxyListMaster.classList.remove("hidden");
                proxyListMaster.scrollIntoView({ behavior: 'smooth' });
            } else {
                if (filteredProxyList.length === 0) {
                     formResultMaster.classList.add("hidden");
                } else {
                     showFormOrResult("account-creation-section"); 
                }
            }
        }

        function showFormOrResult(sectionId) {
            accountCreationSection.classList.add("hidden");
            resultSection.classList.add("hidden");
            document.getElementById(sectionId).classList.remove("hidden");
        }

        function showAccountCreationSection() {
            showFormOrResult("account-creation-section"); 
            
            if (window.innerWidth < 1024) { 
                proxyListMaster.classList.add("hidden");
                formResultMaster.classList.remove("hidden");
                formResultMaster.scrollIntoView({ behavior: 'smooth' });
            }
            if (window.innerWidth >= 1024) {
                 formResultMaster.classList.remove("hidden");
            }
        }

        function selectRandomProxyOnDesktopLoad() {
            if (window.innerWidth >= 1024 && filteredProxyList.length > 0) {
                const randomIndex = Math.floor(Math.random() * filteredProxyList.length);
                selectProxy(randomIndex); 
                showAccountCreationSection(); 
            } else if (window.innerWidth >= 1024) {
                 formResultMaster.classList.add("hidden");
            }
        }

        function processProxyData(text) {
            const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "")
            
            if (lines.length === 0) {
                noProxiesMessage.classList.remove("hidden")
                return
            }

            let delimiter = ","
            const firstLine = lines[0]
            if (firstLine.includes("\t")) {
                delimiter = "\t"
            } else if (firstLine.includes("|")) {
                delimiter = "|"
            } else if (firstLine.includes(";")) {
                delimiter = ";"
            }

            proxyList = lines
                .map((line) => {
                    const parts = line.split(delimiter)
                    if (parts.length >= 2) {
                        return {
                            ip: parts[0].trim(),
                            port: parts[1].trim(),
                            country: parts[2] ? parts[2].trim() : "Unknown",
                            provider: parts[3] ? parts[3].trim() : "Unknown Provider",
                        }
                    }
                    return null
                })
                .filter((proxy) => proxy && proxy.ip && proxy.port)

            if (proxyList.length === 0) {
                noProxiesMessage.classList.remove("hidden")
                displayFallbackProxyList()
                return
            }

            updateFavoriteFilterUI('all');
            applyFilters();
            selectRandomProxyOnDesktopLoad();
        }
        
        function displayFallbackProxyList() {
            proxyList = [{ ip: "103.6.207.108", port: "8080", country: "ID", provider: "PT Pusat Media Indonesia" }]
            updateFavoriteFilterUI('all');
            applyFilters();
            selectRandomProxyOnDesktopLoad();
        }

        function loadProxyList(url) {
            loadingIndicator.classList.remove("hidden")
            proxyListContainer.innerHTML = ""
            noProxiesMessage.classList.add("hidden")

            fetch(url)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Failed to fetch proxy list")
                    }
                    return response.text()
                })
                .then((data) => {
                    processProxyData(data)
                    loadingIndicator.classList.add("hidden")
                })
                .catch((error) => {
                    console.error("Error loading proxy list:", error)
                    loadingIndicator.classList.add("hidden")
                    noProxiesMessage.classList.remove("hidden")
                    displayFallbackProxyList()
                })
        }

        function checkProxyStatusInList(proxy, statusBadge) {
            fetch(`${API_STATUS_URL}/${proxy.ip}:${proxy.port}`)
                .then((response) => response.json())
                .then((data) => {
                    const proxyData = Array.isArray(data) ? data[0] : data

                    if (proxyData && proxyData.proxyip === true) {
                        statusBadge.className = "inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] ml-2"
                        statusBadge.title = "Aktif"
                    } else {
                        statusBadge.className = "inline-block w-2.5 h-2.5 rounded-full bg-rose-500 ml-2 opacity-60"
                        statusBadge.title = "Mati"
                    }
                })
                .catch((error) => {
                    statusBadge.className = "inline-block w-2.5 h-2.5 rounded-full bg-amber-500 ml-2 opacity-60"
                    statusBadge.title = "Tidak diketahui"
                    console.error("Error checking proxy status:", error)
                })
        }
        
        function renderProxyList() {
            proxyListContainer.innerHTML = ""

            if (filteredProxyList.length === 0) {
                noProxiesMessage.classList.remove("hidden")
                paginationContainer.innerHTML = ""
                proxyCountInfo.textContent = ""
                if (window.innerWidth >= 1024) {
                    formResultMaster.classList.add("hidden");
                }
                return
            }

            noProxiesMessage.classList.add("hidden")

            const totalPages = Math.ceil(filteredProxyList.length / itemsPerPage)
            const startIndex = (currentPage - 1) * itemsPerPage
            const endIndex = Math.min(startIndex + itemsPerPage, filteredProxyList.length)
            const currentItems = filteredProxyList.slice(startIndex, endIndex)

            currentItems.forEach((proxy, index) => {
                const actualIndex = startIndex + index
                
                const card = document.createElement("div")
                card.className = "p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700/50 hover:border-teal-500/50 transition-all rounded-lg cursor-pointer flex justify-between items-center group mb-2"

                const infoDiv = document.createElement("div")
                infoDiv.className = "flex-1 min-w-0 pr-2"

                const providerContainer = document.createElement("div")
                providerContainer.className = "flex items-center w-full relative"

                const starIcon = document.createElement("i");
                const favorite = isFavorite(proxy);
                starIcon.className = `mr-2 cursor-pointer transition-colors transform active:scale-90 ${favorite ? 'fas fa-star text-amber-400' : 'far fa-star text-slate-500 hover:text-amber-300'}`;
                starIcon.title = "Toggle Favorit";
                starIcon.addEventListener('click', (e) => {
                    e.stopPropagation(); 
                    toggleFavorite(proxy, starIcon);
                });
                providerContainer.appendChild(starIcon);

                const providerName = document.createElement("div")
                providerName.className = "font-bold text-sm truncate text-slate-200 group-hover:text-teal-300 transition-colors" 
                providerName.style.maxWidth = "calc(100% - 60px)"
                providerName.textContent = proxy.provider
                providerContainer.appendChild(providerName)

                const statusBadge = document.createElement("span")
                statusBadge.className = "inline-block w-2.5 h-2.5 rounded-full bg-slate-600 ml-2"
                statusBadge.style.flexShrink = "0"
                statusBadge.title = "Memeriksa..."
                statusBadge.id = `proxy-status-${actualIndex}`
                providerContainer.appendChild(statusBadge)
                infoDiv.appendChild(providerContainer)

                const detailsDiv = document.createElement("div")
                detailsDiv.className = "text-xs text-slate-400 mt-0.5 truncate font-mono"
                detailsDiv.textContent = `${proxy.country} | ${proxy.ip}:${proxy.port}`
                infoDiv.appendChild(detailsDiv)

                const button = document.createElement("button")
                button.className = "bg-teal-600 hover:bg-teal-500 text-white font-bold transition-colors py-1 px-3 rounded text-xs flex-shrink-0"
                button.style.whiteSpace = "nowrap"
                button.setAttribute("data-index", actualIndex)
                button.innerHTML = 'PILIH'
                button.addEventListener("click", function (e) {
                    e.stopPropagation(); 
                    const idx = Number.parseInt(this.getAttribute("data-index"))
                    selectProxy(idx)
                    showAccountCreationSection()
                })
                
                card.addEventListener('click', () => {
                     selectProxy(actualIndex);
                     showAccountCreationSection();
                });

                card.appendChild(infoDiv)
                card.appendChild(button)
                proxyListContainer.appendChild(card)

                checkProxyStatusInList(proxy, statusBadge)
            })

            renderPagination(totalPages)
            proxyCountInfo.textContent = `Menampilkan ${startIndex + 1}-${endIndex} dari ${filteredProxyList.length} proxy`
        }

        function renderPagination(totalPages) {
            paginationContainer.innerHTML = ""
            if (totalPages <= 1) return
            
            const btnBaseClasses = "bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white font-semibold transition-all duration-200 border border-white/10 px-3 py-1.5 mx-1 rounded-lg text-xs disabled:opacity-30 disabled:cursor-not-allowed"

            const prevBtn = document.createElement("button")
            prevBtn.className = `${btnBaseClasses} ${currentPage === 1 ? "opacity-30 cursor-not-allowed" : ""}`
            prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>'
            prevBtn.disabled = currentPage === 1
            prevBtn.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderProxyList(); } })
            paginationContainer.appendChild(prevBtn)

            const pageInfo = document.createElement("span")
            pageInfo.className = "text-xs font-mono text-slate-400 mx-2"
            pageInfo.textContent = `${currentPage} / ${totalPages}`
            paginationContainer.appendChild(pageInfo)

            const nextBtn = document.createElement("button")
            nextBtn.className = `${btnBaseClasses} ${currentPage === totalPages ? "opacity-30 cursor-not-allowed" : ""}`
            nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>'
            nextBtn.disabled = currentPage === totalPages
            nextBtn.addEventListener("click", () => { if (currentPage < totalPages) { currentPage++; renderProxyList(); } })
            paginationContainer.appendChild(nextBtn)
        }
        
        function checkProxyStatus(proxy) {
            const startTime = performance.now()
            
            const statusLoading = document.getElementById("proxy-status-loading")
            const statusActive = document.getElementById("proxy-status-active")
            const statusDead = document.getElementById("proxy-status-dead")
            const statusUnknown = document.getElementById("proxy-status-unknown")
            const latencyElement = document.getElementById("proxy-latency")

            statusLoading.classList.remove("hidden");
            [statusActive, statusDead, statusUnknown].forEach(el => el.classList.add("hidden"));
            latencyElement.textContent = '...'

            fetch(`${API_STATUS_URL}/${proxy.ip}:${proxy.port}`)
                .then((response) => response.json())
                .then((data) => {
                    const endTime = performance.now()
                    const latency = Math.floor(endTime - startTime)
                    statusLoading.classList.add("hidden")
                    const proxyData = Array.isArray(data) ? data[0] : data

                    if (proxyData && proxyData.proxyip === true) {
                        statusActive.classList.remove("hidden")
                        latencyElement.textContent = `${latency}ms`
                        
                        if(latency < 200) latencyElement.className = "text-emerald-400 font-bold";
                        else if(latency < 500) latencyElement.className = "text-amber-400 font-bold";
                        else latencyElement.className = "text-rose-400 font-bold";
                    } else {
                        statusDead.classList.remove("hidden")
                    }
                })
                .catch((error) => {
                    statusLoading.classList.add("hidden")
                    statusUnknown.classList.remove("hidden")
                    console.error("Error checking proxy status:", error)
                })
        }

        async function selectProxy(index) {
            if (index < 0 || index >= filteredProxyList.length) {
                if (filteredProxyList.length === 0) {
                    if (window.innerWidth >= 1024) {
                        formResultMaster.classList.add("hidden");
                    }
                }
                return;
            }
            
            if (window.innerWidth >= 1024) {
                 formResultMaster.classList.remove("hidden");
            }

            selectedProxy = filteredProxyList[index]
            if (!selectedProxy) return;

            document.getElementById("selected-ip").textContent = selectedProxy.ip
            document.getElementById("selected-port").textContent = selectedProxy.port
            document.getElementById("selected-country").textContent = selectedProxy.country
            document.getElementById("selected-provider").textContent = selectedProxy.provider

            const baseAccountName = `${selectedProxy.country} - ${selectedProxy.provider}`
            const path = pathTemplate.replace("{ip}", selectedProxy.ip).replace("{port}", selectedProxy.port)

            document.getElementById("vless-path").value = path
            document.getElementById("trojan-path").value = path
            document.getElementById("ss-path").value = path
            
            document.getElementById("vless-uuid").value = generateRandomUUID();
            document.getElementById("trojan-password").value = generateRandomUUID();
            document.getElementById("ss-password").value = generateRandomUUID();

            const updateAccountName = (protocol, security, nameId, baseName) => {
                const tlsType = security === "tls" ? "TLS" : "NTLS"
                document.getElementById(nameId).value = `${baseName} [${protocol}-${tlsType}]`
            }

            const securitySelects = [
                { id: "vless-security", nameId: "vless-name", protocol: "VLESS" },
                { id: "trojan-security", nameId: "trojan-name", protocol: "Trojan" },
                { id: "ss-security", nameId: "ss-name", protocol: "SS" },
            ]

            securitySelects.forEach((item) => {
                const select = document.getElementById(item.id)
                updateAccountName(item.protocol, select.value, item.nameId, baseAccountName);

                const newSelect = select.cloneNode(true);
                select.parentNode.replaceChild(newSelect, select);
                newSelect.addEventListener("change", function () {
                    updateAccountName(item.protocol, this.value, item.nameId, baseAccountName);
                });
            })

            checkProxyStatus(selectedProxy)
        }

        // --- QR Code Functions ---
        function generateQRCode(text) {
            const qrcodeElement = document.getElementById("qrcode")
            qrcodeElement.innerHTML = ""

            const size = 200;
            const config = { width: size, margin: 1, color: { dark: "#000000ff", light: "#ffffffff" } };

            try {
                if (typeof QRCode.toCanvas === 'function') {
                    const canvas = document.createElement('canvas');
                    qrcodeElement.appendChild(canvas);
                    QRCode.toCanvas(canvas, text, config, (error) => {
                        if (error) generateQRCodeFallback(text, qrcodeElement);
                    });
                } else {
                    generateQRCodeFallback(text, qrcodeElement);
                }
            } catch (error) {
                generateQRCodeFallback(text, qrcodeElement);
            }
        }

        function generateQRCodeFallback(text, container) {
            try {
                if (typeof QRCode.toString === 'function') {
                    QRCode.toString(text, { type: "svg", width: 200, margin: 1, color: { dark: "#000000ff", light: "#ffffffff" } }, (error, svg) => {
                        if (!error && svg) {
                            container.innerHTML = svg;
                        } else {
                            generateQRCodeLastResort(text, container);
                        }
                    });
                } else {
                    generateQRCodeLastResort(text, container);
                }
            } catch (error) {
                generateQRCodeLastResort(text, container);
            }
        }

        function generateQRCodeLastResort(text, container) {
            try {
                const encodedText = encodeURIComponent(text)
                const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedText}`
                const img = document.createElement("img")
                img.src = qrApiUrl
                img.alt = "QR Code"
                img.width = 200
                img.height = 200
                img.onerror = () => {
                    container.innerHTML = '<div class="text-center text-rose-500">Failed to generate QR code</div>'
                }
                container.innerHTML = ""
                container.appendChild(img)
            } catch (error) {
                container.innerHTML = '<div class="text-center text-rose-500">Failed to generate QR code</div>'
            }
        }

        function downloadQRCode() {
            const qrcodeElement = document.getElementById("qrcode")
            const canvas = qrcodeElement.querySelector("canvas")
            const img = qrcodeElement.querySelector("img")
            const svg = qrcodeElement.querySelector("svg")
            let imageUrl = null
            let fileName = "qrcode.png";

            if (canvas) {
                try {
                    imageUrl = canvas.toDataURL("image/png")
                } catch (e) { /* silent fail */ }
            } else if (img) {
                imageUrl = img.src
            } else if (svg) {
                try {
                    const svgData = new XMLSerializer().serializeToString(svg)
                    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" })
                    imageUrl = URL.createObjectURL(svgBlob)
                    fileName = "qrcode.svg";
                } catch (e) { /* silent fail */ }
            }

            if (imageUrl) {
                const link = document.createElement("a")
                link.href = imageUrl
                link.download = fileName
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                if (imageUrl.startsWith("blob:")) {
                    URL.revokeObjectURL(imageUrl)
                }
            } else {
                showModal('Failed to download QR code. Please try again.')
            }
        }
        
        function copyToClipboard(text, buttonElement, originalText) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                buttonElement.innerHTML = '<i class="fas fa-check mr-1"></i> Disalin!'
                setTimeout(() => {
                    buttonElement.innerHTML = originalText;
                }, 2000)
            } catch (err) {
                showModal('Gagal menyalin. Silakan salin manual.');
            }
            document.body.removeChild(textarea);
        }

        // --- Main Initialization ---
        async function initializeApp() {
            document.getElementById("current-year").textContent = new Date().getFullYear();

            document.getElementById("vless-uuid").value = generateRandomUUID();
            document.getElementById("trojan-password").value = generateRandomUUID();
            document.getElementById("ss-password").value = generateRandomUUID();
            
            // 1. Load Data from TXT Files (Async)
            console.log("Memulai inisialisasi data...");
            
            try {
                const [domainsData, urlsData] = await Promise.all([
                    fetchList('ListDomain.txt'),
                    fetchList('ListBug.txt')
                ]);

                if (domainsData.length > 0) serverDomains = domainsData;
                if (urlsData.length > 0) urlList = urlsData;
                
                console.log("Data berhasil dimuat:", {
                    domains: serverDomains.length,
                    urls: urlList.length
                });

            } catch (e) {
                console.error("Gagal memuat data konfigurasi:", e);
                // Lanjut dengan array kosong jika gagal, agar app tidak crash total
            }

            // 2. Setup Dropdowns Dependent on Data
            
            // Populate Server Domains
            const serverDomainSelects = [
                document.getElementById("vless-server-domain"),
                document.getElementById("trojan-server-domain"),
                document.getElementById("ss-server-domain"),
            ]
            
            selectedServerDomain = selectRandomDomain(serverDomains);

            serverDomainSelects.forEach((select) => {
                if (select) {
                    select.innerHTML = ""
                    serverDomains.forEach((domain) => {
                        const option = document.createElement("option")
                        option.value = domain
                        option.textContent = domain
                        select.appendChild(option)
                    })
                    if(selectedServerDomain) select.value = selectedServerDomain;
                    
                    select.addEventListener("change", function () {
                        selectedServerDomain = this.value
                    })
                }
            })

            // Populate Bug Options (using the newly loaded urlList)
            populateBugOptions();

            // 3. Load Proxy List
            loadProxyList(defaultProxyUrl);
            
            // Initial state check for mobile & desktop
            if (window.innerWidth < 1024) {
                formResultMaster.classList.add("hidden");
                proxyListMaster.classList.remove("hidden");
            }

            // Filter Initialization
            updateFilterUI('provider');
            updateFavoriteFilterUI('all');
            
            filterAllBtn.addEventListener('click', () => updateFavoriteFilterUI('all'));
            filterFavBtn.addEventListener('click', () => updateFavoriteFilterUI('favorites'));

            filterProviderBtn.addEventListener('click', () => updateFilterUI('provider'));
            filterCountryBtn.addEventListener('click', () => updateFilterUI('country'));

            // Event Listeners setup
            document.getElementById("refresh-btn").addEventListener("click", () => {
                loadProxyList(defaultProxyUrl)
            })
            document.getElementById("custom-url-btn").addEventListener("click", () => {
                customUrlInput.classList.toggle("hidden")
            })
            document.getElementById("load-custom-url").addEventListener("click", () => {
                const url = proxyUrlInput.value.trim()
                if (url) {
                    loadProxyList(url)
                }
            })
            
            document.getElementById("back-to-list").addEventListener("click", showProxyListSection);
            document.getElementById("back-to-list-from-result").addEventListener("click", showProxyListSection);
            
            document.getElementById("back-to-form").addEventListener("click", () => {
                showFormOrResult("account-creation-section");
            });
            
            document.getElementById("create-new").addEventListener("click", () => {
                document.getElementById("vless-uuid").value = generateRandomUUID();
                document.getElementById("trojan-password").value = generateRandomUUID();
                document.getElementById("ss-password").value = generateRandomUUID();
                showFormOrResult("account-creation-section");
            });

            document.getElementById("copy-all-results").addEventListener("click", function() {
                const url = document.getElementById('connection-url').textContent;
                const clash = document.getElementById('clash-config').querySelector('code').textContent;
                const allText = `URL Koneksi:\n${url}\n\nKonfigurasi Clash (YAML):\n${clash}`;
                copyToClipboard(allText, this, '<i class="fas fa-clipboard-list mr-2"></i> SALIN SEMUA');
            });

            searchInput.addEventListener("input", function () {
                applyFilters();
            })

            // Protocol tabs logic
            document.querySelectorAll("#tab-container button").forEach((tab) => {
                tab.addEventListener("click", () => {
                    document.querySelectorAll("#tab-container button").forEach((t) => {
                         t.classList.remove("bg-purple-600", "text-white", "shadow-lg", "shadow-purple-500/20", "tab-active");
                         t.classList.add("text-slate-400", "hover:text-white", "hover:bg-white/5");
                    })
                    tab.classList.add("bg-purple-600", "text-white", "shadow-lg", "shadow-purple-500/20", "tab-active");
                    tab.classList.remove("text-slate-400", "hover:text-white", "hover:bg-white/5");
                    
                    document.querySelectorAll(".protocol-form").forEach((form) => form.classList.add("hidden"))
                    document.getElementById(tab.getAttribute("data-target")).classList.remove("hidden")
                })
            })

            // Custom Bug logic
            const bugInputs = [
                document.getElementById("vless-bug"),
                document.getElementById("trojan-bug"),
                document.getElementById("ss-bug"),
            ]
            bugInputs.forEach((select, index) => {
                const manualContainer = document.getElementById(select.id.replace("-bug", "-manual-bug-container"))
                const wildcardContainer = document.getElementById(select.id.replace("-bug", "-wildcard-container"))
                const wildcardCheckbox = document.getElementById(select.id.replace("-bug", "-wildcard"))

                select.addEventListener("change", function () {
                    const value = this.value;
                    const isManual = value === "manual";
                    const isCustomBug = value !== "" && value !== "manual";

                    manualContainer.classList.toggle('hidden', !isManual);
                    wildcardContainer.classList.toggle('hidden', !isCustomBug);
                    wildcardCheckbox.disabled = !isCustomBug;
                    if (!isCustomBug) wildcardCheckbox.checked = false; 
                })
                select.dispatchEvent(new Event('change'));
            })

            // Form Submissions
            const forms = [
                document.getElementById("vless-account-form"),
                document.getElementById("trojan-account-form"),
                document.getElementById("ss-account-form"),
            ]

            forms.forEach((form) => {
                form.addEventListener("submit", (e) => {
                    e.preventDefault()
                    const formData = new FormData(form)
                    const formType = form.id.split("-")[0]

                    let customBug = formData.get("bug") ? formData.get("bug").toString().trim() : ""
                    if (customBug === "manual") {
                        customBug = document.getElementById(`${formType}-manual-bug`).value.trim()
                    }
                    const useWildcard = document.getElementById(`${formType}-wildcard`).checked
                    
                    const selectedDomain = formData.get("server-domain")
                    let server = selectedDomain
                    let host = selectedDomain
                    let sni = selectedDomain

                    if (customBug) {
                        server = customBug
                        if (useWildcard) {
                            host = `${customBug}.${selectedDomain}`
                            sni = `${customBug}.${selectedDomain}`
                        }
                    }

                    let connectionUrl = ""
                    const path = formData.get("path"); 
                    const encodedPath = encodeURIComponent(path); 
                    const security = formData.get("security")
                    const name = formData.get("name")
                    const encodedName = encodeURIComponent(name); 
                    const port = security === "tls" ? 443 : 80
                    
                    let clashConfigYaml = ""; 

                    if (formType === "vless") {
                        const uuid = formData.get("uuid")
                        connectionUrl = `vless://${uuid}@${server}:${port}?encryption=none&security=${security}&type=ws&host=${host}&path=${encodedPath}&sni=${sni}#${encodedName}`
                        
                        clashConfigYaml = `
proxies:				
  - name: "${name}"
    type: vless
    server: ${server}
    port: ${port}
    uuid: ${uuid}
    network: ws
    tls: ${security === 'tls'}
    servername: ${sni}
    skip-cert-verify: false
    ws-opts:
      path: ${path}
      headers:
        Host: ${host}
`;
                    } else if (formType === "trojan") {
                        const password = formData.get("password")
                        connectionUrl = `trojan://${password}@${server}:${port}?security=${security}&type=ws&host=${host}&path=${encodedPath}&sni=${sni}#${encodedName}`
                        
                        clashConfigYaml = `
proxies:					
  - name: "${name}"
    type: trojan
    server: ${server}
    port: ${port}
    password: ${password}
    network: ws
    sni: ${sni}
    skip-cert-verify: false
    ws-opts:
      path: ${path}
      headers:
        Host: ${host}
`;
                    } else if (formType === "ss") {
                        const password = formData.get("password")
                        const method = "none" 
                        const userInfo = btoa(`${method}:${password}`) 
                        const params = `?encryption=none&type=ws&host=${host}&path=${encodedPath}&security=${security}&sni=${sni}`
                        connectionUrl = `ss://${userInfo}@${server}:${port}${params}#${encodedName}`
                        
                        clashConfigYaml = `
proxies:
  - name: "${name}"
    type: ss
    server: ${server}
    port: ${port}
    cipher: ${method}
    password: ${password}
    udp: false
    plugin: v2ray-plugin
    plugin-opts:
      mode: websocket
      tls: ${security === 'tls'}
      skip-cert-verify: false
      host: ${host}
      path: ${path}
      mux: false
`;
                    }

                    document.getElementById("connection-url").textContent = connectionUrl
                    document.getElementById("clash-config").querySelector("code").textContent = clashConfigYaml.trim();
                    generateQRCode(connectionUrl)
                    
                    showFormOrResult("result-section"); 
                    
                    if (window.innerWidth < 1024) {
                        proxyListMaster.classList.add("hidden");
                        formResultMaster.classList.remove("hidden");
                        formResultMaster.scrollIntoView({ behavior: 'smooth' });
                    }
                })
            })
            
            document.getElementById("copy-url").addEventListener("click", function () {
                const text = document.getElementById("connection-url").textContent
                copyToClipboard(text, this, '<i class="far fa-copy mr-1"></i> SALIN');
            })
            
            document.getElementById("copy-clash").addEventListener("click", function () {
                const text = document.getElementById("clash-config").querySelector("code").textContent
                copyToClipboard(text, this, '<i class="far fa-copy mr-1"></i> SALIN');
            })

            document.getElementById("download-qr").addEventListener("click", downloadQRCode)
            
            if (donationButton && donationModal) {
                donationButton.addEventListener("click", () => {
                    donationModal.classList.remove('hidden');
                    donationModal.classList.add('flex'); 
                });

                if (closeDonation) {
                    closeDonation.addEventListener("click", (e) => {
                        e.stopPropagation(); 
                        donationModal.classList.remove('flex');
                        donationModal.classList.add('hidden');
                    });
                }
                
                donationModal.addEventListener('click', (e) => {
                    if (e.target === donationModal) {
                        donationModal.classList.remove('flex');
                        donationModal.classList.add('hidden');
                    }
                });
            }
        }

        // Jalankan fungsi utama saat DOM siap
        document.addEventListener("DOMContentLoaded", initializeApp);