$(function () {
    // CONFIG AND CONSTANTS
    const API_KEY = '34ed7af4';
    const OMDB_URL = 'https://www.omdbapi.com/';
    const PLACEHOLDER_IMG = 'https://via.placeholder.com/200x300.png?text=No+Poster';

    // JQUERY SELECTORS
    const $searchInput = $('#searchInput');
    const $searchButton = $('#searchButton');
    const $loadingIndicator = $('#loadingIndicator');
    const $moviesGrid = $('#moviesGrid');
    const $favoritesGrid = $('#favoritesGrid');
    const $movieDetailsModalEl = $('#movieDetailsModal');
    const $movieDetailsModalBody = $('#movieDetailsModalBody');
    const $errorToastEl = $('#errorToast');
    const $errorToastBody = $('#errorToastBody');
    const $contactForm = $('#contact-form');
    const $formFeedback = $('#formFeedback');
    const $themeToggleBtn = $('#theme-toggle');
    const $categoriesAccordion = $('#categories-accordion');
    const $infoTabs = $('#info-tabs');

    // COMPONENT INSTANCES
    const errorToast = $errorToastEl.length ? new bootstrap.Toast($errorToastEl[0]) : null;
    const movieDetailsModal = $movieDetailsModalEl.length ? new bootstrap.Modal($movieDetailsModalEl[0]) : null;

    // APPLICATION STATE
    let favorites = JSON.parse(localStorage.getItem('movieFavorites')) || [];

    // HELPER FUNCTIONS
    // function to initialize or refresh tooltips
    function initTooltips(selector = '[title]') {
        $(selector).tooltip('dispose').tooltip({
            track: true,
            show: { delay: 300 }
        });
    }

    // function to show error message
    function showError(message) {
        console.error("App Error:", message); // console errors for debugging
        if (errorToast) {
            $errorToastBody.text(message);
            errorToast.show();
        } else {
            alert("Error: " + message); // fallback
        }
    }

    // function to update favorite button UI
    function updateFavoriteButtonUI(movieId, isFavorite) {
        $(`.favorite-btn[data-id="${movieId}"]`)
            .toggleClass('text-warning', isFavorite)
            .toggleClass('text-secondary', !isFavorite)
            .attr('title', isFavorite ? 'Remove from Favorites' : 'Add to Favorites');
        initTooltips(`.favorite-btn[data-id="${movieId}"]`); // use helper
    }

    // function to create movie card HTML
    function createMovieCardHtml(movie, isFavorite) {
        const { Title = 'Unknown Title', Year = '----', Poster, imdbID } = movie;
        if (!imdbID) return '';

        const posterSrc = (Poster && Poster !== 'N/A') ? Poster : PLACEHOLDER_IMG;
        const favIconClass = isFavorite ? 'text-warning' : 'text-secondary';
        const favTitle = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';

        return `
            <div class="col-sm-6 col-md-4 col-lg-3 d-flex align-items-stretch">
                <div class="card movie-card w-100"
                     data-imdb-id="${imdbID}"
                     data-title="${encodeURIComponent(Title)}"
                     data-year="${Year}"
                      data-poster="${encodeURIComponent(posterSrc)}">
                    <img src="${posterSrc}" class="card-img-top movie-poster" alt="${Title} Poster"
                         onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title text-truncate" title="${Title}">${Title}</h5>
                        <p class="card-text text-muted small">${Year}</p>
                        <div class="mt-auto d-flex justify-content-between align-items-center pt-2">
                            <button class="btn btn-sm favorite-btn p-0 ${favIconClass}" data-id="${imdbID}" title="${favTitle}">
                                <i class="fas fa-star fa-lg"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary movie-details-btn" data-id="${imdbID}">Details</button>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    // function to render movies
    function renderMovies($grid, movies, isFavoriteOverride = null) {
        $grid.empty();

        if (!movies || movies.length === 0) {
            const message = $grid.is($favoritesGrid) ? 'No favorites yet. Add some!' : 'No movies found for your search.';
            $grid.html(`<div class="col-12 text-center text-muted p-4">${message}</div>`);
            return;
        }

        const movieHtml = movies.map(movie => {
            // 'isFavoriteOverride' is used for the favorites grid where all items are known favorites
            const isFav = isFavoriteOverride ?? favorites.some(fav => fav.imdbID === movie.imdbID);
            return createMovieCardHtml(movie, isFav);
        }).join('');

        $grid.html(movieHtml);
        initTooltips($grid.find('[title]')); // use helper
        checkFadeIn();
    }

    // function to update favorites order in local storage
    function updateFavoritesOrder() {
        const newOrderIds = $favoritesGrid.find('.movie-card').map(function() {
            return $(this).data('imdb-id');
        }).get();

        favorites.sort((a, b) => {
            const indexA = newOrderIds.indexOf(a.imdbID);
            const indexB = newOrderIds.indexOf(b.imdbID);
            if (indexA === -1) return 1; // should not happen if UI is synced
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        localStorage.setItem('movieFavorites', JSON.stringify(favorites));
    }

    // function to check if elements in view
    function checkFadeIn() {
        const windowBottom = $(window).scrollTop() + $(window).innerHeight();
        $(".movie-card:not(.fade-in)").filter(function() {
            const elementTop = $(this).offset().top;
            return elementTop < windowBottom - 50; // trigger 50px before fully visible
        }).addClass("fade-in");
    }

    // APP LOGIC  
    async function searchMovies(searchTerm) {
        $loadingIndicator.removeClass('d-none');
        $moviesGrid.empty();

        try {
            const response = await $.getJSON(`${OMDB_URL}?s=${encodeURIComponent(searchTerm)}&apikey=${API_KEY}`);

            if (response.Response === "True" && response.Search) {
                renderMovies($moviesGrid, response.Search);
            } else {
                const message = response.Error || 'No movies found matching your search.';
                $moviesGrid.html(`<div class="col-12 text-center text-muted p-4">${message}</div>`);
                if (response.Error && response.Error !== "Movie not found." && response.Error !== "Too many results.") {
                    showError(`API Error: ${message}`);
                }
            }
        } catch (error) {
            console.error("AJAX Error searching movies:", error);
            const errorMessage = 'Could not fetch movies due to a network or server issue.';
            showError(errorMessage);
            $moviesGrid.html(`<div class="col-12 text-center text-danger p-4">${errorMessage}</div>`);
        } finally {
            $loadingIndicator.addClass('d-none');
        }
    }

    // function to fetch movie details
    async function fetchMovieDetails(imdbID) {
        $movieDetailsModalBody.html('<div class="text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>');
        if (movieDetailsModal) movieDetailsModal.show();

        try {
            const response = await $.getJSON(`${OMDB_URL}?i=${imdbID}&plot=full&apikey=${API_KEY}`);

            if (response.Response === "True") {
                const { Title, Year, imdbRating = 'N/A', Genre = 'N/A', Plot = 'N/A', Poster } = response;
                const posterSrc = Poster && Poster !== 'N/A' ? Poster : PLACEHOLDER_IMG;

                const modalContent = `
                    <div class="row">
                        <div class="col-md-4 text-center">
                            <img src="${posterSrc}" alt="${Title}" class="img-fluid rounded mb-3 mb-md-0" style="max-height: 350px;"
                                 onerror="this.onerror=null;this.src='${PLACEHOLDER_IMG}';">
                        </div>
                        <div class="col-md-8">
                            <h4>${Title} <span class="text-muted">(${Year})</span></h4>
                            <p class="mb-1"><strong><i class="fas fa-star text-warning me-1"></i> Rating:</strong> ${imdbRating}/10</p>
                            <p class="mb-1"><strong><i class="fas fa-tag me-1"></i> Genre:</strong> ${Genre}</p>
                            <p class="mt-3"><strong>Plot:</strong></p>
                            <p>${Plot}</p>
                        </div>
                    </div>`;
                $movieDetailsModalBody.html(modalContent);
            } else {
                 const errorMessage = `Could not fetch details: ${response.Error || 'Unknown API error'}`;
                 $movieDetailsModalBody.html(`<div class="alert alert-danger">${errorMessage}</div>`);
                 showError(errorMessage);
            }
        } catch (error) {
            console.error("Error fetching movie details:", error);
            const errorMessage = 'Failed to fetch movie details due to a network or server error.';
            $movieDetailsModalBody.html(`<div class="alert alert-danger">${errorMessage}</div>`);
            showError(errorMessage);
        }
    }

    // function to toggle favorite status
    function toggleFavorite(movieId) {
        const movieIndex = favorites.findIndex(fav => fav.imdbID === movieId);
        let isNowFavorite;

        if (movieIndex > -1) {
            // Remove
            favorites.splice(movieIndex, 1);
            isNowFavorite = false;
        } else {
            // Add
            const $button = $(`.favorite-btn[data-id="${movieId}"]`);
            const $card = $button.closest('.movie-card');

            if ($card.length && $card.data('imdb-id') === movieId) {
                const movieData = {
                    imdbID: movieId,
                    Title: decodeURIComponent($card.data('title') || 'Unknown Title'),
                    Year: $card.data('year') || '----',
                    Poster: decodeURIComponent($card.data('poster') || PLACEHOLDER_IMG)
                };
                 favorites.push(movieData);
                 isNowFavorite = true;
            } else {
                // console.warn removed as showError provides user feedback
                showError("Could not add movie to favorites. Data missing.");
                return;
            }
        }

        localStorage.setItem('movieFavorites', JSON.stringify(favorites));
        updateFavoriteButtonUI(movieId, isNowFavorite);
        renderMovies($favoritesGrid, favorites, true); // Re-render favorites grid
    }

    // function to handle search
    function handleSearch() {
        const searchTerm = $searchInput.val().trim();
        if (searchTerm) {
            searchMovies(searchTerm);
        } else {
            showError('Please enter a movie title to search.');
            $searchInput.focus();
        }
    }

    // function to apply theme
    function applyTheme(theme) {
        $('html').attr('data-bs-theme', theme);
        const $icon = $themeToggleBtn.find('i');
        let newTitle = '';

        if (theme === 'dark') {
            $icon.removeClass('fa-moon').addClass('fa-sun');
            newTitle = 'Switch to Light Mode';
        } else {
            $icon.removeClass('fa-sun').addClass('fa-moon');
            newTitle = 'Switch to Dark Mode';
        }

        $themeToggleBtn.attr('title', newTitle)
                       .tooltip('dispose'); // Dispose old one first
        initTooltips($themeToggleBtn); // Use helper

        localStorage.setItem('movieFinderTheme', theme);
    }

    // toggle theme
    function toggleTheme() {
        const currentTheme = $('html').attr('data-bs-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    }

    // INIT AND EVENTS
    // initialize jQuery UI widgets
    if ($categoriesAccordion.length) {
        $categoriesAccordion.accordion({
            heightStyle: "content",
            collapsible: true,
            active: false
        });
    }
    if ($infoTabs.length) {
        $infoTabs.tabs();
    }

    // initialize jQuery validation plugin for contact form
    if ($contactForm.length) {
        $contactForm.validate({
            rules: {
                name: { required: true, minlength: 2 },
                email: { required: true, email: true },
                message: { required: true, minlength: 10 }
            },
            messages: {
                name: "Please enter your name (at least 2 characters)",
                email: "Please enter a valid email address",
                message: "Please enter your message (at least 10 characters)"
            },
            submitHandler: function(form) {
                $formFeedback.html('<div class="alert alert-success alert-dismissible fade show" role="alert">Thank you for your message! We\'ll be in touch.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>')
                             .show()
                             .delay(5000)
                             .fadeOut();
                form.reset();
            },
            // bootstrap integration for validation styling
            errorElement: "div",
            errorPlacement: function(error, element) {
                error.addClass("invalid-feedback").insertAfter(element);
            },
            highlight: function(element, errorClass, validClass) {
                $(element).addClass("is-invalid").removeClass("is-valid");
            },
            unhighlight: function(element, errorClass, validClass) {
                $(element).removeClass("is-invalid").addClass("is-valid");
            }
        });
    }

    // initialize jQuery UI sortable for favorites grid
    if ($favoritesGrid.length) {
        $favoritesGrid.sortable({
            items: '> .col-sm-6', // target the direct children columns
            handle: '.card',
            placeholder: 'col-sm-6 col-md-4 col-lg-3 movie-card-placeholder',
            forcePlaceholderSize: true,
            cursor: 'move',
            opacity: 0.7,
            update: function(event, ui) {
                updateFavoritesOrder(); // update stored order after sorting
            }
        }).disableSelection();
    }

    // bind event handlers
    $searchButton.on('click', handleSearch);
    $searchInput.on('keypress', function(e) {
        if (e.which === 13) { // enter key
            handleSearch();
        }
    });
    $themeToggleBtn.on('click', toggleTheme);

    // event delegation for dynamic elements
    $(document).on('click', '.category-search', function() {
        const category = $(this).data('category');
        if (category) {
            $searchInput.val(category);
            searchMovies(category);
            window.scrollTo(0, 0);
        }
    }).on('click', '.movie-details-btn', function() {
        const imdbID = $(this).data('id');
        if (imdbID) {
            fetchMovieDetails(imdbID);
        }
    }).on('click', '.favorite-btn', function() {
        const imdbID = $(this).data('id');
        if (imdbID) {
            toggleFavorite(imdbID);
        }
    });

    // fade-in effect on scroll
    $(window).on('scroll', checkFadeIn);

    // initial page load actions
    const savedTheme = localStorage.getItem('movieFinderTheme') || 'light';
    applyTheme(savedTheme);
    renderMovies($favoritesGrid, favorites, true); // render initial favorites
    checkFadeIn(); // check elements in view on load
    initTooltips(); // init all static tooltips on load using helper
});
