//product photo service — server-side Pexels proxy
const PEXELS_ENDPOINT = 'https://api.pexels.com/v1/search';

class ProductPhotoService {
  static async searchPhoto(query) {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
      // No key configured server-side — return null rather than
      // throwing, so the frontend's existing "no image, show the icon
      // placeholder" fallback keeps working exactly as before.
      return null;
    }
    if (!query || !query.trim()) {
      const err = new Error('query is required');
      err.status = 400;
      throw err;
    }

    const response = await fetch(`${PEXELS_ENDPOINT}?query=${encodeURIComponent(query)}&per_page=1`, {
      headers: { Authorization: apiKey },
    });

    if (!response.ok) {
      const err = new Error(`Pexels request failed: ${response.status}`);
      err.status = 502;
      throw err;
    }

    const data = await response.json();
    return data.photos?.[0]?.src?.medium ?? null;
  }
}

module.exports = ProductPhotoService;