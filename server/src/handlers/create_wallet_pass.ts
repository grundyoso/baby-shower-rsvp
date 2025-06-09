
import { type WalletPassResponse, type DeviceType } from '../schema';

export interface WalletPassData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  response: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
}

export declare function createWalletPass(
  deviceType: DeviceType,
  guestData: WalletPassData
): Promise<WalletPassResponse>;
