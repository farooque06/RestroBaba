import { Prisma } from '@prisma/client';

type ComboSelection = {
    dealId: string;
    quantity: number;
    selections: Array<{ groupId: string; optionId: string }>;
};

export class ComboOrderError extends Error {}

export const resolveComboOrderItems = async (
    db: Prisma.TransactionClient,
    clientId: string,
    selections: ComboSelection[]
) => {
    if (selections.length === 0) return [];

    const now = new Date();
    const deals = await db.comboDeal.findMany({
        where: {
            id: { in: [...new Set(selections.map(selection => selection.dealId))] },
            clientId,
            isDeleted: false,
            isAvailable: true,
            AND: [
                { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }
            ]
        },
        include: {
            groups: {
                include: {
                    options: {
                        include: {
                            menuItem: {
                                select: { id: true, name: true, price: true, clientId: true, available: true, isDeleted: true }
                            }
                        }
                    }
                }
            }
        }
    });

    const dealsById = new Map(deals.map(deal => [deal.id, deal]));
    if (dealsById.size !== new Set(selections.map(selection => selection.dealId)).size) {
        throw new ComboOrderError('A combo deal is unavailable or does not belong to this restaurant');
    }

    const orderItems: Array<{
        menuItemId: string;
        quantity: number;
        price: number;
        comboDealName: string;
        comboGroupName: string;
    }> = [];

    for (const selection of selections) {
        const deal = dealsById.get(selection.dealId);
        if (!deal) throw new ComboOrderError('Combo deal not found');

        const choicesByGroup = new Map<string, string>();
        for (const choice of selection.selections) {
            if (choicesByGroup.has(choice.groupId)) {
                throw new ComboOrderError('Select only one option from each combo group');
            }
            choicesByGroup.set(choice.groupId, choice.optionId);
        }

        const selectedComponents: Array<{
            menuItemId: string;
            groupName: string;
            standardPrice: number;
            extraPrice: number;
        }> = [];

        for (const group of deal.groups) {
            const optionId = choicesByGroup.get(group.id);
            if (!optionId) {
                if (group.required) throw new ComboOrderError(`Choose an option for ${group.name}`);
                continue;
            }

            const option = group.options.find(candidate => candidate.id === optionId);
            if (!option) throw new ComboOrderError(`Invalid option selected for ${group.name}`);
            if (
                option.menuItem.clientId !== clientId ||
                option.menuItem.isDeleted ||
                !option.menuItem.available
            ) {
                throw new ComboOrderError(`${option.menuItem.name} is currently unavailable`);
            }

            selectedComponents.push({
                menuItemId: option.menuItem.id,
                groupName: group.name,
                standardPrice: option.menuItem.price,
                extraPrice: option.extraPrice
            });
            choicesByGroup.delete(group.id);
        }

        if (choicesByGroup.size > 0) throw new ComboOrderError('Combo selections contain an unknown choice group');
        if (selectedComponents.length === 0) throw new ComboOrderError('Select at least one combo item');

        const bundlePriceCents = Math.round(
            (deal.price + selectedComponents.reduce((sum, component) => sum + component.extraPrice, 0)) * 100
        );
        const rawWeights = selectedComponents.map(component => Math.max(component.standardPrice, 0));
        const useEqualWeights = rawWeights.every(weight => weight === 0);
        const weights = useEqualWeights ? rawWeights.map(() => 1) : rawWeights;
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let remainingCents = bundlePriceCents;

        selectedComponents.forEach((component, index) => {
            const allocatedCents = index === selectedComponents.length - 1
                ? remainingCents
                : Math.floor(bundlePriceCents * ((weights[index] || 1) / totalWeight));
            remainingCents -= allocatedCents;
            orderItems.push({
                menuItemId: component.menuItemId,
                quantity: selection.quantity,
                price: allocatedCents / 100,
                comboDealName: deal.name,
                comboGroupName: component.groupName
            });
        });
    }

    return orderItems;
};
