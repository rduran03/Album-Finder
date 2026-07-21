function displayArtist(artist) {
  const header = document.getElementById('artist-header');
  const image = document.getElementById('artist-image');
  const name = document.getElementById('artist-name');
  const meta = document.getElementById('artist-meta');

  if (!artist) {
    header.classList.add('hidden');
    return;
  }

  image.src = artist.image || '';
  image.alt = artist.name;
  name.textContent = artist.name;
  meta.textContent = `${artist.followers.toLocaleString()} followers${artist.genres.length ? ' · ' + artist.genres.slice(0, 3).join(', ') : ''}`;
  header.classList.remove('hidden');
}

function displayAlbums(albums) {
  const grid = document.getElementById('albums-grid');
  grid.innerHTML = '';

  if (albums.length === 0) {
    grid.innerHTML = 'No albums found for this artist.';
    return;
  }

  albums.forEach((album) => {
    const releaseYear = album.release_date.split('-')[0];
    const imageUrl = album.images[0]?.url || 'https://via.placeholder.com/300';

    const card = document.createElement('div');
    card.className = 'album-card';
    card.innerHTML = `
      <img src="${imageUrl}" alt="${album.name} cover">
      <h3>${album.name}</h3>
      <p>Released: ${releaseYear}</p>
      <p>Tracks: ${album.total_tracks}</p>
    `;
    grid.appendChild(card);
  });
}

async function searchArtist() {
  const query = document.getElementById('artist-search').value.trim();
  const loading = document.getElementById('loading');
  const grid = document.getElementById('albums-grid');

  if (!query) return;

  loading.classList.remove('hidden');
  grid.innerHTML = '';
  displayArtist(null);

  try {
    const response = await fetch(`/api/albums?artist=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Search failed');
    }

    if (!data.artist) {
      grid.innerHTML = 'Artist not found. Try another search!';
      return;
    }

    displayArtist(data.artist);
    displayAlbums(data.albums);
  } catch (error) {
    console.error(error);
    grid.innerHTML = error.message || 'Something went wrong. Check the console for details.';
  } finally {
    loading.classList.add('hidden');
  }
}

document.getElementById('search-btn').addEventListener('click', searchArtist);
document.getElementById('search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  searchArtist();
});
