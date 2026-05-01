/** Shared avatar + demo orders for profile UI (name/email come from /auth/me). */
export const DEFAULT_PROFILE_AVATAR =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=256&q=80";

export const MOCK_PROFILE_EXTRA = {
  phone: "+1 (555) 0123-4567",
  address: "123 Innovation Drive, Silicon Valley, CA",
  memberSinceLabel: "Premium Member since Jan 2023",
  loyaltyPoints: "12,450",
};

export const MOCK_RECENT_ORDERS = [
  {
    id: "SKU-29381",
    title: "Smart Runner X1 Pro",
    dateLabel: "Oct 12, 2023",
    price: 189.0,
    status: "delivered",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "SKU-99021",
    title: "Acoustic Elite Headphones",
    dateLabel: "Oct 08, 2023",
    price: 249.5,
    status: "transit",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=200&q=80",
  },
];
