$(document).ready(function () {
    // --- Configuration ---
    const apiKey = '34ed7af4'; // Replace with your OMDb API key
    const omdbUrl = 'https://www.omdbapi.com/';
    const placeholderImg = 'https://via.placeholder.com/200x300.png?text=No+Poster';

    // --- Cached Selectors ---
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

    // --- Bootstrap/jQuery UI Instances ---
    const errorToast = $errorToastEl.length ? new bootstrap.Toast($errorToastEl[0]) : null;
    const movieDetailsModal = $movieDetailsModalEl.length ? new bootstrap.Modal($movieDetailsModalEl[0]) : null;

    // --- Application State ---
    let favorites = JSON.parse(localStorage.getItem('movieFavorites')) || [];

    // --- Helper Functions ---

    // Shows error messages using a toast or alert fallback.
    function showError(message) {
        console.error("App Error:", message);
        if (errorToast) {
            $errorToastBody.text(message);
            errorToast.show();
        } else {
            alert("Error: " + message); // Fallback
        }
    }

    // Updates the visual state of a favorite button (star icon).
    function updateFavoriteButtonUI(movieId, isFavorite) {
        const $button = $(`.favorite-btn[data-id="${movieId}"]`);
        $button.toggleClass('text-warning', isFavorite).toggleClass('text-secondary', !isFavorite);
        $button.attr('title', isFavorite ? 'Remove from Favorites' : 'Add to Favorites');
    }

    // Generates HTML markup for a single movie card.
    function createMovieCardHtml(movie, isFavorite) {
        const title = movie.Title || 'Unknown Title';
        const year = movie.Year || '----';
        const poster = (movie.Poster && movie.Poster !== 'N/A') ? movie.Poster : placeholderImg;
        const imdbID = movie.imdbID;
        if (!imdbID) return '';

        const favIconClass = isFavorite ? 'text-warning' : 'text-secondary';
        const favTitle = isFavorite ? 'Remove from Favorites' : 'Add to Favorites';

        // Uses Bootstrap grid column and card classes directly
        return `
            <div class="col-sm-6 col-md-4 col-lg-3 d-flex align-items-stretch">
                <div class="card movie-card w-100" data-imdb-id="${imdbID}" data-title="${encodeURIComponent(title)}" data-year="${year}" data-poster="${encodeURIComponent(poster)}">
                    <img src="${poster}" class="card-img-top movie-poster" alt="${title} Poster" onerror="this.onerror=null;this.src='${placeholderImg}';">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title text-truncate" title="${title}">${title}</h5>
                        <p class="card-text text-muted small">${year}</p>
                        <div class="mt-auto d-flex justify-content-between align-items-center pt-2">
                            <button class="btn btn-sm favorite-btn p-0 ${favIconClass}" data-id="${imdbID}" title="${favTitle}">
                                <i class="fas fa-star fa-lg"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary movie-details-btn" data-id="${imdbID}">Details</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Checks if movie cards are in viewport and applies fade-in animation.
    function checkFadeIn() {
        const windowBottom = $(window).scrollTop() + $(window).innerHeight();
        $(".movie-card:not(.fade-in)").each(function() {
            const $element = $(this);
            // Add fade-in class if element is scrolled into view
            if ($element.offset().top < windowBottom - 50) {
                 $element.addClass("fade-in");
            }
        });
    }

    // --- Core Application Logic ---

    // Performs movie search using OMDb API via AJAX.
    function searchMovies(searchTerm) {
        $loadingIndicator.removeClass('d-none'); // Show loading
        $moviesGrid.empty(); // Clear previous results

        $.ajax({
            url: `${omdbUrl}?s=${encodeURIComponent(searchTerm)}&apikey=${apiKey}`,
            method: 'GET', dataType: 'json', timeout: 10000, // Set timeout
            success: function (response) {
                if (response.Response === "True" && response.Search) {
                    displayMovies(response.Search); // Display results if successful
                } else {
                    const message = response.Error || 'No movies found.';
                    $moviesGrid.html(`<div class="col-12 text-center text-muted">${message}</div>`);
                    if (response.Error !== "Movie not found.") showError(message); // Show API errors
                }
            },
            error: function (xhr, status, error) { // Handle AJAX errors
                const errorMessage = 'Could not fetch movies. Check connection or API key.';
                showError(errorMessage);
                $moviesGrid.html(`<div class="col-12 text-center text-danger">${errorMessage}</div>`);
            },
            complete: function() {
                $loadingIndicator.addClass('d-none'); // Hide loading indicator
            }
        });
    }

    // Fetches detailed movie information via AJAX and displays in a modal.
    async function fetchMovieDetails(imdbID) {
        $movieDetailsModalBody.html('<div class="text-center p-3"><div class="spinner-border spinner-border-sm"></div> Loading...</div>');
        if (movieDetailsModal) movieDetailsModal.show(); // Show modal immediately

        try {
            const response = await $.ajax({ // Use async/await for cleaner AJAX
                url: `${omdbUrl}?i=${imdbID}&plot=full&apikey=${apiKey}`,
                method: 'GET', dataType: 'json', timeout: 8000
            });

            if (response.Response === "True") { // Populate modal if details found
                const modalContent = `
                    <div class="row g-3">
                        <div class="col-md-4"><img src="${response.Poster !== 'N/A' ? response.Poster : placeholderImg}" class="img-fluid rounded" alt="${response.Title} Poster" onerror="this.onerror=null;this.src='${placeholderImg}';"></div>
                        <div class="col-md-8">
                            <h4>${response.Title} <span class="text-muted fw-normal fs-6">(${response.Year})</span></h4>
                            <p><strong>Rating:</strong> ${response.imdbRating}/10</p>
                            <p><strong>Genre:</strong> ${response.Genre}</p>
                            <p><strong>Plot:</strong> ${response.Plot}</p>
                            <p><strong>Actors:</strong> ${response.Actors}</p>
                        </div>
                    </div>`;
                $movieDetailsModalBody.html(modalContent);
            } else {
                 const errorMessage = `Details Error: ${response.Error || 'Unknown'}`;
                 $movieDetailsModalBody.html(`<p class="text-danger">${errorMessage}</p>`);
                 showError(errorMessage); // Show specific API error
            }
        } catch (error) { // Catch network or other errors
            const errorMessage = 'Error fetching details.';
            $movieDetailsModalBody.html(`<p class="text-danger">${errorMessage}</p>`);
            showError(errorMessage);
        }
    }

    // Renders the list of movies in the main grid.
    function displayMovies(movies) {
        $moviesGrid.empty(); // Clear previous
        if (!movies || movies.length === 0) {
             $moviesGrid.html('<div class="col-12 text-center text-muted">No movies found.</div>');
            return;
        }
        movies.forEach(movie => {
            const isFavorite = favorites.some(fav => fav.imdbID === movie.imdbID);
            $moviesGrid.append(createMovieCardHtml(movie, isFavorite)); // Append each card
        });
        // Re-initialize tooltips for new elements (jQuery UI Plugin)
        $moviesGrid.find('[title]').tooltip({ track: true, show: { delay: 300 } });
        checkFadeIn(); // Trigger fade-in check for new cards
    }

    // Renders the list of favorite movies in the favorites grid.
    function updateFavoritesDisplay() {
        $favoritesGrid.empty(); // Clear previous
        if (favorites.length === 0) {
            $favoritesGrid.html('<div class="col-12 text-center text-muted">No favorites yet.</div>');
            return;
        }
        favorites.forEach(movie => {
            $favoritesGrid.append(createMovieCardHtml(movie, true)); // Always show as favorite
        });
        // Re-initialize tooltips for new elements
        $favoritesGrid.find('[title]').tooltip({ track: true, show: { delay: 300 } });
        checkFadeIn(); // Trigger fade-in check
    }

    // Adds or removes a movie from the favorites list and updates UI/storage.
    function toggleFavorite(movieId) {
        const index = favorites.findIndex(movie => movie.imdbID === movieId);
        let isNowFavorite;

        if (index > -1) { // Remove if exists
            favorites.splice(index, 1);
            isNowFavorite = false;
        } else { // Add if doesn't exist
            const $movieCard = $(`.movie-card[data-imdb-id="${movieId}"]`).first();
            // Ensure card data exists before adding
            if ($movieCard.length > 0) {
                 const movieData = {
                    imdbID: movieId,
                    Title: decodeURIComponent($movieCard.data('title')),
                    Year: $movieCard.data('year'),
                    Poster: decodeURIComponent($movieCard.data('poster'))
                };
                 favorites.unshift(movieData); // Add to beginning
                 isNowFavorite = true;
            } else {
                showError("Could not add favorite: Movie data missing.");
                return; // Stop if data is unavailable
            }
        }
        // Save to localStorage, update button visuals, refresh favorites grid
        localStorage.setItem('movieFavorites', JSON.stringify(favorites));
        updateFavoriteButtonUI(movieId, isNowFavorite);
        updateFavoritesDisplay();
    }

    // --- Event Handlers ---

    // Handles click on the main search button or Enter key press.
    function handleSearch() {
        const searchTerm = $searchInput.val().trim();
        if (searchTerm) searchMovies(searchTerm);
        else showError('Please enter a movie title.'); // Basic validation
    }

    // Handles click on a category button.
    function handleCategoryClick() {
        const category = $(this).data('category');
        $searchInput.val(category); // Put category in search box
        searchMovies(category); // Search by category term
        // No smooth scroll for simplification
    }

    // Handles click on a movie details button (uses event delegation).
    function handleDetailsClick() {
        fetchMovieDetails($(this).data('id'));
    }

    // Handles click on a favorite (star) button (uses event delegation).
    function handleFavoriteClick() {
        toggleFavorite($(this).data('id'));
    }

    // --- Initialization and Event Binding ---

    // Initialize jQuery UI widgets: Accordion and Tabs.
    $('#categories-accordion').accordion({ heightStyle: "content", collapsible: true, active: false });
    $('#info-tabs').tabs();

    // Initialize contact form validation using jQuery Validation Plugin.
    $contactForm.validate({
        rules: { // Define validation rules
            name: { required: true, minlength: 2 },
            email: { required: true, email: true },
            message: { required: true, minlength: 10 }
        },
        messages: { // Define custom error messages
            name: { required: "Please enter name", minlength: "Min 2 characters" },
            email: "Please enter a valid email",
            message: { required: "Please enter message", minlength: "Min 10 characters" }
        },
        submitHandler: function(form) { // Handle valid submission
            // Show success feedback, clear form, remove validation classes
            $formFeedback.html('<div class="alert alert-success">Thank you! Message sent.</div>')
                         .fadeIn().delay(3000).fadeOut(() => {
                             $(form).trigger('reset');
                             $(form).find('.is-valid, .is-invalid').removeClass('is-valid is-invalid');
                             $formFeedback.empty();
                          });
            return false; // Prevent actual browser form submission
        },
        // Use Bootstrap classes for validation feedback
        errorElement: "div", errorClass: "invalid-feedback",
        errorPlacement: function(error, element) { error.insertAfter(element); }, // Place error message after input
        highlight: function(element) { $(element).addClass("is-invalid").removeClass("is-valid"); }, // Style invalid fields
        unhighlight: function(element) { $(element).removeClass("is-invalid").addClass("is-valid"); } // Style valid fields
    });

    // Bind event listeners
    $('#searchButton').click(handleSearch); // Search button click
    $searchInput.keypress(function(e) { if (e.which === 13) handleSearch(); }); // Enter key in search input
    $(document).on('click', '.category-search', handleCategoryClick); // Category buttons (delegated)
    $(document).on('click', '.movie-details-btn', handleDetailsClick); // Details buttons (delegated)
    $(document).on('click', '.favorite-btn', handleFavoriteClick); // Favorite buttons (delegated)
    $(window).on('scroll', checkFadeIn); // Check for fade-in on scroll

    // --- Initial Load ---
    updateFavoritesDisplay(); // Load and display favorites from localStorage on page load.
    checkFadeIn(); // Check for elements already in view for fade-in.
    $('[title]').tooltip({ track: true, show: { delay: 300 } }); // Initialize tooltips globally on load
});