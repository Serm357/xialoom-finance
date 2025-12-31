import { clsx, type ClassValue } from 'clsx';
// import { twMerge } from "tailwind-merge" // generic implementation if not using tailwind-merge

export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

export function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD', // Could be configurable
    }).format(amount);
}

export function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString();
}
