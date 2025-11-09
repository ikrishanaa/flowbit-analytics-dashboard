"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prisma = new client_1.PrismaClient();
function parseDate(input) {
    if (!input)
        return null;
    if (typeof input === 'string' && input)
        return new Date(input);
    if (typeof input === 'object' && input.$date)
        return new Date(input.$date);
    return null;
}
function num(input) {
    if (input === null || input === undefined || input === '')
        return null;
    if (typeof input === 'number')
        return input;
    const s = String(input).replace(/,/g, '');
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}
async function main() {
    const datasetPath = process.env.SEED_DATA_PATH || path_1.default.resolve(__dirname, '../../../data/Analytics_Test_Data.json');
    if (!fs_1.default.existsSync(datasetPath)) {
        throw new Error(`Dataset not found at ${datasetPath}`);
    }
    const raw = fs_1.default.readFileSync(datasetPath, 'utf8');
    const docs = JSON.parse(raw);
    console.log(`Seeding from ${datasetPath}. Records: ${docs.length}`);
    for (const doc of docs) {
        const id = doc._id;
        const createdAt = parseDate(doc.createdAt);
        const updatedAt = parseDate(doc.updatedAt);
        const processedAt = parseDate(doc.processedAt);
        const llmData = doc?.extractedData?.llmData || {};
        const invoiceVal = llmData?.invoice?.value || {};
        const vendorVal = llmData?.vendor?.value || {};
        const customerVal = llmData?.customer?.value || {};
        const paymentVal = llmData?.payment?.value || {};
        const summaryVal = llmData?.summary?.value || {};
        const itemsVal = llmData?.lineItems?.value?.items?.value || [];
        // Upsert Document
        await prisma.document.upsert({
            where: { id },
            update: {
                name: doc.name,
                filePath: doc.filePath,
                fileType: doc.fileType,
                fileSize: doc.fileSize?.$numberLong ? BigInt(doc.fileSize.$numberLong) : null,
                status: doc.status,
                organizationId: doc.organizationId,
                departmentId: doc.departmentId,
                createdAt,
                updatedAt,
                processedAt,
                isValidatedByHuman: !!doc.isValidatedByHuman,
                savedAt: parseDate(doc?.extractedData?.savedAt),
                savedBy: doc?.extractedData?.savedBy,
                lastValidatedAt: parseDate(doc?.extractedData?.lastValidatedAt),
                validatedBy: doc?.extractedData?.validatedBy,
                analyticsId: doc.analyticsId,
                metadataJson: doc.metadata || client_1.Prisma.JsonNull,
                llmRawJson: llmData || client_1.Prisma.JsonNull,
            },
            create: {
                id,
                name: doc.name,
                filePath: doc.filePath,
                fileType: doc.fileType,
                fileSize: doc.fileSize?.$numberLong ? BigInt(doc.fileSize.$numberLong) : null,
                status: doc.status,
                organizationId: doc.organizationId,
                departmentId: doc.departmentId,
                createdAt,
                updatedAt,
                processedAt,
                isValidatedByHuman: !!doc.isValidatedByHuman,
                savedAt: parseDate(doc?.extractedData?.savedAt),
                savedBy: doc?.extractedData?.savedBy,
                lastValidatedAt: parseDate(doc?.extractedData?.lastValidatedAt),
                validatedBy: doc?.extractedData?.validatedBy,
                analyticsId: doc.analyticsId,
                metadataJson: doc.metadata || client_1.Prisma.JsonNull,
                llmRawJson: llmData || client_1.Prisma.JsonNull,
            },
        });
        // Vendor
        const vendorName = vendorVal?.vendorName?.value?.toString().trim();
        const vendorTaxId = vendorVal?.vendorTaxId?.value?.toString().trim() || null;
        const vendorAddress = vendorVal?.vendorAddress?.value?.toString().trim() || null;
        let vendorId = null;
        if (vendorName) {
            let vendor;
            if (vendorTaxId) {
                vendor = await prisma.vendor.upsert({
                    where: { name_taxId: { name: vendorName, taxId: vendorTaxId } },
                    update: { address: vendorAddress ?? undefined },
                    create: { name: vendorName, taxId: vendorTaxId, address: vendorAddress },
                });
            }
            else {
                const found = await prisma.vendor.findFirst({ where: { name: vendorName } });
                if (found) {
                    vendor = await prisma.vendor.update({ where: { id: found.id }, data: { address: vendorAddress ?? undefined } });
                }
                else {
                    vendor = await prisma.vendor.create({ data: { name: vendorName, address: vendorAddress } });
                }
            }
            vendorId = vendor.id;
        }
        // Customer
        const customerName = customerVal?.customerName?.value?.toString().trim();
        const customerAddress = customerVal?.customerAddress?.value?.toString().trim() || null;
        let customerId = null;
        if (customerName) {
            const customer = await prisma.customer.upsert({
                where: { name: customerName },
                update: { address: customerAddress ?? undefined },
                create: { name: customerName, address: customerAddress },
            });
            customerId = customer.id;
        }
        // Summary
        const subTotal = num(summaryVal?.subTotal?.value);
        const totalTax = num(summaryVal?.totalTax?.value);
        const invoiceTotal = num(summaryVal?.invoiceTotal?.value);
        const currencySymbol = summaryVal?.currencySymbol?.value?.toString().trim() || null;
        // Invoice
        const invoiceNumber = invoiceVal?.invoiceId?.value?.toString().trim() || null;
        const invoiceDate = parseDate(invoiceVal?.invoiceDate?.value);
        const deliveryDate = parseDate(invoiceVal?.deliveryDate?.value);
        const dueDate = parseDate(paymentVal?.dueDate?.value);
        const paymentTerms = paymentVal?.paymentTerms?.value?.toString().trim() || null;
        const bankAccountNumber = paymentVal?.bankAccountNumber?.value?.toString().trim() || null;
        const bic = paymentVal?.BIC?.value?.toString().trim() || null;
        const accountName = paymentVal?.accountName?.value?.toString().trim() || null;
        const netDays = num(paymentVal?.netDays?.value);
        const discountPercentage = num(paymentVal?.discountPercentage?.value);
        const discountDays = num(paymentVal?.discountDays?.value);
        const discountDueDate = parseDate(paymentVal?.discountDueDate?.value);
        const discountedTotal = num(paymentVal?.discountedTotal?.value);
        const invoice = await prisma.invoice.upsert({
            where: { documentId: id },
            update: {
                invoiceNumber,
                invoiceDate: invoiceDate ?? undefined,
                deliveryDate: deliveryDate ?? undefined,
                vendorId: vendorId ?? undefined,
                customerId: customerId ?? undefined,
                subTotal: subTotal,
                totalTax: totalTax,
                totalAmount: invoiceTotal,
                currencySymbol,
                status: doc?.validatedData?.status || doc?.status || null,
                dueDate: dueDate ?? undefined,
                paymentTerms,
                bankAccountNumber,
                bic,
                accountName,
                netDays: netDays ?? undefined,
                discountPercentage: discountPercentage ?? undefined,
                discountDays: discountDays ?? undefined,
                discountDueDate: discountDueDate ?? undefined,
                discountedTotal: discountedTotal ?? undefined,
            },
            create: {
                documentId: id,
                invoiceNumber,
                invoiceDate: invoiceDate ?? undefined,
                deliveryDate: deliveryDate ?? undefined,
                vendorId: vendorId ?? undefined,
                customerId: customerId ?? undefined,
                subTotal: subTotal,
                totalTax: totalTax,
                totalAmount: invoiceTotal,
                currencySymbol,
                status: doc?.validatedData?.status || doc?.status || null,
                dueDate: dueDate ?? undefined,
                paymentTerms,
                bankAccountNumber,
                bic,
                accountName,
                netDays: netDays ?? undefined,
                discountPercentage: discountPercentage ?? undefined,
                discountDays: discountDays ?? undefined,
                discountDueDate: discountDueDate ?? undefined,
                discountedTotal: discountedTotal ?? undefined,
            },
        });
        const liData = [];
        for (const item of itemsVal) {
            const srNo = num(item?.srNo?.value);
            const description = item?.description?.value?.toString() || null;
            const quantity = num(item?.quantity?.value);
            const unitPrice = num(item?.unitPrice?.value);
            const totalPrice = num(item?.totalPrice?.value);
            const sachkonto = item?.Sachkonto?.value?.toString() || null;
            const bu = item?.BUSchluessel?.value?.toString() || null;
            const category = sachkonto || null;
            liData.push({
                invoiceId: invoice.id,
                srNo: srNo ?? undefined,
                description: description ?? undefined,
                quantity: quantity ?? undefined,
                unitPrice: unitPrice ?? undefined,
                totalPrice: totalPrice ?? undefined,
                sachkonto: sachkonto ?? undefined,
                buSchluessel: bu ?? undefined,
                category: category ?? undefined,
            });
        }
        if (liData.length) {
            // Clear previous and insert new to keep in sync with document
            await prisma.lineItem.deleteMany({ where: { invoiceId: invoice.id } });
            await prisma.lineItem.createMany({ data: liData });
        }
    }
    console.log('Seeding completed.');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
