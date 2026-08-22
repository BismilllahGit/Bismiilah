import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";

// Strict column widths that equal exactly 100%
const W_SLNO = "6%";
const W_DESC = "40%";
const W_MAKE = "14%";
const W_QTY = "8%";
const W_UNIT = "8%";
const W_COST = "10%";
const W_AMT = "14%";

// Totals row spans (Ensuring they map perfectly to the vertical borders above)
const W_TOTAL_LEFT = "46%"; // SLNO (6) + DESC (40)
const W_TOTAL_MID = "40%"; // MAKE (14) + QTY (8) + UNIT (8) + COST (10)
const W_TOTAL_RIGHT = "14%"; // AMT (14)

const styles = StyleSheet.create({
  tableContainer: {
    display: "flex",
    flexDirection: "column",
    borderWidth: 1,
    borderColor: "#000",
    marginBottom: 20,
    fontFamily: "Helvetica",
  },
  // Table Header
  tableHeaderRow: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: "#E2E8F0", // Slightly darker header to match target
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    alignItems: "stretch",
    minHeight: 24,
  },
  tableHeaderCell: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: "#000",
    justifyContent: "center",
    alignItems: "center", // Centers the text block inside
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
    textAlign: "center",
  },
  // Section Header (Yellow)
  sectionHeaderRow: {
    backgroundColor: "#FDE047",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingVertical: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionHeaderText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
  },
  // Data Rows
  tableRow: {
    display: "flex",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    alignItems: "stretch", // Forces columns to stretch equally
  },
  tableCell: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: "#000",
    justifyContent: "center",
  },
  tableCellText: {
    fontSize: 8,
  },
  // Highlighted Columns (Blue)
  blueColumn: {
    backgroundColor: "#BFDBFE",
  },
  // Totals Row
  totalsRow: {
    display: "flex",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    backgroundColor: "#f8fafc",
    alignItems: "stretch",
    minHeight: 24,
  },
  totalsLabelCell: {
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  totalsLabelText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  totalsValueCell: {
    padding: 5,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  totalsValueText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  // Footer / Terms section
  footerBlock: {
    display: "flex",
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#000",
  },
  termsSection: {
    flex: 1,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: "#000",
  },
  accountSection: {
    flex: 1,
    padding: 6,
  },
  blockTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textDecoration: "underline",
    marginBottom: 4,
  },
  blockText: {
    fontSize: 8,
    marginBottom: 2,
  },
  boldText: {
    fontFamily: "Helvetica-Bold",
  },
  emptyText: {
    fontSize: 9,
    fontStyle: "italic",
    color: "#64748B",
    padding: 10,
    textAlign: "center",
  },
});

