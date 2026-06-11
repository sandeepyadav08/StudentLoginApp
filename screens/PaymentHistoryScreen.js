import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Modal,
} from "react-native";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { getPaymentHistoryAPI, getPaymentDetailsAPI } from "../services/api";
import { WebView } from "react-native-webview";
import { useTheme } from "../contexts/ThemeContext";

// Responsive utility functions
const getResponsiveSize = (baseSize, screenWidth) => {
  const scale = screenWidth / 375;
  return Math.round(baseSize * Math.max(scale, 0.8));
};

const getResponsivePadding = (basePadding, screenWidth) => {
  if (screenWidth < 350) return basePadding * 0.8;
  if (screenWidth > 414) return basePadding * 1.2;
  return basePadding;
};

export default function PaymentHistoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = Dimensions.get("window");
  const { colors, isDark } = useTheme();

  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    setCurrentPage(0);
    setHasMore(true);
    setPaymentHistory([]);
    setLoading(true);
    loadPaymentHistory(statusFilter, true);
  }, [statusFilter]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setShowFilterDropdown(false);
      setStatusFilter("");
    });
    return unsubscribe;
  }, [navigation]);

  const loadPaymentHistory = async (filter = "", reset = true) => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        Alert.alert("Error", "No authentication token found");
        navigation.replace("Login");
        return;
      }

      const pageSize = 20;
      const startIndex = reset ? 0 : currentPage * pageSize;

      // Load payment history from backend API with pagination
      const response = await getPaymentHistoryAPI(
        token,
        filter,
        startIndex,
        pageSize
      );
      const paymentData = response.data || [];

      if (reset) {
        setPaymentHistory(paymentData);
        setCurrentPage(1);
      } else {
        setPaymentHistory((prev) => [...prev, ...paymentData]);
        setCurrentPage((prev) => prev + 1);
      }

      setHasMore(response.hasMore && paymentData.length === pageSize);
      console.log("Payment history from backend:", paymentData);
    } catch (error) {
      console.error("Payment history error:", error);
      setError(error.message);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMorePayments = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    await loadPaymentHistory(statusFilter, false);
  };

  // Function to load payment details
  const loadPaymentDetails = async (paymentId) => {
    try {
      setDetailsLoading(true);
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        Alert.alert("Error", "No authentication token found");
        return;
      }

      const response = await getPaymentDetailsAPI(token, paymentId);
      setPaymentDetails(response);
    } catch (error) {
      console.error("Payment details error:", error);
      Alert.alert("Error", "Failed to load payment details");
    } finally {
      setDetailsLoading(false);
    }
  };

  // Function to handle card press
  const handlePaymentPress = async (payment) => {
    setSelectedPayment(payment);
    setModalVisible(true);
    await loadPaymentDetails(payment.parent_id || payment.id);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(0);
    setHasMore(true);
    await loadPaymentHistory(statusFilter, true);
    setRefreshing(false);
  };

  // Parse "DD-MM-YYYY" safely and display nicely
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dateString);
    if (m) {
      const [, dd, mm, yyyy] = m;
      const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    return dateString;
  };

  const formatAmount = (amount) => {
    const n = typeof amount === "string" ? Number(amount) : amount;
    if (typeof n === "number" && !isNaN(n)) {
      return `₹${n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    return `₹${amount}`;
  };

  const getStatusColor = (status) => {
    switch (String(status)) {
      case "Success":
        return "#16a34a";
      case "Pending":
        return "#d97706";
      case "Fail":
        return "#dc2626";
      case "Processing":
        return "#0ea5e9";
      default:
        return "#6b7280";
    }
  };

  // HTML template for WebView with better styling
  const createHtmlContent = (htmlContent) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                padding: 16px;
                margin: 0;
                background-color: #f8fafc;
                line-height: 1.5;
            }
            .table {
                width: 100%;
                margin-bottom: 16px;
                border-collapse: collapse;
                background-color: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .table-bordered {
                border: 1px solid #e2e8f0;
            }
            .table td {
                padding: 12px;
                border-bottom: 1px solid #e2e8f0;
                vertical-align: middle;
            }
            .table td:first-child {
                background-color: #f8fafc;
                font-weight: 600;
                color: #475569;
            }
            .table td:last-child {
                color: #1e293b;
            }
            .table tr:last-child td {
                border-bottom: none;
            }
            img {
                max-width: 100%;
                height: auto;
                border-radius: 8px;
                border: 2px solid #e2e8f0;
            }
            b {
                color: #6C63FF;
                font-weight: 600;
            }
            .profile-section {
                text-align: center;
                margin-bottom: 20px;
            }
        </style>
    </head>
    <body>
        ${htmlContent}
    </body>
    </html>
    `;
  };

  const renderPaymentItem = ({ item, index }) => (
    <TouchableOpacity
      style={[
        styles.paymentItem,
        {
          backgroundColor: colors.surface,
          marginHorizontal: getResponsivePadding(16, screenWidth),
          marginBottom: getResponsivePadding(12, screenWidth),
          padding: getResponsivePadding(16, screenWidth),
        },
      ]}
      onPress={() => handlePaymentPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.paymentHeader}>
        <View style={styles.paymentLeft}>
          <Text
            style={[
              styles.paymentId,
              { 
                color: colors.text,
                fontSize: getResponsiveSize(14, screenWidth) 
              },
            ]}
          >
            #{item.id || item.transaction_id || `PAY-${index + 1}`}
          </Text>
          <Text
            style={[
              styles.paymentDate,
              { 
                color: colors.textSecondary,
                fontSize: getResponsiveSize(12, screenWidth) 
              },
            ]}
          >
            {formatDate(item.date || item.payment_date || item.created_at)}
          </Text>
        </View>
        <Text
          style={[
            styles.paymentAmount,
            { 
              color: '#6C63FF',
              fontSize: getResponsiveSize(16, screenWidth) 
            },
          ]}
        >
          {formatAmount(item.amount || item.payment_amount || 0)}
        </Text>
      </View>

      <View style={styles.paymentDetails}>
        <Text
          style={[
            styles.paymentDescription,
            { 
              color: colors.text,
              fontSize: getResponsiveSize(14, screenWidth) 
            },
          ]}
        >
          {item.for_payment || item.payment_description || item.purpose || "NA"}
        </Text>
        <View
          style={[
            styles.statusContainer,
            { backgroundColor: `${getStatusColor(item)}20` },
          ]}
        >
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              {
                color: getStatusColor(item.status),
                fontSize: getResponsiveSize(12, screenWidth),
              },
            ]}
          >
            {item.status_label || item.status || "Completed"}
          </Text>
        </View>
      </View>

      {(item.payment_method || item.bank_name) && (
        <View style={styles.paymentMethod}>
          <Ionicons name="card-outline" size={16} color="#6b7280" />
          <Text
            style={[
              styles.methodText,
              { fontSize: getResponsiveSize(12, screenWidth) },
            ]}
          >
            {item.transaction_id || "N/A"}
            {item.bank_name ? ` • ${item.bank_name}` : ""}
          </Text>
        </View>
      )}

      {/* Add a small indicator that the card is clickable */}
      <View style={styles.clickIndicator}>
        <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );

  // Modal component for payment details
  const renderPaymentDetailsModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        setModalVisible(false);
        setPaymentDetails(null);
        setSelectedPayment(null);
      }}
    >
      <SafeAreaView style={styles.modalContainer}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              setModalVisible(false);
              setPaymentDetails(null);
              setSelectedPayment(null);
            }}
          >
            <Ionicons name="close" size={24} color="#6C63FF" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Payment Details</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Modal Content */}
        <View style={styles.modalContent}>
          {detailsLoading ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color="#6C63FF" />
              <Text style={styles.loadingText}>Loading details...</Text>
            </View>
          ) : paymentDetails?.html ? (
            <WebView
              source={{ html: createHtmlContent(paymentDetails.html) }}
              style={styles.webView}
              showsVerticalScrollIndicator={false}
              bounces={false}
              scalesPageToFit={true}
            />
          ) : (
            <View style={styles.noDetailsContainer}>
              <Ionicons
                name="document-text-outline"
                size={64}
                color="#9ca3af"
              />
              <Text style={styles.noDetailsText}>No details available</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={64} color="#9ca3af" />
      <Text
        style={[
          styles.emptyTitle,
          { fontSize: getResponsiveSize(18, screenWidth) },
        ]}
      >
        No Payment History
      </Text>
      <Text
        style={[
          styles.emptySubtitle,
          { fontSize: getResponsiveSize(14, screenWidth) },
        ]}
      >
        Your payment transactions will appear here
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <Ionicons name="alert-circle-outline" size={64} color="#dc2626" />
      <Text
        style={[
          styles.errorTitle,
          { fontSize: getResponsiveSize(18, screenWidth) },
        ]}
      >
        Failed to Load
      </Text>
      <Text
        style={[
          styles.errorSubtitle,
          { fontSize: getResponsiveSize(14, screenWidth) },
        ]}
      >
        {error}
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => loadPaymentHistory(statusFilter)}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View
            style={[
              styles.header,
              {
                backgroundColor: colors.background,
                borderBottomColor: "transparent",
                paddingHorizontal: getResponsivePadding(16, screenWidth),
                paddingVertical: getResponsivePadding(15, screenWidth),
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: colors.primaryContainer || '#EEF0FF', width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={22} color={colors.primary} />
            </TouchableOpacity>
            <Text
              style={[
                styles.headerTitle,
                {
                  color: '#6C63FF',
                  fontSize: getResponsiveSize(18, screenWidth)
                },
              ]}
            >
              Payment History
            </Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={[
                styles.loadingText,
                { 
                  color: colors.textSecondary,
                  fontSize: getResponsiveSize(16, screenWidth) 
                },
              ]}
            >
              Loading payment history...
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.background,
              borderBottomColor: "transparent",
              paddingHorizontal: getResponsivePadding(16, screenWidth),
              paddingVertical: getResponsivePadding(15, screenWidth),
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primaryContainer || '#EEF0FF', width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              {
                color: '#6C63FF',
                fontSize: getResponsiveSize(18, screenWidth)
              },
            ]}
          >
            Payment History
          </Text>
          <TouchableOpacity
            style={styles.refreshHeaderButton}
            onPress={onRefresh}
          >
            <Ionicons name="refresh" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Custom Filter Dropdown */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 10,
            backgroundColor: colors.background,
            borderBottomWidth: 0,
            zIndex: 1000,
          }}
        >
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 12,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 12,
            }}
            onPress={() => setShowFilterDropdown(!showFilterDropdown)}
          >
            <Text style={{ color: colors.text, fontSize: 16 }}>
              {statusFilter === "" ? "All" : 
               statusFilter === "0" ? "Pending" :
               statusFilter === "1" ? "Success" :
               statusFilter === "2" ? "Fail" :
               statusFilter === "3" ? "Processing" : "All"}
            </Text>
            <Ionicons 
              name={showFilterDropdown ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>
          
          {showFilterDropdown && (
            <View
              style={{
                position: 'absolute',
                top: '100%',
                left: 16,
                right: 16,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderTopWidth: 0,
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
                elevation: 5,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                zIndex: 1001,
              }}
            >
              {[
                { label: "All", value: "" },
                { label: "Pending", value: "0" },
                { label: "Success", value: "1" },
                { label: "Fail", value: "2" },
                { label: "Processing", value: "3" },
              ].map((item, index, array) => (
                <TouchableOpacity
                  key={item.value}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    borderBottomWidth: index < array.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                    backgroundColor: statusFilter === item.value ? colors.primaryContainer : 'transparent',
                  }}
                  onPress={() => {
                    setStatusFilter(item.value);
                    setShowFilterDropdown(false);
                  }}
                >
                  <Text 
                    style={{ 
                      color: statusFilter === item.value ? colors.primary : colors.text,
                      fontSize: 16,
                      fontWeight: statusFilter === item.value ? '600' : '400',
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Content */}
        {error && !refreshing ? (
          renderError()
        ) : (
          <FlatList
            data={paymentHistory}
            renderItem={renderPaymentItem}
            keyExtractor={(item, index) =>
              item.id?.toString() ||
              item.transaction_id?.toString() ||
              index.toString()
            }
            ListEmptyComponent={renderEmptyState}
            ListFooterComponent={() =>
              loadingMore ? (
                <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.loadingMoreText}>Loading more...</Text>
                </View>
              ) : null
            }
            onEndReached={loadMorePayments}
            onEndReachedThreshold={0.1}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#6C63FF"]}
                tintColor="#6C63FF"
              />
            }
            contentContainerStyle={
              paymentHistory.length === 0
                ? styles.emptyListContainer
                : styles.listContainer
            }
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Payment Details Modal */}
        {renderPaymentDetailsModal()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "600",
  },
  refreshHeaderButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  listContainer: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  paymentItem: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: "#4C1D95",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: "relative",
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  paymentLeft: {
    flex: 1,
  },
  paymentId: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  paymentDate: {
    fontSize: 12,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  paymentDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  paymentDescription: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    marginRight: 12,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  methodText: {
    fontSize: 12,
    color: "#6b7280",
    marginLeft: 6,
  },
  clickIndicator: {
    position: "absolute",
    right: 16,
    top: "50%",
    transform: [{ translateY: -8 }],
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#EEF0FF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6C63FF",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noDetailsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  noDetailsText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 16,
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  errorState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#dc2626",
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#6C63FF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingMoreContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 10,
    fontSize: 14,
    color: "#6b7280",
  },
  emptyListContainer: {
    flex: 1,
  },
});
