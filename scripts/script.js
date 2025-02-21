$(document).ready(function() {
    const apiKey = '34ed7af4'; // Replace with your OMDB API key
    let favorites = JSON.parse(localStorage.getItem('movieFavorites')) || [];
    const errorToast = new bootstrap.Toast(document.getElementById('errorToast'));
    const movieDetailsModal = new bootstrap.Modal(document.getElementById('movieDetailsModal'));

    // Theme switching
    function setTheme(isDark) {
        $('html').attr('data-bs-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('darkMode', isDark);
        const $themeBtn = $('#themeToggle');
        $themeBtn.html(isDark ? 
            '<i class="fas fa-sun"></i> Light Mode' : 
            '<i class="fas fa-moon"></i> Dark Mode'
        );
    }

    // Initialize theme
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    setTheme(isDarkMode);

    $('#themeToggle').click(function() {
        const isDark = $('html').attr('data-bs-theme') === 'light';
        setTheme(isDark);
    });

    function showError(message) {
        $('#errorToast .toast-body').text(message);
        errorToast.show();
    }

    // Search functionality
    function handleSearch() {
        const searchTerm = $('.search-box').val().trim();
        if (searchTerm) {
            searchMovies(searchTerm);
        } else {
            showError('Please enter a search term');
        }
    }

    $('.search-btn').click(handleSearch);
    $('.search-box').keypress(function(e) {
        if (e.which === 13) {
            handleSearch();
        }
    });

    function searchMovies(searchTerm) {
        $('.loading').removeClass('d-none');
        $('.movies-grid').empty();

        $.ajax({
            url: `https://www.omdbapi.com/?s=${searchTerm}&apikey=${apiKey}`,
            method: 'GET',
            success: function(response) {
                $('.loading').addClass('d-none');
                if (response.Response === "True") {
                    displayMovies(response.Search);
                } else {
                    showError(response.Error || 'No movies found');
                }
            },
            error: function(xhr, status, error) {
                $('.loading').addClass('d-none');
                showError('Error fetching movies. Please try again later.');
            }
        });
    }

    function getStarRating(rating) {
        const numericRating = parseFloat(rating) / 2; // Convert to 5-star scale
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= numericRating) {
                stars += '<i class="fas fa-star"></i>';
            } else if (i - 0.5 <= numericRating) {
                stars += '<i class="fas fa-star-half-alt"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        return stars;
    }

    async function fetchMovieDetails(imdbID) {
        try {
            const response = await $.ajax({
                url: `https://www.omdbapi.com/?i=${imdbID}&plot=full&apikey=${apiKey}`,
                method: 'GET'
            });
            
            if (response.Response === "True") {
                const modalContent = `
                    <div class="row">
                        <div class="col-md-4">
                            <img src="${response.Poster !== 'N/A' ? response.Poster : '/api/placeholder/200/300'}" 
                                 class="img-fluid rounded" alt="${response.Title}">
                        </div>
                        <div class="col-md-8">
                            <h3>${response.Title} (${response.Year})</h3>
                            <div class="star-rating mb-2">
                                ${getStarRating(response.imdbRating)}
                                <span class="ms-2">${response.imdbRating}/10</span>
                            </div>
                            <p><strong>Director:</strong> ${response.Director}</p>
                            <p><strong>Cast:</strong> ${response.Actors}</p>
                            <p><strong>Genre:</strong> ${response.Genre}</p>
                            <p><strong>Runtime:</strong> ${response.Runtime}</p>
                            <p><strong>Plot:</strong> ${response.Plot}</p>
                            <p><strong>Awards:</strong> ${response.Awards}</p>
                        </div>
                    </div>
                `;
                $('#movieDetailsModal .modal-body').html(modalContent);
                movieDetailsModal.show();
            }
        } catch (error) {
            showError('Error fetching movie details');
        }
    }

    function displayMovies(movies) {
        movies.forEach(movie => {
            const isFavorite = favorites.some(fav => fav.imdbID === movie.imdbID);
            const movieCard = $(`
                <div class="col-sm-6 col-md-4 col-lg-3">
                    <div class="card movie-card">
                        <img src="${movie.Poster !== 'N/A' ? movie.Poster : '/api/placeholder/200/300'}" 
                             class="card-img-top movie-poster" 
                             alt="${movie.Title}">
                        <div class="card-body">
                            <h5 class="card-title text-truncate">${movie.Title}</h5>
                            <p class="card-text">${movie.Year}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <button class="favorite-btn ${isFavorite ? 'text-warning' : 'text-secondary'}" 
                                        data-id="${movie.imdbID}">
                                    <i class="fas fa-star"></i>
                                </button>
                                <span class="movie-details-btn" data-id="${movie.imdbID}">See Details</span>
                            </div>
                        </div>
                    </div>
                </div>
            `);
            $('.movies-grid').append(movieCard);
        });
    }

    // Movie details handler
    $(document).on('click', '.movie-details-btn', function() {
        const movieId = $(this).data('id');
        fetchMovieDetails(movieId);
    });

    // Favorite functionality
    $(document).on('click', '.favorite-btn', function() {
        const $this = $(this);
        const movieCard = $this.closest('.card');
        const movieId = $this.data('id');
        const movieData = {
            imdbID: movieId,
            Title: movieCard.find('.card-title').text(),
            Year: movieCard.find('.card-text').text(),
            Poster: movieCard.find('.movie-poster').attr('src')
        };

        if ($this.hasClass('text-warning')) {
            $this.removeClass('text-warning').addClass('text-secondary');
            favorites = favorites.filter(movie => movie.imdbID !== movieId);
        } else {
            $this.removeClass('text-secondary').addClass('text-warning');
            if (!favorites.some(movie => movie.imdbID === movieId)) {
                favorites.push(movieData);
            }
        }

        localStorage.setItem('movieFavorites', JSON.stringify(favorites));
        updateFavorites();
    });

    function updateFavorites() {
        $('.favorites-grid').empty();
        favorites.forEach(movie => {
            const favoriteCard = $(`
                <div class="col-sm-6 col-md-4 col-lg-3">
                    <div class="card movie-card">
                        <img src="${movie.Poster}" 
                             class="card-img-top movie-poster" 
                             alt="${movie.Title}">
                        <div class="card-body">
                            <h5 class="card-title text-truncate">${movie.Title}</h5>
                            <p class="card-text">${movie.Year}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <button class="favorite-btn text-warning" data-id="${movie.imdbID}">
                                    <i class="fas fa-star"></i>
                                </button>
                                <span class="movie-details-btn" data-id="${movie.imdbID}">See Details</span>
                            </div>
                        </div>
                    </div>
                </div>
            `);
            $('.favorites-grid').append(favoriteCard);
        });

        if (favorites.length === 0) {
            $('.favorites-grid').html('<div class="col-12 text-center">No favorite movies yet</div>');
        }
    }

    // Initialize favorites
    updateFavorites();
});