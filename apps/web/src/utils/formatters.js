/**
 * Formats a number as a currency string.
 * Currently set to Nepali Rupees (Rs.)
 */
export const formatCurrency = (amount) => {
    return `Rs. ${Number(amount || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
};

export const formatNumber = (num) => {
    return Number(num || 0).toLocaleString('en-IN');
};
