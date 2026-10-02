import { CheckCircle2, ChefHat, Clock, PackageCheck, Truck, XCircle, Flame, Check } from 'lucide-react';

export const ORDER_STATUS = {
  placed: {
    key: 'placed',
    label: 'Order Confirmed',
    progress: 25,
    tone: 'bg-amber-50 text-amber-800 border-amber-200/80',
    dotColor: 'bg-amber-500',
    title: 'Order Confirmed & Queued',
    detail: 'Your order is recorded in the kitchen ledger. Dum preparation starting.',
    stepNumber: 1,
    icon: Clock,
  },
  preparing: {
    key: 'preparing',
    label: 'Dum Cooking',
    progress: 60,
    tone: 'bg-orange-50 text-[#ec6d13] border-orange-200/80',
    dotColor: 'bg-orange-500',
    title: 'Handi Sealed & Dum Steaming',
    detail: 'Authentic slow dum cooking with natural whole spices in clay handi.',
    stepNumber: 2,
    icon: ChefHat,
  },
  out_for_delivery: {
    key: 'out_for_delivery',
    label: 'Out for Delivery',
    progress: 85,
    tone: 'bg-blue-50 text-blue-800 border-blue-200/80',
    dotColor: 'bg-blue-500',
    title: 'Rider Out for Delivery',
    detail: 'Hot insulated bag on the way to your complex security entrance.',
    stepNumber: 3,
    icon: Truck,
  },
  delivered: {
    key: 'delivered',
    label: 'Delivered',
    progress: 100,
    tone: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    dotColor: 'bg-emerald-500',
    title: 'Delivered & Handed Over',
    detail: 'Order delivered to your gate. Thank you for feasting with us!',
    stepNumber: 4,
    icon: PackageCheck,
  },
  cancelled: {
    key: 'cancelled',
    label: 'Cancelled',
    progress: 100,
    tone: 'bg-rose-50 text-rose-800 border-rose-200/80',
    dotColor: 'bg-rose-500',
    title: 'Order Cancelled',
    detail: 'This order was cancelled. Contact kitchen support if this looks wrong.',
    stepNumber: 0,
    icon: XCircle,
  },
};

export const ORDER_STATUS_FLOW = [
  'placed',
  'preparing',
  'out_for_delivery',
  'delivered',
];

/**
 * Extracts order timestamp in milliseconds safely
 */
export const getOrderTimestamp = (order) => {
  const createdAt = order?.created_at || order?.createdAt;
  if (!createdAt) return Date.now();
  if (typeof createdAt?.toMillis === 'function') return createdAt.toMillis();
  if (typeof createdAt?.toDate === 'function') return createdAt.toDate().getTime();
  const d = new Date(createdAt);
  return !isNaN(d.getTime()) ? d.getTime() : Date.now();
};

/**
 * Computes realistic, time-aware order status
 * If an order was placed hours ago without a status update, it automatically transitions to Delivered
 */