const formatCurrency = (amount: number | null | undefined) => {
  if (amount === undefined || amount === null) return "Nill";
  return amount.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

const formatQty = (val: number | null | undefined) => {
  if (val === null || val === undefined) return "-";
  return Number(val).toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

export const BOQPdfTable: React.FC<{ boq: any; businessProfile?: any }> = ({
  boq,
  businessProfile,
}) => {
  const sections = boq.sections || [];
  const groupTotals = boq.groupTotals || [];
  const grandTotal = Number(boq.grandTotal || 0);
  const compName = businessProfile?.companyName || "Construction Company";

  return (
    <View>
      <View style={styles.tableContainer}>
        {/* EXACT ALIGNMENT TABLE HEADER */}
        <View style={styles.tableHeaderRow} fixed>
          <View style={[styles.tableHeaderCell, { width: W_SLNO }]}>
            <Text style={styles.tableHeaderText}>Sl No</Text>
          </View>
          <View style={[styles.tableHeaderCell, { width: W_DESC }]}>
            <Text style={styles.tableHeaderText}>Description</Text>
          </View>
          <View style={[styles.tableHeaderCell, { width: W_MAKE }]}>
            <Text style={styles.tableHeaderText}>Make</Text>
          </View>
          <View style={[styles.tableHeaderCell, { width: W_QTY }]}>
            <Text style={styles.tableHeaderText}>Qty</Text>
          </View>
          <View style={[styles.tableHeaderCell, { width: W_UNIT }]}>
            <Text style={styles.tableHeaderText}>Unit</Text>
          </View>
          <View style={[styles.tableHeaderCell, { width: W_COST }]}>
            <Text style={styles.tableHeaderText}>Unit Cost</Text>
          </View>
          <View
            style={[
              styles.tableHeaderCell,
              { width: W_AMT, borderRightWidth: 0 },
            ]}
          >
            <Text style={styles.tableHeaderText}>Amount</Text>
          </View>
        </View>

        {sections.length === 0 ? (
          <View style={{ borderBottomWidth: 1, borderBottomColor: "#000" }}>
            <Text style={styles.emptyText}>
              No sections or items configured in this estimate version.
            </Text>
          </View>
        ) : (
          sections.map((section: any, secIndex: number) => (
            <React.Fragment key={section.id || secIndex}>
              {/* Section Header */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderText}>{section.name}</Text>
              </View>

              {/* Line Items */}
              {!section.lineItems || section.lineItems.length === 0 ? (
                <View
                  style={{ borderBottomWidth: 1, borderBottomColor: "#000" }}
                >
                  <Text style={styles.emptyText}>
                    No line items specified in this section.
                  </Text>
                </View>
              ) : (
                section.lineItems.map((li: any, liIndex: number) => (
                  <View
                    key={li.id || liIndex}
                    style={styles.tableRow}
                    wrap={false}
                  >
                    <View
                      style={[
                        styles.tableCell,
                        { width: W_SLNO, alignItems: "center" },
                      ]}
                    >
                      <Text style={styles.tableCellText}>
                        {li.itemNo || (liIndex + 1).toString()}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.tableCell,
                        { width: W_DESC, justifyContent: "flex-start" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tableCellText,
                          { fontFamily: "Helvetica-Bold", marginBottom: 2 },
                        ]}
                      >
                        {li.title}
                      </Text>
                      {li.description && (
                        <Text
                          style={[styles.tableCellText, { color: "#475569" }]}
                        >
                          {li.description}
                        </Text>
                      )}
                    </View>

                    <View
                      style={[
                        styles.tableCell,
                        styles.blueColumn,
                        { width: W_MAKE, alignItems: "center" },
                      ]}
                    >
                      <Text
                        style={[styles.tableCellText, { textAlign: "center" }]}
                      >
                        {li.make || "As Per Design & Spec"}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.tableCell,
                        { width: W_QTY, alignItems: "center" },
                      ]}
                    >
                      <Text style={styles.tableCellText}>
                        {li.lineType === "CALCULATED"
                          ? formatQty(li.quantity)
                          : "-"}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.tableCell,
                        { width: W_UNIT, alignItems: "center" },
                      ]}
                    >
                      <Text style={styles.tableCellText}>
                        {li.lineType === "CALCULATED" ? li.unit || "-" : "-"}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.tableCell,
                        styles.blueColumn,
                        { width: W_COST, alignItems: "flex-end" },
                      ]}
                    >
                      <Text
                        style={[styles.tableCellText, { textAlign: "right" }]}
                      >
                        {li.lineType === "CALCULATED"
                          ? `Rs. ${formatCurrency(li.rate)}`
                          : "-"}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.tableCell,
                        {
                          width: W_AMT,
                          alignItems: "flex-end",
                          borderRightWidth: 0,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.tableCellText, { textAlign: "right" }]}
                      >
                        {li.amount
                          ? `Rs. ${formatCurrency(li.amount)}`
                          : "Nill"}
                      </Text>
                    </View>
                  </View>
                ))
              )}

              {/* EXACT ALIGNMENT Section Subtotal */}
              <View style={styles.totalsRow} wrap={false}>
                <View
                  style={[styles.totalsLabelCell, { width: W_TOTAL_LEFT }]}
                ></View>
                <View style={[styles.totalsLabelCell, { width: W_TOTAL_MID }]}>
                  <Text style={styles.totalsLabelText}>
                    Total {section.name}
                  </Text>
                </View>
                <View
                  style={[styles.totalsValueCell, { width: W_TOTAL_RIGHT }]}
                >
                  <Text style={styles.totalsValueText}>
                    Rs. {formatCurrency(section.subtotal || 0)}
                  </Text>
                </View>
              </View>
            </React.Fragment>
          ))
        )}

        {/* Group Totals Rollup */}
        {groupTotals.map((grp: any, gIndex: number) => (
          <View
            key={grp.groupId || gIndex}
            style={styles.totalsRow}
            wrap={false}
          >
            <View
              style={[styles.totalsLabelCell, { width: W_TOTAL_LEFT }]}
            ></View>
            <View style={[styles.totalsLabelCell, { width: W_TOTAL_MID }]}>
              <Text style={styles.totalsLabelText}>
                Total For {grp.groupName}
              </Text>
            </View>
            <View
              style={[
                styles.totalsValueCell,
                styles.blueColumn,
                { width: W_TOTAL_RIGHT },
              ]}
            >
              <Text style={styles.totalsValueText}>
                Rs. {formatCurrency(grp.subtotal || 0)}
              </Text>
            </View>
          </View>
        ))}

        {/* Grand Total */}
        <View
          style={[styles.totalsRow, { backgroundColor: "#e2e8f0" }]}
          wrap={false}
        >
          <View
            style={[styles.totalsLabelCell, { width: W_TOTAL_LEFT }]}
          ></View>
          <View style={[styles.totalsLabelCell, { width: W_TOTAL_MID }]}>
            <Text style={styles.totalsLabelText}>Total Amount</Text>
          </View>
          <View style={[styles.totalsValueCell, { width: W_TOTAL_RIGHT }]}>
            <Text style={styles.totalsValueText}>
              Rs. {formatCurrency(grandTotal)}
            </Text>
          </View>
        </View>

        {/* Dynamic Terms and Account Details Block */}
        <View style={styles.footerBlock} wrap={false}>
          <View style={styles.termsSection}>
            <Text style={styles.blockTitle}>Terms and Conditions</Text>

            {businessProfile?.defaultTerms ? (
              businessProfile.defaultTerms
                .split("\n")
                .map((line: string, i: number) => (
                  <Text key={i} style={styles.blockText}>
                    {line}
                  </Text>
                ))
            ) : (
              <>
                <Text style={styles.blockText}>
                  1. Work will be Completed within 10 Months from the date of
                  Advance.
                </Text>
                <Text style={styles.blockText}>
                  2. Please find below the Detailed Payment Terms and
                  Conditions.
                </Text>
                <Text style={styles.blockText}>
                  3. The above Mentioned Cost is Exclusive of Gst.
                </Text>
              </>
            )}

            <Text style={[styles.blockTitle, { marginTop: 10 }]}>
              Account Details
            </Text>
            <Text style={styles.blockText}>
              <Text style={styles.boldText}>Account Name: </Text>
              {businessProfile?.bankAccountName || compName}
            </Text>
            <Text style={styles.blockText}>
              <Text style={styles.boldText}>Account Number: </Text>
              {businessProfile?.bankAccountNumber || "-"}
            </Text>
            <Text style={styles.blockText}>
              <Text style={styles.boldText}>Ifsc: </Text>
              {businessProfile?.bankIfsc || "-"}
            </Text>
            <Text style={styles.blockText}>
              <Text style={styles.boldText}>Bank: </Text>
              {businessProfile?.bankName || "-"}
            </Text>
          </View>

          <View
            style={[
              styles.accountSection,
              { justifyContent: "flex-end", alignItems: "center" },
            ]}
          >
            <Text style={styles.boldText}>For {compName}</Text>
            <View style={{ height: 60 }}></View>
            <Text style={styles.boldText}>Authorized Signatory</Text>
          </View>
        </View>
      </View>
    </View>
  );
};
