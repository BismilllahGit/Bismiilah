import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

export interface PdfColumn {
  header: string;
  width?: string | number; // e.g., "20%" or 100
  flex?: number;           // e.g., 2 for flexible layout
  align?: 'left' | 'center' | 'right';
}

export interface ReportLayoutProps {
  title: string;
  dateRange?: string;
  generatedAt?: string;
  subtitle?: string;
  summaryItems?: Array<{ label: string; value: string | number }>;
  children: React.ReactNode;
  businessProfile?: any;
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    paddingBottom: 60,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1E293B', // slate-800
  },
  headerContainer: {
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#0F172A', // slate-900
    paddingBottom: 10,
  },
  companyName: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reportTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    fontWeight: 'bold',
    color: '#334155', // slate-700
    marginBottom: 6,
  },
  metaRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#64748B', // slate-500
  },
  headerTopSection: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    width: 60,
    height: 60,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  companyLogo: {
    width: 60,
    height: 60,
    objectFit: 'contain',
  },
  companyDetails: {
    fontSize: 9,
    color: '#334155',
    lineHeight: 1.3,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    padding: 6,
    borderRadius: 4,
  },
  summaryGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#F1F5F9', // slate-100
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryBox: {
    flexGrow: 1,
    minWidth: '22%',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    fontWeight: 'bold',
    color: '#0F172A',
  },
  contentContainer: {
    marginBottom: 20,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    paddingTop: 8,
    display: 'flex',
    flexDirection: 'column',
  },
  footerBottomRow: {
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    paddingTop: 8,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#64748B',
  },
  footerTopRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 20,
  },
  bankDetailsBlock: {
    flex: 1,
    fontSize: 8,
    color: '#475569',
    lineHeight: 1.3,
  },
  bankDetailsTitle: {
    fontFamily: 'Helvetica-Bold',
    color: '#1E293B',
    marginBottom: 2,
    fontSize: 9,
  },
  termsBlock: {
    flex: 1,
    fontSize: 7,
    color: '#64748B',
    lineHeight: 1.2,
  },
  termsTitle: {
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    marginBottom: 2,
    fontSize: 8,
  },
  // Table styles
  tableContainer: {
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 2,
    marginBottom: 16,
  },
  tableHeaderRow: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderBottomWidth: 1,
    borderBottomColor: '#94A3B8',
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tableHeaderCell: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    fontWeight: 'bold',
    color: '#0F172A',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  tableCell: {
    fontSize: 9,
    color: '#334155',
  },
  tableFooterRow: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderTopWidth: 1,
    borderTopColor: '#94A3B8',
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tableFooterCell: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    fontWeight: 'bold',
    color: '#0F172A',
  },
});