export const getComputedOrderStatus = (order) => {
  const rawStatus = String(order?.status || '').toLowerCase().trim();
  const orderTimeMs = getOrderTimestamp(order);
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - orderTimeMs) / (1000 * 60)));
  const delayMinutes = Number(order?.delay_minutes || order?.extra_prep_time || 0);
  const delayReason = order?.delay_reason || null;
  const isDelayed = delayMinutes > 0;

  // If explicitly cancelled
  if (rawStatus === 'cancelled') {
    return {
      statusKey: 'cancelled',
      meta: ORDER_STATUS.cancelled,
      isOngoing: false,
      elapsedMinutes,
      delayMinutes,
      delayReason,
      isDelayed,
    };
  }

  // If explicitly marked delivered
  if (rawStatus === 'delivered') {
    return {
      statusKey: 'delivered',
      meta: ORDER_STATUS.delivered,
      isOngoing: false,
      elapsedMinutes,
      delayMinutes,
      delayReason,
      isDelayed,
    };
  }

  // Delivery timeout factoring in any admin peak delay
  const maxPrepDeliveryMinutes = 45 + delayMinutes;

  // If explicitly marked out for delivery
  if (rawStatus === 'out_for_delivery') {
    if (elapsedMinutes > maxPrepDeliveryMinutes + 20) {
      return {
        statusKey: 'delivered',
        meta: ORDER_STATUS.delivered,
        isOngoing: false,
        elapsedMinutes,
        delayMinutes,
        delayReason,
        isDelayed,
      };
    }
    return {
      statusKey: 'out_for_delivery',
      meta: ORDER_STATUS.out_for_delivery,
      isOngoing: true,
      elapsedMinutes,
      delayMinutes,
      delayReason,
      isDelayed,
      etaMinutes: Math.max(3, 10 + delayMinutes - Math.max(0, elapsedMinutes - 20)),
    };
  }

  // If explicitly marked preparing
  if (rawStatus === 'preparing') {
    if (elapsedMinutes > maxPrepDeliveryMinutes + 20) {
      return {
        statusKey: 'delivered',
        meta: ORDER_STATUS.delivered,
        isOngoing: false,
        elapsedMinutes,
        delayMinutes,
        delayReason,
        isDelayed,
      };
    }
    if (elapsedMinutes > (25 + delayMinutes)) {
      return {
        statusKey: 'out_for_delivery',
        meta: ORDER_STATUS.out_for_delivery,
        isOngoing: true,
        elapsedMinutes,
        delayMinutes,
        delayReason,
        isDelayed,
        etaMinutes: Math.max(5, (35 + delayMinutes) - elapsedMinutes),
      };
    }
    return {
      statusKey: 'preparing',
      meta: ORDER_STATUS.preparing,
      isOngoing: true,
      elapsedMinutes,
      delayMinutes,
      delayReason,
      isDelayed,
      etaMinutes: Math.max(8, (30 + delayMinutes) - elapsedMinutes),
    };
  }

  // Default flow for 'placed' or 'pending' or unspecified:
  if (elapsedMinutes > maxPrepDeliveryMinutes) {
    return {
      statusKey: 'delivered',
      meta: ORDER_STATUS.delivered,
      isOngoing: false,
      elapsedMinutes,
      delayMinutes,
      delayReason,
      isDelayed,
    };
  }

  if (elapsedMinutes > (22 + Math.floor(delayMinutes / 2))) {
    return {
      statusKey: 'out_for_delivery',
      meta: ORDER_STATUS.out_for_delivery,
      isOngoing: true,
      elapsedMinutes,
      delayMinutes,
      delayReason,
      isDelayed,
      etaMinutes: Math.max(5, (32 + delayMinutes) - elapsedMinutes),
    };
  }

  if (elapsedMinutes > 5) {
    return {
      statusKey: 'preparing',
      meta: ORDER_STATUS.preparing,
      isOngoing: true,
      elapsedMinutes,
      delayMinutes,
      delayReason,
      isDelayed,
      etaMinutes: Math.max(10, (30 + delayMinutes) - elapsedMinutes),
    };
  }

  // Brand new order (under 5 minutes)
  return {
    statusKey: 'placed',
    meta: ORDER_STATUS.placed,
    isOngoing: true,
    elapsedMinutes,
    delayMinutes,
    delayReason,
    isDelayed,
    etaMinutes: 30 + delayMinutes,
  };
};

export const normalizeOrderStatus = (status) => {
  const cleanStatus = String(status || 'placed').toLowerCase();
  return ORDER_STATUS[cleanStatus] ? cleanStatus : 'placed';
};

export const getOrderStatusMeta = (status) => ORDER_STATUS[normalizeOrderStatus(status)];

export const getOrderItems = (order) => {
  if (Array.isArray(order?.items)) return order.items;
  if (Array.isArray(order?.items?.cart)) return order.items.cart;
  return [];
};

export const getOrderCustomer = (order) => {
  const embedded = order?.items?.customer || {};
  return {
    name: order?.customer_name || embedded.name || 'Guest',
    phone: order?.customer_phone || order?.phone || embedded.phone || '',
    address: order?.address_line || order?.address || embedded.address || '',
  };
};

export const formatOrderId = (id) => `#${String(id || '').slice(-6).toUpperCase()}`;

export const formatOrderDate = (createdAt) => {
  if (!createdAt) return 'Recent Order';
  try {
    let d;
    if (typeof createdAt?.toDate === 'function') {
      d = createdAt.toDate();
    } else if (typeof createdAt?.toMillis === 'function') {
      d = new Date(createdAt.toMillis());
    } else {
      d = new Date(createdAt);
    }

    if (isNaN(d.getTime())) return 'Recent Order';

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    
    if (isToday) {
      return `Today, ${timeStr}`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${timeStr}`;
    }

    return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${timeStr}`;
  } catch {
    return 'Recent Order';
  }
};
