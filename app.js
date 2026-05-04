// ==================== CONFIGURAÇÃO DA API ====================
// 🔑 COMO OBTER SUA API KEY GRATUITA:
// 1. Acesse https://www.themoviedb.org/signup
// 2. Crie uma conta (é grátis)
// 3. Faça login e vá em: Configurações > API
// 4. Solicite uma API Key (Developer)
// 5. Copie a chave e cole abaixo

let API_KEY = 'bbd0f17b3bdbaa0adf21c280bbe1e207';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_URL = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_URL = 'https://image.tmdb.org/t/p/original';

// ==================== GERENCIADOR DE API KEY ====================

function showApiKeyModal() {
    const modal = document.createElement('div');
    modal.id = 'apiKeyModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.95);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: Arial, sans-serif;
    `;
    
    modal.innerHTML = `
        <div style="
            background: var(--bg-secondary, #fff);
            padding: 2rem;
            border-radius: 16px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        ">
            <i class="fas fa-film" style="font-size: 3rem; color: #e50914; margin-bottom: 1rem;"></i>
            <h2 style="margin-bottom: 1rem;">🔑 API Key Necessária</h2>
            <p style="margin-bottom: 1rem; color: var(--text-secondary, #666);">
                Para usar o MovieSearch, você precisa de uma API Key gratuita do TMDB.
            </p>
            
            <div style="background: #f0f0f0; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; text-align: left;">
                <strong>📝 Passo a Passo:</strong>
                <ol style="margin-top: 0.5rem; padding-left: 1.5rem;">
                    <li>Acesse: <a href="https://www.themoviedb.org/signup" target="_blank">https://www.themoviedb.org/signup</a></li>
                    <li>Crie uma conta (gratuito)</li>
                    <li>Vá em Configurações → API</li>
                    <li>Solicite uma API Key (Developer)</li>
                    <li>Copie a chave (string de 32 caracteres)</li>
                </ol>
            </div>
            
            <input type="text" 
                   id="apiKeyInput" 
                   placeholder="Cole sua API Key aqui" 
                   style="
                       width: 100%;
                       padding: 12px;
                       margin-bottom: 1rem;
                       border: 2px solid #e0e0e0;
                       border-radius: 8px;
                       font-size: 14px;
                       font-family: monospace;
                   ">
            
            <button id="saveApiKeyBtn" style="
                background: #e50914;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                font-weight: bold;
                width: 100%;
            ">
                <i class="fas fa-save"></i> Salvar e Continuar
            </button>
            
            <p style="margin-top: 1rem; font-size: 12px; color: #999;">
                🔒 Sua chave fica salva apenas no seu navegador (localStorage)
            </p>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('saveApiKeyBtn').addEventListener('click', () => {
        const key = document.getElementById('apiKeyInput').value.trim();
        if (key && key.length > 20) {
            API_KEY = key;
            localStorage.setItem('tmdb_api_key', key);
            modal.remove();
            showToast('API Key salva! Inicializando sistema...', 3000);
            setTimeout(() => init(), 500);
        } else {
            alert('Por favor, cole uma API Key válida (deve ter mais de 20 caracteres)');
        }
    });
}

function showToast(message, duration = 3000) {
    let toast = document.getElementById('globalToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'globalToast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10001;
            transform: translateX(400px);
            transition: transform 0.3s;
            font-family: Arial, sans-serif;
        `;
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.style.transform = 'translateX(0)';
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
    }, duration);
}

// ==================== CLASSES PRINCIPAIS ====================

class CacheManager {
    constructor() {
        this.cache = new Map();
        this.expiryTime = 5 * 60 * 1000;
    }

    set(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() - item.timestamp > this.expiryTime) {
            this.cache.delete(key);
            return null;
        }
        return item.data;
    }

    clear() {
        this.cache.clear();
    }
}

class MovieAPI {
    constructor() {
        this.cache = new CacheManager();
        this.genres = [];
    }

    async request(endpoint, params = {}) {
        if (!API_KEY) {
            throw new Error('API Key não configurada');
        }
        
        const url = new URL(`${BASE_URL}${endpoint}`);
        url.searchParams.append('api_key', API_KEY);
        url.searchParams.append('language', 'pt-BR');
        
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });

        const cacheKey = url.toString();
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(url);
            
            if (response.status === 401) {
                localStorage.removeItem('tmdb_api_key');
                API_KEY = '';
                throw new Error('API Key inválida. Por favor, verifique sua chave.');
            }
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            this.cache.set(cacheKey, data);
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async getGenres() {
        if (this.genres.length > 0) return this.genres;
        const data = await this.request('/genre/movie/list');
        this.genres = data.genres;
        return this.genres;
    }

    async searchMovies(query, page = 1) {
        return await this.request('/search/movie', {
            query: query,
            page: page,
            include_adult: false
        });
    }

    async getPopularMovies(page = 1) {
        return await this.request('/movie/popular', { page: page });
    }

    async getMovieDetails(id) {
        return await this.request(`/movie/${id}`);
    }

    async getMovieCredits(id) {
        return await this.request(`/movie/${id}/credits`);
    }

    async getMovieVideos(id) {
        return await this.request(`/movie/${id}/videos`);
    }

    async getRandomMovie() {
        const randomPage = Math.floor(Math.random() * 500) + 1;
        const data = await this.request('/movie/popular', { page: randomPage });
        if (data.results && data.results.length > 0) {
            const randomIndex = Math.floor(Math.random() * data.results.length);
            return data.results[randomIndex];
        }
        return null;
    }
}

class UIManager {
    constructor() {
        this.moviesGrid = document.getElementById('moviesGrid');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.toast = document.getElementById('toast');
        this.currentPage = 1;
        this.totalPages = 1;
        this.isLoading = false;
        this.currentQuery = '';
        this.favorites = this.loadFavorites();
        this.compareList = [];
    }

    loadFavorites() {
        const saved = localStorage.getItem('movieFavorites');
        return saved ? JSON.parse(saved) : [];
    }

    saveFavorites() {
        localStorage.setItem('movieFavorites', JSON.stringify(this.favorites));
    }

    addFavorite(movieId) {
        if (!this.favorites.includes(movieId)) {
            this.favorites.push(movieId);
            this.saveFavorites();
            this.showToast('Filme adicionado aos favoritos! ❤️');
            return true;
        }
        return false;
    }

    removeFavorite(movieId) {
        this.favorites = this.favorites.filter(id => id !== movieId);
        this.saveFavorites();
        this.showToast('Filme removido dos favoritos! 💔');
    }

    isFavorite(movieId) {
        return this.favorites.includes(movieId);
    }

    addToCompare(movie) {
        if (this.compareList.length >= 2) {
            this.showToast('Você só pode comparar 2 filmes por vez!');
            return false;
        }
        if (!this.compareList.find(m => m.id === movie.id)) {
            this.compareList.push(movie);
            this.showToast(`${movie.title} adicionado para comparação!`);
            return true;
        }
        return false;
    }

    removeFromCompare(movieId) {
        this.compareList = this.compareList.filter(m => m.id !== movieId);
        this.showToast('Filme removido da comparação');
    }

    showToast(message, duration = 3000) {
        if (this.toast) {
            this.toast.textContent = message;
            this.toast.classList.add('show');
            setTimeout(() => {
                this.toast.classList.remove('show');
            }, duration);
        } else {
            showToast(message, duration);
        }
    }

    showLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('active');
        }
    }

    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.remove('active');
        }
    }

    showSkeletons(count = 20) {
        if (!this.moviesGrid) return;
        this.moviesGrid.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton';
            skeleton.innerHTML = `
                <div class="skeleton-poster"></div>
                <div class="skeleton-title"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text" style="width: 60%"></div>
            `;
            this.moviesGrid.appendChild(skeleton);
        }
    }

    getGenreNames(genreIds, genres) {
        return genreIds.slice(0, 2).map(id => {
            const genre = genres.find(g => g.id === id);
            return genre ? genre.name : '';
        }).filter(Boolean);
    }

    async renderMovieCard(movie, genres) {
        const posterUrl = movie.poster_path 
            ? `${IMAGE_URL}${movie.poster_path}`
            : null;
        
        const year = movie.release_date 
            ? new Date(movie.release_date).getFullYear() 
            : 'N/A';
        
        const movieGenres = this.getGenreNames(movie.genre_ids || [], genres);
        const isFavorite = this.isFavorite(movie.id);
        const isInCompare = this.compareList.find(m => m.id === movie.id);

        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `
            <div class="movie-poster">
                ${posterUrl ? 
                    `<img src="${posterUrl}" alt="${movie.title}" loading="lazy">` :
                    `<div class="poster-placeholder"><i class="fas fa-film"></i></div>`
                }
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${movie.id}">
                    <i class="fas fa-heart"></i>
                </button>
                <div class="compare-checkbox">
                    <input type="checkbox" class="compare-check" data-id="${movie.id}" ${isInCompare ? 'checked' : ''}>
                    <label>Comparar</label>
                </div>
            </div>
            <div class="movie-info">
                <div class="movie-title">${movie.title}</div>
                <div class="movie-year">${year}</div>
                <div class="movie-rating">
                    <i class="fas fa-star"></i>
                    <span>${movie.vote_average.toFixed(1)}</span>
                </div>
                <div class="movie-genres">
                    ${movieGenres.map(g => `<span class="genre-badge">${g}</span>`).join('')}
                </div>
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (!e.target.closest('.favorite-btn') && !e.target.closest('.compare-checkbox')) {
                this.showMovieDetails(movie.id);
            }
        });

        const favoriteBtn = card.querySelector('.favorite-btn');
        favoriteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.isFavorite(movie.id)) {
                this.removeFavorite(movie.id);
                favoriteBtn.classList.remove('active');
            } else {
                this.addFavorite(movie.id);
                favoriteBtn.classList.add('active');
            }
        });

        const compareCheck = card.querySelector('.compare-check');
        compareCheck.addEventListener('change', (e) => {
            e.stopPropagation();
            if (compareCheck.checked) {
                this.addToCompare(movie);
            } else {
                this.removeFromCompare(movie.id);
            }
        });

        return card;
    }

    async showMovieDetails(movieId) {
        const modal = document.getElementById('movieModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        this.showLoading();
        try {
            const [details, credits, videos] = await Promise.all([
                api.getMovieDetails(movieId),
                api.getMovieCredits(movieId),
                api.getMovieVideos(movieId)
            ]);

            const trailer = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            
            modalTitle.textContent = details.title;
            modalBody.innerHTML = `
                <div class="movie-detail">
                    <div class="movie-detail-poster">
                        ${details.poster_path ? 
                            `<img src="${IMAGE_URL}${details.poster_path}" alt="${details.title}">` :
                            `<div class="poster-placeholder"><i class="fas fa-film"></i></div>`
                        }
                    </div>
                    <div class="movie-detail-info">
                        <p><strong>Título Original:</strong> ${details.original_title}</p>
                        <p><strong>Lançamento:</strong> ${new Date(details.release_date).toLocaleDateString('pt-BR')}</p>
                        <p><strong>Duração:</strong> ${details.runtime} minutos</p>
                        <p><strong>Nota:</strong> ${details.vote_average.toFixed(1)}/10 (${details.vote_count} votos)</p>
                        <p><strong>Gêneros:</strong> ${details.genres.map(g => g.name).join(', ')}</p>
                        <p><strong>Produtoras:</strong> ${details.production_companies.map(p => p.name).join(', ')}</p>
                        <h3>Sinopse</h3>
                        <p>${details.overview || 'Sinopse não disponível'}</p>
                        <h3>Elenco Principal</h3>
                        <div class="cast-list">
                            ${credits.cast.slice(0, 5).map(actor => `
                                <div class="cast-item">
                                    ${actor.profile_path ? 
                                        `<img src="${IMAGE_URL}${actor.profile_path}" alt="${actor.name}">` :
                                        `<div class="poster-placeholder" style="border-radius: 50%;"><i class="fas fa-user"></i></div>`
                                    }
                                    <p><strong>${actor.name}</strong><br><small>${actor.character}</small></p>
                                </div>
                            `).join('')}
                        </div>
                        ${trailer ? `
                            <h3>Trailer</h3>
                            <iframe width="100%" height="315" src="https://www.youtube.com/embed/${trailer.key}" frameborder="0" allowfullscreen></iframe>
                        ` : ''}
                        <div style="margin-top: 1rem;">
                            <button class="search-btn" onclick="navigator.clipboard.writeText(window.location.href); window.uiManager.showToast('Link copiado!')">
                                <i class="fas fa-share"></i> Compartilhar Filme
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            modal.style.display = 'block';
        } catch (error) {
            this.showToast('Erro ao carregar detalhes do filme');
        } finally {
            this.hideLoading();
        }
    }

    async renderMovies(movies, genres, append = false) {
        if (!append && this.moviesGrid) {
            this.moviesGrid.innerHTML = '';
        }

        const fragment = document.createDocumentFragment();
        
        for (const movie of movies) {
            const card = await this.renderMovieCard(movie, genres);
            fragment.appendChild(card);
        }
        
        if (this.moviesGrid) {
            this.moviesGrid.appendChild(fragment);
        }
    }
}

class FilterManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const genreFilter = document.getElementById('genreFilter');
        const yearMin = document.getElementById('yearMin');
        const yearMax = document.getElementById('yearMax');
        const ratingFilter = document.getElementById('ratingFilter');
        const ratingValue = document.getElementById('ratingValue');
        const sortBy = document.getElementById('sortBy');
        const clearFilters = document.getElementById('clearFilters');

        if (genreFilter) genreFilter.addEventListener('change', () => this.applyFilters());
        if (yearMin) yearMin.addEventListener('change', () => this.applyFilters());
        if (yearMax) yearMax.addEventListener('change', () => this.applyFilters());
        if (ratingFilter) {
            ratingFilter.addEventListener('input', (e) => {
                if (ratingValue) ratingValue.textContent = e.target.value;
                this.applyFilters();
            });
        }
        if (sortBy) sortBy.addEventListener('change', () => this.applyFilters());
        if (clearFilters) clearFilters.addEventListener('click', () => this.clearAllFilters());
    }

    applyFilters() {
        if (window.applyMovieFilters) {
            window.applyMovieFilters();
        }
    }

    clearAllFilters() {
        const genreFilter = document.getElementById('genreFilter');
        const yearMin = document.getElementById('yearMin');
        const yearMax = document.getElementById('yearMax');
        const ratingFilter = document.getElementById('ratingFilter');
        const ratingValue = document.getElementById('ratingValue');
        const sortBy = document.getElementById('sortBy');

        if (genreFilter) genreFilter.value = '';
        if (yearMin) yearMin.value = '';
        if (yearMax) yearMax.value = '';
        if (ratingFilter) {
            ratingFilter.value = 0;
            if (ratingValue) ratingValue.textContent = '0';
        }
        if (sortBy) sortBy.value = 'popularity.desc';
        
        this.applyFilters();
    }
}

// ==================== VARIÁVEIS GLOBAIS ====================

let api;
let uiManager;
let filterManager;
let allMovies = [];
let currentMovies = [];
let genresList = [];
let currentPage = 1;
let currentSearchQuery = '';

// ==================== FUNÇÕES PRINCIPAIS ====================

async function performSearch() {
    if (!api || !uiManager) return;
    
    uiManager.showLoading();
    uiManager.showSkeletons();
    
    try {
        const searchInput = document.getElementById('searchInput').value;
        currentSearchQuery = searchInput;
        
        let data;
        if (searchInput) {
            data = await api.searchMovies(searchInput, 1);
            document.getElementById('resultsTitle').textContent = `Resultados para: "${searchInput}"`;
        } else {
            data = await api.getPopularMovies(1);
            document.getElementById('resultsTitle').textContent = 'Filmes Populares';
        }
        
        allMovies = data.results;
        currentMovies = [...allMovies];
        currentPage = 1;
        
        document.getElementById('resultsCount').textContent = `${currentMovies.length} filmes encontrados`;
        
        await uiManager.renderMovies(currentMovies.slice(0, 20), genresList);
        
        if (currentMovies.length === 0 && uiManager.moviesGrid) {
            uiManager.moviesGrid.innerHTML = '<div style="text-align: center; padding: 3rem;"><i class="fas fa-search" style="font-size: 3rem;"></i><p>Nenhum filme encontrado</p></div>';
        }
    } catch (error) {
        console.error('Search error:', error);
        if (error.message.includes('API Key')) {
            uiManager.showToast('Erro: API Key inválida. Reinicie a página e insira uma chave válida.');
        } else {
            uiManager.showToast('Erro ao buscar filmes: ' + error.message);
        }
    } finally {
        uiManager.hideLoading();
    }
}

window.applyMovieFilters = function() {
    // Função simplificada para filtros
    if (allMovies.length > 0 && uiManager) {
        uiManager.renderMovies(allMovies.slice(0, 20), genresList, false);
    }
};

async function surpriseMe() {
    if (!api || !uiManager) return;
    
    uiManager.showLoading();
    try {
        const randomMovie = await api.getRandomMovie();
        if (randomMovie) {
            await uiManager.showMovieDetails(randomMovie.id);
        } else {
            uiManager.showToast('Não foi possível encontrar um filme aleatório');
        }
    } catch (error) {
        uiManager.showToast('Erro ao buscar filme aleatório');
    } finally {
        uiManager.hideLoading();
    }
}

function setupEventListeners() {
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const surpriseBtn = document.getElementById('surpriseBtn');
    const themeToggle = document.getElementById('themeToggle');
    const mobileFilterToggle = document.getElementById('mobileFilterToggle');
    const closeFiltersBtn = document.getElementById('closeFiltersBtn');
    const modalClose = document.querySelector('.modal-close');
    const modalCloseCompare = document.querySelector('.modal-close-compare');
    
    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    if (surpriseBtn) surpriseBtn.addEventListener('click', surpriseMe);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            if (currentTheme === 'dark') {
                document.body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            } else {
                document.body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
        });
    }
    
    if (mobileFilterToggle) {
        mobileFilterToggle.addEventListener('click', () => {
            document.querySelector('.sidebar')?.classList.add('active');
        });
    }
    
    if (closeFiltersBtn) {
        closeFiltersBtn.addEventListener('click', () => {
            document.querySelector('.sidebar')?.classList.remove('active');
        });
    }
    
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            document.getElementById('movieModal').style.display = 'none';
        });
    }
    
    if (modalCloseCompare) {
        modalCloseCompare.addEventListener('click', () => {
            document.getElementById('compareModal').style.display = 'none';
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('movieModal')) {
            document.getElementById('movieModal').style.display = 'none';
        }
        if (e.target === document.getElementById('compareModal')) {
            document.getElementById('compareModal').style.display = 'none';
        }
    });
}

async function init() {
    // Verificar se tem API Key
    if (!API_KEY) {
        showApiKeyModal();
        return;
    }
    
    // Carregar tema salvo
    const savedTheme = localStorage.getItem('theme');
    const themeToggle = document.getElementById('themeToggle');
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    setupEventListeners();
    
    // Inicializar classes
    api = new MovieAPI();
    uiManager = new UIManager();
    filterManager = new FilterManager(uiManager);
    
    window.uiManager = uiManager;
    
    try {
        // Testar API Key
        const testGenres = await api.getGenres();
        if (!testGenres || testGenres.length === 0) {
            throw new Error('Não foi possível obter gêneros');
        }
        
        genresList = testGenres;
        const genreSelect = document.getElementById('genreFilter');
        if (genreSelect) {
            genresList.forEach(genre => {
                const option = document.createElement('option');
                option.value = genre.id;
                option.textContent = genre.name;
                genreSelect.appendChild(option);
            });
        }
        
        // Set year range
        const currentYear = new Date().getFullYear();
        const yearMin = document.getElementById('yearMin');
        const yearMax = document.getElementById('yearMax');
        if (yearMin) yearMin.max = currentYear;
        if (yearMax) yearMax.max = currentYear;
        if (yearMin) yearMin.value = 1900;
        if (yearMax) yearMax.value = currentYear;
        
        await performSearch();
        
        showToast('✅ Sistema pronto! Busque seus filmes favoritos.', 3000);
    } catch (error) {
        console.error('Init error:', error);
        if (error.message.includes('API Key') || error.message.includes('401')) {
            localStorage.removeItem('tmdb_api_key');
            API_KEY = '';
            showApiKeyModal();
        } else {
            showToast('Erro ao inicializar: ' + error.message);
        }
    }
}

// Iniciar aplicação
init();
