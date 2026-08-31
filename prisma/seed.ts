import {
  PrismaClient,
  ProjectStatus,
  TaskStatus,
  PaymentCycle,
  BOQStatus,
  BOQLineType,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting professional database seeding with FULL BOQ...");

  // ==========================================
  // 1. ADMIN USER & BUSINESS PROFILE
  // ==========================================
  const password = await bcrypt.hash("<redacted>", 10);

  await prisma.user.upsert({
    where: { email: "<redacted>@gmail.com" },
    update: { password, role: "ADMIN" },
    create: { email: "<redacted>@gmail.com", password, role: "ADMIN" },
  });

  await prisma.businessProfile.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      companyName: "Bismillah Construction",
      tagline: "Precision and Quality",
      address: "Kochi, Kerala",
      phone: "+91 98765 43210",
      email: "<redacted>@gmail.com",
      gstNumber: "32ABCDE1234F1Z5",
      defaultTerms: "Payment due within 15 days of invoice generation.",
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
  // 2. MASTER DATA (Groups & Workers)
  // ==========================================
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
      where: { name: "Interior Works" },
      update: {},
      create: { name: "Interior Works", sortOrder: 4 },
    }),
  };

  const workerTypes = [
    { name: "Mason", rate: 1100, cycle: PaymentCycle.WEEKLY },
    { name: "Carpenter", rate: 1200, cycle: PaymentCycle.WEEKLY },
    { name: "Cupboard Carpenter", rate: 1300, cycle: PaymentCycle.WEEKLY },
    { name: "Painter", rate: 1000, cycle: PaymentCycle.WEEKLY },
    { name: "Electrician", rate: 1300, cycle: PaymentCycle.DAILY },
    { name: "Tiles Mason", rate: 1200, cycle: PaymentCycle.WEEKLY },
    {
      name: "Bar Bender / Steel Fixer",
      rate: 1100,
      cycle: PaymentCycle.WEEKLY,
    },
    {
      name: "Centering / Shuttering Workers",
      rate: 1100,
      cycle: PaymentCycle.WEEKLY,
    },
    { name: "Glass Worker", rate: 1200, cycle: PaymentCycle.WEEKLY },
    { name: "SS Worker", rate: 1200, cycle: PaymentCycle.WEEKLY },
    { name: "Chipping Worker", rate: 900, cycle: PaymentCycle.WEEKLY },
    { name: "Plumber", rate: 1200, cycle: PaymentCycle.DAILY },
    { name: "Welder", rate: 1200, cycle: PaymentCycle.WEEKLY },
    {
      name: "Aluminium / UPVC Door & Window Installer",
      rate: 1200,
      cycle: PaymentCycle.WEEKLY,
    },
    {
      name: "CNC / ACP Cladding Worker",
      rate: 1300,
      cycle: PaymentCycle.WEEKLY,
    },
    {
      name: "POP / Gypsum Ceiling Worker",
      rate: 1200,
      cycle: PaymentCycle.WEEKLY,
    },
    { name: "Granite / Marble Worker", rate: 1300, cycle: PaymentCycle.WEEKLY },
    { name: "Excavation Workers", rate: 900, cycle: PaymentCycle.DAILY },
    { name: "Helpers", rate: 800, cycle: PaymentCycle.WEEKLY },
    { name: "Scaffolding Workers", rate: 1000, cycle: PaymentCycle.WEEKLY },
    { name: "Roofing Workers", rate: 1100, cycle: PaymentCycle.WEEKLY },
    { name: "Paver Block Workers", rate: 1000, cycle: PaymentCycle.WEEKLY },
    {
      name: "Hydraulic / Earthmoving Machine Operators",
      rate: 1500,
      cycle: PaymentCycle.DAILY,
    },
    { name: "Housekeeping Staff", rate: 700, cycle: PaymentCycle.WEEKLY },
  ];

  for (const wt of workerTypes) {
    await prisma.workerType.upsert({
      where: { name: wt.name },
      update: {},
      create: { name: wt.name, defaultRate: wt.rate, paymentCycle: wt.cycle },
    });
  }

  // ==========================================
  // 3. FULL BOQ TEMPLATE
  // ==========================================
  const template = await prisma.bOQTemplate.create({
    data: { name: "Stilt+2 Construction Template", category: "Residential" },
  });

  const civilTemplateSec = await prisma.bOQTemplateSection.create({
    data: {
      templateId: template.id,
      name: "Part A - Construction Quote",
      groupId: groups.civil.id,
      sortOrder: 1,
    },
  });
  await prisma.bOQTemplateLineItem.createMany({
    data: [
      {
        sectionId: civilTemplateSec.id,
        title: "Stilt Parking Area",
        sortOrder: 1,
      },
      { sectionId: civilTemplateSec.id, title: "Buildup Area", sortOrder: 2 },
      {
        sectionId: civilTemplateSec.id,
        title: "Borewell - 100 Feet Depth",
        sortOrder: 3,
      },
      {
        sectionId: civilTemplateSec.id,
        title: "Sump - 8,000 Litres Capacity",
        sortOrder: 4,
      },
      {
        sectionId: civilTemplateSec.id,
        title: "Civil Overhead Water Tank - 3,000 Litres",
        sortOrder: 5,
      },
      {
        sectionId: civilTemplateSec.id,
        title: "Front Elevation Work (Texture Painting)",
        sortOrder: 6,
      },
      {
        sectionId: civilTemplateSec.id,
        title: "Weathering Course",
        sortOrder: 7,
      },
      { sectionId: civilTemplateSec.id, title: "Pressure Pump", sortOrder: 8 },
      {
        sectionId: civilTemplateSec.id,
        title: "Motorised Grill Gate",
        sortOrder: 9,
      },
      { sectionId: civilTemplateSec.id, title: "Soil Test", sortOrder: 10 },
    ],
  });

  const interiorTemplateSec = await prisma.bOQTemplateSection.create({
    data: {
      templateId: template.id,
      name: "Part B - Interior Works",
      groupId: groups.finishing.id,
      sortOrder: 2,
    },
  });
  await prisma.bOQTemplateLineItem.createMany({
    data: [
      {
        sectionId: interiorTemplateSec.id,
        title: "Plain Gypsum False Ceiling",
        sortOrder: 1,
      },
      {
        sectionId: interiorTemplateSec.id,
        title: "Modular Kitchen Bottom Unit",
        sortOrder: 2,
      },
      {
        sectionId: interiorTemplateSec.id,
        title: "Modular Kitchen Wall Unit",
        sortOrder: 3,
      },
      { sectionId: interiorTemplateSec.id, title: "Loft", sortOrder: 4 },
      {
        sectionId: interiorTemplateSec.id,
        title: "Master Bedroom Wardrobe",
        sortOrder: 5,
      },
      {
        sectionId: interiorTemplateSec.id,
        title: "Master Bedroom TV Unit",
        sortOrder: 6,
      },
      { sectionId: interiorTemplateSec.id, title: "Pooja Unit", sortOrder: 7 },
    ],
  });

  // ==========================================
  // 4. THE SINGLE PROJECT WITH FULL BOQ
  // ==========================================
  const projectDate = new Date();

  const project = await prisma.project.create({
    data: {
      name: "Stilt+2 Construction - Mr Sai Bharath",
      location: "Noombal Village, Chennai-600 122",
      status: ProjectStatus.ACTIVE,
      startDate: projectDate,
      agreedValue: 8525213.0,
      notes: "Ref No: SVN/CON/55. Detailed Construction and Interior Quote.",
    },
  });

  const boq = await prisma.bOQ.create({
    data: {
      projectId: project.id,
      versionNumber: 1,
      status: BOQStatus.ACTIVE,
      targetBudget: 8525213.0,
      approvedAt: projectDate,
    },
  });

  // Project Part A Items
  const partASec = await prisma.bOQSection.create({
    data: {
      boqId: boq.id,
      groupId: groups.civil.id,
      name: "Part A - Construction Cost",
      sortOrder: 1,
    },
  });
  await prisma.bOQLineItem.createMany({
    data: [
      {
        sectionId: partASec.id,
        itemNo: "1",
        title: "Stilt Parking Area",
        lineType: BOQLineType.CALCULATED,
        quantity: 1205,
        unit: "Sq.ft",
        rate: 1500,
        amount: 1807500,
        executedQuantity: 0,
        executedAmount: 0,
      },
      {
        sectionId: partASec.id,
        itemNo: "2",
        title: "Buildup Area",
        lineType: BOQLineType.CALCULATED,
        quantity: 2394,
        unit: "Sq.ft",
        rate: 2250,
        amount: 5386500,
        executedQuantity: 0,
        executedAmount: 0,
      },
      {
        sectionId: partASec.id,
        itemNo: "3",
        title: "Borewell - 100 Feet Depth",
        lineType: BOQLineType.CALCULATED,
        quantity: 100,
        unit: "Rft",
        rate: 550,
        amount: 55000,
        executedQuantity: 0,
        executedAmount: 0,
      },
      {
        sectionId: partASec.id,
        itemNo: "4",
        title: "Sump - 8,000 Litres Capacity",
        lineType: BOQLineType.CALCULATED,
        quantity: 8000,
        unit: "Litres",
        rate: 35,
        amount: 280000,
        executedQuantity: 0,
        executedAmount: 0,
      },
      {
        sectionId: partASec.id,
        itemNo: "5",
        title: "Civil Overhead Water Tank - 3,000 Litres",
        lineType: BOQLineType.CALCULATED,
        quantity: 3000,
        unit: "Litres",
        rate: 40,
        amount: 120000,
        executedQuantity: 0,
        executedAmount: 0,
      },
      {
        sectionId: partASec.id,
        itemNo: "6",
        title: "Front Elevation Work",
        lineType: BOQLineType.CALCULATED,
        quantity: 216,
        unit: "Sq.ft",
        rate: 175,
        amount: 37713,
        executedQuantity: 0,
        executedAmount: 0,
      },
      {
        sectionId: partASec.id,
        itemNo: "7",
        title: "Weathering Course",
        lineType: BOQLineType.CALCULATED,
        quantity: 1008,
        unit: "Sq.ft",
        rate: 50,
        amount: 50400,
        executedQuantity: 0,
        executedAmount: 0,
      },
      {
        sectionId: partASec.id,
        itemNo: "8",
        title: "Pressure Pump",
        lineType: BOQLineType.CALCULATED,
        quantity: 1,
        unit: "Nos",
        rate: 12001,
        amount: 12001,
        executedQuantity: 0,
        executedAmount: 0,
      },
      {
        sectionId: partASec.id,
        itemNo: "9",
        title: "Motorised Grill Gate",
        lineType: BOQLineType.CALCULATED,
        quantity: 137,
        unit: "Sq.ft",
        rate: 2000,
        amount: 0,
        executedQuantity: 0,
        executedAmount: 0,
      },
      {
        sectionId: partASec.id,
        itemNo: "10",
        title: "Soil Test",
        lineType: BOQLineType.CALCULATED,
        quantity: 1,
        unit: "Ls",
        rate: 16000,
        amount: 16000,
        executedQuantity: 0,
        executedAmount: 0,
      },
    ],
  });

  // Project Part B Items
  const partBSec = await prisma.bOQSection.create({
    data: {
      boqId: boq.id,
      groupId: groups.finishing.id,
      name: "Part B - Interior Works",
      sortOrder: 2,
    },
  });
  await prisma.bOQLineItem.createMany({
    data: [
      {
        sectionId: partBSec.id,
        itemNo: "11",
        title: "Plain Gypsum False Ceiling",
        lineType: BOQLineType.CALCULATED,
        quantity: 2216,
        unit: "Sq Ft",
        rate: 150,
        amount: 0,
        executedQuantity: 0,
        executedAmount: 0,
      },
      {
        sectionId: partBSec.id,
        itemNo: "12",
        title: "Modular Kitchen Bottom Unit",
        lineType: BOQLineType.CALCULATED,
        quantity: 63,
        unit: "Sq.ft",
        rate: 1800,
        amount: 113400,
        executedQuantity: 0,
        executedAmount: 0,
      },
      {
        sectionId: partBSec.id,
        itemNo: "13",
        title: "Modular Kitchen Wall Unit",
        lineType: BOQLineType.CALCULATED,
        quantity: 42,
        unit: "Sq.ft",
        rate: 1600,
        amount: 67200,
        executedQuantity: 0,
        executedAmount: 0,
      },
      {
        sectionId: partBSec.id,
        itemNo: "14",
        title: "Loft",
        lineType: BOQLineType.CALCULATED,
        quantity: 179,
        unit: "Sq.ft",
        rate: 850,
        amount: 152150,
        executedQuantity: 0,
        executedAmount: 0,
      },
      {
        sectionId: partBSec.id,
        itemNo: "15",
        title: "Master Bedroom Wardrobe",
        lineType: BOQLineType.CALCULATED,
        quantity: 388.5,
        unit: "Sq.ft",
        rate: 1100,
        amount: 427350,
        executedQuantity: 0,
        executedAmount: 0,
      },
      {
        sectionId: partBSec.id,
        itemNo: "16",
        title: "Master Bedroom TV Unit",
        lineType: BOQLineType.CALCULATED,
        quantity: 168,
        unit: "Sq.ft",
        rate: 750,
        amount: 0,
        executedQuantity: 0,
        executedAmount: 0,
      },
      {
        sectionId: partBSec.id,
        itemNo: "17",
        title: "Pooja Unit",
        lineType: BOQLineType.CALCULATED,
        quantity: 49,
        unit: "Sq.ft",
        rate: 1600,
        amount: 0,
        executedQuantity: 0,
        executedAmount: 0,
      },
    ],
  });

  await prisma.projectTask.create({
    data: {
      projectId: project.id,
      title: "Site Mobilization & Survey",
      targetDate: new Date(),
      status: TaskStatus.COMPLETED,
      completedAt: new Date(),
    },
  });

  console.log(
    "✅ SEEDING COMPLETE! A clean, single project with the FULL BOQ is ready.",
  );
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
