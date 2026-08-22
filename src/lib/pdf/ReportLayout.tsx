import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface PdfColumn {
  header: string;
  width?: string | number;
  flex?: number;
  align?: "left" | "center" | "right";
}

export interface ReportLayoutProps {
  title?: string;
  dateRange?: string;
  generatedAt?: string;
  subtitle?: string;
  summaryItems?: Array<{ label: string; value: string | number }>;
  children: React.ReactNode;
  businessProfile?: any;
  clientProfile?: any;
}

// STRICT PERCENTAGES
const W_LEFT = "46%";
const W_RIGHT_WRAPPER = "54%";
const W_MID_INNER = "55.55%";
const W_RIGHT_INNER = "44.45%";

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 60,
    paddingHorizontal: 20,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#000",
  },

  // --- HEADER NAV ---
  topNavRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  topNavColLeft: { flex: 1, alignItems: "flex-start" },
  topNavColCenter: { flex: 1, alignItems: "center" },
  topNavColRight: { flex: 1, alignItems: "flex-end" },
  topNavText: {
    fontSize: 7,
    color: "#333",
  },

  // --- CUSTOM TARGET HEADER BLOCK ---
  headerTableContainer: {
    borderWidth: 1,
    borderColor: "#000",
    borderBottomWidth: 0,
  },
  yellowHeaderRow: {
    backgroundColor: "#FDE047",
    borderBottomWidth: 1,
    borderColor: "#000",
    paddingVertical: 5,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  yellowHeaderText: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    width: "100%",
  },

  // Structural Rows
  gridRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#000",
  },
  gridRowNoBottom: {
    flexDirection: "row",
  },

  // Inner Cell Styles
  cellLeft: {
    width: W_LEFT,
    borderRightWidth: 1,
    borderColor: "#000",
    padding: 4,
    justifyContent: "center",
  },
  cellMid: {
    width: W_MID_INNER,
    borderRightWidth: 1,
    borderColor: "#000",
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  cellRight: {
    width: W_RIGHT_INNER,
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },

  // Backgrounds & Typography
  bgBlue: { backgroundColor: "#BFDBFE" },
  bgPink: { backgroundColor: "#FAD1E6" },
  textSmall: { fontSize: 8, marginBottom: 2 },
  textBold: { fontSize: 8, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  textCenter: { fontSize: 8, textAlign: "center" },
  textCenterBold: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  titleBold: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },
  titleUnderline: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textDecoration: "underline",
  },

  // --- FOOTER STYLES ---
  footerContainer: {
    position: "absolute",
    bottom: 15,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerLeft: { width: "35%" },
  footerCenter: { width: "25%", alignItems: "center", paddingBottom: 4 },
  footerRight: { width: "40%", alignItems: "flex-end" },

  // --- GENERIC TABLE STYLES (For Ledgers) ---
  tableContainer: {
    display: "flex",
    flexDirection: "column",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 2,
    marginBottom: 16,
  },
  tableHeaderRow: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderBottomWidth: 1,
    borderBottomColor: "#94A3B8",
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  tableHeaderCell: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
  },
  tableRow: {
    display: "flex",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  tableRowAlt: { backgroundColor: "#F8FAFC" },
  tableCell: { fontSize: 9, color: "#334155" },
  tableFooterRow: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderTopWidth: 1,
    borderTopColor: "#94A3B8",
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  tableFooterCell: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0F172A",
  },
});

const getCellWidthStyle = (col: PdfColumn) => {
  if (col.width) {
    return { width: col.width, textAlign: col.align || "left" };
  }
  return { flex: col.flex || 1, textAlign: col.align || "left" };
};

export interface PdfTableProps {
  columns: PdfColumn[];
  rows: Array<Array<string | number | null | undefined>>;
  footerRow?: Array<string | number | null | undefined>;
  emptyText?: string;
}

