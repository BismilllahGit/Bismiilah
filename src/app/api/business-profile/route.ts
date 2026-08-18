import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET: Returns the business profile. If none exists, creates a default empty one.
export async function GET() {
  if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    let profile = await prisma.businessProfile.findFirst();

    if (!profile) {
      profile = await prisma.businessProfile.create({
        data: {
          companyName: "Company Name",
        }
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[BUSINESS_PROFILE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// PATCH: Updates the single business profile record.
export async function PATCH(req: Request) {
  if (process.env.SKIP_AUTH_FOR_TESTS !== "true") {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    
    let profile = await prisma.businessProfile.findFirst();

    if (!profile) {
      profile = await prisma.businessProfile.create({
        data: {
          companyName: body.companyName || "Company Name",
        }
      });
    }

    const updatedProfile = await prisma.businessProfile.update({
      where: { id: profile.id },
      data: {
        companyName: body.companyName,
        tagline: body.tagline,
        licenseDetails: body.licenseDetails,
        address: body.address,
        phone: body.phone,
        email: body.email,
        website: body.website,
        gstNumber: body.gstNumber,
        tanNumber: body.tanNumber,
        logoUrl: body.logoUrl,
        bankAccountName: body.bankAccountName,
        bankAccountNumber: body.bankAccountNumber,
        bankIfsc: body.bankIfsc,
        bankName: body.bankName,
        bankBranch: body.bankBranch,
        bankAccountType: body.bankAccountType,
        upiId: body.upiId,
        defaultTerms: body.defaultTerms,
      }
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("[BUSINESS_PROFILE_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
