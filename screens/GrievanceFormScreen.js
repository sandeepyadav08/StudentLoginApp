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
      console.log('User API Response:', response);
      if (response.success && response.user) {
        const user = response.user;
        console.log('User Data:', user);
        // Auto-fill form fields with user data
        setName(user.name || "");
        setMobileNo(user.mobile || user.phone || "");
        setEmail(user.email || "");
        setRollNo(user.roll_no || user.student_id || user.rollNo || "");
        console.log('Form fields set:', {
          name: user.name,
          mobile: user.mobile || user.phone,
          email: user.email,
          roll_no: user.roll_no
        });
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
        
        console.log('Categories API Data:', apiData);
        
        // The API returns nested structure: { grievance: { category: {...}, sub_category: {...} } }
        const categories = apiData.grievance?.category || {};
        const subCategoriesData = apiData.grievance?.sub_category || {};
        
        console.log('Main Categories from API:', categories);
        console.log('Sub Categories from API:', subCategoriesData);
        
        // Parse main categories
        const mainCats = Object.entries(categories).map(([id, name]) => ({
          id: parseInt(id),
          value: name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          text: name
        }));
        
        console.log('Parsed Main Categories:', mainCats);
        
        setMainCategories(mainCats);
        
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
        
        console.log('Parsed Sub Categories:', subCats);
        setSubCategories(subCats);
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
        return `${day}/${month}/${year}`;
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

      console.log('Submitting grievance:', grievanceData);

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
    setSubCategory(""); // Reset subcategory
    setShowMainCategoryPicker(false);
    setErrors({ ...errors, mainCategory: "", subCategory: "" });
  };

  const handleSubCategorySelect = (category) => {
    setSubCategory(category.value);
    setShowSubCategoryPicker(false);
    setErrors({ ...errors, subCategory: "" });
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setIncidentDate(selectedDate);
    }
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
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#8b5cf6" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { fontSize: getResponsiveSize(18, screenWidth) }]}>
            Submit Grievance
          </Text>
          <View style={styles.placeholder} />
        </View>
        
        {/* Loading Content */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
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
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#8b5cf6" />
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
          <View style={styles.inputSection}>
            <Text style={[styles.label, { fontSize: getResponsiveSize(14, screenWidth) }]}>
              Main Category *
            </Text>
            <TouchableOpacity
              style={[styles.pickerButton, errors.mainCategory && styles.inputError]}
              onPress={() => setShowMainCategoryPicker(true)}
              disabled={isSubmitting || isLoadingCategories}
            >
              <Text
                style={[
                  styles.pickerText,
                  !mainCategory && styles.placeholderText,
                  { fontSize: getResponsiveSize(14, screenWidth) }
                ]}
              >
                {isLoadingCategories 
                  ? "Loading categories..."
                  : (mainCategory ? getCategoryText(mainCategory, mainCategories) : "Choose a category")
                }
              </Text>
              <Ionicons name="chevron-down" size={20} color="#8b5cf6" />
            </TouchableOpacity>
            {errors.mainCategory && <Text style={styles.errorText}>{errors.mainCategory}</Text>}
          </View>

          {/* Sub-Category Selection */}
          {mainCategory && subCategories[mainCategory] && subCategories[mainCategory].length > 0 && (
            <View style={styles.inputSection}>
              <Text style={[styles.label, { fontSize: getResponsiveSize(14, screenWidth) }]}>
                Sub Category *
              </Text>
              <TouchableOpacity
                style={[styles.pickerButton, errors.subCategory && styles.inputError]}
                onPress={() => setShowSubCategoryPicker(true)}
                disabled={isSubmitting || isLoadingCategories}
              >
                <Text
                  style={[
                    styles.pickerText,
                    !subCategory && styles.placeholderText,
                    { fontSize: getResponsiveSize(14, screenWidth) }
                  ]}
                >
                  {subCategory 
                    ? getCategoryText(subCategory, subCategories[mainCategory] || [])
                    : isLoadingCategories ? "Loading subcategories..." : "Choose sub category"
                  }
                </Text>
                <Ionicons name="chevron-down" size={20} color="#8b5cf6" />
              </TouchableOpacity>
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
              onPress={() => setShowDatePicker(true)}
              disabled={isSubmitting}
            >
              <Text style={[styles.dateText, { fontSize: getResponsiveSize(14, screenWidth) }]}>
                {formatDate(incidentDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#8b5cf6" />
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

      {/* Main Category Picker Modal */}
      <Modal visible={showMainCategoryPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMainCategoryPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Main Category</Text>
            <ScrollView style={styles.modalList}>
              {mainCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.modalItem}
                  onPress={() => handleMainCategorySelect(category)}
                >
                  <Text style={styles.modalItemText}>{category.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Sub Category Picker Modal */}
      <Modal visible={showSubCategoryPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSubCategoryPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Sub Category</Text>
            <ScrollView style={styles.modalList}>
              {mainCategory && subCategories[mainCategory]?.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.modalItem}
                  onPress={() => handleSubCategorySelect(category)}
                >
                  <Text style={styles.modalItemText}>{category.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={incidentDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
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
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 8,
  },
  inputSection: {
    marginBottom: 20,
  },
  label: {
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#374151",
    backgroundColor: "#f9fafb",
  },
  textAreaInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#374151",
    backgroundColor: "#f9fafb",
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
  dateButton: {
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
  dateText: {
    color: "#374151",
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
    backgroundColor: "#7c3aed",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
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
  submitButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  disclaimerContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
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
    borderRadius: 12,
    padding: 20,
    width: width * 0.9,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
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
    color: "#374151",
    lineHeight: 20,
  },
});

export default GrievanceFormScreen;
