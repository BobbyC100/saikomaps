/**
 * Tier 3 - Address Card
 * Conditional: only renders if address exists
 */

import { Address } from '@/lib/types/merchant';

interface AddressCardProps {
  address: Address;
}

export function AddressCard({ address }: AddressCardProps) {
  // Guard: only render if address exists (parent should handle this)
  if (!address) {
    return null;
  }

  return (
    <div className="address-card">
      <h3 className="address-title">Address</h3>
      <address className="address-content">
        <div>{address.street}</div>
        <div>
          {address.city}, {address.state} {address.zip}
        </div>
        {address.country && address.country !== 'USA' && (
          <div>{address.country}</div>
        )}
      </address>
    </div>
  );
}
