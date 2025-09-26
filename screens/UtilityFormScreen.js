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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUtilityAmountAPI } from "../services/api";

const { width } = Dimensions.get('window');

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

const UtilityFormScreen = ({ navigation }) => {
  const { width: screenWidth } = Dimensions.get('window') || { width: 375 };
  
  // Swimming Pool Membership State
  const [swimmingPoolPaymentType, setSwimmingPoolPaymentType] = useState("");
  const [swimmingPoolStartDate, setSwimmingPoolStartDate] = useState(new Date());
  const [swimmingPoolEndDate, setSwimmingPoolEndDate] = useState(new Date());
  const [swimmingPoolAmount, setSwimmingPoolAmount] = useState("₹0");

  // GYM Membership State
  const [gymPaymentType, setGymPaymentType] = useState("");
  const [gymStartDate, setGymStartDate] = useState(new Date());
  const [gymEndDate, setGymEndDate] = useState(new Date());
  const [gymAmount, setGymAmount] = useState("₹0");
  

  // Payment Option State
  const [selectedPaymentOption, setSelectedPaymentOption] = useState("");

  // Service Selection State
  const [isSwimmingPoolSelected, setIsSwimmingPoolSelected] = useState(false);
  const [isGymSelected, setIsGymSelected] = useState(false);
  
  // Month Selection State (for monthly payments)
  const [swimmingPoolMonths, setSwimmingPoolMonths] = useState(1);
  const [gymMonths, setGymMonths] = useState(1);

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [isFormSubmitted, setIsFormSubmitted] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  
  // API Loading States
  const [isSwimmingPoolAmountLoading, setIsSwimmingPoolAmountLoading] = useState(false);
  const [isGymAmountLoading, setIsGymAmountLoading] = useState(false);
  
  // Date Picker State
  const [showSwimmingPoolStartDatePicker, setShowSwimmingPoolStartDatePicker] = useState(false);
  const [showSwimmingPoolEndDatePicker, setShowSwimmingPoolEndDatePicker] = useState(false);
  const [showGymStartDatePicker, setShowGymStartDatePicker] = useState(false);
  const [showGymEndDatePicker, setShowGymEndDatePicker] = useState(false);
  
  // Payment Type Picker State
  const [showSwimmingPoolPaymentPicker, setShowSwimmingPoolPaymentPicker] = useState(false);
  const [showGymPaymentPicker, setShowGymPaymentPicker] = useState(false);
  
  // Month Picker State
  const [showSwimmingPoolMonthPicker, setShowSwimmingPoolMonthPicker] = useState(false);
  const [showGymMonthPicker, setShowGymMonthPicker] = useState(false);

  // Payment Type Options (amounts will be fetched from API)
  const swimmingPoolPaymentOptions = [
    { id: 1, value: "daily", text: "Daily fee", apiValue: "Daily fee" },
    { id: 2, value: "monthly", text: "Monthly fee", apiValue: "Monthly fee" },
    { id: 3, value: "yearly", text: "Annual Fee", apiValue: "Annual fee" },
  ];

  const gymPaymentOptions = [
    { id: 1, value: "daily", text: "Daily fee", apiValue: "Daily" },
    { id: 2, value: "monthly", text: "Monthly fee", apiValue: "Monthly Fee" },
    { id: 3, value: "yearly", text: "Annual Fee", apiValue: "Annual Fee " },
  ];

  // Utility Service IDs (these should match your backend database IDs)
  const SWIMMING_POOL_ID = 1; // Replace with actual Swimming Pool service ID from your database
  const GYM_ID = 2; // Replace with actual Gym service ID from your database

  const paymentProviders = [
    { id: 1, value: "kotak", text: "Kotak Bank", icon: "card-outline" },
    { id: 2, value: "icici", text: "ICICI Bank", icon: "card-outline" },
  ];
  
  // Month options (1-11 months)
  const monthOptions = Array.from({ length: 11 }, (_, i) => ({
    id: i + 1,
    value: i + 1,
    text: `${i + 1} Month${i + 1 > 1 ? 's' : ''}`
  }));

  // API Integration Functions
  const formatDateForAPI = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };


  const fetchUtilityAmount = async (subUtility, months = 1, startDate = null, endDate = null, utilityId = null) => {
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

  const updateSwimmingPoolAmount = async (paymentType, months = 1) => {
    try {
      setIsSwimmingPoolAmountLoading(true);
      const option = swimmingPoolPaymentOptions.find(opt => opt.value === paymentType);
      if (!option) return;

      const amount = await fetchUtilityAmount(
        option.apiValue, 
        months, 
        swimmingPoolStartDate, 
        swimmingPoolEndDate,
        SWIMMING_POOL_ID
      );
      setSwimmingPoolAmount(`₹${amount}`);
    } catch (error) {
      console.error("Swimming pool amount update error:", error);
      setSwimmingPoolAmount("₹0");
      Alert.alert("Error", "Failed to fetch swimming pool amount. Please try again.");
    } finally {
      setIsSwimmingPoolAmountLoading(false);
    }
  };

  const updateGymAmount = async (paymentType, months = 1) => {
    try {
      setIsGymAmountLoading(true);
      const option = gymPaymentOptions.find(opt => opt.value === paymentType);
      if (!option) return;

      const amount = await fetchUtilityAmount(
        option.apiValue, 
        months, 
        gymStartDate, 
        gymEndDate,
        GYM_ID
      );
      setGymAmount(`₹${amount}`);
    } catch (error) {
      console.error("Gym amount update error:", error);
      setGymAmount("₹0");
      Alert.alert("Error", "Failed to fetch gym amount. Please try again.");
    } finally {
      setIsGymAmountLoading(false);
    }
  };

  // Helper Functions
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getPaymentText = (value, options) => {
    const option = options.find((opt) => opt.value === value);
    return option ? option.text : "Select Payment Type";
  };

  // getPaymentAmount function removed - amounts now come from API

  // Annual Membership Date Logic - 12 full months (same as monthly logic with months=12)
  // End date is the last day of the month preceding the same day next year.
  // Example: Start: 26-09-2025 -> End: 31-08-2026
  const calculateAnnualMembershipDates = (startDate) => {
    const currentStartDate = new Date(startDate);

    // Clone and move 12 months ahead, then set date to 0 to get
    // the last day of the previous month (full months logic)
    const endDate = new Date(currentStartDate);
    endDate.setMonth(endDate.getMonth() + 12);
    endDate.setDate(0);
    endDate.setHours(23, 59, 59, 999);

    return {
      startDate: currentStartDate,
      endDate: endDate,
    };
  };

  const calculateEndDate = (startDate, paymentType, months = 1) => {
    const newEndDate = new Date(startDate);
    
    switch (paymentType) {
      case 'daily':
        // For daily: End at 11:59:59 PM of the same day
        newEndDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        // For monthly: End at last day of the target month
        newEndDate.setMonth(newEndDate.getMonth() + months);
        // Set to last day of the month
        newEndDate.setDate(0); // This sets to last day of previous month (which is our target month)
        newEndDate.setHours(23, 59, 59, 999);
        break;
      case 'yearly':
        // For yearly: Use academic year logic (September 26th to August 31st)
        const academicDates = calculateAnnualMembershipDates(startDate);
        return academicDates.endDate;
      default:
        // Default to daily
        newEndDate.setHours(23, 59, 59, 999);
    }
    
    return newEndDate;
  };

  const calculateTotalAmount = () => {
    let total = 0;
    
    if (isSwimmingPoolSelected && swimmingPoolAmount) {
      const amount = parseInt(swimmingPoolAmount.replace('₹', '') || '0');
      total += amount;
    }
    
    if (isGymSelected && gymAmount) {
      const amount = parseInt(gymAmount.replace('₹', '') || '0');
      total += amount;
    }
    
    return `₹${total}`;
  };

  // Event Handlers
  const handleSwimmingPoolSelection = (selected) => {
    setIsSwimmingPoolSelected(selected);
    if (!selected) {
      // Reset swimming pool related states
      setSwimmingPoolPaymentType("");
      setSwimmingPoolAmount("₹0");
      setSwimmingPoolStartDate(new Date());
      setSwimmingPoolEndDate(new Date());
      setSwimmingPoolMonths(1);
    }
    setErrors({ ...errors, general: "" });
  };

  const handleGymSelection = (selected) => {
    setIsGymSelected(selected);
    if (!selected) {
      // Reset gym related states
      setGymPaymentType("");
      setGymAmount("₹0");
      setGymStartDate(new Date());
      setGymEndDate(new Date());
      setGymMonths(1);
    }
    setErrors({ ...errors, general: "" });
  };

  const handleSwimmingPoolPaymentSelect = async (option) => {
    // Immediately update UI for better UX
    setSwimmingPoolPaymentType(option.value);
    setShowSwimmingPoolPaymentPicker(false);
    setErrors({ ...errors, swimmingPoolPaymentType: "" });
    
    // Reset months to 1 when changing payment type
    if (option.value !== 'monthly') {
      setSwimmingPoolMonths(1);
    }
    
    let updatedStartDate = swimmingPoolStartDate;
    let newEndDate;
    
    if (option.value === 'yearly') {
      // For annual payments, calculate end date based on current start date
      const annualDates = calculateAnnualMembershipDates(swimmingPoolStartDate);
      newEndDate = annualDates.endDate;
      // Keep the current start date, don't change it
    } else {
      // Calculate correct end date for daily/monthly
      const months = option.value === 'monthly' ? swimmingPoolMonths : 1;
      newEndDate = calculateEndDate(swimmingPoolStartDate, option.value, months);
    }
    
    setSwimmingPoolEndDate(newEndDate);
    
    // Fetch amount from API
    try {
      setIsSwimmingPoolAmountLoading(true);
      const months = option.value === 'monthly' ? swimmingPoolMonths : 1;
      const amount = await fetchUtilityAmount(
        option.apiValue, 
        months, 
        updatedStartDate, 
        newEndDate,
        SWIMMING_POOL_ID
      );
      setSwimmingPoolAmount(`₹${amount}`);
    } catch (error) {
      console.error("Swimming pool amount update error:", error);
      setSwimmingPoolAmount("₹0");
      Alert.alert("Error", "Failed to fetch swimming pool amount. Please try again.");
    } finally {
      setIsSwimmingPoolAmountLoading(false);
    }
  };

  const handleGymPaymentSelect = async (option) => {
    // Immediately update UI for better UX
    setGymPaymentType(option.value);
    setShowGymPaymentPicker(false);
    setErrors({ ...errors, gymPaymentType: "" });
    
    // Reset months to 1 when changing payment type
    if (option.value !== 'monthly') {
      setGymMonths(1);
    }
    
    let updatedStartDate = gymStartDate;
    let newEndDate;
    
    if (option.value === 'yearly') {
      // For annual payments, calculate end date based on current start date
      const annualDates = calculateAnnualMembershipDates(gymStartDate);
      newEndDate = annualDates.endDate;
      // Keep the current start date, don't change it
    } else {
      // Calculate correct end date for daily/monthly
      const months = option.value === 'monthly' ? gymMonths : 1;
      newEndDate = calculateEndDate(gymStartDate, option.value, months);
    }
    
    setGymEndDate(newEndDate);
    
    // Fetch amount from API
    try {
      setIsGymAmountLoading(true);
      const months = option.value === 'monthly' ? gymMonths : 1;
      const amount = await fetchUtilityAmount(
        option.apiValue, 
        months, 
        updatedStartDate, 
        newEndDate,
        GYM_ID
      );
      setGymAmount(`₹${amount}`);
    } catch (error) {
      console.error("Gym amount update error:", error);
      setGymAmount("₹0");
      Alert.alert("Error", "Failed to fetch gym amount. Please try again.");
    } finally {
      setIsGymAmountLoading(false);
    }
  };

  const handleDateChange = (type, event, selectedDate) => {
    if (selectedDate) {
      switch (type) {
        case 'swimmingPoolStart':
          setShowSwimmingPoolStartDatePicker(false);
          setSwimmingPoolStartDate(selectedDate);
          
          // Auto-update end date if payment type is selected
          if (swimmingPoolPaymentType) {
            let newEndDate;
            if (swimmingPoolPaymentType === 'yearly') {
              // For annual payments, calculate end date as 1 year minus 1 day
              const annualDates = calculateAnnualMembershipDates(selectedDate);
              newEndDate = annualDates.endDate;
            } else {
              // For daily/monthly payments
              const months = swimmingPoolPaymentType === 'monthly' ? swimmingPoolMonths : 1;
              newEndDate = calculateEndDate(selectedDate, swimmingPoolPaymentType, months);
            }
            setSwimmingPoolEndDate(newEndDate);
          }
          break;
        case 'swimmingPoolEnd':
          setShowSwimmingPoolEndDatePicker(false);
          setSwimmingPoolEndDate(selectedDate);
          break;
        case 'gymStart':
          setShowGymStartDatePicker(false);
          setGymStartDate(selectedDate);
          
          // Auto-update end date if payment type is selected
          if (gymPaymentType) {
            let newEndDate;
            if (gymPaymentType === 'yearly') {
              // For annual payments, calculate end date as 1 year minus 1 day
              const annualDates = calculateAnnualMembershipDates(selectedDate);
              newEndDate = annualDates.endDate;
            } else {
              // For daily/monthly payments
              const months = gymPaymentType === 'monthly' ? gymMonths : 1;
              newEndDate = calculateEndDate(selectedDate, gymPaymentType, months);
            }
            setGymEndDate(newEndDate);
          }
          break;
        case 'gymEnd':
          setShowGymEndDatePicker(false);
          setGymEndDate(selectedDate);
          break;
      }
    } else {
      // Handle picker dismissal
      setShowSwimmingPoolStartDatePicker(false);
      setShowSwimmingPoolEndDatePicker(false);
      setShowGymStartDatePicker(false);
      setShowGymEndDatePicker(false);
    }
  };

  // Month Selection Handlers
  const handleSwimmingPoolMonthSelect = async (monthOption) => {
    // Immediately update UI
    setSwimmingPoolMonths(monthOption.value);
    setShowSwimmingPoolMonthPicker(false);
    
    // Calculate new end date first
    const newEndDate = calculateEndDate(swimmingPoolStartDate, swimmingPoolPaymentType, monthOption.value);
    setSwimmingPoolEndDate(newEndDate);
    
    // Fetch new amount with updated month count from API
    if (swimmingPoolPaymentType) {
      const option = swimmingPoolPaymentOptions.find(opt => opt.value === swimmingPoolPaymentType);
      if (option) {
        try {
          setIsSwimmingPoolAmountLoading(true);
          const amount = await fetchUtilityAmount(
            option.apiValue, 
            monthOption.value, 
            swimmingPoolStartDate, 
            newEndDate,
            SWIMMING_POOL_ID
          );
          setSwimmingPoolAmount(`₹${amount}`);
        } catch (error) {
          console.error("Swimming pool amount update error:", error);
          setSwimmingPoolAmount("₹0");
          Alert.alert("Error", "Failed to fetch swimming pool amount. Please try again.");
        } finally {
          setIsSwimmingPoolAmountLoading(false);
        }
      }
    }
  };

  const handleGymMonthSelect = async (monthOption) => {
    // Immediately update UI
    setGymMonths(monthOption.value);
    setShowGymMonthPicker(false);
    
    // Calculate new end date first
    const newEndDate = calculateEndDate(gymStartDate, gymPaymentType, monthOption.value);
    setGymEndDate(newEndDate);
    
    // Fetch new amount with updated month count from API
    if (gymPaymentType) {
      const option = gymPaymentOptions.find(opt => opt.value === gymPaymentType);
      if (option) {
        try {
          setIsGymAmountLoading(true);
          const amount = await fetchUtilityAmount(
            option.apiValue, 
            monthOption.value, 
            gymStartDate, 
            newEndDate,
            GYM_ID
          );
          setGymAmount(`₹${amount}`);
        } catch (error) {
          console.error("Gym amount update error:", error);
          setGymAmount("₹0");
          Alert.alert("Error", "Failed to fetch gym amount. Please try again.");
        } finally {
          setIsGymAmountLoading(false);
        }
      }
    }
  };

  // Form Validation
  const validateForm = () => {
    const newErrors = {};

    // Check if at least one service is selected
    if (!isSwimmingPoolSelected && !isGymSelected) {
      newErrors.general = "Please select at least one utility service";
    }

    // Validate Swimming Pool if selected
    if (isSwimmingPoolSelected) {
      if (!swimmingPoolPaymentType) {
        newErrors.swimmingPoolPaymentType = "Please select a payment type for Swimming Pool";
      }
      if (swimmingPoolEndDate <= swimmingPoolStartDate) {
        newErrors.swimmingPoolEndDate = "End date must be after start date";
      }
    }

    // Validate GYM if selected
    if (isGymSelected) {
      if (!gymPaymentType) {
        newErrors.gymPaymentType = "Please select a payment type for GYM";
      }
      if (gymEndDate <= gymStartDate) {
        newErrors.gymEndDate = "End date must be after start date";
      }
    }

    // Validate payment option
    if ((isSwimmingPoolSelected || isGymSelected) && !selectedPaymentOption) {
      newErrors.paymentOption = "Please select a payment method";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form Submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      let token;
      try {
        token = await AsyncStorage.getItem("userToken");
      } catch (storageError) {
        console.error('AsyncStorage error:', storageError);
        Alert.alert("Error", "Unable to access device storage. Please try again.");
        return;
      }
      
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        return;
      }

      const utilityData = {
        swimming_pool: isSwimmingPoolSelected ? {
          payment_type: swimmingPoolPaymentType,
          start_date: formatDate(swimmingPoolStartDate),
          end_date: formatDate(swimmingPoolEndDate),
          amount: swimmingPoolAmount,
        } : null,
        gym: isGymSelected ? {
          payment_type: gymPaymentType,
          start_date: formatDate(gymStartDate),
          end_date: formatDate(gymEndDate),
          amount: gymAmount,
        } : null,
        payment_option: selectedPaymentOption,
        total_amount: calculateTotalAmount(),
        timestamp: new Date().toISOString(),
      };

      console.log('Utility Form Data:', utilityData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      Alert.alert(
        "Success",
        "Your utility form has been submitted successfully! You can now proceed to payment.",
        [
          {
            text: "OK",
            onPress: () => {
              setIsFormSubmitted(true);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Utility form submission error:', error);
      Alert.alert(
        "Submission Failed",
        "Failed to submit utility form. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Payment Processing
  const handlePayment = async () => {
    setIsPaymentProcessing(true);
    try {
      let token;
      try {
        token = await AsyncStorage.getItem("userToken");
      } catch (storageError) {
        console.error('AsyncStorage error:', storageError);
        Alert.alert("Error", "Unable to access device storage. Please try again.");
        return;
      }
      
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        return;
      }

      const paymentData = {
        total_amount: calculateTotalAmount(),
        payment_option: selectedPaymentOption,
        service_details: {
          swimming_pool: isSwimmingPoolSelected ? {
            payment_type: swimmingPoolPaymentType,
            amount: swimmingPoolAmount,
            duration: `${formatDate(swimmingPoolStartDate)} to ${formatDate(swimmingPoolEndDate)}`,
          } : null,
          gym: isGymSelected ? {
            payment_type: gymPaymentType,
            amount: gymAmount,
            duration: `${formatDate(gymStartDate)} to ${formatDate(gymEndDate)}`,
          } : null,
        },
        transaction_id: `UTL_${Date.now()}`,
        timestamp: new Date().toISOString(),
      };

      console.log('Processing payment:', paymentData);
      
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Redirect to payment screen (placeholder navigation)
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate('PaymentHistory');
      }

      // After redirect (or on success), reset the form
      resetForm();
    } catch (error) {
      console.error('Payment processing error:', error);
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
        console.error('AsyncStorage error:', storageError);
        Alert.alert("Error", "Unable to access device storage. Please try again.");
        return;
      }
      
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        return;
      }

      const utilityData = {
        swimming_pool: isSwimmingPoolSelected ? {
          payment_type: swimmingPoolPaymentType,
          start_date: formatDate(swimmingPoolStartDate),
          end_date: formatDate(swimmingPoolEndDate),
          amount: swimmingPoolAmount,
          months: swimmingPoolPaymentType === 'monthly' ? swimmingPoolMonths : undefined,
        } : null,
        gym: isGymSelected ? {
          payment_type: gymPaymentType,
          start_date: formatDate(gymStartDate),
          end_date: formatDate(gymEndDate),
          amount: gymAmount,
          months: gymPaymentType === 'monthly' ? gymMonths : undefined,
        } : null,
        payment_option: selectedPaymentOption,
        total_amount: calculateTotalAmount(),
        timestamp: new Date().toISOString(),
      };

      console.log('Submitting application (silent):', utilityData);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // After submission, immediately proceed to payment
      await handlePayment();
    } catch (error) {
      console.error('Pay now flow error:', error);
      Alert.alert(
        "Action Failed",
        "Could not proceed to payment. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsSwimmingPoolSelected(false);
    setIsGymSelected(false);
    setSwimmingPoolPaymentType("");
    setSwimmingPoolAmount("₹0");
    setGymPaymentType("");
    setGymAmount("₹0");
    setSelectedPaymentOption("");
    setSwimmingPoolStartDate(new Date());
    setSwimmingPoolEndDate(new Date());
    setGymStartDate(new Date());
    setGymEndDate(new Date());
    setSwimmingPoolMonths(1);
    setGymMonths(1);
    setErrors({});
    setIsFormSubmitted(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, {
        paddingHorizontal: getResponsivePadding(16, screenWidth),
        paddingVertical: getResponsivePadding(15, screenWidth)
      }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#8b5cf6" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: getResponsiveSize(18, screenWidth) }]}>
          Utility Services
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContainer, {
          paddingHorizontal: getResponsivePadding(16, screenWidth)
        }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Swimming Pool Service Section */}
        <View style={[styles.serviceSection, {
          padding: getResponsivePadding(20, screenWidth)
        }]}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => handleSwimmingPoolSelection(!isSwimmingPoolSelected)}
              disabled={isSubmitting || isFormSubmitted}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                isSwimmingPoolSelected && styles.checkboxSelected
              ]}>
                {isSwimmingPoolSelected && (
                  <Ionicons name="checkmark" size={16} color="#ffffff" />
                )}
              </View>
              <Text style={[styles.sectionTitle, { fontSize: getResponsiveSize(18, screenWidth) }]}>
                Swimming Pool Membership
              </Text>
            </TouchableOpacity>
          </View>

          {/* Payment Type */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { fontSize: getResponsiveSize(14, screenWidth) }]}>
              Payment Type *
            </Text>
            <TouchableOpacity
              style={[styles.pickerButton, errors.swimmingPoolPaymentType && styles.inputError]}
              onPress={() => setShowSwimmingPoolPaymentPicker(true)}
              disabled={isSubmitting || isFormSubmitted || !isSwimmingPoolSelected || isSwimmingPoolAmountLoading}
            >
              <Text
                style={[
                  styles.pickerText,
                  !swimmingPoolPaymentType && styles.placeholderText,
                  { fontSize: getResponsiveSize(14, screenWidth) }
                ]}
              >
                {getPaymentText(swimmingPoolPaymentType, swimmingPoolPaymentOptions)}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#8b5cf6" />
            </TouchableOpacity>
            {errors.swimmingPoolPaymentType && (
              <Text style={styles.errorText}>{errors.swimmingPoolPaymentType}</Text>
            )}
          </View>

          {/* Month Selection - Only for Monthly Payment */}
          {isSwimmingPoolSelected && swimmingPoolPaymentType === 'monthly' && (
            <View style={styles.inputSection}>
              <Text style={[styles.label, { fontSize: getResponsiveSize(14, screenWidth) }]}>
                Number of Months (1-11) *
              </Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowSwimmingPoolMonthPicker(true)}
                disabled={isSubmitting || isFormSubmitted || isSwimmingPoolAmountLoading}
              >
                <Text style={[styles.pickerText, { fontSize: getResponsiveSize(14, screenWidth) }]}>
                  {swimmingPoolMonths} Month{swimmingPoolMonths > 1 ? 's' : ''}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#8b5cf6" />
              </TouchableOpacity>
            </View>
          )}

          {/* Start Date / End Date */}
          {isSwimmingPoolSelected && swimmingPoolPaymentType && (
            <>
              <Text style={[styles.label, { fontSize: getResponsiveSize(14, screenWidth) }]}>
                Service Duration
              </Text>
              <View style={styles.dateRow}>
                <View style={styles.dateContainer}>
                  <Text style={styles.dateLabel}>Start Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowSwimmingPoolStartDatePicker(true)}
                    disabled={isSubmitting || isFormSubmitted || !isSwimmingPoolSelected}
                  >
                    <Text style={[styles.dateText, { fontSize: getResponsiveSize(12, screenWidth) }]}>
                      {formatDate(swimmingPoolStartDate)}
                    </Text>
                    <Ionicons name="calendar-outline" size={16} color="#8b5cf6" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.dateContainer}>
                  <Text style={styles.dateLabel}>End Date</Text>
                  <TouchableOpacity
                    style={[styles.dateButton, styles.endDateButton]}
                    disabled={true}
                  >
                    <Text style={[styles.dateText, { fontSize: getResponsiveSize(12, screenWidth) }]}>
                      {formatDate(swimmingPoolEndDate)}
                    </Text>
                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              </View>
              {errors.swimmingPoolEndDate && (
                <Text style={styles.errorText}>{errors.swimmingPoolEndDate}</Text>
              )}

              {/* Amount */}
              <View style={styles.amountContainer}>
                <Text style={[styles.amountLabel, { fontSize: getResponsiveSize(16, screenWidth) }]}>
                  Amount: 
                </Text>
                {isSwimmingPoolAmountLoading ? (
                  <ActivityIndicator size="small" color="#1e40af" style={{ marginLeft: 8 }} />
                ) : (
                  <Text style={[styles.amountValue, { fontSize: getResponsiveSize(16, screenWidth) }]}>
                    {swimmingPoolAmount}
                  </Text>
                )}
              </View>
            </>
          )}

          {/* Service Details */}
          <View style={styles.serviceInfoContainer}>
            <Text style={[styles.serviceInfoTitle, { fontSize: getResponsiveSize(12, screenWidth) }]}>
              Department detail:
            </Text>
            <Text style={[styles.serviceInfo, { fontSize: getResponsiveSize(11, screenWidth) }]}>
              • Email: membership@iimtichy.ac.in
            </Text>
            <Text style={[styles.serviceInfo, { fontSize: getResponsiveSize(11, screenWidth) }]}>
              • Phone Number: 4312505027
            </Text>
          </View>
        </View>

        {/* GYM Service Section */}
        <View style={[styles.serviceSection, {
          padding: getResponsivePadding(20, screenWidth)
        }]}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => handleGymSelection(!isGymSelected)}
              disabled={isSubmitting || isFormSubmitted}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                isGymSelected && styles.checkboxSelected
              ]}>
                {isGymSelected && (
                  <Ionicons name="checkmark" size={16} color="#ffffff" />
                )}
              </View>
              <Text style={[styles.sectionTitle, { fontSize: getResponsiveSize(18, screenWidth) }]}>
                GYM Membership
              </Text>
            </TouchableOpacity>
          </View>

          {/* Payment Type */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { fontSize: getResponsiveSize(14, screenWidth) }]}>
              Payment Type *
            </Text>
            <TouchableOpacity
              style={[styles.pickerButton, errors.gymPaymentType && styles.inputError]}
              onPress={() => setShowGymPaymentPicker(true)}
              disabled={isSubmitting || isFormSubmitted || !isGymSelected || isGymAmountLoading}
            >
              <Text
                style={[
                  styles.pickerText,
                  !gymPaymentType && styles.placeholderText,
                  { fontSize: getResponsiveSize(14, screenWidth) }
                ]}
              >
                {getPaymentText(gymPaymentType, gymPaymentOptions)}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#8b5cf6" />
            </TouchableOpacity>
            {errors.gymPaymentType && (
              <Text style={styles.errorText}>{errors.gymPaymentType}</Text>
            )}
          </View>

          {/* Month Selection - Only for Monthly Payment */}
          {isGymSelected && gymPaymentType === 'monthly' && (
            <View style={styles.inputSection}>
              <Text style={[styles.label, { fontSize: getResponsiveSize(14, screenWidth) }]}>
                Number of Months (1-11) *
              </Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowGymMonthPicker(true)}
                disabled={isSubmitting || isFormSubmitted || isGymAmountLoading}
              >
                <Text style={[styles.pickerText, { fontSize: getResponsiveSize(14, screenWidth) }]}>
                  {gymMonths} Month{gymMonths > 1 ? 's' : ''}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#8b5cf6" />
              </TouchableOpacity>
            </View>
          )}

          {/* Start Date / End Date */}
          {isGymSelected && gymPaymentType && (
            <>
              <Text style={[styles.label, { fontSize: getResponsiveSize(14, screenWidth) }]}>
                Service Duration
              </Text>
              <View style={styles.dateRow}>
                <View style={styles.dateContainer}>
                  <Text style={styles.dateLabel}>Start Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowGymStartDatePicker(true)}
                    disabled={isSubmitting || isFormSubmitted || !isGymSelected}
                  >
                    <Text style={[styles.dateText, { fontSize: getResponsiveSize(12, screenWidth) }]}>
                      {formatDate(gymStartDate)}
                    </Text>
                    <Ionicons name="calendar-outline" size={16} color="#8b5cf6" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.dateContainer}>
                  <Text style={styles.dateLabel}>End Date</Text>
                  <TouchableOpacity
                    style={[styles.dateButton, styles.endDateButton]}
                    disabled={true}
                  >
                    <Text style={[styles.dateText, { fontSize: getResponsiveSize(12, screenWidth) }]}>
                      {formatDate(gymEndDate)}
                    </Text>
                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              </View>
              {errors.gymEndDate && (
                <Text style={styles.errorText}>{errors.gymEndDate}</Text>
              )}

              {/* Amount */}
              <View style={styles.amountContainer}>
                <Text style={[styles.amountLabel, { fontSize: getResponsiveSize(16, screenWidth) }]}>
                  Amount: 
                </Text>
                {isGymAmountLoading ? (
                  <ActivityIndicator size="small" color="#1e40af" style={{ marginLeft: 8 }} />
                ) : (
                  <Text style={[styles.amountValue, { fontSize: getResponsiveSize(16, screenWidth) }]}>
                    {gymAmount}
                  </Text>
                )}
              </View>
            </>
          )}

          {/* Service Details */}
          <View style={styles.serviceInfoContainer}>
            <Text style={[styles.serviceInfoTitle, { fontSize: getResponsiveSize(12, screenWidth) }]}>
              Department detail:
            </Text>
            <Text style={[styles.serviceInfo, { fontSize: getResponsiveSize(11, screenWidth) }]}>
              • Email: gymmembership@limtrichy.ac.in
            </Text>
            <Text style={[styles.serviceInfo, { fontSize: getResponsiveSize(11, screenWidth) }]}>
              • Phone Number: 3653747656
            </Text>
          </View>
        </View>


        {/* Payment Options */}
        {((isSwimmingPoolSelected && swimmingPoolPaymentType) || (isGymSelected && gymPaymentType)) && (
          <View style={[styles.paymentOptionsSection, {
            padding: getResponsivePadding(20, screenWidth)
          }]}>
            <Text style={[styles.paymentOptionsTitle, { fontSize: getResponsiveSize(16, screenWidth) }]}>
              Choose Payment Method:
            </Text>
            
            <View style={styles.paymentOptionsContainer}>
              {paymentProviders.map((provider) => (
                <TouchableOpacity
                  key={provider.id}
                  style={[
                    styles.paymentOption,
                    selectedPaymentOption === provider.value && styles.paymentOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedPaymentOption(provider.value);
                    setErrors({ ...errors, paymentOption: "" });
                  }}
                  disabled={isSubmitting}
                >
                  <Ionicons 
                    name={provider.icon} 
                    size={24} 
                    color={selectedPaymentOption === provider.value ? "#7c3aed" : "#6b7280"} 
                  />
                  <Text style={[
                    styles.paymentOptionText,
                    { fontSize: getResponsiveSize(14, screenWidth) },
                    selectedPaymentOption === provider.value && styles.paymentOptionTextSelected
                  ]}>
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

        {/* General Error */}
        {errors.general && (
          <View style={styles.generalErrorContainer}>
            <Ionicons name="warning" size={20} color="#ef4444" />
            <Text style={[styles.errorText, { marginLeft: 8, marginTop: 0 }]}>{errors.general}</Text>
          </View>
        )}

        {/* Pay Button */}
        {((isSwimmingPoolSelected && swimmingPoolPaymentType) || (isGymSelected && gymPaymentType)) && (
          <TouchableOpacity
            style={[
              styles.paymentButton, 
              (isPaymentProcessing || !selectedPaymentOption || isSwimmingPoolAmountLoading || isGymAmountLoading) && styles.submitButtonDisabled
            ]}
            onPress={handlePayNow}
            disabled={isPaymentProcessing || !selectedPaymentOption || isSwimmingPoolAmountLoading || isGymAmountLoading}
          >
            {isPaymentProcessing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <View style={styles.buttonContent}>
                <Ionicons name="card" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={[styles.paymentButtonText, { fontSize: getResponsiveSize(16, screenWidth) }]}>
                  Pay Fee {calculateTotalAmount()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Footer Note */}
        <View style={styles.footerNote}>
          <Text style={[styles.footerNoteText, { fontSize: getResponsiveSize(12, screenWidth) }]}>
            Select your preferred membership and payment method, then click the payment amount to proceed directly to payment. 
            Your application will be submitted automatically.
          </Text>
        </View>
      </ScrollView>

      {/* Swimming Pool Payment Type Picker Modal */}
      <Modal visible={showSwimmingPoolPaymentPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSwimmingPoolPaymentPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Swimming Pool Payment</Text>
            </View>
            <ScrollView style={styles.modalList}>
              {swimmingPoolPaymentOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.modalItem}
                  onPress={() => handleSwimmingPoolPaymentSelect(option)}
                >
                  <Text style={styles.modalItemText}>{option.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* GYM Payment Type Picker Modal */}
      <Modal visible={showGymPaymentPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGymPaymentPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>GYM Payment</Text>
            </View>
            <ScrollView style={styles.modalList}>
              {gymPaymentOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.modalItem}
                  onPress={() => handleGymPaymentSelect(option)}
                >
                  <Text style={styles.modalItemText}>{option.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Swimming Pool Month Picker Modal */}
      <Modal visible={showSwimmingPoolMonthPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSwimmingPoolMonthPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="calendar" size={24} color="#0ea5e9" />
              <Text style={styles.modalTitle}>Select Months</Text>
            </View>
            <ScrollView style={styles.modalList}>
              {monthOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.modalItem}
                  onPress={() => handleSwimmingPoolMonthSelect(option)}
                >
                  <Text style={styles.modalItemText}>{option.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Gym Month Picker Modal */}
      <Modal visible={showGymMonthPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowGymMonthPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="calendar" size={24} color="#dc2626" />
              <Text style={styles.modalTitle}>Select Months</Text>
            </View>
            <ScrollView style={styles.modalList}>
              {monthOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.modalItem}
                  onPress={() => handleGymMonthSelect(option)}
                >
                  <Text style={styles.modalItemText}>{option.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Pickers */}
      {showSwimmingPoolStartDatePicker && (
        <DateTimePicker
          value={swimmingPoolStartDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => handleDateChange('swimmingPoolStart', event, selectedDate)}
          minimumDate={new Date()}
        />
      )}

      {showGymStartDatePicker && (
        <DateTimePicker
          value={gymStartDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => handleDateChange('gymStart', event, selectedDate)}
          minimumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontWeight: "600",
    color: "#7c3aed",
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    paddingVertical: 20,
  },
  serviceSection: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionHeader: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#7c3aed",
    borderColor: "#7c3aed",
  },
  sectionTitle: {
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
  },
  inputSection: {
    marginBottom: 16,
  },
  label: {
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
  },
  pickerText: {
    color: "#374151",
    flex: 1,
  },
  placeholderText: {
    color: "#9ca3af",
  },
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  dateContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b7280",
    marginBottom: 4,
  },
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "#f9fafb",
  },
  endDateButton: {
    backgroundColor: "#f3f4f6",
    borderColor: "#e5e7eb",
  },
  dateText: {
    color: "#374151",
    flex: 1,
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "#dbeafe",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  amountLabel: {
    fontWeight: "500",
    color: "#1e40af",
  },
  amountValue: {
    fontWeight: "600",
    color: "#1e40af",
    marginLeft: 8,
  },
  serviceInfoContainer: {
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
  },
  serviceInfoTitle: {
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  serviceInfo: {
    color: "#6b7280",
    marginBottom: 2,
  },
  totalAmountSection: {
    backgroundColor: "#dbeafe",
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  totalAmountHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  totalAmountLabel: {
    fontWeight: "600",
    color: "#1e40af",
    marginLeft: 8,
  },
  totalAmountValue: {
    fontWeight: "700",
    color: "#1e40af",
    textAlign: "center",
  },
  paymentOptionsSection: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  paymentOptionsTitle: {
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
  },
  paymentOptionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 9,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "#d1d5db",
    minWidth: 120,
    backgroundColor: "#f9fafb",
  },
  paymentOptionSelected: {
    borderColor: "#7c3aed",
    backgroundColor: "#f3f4f6",
  },
  paymentOptionText: {
    color: "#374151",
    fontWeight: "500",
    marginLeft: 8,
    flex: 1,
    flexWrap: "wrap",
  },
  paymentOptionTextSelected: {
    color: "#7c3aed",
  },
  generalErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: "#7c3aed",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#9ca3af",
    elevation: 0,
    shadowOpacity: 0,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  successMessageContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d1fae5",
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#10b981",
  },
  successMessage: {
    color: "#065f46",
    fontWeight: "600",
    marginLeft: 8,
  },
  paymentButton: {
    backgroundColor: "#059669",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  paymentButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  backToMenuButton: {
    backgroundColor: "transparent",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6b7280",
  },
  backToMenuButtonText: {
    color: "#6b7280",
    fontWeight: "500",
  },
  footerNote: {
    backgroundColor: "#f3f4f6",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  footerNoteText: {
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    width: width * 0.9,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
  },
  modalList: {
    maxHeight: 300,
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalItemText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    flex: 1,
  },
});

export default UtilityFormScreen;
