import { weddingConfig as fallback } from './config.js';

const apiVersion = (value) => {
  const version = String(value || 'v2025-02-19').trim();
  return version.startsWith('v') ? version : `v${version}`;
};

const imageUrl = (image) => {
  if (!image) return '';
  if (image.asset?.url) return image.asset.url;
  const ref = image.asset?._ref;
  if (!ref) return '';
  const match = ref.match(/^image-(.+)-([a-zA-Z0-9]+)$/);
  if (!match) return '';
  const [, id, extension] = match;
  return `https://cdn.sanity.io/images/${fallback.sanity.projectId}/${fallback.sanity.dataset}/${id}.${extension}`;
};

function plainText(blocks) {
  if (typeof blocks === 'string') return blocks;
  if (!Array.isArray(blocks)) return '';
  return blocks.map((block) => {
    if (block?._type === 'block' && Array.isArray(block.children)) {
      return block.children.map((child) => child.text || '').join('');
    }
    return '';
  }).filter(Boolean).join('\n\n');
}

export async function loadWeddingConfig() {
  if (!fallback.sanity?.enabled || !fallback.sanity.projectId || !fallback.sanity.dataset) {
    return fallback;
  }

  const query = `*[_type == "wedding" && !(_id in path("drafts.**"))] | order(_updatedAt desc)[0]{
    title, groom, bride, heroQuote, story, closing,
    "heroImageUrl": coalesce(heroImage.asset->url, heroImage.image.asset->url, heroImage.photo.asset->url, heroImageUrl),
    event,
    "galleryUrls": gallery[]{"src": coalesce(asset->url, image.asset->url, photo.asset->url, imageUrl), "alt": coalesce(alt, image.alt, photo.alt, caption, "Ảnh cưới"), "caption": coalesce(caption, "")},
    "music": music{
      ...,
      "fileUrl": file.asset->url
    },
    rsvpDeadline, rsvpEndpoint,
    banking { bankName, accountNumber, accountName, message, "qrCodeUrl": qrCode.asset->url }
  }`;

  const version = apiVersion(fallback.sanity.apiVersion);
  const url = `https://${fallback.sanity.projectId}.api.sanity.io/${version}/data/query/${fallback.sanity.dataset}?query=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Sanity HTTP ${response.status}: ${response.statusText}`);
    }

    const payload = await response.json();
    if (!payload.result) {
      console.warn('Sanity query returned no published wedding document; using local fallback.');
      return fallback;
    }

    return mergeSanity(fallback, payload.result);
  } catch (error) {
    console.error('Không tải được dữ liệu Sanity. Kiểm tra API version và CORS origins.', error);
    return fallback;
  }
}

function mergeSanity(base, remote) {
  const out = structuredClone(base);

  if (remote.groom) out.groom = { ...out.groom, ...remote.groom };
  if (remote.bride) out.bride = { ...out.bride, ...remote.bride };
  if (remote.event) out.event = { ...out.event, ...remote.event };

  if (remote.heroImageUrl) out.heroImage = remote.heroImageUrl;

  out.copy = {
    ...out.copy,
    heroQuote: remote.heroQuote || out.copy.heroQuote,
    story: plainText(remote.story) || out.copy.story,
    closing: remote.closing || out.copy.closing,
  };

  if (Array.isArray(remote.galleryUrls)) {
    const validGallery = remote.galleryUrls.filter((item) => item && typeof item.src === 'string' && item.src.trim());
    if (validGallery.length) out.gallery = validGallery;
  }

  if (remote.music && typeof remote.music === 'object') {
    out.music = { ...out.music, ...remote.music };
    // Prefer the Sanity-hosted file asset URL; keep music.url as a fallback.
    if (typeof out.music.fileUrl !== 'string' || !out.music.fileUrl.trim()) out.music.fileUrl = '';
    if (typeof out.music.url !== 'string' || !out.music.url.trim()) out.music.url = base.music.url;
  }
  if (remote.rsvpDeadline) out.rsvp.deadline = remote.rsvpDeadline;
  if (remote.rsvpEndpoint) out.rsvp.endpoint = remote.rsvpEndpoint;

  if (remote.banking) {
    out.banking = { ...out.banking, ...remote.banking };
  }

  return out;
}
