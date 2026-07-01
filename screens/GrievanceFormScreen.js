import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Platform,
  ActivityIndicator,
  Dimensions,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { readUserAPI, getCategoriesAPI, saveGrievanceAPI } from "../services/api";
import { useTheme } from "../contexts/ThemeContext";

const { width } = Dimensions.get("window");

const getResponsiveSize = (baseSize, screenWidth) => {
  const scale = screenWidth / 375;
  return Math.round(baseSize * Math.max(scale, 0.8));
};

const getResponsivePadding = (basePadding, screenWidth) => {
  if (screenWidth < 350) return basePadding * 0.8;
  if (screenWidth > 414) return basePadding * 1.2;
  return basePadding;
};

const GrievanceFormScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { width: screenWidth } = Dimensions.get("window");

  const [name, setName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [email, setEmail] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [mainCategory, setMainCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [description, setDescription] = useState("");
  const [incidentDate, setIncidentDate] = useState(new Date());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [errors, setErrors] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [tempDate, setTempDate] = useState(new Date());

  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState({});

  React.useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([loadUserData(), loadCategories()]);
  };

  const loadUserData = async () => {
    try {
      setIsLoadingUserData(true);
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        navigation.goBack();
        return;
      }
      const response = await readUserAPI(token);
      if (response.success && response.user) {
        const user = response.user;
        setName(user.name || "");
        setMobileNo(user.mobile || user.phone || "");
        setEmail(user.email || "");
        setRollNo(user.roll_no || user.student_id || user.rollNo || "");
      }
    } catch (error) {
      Alert.alert("Warning", "Could not auto-fill user information. Please enter manually.");
    } finally {
      setIsLoadingUserData(false);
    }
  };

  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        navigation.goBack();
        return;
      }
      const response = await getCategoriesAPI(token);
      if (response.success && response.categories) {
        const apiData = response.categories;
        const categories = apiData.grievance?.category || {};
        const subCategoriesData = apiData.grievance?.sub_category || {};

        const mainCats = Object.entries(categories).map(([id, name]) => ({
          id: parseInt(id),
          value: name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
          text: name,
        }));

        const subCats = {};
        const categoryIdToValue = {};
        mainCats.forEach((cat) => { categoryIdToValue[cat.id] = cat.value; });

        Object.entries(subCategoriesData).forEach(([categoryId, subCategoryData]) => {
          const mainCategoryValue = categoryIdToValue[parseInt(categoryId)];
          if (mainCategoryValue && subCategoryData) {
            subCats[mainCategoryValue] = Object.entries(subCategoryData).map(([subId, subName]) => ({
              id: parseInt(subId),
              value: subName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
              text: subName,
            }));
          }
        });

        setMainCategories(mainCats);
        setSubCategories(subCats);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load categories. Please try again.");
      setMainCategories([
        { id: 1, value: "general", text: "General Grievance" },
        { id: 2, value: "academic", text: "Academic Issues" },
        { id: 3, value: "administrative", text: "Administrative Issues" },
        { id: 4, value: "facilities", text: "Facilities Issues" },
        { id: 5, value: "others", text: "Others" },
      ]);
      setSubCategories({});
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!mobileNo.trim()) {
      newErrors.mobileNo = "Mobile number is required";
    } else if (!/^\d{10}$/.test(mobileNo.trim())) {
      newErrors.mobileNo = "Mobile number must be 10 digits";
    }
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Please enter a valid email";
    }
    if (!rollNo.trim()) newErrors.rollNo = "Roll No./Student ID is required";
    if (!mainCategory) newErrors.mainCategory = "Please select main category";
    const hasSubCategories = mainCategory && subCategories[mainCategory] && subCategories[mainCategory].length > 0;
    if (hasSubCategories && !subCategory) newErrors.subCategory = "Please select sub category";
    if (!description.trim()) {
      newErrors.description = "Description of incident is required";
    } else if (description.trim().length < 20) {
      newErrors.description = "Description must be at least 20 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitGrievance = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const token = await SecureStore.getItemAsync("userToken");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        return;
      }
      const formatDate = (date) => {
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      };
      const grievanceData = {
        name: name.trim(),
        mobile: mobileNo.trim(),
        email: email.trim(),
        roll_no: rollNo.trim(),
        category: getCategoryId(mainCategory, mainCategories),
        sub_category: getSubCategoryId(mainCategory, subCategory) || "",
        description: description.trim(),
        incident_date: formatDate(incidentDate),
        query_type: "grievance",
      };

      const response = await saveGrievanceAPI(grievanceData, token);
      if (response && response.success) {
        const successMessage = response.message || "Your grievance has been submitted successfully.";
        const queryId = response.queryId || response.data?.query_id || response.data?.id;
        let alertMessage = successMessage;
        if (queryId) alertMessage += `\n\nReference ID: ${queryId}`;
        Alert.alert("Success", alertMessage, [
          {
            text: "OK",
            onPress: () => {
              setName(""); setMobileNo(""); setEmail(""); setRollNo("");
              setMainCategory(""); setSubCategory(""); setDescription("");
              setIncidentDate(new Date()); setErrors({});
              navigation.goBack();
            },
          },
        ]);
      } else {
        throw new Error(response?.message || "Unknown error occurred while submitting grievance");
      }
    } catch (error) {
      Alert.alert("Submission Failed", error.message || "Failed to submit grievance. Please try again.", [{ text: "OK" }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryText = (value, categories) => {
    const category = categories.find((cat) => cat.value === value);
    return category ? category.text : "Choose a category";
  };

  const getCategoryId = (value, categories) => {
    const category = categories.find((cat) => cat.value === value);
    return category ? category.id : null;
  };

  const getSubCategoryId = (mainCategoryValue, subCategoryValue) => {
    if (!subCategoryValue) return null;
    const subCats = subCategories[mainCategoryValue];
    if (!subCats) return null;
    const subCat = subCats.find((cat) => cat.value === subCategoryValue);
    return subCat ? subCat.id : null;
  };

  const handleMainCategorySelect = (category) => {
    setMainCategory(category.value);
    setSubCategory("");
    setOpenDropdown(null);
    setErrors({ ...errors, mainCategory: "", subCategory: "" });
  };

  const handleSubCategorySelect = (category) => {
    setSubCategory(category.value);
    setOpenDropdown(null);
    setErrors({ ...errors, subCategory: "" });
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (selectedDate) setIncidentDate(selectedDate);
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const openDatePicker = () => { setTempDate(incidentDate); setShowDatePicker(true); };
  const confirmDate = () => { setIncidentDate(tempDate); setShowDatePicker(false); };

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const clearError = (field) => {
    if (errors[field]) setErrors({ ...errors, [field]: "" });
  };

  const inputBg = colors.input;
  const inputBorder = colors.inputBorder;
  const inputErrorBg = isDark ? "#3B1E1E" : "#fef2f2";

  if (isLoadingUserData || isLoadingCategories) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background,
          paddingHorizontal: getResponsivePadding(16, screenWidth),
          paddingVertical: getResponsivePadding(15, screenWidth) }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: colors.primaryContainer }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.primary, fontSize: getResponsiveSize(18, screenWidth) }]}>
            Submit Grievance
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary, fontSize: getResponsiveSize(16, screenWidth) }]}>
            {isLoadingUserData && isLoadingCategories ? "Loading form data..."
              : isLoadingUserData ? "Loading user information..."
              : "Loading categories..."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background,
        paddingHorizontal: getResponsivePadding(16, screenWidth),
        paddingVertical: getResponsivePadding(15, screenWidth) }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: colors.primaryContainer }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary, fontSize: getResponsiveSize(18, screenWidth) }]}>
          Submit Grievance
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { paddingHorizontal: getResponsivePadding(16, screenWidth) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.formContainer, { backgroundColor: colors.surface, shadowColor: colors.shadow,
          padding: getResponsivePadding(20, screenWidth) }]}>

          {/* Personal Information */}
          <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.borderLight,
            fontSize: getResponsiveSize(16, screenWidth) }]}>
            Personal Information
          </Text>

          {/* Name */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: colors.text, fontSize: getResponsiveSize(14, screenWidth) }]}>Full Name *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text },
                errors.name && { borderColor: colors.error, backgroundColor: inputErrorBg }]}
              placeholder={isLoadingUserData ? "Loading..." : "Enter your full name"}
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={(text) => { setName(text); clearError("name"); }}
              editable={!isSubmitting && !isLoadingUserData}
            />
            {errors.name && <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text>}
          </View>

          {/* Mobile */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: colors.text, fontSize: getResponsiveSize(14, screenWidth) }]}>Mobile Number *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text },
                errors.mobileNo && { borderColor: colors.error, backgroundColor: inputErrorBg }]}
              placeholder={isLoadingUserData ? "Loading..." : "Enter 10-digit mobile number"}
              placeholderTextColor={colors.textTertiary}
              value={mobileNo}
              onChangeText={(text) => { setMobileNo(text); clearError("mobileNo"); }}
              keyboardType="numeric"
              maxLength={10}
              editable={!isSubmitting && !isLoadingUserData}
            />
            {errors.mobileNo && <Text style={[styles.errorText, { color: colors.error }]}>{errors.mobileNo}</Text>}
          </View>

          {/* Email */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: colors.text, fontSize: getResponsiveSize(14, screenWidth) }]}>Email Address *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text },
                errors.email && { borderColor: colors.error, backgroundColor: inputErrorBg }]}
              placeholder={isLoadingUserData ? "Loading..." : "Enter your email address"}
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={(text) => { setEmail(text); clearError("email"); }}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isSubmitting && !isLoadingUserData}
            />
            {errors.email && <Text style={[styles.errorText, { color: colors.error }]}>{errors.email}</Text>}
          </View>

          {/* Roll No */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: colors.text, fontSize: getResponsiveSize(14, screenWidth) }]}>Roll No./Student ID *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text },
                errors.rollNo && { borderColor: colors.error, backgroundColor: inputErrorBg }]}
              placeholder={isLoadingUserData ? "Loading..." : "Enter your roll number or student ID"}
              placeholderTextColor={colors.textTertiary}
              value={rollNo}
              onChangeText={(text) => { setRollNo(text); clearError("rollNo"); }}
              editable={!isSubmitting && !isLoadingUserData}
            />
            {errors.rollNo && <Text style={[styles.errorText, { color: colors.error }]}>{errors.rollNo}</Text>}
          </View>

          {/* Category Section */}
          <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.borderLight,
            fontSize: getResponsiveSize(16, screenWidth), marginTop: getResponsivePadding(20, screenWidth) }]}>
            Grievance Category
          </Text>

          {/* Main Category */}
          <View style={[styles.inputSection, { zIndex: openDropdown === "main" ? 100 : 1 }]}>
            <Text style={[styles.label, { color: colors.text, fontSize: getResponsiveSize(14, screenWidth) }]}>Main Category *</Text>
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: inputBg, borderColor: inputBorder },
                  errors.mainCategory && { borderColor: colors.error },
                  openDropdown === "main" && { borderBottomColor: colors.primary }]}
                onPress={() => !isSubmitting && !isLoadingCategories && setOpenDropdown(openDropdown === "main" ? null : "main")}
                disabled={isSubmitting || isLoadingCategories}
              >
                <Text style={[styles.pickerText, { color: colors.text, fontSize: getResponsiveSize(14, screenWidth) },
                  !mainCategory && { color: colors.textTertiary }]}>
                  {isLoadingCategories ? "Loading categories..." : (mainCategory ? getCategoryText(mainCategory, mainCategories) : "Choose a category")}
                </Text>
                <Ionicons name={openDropdown === "main" ? "chevron-up" : "chevron-down"} size={20} color={colors.primary} />
              </TouchableOpacity>
              {openDropdown === "main" && (
                <View style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {mainCategories.map((category) => {
                      const isSelected = mainCategory === category.value;
                      return (
                        <TouchableOpacity
                          key={category.id}
                          style={[styles.dropdownItem, { borderBottomColor: colors.borderLight },
                            isSelected && { backgroundColor: colors.primaryContainer }]}
                          onPress={() => handleMainCategorySelect(category)}
                        >
                          <Text style={[styles.dropdownItemText, { color: colors.text, fontSize: getResponsiveSize(14, screenWidth) },
                            isSelected && { color: colors.primary, fontWeight: "600" }]}>
                            {category.text}
                          </Text>
                          {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
            {errors.mainCategory && <Text style={[styles.errorText, { color: colors.error }]}>{errors.mainCategory}</Text>}
          </View>

          {/* Sub-Category */}
          {mainCategory && subCategories[mainCategory] && subCategories[mainCategory].length > 0 && (
            <View style={[styles.inputSection, { zIndex: openDropdown === "sub" ? 100 : 1 }]}>
              <Text style={[styles.label, { color: colors.text, fontSize: getResponsiveSize(14, screenWidth) }]}>Sub Category *</Text>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={[styles.pickerButton, { backgroundColor: inputBg, borderColor: inputBorder },
                    errors.subCategory && { borderColor: colors.error },
                    openDropdown === "sub" && { borderBottomColor: colors.primary }]}
                  onPress={() => !isSubmitting && !isLoadingCategories && setOpenDropdown(openDropdown === "sub" ? null : "sub")}
                  disabled={isSubmitting || isLoadingCategories}
                >
                  <Text style={[styles.pickerText, { color: colors.text, fontSize: getResponsiveSize(14, screenWidth) },
                    !subCategory && { color: colors.textTertiary }]}>
                    {subCategory ? getCategoryText(subCategory, subCategories[mainCategory] || []) : "Choose sub category"}
                  </Text>
                  <Ionicons name={openDropdown === "sub" ? "chevron-up" : "chevron-down"} size={20} color={colors.primary} />
                </TouchableOpacity>
                {openDropdown === "sub" && (
                  <View style={[styles.dropdownMenu, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                      {subCategories[mainCategory]?.map((category) => {
                        const isSelected = subCategory === category.value;
                        return (
                          <TouchableOpacity
                            key={category.id}
                            style={[styles.dropdownItem, { borderBottomColor: colors.borderLight },
                              isSelected && { backgroundColor: colors.primaryContainer }]}
                            onPress={() => handleSubCategorySelect(category)}
                          >
                            <Text style={[styles.dropdownItemText, { color: colors.text, fontSize: getResponsiveSize(14, screenWidth) },
                              isSelected && { color: colors.primary, fontWeight: "600" }]}>
                              {category.text}
                            </Text>
                            {isSelected && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>
              {errors.subCategory && <Text style={[styles.errorText, { color: colors.error }]}>{errors.subCategory}</Text>}
            </View>
          )}

          {/* Incident Details */}
          <Text style={[styles.sectionTitle, { color: colors.text, borderBottomColor: colors.borderLight,
            fontSize: getResponsiveSize(16, screenWidth), marginTop: getResponsivePadding(20, screenWidth) }]}>
            Incident Details
          </Text>

          {/* Description */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: colors.text, fontSize: getResponsiveSize(14, screenWidth) }]}>Description of Incident *</Text>
            <TextInput
              style={[styles.textAreaInput, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text },
                errors.description && { borderColor: colors.error, backgroundColor: inputErrorBg }]}
              placeholder="Please provide detailed description of the incident (minimum 20 characters)"
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={(text) => { setDescription(text); clearError("description"); }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
            <Text style={[styles.characterCount, { color: colors.textTertiary }]}>
              {description.length} characters {description.length < 20 && "(minimum 20)"}
            </Text>
            {errors.description && <Text style={[styles.errorText, { color: colors.error }]}>{errors.description}</Text>}
          </View>

          {/* Date Selection */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { color: colors.text, fontSize: getResponsiveSize(14, screenWidth) }]}>Date of Incident</Text>
            <TouchableOpacity
              style={[styles.dateButton, { backgroundColor: inputBg, borderColor: inputBorder }]}
              onPress={openDatePicker}
              disabled={isSubmitting}
            >
              <Text style={[styles.dateText, { color: colors.text, fontSize: getResponsiveSize(14, screenWidth) }]}>
                {formatDate(incidentDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary },
              isSubmitting && { backgroundColor: colors.textTertiary, elevation: 0, shadowOpacity: 0 }]}
            onPress={handleSubmitGrievance}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={[styles.submitButtonText, { fontSize: getResponsiveSize(16, screenWidth) }]}>
                Submit Grievance
              </Text>
            )}
          </TouchableOpacity>

          {/* Disclaimer */}
          <View style={[styles.disclaimerContainer, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.disclaimerText, { color: colors.textSecondary, fontSize: getResponsiveSize(12, screenWidth) }]}>
              Your grievance will be reviewed within 3-5 working days. You will receive updates on your registered email.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Date Picker */}
      {Platform.OS === "ios" ? (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.dateModalOverlay}>
            <View style={[styles.dateModalContainer, { backgroundColor: colors.surface }]}>
              <View style={[styles.dateModalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.dateModalCancel, { color: colors.textTertiary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.dateModalTitle, { color: colors.text }]}>Select Date</Text>
                <TouchableOpacity onPress={confirmDate}>
                  <Text style={[styles.dateModalDone, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="inline"
                onChange={handleDateChange}
                maximumDate={new Date()}
                accentColor={colors.primary}
                themeVariant={isDark ? "dark" : "light"}
                style={{ width: "100%" }}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showDatePicker && (
          <DateTimePicker
            value={incidentDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 5,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: "center", alignItems: "center",
    padding: 8,
  },
  headerTitle: { fontWeight: "600" },
  placeholder: { width: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  loadingText: { marginTop: 16, textAlign: "center" },
  scrollContainer: { paddingVertical: 20 },
  formContainer: {
    borderRadius: 24,
    marginBottom: 20,
    elevation: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  inputSection: { marginBottom: 20 },
  label: { fontWeight: "500", marginBottom: 8 },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  textAreaInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    height: 120,
  },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerText: { flex: 1 },
  dropdownContainer: { position: "relative", zIndex: 999 },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    maxHeight: 220,
    elevation: 20,
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
  },
  dropdownItemText: { fontSize: 14, flex: 1 },
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateText: {},
  characterCount: { fontSize: 12, marginTop: 4, textAlign: "right" },
  errorText: { fontSize: 12, marginTop: 4 },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
    elevation: 3,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  submitButtonText: { color: "#ffffff", fontWeight: "600" },
  disclaimerContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
  },
  disclaimerText: { marginLeft: 8, flex: 1, lineHeight: 18 },
  dateModalOverlay: {
    flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)",
  },
  dateModalContainer: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 36, paddingHorizontal: 12,
  },
  dateModalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 16, borderBottomWidth: 1,
  },
  dateModalTitle: { fontSize: 16, fontWeight: "700" },
  dateModalCancel: { fontSize: 15, fontWeight: "500" },
  dateModalDone: { fontSize: 15, fontWeight: "700" },
});

export default GrievanceFormScreen;
