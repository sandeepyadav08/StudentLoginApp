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
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  uploadFileAPI,
  deleteFileAPI,
  saveHelpdeskAPI,
  getCategoriesAPI,
} from "../services/api";
import { useTheme } from "../contexts/ThemeContext";

const HelpdeskFormScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();

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
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimeFromPicker, setShowTimeFromPicker] = useState(false);
  const [showTimeToPicker, setShowTimeToPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTimeFrom, setTempTimeFrom] = useState(new Date());
  const [tempTimeTo, setTempTimeTo] = useState(new Date());

  const [mainCategories, setMainCategories] = useState([]);
  const [subCategories, setSubCategories] = useState({});
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  React.useEffect(() => {
    loadCategories();
  }, []);

  const formatTime24Hr = (date) => {
    if (isNaN(date)) return "";
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const formatTime12Hr = (date) => {
    if (isNaN(date)) return "";
    let hours = date.getHours();
    let minutes = date.getMinutes().toString().padStart(2, "0");
    let ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
  };

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
        const apiData = response.categories;
        const categories = apiData.helpdesk?.category || {};
        const subCategoriesData = apiData.helpdesk?.sub_category || {};

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
      if (selectedDate) setAvailableDate(selectedDate);
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const handleTimeFromChange = (event, selectedTime) => {
    if (Platform.OS === "android") {
      setShowTimeFromPicker(false);
      if (selectedTime) setAvailableTimeFrom(selectedTime);
    } else {
      if (selectedTime) setTempTimeFrom(selectedTime);
    }
  };

  const handleTimeToChange = (event, selectedTime) => {
    if (Platform.OS === "android") {
      setShowTimeToPicker(false);
      if (selectedTime) setAvailableTimeTo(selectedTime);
    } else {
      if (selectedTime) setTempTimeTo(selectedTime);
    }
  };

  const openDatePicker = () => { setTempDate(availableDate); setShowDatePicker(true); };
  const openTimeFromPicker = () => { setTempTimeFrom(availableTimeFrom); setShowTimeFromPicker(true); };
  const openTimeToPicker = () => { setTempTimeTo(availableTimeTo); setShowTimeToPicker(true); };
  const confirmDate = () => { setAvailableDate(tempDate); setShowDatePicker(false); };
  const confirmTimeFrom = () => { setAvailableTimeFrom(tempTimeFrom); setShowTimeFromPicker(false); };
  const confirmTimeTo = () => { setAvailableTimeTo(tempTimeTo); setShowTimeToPicker(false); };

  const handleFilePicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf", "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const maxSizeInBytes = 2 * 1024 * 1024;
        if (file.size && file.size > maxSizeInBytes) {
          const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);
          Alert.alert("File Too Large", `The selected file is ${fileSizeInMB}MB. Please choose a file smaller than 2MB.`);
          return;
        }
        setSelectedFile(file);
        setOriginalFileName(file.name);
        setErrors({ ...errors, file: "" });
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
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        return;
      }

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) { clearInterval(progressInterval); return 90; }
          return Math.min(prev + Math.random() * 15, 90);
        });
      }, 300);

      const response = await uploadFileAPI(file, token);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 500);

      if (response.success) {
        setUploadedFileName(response.filename);
        Alert.alert("Success", "File uploaded successfully!");
      }
    } catch (error) {
      Alert.alert("Upload Error", error.message);
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
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteFileFromServer(); } },
    ]);
  };

  const deleteFileFromServer = async () => {
    try {
      setIsDeleting(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        return;
      }
      if (uploadedFileName) {
        const response = await deleteFileAPI(uploadedFileName, token);
        if (response.success) Alert.alert("Success", "File deleted successfully!");
      }
      setSelectedFile(null);
      setOriginalFileName(null);
      setUploadedFileName(null);
    } catch (error) {
      Alert.alert("Delete Error", error.message || "Failed to delete file");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (date) => date.toLocaleDateString("en-GB");

  const validateForm = () => {
    const newErrors = {};
    if (!mainCategory) newErrors.mainCategory = "Please select a main category";
    const hasSubCategories = mainCategory && subCategories[mainCategory] && subCategories[mainCategory].length > 0;
    if (hasSubCategories && !subCategory) newErrors.subCategory = "Please select a sub-category";
    if (!notes.trim()) newErrors.notes = "Please add notes describing your complaint";
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
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please login again.");
        return;
      }

      const mainCategoryId = getCategoryId(mainCategory, mainCategories);
      const subCategoryId = mainCategory === "other" ? null : getSubCategoryId(mainCategory, subCategory);

      const ticketData = {
        category: mainCategoryId,
        sub_category: subCategoryId || "",
        description: notes,
        docFile: uploadedFileName || "",
        start_date: availableDate,
        start_time: formatTime24Hr(availableTimeFrom),
        end_time: formatTime24Hr(availableTimeTo),
      };

      const response = await saveHelpdeskAPI(ticketData, token);
      if (response.success) {
        Alert.alert("Success", "Your complaint has been submitted successfully!", [
          {
            text: "OK",
            onPress: () => {
              setMainCategory(""); setSubCategory("");
              setAvailableDate(new Date()); setAvailableTimeFrom(new Date()); setAvailableTimeTo(new Date());
              setNotes(""); setSelectedFile(null); setOriginalFileName(null); setUploadedFileName(null); setErrors({});
              navigation.goBack();
            },
          },
        ]);
      }
    } catch (error) {
      Alert.alert("Submission Error", error.message || "Failed to submit ticket");
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
    const subCats = subCategories[mainCategoryValue];
    if (!subCats) return null;
    const subCategory = subCats.find((cat) => cat.value === subCategoryValue);
    return subCategory ? subCategory.id : null;
  };

  // Dynamic styles based on theme
  const inputBg = colors.input;
  const inputBorder = colors.inputBorder;
  const cardBg = colors.surface;
  const dropdownBg = colors.surface;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: colors.primaryContainer }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Submit Your Complaint</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.formContainer, { backgroundColor: cardBg, shadowColor: colors.shadow }]}>

          {/* Main Category */}
          <View style={[styles.categorySection, { borderBottomColor: colors.borderLight, zIndex: openDropdown === "main" ? 100 : 1 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Select Main Category *</Text>
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={[styles.pickerButton, { backgroundColor: inputBg, borderColor: inputBorder },
                  isLoadingCategories && { opacity: 0.6 },
                  openDropdown === "main" && { borderBottomColor: colors.primary },
                ]}
                onPress={() => !isLoadingCategories && setOpenDropdown(openDropdown === "main" ? null : "main")}
                disabled={isLoadingCategories}
              >
                <Text style={[styles.pickerText, { color: colors.text }, !mainCategory && { color: colors.textTertiary }]}>
                  {isLoadingCategories ? "Loading categories..." : (mainCategory ? getCategoryText(mainCategory, mainCategories) : "Choose a category")}
                </Text>
                <Ionicons name={openDropdown === "main" ? "chevron-up" : "chevron-down"} size={20} color={colors.primary} />
              </TouchableOpacity>
              {openDropdown === "main" && (
                <View style={[styles.dropdownMenu, { backgroundColor: dropdownBg, borderColor: colors.border, shadowColor: colors.shadow }]}>
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
                          <Text style={[styles.dropdownItemText, { color: colors.text },
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
            {errors.mainCategory && <Text style={styles.errorText}>{errors.mainCategory}</Text>}
          </View>

          {/* Sub-Category */}
          {mainCategory && subCategories[mainCategory] && subCategories[mainCategory].length > 0 && (
            <View style={[styles.categorySection, { borderBottomColor: colors.borderLight, zIndex: openDropdown === "sub" ? 100 : 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Select Sub-Category *</Text>
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  style={[styles.pickerButton, { backgroundColor: inputBg, borderColor: inputBorder },
                    (isLoadingCategories || !mainCategory || mainCategory === "other") && { opacity: 0.6 },
                    openDropdown === "sub" && { borderBottomColor: colors.primary },
                  ]}
                  onPress={() => !isLoadingCategories && mainCategory && mainCategory !== "other" && setOpenDropdown(openDropdown === "sub" ? null : "sub")}
                  disabled={isLoadingCategories || !mainCategory || mainCategory === "other"}
                >
                  <Text style={[styles.pickerText, { color: colors.text }, !subCategory && { color: colors.textTertiary }]}>
                    {isLoadingCategories ? "Loading subcategories..." : (mainCategory && mainCategory !== "other" ? getCategoryText(subCategory, subCategories[mainCategory] || []) : "Choose main category first")}
                  </Text>
                  <Ionicons name={openDropdown === "sub" ? "chevron-up" : "chevron-down"} size={20} color={mainCategory && mainCategory !== "other" ? colors.primary : colors.textTertiary} />
                </TouchableOpacity>
                {openDropdown === "sub" && (
                  <View style={[styles.dropdownMenu, { backgroundColor: dropdownBg, borderColor: colors.border, shadowColor: colors.shadow }]}>
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
                            <Text style={[styles.dropdownItemText, { color: colors.text },
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
              {errors.subCategory && <Text style={styles.errorText}>{errors.subCategory}</Text>}
            </View>
          )}

          {/* Date and Time */}
          <View style={[styles.categorySection, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.label, { color: colors.text }]}>Available Date (DD-MM-YYYY)</Text>
            <TouchableOpacity
              style={[styles.dateTimeButton, { backgroundColor: inputBg, borderColor: inputBorder }]}
              onPress={openDatePicker}
            >
              <Text style={[styles.dateTimeText, { color: colors.text }]}>{formatDate(availableDate)}</Text>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 16, color: colors.text }]}>Available Time Range</Text>
            <View style={styles.timeRangeContainer}>
              <View style={styles.timeInputContainer}>
                <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>From:</Text>
                <TouchableOpacity
                  style={[styles.timeButton, { backgroundColor: inputBg, borderColor: inputBorder }]}
                  onPress={openTimeFromPicker}
                >
                  <Text style={[styles.dateTimeText, { color: colors.text }]}>{formatTime12Hr(availableTimeFrom)}</Text>
                  <Ionicons name="time-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.timeInputContainer}>
                <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>To:</Text>
                <TouchableOpacity
                  style={[styles.timeButton, { backgroundColor: inputBg, borderColor: inputBorder }]}
                  onPress={openTimeToPicker}
                >
                  <Text style={[styles.dateTimeText, { color: colors.text }]}>{formatTime12Hr(availableTimeTo)}</Text>
                  <Ionicons name="time-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Notes */}
          <View style={[styles.categorySection, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.label, { color: colors.text }]}>Add Notes *</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text }]}
              value={notes}
              onChangeText={(text) => { setNotes(text); setErrors({ ...errors, notes: "" }); }}
              placeholder="Describe your complaint in detail..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            {errors.notes && <Text style={styles.errorText}>{errors.notes}</Text>}
          </View>

          {/* File Upload */}
          <View style={[styles.categorySection, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.label, { color: colors.text }]}>Upload File (Image or Document)</Text>

            {!selectedFile ? (
              <TouchableOpacity
                style={[styles.fileButton, { borderColor: colors.primary, backgroundColor: colors.primaryContainer },
                  isUploading && { opacity: 0.6 }]}
                onPress={handleFilePicker}
                disabled={isUploading}
              >
                <View style={styles.fileButtonContent}>
                  <Text style={[styles.fileButtonText, { color: colors.primary }]}>
                    {isUploading ? `Uploading... ${Math.round(uploadProgress)}%` : "Choose a file (Max 2MB)"}
                  </Text>
                  {isUploading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                  )}
                </View>
                {isUploading && (
                  <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { backgroundColor: colors.borderLight }]}>
                      <View style={[styles.progressFill, { width: `${uploadProgress}%`, backgroundColor: colors.primary }]} />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <View style={[styles.selectedFileContainer, { borderColor: colors.border, backgroundColor: colors.surfaceVariant }]}>
                <View style={styles.selectedFileInfo}>
                  <Ionicons name="document-outline" size={20} color={colors.primary} style={styles.fileIcon} />
                  <Text style={[styles.selectedFileName, { color: colors.primary }]} numberOfLines={1}>
                    {originalFileName || selectedFile?.name || "Unknown file"}
                  </Text>
                  <TouchableOpacity
                    style={[styles.deleteFileButton, { backgroundColor: colors.errorContainer, borderColor: colors.error }]}
                    onPress={handleDeleteFile}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    )}
                  </TouchableOpacity>
                </View>
                {isUploading && (
                  <View style={styles.uploadingStatus}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.uploadingStatusText, { color: colors.primary }]}>
                      Uploading... {Math.round(uploadProgress)}%
                    </Text>
                  </View>
                )}
                {!isUploading && uploadedFileName && (
                  <Text style={[styles.uploadStatusText, { color: colors.success }]}>✓ Uploaded successfully</Text>
                )}
              </View>
            )}
            {errors.file && <Text style={styles.errorText}>{errors.file}</Text>}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }, isSubmitting && { backgroundColor: colors.textTertiary, elevation: 0 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <View style={styles.submitButtonContent}>
              {isSubmitting && <ActivityIndicator size="small" color="#fff" style={styles.submitLoader} />}
              <Text style={styles.submitButtonText}>{isSubmitting ? "Submitting..." : "Submit Ticket"}</Text>
            </View>
          </TouchableOpacity>
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
                minimumDate={new Date()}
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
            value={availableDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )
      )}

      {/* Time From Picker */}
      {Platform.OS === "ios" ? (
        <Modal visible={showTimeFromPicker} transparent animationType="slide">
          <View style={styles.dateModalOverlay}>
            <View style={[styles.dateModalContainer, { backgroundColor: colors.surface }]}>
              <View style={[styles.dateModalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowTimeFromPicker(false)}>
                  <Text style={[styles.dateModalCancel, { color: colors.textTertiary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.dateModalTitle, { color: colors.text }]}>From Time</Text>
                <TouchableOpacity onPress={confirmTimeFrom}>
                  <Text style={[styles.dateModalDone, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempTimeFrom}
                mode="time"
                display="spinner"
                onChange={handleTimeFromChange}
                themeVariant={isDark ? "dark" : "light"}
                style={styles.timePickerIOS}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showTimeFromPicker && (
          <DateTimePicker
            value={availableTimeFrom}
            mode="time"
            display="default"
            onChange={handleTimeFromChange}
          />
        )
      )}

      {/* Time To Picker */}
      {Platform.OS === "ios" ? (
        <Modal visible={showTimeToPicker} transparent animationType="slide">
          <View style={styles.dateModalOverlay}>
            <View style={[styles.dateModalContainer, { backgroundColor: colors.surface }]}>
              <View style={[styles.dateModalHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShowTimeToPicker(false)}>
                  <Text style={[styles.dateModalCancel, { color: colors.textTertiary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.dateModalTitle, { color: colors.text }]}>To Time</Text>
                <TouchableOpacity onPress={confirmTimeTo}>
                  <Text style={[styles.dateModalDone, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempTimeTo}
                mode="time"
                display="spinner"
                onChange={handleTimeToChange}
                themeVariant={isDark ? "dark" : "light"}
                style={styles.timePickerIOS}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showTimeToPicker && (
          <DateTimePicker
            value={availableTimeTo}
            mode="time"
            display="default"
            onChange={handleTimeToChange}
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
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  backButton: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: "center", alignItems: "center",
    padding: 8,
  },
  headerTitle: { fontSize: 19, fontWeight: "700", letterSpacing: 0.3 },
  placeholder: { width: 40 },
  scrollContainer: { flexGrow: 1, padding: 20 },
  formContainer: {
    borderRadius: 24,
    padding: 22,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 8,
  },
  categorySection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8 },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  pickerText: { fontSize: 15, flex: 1 },
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
  dateTimeButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  dateTimeText: { fontSize: 15 },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    height: 120,
    textAlignVertical: "top",
  },
  fileButton: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    overflow: "hidden",
  },
  fileButtonContent: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  fileButtonText: { fontSize: 16, textAlign: "center", marginRight: 8 },
  progressContainer: { marginTop: 12, width: "100%" },
  progressBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3, minWidth: 2 },
  selectedFileContainer: { borderWidth: 1, borderRadius: 12, padding: 12 },
  selectedFileInfo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fileIcon: { marginRight: 8 },
  selectedFileName: { fontSize: 16, flex: 1, fontWeight: "500" },
  deleteFileButton: {
    padding: 8, borderRadius: 6, borderWidth: 1,
  },
  uploadStatusText: { fontSize: 12, marginTop: 8, fontWeight: "500" },
  uploadingStatus: { flexDirection: "row", alignItems: "center", marginTop: 8, paddingVertical: 4 },
  uploadingStatusText: { fontSize: 12, marginLeft: 8, fontWeight: "500" },
  submitButton: {
    borderRadius: 14, padding: 15, alignItems: "center", marginTop: 20,
    shadowColor: "#6C63FF", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  submitButtonContent: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  submitLoader: { marginRight: 8 },
  submitButtonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  errorText: { color: "#dc3545", fontSize: 14, marginTop: 4 },
  timeRangeContainer: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12,
  },
  timeInputContainer: { flex: 1 },
  timeLabel: { fontSize: 13, fontWeight: "500", marginBottom: 6 },
  timeButton: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 13, borderWidth: 1, borderRadius: 12,
  },
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
  timePickerIOS: { width: "100%", height: 200 },
});

export default HelpdeskFormScreen;
