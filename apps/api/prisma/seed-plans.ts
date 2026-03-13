import { prisma } from '../src/services/prisma.js';

async function main() {
  console.log('🌱 Seeding subscription plans...');

  const plans = [
    {
      tier: 'SILVER',
      name: 'Silver Starter',
      monthlyPrice: 999,
      quarterlyPrice: 2499,
      yearlyPrice: 7999,
      offerMonthly: 499,
      discountLabel: 'Save 33%',
      offerTag: 'Limited Time',
      maxStaff: 2,
      maxTables: 10,
      hasKDS: false,
      hasInventory: true,
      hasAdvancedInv: false,
      hasAnalytics: false,
      hasMultiUnit: false,
      features: ['Basic POS', 'Order Management', 'Digital Menu', 'Standard Support']
    },
    {
      tier: 'GOLD',
      name: 'Gold Standard',
      monthlyPrice: 1999,
      quarterlyPrice: 4999,
      yearlyPrice: 15999,
      offerMonthly: 999,
      discountLabel: 'Save 33%',
      offerTag: 'Best Value',
      maxStaff: 10,
      maxTables: 50,
      hasKDS: true,
      hasInventory: true,
      hasAdvancedInv: true,
      hasAnalytics: true,
      hasMultiUnit: false,
      features: ['Advanced POS', 'Kitchen Display System', 'Inventory Alerts', 'Sales Analytics', 'Priority Support']
    },
    {
      tier: 'DIAMOND',
      name: 'Diamond Pro',
      monthlyPrice: 3999,
      quarterlyPrice: 9999,
      yearlyPrice: 31999,
      offerMonthly: 1999,
      discountLabel: 'Save 33%',
      offerTag: 'Pro Choice',
      maxStaff: 999,
      maxTables: 999,
      hasKDS: true,
      hasInventory: true,
      hasAdvancedInv: true,
      hasAnalytics: true,
      hasMultiUnit: true,
      features: ['Full Suite POS', 'Multi-Unit Support', 'Advanced Recipe Mgmt', 'AI Profit Insights', '24/7 Dedicated Support']
    }
  ];

  for (const planData of plans) {
    const existing = await prisma.subscriptionPlan.findFirst({
      where: { tier: planData.tier }
    });

    if (existing) {
      console.log(`Updating ${planData.name}...`);
      await prisma.subscriptionPlan.update({
        where: { id: existing.id },
        data: planData
      });
    } else {
      console.log(`Creating ${planData.name}...`);
      await prisma.subscriptionPlan.create({
        data: planData
      });
    }
  }

  console.log('✅ Subscription plans seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
