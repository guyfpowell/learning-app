import api from '@/lib/api';
import type { AltitudeResponse } from '@learning/shared';

export const altitudeService = {
  async getAltitude(): Promise<AltitudeResponse> {
    const { data } = await api.get<AltitudeResponse>('/users/altitude');
    return data;
  },
};
