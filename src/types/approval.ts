
export type SpaceApprovalStatus = 'pending' | 'approved' | 'rejected';

export type SpaceWithProfile = {
  id: string;
  name: string;
  created_at: string;
  status: SpaceApprovalStatus;
  user_id: string;
  price: string;
  phone: string;
  description: string;
  address: string;
  state: string;
  number: string;
  zip_code: string;
  capacity: string;
  parking: boolean;
  wifi: boolean;
  sound_system: boolean;
  air_conditioning: boolean;
  kitchen: boolean;
  pool: boolean;
  latitude: number | null;
  longitude: number | null;
  rejection_reason: string | null;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email?: string | null;
  } | null;
  photo_count?: number;
};

export type SpacePhoto = {
  id: string;
  space_id: string;
  storage_path: string;
  created_at: string;
};
