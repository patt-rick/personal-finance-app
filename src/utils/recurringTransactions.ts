import { RecurringTransaction, Transaction, RecurrenceFrequency } from "../types";

interface ProcessResult {
    newTransactions: Transaction[];
    updatedRecurring: RecurringTransaction[];
}

function advanceDate(date: Date, frequency: RecurrenceFrequency): Date {
    const next = new Date(date);
    switch (frequency) {
        case "daily":
            next.setDate(next.getDate() + 1);
            break;
        case "weekly":
            next.setDate(next.getDate() + 7);
            break;
        case "biweekly":
            next.setDate(next.getDate() + 14);
            break;
        case "monthly":
            next.setMonth(next.getMonth() + 1);
            break;
        case "yearly":
            next.setFullYear(next.getFullYear() + 1);
            break;
    }
    return next;
}

export function processRecurringTransactions(
    recurring: RecurringTransaction[],
    currentDate: Date = new Date()
): ProcessResult {
    const newTransactions: Transaction[] = [];
    const updatedRecurring: RecurringTransaction[] = [];

    const currentDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

    for (const rule of recurring) {
        const updated = { ...rule };

        if (!updated.isActive) {
            updatedRecurring.push(updated);
            continue;
        }

        let dueDate = new Date(updated.nextDueDate);
        let generated = 0;
        const MAX_GENERATED = 365;

        while (dueDate <= currentDay && generated < MAX_GENERATED) {
            if (updated.endDate && dueDate > new Date(updated.endDate)) {
                updated.isActive = false;
                break;
            }

            const tx: Transaction = {
                id: `${updated.id}_${dueDate.toISOString().split("T")[0]}_${Date.now()}_${generated}`,
                description: updated.description,
                amount: updated.amount,
                date: dueDate.toISOString().split("T")[0],
                type: updated.type,
                businessId: updated.businessId,
                category: updated.category,
                remark: updated.remark,
            };

            newTransactions.push(tx);
            updated.lastGeneratedDate = dueDate.toISOString().split("T")[0];
            generated++;

            dueDate = advanceDate(dueDate, updated.frequency);
        }

        updated.nextDueDate = dueDate.toISOString().split("T")[0];

        if (updated.endDate && dueDate > new Date(updated.endDate)) {
            updated.isActive = false;
        }

        updatedRecurring.push(updated);
    }

    return { newTransactions, updatedRecurring };
}
