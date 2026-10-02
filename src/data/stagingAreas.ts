import { StagingAreaInfo, StagingLocation } from '../types';

export const STORAGE_KEY_STAGING_AREAS = 'fgw_master_staging_areas_v1';

export const DEFAULT_STAGING_AREAS: StagingAreaInfo[] = [
  {
    id: 'Lorong AB',
    name: 'Lorong AB',
    type: 'LORONG',
    description: 'Area staging buffer utama di antara jalur Rak A dan Rak B untuk persiapan muatan pallet.',
    photoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    capacityPallets: 12,
    updatedAt: '2026-09-24 08:00'
  },
  {
    id: 'Lorong CD',
    name: 'Lorong CD',
    type: 'LORONG',
    description: 'Area staging lorong Rak C dan D, area bersih untuk pallet barang jadi prioritas kirim.',
    photoUrl: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80',
    capacityPallets: 12,
    updatedAt: '2026-09-24 08:00'
  },
  {
    id: 'Lorong EF',
    name: 'Lorong EF',
    type: 'LORONG',
    description: 'Area staging tengah di antara Rak E dan Rak F dengan akses forklift ganda.',
    photoUrl: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=800&q=80',
    capacityPallets: 10,
    updatedAt: '2026-09-24 08:00'
  },
  {
    id: 'Lorong GH',
    name: 'Lorong GH',
    type: 'LORONG',
    description: 'Area staging lorong Rak G dan H, buffer transisi pallet dari proses produksi.',
    photoUrl: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=800&q=80',
    capacityPallets: 10,
    updatedAt: '2026-09-24 08:00'
  },
  {
    id: 'Lorong IJ',
    name: 'Lorong IJ',
    type: 'LORONG',
    description: 'Area staging lorong Rak I dan Rak J, berdekatan langsung dengan akses pintu loading dock.',
    photoUrl: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80',
    capacityPallets: 14,
    updatedAt: '2026-09-24 08:00'
  },
  {
    id: 'Loading 1',
    name: 'Loading 1',
    type: 'LOADING',
    description: 'Pintu muat dock ekspedisi Bay 1 (Armada Wingbox / Fuso SJA).',
    photoUrl: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
    capacityPallets: 18,
    updatedAt: '2026-09-24 08:00'
  },
  {
    id: 'Loading 2',
    name: 'Loading 2',
    type: 'LOADING',
    description: 'Pintu muat dock ekspedisi Bay 2 (Armada CDD / CDE Box Pendingin & Standar).',
    photoUrl: 'https://images.unsplash.com/photo-1586528116493-a029325540fa?auto=format&fit=crop&w=800&q=80',
    capacityPallets: 16,
    updatedAt: '2026-09-24 08:00'
  },
  {
    id: 'Loading 3',
    name: 'Loading 3',
    type: 'LOADING',
    description: 'Pintu muat dock ekspedisi Bay 3 (Armada Ekspedisi Kontainer & Inter-Depot).',
    photoUrl: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=800&q=80',
    capacityPallets: 16,
    updatedAt: '2026-09-24 08:00'
  }
];

export function getStoredStagingAreas(): StagingAreaInfo[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_STAGING_AREAS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load staging areas from storage', err);
  }
  return DEFAULT_STAGING_AREAS;
}

export function saveStoredStagingAreas(areas: StagingAreaInfo[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_STAGING_AREAS, JSON.stringify(areas));
  } catch (err) {
    console.warn('Failed to save staging areas to storage', err);
  }
}
