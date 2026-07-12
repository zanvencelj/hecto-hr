export interface VisitPublic {
  id: string;
  organizationId: string;
  deviceId: string | null;
  deviceName: string | null;
  name: string;
  purpose: string;
  signedInAt: string;
  signedOutAt: string | null;
  autoClosed: boolean;
}

/** Shown on the kiosk sign-out list — deliberately excludes purpose. */
export interface KioskOpenVisit {
  id: string;
  name: string;
  signedInAt: string;
}

export interface KioskDevicePublic {
  id: string;
  organizationId: string;
  name: string;
  pairedByUserId: string | null;
  lastSeenAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface KioskPairingCodeResponse {
  code: string;
  expiresAt: string;
}

export interface KioskPairResponse {
  deviceToken: string;
  device: {
    id: string;
    name: string;
    organizationName: string;
  };
}

export interface VisitSignatureUrlResponse {
  url: string;
}
