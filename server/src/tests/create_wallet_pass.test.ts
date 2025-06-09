
import { beforeEach, describe, expect, it } from 'bun:test';
import { createWalletPass, type WalletPassData } from '../handlers/create_wallet_pass';
import { type DeviceType } from '../schema';

// Test data for wallet pass creation
const testWalletPassData: WalletPassData = {
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '1234567890',
  response: 'Yes',
  eventDate: 'July 27, 2025',
  eventTime: '12:00 PM',
  eventLocation: 'Bunbury Miami, 55 NE 14th St., Miami, FL 33132'
};

describe('createWalletPass', () => {
  it('should create iPhone wallet pass with correct URL format', async () => {
    const deviceType: DeviceType = 'iPhone';
    const result = await createWalletPass(deviceType, testWalletPassData);

    expect(result.pass_id).toBeDefined();
    expect(result.pass_id).toMatch(/^pass_\d+_[a-z0-9]{9}$/);
    expect(result.pass_url).toMatch(/^https:\/\/api\.passninja\.com\/v1\/passes\/pass_\d+_[a-z0-9]{9}\/download\.pkpass$/);
    expect(result.qr_code_url).toMatch(/^https:\/\/api\.passninja\.com\/v1\/passes\/pass_\d+_[a-z0-9]{9}\/qr$/);
  });

  it('should create Android wallet pass with correct URL format', async () => {
    const deviceType: DeviceType = 'Android';
    const result = await createWalletPass(deviceType, testWalletPassData);

    expect(result.pass_id).toBeDefined();
    expect(result.pass_id).toMatch(/^pass_\d+_[a-z0-9]{9}$/);
    expect(result.pass_url).toMatch(/^https:\/\/pay\.google\.com\/gp\/v\/save\/pass_\d+_[a-z0-9]{9}$/);
    expect(result.qr_code_url).toMatch(/^https:\/\/api\.passninja\.com\/v1\/passes\/pass_\d+_[a-z0-9]{9}\/qr$/);
  });

  it('should create Other device wallet pass with web view URL', async () => {
    const deviceType: DeviceType = 'Other';
    const result = await createWalletPass(deviceType, testWalletPassData);

    expect(result.pass_id).toBeDefined();
    expect(result.pass_id).toMatch(/^pass_\d+_[a-z0-9]{9}$/);
    expect(result.pass_url).toMatch(/^https:\/\/api\.passninja\.com\/v1\/passes\/pass_\d+_[a-z0-9]{9}\/view$/);
    expect(result.qr_code_url).toMatch(/^https:\/\/api\.passninja\.com\/v1\/passes\/pass_\d+_[a-z0-9]{9}\/qr$/);
  });

  it('should generate unique pass IDs for multiple calls', async () => {
    const deviceType: DeviceType = 'iPhone';
    
    const result1 = await createWalletPass(deviceType, testWalletPassData);
    const result2 = await createWalletPass(deviceType, testWalletPassData);

    expect(result1.pass_id).not.toEqual(result2.pass_id);
    expect(result1.pass_url).not.toEqual(result2.pass_url);
    expect(result1.qr_code_url).not.toEqual(result2.qr_code_url);
  });

  it('should handle different guest responses correctly', async () => {
    const maybeGuestData: WalletPassData = {
      ...testWalletPassData,
      response: 'Maybe'
    };

    const result = await createWalletPass('iPhone', maybeGuestData);

    expect(result.pass_id).toBeDefined();
    expect(result.pass_url).toBeDefined();
    expect(result.qr_code_url).toBeDefined();
  });

  it('should return all required fields in response', async () => {
    const result = await createWalletPass('Android', testWalletPassData);

    expect(result).toHaveProperty('pass_id');
    expect(result).toHaveProperty('pass_url');
    expect(result).toHaveProperty('qr_code_url');
    
    expect(typeof result.pass_id).toBe('string');
    expect(typeof result.pass_url).toBe('string');
    expect(typeof result.qr_code_url).toBe('string');
  });
});
