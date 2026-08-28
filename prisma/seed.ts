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
  BOQStatus,
  BOQLineType,
  ExtraWorkStatus,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting PRODUCTION database seeding...");

  // ==========================================
  // 1. ADMIN USER (Secure Default)
  // ==========================================
  // In production, it is highly recommended to pass the password via environment variables.
  const adminEmail = process.env.ADMIN_EMAIL || "redacted@gmail.com";
  const rawPassword = process.env.ADMIN_PASSWORD || "redacted";
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {}, // Don't overwrite existing production admin passwords on re-seed
    create: {
      email: adminEmail,
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  });
  console.log(`✅ Admin user ensured: ${admin.email}`);

  // ==========================================
  // 2. BUSINESS PROFILE & SEQUENCES
  // ==========================================
  await prisma.businessProfile.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      companyName: "Bismillah Construction",
      tagline: "Building with Trust and Excellence",
      address: "Kochi, Kerala",
      phone: "+91-9876543210",
      email: "info@redacted.com",
      gstNumber: "32ABCDE1234F1Z5",
      defaultTerms:
        "1. All payments to be made within 15 days of invoice generation.\n2. Materials remain property of the company until fully paid.",
    },
  });
  console.log("✅ Business Profile configured.");

  // Initialize voucher sequences starting at 1000 for professional numbering
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
  console.log("✅ Voucher Sequences initialized.");

  // ==========================================
  // 3. MASTER DATA
  // ==========================================
  // Worker Types
  const workers = {
    mason: await prisma.workerType.upsert({
      where: { name: "Mason" },
      update: {},
      create: {
        name: "Mason",
        defaultRate: 1000,
        paymentCycle: PaymentCycle.WEEKLY,
      },
    }),
    helper: await prisma.workerType.upsert({
      where: { name: "Helper" },
      update: {},
      create: {
        name: "Helper",
        defaultRate: 700,
        paymentCycle: PaymentCycle.WEEKLY,
      },
    }),
    electrician: await prisma.workerType.upsert({
      where: { name: "Electrician" },
      update: {},
      create: {
        name: "Electrician",
        defaultRate: 1200,
        paymentCycle: PaymentCycle.DAILY,
      },
    }),
  };

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
  };

  // Standard Items
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
        name: "M-Sand (Plastering)",
        type: ItemType.MATERIAL,
        unit: "cft",
        unitCost: 60,
      },
    }),
  };

  // Clients & Contacts
  const client = await prisma.client.create({
    data: {
      name: "Mr. Mohammed Tariq",
      phone: "+91-9998887776",
      address: "Edappally",
    },
  });

  const vendor = await prisma.contact.create({
    data: {
      name: "Kerala Steel & Cements Ltd",
      type: ContactType.VENDOR,
      phone: "+91-8887776665",
      specialty: "Building Materials",
    },
  });

  const contractor = await prisma.contact.create({
    data: {
      name: "Ali Labour Services",
      type: ContactType.LABOUR_CONTRACTOR,
      phone: "+91-7776665554",
    },
  });
  console.log("✅ Master Data (Items, Workers, Clients, Vendors) created.");

  // ==========================================
  // 4. THE SINGLE PRODUCTION PROJECT
  // ==========================================
  const project = await prisma.project.create({
    data: {
      name: "Lakeside Residency Villa",
      location: "Marine Drive, Kochi",
      status: ProjectStatus.ACTIVE,
      startDate: new Date(),
      agreedValue: 15000000.0, // 1.5 Cr
      notes:
        "G+1 Premium Residential Villa with modern electrical and plumbing layout.",
    },
  });

  // Project Tasks
  await prisma.projectTask.createMany({
    data: [
      {
        projectId: project.id,
        title: "Site Clearing & Survey",
        targetDate: new Date(),
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      },
      {
        projectId: project.id,
        title: "Earthwork Excavation",
        targetDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: TaskStatus.IN_PROGRESS,
      },
      {
        projectId: project.id,
        title: "PCC Pouring",
        targetDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: TaskStatus.PENDING,
      },
    ],
  });

  // ==========================================
  // 5. PROJECT BOQ & MILESTONES
  // ==========================================
  const boq = await prisma.bOQ.create({
    data: {
      projectId: project.id,
      versionNumber: 1,
      status: BOQStatus.ACTIVE,
      targetBudget: 13500000.0, // 1.35 Cr target budget
      approvedAt: new Date(),
    },
  });

  // Milestones
  const advanceMilestone = await prisma.bOQPaymentMilestone.create({
    data: {
      boqId: boq.id,
      stageName: "Mobilization Advance",
      percentage: 10.0,
      amount: 1500000.0,
      sortOrder: 1,
    },
  });
  await prisma.bOQPaymentMilestone.create({
    data: {
      boqId: boq.id,
      stageName: "Completion of Plinth Level",
      percentage: 25.0,
      amount: 3750000.0,
      sortOrder: 2,
    },
  });
  await prisma.bOQPaymentMilestone.create({
    data: {
      boqId: boq.id,
      stageName: "Completion of Roof Slab",
      percentage: 35.0,
      amount: 5250000.0,
      sortOrder: 3,
    },
  });

  // BOQ Civil Section
  const civilSec = await prisma.bOQSection.create({
    data: {
      boqId: boq.id,
      groupId: groups.civil.id,
      name: "Foundation & Substructure",
      sortOrder: 1,
    },
  });

  await prisma.bOQLineItem.createMany({
    data: [
      {
        sectionId: civilSec.id,
        itemNo: "1.1",
        title: "Earthwork Excavation in ordinary soil",
        lineType: BOQLineType.CALCULATED,
        quantity: 250,
        unit: "cum",
        rate: 450,
        amount: 112500,
        executedQuantity: 100,
        executedAmount: 45000,
        sortOrder: 1,
      },
      {
        sectionId: civilSec.id,
        itemNo: "1.2",
        title: "Providing and laying PCC 1:4:8",
        lineType: BOQLineType.CALCULATED,
        quantity: 50,
        unit: "cum",
        rate: 4500,
        amount: 225000,
        itemId: items.cement.id,
        sortOrder: 2,
      },
      {
        sectionId: civilSec.id,
        itemNo: "1.3",
        title: "Anti-termite treatment (Lump Sum)",
        lineType: BOQLineType.LUMP_SUM,
        amount: 15000,
        sortOrder: 3,
      },
    ],
  });

  // ==========================================
  // 6. INITIAL SITE TRANSACTIONS
  // ==========================================
  // Initial Invoice (Advance)
  const invoice = await prisma.invoice.create({
    data: {
      projectId: project.id,
      clientId: client.id,
      invoiceNumber: "INV-1001",
      amount: 1500000.0,
      status: InvoiceStatus.PAID,
      issuedDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: "Mobilization advance as per agreement.",
      lineItems: {
        create: [
          {
            description: "Mobilization Advance (10%)",
            quantity: 1,
            unitPrice: 1500000.0,
            total: 1500000.0,
          },
        ],
      },
    },
  });

  // Payment Received
  await prisma.clientPayment.create({
    data: {
      clientId: client.id,
      invoiceId: invoice.id,
      voucherNumber: "REC-1001",
      amount: 1500000.0,
      paymentDate: new Date(),
      method: "RTGS",
      note: "Advance transferred to company account.",
      allocations: {
        create: [{ invoiceId: invoice.id, allocatedAmount: 1500000.0 }],
      },
    },
  });

  // Initial Material Purchase (Cement & Steel)
  await prisma.vendorTransaction.create({
    data: {
      contactId: vendor.id,
      projectId: project.id,
      voucherNumber: "PUR-1001",
      type: VendorTransactionType.PURCHASE,
      amount: 117000.0,
      date: new Date(),
      description: "Initial cement and steel procurement.",
    },
  });

  await prisma.projectInventory.create({
    data: {
      projectId: project.id,
      itemId: items.cement.id,
      qtyBought: 100,
      qtyIssued: 0,
    },
  });
  await prisma.inventoryTransaction.create({
    data: {
      projectId: project.id,
      itemId: items.cement.id,
      voucherNumber: "ITX-1001",
      type: TransactionType.BUY,
      quantity: 100,
      unitCost: 420,
      date: new Date(),
    },
  });

  await prisma.projectInventory.create({
    data: {
      projectId: project.id,
      itemId: items.steel.id,
      qtyBought: 1000,
      qtyIssued: 0,
    },
  });
  await prisma.inventoryTransaction.create({
    data: {
      projectId: project.id,
      itemId: items.steel.id,
      voucherNumber: "ITX-1002",
      type: TransactionType.BUY,
      quantity: 1000,
      unitCost: 75,
      date: new Date(),
    },
  });

  // First Day Labour Entry
  await prisma.dailyLabourEntry.create({
    data: {
      projectId: project.id,
      workerTypeId: workers.helper.id,
      contractorId: contractor.id,
      voucherNumber: "DL-1001",
      date: new Date(),
      headcount: 4,
      wageRate: 700,
      title: "Site Clearing",
      paidImmediately: false,
    },
  });

  // Initial Site Expense
  await prisma.siteExpense.create({
    data: {
      projectId: project.id,
      voucherNumber: "EXP-1001",
      category: "Pooja/Inauguration",
      amount: 5500.0,
      date: new Date(),
      description: "Site inauguration expenses.",
    },
  });

  console.log(
    "✅ Single production project populated with real-world initial data.",
  );
  console.log(`\n🎉 SEEDING COMPLETE!`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log(
      `\n⚠️ WARNING: Admin password was set to default. Please update your .env file with ADMIN_PASSWORD and re-run, or change it in the UI immediately.`,
    );
  }
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
