"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Loader2, Building2, Landmark, FileText } from "lucide-react";
import { useApiResource, useApiMutation } from "@/hooks/useApiResource";
import type { BusinessProfile } from "@prisma/client";

// The API route returns the Prisma row as-is via NextResponse.json(), which
// serializes `updatedAt` (a Date) to an ISO string over the wire.
type SerializedBusinessProfile = Omit<BusinessProfile, "updatedAt"> & {
  updatedAt: string;
};

export default function BusinessProfileClient() {
  const { data: fetchedProfile, loading } =
    useApiResource<SerializedBusinessProfile>("/api/business-profile");
  const [profile, setProfile] = useState<SerializedBusinessProfile | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const updateProfile = useApiMutation<
    SerializedBusinessProfile | null,
    SerializedBusinessProfile
  >("PATCH");

  useEffect(() => {
    if (fetchedProfile) setProfile(fetchedProfile);
  }, [fetchedProfile]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setProfile(
      (prev) =>
        // Spreading a nullable object with a dynamic key widens the
        // inferred type beyond SerializedBusinessProfile; this cast
        // restates the known shape without changing runtime behavior.
        ({ ...prev, [name]: value }) as SerializedBusinessProfile | null,
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile.mutate("/api/business-profile", profile);
      alert("Business profile updated successfully");
    } catch {
      alert("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Company Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Company Details
          </CardTitle>
          <CardDescription>
            Your main business identity, which appears at the top of BOQs and
            Invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Company Name</label>
              <Input
                name="companyName"
                value={profile?.companyName || ""}
                onChange={handleChange}
                placeholder="e.g. Bismillah Construction"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tagline / Subtitle</label>
              <Input
                name="tagline"
                value={profile?.tagline || ""}
                onChange={handleChange}
                placeholder="e.g. Civil & Structural Experts"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                name="phone"
                value={profile?.phone || ""}
                onChange={handleChange}
                placeholder="e.g. +91 98000 00000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                name="email"
                value={profile?.email || ""}
                onChange={handleChange}
                placeholder="e.g. contact@bismillah.com"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Address</label>
              <textarea
                name="address"
                value={profile?.address || ""}
                onChange={handleChange}
                className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                placeholder="Full business address..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">GST Number</label>
              <Input
                name="gstNumber"
                value={profile?.gstNumber || ""}
                onChange={handleChange}
                placeholder="e.g. 27AAAAA0000A1Z5"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">TAN / PAN Number</label>
              <Input
                name="tanNumber"
                value={profile?.tanNumber || ""}
                onChange={handleChange}
                placeholder="e.g. ABCDE1234F"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">License Details</label>
              <textarea
                name="licenseDetails"
                value={profile?.licenseDetails || ""}
                onChange={handleChange}
                className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                placeholder="e.g. Licensed Civil Engineer-RE2001162019"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" /> Bank Details
          </CardTitle>
          <CardDescription>
            Payment information that appears at the bottom of Quotations and
            Invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Name</label>
              <Input
                name="bankAccountName"
                value={profile?.bankAccountName || ""}
                onChange={handleChange}
                placeholder="e.g. Bismillah Construction LLC"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Account Number</label>
              <Input
                name="bankAccountNumber"
                value={profile?.bankAccountNumber || ""}
                onChange={handleChange}
                placeholder="e.g. 501000000000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">IFSC Code</label>
              <Input
                name="bankIfsc"
                value={profile?.bankIfsc || ""}
                onChange={handleChange}
                placeholder="e.g. HDFC0001234"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bank Name</label>
              <Input
                name="bankName"
                value={profile?.bankName || ""}
                onChange={handleChange}
                placeholder="e.g. HDFC Bank"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Branch / Account Type
              </label>
              <Input
                name="bankBranch"
                value={profile?.bankBranch || ""}
                onChange={handleChange}
                placeholder="e.g. Bandra West, Current Account"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">UPI / GPay ID</label>
              <Input
                name="upiId"
                value={profile?.upiId || ""}
                onChange={handleChange}
                placeholder="e.g. bismillah@okhdfc"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Default Terms & Conditions
          </CardTitle>
          <CardDescription>
            Standard terms attached to the bottom of all generated documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            name="defaultTerms"
            value={profile?.defaultTerms || ""}
            onChange={handleChange}
            className="flex min-h-[150px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
            placeholder="1. Payment is due within 15 days...&#10;2. Rates are exclusive of GST..."
          />
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-6">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Business Profile
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
