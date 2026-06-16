import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../contexts/ThemeContext";
import ScreenWrapper from '../components/ScreenWrapper';
import {
  getUtilityAmountAPI,
  saveUtilityRequestAPI,
  getDashboardDataAPI,
} from "../services/api";

const { width } = Dimensions.get("window");

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

// Date calculation utility function
const calculateMembershipDates = (startDate, paymentType, months = 1) => {
  const start = new Date(startDate);
  let end = new Date(startDate);

  // Normalize payment type to handle different formats
  const normalizedPaymentType = paymentType.toLowerCase();

  if (normalizedPaymentType.includes("daily")) {
    // End at 11:59:59 PM of the same day
    end.setHours(23, 59, 59, 999);
  } else if (normalizedPaymentType.includes("monthly")) {
    // Move ahead by `months`
    end.setMonth(end.getMonth() + months);
    // Set to last day of that month
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
  } else if (
    normalizedPaymentType.includes("annual") ||
    normalizedPaymentType.includes("yearly")
  ) {
    // Academic year logic: 12 full months, ending on last day of previous month
    const tmp = new Date(start);
    tmp.setMonth(tmp.getMonth() + 12);
    tmp.setDate(0);
    tmp.setHours(23, 59, 59, 999);
    end = tmp;
  } else {
    // Default to daily
    end.setHours(23, 59, 59, 999);
  }

  return { startDate: start, endDate: end };
};

