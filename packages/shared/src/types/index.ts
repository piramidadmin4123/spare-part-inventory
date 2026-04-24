// ── Enums ─────────────────────────────────────────────────────────────────
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'VIEWER';

export type ItemStatus =
  | 'IN_SERVICE'
  | 'BORROWED'
  | 'IN_STOCK'
  | 'MAINTENANCE'
  | 'LOST'
  | 'DECOMMISSIONED';

export type BorrowStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'CANCELLED';

export type OrderStatus = 'PENDING' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';

// ── API response wrapper ───────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
  issues?: Array<{ path: string; message: string }>;
}

// ── Entity types (mirrors Prisma models) ──────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  lineUserId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  user?: Pick<User, 'id' | 'name' | 'email' | 'role'> | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  createdAt: string;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface EquipmentType {
  id: string;
  code: string;
  name: string;
  category: string;
  icon?: string | null;
}

export interface Brand {
  id: string;
  name: string;
}

export interface SparePart {
  id: string;
  site: Site;
  equipmentType: EquipmentType;
  brand: Brand;
  materialCode?: string | null;
  modelCode: string;
  productName: string;
  serialNumber?: string | null;
  macAddress?: string | null;
  quantity: number;
  minStock: number;
  cost?: string | null;
  status: ItemStatus;
  location?: string | null;
  remark?: string | null;
  imageUrl?: string | null;
  currentBorrow?: BorrowTransaction | null;
  createdAt: string;
  updatedAt: string;
}

export interface BorrowTransaction {
  id: string;
  sparePart: Pick<
    SparePart,
    'id' | 'materialCode' | 'modelCode' | 'productName' | 'serialNumber' | 'imageUrl'
  > & {
    site: Pick<Site, 'id' | 'code' | 'name'>;
    equipmentType: Pick<EquipmentType, 'id' | 'code'>;
    brand: Pick<Brand, 'id' | 'name'>;
  };
  borrower: Pick<User, 'id' | 'name' | 'email' | 'role'>;
  approver?: Pick<User, 'id' | 'name'> | null;
  status: BorrowStatus;
  borrowerName?: string | null;
  borrowerEmail?: string | null;
  project?: string | null;
  dateStart?: string | null;
  dateEnd?: string | null;
  expectedReturn?: string | null;
  actualReturn?: string | null;
  borrowerRemark?: string | null;
  approverRemark?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdditionalOrder {
  id: string;
  site?: Site | null;
  brand?: Brand | null;
  type: string;
  modelCode?: string | null;
  productName: string;
  quantity: number;
  unitCost?: string | null;
  totalCost?: string | null;
  status: OrderStatus;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
}