export const PdfTable: React.FC<PdfTableProps> = ({
  columns,
  rows,
  footerRow,
  emptyText = "No records found for this period.",
}) => {
  return (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeaderRow}>
        {columns.map((col, idx) => (
          <Text
            key={idx}
            style={[styles.tableHeaderCell, getCellWidthStyle(col) as any]}
          >
            {col.header}
          </Text>
        ))}
      </View>
      {rows.length === 0 ? (
        <View style={{ padding: 16, alignItems: "center" }}>
          <Text style={{ fontStyle: "italic", color: "#64748B", fontSize: 10 }}>
            {emptyText}
          </Text>
        </View>
      ) : (
        rows.map((row, rowIdx) => (
          <View
            key={rowIdx}
            style={[
              styles.tableRow,
              rowIdx % 2 === 1 ? styles.tableRowAlt : {},
            ]}
          >
            {row.map((cellValue, cellIdx) => {
              const col = columns[cellIdx] || { flex: 1 };
              return (
                <Text
                  key={cellIdx}
                  style={[styles.tableCell, getCellWidthStyle(col) as any]}
                >
                  {cellValue !== null && cellValue !== undefined
                    ? String(cellValue)
                    : "-"}
                </Text>
              );
            })}
          </View>
        ))
      )}
      {footerRow && footerRow.length > 0 && (
        <View style={styles.tableFooterRow}>
          {footerRow.map((val, idx) => {
            const col = columns[idx] || { flex: 1 };
            return (
              <Text
                key={idx}
                style={[styles.tableFooterCell, getCellWidthStyle(col) as any]}
              >
                {val !== null && val !== undefined ? String(val) : ""}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
};

export const ReportLayout: React.FC<ReportLayoutProps> = ({
  title,
  generatedAt = new Date().toLocaleDateString("en-IN"),
  subtitle,
  children,
  businessProfile,
  clientProfile,
}) => {
  const compName = businessProfile?.companyName || "Construction Company";
  const safeAddress = businessProfile?.address?.split("\n") || [
    "No Address Provided",
  ];

  const safeClient = clientProfile || {
    name: "Client Name Not Provided",
    address: "No Address Provided",
    gstNumber: "-",
    siteAddress: "-",
  };

  const isQuotation =
    title?.toLowerCase().includes("quotation") ||
    title?.toLowerCase().includes("boq");
  const headerTitleText = isQuotation ? subtitle : title;

  return (
    <Document title={title || "Report"}>
      <Page size="A4" style={styles.page}>
        <View fixed>
          {/* Top Nav Line (3 equal columns for perfect centering) */}
          <View style={styles.topNavRow}>
            <View style={styles.topNavColLeft}>
              <Text style={styles.topNavText}>
                {businessProfile?.website ||
                  businessProfile?.email ||
                  "Generated via ERP"}
              </Text>
            </View>
            <View style={styles.topNavColCenter}>
              <Text style={styles.topNavText}>{title || "Quote"}</Text>
            </View>
            <View style={styles.topNavColRight}>
              <Text style={styles.topNavText}>{generatedAt}</Text>
            </View>
          </View>

          {isQuotation ? (
            <View style={styles.headerTableContainer}>
              {/* YELLOW TITLE ROW */}
              <View style={styles.yellowHeaderRow}>
                <Text style={styles.yellowHeaderText}>{headerTitleText}</Text>
              </View>

              {/* BLUE BLOCK */}
              <View
                style={[
                  styles.bgBlue,
                  {
                    borderBottomWidth: 0 /* adjust if pink block remains commented */,
                  },
                ]}
              >
                {/* Blue Row 1 (Title + Ref + Date) */}
                <View style={styles.gridRow}>
                  <View style={styles.cellLeft}>
                    <Text style={styles.titleBold}>{compName}</Text>
                  </View>
                  <View
                    style={{ width: W_RIGHT_WRAPPER, flexDirection: "row" }}
                  >
                    <View style={styles.cellMid}>
                      <Text style={styles.textCenterBold}>Ref No : </Text>
                    </View>
                    <View style={styles.cellRight}>
                      <Text style={styles.textCenterBold}>
                        DATE : {generatedAt}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Blue Row 2 (Address + Trade Details) */}
                <View style={styles.gridRowNoBottom}>
                  <View style={styles.cellLeft}>
                    {businessProfile?.licenseDetails ? (
                      businessProfile.licenseDetails
                        .split("\n")
                        .map((line: string, i: number) => (
                          <Text key={i} style={styles.textSmall}>
                            {line}
                          </Text>
                        ))
                    ) : (
                      <Text style={styles.textSmall}>
                        {businessProfile?.tagline || ""}
                      </Text>
                    )}
                    <Text style={styles.textSmall}>
                      {safeAddress.join(", ")}
                    </Text>
                  </View>

                  <View
                    style={{ width: W_RIGHT_WRAPPER, flexDirection: "column" }}
                  >
                    <View style={[styles.gridRow, { flexGrow: 1 }]}>
                      <View style={styles.cellMid}>
                        <Text style={styles.textCenter}>Trade Name</Text>
                      </View>
                      <View style={styles.cellRight}>
                        <Text style={styles.textCenter}>{compName}</Text>
                      </View>
                    </View>
                    <View style={[styles.gridRow, { flexGrow: 1 }]}>
                      <View style={styles.cellMid}>
                        <Text style={styles.textCenter}>GST Number</Text>
                      </View>
                      <View style={styles.cellRight}>
                        <Text style={styles.textCenter}>
                          {businessProfile?.gstNumber || "N/A"}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.gridRowNoBottom, { flexGrow: 1 }]}>
                      <View style={styles.cellMid}>
                        <Text style={styles.textCenter}>TAN Number</Text>
                      </View>
                      <View style={styles.cellRight}>
                        <Text style={styles.textCenter}>
                          {businessProfile?.tanNumber || "N/A"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* PINK BLOCK - COMMENTED OUT AS REQUESTED */}
              {/* 
              <View style={styles.bgPink}>
                <View style={styles.gridRow}>
                  <View style={styles.cellLeft}>
                    <Text style={styles.titleUnderline}>Customer Billing Address</Text>
                  </View>
                  <View style={{ width: W_RIGHT_WRAPPER, flexDirection: 'row' }}>
                    <View style={styles.cellMid}><Text style={styles.textCenter}>Customer Name</Text></View>
                    <View style={styles.cellRight}><Text style={styles.textCenter}>{safeClient.name}</Text></View>
                  </View>
                </View>

                <View style={styles.gridRowNoBottom}>
                  <View style={styles.cellLeft}>
                    <Text style={styles.textBold}>{safeClient.name}</Text>
                    <Text style={styles.textSmall}>{safeClient.address}</Text>
                  </View>
                  
                  <View style={{ width: W_RIGHT_WRAPPER, flexDirection: 'column' }}>
                    <View style={[styles.gridRow, { flexGrow: 1 }]}>
                      <View style={styles.cellMid}><Text style={styles.textCenter}>Customer GST No</Text></View>
                      <View style={styles.cellRight}><Text style={styles.textCenter}>{safeClient.gstNumber}</Text></View>
                    </View>
                    <View style={[styles.gridRowNoBottom, { flexGrow: 1 }]}>
                      <View style={styles.cellMid}><Text style={styles.textCenter}>Site Address</Text></View>
                      <View style={styles.cellRight}><Text style={styles.textCenter}>{safeClient.siteAddress}</Text></View>
                    </View>
                  </View>
                </View>
              </View> 
              */}
            </View>
          ) : (
            <View
              style={{
                marginBottom: 15,
                paddingBottom: 10,
                borderBottomWidth: 2,
                borderBottomColor: "#000",
              }}
            >
              <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold" }}>
                {compName}
              </Text>
              <Text style={{ fontSize: 12, marginTop: 4 }}>{title}</Text>
              {subtitle && (
                <Text style={{ fontSize: 9, marginTop: 2, color: "#444" }}>
                  {subtitle}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* --- MAIN CONTENT --- */}
        <View>{children}</View>

        {/* --- FOOTER BLOCK --- */}
        <View style={styles.footerContainer} fixed>
          <View style={styles.footerLeft}>
            <Text style={styles.textBold}>{compName}</Text>
            {safeAddress.map((line: string, i: number) => (
              <Text key={i} style={styles.textSmall}>
                {line}
              </Text>
            ))}
            {businessProfile?.phone && (
              <Text style={styles.textSmall}>Tel: {businessProfile.phone}</Text>
            )}
          </View>
          <View style={styles.footerCenter}>
            <Text
              render={({ pageNumber, totalPages }) =>
                `${pageNumber} / ${totalPages}`
              }
              style={styles.textBold}
            />
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.textBold}>Authorized Signatory</Text>
            <Text style={styles.textSmall}>{compName}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
