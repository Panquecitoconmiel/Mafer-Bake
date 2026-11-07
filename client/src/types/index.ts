export type Role = "CUSTOMER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  emailVerified: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
}

export interface OptionValue {
  id: string;
  label: string;
  priceDeltaCents: number;
}

export interface ProductOption {
  id: string;
  name: string;
  type: "SINGLE" | "MULTIPLE" | "TEXT";
  isRequired: boolean;
  maxLength: number | null;
  values: OptionValue[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  priceCents: number;
  salePriceCents: number | null;
  effectivePriceCents: number;
  category: { id: string; name: string; slug: string };
  isFeatured: boolean;
  inventoryMode: "TRACKED" | "MADE_TO_ORDER";
  inStock: boolean;
  lowStock: boolean;
  maxQuantity: number;
  prepTimeHours: number;
  images: { url: string; alt: string }[];
  variants: { id: string; name: string; priceDeltaCents: number }[];
  options: ProductOption[];
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type Selections = Record<string, string | string[]>;

export interface Customization {
  optionName: string;
  value: string;
  priceDeltaCents: number;
}

export interface CartItem {
  id: string;
  productId: string;
  product: { id: string; name: string; slug: string; image: string | null; inventoryMode: string; prepTimeHours: number };
  variantId: string | null;
  variantName: string | null;
  customizations: Customization[];
  quantity: number;
  maxQuantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  issue: string | null;
}

export interface Cart {
  id: string | null;
  itemCount: number;
  subtotalCents: number;
  hasIssues: boolean;
  items: CartItem[];
}

export interface StoreSettings {
  storeName: string;
  slogan: string;
  contactEmail: string | null;
  contactPhone: string | null;
  whatsapp: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  pickupAddress: string | null;
  businessHours: string | null;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFeeCents: number | null;
  freeDeliveryMinCents: number | null;
  deliveryCoverage: string | null;
  minLeadHours: number;
  maxAdvanceDays: number;
  closedWeekdays: number[];
  pricesIncludeTax: boolean;
  cancellationPolicy: string | null;
  paymentsEnabled: boolean;
  currency: string;
}

export interface Address {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  street: string;
  extNumber: string;
  intNumber: string | null;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  references: string | null;
  isDefault: boolean;
}

export type OrderStatus = "PENDING_PAYMENT" | "CONFIRMED" | "IN_PREPARATION" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "PARTIALLY_REFUNDED" | "REFUNDED";

export interface OrderItem {
  id: string;
  productId: string | null;
  productName: string;
  variantName: string | null;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  customizations: Customization[];
}

export interface Order {
  id: string;
  number: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryMethod: "PICKUP" | "DELIVERY";
  address: Omit<Address, "id" | "isDefault"> | null;
  requestedDate: string;
  requestedSlot: string;
  confirmedDate: string | null;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  couponCode: string | null;
  customerNotes: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  items?: OrderItem[];
  payments?: { id: string; status: PaymentStatus; amountCents: number; refundedCents: number; createdAt: string }[];
}

export interface Quote {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  couponCode: string | null;
  couponError: string | null;
  pricesIncludeTax: boolean;
  leadHours: number;
  hasIssues: boolean;
  itemCount: number;
}

export interface SlotAvailability {
  date: string;
  closedReason: string | null;
  leadHours: number;
  slots: { id: string; label: string; remaining: number; available: boolean; reason: string | null }[];
}