export default function SubscribeMembershipScreen({ navigation }) {
  const { width: screenWidth } = Dimensions.get("window") || { width: 375 };
  const { colors, isDark } = useTheme();

  // Payment Option State
  const [selectedPaymentOption, setSelectedPaymentOption] = useState("");

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

  // Date Picker State (for dynamic utilities)
  const [showDatePicker, setShowDatePicker] = useState({
    utilityId: null,
    type: null,
  });
  const [tempPickerDate, setTempPickerDate] = useState(new Date());
  const [showPaymentPicker, setShowPaymentPicker] = useState({
    utilityId: null,
    show: false,
  });
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showMonthPicker, setShowMonthPicker] = useState({
    utilityId: null,
    show: false,
  });

  // Dynamic utility selection state
  const [selectedUtilities, setSelectedUtilities] = useState({});
  const [utilityAmounts, setUtilityAmounts] = useState({});
  const [utilityPaymentTypes, setUtilityPaymentTypes] = useState({});
  const [utilityStartDates, setUtilityStartDates] = useState({});
  const [utilityEndDates, setUtilityEndDates] = useState({});
  const [utilityMonths, setUtilityMonths] = useState({});
  const [utilityAmountLoading, setUtilityAmountLoading] = useState({});

  // Dynamic utility data state
  const [loading, setLoading] = useState(true);
  const [utilities, setUtilities] = useState([]);
  const [utilityPaymentOptions, setUtilityPaymentOptions] = useState({});

  const paymentProviders = [
    { id: 1, value: "kotak", text: "Kotak Bank", icon: "card-outline" },
    { id: 2, value: "icici", text: "ICICI Bank", icon: "card-outline" },
  ];

  // Helper functions for dynamic utilities
  const getUtilityById = (id) => utilities.find((utility) => utility.id === id);

  const getUtilityPaymentOptions = (utilityId) =>
    utilityPaymentOptions[utilityId] || [];

  const isUtilitySelected = (utilityId) =>
    selectedUtilities[utilityId] || false;

  const getUtilityAmount = (utilityId) => utilityAmounts[utilityId] || "₹0";

  const getUtilityPaymentType = (utilityId) =>
    utilityPaymentTypes[utilityId] || "";

  const getUtilityStartDate = (utilityId) =>
    utilityStartDates[utilityId] || new Date();

  const getUtilityEndDate = (utilityId) =>
    utilityEndDates[utilityId] || new Date();

  const getUtilityMonths = (utilityId) => utilityMonths[utilityId] || 1;

  // Month options (1-12 months)
  const monthOptions = Array.from({ length: 11 }, (_, i) => ({
    id: i + 1,
    value: i + 1,
    text: `${i + 1}`,
  }));

  // API Integration Functions
  const formatDateForAPI = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const fetchUtilityAmount = async (
    utilityId,
    subUtility,
    months = 1,
    startDate = null,
    endDate = null
  ) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      // Format dates for API if provided
      const formattedStartDate = startDate ? formatDateForAPI(startDate) : null;
      const formattedEndDate = endDate ? formatDateForAPI(endDate) : null;

      const response = await getUtilityAmountAPI(
        token,
        subUtility,
        months,
        formattedStartDate,
        formattedEndDate,
        "student", // membership type
        utilityId // utility service ID
      );

      if (response.success) {
        return parseInt(response.amount || response.price || 0);
      } else {
        throw new Error(response.message || "Failed to fetch utility amount");
      }
    } catch (error) {
      console.error("Fetch utility amount error:", error);
      throw error;
    }
  };

  // Helper Functions
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const calculateTotalAmount = () => {
    let total = 0;

    Object.keys(selectedUtilities).forEach((utilityId) => {
      if (selectedUtilities[utilityId] && utilityAmounts[utilityId]) {
        const amount = parseInt(
          utilityAmounts[utilityId].replace("₹", "") || "0"
        );
        total += amount;
      }
    });

    return `₹${total}`;
  };

  // Event Handlers for Dynamic Utilities
  const handleUtilitySelection = (utilityId, selected) => {
    setSelectedUtilities((prev) => ({ ...prev, [utilityId]: selected }));

    if (!selected) {
      // Reset utility related states
      setUtilityPaymentTypes((prev) => ({ ...prev, [utilityId]: "" }));
      setUtilityAmounts((prev) => ({ ...prev, [utilityId]: "₹0" }));
      setUtilityStartDates((prev) => ({ ...prev, [utilityId]: new Date() }));
      setUtilityEndDates((prev) => ({ ...prev, [utilityId]: new Date() }));
      setUtilityMonths((prev) => ({ ...prev, [utilityId]: 1 }));
    } else {
      // Initialize with default values
      const today = new Date();
      setUtilityStartDates((prev) => ({ ...prev, [utilityId]: today }));
      setUtilityEndDates((prev) => ({ ...prev, [utilityId]: today }));
      setUtilityMonths((prev) => ({ ...prev, [utilityId]: 1 }));
    }

    setErrors({ ...errors, general: "" });
  };

  // Handle start date change and recalculate end date
  const handleUtilityStartDateChange = (utilityId, newStartDate) => {
    setUtilityStartDates((prev) => ({ ...prev, [utilityId]: newStartDate }));

    const paymentType = getUtilityPaymentType(utilityId);
    if (paymentType) {
      const months = getUtilityMonths(utilityId);
      const { startDate, endDate } = calculateMembershipDates(
        newStartDate,
        paymentType,
        months
      );
      setUtilityEndDates((prev) => ({ ...prev, [utilityId]: endDate }));
    }
  };

  // Handle month change for monthly payments
  const handleUtilityMonthChange = async (utilityId, newMonths) => {
    setUtilityMonths((prev) => ({ ...prev, [utilityId]: newMonths }));

    const paymentType = getUtilityPaymentType(utilityId);
    const startDate = getUtilityStartDate(utilityId);

    if (paymentType && paymentType.toLowerCase().includes("monthly")) {
      const { startDate: calcStart, endDate } = calculateMembershipDates(
        startDate,
        paymentType,
        newMonths
      );
      setUtilityEndDates((prev) => ({ ...prev, [utilityId]: endDate }));

      // Recalculate amount with new month count
      const options = getUtilityPaymentOptions(utilityId);
      const option = options.find((opt) => opt.value === paymentType);
      if (option) {
        try {
          setUtilityAmountLoading((prev) => ({ ...prev, [utilityId]: true }));
          const amount = await fetchUtilityAmount(
            utilityId,
            option.apiValue,
            newMonths,
            startDate,
            endDate
          );
          setUtilityAmounts((prev) => ({ ...prev, [utilityId]: `₹${amount}` }));
        } catch (error) {
          console.error(`Utility ${utilityId} amount update error:`, error);
          setUtilityAmounts((prev) => ({ ...prev, [utilityId]: "₹0" }));

          const utility = getUtilityById(utilityId);
          const utilityName = utility ? utility.name : "utility";
          Alert.alert(
            "Error",
            `Failed to fetch ${utilityName} amount. Please try again.`
          );
        } finally {
          setUtilityAmountLoading((prev) => ({ ...prev, [utilityId]: false }));
        }
      }
    }
  };

  const handleUtilityPaymentSelect = async (utilityId, option) => {
    // Immediately update UI for better UX
    setUtilityPaymentTypes((prev) => ({ ...prev, [utilityId]: option.value }));
    setErrors({ ...errors, [`utility_${utilityId}_paymentType`]: "" });

    // Reset months to 1 when changing payment type
    if (!option.value.toLowerCase().includes("monthly")) {
      setUtilityMonths((prev) => ({ ...prev, [utilityId]: 1 }));
    }

    const currentStartDate = getUtilityStartDate(utilityId);
    const currentMonths = getUtilityMonths(utilityId);

    // Use the new date calculation utility
    const months = option.value.toLowerCase().includes("monthly")
      ? currentMonths
      : 1;
    const { startDate, endDate } = calculateMembershipDates(
      currentStartDate,
      option.value,
      months
    );

    setUtilityEndDates((prev) => ({ ...prev, [utilityId]: endDate }));

    // Fetch amount from API
    try {
      setUtilityAmountLoading((prev) => ({ ...prev, [utilityId]: true }));
      const months = option.value.toLowerCase().includes("monthly")
        ? currentMonths
        : 1;
      const amount = await fetchUtilityAmount(
        utilityId,
        option.apiValue,
        months,
        currentStartDate,
        endDate
      );
      setUtilityAmounts((prev) => ({ ...prev, [utilityId]: `₹${amount}` }));
    } catch (error) {
      console.error(`Utility ${utilityId} amount update error:`, error);
      setUtilityAmounts((prev) => ({ ...prev, [utilityId]: "₹0" }));

      const utility = getUtilityById(utilityId);
      const utilityName = utility ? utility.name : "utility";
      Alert.alert(
        "Error",
        `Failed to fetch ${utilityName} amount. Please try again.`
      );
    } finally {
      setUtilityAmountLoading((prev) => ({ ...prev, [utilityId]: false }));
    }
  };

  // Form Validation
  const validateForm = () => {
    const newErrors = {};

    // Check if at least one service is selected
    const hasSelectedUtility = Object.values(selectedUtilities).some(
      (selected) => selected
    );
    if (!hasSelectedUtility) {
      newErrors.general = "Please select at least one utility service";
    }

    // Validate each selected utility
    Object.keys(selectedUtilities).forEach((utilityId) => {
      if (selectedUtilities[utilityId]) {
        const utility = getUtilityById(utilityId);
        const utilityName = utility ? utility.name : `Utility ${utilityId}`;

        if (!getUtilityPaymentType(utilityId)) {
          newErrors[
            `utility_${utilityId}_paymentType`
          ] = `Please select a payment type for ${utilityName}`;
        }

        const startDate = getUtilityStartDate(utilityId);
        const endDate = getUtilityEndDate(utilityId);
        if (endDate <= startDate) {
          newErrors[
            `utility_${utilityId}_endDate`
          ] = `End date must be after start date for ${utilityName}`;
        }
      }
    });

    // Validate payment option
    if (hasSelectedUtility && !selectedPaymentOption) {
      newErrors.paymentOption = "Please select a payment method";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Payment Processing
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

      // Build service details for each selected utility
      Object.keys(selectedUtilities).forEach((utilityId) => {
        if (selectedUtilities[utilityId]) {
          const utility = getUtilityById(utilityId);
          if (utility) {
            serviceDetails[utility.name.toLowerCase().replace(/\s+/g, "_")] = {
              payment_type: getUtilityPaymentType(utilityId),
              amount: getUtilityAmount(utilityId),
              duration: `${formatDate(
                getUtilityStartDate(utilityId)
              )} to ${formatDate(getUtilityEndDate(utilityId))}`,
            };
          }
        }
      });

      const paymentData = {
        total_amount: calculateTotalAmount(),
        payment_option: selectedPaymentOption,
        service_details: serviceDetails,
        transaction_id: `UTL_${Date.now()}`,
        timestamp: new Date().toISOString(),
      };

      console.log("Processing payment:", paymentData);

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

  // Pay Now: submit application silently then proceed to payment
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
      Object.keys(selectedUtilities).forEach((utilityId) => {
        if (selectedUtilities[utilityId]) {
          const utility = getUtilityById(utilityId);
          if (utility) {
            const paymentType = getUtilityPaymentType(utilityId);

            // Map utility names to expected backend format
            if (utility.name === "Swimming Pool Membership") {
              utilityData.swimming_pool = {
                payment_type: paymentType,
                start_date: formatDate(getUtilityStartDate(utilityId)),
                end_date: formatDate(getUtilityEndDate(utilityId)),
                amount: getUtilityAmount(utilityId),
                months:
                  paymentType === "monthly"
                    ? getUtilityMonths(utilityId)
                    : undefined,
              };
            } else if (utility.name === "GYM Membership") {
              utilityData.gym = {
                payment_type: paymentType,
                start_date: formatDate(getUtilityStartDate(utilityId)),
                end_date: formatDate(getUtilityEndDate(utilityId)),
                amount: getUtilityAmount(utilityId),
                months:
                  paymentType === "monthly"
                    ? getUtilityMonths(utilityId)
                    : undefined,
              };
            }
          }
        }
      });

      const requestData = {
        ...utilityData,
        payment_option: selectedPaymentOption,
        total_amount: calculateTotalAmount(),
        timestamp: new Date().toISOString(),
      };

      console.log("Submitting application (silent):", requestData);

      // Call the actual API to submit utility request
      const response = await saveUtilityRequestAPI(requestData, token);

      if (response.success) {
        // After successful submission, immediately proceed to payment
        await handlePayment();
      } else {
        throw new Error(response.message || "Failed to submit utility form");
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
    setSelectedUtilities({});
    setUtilityAmounts({});
    setUtilityPaymentTypes({});
    setUtilityStartDates({});
    setUtilityEndDates({});
    setUtilityMonths({});
    setUtilityAmountLoading({});
    setSelectedPaymentOption("");
    setErrors({});
    setIsFormSubmitted(false);
  };

  const fetchUtilities = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await getDashboardDataAPI(token);

      if (response.success && response.data && response.data.utility_list) {
        const utilityList = response.data.utility_list;
        console.log("Utility List:", utilityList);
        setUtilities(utilityList);

        // Parse payment options for each utility
        const paymentOptionsMap = {};
        utilityList.forEach((utility) => {
          try {
            let subUtilityDetails;
            if (typeof utility.sub_utility_details === "string") {
              subUtilityDetails = utility.sub_utility_details.trim()
                ? JSON.parse(utility.sub_utility_details)
                : [];
            } else {
              subUtilityDetails = utility.sub_utility_details || [];
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

            paymentOptionsMap[utility.id] = options;
          } catch (error) {
            console.error(
              `Error parsing sub_utility_details for utility ${utility.id}:`,
              error
            );
            paymentOptionsMap[utility.id] = [];
          }
        });

        setUtilityPaymentOptions(paymentOptionsMap);
        setLoading(false);
      } else {
        console.log("API Response structure issue:", response);
        // Set empty utilities if no utility_list found
        setUtilities([]);
        setUtilityPaymentOptions({});
        setLoading(false);
      }
    } catch (err) {
      console.error("API Error:", err);
      setUtilities([]);
      setUtilityPaymentOptions({});
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUtilities();
  }, []);

  return (
    <ScreenWrapper>
      <StatusBar style={isDark ? "light" : "dark"} />
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: 'transparent',
            borderBottomColor: "transparent",
            paddingHorizontal: getResponsivePadding(16, screenWidth),
            paddingVertical: getResponsivePadding(15, screenWidth),
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
              fontSize: getResponsiveSize(18, screenWidth),
            },
          ]}
        >
          Subscribe Membership
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingHorizontal: getResponsivePadding(16, screenWidth),
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
                Loading utilities...
              </Text>
            </View>
          ) : utilities && utilities.length > 0 ? (
            utilities.map((utility) => (
              <View
                key={utility.id}
                style={[
                  styles.serviceSection,
                  {
                    backgroundColor: 'rgba(255,255,255,0.75)',
                    padding: getResponsivePadding(20, screenWidth),
                    marginBottom: 16,
                    zIndex: openDropdown === utility.id ? 100 : 1,
                  },
                ]}
              >
                {/* Utility Header */}
                <View style={styles.sectionHeader}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() =>
                      handleUtilitySelection(
                        utility.id,
                        !isUtilitySelected(utility.id)
                      )
                    }
                  >
                    <View
                      style={[
                        styles.checkbox,
                        isUtilitySelected(utility.id) && styles.checkboxChecked,
                      ]}
                    >
                      {isUtilitySelected(utility.id) && (
                        <Ionicons name="checkmark" size={18} color="white" />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.serviceTitle,
                        {
                          color: colors.text,
                          fontSize: getResponsiveSize(18, screenWidth),
                        },
                      ]}
                    >
                      {utility.name}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Always show Payment Type dropdown, but other fields only when selected */}
                <View style={styles.inputSection}>
                  <Text
                    style={[
                      styles.label,
                      {
                        color: colors.text,
                        fontSize: getResponsiveSize(14, screenWidth),
                      },
                    ]}
                  >
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
                        !isUtilitySelected(utility.id) &&
                          styles.pickerButtonDisabled,
                        errors[`utility_${utility.id}_paymentType`] &&
                          styles.inputError,
                        openDropdown === utility.id && styles.pickerButtonOpen,
                      ]}
                      onPress={() => {
                        if (isUtilitySelected(utility.id)) {
                          setOpenDropdown(
                            openDropdown === utility.id ? null : utility.id
                          );
                        }
                      }}
                      disabled={!isUtilitySelected(utility.id)}
                    >
                      <Text
                        style={[
                          styles.pickerButtonText,
                          {
                            color: isUtilitySelected(utility.id)
                              ? colors.text
                              : colors.textTertiary,
                          },
                          !isUtilitySelected(utility.id) &&
                            styles.pickerButtonTextDisabled,
                          { fontSize: getResponsiveSize(14, screenWidth) },
                        ]}
                      >
                        {isUtilitySelected(utility.id) &&
                        getUtilityPaymentType(utility.id)
                          ? getUtilityPaymentOptions(utility.id).find(
                              (opt) =>
                                opt.value === getUtilityPaymentType(utility.id)
                            )?.text || "Select Payment Type"
                          : "Select Payment Type"}
                      </Text>
                      <Ionicons
                        name={
                          openDropdown === utility.id
                            ? "chevron-up"
                            : "chevron-down"
                        }
                        size={20}
                        color={
                          isUtilitySelected(utility.id)
                            ? colors.text
                            : colors.textTertiary
                        }
                      />
                    </TouchableOpacity>

                    {/* Dropdown Menu */}
                    {openDropdown === utility.id &&
                      isUtilitySelected(utility.id) && (
                        <View
                          style={[
                            styles.dropdownMenu,
                            { backgroundColor: colors.surface, borderColor: colors.border },
                          ]}
                        >
                          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {getUtilityPaymentOptions(utility.id).map((option) => {
                              const isSelected = getUtilityPaymentType(utility.id) === option.value;
                              return (
                                <TouchableOpacity
                                  key={option.id}
                                  style={[
                                    styles.dropdownItem,
                                    isSelected && { backgroundColor: colors.primaryContainer },
                                  ]}
                                  onPress={() => {
                                    handleUtilityPaymentSelect(utility.id, option);
                                    setOpenDropdown(null);
                                  }}
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
                  {errors[`utility_${utility.id}_paymentType`] && (
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {errors[`utility_${utility.id}_paymentType`]}
                    </Text>
                  )}
                </View>

                {/* Show advanced fields only when utility is selected */}
                {isUtilitySelected(utility.id) && (
                  <>
                    {/* Service Duration - only show when payment type is selected */}
                    {getUtilityPaymentType(utility.id) && (
                      <View style={styles.inputSection}>
                        <Text
                          style={[
                            styles.label,
                            {
                              fontSize: getResponsiveSize(14, screenWidth),
                              color: colors.text,
                            },
                          ]}
                        >
                          Service Duration
                        </Text>
                        <View style={styles.dateRow}>
                          <View style={styles.dateColumn}>
                            <Text
                              style={[
                                styles.dateLabel,
                                {
                                  fontSize: getResponsiveSize(12, screenWidth),
                                  color: colors.textSecondary,
                                },
                              ]}
                            >
                              Start Date
                            </Text>
                            <TouchableOpacity
                              style={[
                                styles.dateButton,
                                {
                                  backgroundColor: colors.surface,
                                  borderColor: colors.border,
                                },
                              ]}
                              onPress={() => {
                                setTempPickerDate(getUtilityStartDate(utility.id));
                                setShowDatePicker({
                                  utilityId: utility.id,
                                  type: "start",
                                });
                              }}
                            >
                              <Text
                                style={[
                                  styles.dateButtonText,
                                  {
                                    fontSize: getResponsiveSize(
                                      14,
                                      screenWidth
                                    ),
                                    color: colors.text,
                                  },
                                ]}
                              >
                                {formatDate(getUtilityStartDate(utility.id))}
                              </Text>
                              <Ionicons
                                name="calendar-outline"
                                size={20}
                                color="#6C63FF"
                              />
                            </TouchableOpacity>
                          </View>
                          <View style={styles.dateColumn}>
                            <Text
                              style={[
                                styles.dateLabel,
                                {
                                  fontSize: getResponsiveSize(12, screenWidth),
                                  color: colors.textSecondary,
                                },
                              ]}
                            >
                              End Date
                            </Text>
                            <TouchableOpacity
                              style={[
                                styles.dateButton,
                                {
                                  backgroundColor: colors.surface,
                                  borderColor: colors.border,
                                },
                              ]}
                              onPress={() => {
                                // End date is auto-calculated, so make it read-only
                                // Could show a tooltip or info message
                              }}
                            >
                              <Text
                                style={[
                                  styles.dateButtonText,
                                  {
                                    fontSize: getResponsiveSize(
                                      14,
                                      screenWidth
                                    ),
                                    color: colors.text,
                                  },
                                ]}
                              >
                                {formatDate(getUtilityEndDate(utility.id))}
                              </Text>
                              <Ionicons
                                name="calendar-outline"
                                size={20}
                                color="#6C63FF"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Month Selection for Monthly Payments */}
                    {getUtilityPaymentType(utility.id) &&
                      getUtilityPaymentType(utility.id)
                        .toLowerCase()
                        .includes("monthly") && (
                        <View style={styles.inputSection}>
                          <Text
                            style={[
                              styles.label,
                              {
                                fontSize: getResponsiveSize(14, screenWidth),
                                color: colors.text,
                              },
                            ]}
                          >
                            Number of Months (1-11) *
                          </Text>
                          <View style={styles.dropdownContainer}>
                            <TouchableOpacity
                              style={[
                                styles.pickerButton,
                                {
                                  backgroundColor: colors.surface,
                                  borderColor: colors.border,
                                },
                                openDropdown === `months_${utility.id}` &&
                                  styles.pickerButtonOpen,
                              ]}
                              onPress={() => {
                                setShowMonthPicker({
                                  utilityId: utility.id,
                                  show: true,
                                });
                              }}
                            >
                              <Text
                                style={[
                                  styles.pickerButtonText,
                                  {
                                    fontSize: getResponsiveSize(
                                      14,
                                      screenWidth
                                    ),
                                    color: colors.text,
                                  },
                                ]}
                              >
                                {getUtilityMonths(utility.id)} Month
                                {getUtilityMonths(utility.id) > 1 ? "s" : ""}
                              </Text>
                              <Ionicons
                                name="chevron-down"
                                size={20}
                                color={colors.textSecondary}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                    {/* Amount Display */}
                    {getUtilityPaymentType(utility.id) && (
                      <View
                        style={[
                          styles.amountContainer,
                          {
                            padding: getResponsivePadding(16, screenWidth),
                          },
                        ]}
                      >
                        {utilityAmountLoading[utility.id] ? (
                          <View style={styles.amountLoading}>
                            <ActivityIndicator size="small" color="#6C63FF" />
                            <Text
                              style={[
                                styles.amountLoadingText,
                                {
                                  fontSize: getResponsiveSize(14, screenWidth),
                                },
                              ]}
                            >
                              Calculating...
                            </Text>
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.amountText,
                              { fontSize: getResponsiveSize(18, screenWidth) },
                            ]}
                          >
                            Amount: {getUtilityAmount(utility.id)}
                          </Text>
                        )}
                      </View>
                    )}
                  </>
                )}

                {/* Department Details - Always show */}
                <View style={styles.departmentDetails}>
                  <Text
                    style={[
                      styles.departmentTitle,
                      { fontSize: getResponsiveSize(14, screenWidth) },
                    ]}
                  >
                    Department detail:
                  </Text>
                  <Text
                    style={[
                      styles.departmentText,
                      { fontSize: getResponsiveSize(12, screenWidth) },
                    ]}
                  >
                    • Email: membership@iimtrichy.ac.in
                  </Text>
                  <Text
                    style={[
                      styles.departmentText,
                      { fontSize: getResponsiveSize(12, screenWidth) },
                    ]}
                  >
                    • Phone Number: 3653747656
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noUtilitiesContainer}>
              <Text
                style={[
                  styles.noUtilitiesText,
                  { color: colors.textSecondary },
                ]}
              >
                No utilities available
              </Text>
            </View>
          )}

          {/* Payment Method Selection */}
          {Object.values(selectedUtilities).some((selected) => selected) && (
            <View
              style={[
                styles.serviceSection,
                {
                  backgroundColor: 'rgba(255,255,255,0.75)',
                  padding: getResponsivePadding(20, screenWidth),
                  marginBottom: 16,
                },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    fontSize: getResponsiveSize(16, screenWidth),
                    color: colors.text,
                  },
                ]}
              >
                Choose Payment Method:
              </Text>

              <View style={styles.paymentOptionsContainer}>
                {paymentProviders.map((provider) => (
                  <TouchableOpacity
                    key={provider.id}
                    style={[
                      styles.paymentOption,
                      selectedPaymentOption === provider.value &&
                        styles.paymentOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedPaymentOption(provider.value);
                      setErrors({ ...errors, paymentOption: "" });
                    }}
                  >
                    <Ionicons name={provider.icon} size={24} color="#6C63FF" />
                    <Text
                      style={[
                        styles.paymentOptionText,
                        { fontSize: getResponsiveSize(14, screenWidth) },
                      ]}
                    >
                      {provider.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {errors.paymentOption && (
                <Text style={styles.errorText}>{errors.paymentOption}</Text>
              )}
            </View>
          )}

          {/* Pay Now Button */}
          {Object.values(selectedUtilities).some((selected) => selected) &&
            selectedPaymentOption && (
              <TouchableOpacity
                style={[
                  styles.payButton,
                  selectedPaymentOption && styles.payButtonActive, // Green when payment option selected
                  {
                    marginHorizontal: getResponsivePadding(16, screenWidth),
                    marginBottom: getResponsivePadding(20, screenWidth),
                  },
                  (isSubmitting || isPaymentProcessing) &&
                    styles.payButtonDisabled,
                ]}
                onPress={handlePayNow}
                disabled={isSubmitting || isPaymentProcessing}
              >
                {isSubmitting || isPaymentProcessing ? (
                  <View style={styles.payButtonContent}>
                    <ActivityIndicator size="small" color="white" />
                    <Text
                      style={[
                        styles.payButtonText,
                        { fontSize: getResponsiveSize(16, screenWidth) },
                      ]}
                    >
                      Processing...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.payButtonContent}>
                    <Ionicons name="card-outline" size={20} color="white" />
                    <Text
                      style={[
                        styles.payButtonText,
                        { fontSize: getResponsiveSize(16, screenWidth) },
                      ]}
                    >
                      Pay Fee {calculateTotalAmount()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

          {/* Instructions */}
          {!loading && (
            <View
              style={[
                styles.instructionsContainer,
                {
                  marginHorizontal: getResponsivePadding(16, screenWidth),
                  marginBottom: getResponsivePadding(20, screenWidth),
                },
              ]}
            >
              <Text
                style={[
                  styles.instructionsText,
                  { fontSize: getResponsiveSize(12, screenWidth) },
                ]}
              >
                Select your preferred membership and payment method, then click
                the payment amount to proceed directly to payment. Your
                application will be submitted automatically.
              </Text>
            </View>
          )}

          {/* General Error Display */}
          {errors.general && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker */}
      {Platform.OS === 'ios' ? (
        <Modal visible={!!showDatePicker.utilityId} transparent animationType="slide">
          <View style={styles.dateModalOverlay}>
            <View style={[styles.dateModalContainer, { backgroundColor: colors.surface }]}>
              <View style={[styles.dateModalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowDatePicker({ utilityId: null, type: null })}>
                  <Text style={[styles.dateModalCancel, { color: colors.textTertiary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.dateModalTitle, { color: colors.text }]}>Select Date</Text>
                <TouchableOpacity onPress={() => {
                  if (showDatePicker.type === "start") {
                    handleUtilityStartDateChange(showDatePicker.utilityId, tempPickerDate);
                  }
                  setShowDatePicker({ utilityId: null, type: null });
                }}>
                  <Text style={[styles.dateModalDone, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempPickerDate}
                mode="date"
                display="inline"
                onChange={(event, selectedDate) => {
                  if (selectedDate) setTempPickerDate(selectedDate);
                }}
                minimumDate={new Date()}
                accentColor={colors.primary}
                themeVariant={isDark ? "dark" : "light"}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showDatePicker.utilityId && (
          <DateTimePicker
            value={getUtilityStartDate(showDatePicker.utilityId)}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker({ utilityId: null, type: null });
              if (selectedDate && showDatePicker.type === "start") {
                handleUtilityStartDateChange(showDatePicker.utilityId, selectedDate);
              }
            }}
            minimumDate={new Date()}
          />
        )
      )}

      {/* Month Picker Modal */}
      <Modal
        visible={showMonthPicker.show}
        transparent={true}
        animationType="slide"
        onRequestClose={() =>
          setShowMonthPicker({ utilityId: null, show: false })
        }
      >
        <TouchableOpacity
          style={styles.monthModalOverlay}
          activeOpacity={1}
          onPress={() => setShowMonthPicker({ utilityId: null, show: false })}
        >
          <TouchableOpacity
            style={styles.monthModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.monthModalHeader}>
              <Ionicons name="calendar-outline" size={24} color="#374151" />
              <Text style={styles.monthModalTitle}>Select Months</Text>
            </View>
            <ScrollView
              style={styles.monthModalScrollView}
              showsVerticalScrollIndicator={false}
            >
              {monthOptions.map((monthOption) => (
                <TouchableOpacity
                  key={monthOption.id}
                  style={[
                    styles.monthModalOption,
                    showMonthPicker.utilityId &&
                      getUtilityMonths(showMonthPicker.utilityId) ===
                        monthOption.value &&
                      styles.monthModalOptionSelected,
                  ]}
                  onPress={() => {
                    if (showMonthPicker.utilityId) {
                      handleUtilityMonthChange(
                        showMonthPicker.utilityId,
                        monthOption.value
                      );
                    }
                    setShowMonthPicker({ utilityId: null, show: false });
                  }}
                >
                  <Text
                    style={[
                      styles.monthModalOptionText,
                      showMonthPicker.utilityId &&
                        getUtilityMonths(showMonthPicker.utilityId) ===
                          monthOption.value &&
                        styles.monthModalOptionTextSelected,
                    ]}
                  >
                    {monthOption.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    fontWeight: "600",
    color: "#1A1A2E",
    marginLeft: 8,
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
    fontWeight: "500",
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E6F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#F8F7FF",
  },
  pickerButtonText: {
    color: "#1A1A2E",
    flex: 1,
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
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
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
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  dateColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderWidth: 1,
    borderColor: "#E8E6F0",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  dateButtonText: {
    fontSize: 14,
    color: "#1A1A2E",
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "#dbeafe",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  amountText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e40af",
  },
  amountLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  amountLoadingText: {
    marginLeft: 8,
    color: "#6C63FF",
  },
  departmentDetails: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  departmentTitle: {
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 8,
  },
  departmentText: {
    color: "#6b7280",
    marginBottom: 4,
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
  noUtilitiesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  noUtilitiesText: {
    fontSize: 16,
    textAlign: "center",
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
    borderColor: "#e5e7eb",
    backgroundColor: "#F8F7FF",
    minWidth: 120,
    justifyContent: "center",
  },
  paymentOptionSelected: {
    borderColor: "#6C63FF",
    backgroundColor: "#EEF0FF",
  },
  paymentOptionText: {
    marginLeft: 8,
    color: "#1A1A2E",
    fontWeight: "500",
  },
  payButton: {
    backgroundColor: "#6b7280", // Default gray color
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#4C1D95",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  payButtonActive: {
    backgroundColor: "#10b981", // Green color when payment option is selected
    shadowColor: "#10b981",
    shadowOpacity: 0.3,
  },
  payButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  payButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    marginLeft: 8,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  instructionsContainer: {
    backgroundColor: "#EEF0FF",
    padding: 16,
    borderRadius: 8,
  },
  instructionsText: {
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 18,
  },
  errorContainer: {
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    color: "#ef4444",
  },
  // Month Selection Modal Styles
  monthModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  monthModalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 350,
    maxHeight: "70%",
    elevation: 10,
    shadowColor: "#4C1D95",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  monthModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  monthModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginLeft: 8,
  },
  monthModalScrollView: {
    maxHeight: 400,
  },
  monthModalOption: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
  },
  monthModalOptionSelected: {
    backgroundColor: "#f0f9ff",
  },
  monthModalOptionText: {
    fontSize: 16,
    color: "#475569",
    fontWeight: "400",
  },
  monthModalOptionTextSelected: {
    color: "#1e40af",
    fontWeight: "500",
  },
  dateModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  dateModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
    paddingHorizontal: 12,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E6F0',
  },
  dateModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  dateModalCancel: {
    fontSize: 15,
    color: '#A0AEC0',
    fontWeight: '500',
  },
  dateModalDone: {
    fontSize: 15,
    color: '#6C63FF',
    fontWeight: '700',
  },
});
