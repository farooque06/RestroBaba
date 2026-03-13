export type OrderStatus = 'Pending' | 'Cooking' | 'Ready' | 'Served' | 'Paid' | 'Cancelled';

export interface MenuItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    categoryId: string;
    image?: string;
    isAvailable: boolean;
}

export interface OrderItem {
    id: string;
    orderId: string;
    menuItemId: string;
    quantity: number;
    price: number;
    notes?: string;
    status: OrderStatus;
}

export interface Order {
    id: string;
    tableId?: string;
    customerId?: string;
    status: OrderStatus;
    totalAmount: number;
    items: OrderItem[];
    createdAt: string;
    updatedAt: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'CHEF' | 'WAITER' | 'SUPER_ADMIN';
    clientId: string;
}
