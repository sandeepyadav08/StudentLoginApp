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
import { readUserAPI, getCategoriesAPI, saveGrievanceAPI } from '../services/api';

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

const GrievanceFormScreen = ({ navigation }) => {
  const { width: screenWidth } = Dimensions.get('window');
  
  // Form state
  const [name, setName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [email, setEmail] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [mainCategory, setMainCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [description, setDescription] = useState("");
  const [incidentDate, setIncidentDate] = useState(new Date());
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [errors, setErrors] = useState({});
  const [showMainCategoryPicker, setShowMainCategoryPicker] = useState(false);
  const [showSubCategoryPicker, setShowSubCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [tempDate, setTempDate] = useState(new Date());
  
  // Dynamic categories from API
  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState({});

  // Load user data and categories on component mount
  React.useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await Promise.all([
      loadUserData(),
      loadCategories()
    ]);
  };

  // Load user data from API
  const loadUserData = async () => {
    try {
      setIsLoadingUserData(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        navigation.goBack();
        return;
      }

      const response = await readUserAPI(token);
      if (response.success && response.user) {
        const user = response.user;
        // Auto-fill form fields with user data
        setName(user.name || "");
        setMobileNo(user.mobile || user.phone || "");
        setEmail(user.email || "");
        setRollNo(user.roll_no || user.student_id || user.rollNo || "");
        console.log('GRIEVANCE: User data loaded and form auto-filled');
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
      Alert.alert("Warning", "Could not auto-fill user information. Please enter manually.");
    } finally {
      setIsLoadingUserData(false);
    }
  };

  // Load categories from API
  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        navigation.goBack();
        return;
      }

      const response = await getCategoriesAPI(token);
      if (response.success && response.categories) {
        // Transform API response to expected format
        const apiData = response.categories;
        
        // Show only grievance categories
        const categories = apiData.grievance?.category || {};
        const subCategoriesData = apiData.grievance?.sub_category || {};
        
        console.log('GRIEVANCE: Category names from API:', Object.values(categories));
        
        // Parse main categories
        const mainCats = Object.entries(categories).map(([id, name]) => ({
          id: parseInt(id),
          value: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          text: name
        }));
        
        // Parse subcategories from API data
        const subCats = {};
        
        // Map main category IDs to their values for subcategory mapping
        const categoryIdToValue = {};
        mainCats.forEach(cat => {
          categoryIdToValue[cat.id] = cat.value;
        });
        
        // Parse subcategories from API response
        Object.entries(subCategoriesData).forEach(([categoryId, subCategoryData]) => {
          const mainCategoryValue = categoryIdToValue[parseInt(categoryId)];
          if (mainCategoryValue && subCategoryData) {
            subCats[mainCategoryValue] = Object.entries(subCategoryData).map(([subId, subName]) => ({
              id: parseInt(subId),
              value: subName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
              text: subName
            }));
          }
        });
        
        setMainCategories(mainCats);
        setSubCategories(subCats);
        
        console.log('GRIEVANCE: Categories loaded - Main:', mainCats.length, 'Sub:', Object.keys(subCats).length);
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
      Alert.alert("Error", "Failed to load categories. Please try again.");
      // Use fallback categories if API fails
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

  // Form validation
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
    // Only require subcategory if subcategories exist for the selected main category
    const hasSubCategories = mainCategory && subCategories[mainCategory] && subCategories[mainCategory].length > 0;
    if (hasSubCategories && !subCategory) {
      newErrors.subCategory = "Please select sub category";
    }
    if (!description.trim()) {
      newErrors.description = "Description of incident is required";
    } else if (description.trim().length < 20) {
      newErrors.description = "Description must be at least 20 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmitGrievance = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        return;
      }

      // Format date
      const formatDate = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      };

      const grievanceData = {
        name: name.trim(),
        mobile: mobileNo.trim(),
        email: email.trim(),
        roll_no: rollNo.trim(),
        category: getCategoryId(mainCategory, mainCategories),
        sub_category: getSubCategoryId(mainCategory, subCategory) || '',
        description: description.trim(),
        incident_date: formatDate(incidentDate),
        query_type: 'grievance'
      };


      // Call the API
      const response = await saveGrievanceAPI(grievanceData, token);
      console.log('API Response:', response);

      // Check if the response indicates success
      if (response && response.success) {
        const successMessage = response.message || "Your grievance has been submitted successfully. You will receive a confirmation email shortly.";
        const queryId = response.queryId || response.data?.query_id || response.data?.id;
        
        let alertMessage = successMessage;
        if (queryId) {
          alertMessage += `\n\nReference ID: ${queryId}`;
        }
        
        Alert.alert(
          "Success",
          alertMessage,
          [
            {
              text: "OK",
              onPress: () => {
                // Reset form
                setName("");
                setMobileNo("");
                setEmail("");
                setRollNo("");
                setMainCategory("");
                setSubCategory("");
                setDescription("");
                setIncidentDate(new Date());
                setErrors({});
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        // Handle case where response doesn't indicate success
        throw new Error(response?.message || "Unknown error occurred while submitting grievance");
      }
    } catch (error) {
      console.error('Grievance submission error:', error);
      
      Alert.alert(
        "Submission Failed", 
        error.message || "Failed to submit grievance. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper functions
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
    const subCategory = subCats.find((cat) => cat.value === subCategoryValue);
    return subCategory ? subCategory.id : null;
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
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) setIncidentDate(selectedDate);
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const openDatePicker = () => {
    setTempDate(incidentDate);
    setShowDatePicker(true);
  };

  const confirmDate = () => {
    setIncidentDate(tempDate);
    setShowDatePicker(false);
  };

  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const clearError = (field) => {
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  // Show loading screen while initial data is loading
  if (isLoadingUserData || isLoadingCategories) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, {
          paddingHorizontal: getResponsivePadding(16, screenWidth),
          paddingVertical: getResponsivePadding(15, screenWidth)
        }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: '#EEF0FF', width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' }]}
          >
            <Ionicons name="chevron-back" size={22} color="#6C63FF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: getResponsiveSize(18, screenWidth) }]}>
            Submit Grievance
          </Text>
          <View style={styles.placeholder} />
        </View>
        
        {/* Loading Content */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={[styles.loadingText, { fontSize: getResponsiveSize(16, screenWidth) }]}>
            {isLoadingUserData && isLoadingCategories 
              ? "Loading form data..."
              : isLoadingUserData 
              ? "Loading user information..."
              : "Loading categories..."
            }
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, {
        paddingHorizontal: getResponsivePadding(16, screenWidth),
        paddingVertical: getResponsivePadding(15, screenWidth)
      }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: '#EEF0FF', width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' }]}
        >
          <Ionicons name="chevron-back" size={22} color="#6C63FF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: getResponsiveSize(18, screenWidth) }]}>
          Submit Grievance
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContainer, {
          paddingHorizontal: getResponsivePadding(16, screenWidth)
        }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.formContainer, {
          padding: getResponsivePadding(20, screenWidth)
        }]}>
          
          {/* Personal Information Section */}
          <Text style={[styles.sectionTitle, { fontSize: getResponsiveSize(16, screenWidth) }]}>
            Personal Information
          </Text>

          {/* Name Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { fontSize: getResponsiveSize(14, screenWidth) }]}>
              Full Name *
            </Text>
            <TextInput
              style={[styles.textInput, errors.name && styles.inputError]}
              placeholder={isLoadingUserData ? "Loading..." : "Enter your full name"}
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={(text) => {
                setName(text);
                clearError('name');
              }}
              editable={!isSubmitting && !isLoadingUserData}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Mobile Number Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { fontSize: getResponsiveSize(14, screenWidth) }]}>
              Mobile Number *
            </Text>
            <TextInput
              style={[styles.textInput, errors.mobileNo && styles.inputError]}
              placeholder={isLoadingUserData ? "Loading..." : "Enter 10-digit mobile number"}
              placeholderTextColor="#9ca3af"
              value={mobileNo}
              onChangeText={(text) => {
                setMobileNo(text);
                clearError('mobileNo');
              }}
              keyboardType="numeric"
              maxLength={10}
              editable={!isSubmitting && !isLoadingUserData}
            />
            {errors.mobileNo && <Text style={styles.errorText}>{errors.mobileNo}</Text>}
          </View>

          {/* Email Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { fontSize: getResponsiveSize(14, screenWidth) }]}>
              Email Address *
            </Text>
            <TextInput
              style={[styles.textInput, errors.email && styles.inputError]}
              placeholder={isLoadingUserData ? "Loading..." : "Enter your email address"}
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                clearError('email');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isSubmitting && !isLoadingUserData}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Roll No Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { fontSize: getResponsiveSize(14, screenWidth) }]}>
              Roll No./Student ID *
            </Text>
            <TextInput
              style={[styles.textInput, errors.rollNo && styles.inputError]}
              placeholder={isLoadingUserData ? "Loading..." : "Enter your roll number or student ID"}
              placeholderTextColor="#9ca3af"
              value={rollNo}
              onChangeText={(text) => {
                setRollNo(text);
                clearError('rollNo');
              }}
              editable={!isSubmitting && !isLoadingUserData}
            />
            {errors.rollNo && <Text style={styles.errorText}>{errors.rollNo}</Text>}
          </View>

          {/* Category Section */}
          <Text style={[styles.sectionTitle, { 
            fontSize: getResponsiveSize(16, screenWidth),
            marginTop: getResponsivePadding(20, screenWidth)
          }]}>
            Grievance Category
          </Text>

          {/* Main Category Selection */}
          <View style={[styles.inputSection, { zIndex: openDropdown === 'main' ? 100 : 1 }]}>
            <Text style={[styles.label, { fontSize: getResponsiveSize(14, screenWidth) }]}>
              Main Category *
            </Text>
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  errors.mainCategory && styles.inputError,
                  openDropdown === 'main' && styles.pickerButtonOpen,
                ]}
                onPress={() => !isSubmitting && !isLoadingCategories && setOpenDropdown(openDropdown === 'main' ? null : 'main')}
                disabled={isSubmitting || isLoadingCategories}
              >
                <Text style={[styles.pickerText, !mainCategory && styles.placeholderText, { fontSize: getResponsiveSize(14, screenWidth) }]}>
                  {isLoadingCategories ? "Loading categories..." : (mainCategory ? getCategoryText(mainCategory, mainCategories) : "Choose a category")}
                </Text>
                <Ionicons name={openDropdown === 'main' ? "chevron-up" : "chevron-down"} size={20} color="#6C63FF" />
              </TouchableOpacity>
              {openDropdown === 'main' && (
                <View style={styles.dropdownMenu}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {mainCategories.map((category) => {
                      const isSelected = mainCategory === category.value;
                      return (
                        <TouchableOpacity
                          key={category.id}
                          style={[styles.dropdownItem, isSelected && { backgroundColor: '#EEF0FF' }]}
                          onPress={() => handleMainCategorySelect(category)}
                        >
                          <Text style={[styles.dropdownItemText, isSelected && { color: '#6C63FF', fontWeight: '600' }]}>
                            {category.text}
                          </Text>
                          {isSelected && <Ionicons name="checkmark-circle" size={18} color="#6C63FF" />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
            {errors.mainCategory && <Text style={styles.errorText}>{errors.mainCategory}</Text>}
          </View>

          {/* Sub-Category Selection */}
          {mainCategory && subCategories[mainCategory] && subCategories[mainCategory].length > 0 && (
            <View style={[styles.inputSection, { zIndex: openDropdown === 'sub' ? 100 : 1 }]}>
              <Text style={[styles.label, { fontSize: getResponsiveSize(14, screenWidth) }]}>
                Sub Category *
              </Text>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={[
                    styles.pickerButton,
                    errors.subCategory && styles.inputError,
                    openDropdown === 'sub' && styles.pickerButtonOpen,
                  ]}
                  onPress={() => !isSubmitting && !isLoadingCategories && setOpenDropdown(openDropdown === 'sub' ? null : 'sub')}
                  disabled={isSubmitting || isLoadingCategories}
                >
                  <Text style={[styles.pickerText, !subCategory && styles.placeholderText, { fontSize: getResponsiveSize(14, screenWidth) }]}>
                    {subCategory ? getCategoryText(subCategory, subCategories[mainCategory] || []) : "Choose sub category"}
                  </Text>
                  <Ionicons name={openDropdown === 'sub' ? "chevron-up" : "chevron-down"} size={20} color="#6C63FF" />
                </TouchableOpacity>
                {openDropdown === 'sub' && (
                  <View style={styles.dropdownMenu}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                      {subCategories[mainCategory]?.map((category) => {
                        const isSelected = subCategory === category.value;
                        return (
                          <TouchableOpacity
                            key={category.id}
                            style={[styles.dropdownItem, isSelected && { backgroundColor: '#EEF0FF' }]}
                            onPress={() => handleSubCategorySelect(category)}
                          >
                            <Text style={[styles.dropdownItemText, isSelected && { color: '#6C63FF', fontWeight: '600' }]}>
                              {category.text}
                            </Text>
                            {isSelected && <Ionicons name="checkmark-circle" size={18} color="#6C63FF" />}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>
              {errors.subCategory && <Text style={styles.errorText}>{errors.subCategory}</Text>}
            </View>
          )}

          {/* Incident Details Section */}
          <Text style={[styles.sectionTitle, { 
            fontSize: getResponsiveSize(16, screenWidth),
            marginTop: getResponsivePadding(20, screenWidth)
          }]}>
            Incident Details
          </Text>

          {/* Description Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { fontSize: getResponsiveSize(14, screenWidth) }]}>
              Description of Incident *
            </Text>
            <TextInput
              style={[styles.textAreaInput, errors.description && styles.inputError]}
              placeholder="Please provide detailed description of the incident (minimum 20 characters)"
              placeholderTextColor="#9ca3af"
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                clearError('description');
              }}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              editable={!isSubmitting}
            />
            <Text style={styles.characterCount}>
              {description.length} characters {description.length < 20 && "(minimum 20)"}
            </Text>
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          {/* Date Selection */}
          <View style={styles.inputSection}>
            <Text style={[styles.label, { fontSize: getResponsiveSize(14, screenWidth) }]}>
              Date of Incident
            </Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={openDatePicker}
              disabled={isSubmitting}
            >
              <Text style={[styles.dateText, { fontSize: getResponsiveSize(14, screenWidth) }]}>
                {formatDate(incidentDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#6C63FF" />
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
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
          <View style={styles.disclaimerContainer}>
            <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
            <Text style={[styles.disclaimerText, { fontSize: getResponsiveSize(12, screenWidth) }]}>
              Your grievance will be reviewed within 3-5 working days. You will receive updates on your registered email.
            </Text>
          </View>
        </View>
      </ScrollView>


      {/* Date Picker */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.dateModalOverlay}>
            <View style={styles.dateModalContainer}>
              <View style={styles.dateModalHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.dateModalCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.dateModalTitle}>Select Date</Text>
                <TouchableOpacity onPress={confirmDate}>
                  <Text style={styles.dateModalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="inline"
                onChange={handleDateChange}
                maximumDate={new Date()}
                accentColor="#6C63FF"
                style={{ width: '100%' }}
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
  container: {
    flex: 1,
    backgroundColor: "#F5F3FF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    borderBottomWidth: 0,
    elevation: 5,
    shadowColor: "#4C1D95",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
  },
  headerTitle: {
    fontWeight: "600",
    color: "#6C63FF",
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    color: "#6b7280",
    textAlign: "center",
  },
  scrollContainer: {
    paddingVertical: 20,
  },
  formContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    marginBottom: 20,
    elevation: 8,
    shadowColor: "#4C1D95",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
  },
  sectionTitle: {
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EEF8",
    paddingBottom: 8,
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontWeight: "500",
    color: "#1A1A2E",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E8E6F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1A1A2E",
    backgroundColor: "#F8F7FF",
  },
  textAreaInput: {
    borderWidth: 1,
    borderColor: "#E8E6F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1A1A2E",
    backgroundColor: "#F8F7FF",
    height: 120,
  },
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
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
  pickerButtonOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: "#6C63FF",
  },
  pickerText: {
    color: "#1A1A2E",
    flex: 1,
  },
  placeholderText: {
    color: "#9ca3af",
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
  dropdownItemText: {
    fontSize: 14,
    color: "#1A1A2E",
    flex: 1,
  },
  dateButton: {
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
  dateText: {
    color: "#1A1A2E",
  },
  characterCount: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    textAlign: "right",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: "#6C63FF",
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
  submitButtonDisabled: {
    backgroundColor: "#9ca3af",
    elevation: 0,
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  disclaimerContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    padding: 12,
    backgroundColor: "#EEF0FF",
    borderRadius: 12,
  },
  disclaimerText: {
    color: "#6b7280",
    marginLeft: 8,
    flex: 1,
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
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 16,
    textAlign: "center",
  },
  modalList: {
    maxHeight: 300,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalItemText: {
    fontSize: 14,
    color: "#1A1A2E",
    lineHeight: 20,
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

export default GrievanceFormScreen;
