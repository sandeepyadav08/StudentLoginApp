import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../contexts/ThemeContext";
import ScreenWrapper from '../components/ScreenWrapper';
import { getHostelAndIdFeeAPI, saveUtilityRequestAPI } from "../services/api";

const { width } = Dimensions.get("window");

export default function HostelIdFeeScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [hostelData, setHostelData] = useState(null);
  const [error, setError] = useState(null);

  // Dynamic hostel selection state
  const [selectedHostels, setSelectedHostels] = useState({});
  const [hostelPaymentTypes, setHostelPaymentTypes] = useState({});
  const [hostelAmounts, setHostelAmounts] = useState({});
  const [hostelPaymentOptions, setHostelPaymentOptions] = useState({});
  const [openDropdown, setOpenDropdown] = useState(null);

  // Payment option state
  const [selectedPaymentOption, setSelectedPaymentOption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

  useEffect(() => {
    fetchHostelAndIdFeeData();
  }, []);

  const fetchHostelAndIdFeeData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await getHostelAndIdFeeAPI(token);

      if (response.success) {
        setHostelData(response.data);

        // Parse payment options for each hostel service
        if (response.data && response.data.utility_list) {
          const paymentOptionsMap = {};
          response.data.utility_list.forEach((hostel) => {
            try {
              let subUtilityDetails;
              if (typeof hostel.sub_utility_details === "string") {
                subUtilityDetails = JSON.parse(hostel.sub_utility_details);
              } else {
                subUtilityDetails = hostel.sub_utility_details;
              }

              // Handle both object and array formats
              let options = [];
              if (Array.isArray(subUtilityDetails)) {
                options = subUtilityDetails.map((item, index) => ({
                  id: index + 1,
                  value: item.name.toLowerCase().replace(/\s+/g, "_"),
                  text: item.name,
                  apiValue: item.name,
                  price: parseInt(item.price) || 0,
                }));
              } else if (typeof subUtilityDetails === "object") {
                options = Object.keys(subUtilityDetails).map((key, index) => ({
                  id: index + 1,
                  value: subUtilityDetails[key].name
                    .toLowerCase()
                    .replace(/\s+/g, "_"),
                  text: subUtilityDetails[key].name,
                  apiValue: subUtilityDetails[key].name,
                  price: parseInt(subUtilityDetails[key].price) || 0,
                }));
              }

              paymentOptionsMap[hostel.id] = options;
            } catch (error) {
              console.error(
                `Error parsing sub_utility_details for hostel ${hostel.id}:`,
                error
              );
              paymentOptionsMap[hostel.id] = [];
            }
          });

          setHostelPaymentOptions(paymentOptionsMap);
        }
      } else {
        throw new Error(response.message || "Failed to fetch data");
      }
    } catch (err) {
      console.error("Error fetching hostel & id fee data:", err);
      setError(err.message);
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const paymentProviders = [
    { id: 1, value: "kotak", text: "Kotak Bank", icon: "card-outline" },
    { id: 2, value: "icici", text: "ICICI Bank", icon: "card-outline" },
  ];

  // Helper functions
  const getHostelById = (id) =>
    hostelData?.utility_list?.find((hostel) => hostel.id === id);

  const getHostelPaymentOptions = (hostelId) =>
    hostelPaymentOptions[hostelId] || [];

  const isHostelSelected = (hostelId) => selectedHostels[hostelId] || false;

  const getHostelPaymentType = (hostelId) => hostelPaymentTypes[hostelId] || "";

  const getHostelAmount = (hostelId) => hostelAmounts[hostelId] || "₹0";

  const handleHostelSelection = (hostelId, selected) => {
    setSelectedHostels((prev) => ({ ...prev, [hostelId]: selected }));

    if (!selected) {
      // Reset hostel related states
      setHostelPaymentTypes((prev) => ({ ...prev, [hostelId]: "" }));
      setHostelAmounts((prev) => ({ ...prev, [hostelId]: "₹0" }));
    }
  };

  const handleHostelPaymentSelect = (hostelId, option) => {
    setHostelPaymentTypes((prev) => ({ ...prev, [hostelId]: option.value }));
    setHostelAmounts((prev) => ({ ...prev, [hostelId]: `₹${option.price}` }));
    setOpenDropdown(null);
  };

  const calculateTotalAmount = () => {
    let total = 0;
    Object.keys(selectedHostels).forEach((hostelId) => {
      if (selectedHostels[hostelId] && hostelAmounts[hostelId]) {
        const amount = parseInt(
          hostelAmounts[hostelId].replace("₹", "") || "0"
        );
        total += amount;
      }
    });
    return `₹${total}`;
  };

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Validation function
  const validateForm = () => {
    // Check if at least one hostel service is selected
    const hasSelectedHostel = Object.values(selectedHostels).some(
      (selected) => selected
    );
    if (!hasSelectedHostel) {
      Alert.alert(
        "Validation Error",
        "Please select at least one hostel service"
      );
      return false;
    }

    // Validate each selected hostel has payment type
    for (const hostelId of Object.keys(selectedHostels)) {
      if (selectedHostels[hostelId] && !getHostelPaymentType(hostelId)) {
        const hostel = getHostelById(hostelId);
        Alert.alert(
          "Validation Error",
          `Please select payment type for ${hostel?.name || "selected service"}`
        );
        return false;
      }
    }

    // Validate payment option
    if (!selectedPaymentOption) {
      Alert.alert("Validation Error", "Please select a payment method");
      return false;
    }

    return true;
  };

  // Payment Processing (same as membership screen)
  const handlePayment = async () => {
    setIsPaymentProcessing(true);
    try {
      let token;
      try {
        token = await AsyncStorage.getItem("userToken");
      } catch (storageError) {
        console.error("AsyncStorage error:", storageError);
        Alert.alert(
          "Error",
          "Unable to access device storage. Please try again."
        );
        return;
      }

      if (!token) {
        Alert.alert(
          "Error",
          "Authentication token not found. Please login again."
        );
        return;
      }

      const serviceDetails = {};

      // Build service details for each selected hostel service
      Object.keys(selectedHostels).forEach((hostelId) => {
        if (selectedHostels[hostelId]) {
          const hostel = getHostelById(hostelId);
          if (hostel) {
            serviceDetails[hostel.name.toLowerCase().replace(/\s+/g, "_")] = {
              payment_type: getHostelPaymentType(hostelId),
              amount: getHostelAmount(hostelId),
              duration: "Academic Year 2024-25",
            };
          }
        }
      });

      const paymentData = {
        total_amount: calculateTotalAmount(),
        payment_option: selectedPaymentOption,
        service_details: serviceDetails,
        transaction_id: `HOSTEL_${Date.now()}`,
        timestamp: new Date().toISOString(),
      };

      console.log("Processing hostel & ID fee payment:", paymentData);

      // Navigate to payment gateway screen
      if (navigation && typeof navigation.navigate === "function") {
        navigation.navigate("PaymentGateway", {
          paymentData: paymentData,
        });
      }
      resetForm();
    } catch (error) {
      console.error("Payment processing error:", error);
      Alert.alert(
        "Payment Failed",
        "Failed to process payment. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  // Pay Now: submit application silently then proceed to payment (same as membership screen)
  const handlePayNow = async () => {
    // Validate inputs first
    if (!validateForm()) return;

    // Submit application silently (no alerts)
    setIsSubmitting(true);
    try {
      let token;
      try {
        token = await AsyncStorage.getItem("userToken");
      } catch (storageError) {
        console.error("AsyncStorage error:", storageError);
        Alert.alert(
          "Error",
          "Unable to access device storage. Please try again."
        );
        return;
      }

      if (!token) {
        Alert.alert(
          "Error",
          "Authentication token not found. Please login again."
        );
        return;
      }

      const utilityData = {};

      // Format data according to backend API specification
      Object.keys(selectedHostels).forEach((hostelId) => {
        if (selectedHostels[hostelId]) {
          const hostel = getHostelById(hostelId);
          if (hostel) {
            const paymentType = getHostelPaymentType(hostelId);
            const today = new Date();
            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1);

            // Map hostel names to expected backend format
            const hostelKey = hostel.name.toLowerCase().replace(/\s+/g, "_");
            utilityData[hostelKey] = {
              payment_type: paymentType,
              start_date: formatDate(today),
              end_date: formatDate(endDate),
              amount: getHostelAmount(hostelId),
            };
          }
        }
      });

      const requestData = {
        ...utilityData,
        payment_option: selectedPaymentOption,
        total_amount: calculateTotalAmount(),
        timestamp: new Date().toISOString(),
      };

      console.log(
        "Submitting hostel & ID fee application (silent):",
        requestData
      );

      // Call the actual API to submit utility request
      const response = await saveUtilityRequestAPI(requestData, token);

      if (response.success) {
        // After successful submission, immediately proceed to payment
        await handlePayment();
      } else {
        throw new Error(
          response.message || "Failed to submit hostel & ID fee form"
        );
      }
    } catch (error) {
      console.error("Pay now flow error:", error);
      Alert.alert(
        "Action Failed",
        error.message || "Could not proceed to payment. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedHostels({});
    setHostelAmounts({});
    setHostelPaymentTypes({});
    setSelectedPaymentOption("");
  };

  const renderHostelCards = () => {
    if (!hostelData || !hostelData.utility_list) {
      return null;
    }

    return hostelData.utility_list.map((hostel) => (
      <View
        key={hostel.id}
        style={[styles.serviceSection, { backgroundColor: 'rgba(255,255,255,0.75)', zIndex: openDropdown === hostel.id ? 100 : 1 }]}
      >
        {/* Hostel Header */}
        <View style={styles.sectionHeader}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() =>
              handleHostelSelection(hostel.id, !isHostelSelected(hostel.id))
            }
          >
            <View
              style={[
                styles.checkbox,
                isHostelSelected(hostel.id) && styles.checkboxChecked,
              ]}
            >
              {isHostelSelected(hostel.id) && (
                <Ionicons name="checkmark" size={18} color="white" />
              )}
            </View>
            <Text style={[styles.serviceTitle, { color: colors.text }]}>
              {hostel.name}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Payment Type Dropdown - Always show */}
        <View style={styles.inputSection}>
          <Text style={[styles.label, { color: colors.text }]}>
            Payment Type *
          </Text>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
                !isHostelSelected(hostel.id) && styles.pickerButtonDisabled,
                openDropdown === hostel.id && styles.pickerButtonOpen,
              ]}
              onPress={() => {
                if (isHostelSelected(hostel.id)) {
                  setOpenDropdown(
                    openDropdown === hostel.id ? null : hostel.id
                  );
                }
              }}
              disabled={!isHostelSelected(hostel.id)}
            >
              <Text
                style={[
                  styles.pickerButtonText,
                  {
                    color: isHostelSelected(hostel.id)
                      ? colors.text
                      : colors.textTertiary,
                  },
                  !isHostelSelected(hostel.id) &&
                    styles.pickerButtonTextDisabled,
                ]}
              >
                {isHostelSelected(hostel.id) && getHostelPaymentType(hostel.id)
                  ? getHostelPaymentOptions(hostel.id).find(
                      (opt) => opt.value === getHostelPaymentType(hostel.id)
                    )?.text || "Select Payment Type"
                  : "Select Payment Type"}
              </Text>
              <Ionicons
                name={
                  openDropdown === hostel.id ? "chevron-up" : "chevron-down"
                }
                size={20}
                color={
                  isHostelSelected(hostel.id)
                    ? colors.text
                    : colors.textTertiary
                }
              />
            </TouchableOpacity>

            {/* Dropdown Menu */}
            {openDropdown === hostel.id && isHostelSelected(hostel.id) && (
              <View
                style={[
                  styles.dropdownMenu,
                  { backgroundColor: colors.surface, borderColor: '#E8E6F0' },
                ]}
              >
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {getHostelPaymentOptions(hostel.id).map((option) => {
                    const isSelected = getHostelPaymentType(hostel.id) === option.value;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.dropdownItem,
                          isSelected && { backgroundColor: '#EEF0FF' },
                        ]}
                        onPress={() => handleHostelPaymentSelect(hostel.id, option)}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            { color: colors.text },
                            isSelected && { fontWeight: '600' },
                          ]}
                        >
                          {option.text}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={18} color="#6C63FF" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* Amount Display - Show when payment type is selected */}
        {isHostelSelected(hostel.id) && getHostelPaymentType(hostel.id) && (
          <View style={[styles.amountContainer, { backgroundColor: isDark ? colors.primaryContainer : "#dbeafe" }]}>
            <Text style={[styles.amountText, { color: isDark ? colors.onPrimaryContainer : "#1e40af" }]}>
              Amount: {getHostelAmount(hostel.id)}
            </Text>
          </View>
        )}

        {/* Department Details - Always show */}
        <View style={[styles.departmentDetails, { backgroundColor: isDark ? colors.surfaceVariant : "#f8fafc" }]}>
          <Text style={[styles.departmentTitle, { color: colors.text }]}>
            Department detail:
          </Text>
          <Text
            style={[styles.departmentText, { color: colors.textSecondary }]}
          >
            • Email: {hostel.user_email || "hostel@iimtrichy.ac.in"}
          </Text>
          <Text
            style={[styles.departmentText, { color: colors.textSecondary }]}
          >
            • Phone Number: {hostel.user_mobile || "3653747656"}
          </Text>
        </View>
      </View>
    ));
  };

  return (
    <ScreenWrapper>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: 'transparent',
            borderBottomColor: "transparent",
            paddingHorizontal: 16,
            paddingVertical: 15,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: colors.primaryContainer || '#EEF0FF', width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            {
              color: '#6C63FF',
              fontSize: 18,
            },
          ]}
        >
          Hostel & ID Fee
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingHorizontal: 16,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setOpenDropdown(null)}
          style={styles.scrollContent}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text
                style={[styles.loadingText, { color: colors.textSecondary }]}
              >
                Loading hostel & ID fee data...
              </Text>
            </View>
          ) : hostelData &&
            hostelData.utility_list &&
            hostelData.utility_list.length > 0 ? (
            <>
              {renderHostelCards()}

              {/* Payment Method Selection */}
              {Object.values(selectedHostels).some((selected) => selected) && (
                <View
                  style={[
                    styles.serviceSection,
                    { backgroundColor: 'rgba(255,255,255,0.75)' },
                  ]}
                >
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Choose Payment Method:
                  </Text>
                  <View style={styles.paymentOptionsContainer}>
                    {paymentProviders.map((provider) => (
                      <TouchableOpacity
                        key={provider.id}
                        style={[
                          styles.paymentOption,
                          {
                            backgroundColor: isDark ? colors.surface : "#f9fafb",
                            borderColor: isDark ? colors.border : "#e5e7eb",
                          },
                          selectedPaymentOption === provider.value && [
                            styles.paymentOptionSelected,
                            { backgroundColor: isDark ? colors.primaryContainer : "#f3f4f6" }
                          ],
                        ]}
                        onPress={() => setSelectedPaymentOption(provider.value)}
                      >
                        <Ionicons
                          name={provider.icon}
                          size={24}
                          color="#6C63FF"
                        />
                        <Text
                          style={[
                            styles.paymentOptionText,
                            { color: colors.text },
                          ]}
                        >
                          {provider.text}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Pay Now Button */}
              {Object.values(selectedHostels).some((selected) => selected) &&
                selectedPaymentOption && (
                  <TouchableOpacity
                    style={[
                      styles.payButton,
                      selectedPaymentOption && styles.payButtonActive,
                      (isSubmitting || isPaymentProcessing) &&
                        styles.payButtonDisabled,
                    ]}
                    onPress={handlePayNow}
                    disabled={isSubmitting || isPaymentProcessing}
                  >
                    {isSubmitting || isPaymentProcessing ? (
                      <View style={styles.payButtonContent}>
                        <ActivityIndicator size="small" color="white" />
                        <Text style={styles.payButtonText}>
                          {isSubmitting ? "Submitting..." : "Processing..."}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.payButtonContent}>
                        <Ionicons name="card-outline" size={20} color="white" />
                        <Text style={styles.payButtonText}>
                          Pay Fee {calculateTotalAmount()}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}

              {/* Instructions */}
              <View style={[styles.instructionsContainer, { backgroundColor: isDark ? colors.surfaceVariant : "#f3f4f6" }]}>
                <Text
                  style={[
                    styles.instructionsText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Select your preferred hostel & ID fee services and payment
                  method, then click the payment amount to proceed directly to
                  payment.
                </Text>
              </View>
            </>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={48}
                color={colors.error}
              />
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
              <TouchableOpacity
                style={[
                  styles.retryButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={fetchHostelAndIdFeeData}
              >
                <Text
                  style={[styles.retryButtonText, { color: colors.surface }]}
                >
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <Text
                style={[styles.noDataText, { color: colors.textSecondary }]}
              >
                No hostel & ID fee services available
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    paddingVertical: 20,
  },
  scrollContent: {
    flex: 1,
  },
  serviceSection: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 6,
    shadowColor: "#4C1D95",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  sectionHeader: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EEF8",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 8,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E8E6F0",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#6C63FF",
    borderColor: "#6C63FF",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 16,
  },
  serviceTitle: {
    fontWeight: "600",
    marginLeft: 12,
    fontSize: 18,
  },
  inputSection: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E6F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#F8F7FF",
  },
  pickerButtonText: {
    color: "#1A1A2E",
    flex: 1,
    fontSize: 14,
  },
  pickerButtonDisabled: {
    backgroundColor: "#F8F7FF",
    borderColor: "#e5e7eb",
  },
  pickerButtonTextDisabled: {
    color: "#9ca3af",
  },
  pickerButtonOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: "#6C63FF",
  },
  dropdownContainer: {
    position: "relative",
    zIndex: 999,
  },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#E8E6F0",
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    maxHeight: 220,
    elevation: 20,
    shadowColor: "#4C1D95",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 9999,
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EEF8",
  },
  dropdownItemSelected: {
    backgroundColor: "#EEF0FF",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#1A1A2E",
    flex: 1,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  amountText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e40af",
  },
  departmentDetails: {
    padding: 12,
    borderRadius: 8,
  },
  departmentTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  departmentText: {
    fontSize: 12,
    marginBottom: 4,
  },
  paymentOptionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 25,
    borderWidth: 1,
    minWidth: 120,
    justifyContent: "center",
  },
  paymentOptionSelected: {
    borderColor: "#6C63FF",
  },
  paymentOptionText: {
    marginLeft: 8,
    fontWeight: "500",
  },
  payButton: {
    backgroundColor: "#6b7280",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#4C1D95",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  payButtonActive: {
    backgroundColor: "#10b981",
    shadowColor: "#10b981",
    shadowOpacity: 0.3,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  payButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  instructionsContainer: {
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  instructionsText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 16,
    textAlign: "center",
  },
});
