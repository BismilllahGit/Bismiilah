import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    marginTop: 10,
    marginBottom: 20,
    fontFamily: "Helvetica",
  },
  sectionBox: {
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#94A3B8",
    borderRadius: 3,
    overflow: "hidden",
  },
  sectionHeader: {
    backgroundColor: "#1E293B", // slate-800
    color: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 10,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitleText: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionGroupBadge: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#CBD5E1",
  },
  colNo: {
    width: 25,
    textAlign: "center",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
  },
  tableHeader: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
  },
  tableRow: {
    display: "flex",
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E2E8F0",
    fontSize: 9,
    color: "#1E293B",
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#F8FAFC",
  },
  colDesc: { flex: 3, paddingRight: 4 },
  colType: { width: 60, textAlign: "center", fontSize: 8, color: "#475569" },
  colQty: { width: 65, textAlign: "right", fontFamily: "Helvetica-Bold" },
  colUnit: { width: 45, textAlign: "center", color: "#64748B" },
  colRate: { width: 70, textAlign: "right", color: "#334155" },
  colAmount: { width: 85, textAlign: "right", fontFamily: "Helvetica-Bold", color: "#0F172A" },

  // Sample document yellow-highlighted subtotal row
  sectionSubtotalRow: {
    backgroundColor: "#FEF08A", // yellow-200 highlight per sample document
    borderTopWidth: 1.5,
    borderTopColor: "#CA8A04",
    paddingVertical: 7,
    paddingHorizontal: 10,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionSubtotalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
    color: "#422006",
    textTransform: "uppercase",
  },
  sectionSubtotalValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
    color: "#0F172A",
  },

  // Rollup Summary Styles
  summarySection: {
    marginTop: 10,
    borderWidth: 2,
    borderColor: "#0F172A",
    borderRadius: 4,
    overflow: "hidden",
  },
  summaryHeader: {
    backgroundColor: "#334155",
    color: "#FFFFFF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  groupTotalRow: {
    backgroundColor: "#F1F5F9",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
    paddingVertical: 7,
    paddingHorizontal: 12,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  groupTotalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1E293B",
    textTransform: "uppercase",
  },
  groupTotalValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
  },
  grandTotalRow: {
    backgroundColor: "#064E3B", // deep emerald green
    paddingVertical: 10,
    paddingHorizontal: 12,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  grandTotalLabel: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  grandTotalValue: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#34D399", // bright emerald green accent
  },
  emptyText: {
    fontSize: 9,
    fontStyle: "italic",
    color: "#64748B",
    padding: 8,
    textAlign: "center",
  },
});

const formatRs = (val: number | null | undefined) => {
  if (val === null || val === undefined) return "-";
  return `Rs. ${Number(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatQty = (val: number | null | undefined) => {
  if (val === null || val === undefined) return "-";
  return Number(val).toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

export const BOQPdfTable: React.FC<{ boq: any }> = ({ boq }) => {
  const sections = boq.sections || [];
  const groupTotals = boq.groupTotals || [];
  const grandTotal = Number(boq.grandTotal || 0);

  return (
    <View style={styles.container}>
      {sections.length === 0 ? (
        <View style={styles.sectionBox}>
          <Text style={styles.emptyText}>No sections or items configured in this estimate version.</Text>
        </View>
      ) : (
        sections.map((section: any, secIndex: number) => {
          const categories = section.categories || [];

          return (
            <View key={section.id || secIndex} style={styles.sectionBox}>
              {/* Section Header */}
              <View style={styles.sectionHeader} fixed>
                <Text style={styles.sectionTitleText}>Section {secIndex + 1}: {section.name}</Text>
                <Text style={styles.sectionGroupBadge}>Group: {section.group?.name || "Uncategorized"}</Text>
              </View>

              {section.lineItems && section.lineItems.length > 0 && (
                <View style={styles.tableHeader}>
                  <Text style={styles.colNo}>S.No</Text>
                  <Text style={styles.colDesc}>Title / Description / Make</Text>
                  <Text style={styles.colType}>Mode</Text>
                  <Text style={styles.colQty}>Est. Qty</Text>
                  <Text style={styles.colUnit}>Unit</Text>
                  <Text style={styles.colRate}>Rate (₹)</Text>
                  <Text style={styles.colAmount}>Amount (₹)</Text>
                </View>
              )}

              {!section.lineItems || section.lineItems.length === 0 ? (
                <Text style={styles.emptyText}>No line items specified in this section.</Text>
              ) : (
                section.lineItems.map((li: any, liIndex: number) => (
                  <View
                    key={li.id || liIndex}
                    style={[styles.tableRow, liIndex % 2 === 1 ? styles.tableRowAlt : {}]}
                    wrap={false}
                  >
                    <Text style={styles.colNo}>{li.itemNo || (liIndex + 1).toString()}</Text>
                    <View style={styles.colDesc}>
                      <Text style={{ fontFamily: "Helvetica-Bold" }}>{li.title}</Text>
                      {li.description && <Text style={{ fontSize: 8, color: "#475569", marginTop: 2 }}>{li.description}</Text>}
                      {li.make && <Text style={{ fontSize: 8, color: "#64748B", marginTop: 1, fontStyle: "italic" }}>Make: {li.make}</Text>}
                      {li.item && <Text style={{ fontSize: 7.5, color: "#059669", marginTop: 1 }}>✓ Material Link: {li.item.name} {li.grade ? `(${li.grade})` : ""}</Text>}
                    </View>
                    <Text style={styles.colType}>{li.lineType === "LUMP_SUM" ? "Lump Sum" : "Calculated"}</Text>
                    <Text style={styles.colQty}>{li.lineType === "CALCULATED" ? formatQty(li.quantity) : "-"}</Text>
                    <Text style={styles.colUnit}>{li.lineType === "CALCULATED" ? li.unit || "-" : "-"}</Text>
                    <Text style={styles.colRate}>{li.lineType === "CALCULATED" ? formatRs(li.rate).replace("Rs. ", "") : "-"}</Text>
                    <Text style={styles.colAmount}>{formatRs(li.amount).replace("Rs. ", "")}</Text>
                  </View>
                ))
              )}

              {/* Highlighted Section Subtotal Row (Yellow Highlight per sample doc, wrap=false ensures it never orphans) */}
              <View style={styles.sectionSubtotalRow} wrap={false}>
                <Text style={styles.sectionSubtotalLabel}>Total For Section: {section.name}</Text>
                <Text style={styles.sectionSubtotalValue}>{formatRs(section.subtotal || 0)}</Text>
              </View>
            </View>
          );
        })
      )}

      {/* Rollup Summary by Trade Group (wrap=false guarantees this financial conclusion stays intact on a page) */}
      <View style={styles.summarySection} wrap={false}>
        <View style={styles.summaryHeader}>
          <Text>Quotation Rollup Summary by Trade Group</Text>
        </View>

        {/* One highlighted row per group actually present on this BOQ */}
        {groupTotals.map((grp: any, gIndex: number) => (
          <View key={grp.groupId || gIndex} style={styles.groupTotalRow}>
            <Text style={styles.groupTotalLabel}>Total For Group: {grp.groupName}</Text>
            <Text style={styles.groupTotalValue}>{formatRs(grp.subtotal || 0)}</Text>
          </View>
        ))}

        {/* Grand Total (G-TOTAL) Row */}
        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>Grand Total (G-TOTAL)</Text>
          <Text style={styles.grandTotalValue}>{formatRs(grandTotal)}</Text>
        </View>
      </View>
    </View>
  );
};
