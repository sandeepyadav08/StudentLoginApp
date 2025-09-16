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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  uploadFileAPI,
  deleteFileAPI,
  saveHelpdeskAPI,
  readUserAPI,
  getCategoriesAPI,
} from "../services/api";

const HelpdeskFormScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [mainCategory, setMainCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [availableDate, setAvailableDate] = useState(new Date());
  const [availableTimeFrom, setAvailableTimeFrom] = useState(new Date());
  const [availableTimeTo, setAvailableTimeTo] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalFileName, setOriginalFileName] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showMainCategoryPicker, setShowMainCategoryPicker] = useState(false);
  const [showSubCategoryPicker, setShowSubCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimeFromPicker, setShowTimeFromPicker] = useState(false);
  const [showTimeToPicker, setShowTimeToPicker] = useState(false);

  // Dynamic categories from API
  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState({});
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Load categories from API on component mount
  React.useEffect(() => {
    loadCategories();
  }, []);

  const formatTime24Hr = (date) => {
    if (isNaN(date)) {
      return "";
    }
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const formatTime12Hr = (date) => {
    if (isNaN(date)) {
      return "";
    }
    let hours = date.getHours();
    let minutes = date.getMinutes().toString().padStart(2, "0");
    let ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // convert 0 to 12
    return `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
  };

  // Load categories from API
  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert(
          "Error",
          "Authentication token not found. Please login again."
        );
        navigation.goBack();
        return;
      }

      const response = await getCategoriesAPI(token);
      if (response.success && response.categories) {
        // Transform API response to expected format
        const apiData = response.categories;

        console.log("Helpdesk Categories API Data:", apiData);

        // The API returns nested structure: { helpdesk: { category: {...}, sub_category: {...} } }
        const categories = apiData.helpdesk?.category || {};
        const subCategoriesData = apiData.helpdesk?.sub_category || {};

        console.log("Helpdesk Main Categories from API:", categories);
        console.log("Helpdesk Sub Categories from API:", subCategoriesData);

        // Parse main categories
        const mainCats = Object.entries(categories).map(([id, name]) => ({
          id: parseInt(id),
          value: name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
          text: name,
        }));

        console.log("Parsed Helpdesk Main Categories:", mainCats);

        setMainCategories(mainCats);

        // Parse subcategories from API data
        const subCats = {};

        // Map main category IDs to their values for subcategory mapping
        const categoryIdToValue = {};
        mainCats.forEach((cat) => {
          categoryIdToValue[cat.id] = cat.value;
        });

        // Parse subcategories from API response
        Object.entries(subCategoriesData).forEach(
          ([categoryId, subCategoryData]) => {
            const mainCategoryValue = categoryIdToValue[parseInt(categoryId)];
            if (mainCategoryValue && subCategoryData) {
              subCats[mainCategoryValue] = Object.entries(subCategoryData).map(
                ([subId, subName]) => ({
                  id: parseInt(subId),
                  value: subName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
                  text: subName,
                })
              );
            }
          }
        );

        console.log("Parsed Helpdesk Sub Categories:", subCats);
        setSubCategories(subCats);
      }
    } catch (error) {
      console.error("Failed to load helpdesk categories:", error);
      Alert.alert("Error", "Failed to load categories. Please try again.");
      // Use fallback categories if API fails
      setMainCategories([
        { id: 1, value: "hostel", text: "Hostel Issues" },
        { id: 2, value: "it", text: "IT Infrastructure Issues" },
        { id: 3, value: "food", text: "Food/Mess Issues" },
        { id: 4, value: "admin", text: "Administration Issues" },
        { id: 5, value: "other", text: "Other" },
      ]);
      setSubCategories({});
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleMainCategorySelect = (category) => {
    setMainCategory(category.value);
    setSubCategory(""); // Reset subcategory when main category changes
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
      setAvailableDate(selectedDate);
    }
  };

  const handleTimeFromChange = (event, selectedTime) => {
    setShowTimeFromPicker(false);
    if (selectedTime) {
      setAvailableTimeFrom(selectedTime);
    }
  };

  const handleTimeToChange = (event, selectedTime) => {
    setShowTimeToPicker(false);
    if (selectedTime) {
      setAvailableTimeTo(selectedTime);
    }
  };

  const handleFilePicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "image/*",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        // File size validation - 2MB limit
        const maxSizeInBytes = 2 * 1024 * 1024; // 2MB in bytes
        if (file.size && file.size > maxSizeInBytes) {
          const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
          Alert.alert(
            "File Too Large",
            `The selected file is ${fileSizeInMB}MB. Please choose a file smaller than 2MB.`
          );
          return;
        }

        setSelectedFile(file); // store as object, not JSON string
        setOriginalFileName(file.name); // store original file name for UI display
        setErrors({ ...errors, file: "" });

        // Upload file to server
        await uploadFileToServer(file);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick file. Please try again.");
    }
  };

  const uploadFileToServer = async (file) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert(
          "Error",
          "Authentication token not found. Please login again."
        );
        return;
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90; // Stop at 90% until actual upload completes
          }
          return Math.min(prev + Math.random() * 15, 90); // Gradual progress to 90%
        });
      }, 300);

      const response = await uploadFileAPI(file, token);

      // Complete the progress
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Small delay to show 100% completion
      setTimeout(() => {
        setUploadProgress(0);
      }, 500);

      if (response.success) {
        console.log("Upload completed:", response.filename);
        setUploadedFileName(response.filename);
        // Show success feedback briefly
        Alert.alert("Success", "File uploaded successfully!");
      }
    } catch (error) {
      Alert.alert("Upload Error", error.message);
      // Reset file selection on upload failure
      setSelectedFile(null);
      setOriginalFileName(null);
      setUploadedFileName(null);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = () => {
    Alert.alert("Delete File", "Are you sure you want to remove this file?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteFileFromServer();
        },
      },
    ]);
  };

  const deleteFileFromServer = async () => {
    try {
      setIsDeleting(true);

      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert(
          "Error",
          "Authentication token not found. Please login again."
        );
        return;
      }

      if (uploadedFileName) {
        const response = await deleteFileAPI(uploadedFileName, token);

        if (response.success) {
          Alert.alert("Success", "File deleted successfully!");
        }
      }

      // Reset file states
      setSelectedFile(null);
      setOriginalFileName(null);
      setUploadedFileName(null);
    } catch (error) {
      Alert.alert("Delete Error", error.message || "Failed to delete file");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-GB");
  };

  const formatTime = (time) => {
    return time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!mainCategory) {
      newErrors.mainCategory = "Please select a main category";
    }

    // Only require subcategory if subcategories exist for the selected main category
    const hasSubCategories =
      mainCategory &&
      subCategories[mainCategory] &&
      subCategories[mainCategory].length > 0;
    if (hasSubCategories && !subCategory) {
      newErrors.subCategory = "Please select a sub-category";
    }

    if (!notes.trim()) {
      newErrors.notes = "Please add notes describing your complaint";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);

      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert(
          "Error",
          "Authentication token not found. Please login again."
        );
        return;
      }

      // Get category and subcategory IDs
      const mainCategoryId = getCategoryId(mainCategory, mainCategories);
      const subCategoryId =
        mainCategory === "other"
          ? null
          : getSubCategoryId(mainCategory, subCategory);

      console.log("Category mapping:", {
        mainCategoryText: mainCategory,
        mainCategoryId: mainCategoryId,
        subCategoryText: subCategory,
        subCategoryId: subCategoryId,
      });

      console.log("Submitting helpdesk ticket:", {
        mainCategoryText: mainCategory,
        mainCategoryId: mainCategoryId,
        subCategoryText: subCategory,
        subCategoryId: subCategoryId,
      });

      // Prepare ticket data with all required fields
      const ticketData = {
        category: mainCategoryId,
        sub_category: subCategoryId || "",
        description: notes,
        docFile: uploadedFileName || "",
        // Date and time fields
        start_date: availableDate,
        start_time: formatTime24Hr(availableTimeFrom),
        end_time: formatTime24Hr(availableTimeTo),
      };

      // Call the helpdesk API
      const response = await saveHelpdeskAPI(ticketData, token);
      console.log("Helpdesk API Response:", response);

      if (response.success) {
        Alert.alert(
          "Success",
          "Your complaint has been submitted successfully!",
          [
            {
              text: "OK",
              onPress: () => {
                // Reset form
                setMainCategory("");
                setSubCategory("");
                setAvailableDate(new Date());
                setAvailableTimeFrom(formatTime24Hr(new Date()));
                setAvailableTimeTo(formatTime24Hr(new Date()));
                setNotes("");
                setSelectedFile(null);
                setOriginalFileName(null);
                setUploadedFileName(null);
                setErrors({});
                // Navigate back
                navigation.goBack();
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        "Submission Error",
        error.message || "Failed to submit ticket"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryText = (value, categories) => {
    const category = categories.find((cat) => cat.value === value);
    return category ? category.text : "Choose a category";
  };

  // Helper function to get category ID by value
  const getCategoryId = (value, categories) => {
    const category = categories.find((cat) => cat.value === value);
    return category ? category.id : null;
  };

  // Helper function to get subcategory ID by value and main category
  const getSubCategoryId = (mainCategoryValue, subCategoryValue) => {
    const subCats = subCategories[mainCategoryValue];
    if (!subCats) return null;
    const subCategory = subCats.find((cat) => cat.value === subCategoryValue);
    return subCategory ? subCategory.id : null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#8b5cf6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Your Complaint</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          {/* Main Category Selection */}
          <View style={styles.categorySection}>
            <Text style={styles.label}>Select Main Category *</Text>
            <TouchableOpacity
              style={[
                styles.pickerButton,
                isLoadingCategories && styles.disabledButton,
              ]}
              onPress={() => setShowMainCategoryPicker(true)}
              disabled={isLoadingCategories}
            >
              <Text
                style={[
                  styles.pickerText,
                  !mainCategory && styles.placeholderText,
                ]}
              >
                {isLoadingCategories
                  ? "Loading categories..."
                  : mainCategory
                  ? getCategoryText(mainCategory, mainCategories)
                  : "Choose a category"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#8b5cf6" />
            </TouchableOpacity>
            {errors.mainCategory && (
              <Text style={styles.errorText}>{errors.mainCategory}</Text>
            )}
          </View>

          {/* Sub-Category Selection */}
          {mainCategory &&
            subCategories[mainCategory] &&
            subCategories[mainCategory].length > 0 && (
              <View style={styles.categorySection}>
                <Text style={styles.label}>Select Sub-Category *</Text>
                <TouchableOpacity
                  style={[
                    styles.pickerButton,
                    (isLoadingCategories ||
                      !mainCategory ||
                      mainCategory === "other") &&
                      styles.disabledButton,
                  ]}
                  onPress={() =>
                    !isLoadingCategories &&
                    mainCategory &&
                    mainCategory !== "other" &&
                    setShowSubCategoryPicker(true)
                  }
                  disabled={
                    isLoadingCategories ||
                    !mainCategory ||
                    mainCategory === "other"
                  }
                >
                  <Text
                    style={[
                      styles.pickerText,
                      !subCategory && styles.placeholderText,
                    ]}
                  >
                    {isLoadingCategories
                      ? "Loading subcategories..."
                      : mainCategory && mainCategory !== "other"
                      ? getCategoryText(
                          subCategory,
                          subCategories[mainCategory] || []
                        )
                      : "Choose main category first"}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={
                      mainCategory && mainCategory !== "other"
                        ? "#8b5cf6"
                        : "#ccc"
                    }
                  />
                </TouchableOpacity>
                {errors.subCategory && (
                  <Text style={styles.errorText}>{errors.subCategory}</Text>
                )}
              </View>
            )}

          {/* Date and Time Selection */}
          <View style={styles.categorySection}>
            <Text style={styles.label}>Available Date (DD-MM-YYYY)</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateTimeText}>
                {formatDate(availableDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#8b5cf6" />
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 16 }]}>
              Available Time Range
            </Text>
            <View style={styles.timeRangeContainer}>
              <View style={styles.timeInputContainer}>
                <Text style={styles.timeLabel}>From:</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowTimeFromPicker(true)}
                >
                  <Text style={styles.dateTimeText}>
                    {formatTime12Hr(availableTimeFrom)}
                  </Text>
                  <Ionicons name="time-outline" size={16} color="#8b5cf6" />
                </TouchableOpacity>
              </View>

              <View style={styles.timeInputContainer}>
                <Text style={styles.timeLabel}>To:</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowTimeToPicker(true)}
                >
                  <Text style={styles.dateTimeText}>
                    {formatTime12Hr(availableTimeTo)}
                  </Text>
                  <Ionicons name="time-outline" size={16} color="#8b5cf6" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Notes Section */}
          <View style={styles.categorySection}>
            <Text style={styles.label}>Add Notes *</Text>
            <TextInput
              style={styles.textArea}
              value={notes}
              onChangeText={(text) => {
                setNotes(text);
                setErrors({ ...errors, notes: "" });
              }}
              placeholder="Describe your complaint in detail..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {errors.notes && (
              <Text style={styles.errorText}>{errors.notes}</Text>
            )}
          </View>

          {/* File Upload */}
          <View style={styles.categorySection}>
            <Text style={styles.label}>Upload File (Image or Document)</Text>

            {!selectedFile ? (
              <TouchableOpacity
                style={[
                  styles.fileButton,
                  isUploading && styles.disabledButton,
                ]}
                onPress={handleFilePicker}
                disabled={isUploading}
              >
                <View style={styles.fileButtonContent}>
                  <Text style={styles.fileButtonText}>
                    {isUploading
                      ? `Uploading... ${Math.round(uploadProgress)}%`
                      : "Choose a file (Max 2MB)"}
                  </Text>
                  {isUploading ? (
                    <ActivityIndicator size="small" color="#8b5cf6" />
                  ) : (
                    <Ionicons
                      name="cloud-upload-outline"
                      size={24}
                      color="#8b5cf6"
                    />
                  )}
                </View>
                {/* Progress Bar */}
                {isUploading && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${uploadProgress}%` },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.selectedFileContainer}>
                <View style={styles.selectedFileInfo}>
                  <Ionicons
                    name="document-outline"
                    size={20}
                    color="#8b5cf6"
                    style={styles.fileIcon}
                  />
                  <Text style={styles.selectedFileName} numberOfLines={1}>
                    {originalFileName || selectedFile?.name || "Unknown file"}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.deleteFileButton,
                      isDeleting && styles.disabledButton,
                    ]}
                    onPress={handleDeleteFile}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#dc3545" />
                    ) : (
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#dc3545"
                      />
                    )}
                  </TouchableOpacity>
                </View>
                {/* Upload Status */}
                {isUploading && (
                  <View style={styles.uploadingStatus}>
                    <ActivityIndicator size="small" color="#8b5cf6" />
                    <Text style={styles.uploadingStatusText}>
                      Uploading... {Math.round(uploadProgress)}%
                    </Text>
                  </View>
                )}
                {!isUploading && uploadedFileName && (
                  <Text style={styles.uploadStatusText}>
                    ✓ Uploaded successfully
                  </Text>
                )}
              </View>
            )}

            {errors.file && <Text style={styles.errorText}>{errors.file}</Text>}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <View style={styles.submitButtonContent}>
              {isSubmitting && (
                <ActivityIndicator
                  size="small"
                  color="#fff"
                  style={styles.submitLoader}
                />
              )}
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Submitting..." : "Submit Ticket"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Main Category Picker Modal */}
      {showMainCategoryPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Main Category</Text>
            {mainCategories.map((category) => (
              <TouchableOpacity
                key={category.value}
                style={styles.modalOption}
                onPress={() => handleMainCategorySelect(category)}
              >
                <Text style={styles.modalOptionText}>{category.text}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowMainCategoryPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Sub Category Picker Modal */}
      {showSubCategoryPicker && mainCategory && mainCategory !== "other" && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Sub-Category</Text>
            <ScrollView style={styles.modalScrollView}>
              {subCategories[mainCategory]?.map((category) => (
                <TouchableOpacity
                  key={category.value}
                  style={styles.modalOption}
                  onPress={() => handleSubCategorySelect(category)}
                >
                  <Text style={styles.modalOptionText}>{category.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowSubCategoryPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={availableDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time From Picker */}
      {showTimeFromPicker && (
        <DateTimePicker
          value={availableTimeFrom}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleTimeFromChange}
        />
      )}

      {/* Time To Picker */}
      {showTimeToPicker && (
        <DateTimePicker
          value={availableTimeTo}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleTimeToChange}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3e8ff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  placeholder: {
    width: 40,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  formContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#8b5cf6",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  categorySection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#faf5ff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e9d5ff",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b21a8",
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#d8b4fe",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  disabledButton: {
    backgroundColor: "#faf5ff",
    borderColor: "#e9d5ff",
  },
  pickerText: {
    fontSize: 16,
    color: "#6b21a8",
    flex: 1,
  },
  placeholderText: {
    color: "#999",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d8b4fe",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  dateTimeButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#d8b4fe",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  dateTimeText: {
    fontSize: 16,
    color: "#6b21a8",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#d8b4fe",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    height: 120,
    textAlignVertical: "top",
  },
  fileButton: {
    borderWidth: 2,
    borderColor: "#8b5cf6",
    borderStyle: "dashed",
    borderRadius: 8,
    backgroundColor: "#faf5ff",
    padding: 16,
    overflow: "hidden",
  },
  fileButtonContent: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  fileButtonText: {
    fontSize: 16,
    color: "#8b5cf6",
    textAlign: "center",
    marginRight: 8,
  },
  progressContainer: {
    marginTop: 12,
    width: "100%",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e9d5ff",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#8b5cf6",
    borderRadius: 3,
    minWidth: 2,
  },
  selectedFileContainer: {
    borderWidth: 1,
    borderColor: "#d8b4fe",
    borderRadius: 8,
    backgroundColor: "#fff",
    padding: 12,
  },
  selectedFileInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fileIcon: {
    marginRight: 8,
  },
  selectedFileName: {
    fontSize: 16,
    color: "#6b21a8",
    flex: 1,
    fontWeight: "500",
  },
  deleteFileButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  uploadStatusText: {
    fontSize: 12,
    color: "#059669",
    marginTop: 8,
    fontWeight: "500",
  },
  uploadingStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 4,
  },
  uploadingStatusText: {
    fontSize: 12,
    color: "#8b5cf6",
    marginLeft: 8,
    fontWeight: "500",
  },
  submitButton: {
    backgroundColor: "#8b5cf6",
    borderRadius: 25,
    padding: 15,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#8b5cf6",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  submitButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitLoader: {
    marginRight: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  errorText: {
    color: "#dc3545",
    fontSize: 14,
    marginTop: 4,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxHeight: "70%",
    width: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b21a8",
    marginBottom: 16,
    textAlign: "center",
  },
  modalScrollView: {
    maxHeight: 300,
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e9d5ff",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#6b21a8",
  },
  modalCancel: {
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: "#8b5cf6",
    fontWeight: "600",
  },
  timeRangeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b21a8",
    marginBottom: 4,
  },
  timeButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: "#d8b4fe",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
});

export default HelpdeskFormScreen;
