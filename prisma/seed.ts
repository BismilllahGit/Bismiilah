import {
  PrismaClient,
  UserRole,
  ProjectStatus,
  TaskStatus,
  PaymentCycle,
  ItemType,
  ItemGrade,
  TransactionType,
  ContactType,
  VendorTransactionType,
  InvoiceStatus,
  ExtraWorkStatus,
  BOQStatus,
  BOQLineType,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Simple sequential voucher generator
let voucherCount = 1000;
const generateVoucher = (prefix: string) => {
  voucherCount++;
  return `${prefix}-${voucherCount}`;
};

async function main() {
  console.log("🌱 Starting clean, realistic database seeding...");

  // ==========================================
  // 1. ADMIN USER & BUSINESS PROFILE
  // ==========================================
  const password = await bcrypt.hash("redacted", 10);

  await prisma.user.upsert({
    where: { email: "redacted@gmail.com" },
    update: { password, role: "ADMIN" },
    create: { email: "redacted@gmail.com", password, role: "ADMIN" },
  });

  await prisma.businessProfile.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      companyName: "Bismillah Construction",
      tagline: "Quality Building Solutions",
      address: "Kochi, Kerala",
      phone: "+91 98765 43210",
      email: "redacted@gmail.com",
      gstNumber: "32ABCDE1234F1Z5",
      defaultTerms:
        "1. Payment within 15 days of invoice.\n2. Materials remain property of the company until fully paid.",
    },
  });

  const sequences = [
    "VENDOR_PUR",
    "VENDOR_PAY",
    "CLIENT_PAY",
    "INV_TXN",
    "EXPENSE",
    "EXTRA_WORK",
    "LABOUR_PAY",
    "DL_ENTRY",
  ];
  for (const seq of sequences) {
    await prisma.voucherSequence.upsert({
      where: { id: seq },
      update: {},
      create: { id: seq, nextVal: 1000 },
    });
  }

  // ==========================================
  // 2. MASTER DATA
  // ==========================================

  // BOQ Groups
  const groups = {
    civil: await prisma.bOQGroup.upsert({
      where: { name: "Civil Works" },
      update: {},
      create: { name: "Civil Works", sortOrder: 1 },
    }),
    electrical: await prisma.bOQGroup.upsert({
      where: { name: "Electrical Works" },
      update: {},
      create: { name: "Electrical Works", sortOrder: 2 },
    }),
    plumbing: await prisma.bOQGroup.upsert({
      where: { name: "Plumbing Works" },
      update: {},
      create: { name: "Plumbing Works", sortOrder: 3 },
    }),
    finishing: await prisma.bOQGroup.upsert({
      where: { name: "Finishing Works" },
      update: {},
      create: { name: "Finishing Works", sortOrder: 4 },
    }),
  };

  // Comprehensive Worker Types
  const workerTypeDefinitions = [
    { name: "Mason", defaultRate: 1100, paymentCycle: PaymentCycle.WEEKLY },
    { name: "Carpenter", defaultRate: 1200, paymentCycle: PaymentCycle.WEEKLY },
    {
      name: "Cupboard Carpenter",
      defaultRate: 1300,
      paymentCycle: PaymentCycle.WEEKLY,
    },
    { name: "Painter", defaultRate: 1000, paymentCycle: PaymentCycle.WEEKLY },
    {
      name: "Electrician",
      defaultRate: 1300,
      paymentCycle: PaymentCycle.DAILY,
    },
    {
      name: "Tiles Mason",
      defaultRate: 1200,
      paymentCycle: PaymentCycle.WEEKLY,
    },
    {
      name: "Bar Bender / Steel Fixer",
      defaultRate: 1100,
      paymentCycle: PaymentCycle.WEEKLY,
    },
    {
      name: "Centering / Shuttering Workers",
      defaultRate: 1100,
      paymentCycle: PaymentCycle.WEEKLY,
    },
    {
      name: "Glass Worker",
      defaultRate: 1200,
      paymentCycle: PaymentCycle.WEEKLY,
    },
    { name: "SS Worker", defaultRate: 1200, paymentCycle: PaymentCycle.WEEKLY },
    {
      name: "Chipping Worker",
      defaultRate: 900,
      paymentCycle: PaymentCycle.WEEKLY,
    },
    { name: "Plumber", defaultRate: 1200, paymentCycle: PaymentCycle.DAILY },
    { name: "Welder", defaultRate: 1200, paymentCycle: PaymentCycle.WEEKLY },
    {
      name: "Aluminium / UPVC Door & Window Installer",
      defaultRate: 1200,
      paymentCycle: PaymentCycle.WEEKLY,
    },
    {
      name: "CNC / ACP Cladding Worker",
      defaultRate: 1300,
      paymentCycle: PaymentCycle.WEEKLY,
    },
    {
      name: "POP / Gypsum Ceiling Worker",
      defaultRate: 1200,
      paymentCycle: PaymentCycle.WEEKLY,
    },
    {
      name: "Granite / Marble Worker",
      defaultRate: 1300,
      paymentCycle: PaymentCycle.WEEKLY,
    },
    {
      name: "Excavation Workers",
      defaultRate: 900,
      paymentCycle: PaymentCycle.DAILY,
    },
    { name: "Helpers", defaultRate: 800, paymentCycle: PaymentCycle.WEEKLY },
    {
      name: "Scaffolding Workers",
      defaultRate: 1000,
      paymentCycle: PaymentCycle.WEEKLY,
    },
    {
      name: "Roofing Workers",
      defaultRate: 1100,
      paymentCycle: PaymentCycle.WEEKLY,
    },
    {
      name: "Paver Block Workers",
      defaultRate: 1000,
      paymentCycle: PaymentCycle.WEEKLY,
    },
    {
      name: "Hydraulic / Earthmoving Machine Operators",
      defaultRate: 1500,
      paymentCycle: PaymentCycle.DAILY,
    },
    {
      name: "Housekeeping Staff",
      defaultRate: 700,
      paymentCycle: PaymentCycle.WEEKLY,
    },
  ];

  const workers: Record<string, any> = {};
  for (const wt of workerTypeDefinitions) {
    workers[wt.name] = await prisma.workerType.upsert({
      where: { name: wt.name },
      update: {},
      create: {
        name: wt.name,
        defaultRate: wt.defaultRate,
        paymentCycle: wt.paymentCycle,
      },
    });
  }

  // Items
  const items = {
    cement: await prisma.item.create({
      data: {
        name: "UltraTech Cement OPC 53",
        type: ItemType.CEMENT,
        grade: ItemGrade.GRADE_A,
        unit: "bag",
        unitCost: 420,
      },
    }),
    steel: await prisma.item.create({
      data: {
        name: "Tata Tiscon Fe500D 10mm",
        type: ItemType.MATERIAL,
        grade: ItemGrade.GRADE_A,
        unit: "kg",
        unitCost: 75,
      },
    }),
    sand: await prisma.item.create({
      data: {
        name: "M-Sand",
        type: ItemType.MATERIAL,
        unit: "cft",
        unitCost: 65,
      },
    }),
    paint: await prisma.item.create({
      data: {
        name: "Asian Paints Apex",
        type: ItemType.PAINT,
        grade: ItemGrade.GRADE_A,
        unit: "litre",
        unitCost: 320,
      },
    }),
  };

  // Contacts
  const client = await prisma.client.create({
    data: {
      name: "Mohammed Tariq",
      phone: "+91 99988 87776",
      address: "Calicut",
    },
  });
  const vendor = await prisma.contact.create({
    data: {
      name: "Malabar Steel & Cements",
      type: ContactType.VENDOR,
      phone: "+91 88877 76665",
    },
  });
  const contractor = await prisma.contact.create({
    data: {
      name: "Raju Labour Contractors",
      type: ContactType.LABOUR_CONTRACTOR,
      phone: "+91 77766 65554",
    },
  });

  // BOQ Template
  const template = await prisma.bOQTemplate.create({
    data: { name: "Premium Residential Villa", category: "Residential" },
  });
  const templateSec = await prisma.bOQTemplateSection.create({
    data: {
      templateId: template.id,
      name: "Foundation",
      groupId: groups.civil.id,
    },
  });
  await prisma.bOQTemplateLineItem.createMany({
    data: [
      {
        sectionId: templateSec.id,
        title: "Earthwork Excavation",
        sortOrder: 1,
      },
      { sectionId: templateSec.id, title: "PCC 1:4:8", sortOrder: 2 },
    ],
  });

  // ==========================================
  // 3. DETAILED PROJECT: SEAVIEW VILLA
  // ==========================================
  const projectDate = new Date();
  projectDate.setMonth(projectDate.getMonth() - 2); // Started 2 months ago

  const project = await prisma.project.create({
    data: {
      name: "Seaview Villa Construction",
      location: "Kozhikode, Kerala",
      status: ProjectStatus.ACTIVE,
      startDate: projectDate,
      agreedValue: 12500000.0, // 1.25 Cr
      notes:
        "G+1 Premium Residential Villa with specialized EV charging infrastructure.",
    },
  });

  // Tasks
  await prisma.projectTask.createMany({
    data: [
      {
        projectId: project.id,
        title: "Site Clearing & Survey",
        targetDate: projectDate,
        status: TaskStatus.COMPLETED,
        completedAt: projectDate,
      },
      {
        projectId: project.id,
        title: "Foundation Concrete",
        targetDate: new Date(projectDate.getTime() + 15 * 86400000),
        status: TaskStatus.COMPLETED,
        completedAt: new Date(projectDate.getTime() + 15 * 86400000),
      },
      {
        projectId: project.id,
        title: "Ground Floor Blockwork",
        targetDate: new Date(),
        status: TaskStatus.IN_PROGRESS,
      },
      {
        projectId: project.id,
        title: "First Floor Roof Slab",
        targetDate: new Date(Date.now() + 30 * 86400000),
        status: TaskStatus.PENDING,
      },
    ],
  });

  // ==========================================
  // 4. BILL OF QUANTITIES (BOQ)
  // ==========================================
  const boq = await prisma.bOQ.create({
    data: {
      projectId: project.id,
      versionNumber: 1,
      status: BOQStatus.ACTIVE,
      targetBudget: 11000000.0,
      approvedAt: projectDate,
    },
  });

  await prisma.bOQPaymentMilestone.createMany({
    data: [
      {
        boqId: boq.id,
        stageName: "Mobilization Advance",
        percentage: 10,
        amount: 1250000,
        sortOrder: 1,
      },
      {
        boqId: boq.id,
        stageName: "Foundation Completion",
        percentage: 20,
        amount: 2500000,
        sortOrder: 2,
      },
      {
        boqId: boq.id,
        stageName: "Ground Floor Roof Slab",
        percentage: 25,
        amount: 3125000,
        sortOrder: 3,
      },
    ],
  });

  const civilSec = await prisma.bOQSection.create({
    data: {
      boqId: boq.id,
      groupId: groups.civil.id,
      name: "Substructure",
      sortOrder: 1,
    },
  });

  await prisma.bOQLineItem.createMany({
    data: [
      {
        sectionId: civilSec.id,
        itemNo: "1.1",
        title: "Earthwork Excavation",
        lineType: BOQLineType.CALCULATED,
        quantity: 150,
        unit: "cum",
        rate: 450,
        amount: 67500,
        executedQuantity: 150,
        executedAmount: 67500,
        sortOrder: 1,
      },
      {
        sectionId: civilSec.id,
        itemNo: "1.2",
        title: "PCC 1:4:8 Base",
        lineType: BOQLineType.CALCULATED,
        quantity: 40,
        unit: "cum",
        rate: 4800,
        amount: 192000,
        executedQuantity: 40,
        executedAmount: 192000,
        itemId: items.cement.id,
        sortOrder: 2,
      },
      {
        sectionId: civilSec.id,
        itemNo: "1.3",
        title: "Laterite Stone Masonry",
        lineType: BOQLineType.CALCULATED,
        quantity: 120,
        unit: "cum",
        rate: 3500,
        amount: 420000,
        executedQuantity: 60,
        executedAmount: 210000,
        sortOrder: 3,
      },
      {
        sectionId: civilSec.id,
        itemNo: "1.4",
        title: "Anti-Termite Treatment",
        lineType: BOQLineType.LUMP_SUM,
        amount: 15000,
        executedAmount: 15000,
        sortOrder: 4,
      },
    ],
  });

  // ==========================================
  // 5. TRANSACTIONS (Materials, Labour, Finance)
  // ==========================================

  // Inventory Activity
  await prisma.projectInventory.create({
    data: {
      projectId: project.id,
      itemId: items.cement.id,
      qtyBought: 500,
      qtyIssued: 350,
    },
  });
  await prisma.inventoryTransaction.create({
    data: {
      projectId: project.id,
      itemId: items.cement.id,
      voucherNumber: generateVoucher("ITX"),
      type: TransactionType.BUY,
      quantity: 500,
      unitCost: 420,
      date: projectDate,
    },
  });
  await prisma.inventoryTransaction.create({
    data: {
      projectId: project.id,
      itemId: items.cement.id,
      voucherNumber: generateVoucher("ITX"),
      type: TransactionType.ISSUE,
      quantity: 350,
      unitCost: 420,
      date: new Date(projectDate.getTime() + 10 * 86400000),
    },
  });

  // Labour Entries referencing the new dynamic worker array
  await prisma.dailyLabourEntry.create({
    data: {
      projectId: project.id,
      workerTypeId: workers["Mason"].id,
      contractorId: contractor.id,
      voucherNumber: generateVoucher("DL"),
      date: new Date(),
      headcount: 4,
      wageRate: workers["Mason"].defaultRate,
      title: "Blockwork - Ground Floor",
      paidImmediately: false,
    },
  });
  await prisma.dailyLabourEntry.create({
    data: {
      projectId: project.id,
      workerTypeId: workers["Helpers"].id,
      contractorId: contractor.id,
      voucherNumber: generateVoucher("DL"),
      date: new Date(),
      headcount: 6,
      wageRate: workers["Helpers"].defaultRate,
      title: "Blockwork - Ground Floor",
      paidImmediately: false,
    },
  });

  // Site Expenses
  await prisma.siteExpense.create({
    data: {
      projectId: project.id,
      voucherNumber: generateVoucher("EXP"),
      category: "Food & Tea",
      amount: 850,
      date: new Date(),
      description: "Tea and snacks for workers",
    },
  });
  await prisma.siteExpense.create({
    data: {
      projectId: project.id,
      voucherNumber: generateVoucher("EXP"),
      category: "Transport",
      amount: 1500,
      date: new Date(),
      description: "Auto fare for urgent material delivery",
    },
  });

  // Extra Work
  await prisma.extraWork.create({
    data: {
      projectId: project.id,
      voucherNumber: generateVoucher("EW"),
      date: new Date(),
      description: "Additional 15 Amp socket for EV Charger",
      amount: 8500,
      status: ExtraWorkStatus.UNBILLED,
    },
  });

  // Invoicing & Payments
  const invoice = await prisma.invoice.create({
    data: {
      projectId: project.id,
      clientId: client.id,
      invoiceNumber: "INV-2026-001",
      amount: 1250000,
      status: InvoiceStatus.PAID,
      issuedDate: projectDate,
      dueDate: new Date(projectDate.getTime() + 7 * 86400000),
      notes: "Mobilization Advance",
      lineItems: {
        create: [
          {
            description: "Mobilization Advance as per contract",
            quantity: 1,
            unitPrice: 1250000,
            total: 1250000,
          },
        ],
      },
    },
  });

  const payment = await prisma.clientPayment.create({
    data: {
      clientId: client.id,
      invoiceId: invoice.id,
      voucherNumber: generateVoucher("CPAY"),
      amount: 1250000,
      paymentDate: new Date(projectDate.getTime() + 2 * 86400000),
      method: "NEFT",
      note: "Advance Payment Received",
      allocations: {
        create: [{ invoiceId: invoice.id, allocatedAmount: 1250000 }],
      },
    },
  });

  // Share Log
  await prisma.shareLog.create({
    data: {
      type: "CLIENT_RECEIPT",
      referenceId: payment.id,
      referenceType: "ClientPayment",
      recipientPhone: client.phone!,
    },
  });

  console.log(
    "\n✅ SEEDING COMPLETE! The complete worker registry and project are ready.",
  );
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
