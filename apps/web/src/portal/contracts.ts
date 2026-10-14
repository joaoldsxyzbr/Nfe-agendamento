export type SupplierResolution = Readonly<{
  supplierId: string | null;
}>;

export type PortalOperationState =
  | 'waiting_for_user'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type PortalOperationStatus = Readonly<{
  operationId: string;
  state: PortalOperationState;
  message: string | null;
  xml: string | null;
  /** Stable extension error code, if provided. Never contains invoice data. */
  code?: string | null;
}>;
