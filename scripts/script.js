$(function () { // Use jQuery's shorthand for $(document).ready()
    // --- Config & Selectors ---
    const apiKey = '34ed7af4';
    const omdbUrl = 'https://www.omdbapi.com/';
    const placeholderImg = 'https://via.placeholder.com/200x300.png?text=No+Poster';
    const $searchInput = $('#searchInput');
    const $loadingIndicator = $('#loadingIndicator');
    const $moviesGrid = $('#moviesGrid');
    const $favoritesGrid = $('#favoritesGrid');
    const $movieDetailsModalEl = $('#movieDetailsModal');
    const $movieDetailsModalBody = $('#movieDetailsModalBody');
    const $errorToastEl = $('#errorToast');
    const $errorToastBody = $('#errorToastBody');
    const $contactForm = $('#contact-form');
    const $formFeedback = $('#formFeedback');

    // --- Instances ---
    const errorToast = $errorToastEl.length ? new bootstrap.Toast($errorToastEl[0]) : null;
    const movieDetailsModal = $movieDetailsModalEl.length ? new bootstrap.Modal($movieDetailsModalEl[0]) : null;

    // --- State ---
    let favorites = JSON.parse(localStorage.getItem('movieFavorites')) || [];

    // --- Helpers ---
    function showError(message) {
        console.error("App Error:", message);
        if (errorToast) {
            $errorToastBody.text(message).parent().parent().toast('show'); // Chain to show toast
        } else {
            alert("Error: " + message);
        }
    }

    function updateFavoriteButtonUI(movieId, isFavorite) {
        $(`.favorite-btn[data-id="${movieId}"]`)
            .toggleClass('text-warning', isFavorite)
            .toggleClass('text-secondary', !isFavorite)
            .attr('title', isFavorite ? 'Remove from Favorites' : 'Add to Favorites');
    }

    function createMovieCardHtml(movie, isFavorite) {
        const { Title = 'Unknown Title', Year = '----', Poster, imdbID } = movie;
        if (!imdbID) return '';
        const posterSrc = (Poster && Poster !== 'N/A') ? Poster : placeholderImg;
        const favIconClass = isFavorite ? 'text-warning' : 'text-secondary';
        const favTitle = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';

        // Store essential data directly on the card element
        return `
            <div class="col-sm-6 col-md-4 col-lg-3 d-flex align-items-stretch">
                <div class="card movie-card w-100"
                     data-imdb-id="${imdbID}"
                     data-title="${encodeURIComponent(Title)}"
                     data-year="${Year}"
                     data-poster="${encodeURIComponent(posterSrc)}">
                    <img src="${posterSrc}" class="card-img-top movie-poster" alt="${Title} Poster" onerror="this.onerror=null;this.src='${placeholderImg}';">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title text-truncate" title="${Title}">${Title}</h5>
                        <p class="card-text text-muted small">${Year}</p>
                        <div class="mt-auto d-flex justify-content-between align-items-center pt-2">
                            <button class="btn btn-sm favorite-btn p-0 ${favIconClass}" data-id="${imdbID}" title="${favTitle}"><i class="fas fa-star fa-lg"></i></button>
                            <button class="btn btn-sm btn-outline-primary movie-details-btn" data-id="${imdbID}">Details</button>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    function renderMovies($grid, movies, isFavoriteOverride = null) {
        $grid.empty();
        if (!movies || movies.length === 0) {
            const message = $grid.is($favoritesGrid) ? 'No favorites yet.' : 'No movies found.';
            $grid.html(`<div class="col-12 text-center text-muted">${message}</div>`);
            return;
        }
        const movieHtml = movies.map(movie => {
            const isFav = isFavoriteOverride ?? favorites.some(fav => fav.imdbID === movie.imdbID);
            return createMovieCardHtml(movie, isFav);
        }).join('');
        $grid.html(movieHtml).find('[title]').tooltip({ track: true, show: { delay: 300 } });
        checkFadeIn();
    }

    function checkFadeIn() {
        const windowBottom = $(window).scrollTop() + $(window).innerHeight();
        $(".movie-card:not(.fade-in)").filter(function() { // Use filter for efficiency
            return $(this).offset().top < windowBottom - 50;
        }).addClass("fade-in");
    }

    // --- Core Logic ---
    function searchMovies(searchTerm) {
        $loadingIndicator.removeClass('d-none');
        $moviesGrid.empty();

        $.getJSON(`${omdbUrl}?s=${encodeURIComponent(searchTerm)}&apikey=${apiKey}`) // Use getJSON shorthand
            .done(response => {
                if (response.Response === "True" && response.Search) {
                    renderMovies($moviesGrid, response.Search);
                } else {
                    const message = response.Error || 'No movies found.';
                    $moviesGrid.html(`<div class="col-12 text-center text-muted">${message}</div>`);
                    if (response.Error !== "Movie not found.") showError(message);
                }
            }).fail(() => {
                const errorMessage = 'Could not fetch movies.';
                showError(errorMessage);
                $moviesGrid.html(`<div class="col-12 text-center text-danger">${errorMessage}</div>`);
            }).always(() => {
                $loadingIndicator.addClass('d-none');
            });
    }

    async function fetchMovieDetails(imdbID) {
        $movieDetailsModalBody.html('<div class="text-center p-3"><div class="spinner-border spinner-border-sm"></div> Loading...</div>');
        if (movieDetailsModal) movieDetailsModal.show();

        try {
            const response = await $.getJSON(`${omdbUrl}?i=${imdbID}&plot=full&apikey=${apiKey}`); // Use getJSON shorthand
            if (response.Response === "True") {
                const { Title, Year, imdbRating, Genre, Plot, Poster } = response;
                const posterSrc = Poster !== 'N/A' ? Poster : placeholderImg;
                const modalContent = `
                    <h4>${Title} (${Year})</h4>
                    <p><strong>Rating:</strong> ${imdbRating}/10</p>
                    <p><strong>Genre:</strong> ${Genre}</p>
                    <p><strong>Plot:</strong> ${Plot}</p>
                    <img src="${posterSrc}" alt="${Title}" class="img-fluid mb-3" style="max-height: 300px;">`;
                $movieDetailsModalBody.html(modalContent);
            } else {
                 const errorMessage = `Details Error: ${response.Error || 'Unknown'}`;
                 $movieDetailsModalBody.html(`<p class="text-danger">${errorMessage}</p>`);
                 showError(errorMessage);
            }
        } catch (error) {
            const errorMessage = 'Error fetching details.';
            $movieDetailsModalBody.html(`<p class="text-danger">${errorMessage}</p>`);
            showError(errorMessage);
        }
    }

    function toggleFavorite(movieId) {
        const movieIndex = favorites.findIndex(fav => fav.imdbID === movieId);
        let isNowFavorite;

        if (movieIndex > -1) {
            favorites.splice(movieIndex, 1);
            isNowFavorite = false;
        } else {
            // Find the button that was clicked, then its parent card
            const $button = $(`.favorite-btn[data-id="${movieId}"]`);
            const $card = $button.closest('.movie-card'); // Find the card associated with the clicked button

            if ($card.length && $card.data('imdb-id') === movieId) { // Ensure we found the correct card
                // Retrieve data directly from the card's data attributes
                const movieData = {
                    imdbID: movieId,
                    Title: decodeURIComponent($card.data('title') || 'Unknown Title'),
                    Year: $card.data('year') || '----',
                    Poster: decodeURIComponent($card.data('poster') || placeholderImg)
                };
                 favorites.push(movieData);
                 isNowFavorite = true;
            } else {
                console.warn("Could not find movie card data to add to favorites:", movieId);
                return;
            }
        }
        localStorage.setItem('movieFavorites', JSON.stringify(favorites));
        updateFavoriteButtonUI(movieId, isNowFavorite);
        renderMovies($favoritesGrid, favorites, true);
    }

    function handleSearch() {
        const searchTerm = $searchInput.val().trim();
        if (searchTerm) searchMovies(searchTerm);
        else showError('Please enter a movie title.');
    }

    // --- Init & Binding ---
    $('#categories-accordion').accordion({ 
        heightStyle: "content", 
        collapsible: true, 
        active: false 
    });
    $('#info-tabs').tabs();

    $contactForm.validate({
        rules: { 
            name: { 
                required: true, 
                minlength: 2 
            }, 
            email: { 
                required: true, 
                email: true 
            }, 
            message: { 
                required: true, 
                minlength: 10 
            } 
        },
        messages: { 
            name: "Please enter your name (min 2 chars)", 
            email: "Please enter a valid email", 
            message: "Please enter a message (min 10 chars)" 
        },
        submitHandler: function(form) {
            $formFeedback.html('<div class="alert alert-success">Thank you!</div>').show().delay(5000).fadeOut();
            form.reset();
            return false;
        },
        errorElement: "div",
        errorPlacement: (error, element) => error.addClass("invalid-feedback").insertAfter(element),
        highlight: element => $(element).addClass("is-invalid").removeClass("is-valid"),
        unhighlight: element => $(element).removeClass("is-invalid").addClass("is-valid")
    });

    $('#searchButton').on('click', handleSearch);
    $searchInput.on('keypress', e => { if (e.which === 13) handleSearch(); });
    $(document).on('click', '.category-search', function() {
        const category = $(this).data('category');
        $searchInput.val(category);
        searchMovies(category);
    }).on('click', '.movie-details-btn', function() {
        fetchMovieDetails($(this).data('id'));
    }).on('click', '.favorite-btn', function() {
        toggleFavorite($(this).data('id'));
    });
    $(window).on('scroll', checkFadeIn);

    // --- Initial Load ---
    renderMovies($favoritesGrid, favorites, true);
    checkFadeIn();
    $('[title]').tooltip({ 
        track: true, 
        show: { 
            delay: 300 
        } 
    });
});