const getCellWidthStyle = (col: PdfColumn) => {
  if (col.width) {
    return { width: col.width, textAlign: col.align || 'left' };
  }
  return { flex: col.flex || 1, textAlign: col.align || 'left' };
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
  emptyText = "No records found for this period."
}) => {
  return (
    <View style={styles.tableContainer}>
      {/* Header Row */}
      <View style={styles.tableHeaderRow}>
        {columns.map((col, idx) => (
          <Text key={idx} style={[styles.tableHeaderCell, getCellWidthStyle(col) as any]}>
            {col.header}
          </Text>
        ))}
      </View>

      {/* Data Rows */}
      {rows.length === 0 ? (
        <View style={{ padding: 16, alignItems: 'center' }}>
          <Text style={{ fontStyle: 'italic', color: '#64748B', fontSize: 10 }}>{emptyText}</Text>
        </View>
      ) : (
        rows.map((row, rowIdx) => (
          <View key={rowIdx} style={[styles.tableRow, rowIdx % 2 === 1 ? styles.tableRowAlt : {}]}>
            {row.map((cellValue, cellIdx) => {
              const col = columns[cellIdx] || { flex: 1 };
              return (
                <Text key={cellIdx} style={[styles.tableCell, getCellWidthStyle(col) as any]}>
                  {cellValue !== null && cellValue !== undefined ? String(cellValue) : "-"}
                </Text>
              );
            })}
          </View>
        ))
      )}

      {/* Optional Summary Footer Row */}
      {footerRow && footerRow.length > 0 && (
        <View style={styles.tableFooterRow}>
          {footerRow.map((val, idx) => {
            const col = columns[idx] || { flex: 1 };
            return (
              <Text key={idx} style={[styles.tableFooterCell, getCellWidthStyle(col) as any]}>
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
  dateRange,
  generatedAt = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
  subtitle,
  summaryItems,
  children,
  businessProfile,
}) => {
  const compName = businessProfile?.companyName || "Bismillah Construction";
  
  return (
    <Document title={`${title} - ${compName}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.headerContainer} fixed>
            <View style={styles.headerTopSection}>
              <View style={styles.headerLeft}>
                <Text style={styles.companyName}>{compName}</Text>
                {businessProfile?.tagline && <Text style={{...styles.companyDetails, fontFamily: 'Helvetica-Bold', marginBottom: 4}}>{businessProfile.tagline}</Text>}
                
                {businessProfile?.address && <Text style={styles.companyDetails}>{businessProfile.address.replace(/\r/g, '').replace(/\n/g, ', ')}</Text>}
                
                <View style={{display: 'flex', flexDirection: 'row', gap: 10, marginTop: 2}}>
                  {businessProfile?.phone && <Text style={styles.companyDetails}>Tel: {businessProfile.phone}</Text>}
                  {businessProfile?.email && <Text style={styles.companyDetails}>Email: {businessProfile.email}</Text>}
                </View>

                <View style={{display: 'flex', flexDirection: 'row', gap: 10, marginTop: 2}}>
                  {businessProfile?.gstNumber && <Text style={styles.companyDetails}>GSTIN: {businessProfile.gstNumber}</Text>}
                  {businessProfile?.tanNumber && <Text style={styles.companyDetails}>TAN: {businessProfile.tanNumber}</Text>}
                </View>

                {businessProfile?.licenseDetails && (
                  <View style={{marginTop: 2}}>
                    {businessProfile.licenseDetails.split('\n').map((line: string, i: number) => (
                      <Text key={i} style={styles.companyDetails}>{line}</Text>
                    ))}
                  </View>
                )}
              </View>
              
              {businessProfile?.logoUrl && (
                <View style={styles.headerRight}>
                  {/* React-PDF can load remote images directly */}
                  <Image src={businessProfile.logoUrl} style={styles.companyLogo} />
                </View>
              )}
            </View>

            <Text style={styles.reportTitle}>{title}</Text>
            <View style={styles.metaRow}>
              <Text>Generated: {generatedAt}</Text>
              <Text>{dateRange ? `Period: ${dateRange}` : `Period: All Time / Current Snapshot`}</Text>
            </View>
          </View>

          {/* Subtitle / Entity description */}
          {subtitle && (
            <View>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
          )}

          {/* Summary Boxes */}
          {summaryItems && summaryItems.length > 0 && (
            <View style={styles.summaryGrid}>
              {summaryItems.map((item, index) => (
                <View key={index} style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text style={styles.summaryValue}>{String(item.value)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Table / Report Content */}
          <View>
            {children}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footerContainer} fixed>
          <View style={styles.footerTopRow}>
            {/* Terms and Conditions (Left Side) */}
            <View style={styles.termsBlock}>
              {businessProfile?.defaultTerms && (
                <>
                  <Text style={styles.termsTitle}>Terms & Conditions</Text>
                  {businessProfile.defaultTerms.split('\n').map((line: string, i: number) => (
                    <Text key={i}>{line}</Text>
                  ))}
                </>
              )}
            </View>

            {/* Bank Details (Right Side) */}
            <View style={styles.bankDetailsBlock}>
              {(businessProfile?.bankAccountName || businessProfile?.bankAccountNumber || businessProfile?.upiId) && (
                <>
                  <Text style={styles.bankDetailsTitle}>Bank Details for Payment</Text>
                  {businessProfile?.bankAccountName && <Text>Account Name: {businessProfile.bankAccountName}</Text>}
                  <View style={{display: 'flex', flexDirection: 'row', gap: 10}}>
                    {businessProfile?.bankAccountNumber && <Text>A/C No: {businessProfile.bankAccountNumber}</Text>}
                    {businessProfile?.bankIfsc && <Text>IFSC: {businessProfile.bankIfsc}</Text>}
                  </View>
                  {businessProfile?.bankName && (
                    <Text>{businessProfile.bankName}{businessProfile?.bankBranch ? `, ${businessProfile.bankBranch}` : ''}</Text>
                  )}
                  {businessProfile?.upiId && <Text>UPI/GPay: {businessProfile.upiId}</Text>}
                </>
              )}
            </View>
          </View>

          <View style={styles.footerBottomRow}>
            <Text>Generated by {compName} ERP</Text>
            <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages || 1}`} />
          </View>
        </View>
      </Page>
    </Document>
  );
};
