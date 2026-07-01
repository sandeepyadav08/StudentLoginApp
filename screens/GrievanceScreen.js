 import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useSafeAreaInsets,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getGrievancesAPI, getCategoriesAPI } from '../services/api';
import GrievanceFormScreen from './GrievanceFormScreen';
import { useTheme } from '../contexts/ThemeContext';
import ScreenWrapper from '../components/ScreenWrapper';

const GrievanceScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState({});

  useEffect(() => {
    loadGrievances();
    loadCategories();
  }, []);

  const loadGrievances = async () => {
    try {
      setError(null);
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        Alert.alert(
          'Error',
          'Authentication token not found. Please login again.'
        );
        navigation.goBack();
        return;
      }

      const response = await getGrievancesAPI(token);
      if (response.success) {
        setGrievances(response.grievances);
      }
    } catch (error) {
      console.error('Failed to load grievances:', error);
      setError(error.message || 'Failed to load grievances');
      // Don't show alert for initial load, just set error state
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) return;

      const response = await getCategoriesAPI(token);
      if (response.success && response.categories) {
        const apiData = response.categories;
        const grievanceCategories = apiData.grievance?.category || {};
        const grievanceSubCategories = apiData.grievance?.sub_category || {};

        // Parse main categories
        const mainCats = Object.entries(grievanceCategories).map(([id, name]) => ({
          id: parseInt(id),
          name: name,
        }));

        setCategories(mainCats);

        // Parse subcategories
        const subCats = {};
        Object.entries(grievanceSubCategories).forEach(([categoryId, subCategoryData]) => {
          if (subCategoryData) {
            subCats[parseInt(categoryId)] = Object.entries(subCategoryData).map(([subId, subName]) => ({
              id: parseInt(subId),
              name: subName,
            }));
          }
        });

        setSubCategories(subCats);
      }
    } catch (error) {
      console.error('Failed to load grievance categories:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGrievances();
    setRefreshing(false);
  };

  const handleCreateGrievance = () => {
    setShowCreateForm(true);
  };

  const handleFormClose = () => {
    setShowCreateForm(false);
    // Reload grievances when form is closed to show any new grievances
    loadGrievances();
  };

  const getStatusColor = (status) => {
    const statusStr = String(status).toLowerCase();
    switch (statusStr) {
      case '0':
      case 'open':
        return '#059669';
      case '1':
      case 'in_progress':
      case 'in progress':
      case 'under_review':
      case 'under review':
        return '#d97706';
      case '2':
      case 'closed':
      case 'resolved':
        return '#dc2626';
      case '3':
      case 'rejected':
        return '#7c2d12';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    const statusStr = String(status).toLowerCase();
    switch (statusStr) {
      case '0':
      case 'open':
        return 'Open';
      case '1':
      case 'in_progress':
      case 'in progress':
      case 'under_review':
      case 'under review':
        return 'Under Review';
      case '2':
      case 'closed':
      case 'resolved':
        return 'Resolved';
      case '3':
      case 'rejected':
        return 'Rejected';
      default:
        return status ? `Status ${status}` : 'Unknown';
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === parseInt(categoryId));
    return category ? category.name : `Cat ${categoryId}`;
  };

  const getSubCategoryName = (categoryId, subCategoryId) => {
    const subCats = subCategories[parseInt(categoryId)];
    if (!subCats || !subCategoryId) return '';
    const subCategory = subCats.find(subCat => subCat.id === parseInt(subCategoryId));
    return subCategory ? subCategory.name : `SubCat ${subCategoryId}`;
  };

  const formatCategoryDisplay = (categoryId, subCategoryId) => {
    const categoryName = getCategoryName(categoryId);
    const subCategoryName = getSubCategoryName(categoryId, subCategoryId);
    return subCategoryName ? `${categoryName} - ${subCategoryName}` : categoryName;
  };


  const GrievanceCard = ({ grievance }) => (
    <View style={[styles.grievanceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.grievanceHeader}>
        <View style={styles.grievanceInfo}>
          <Text style={[styles.grievanceId, { color: colors.primary }]}>#{grievance.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(grievance.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(grievance.status)}</Text>
          </View>
        </View>
        <View style={styles.dateContainer}>
          <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
          <Text style={[styles.grievanceDate, { color: colors.textSecondary }]}>
            {new Date(grievance.createdAt || Date.now()).toLocaleDateString()}
          </Text>
        </View>
      </View>
      
      <Text style={[styles.grievanceMessage, { color: colors.text }]} numberOfLines={4}>
        {grievance.description}
      </Text>
      
      {grievance.datetime && (
        <View style={[styles.incidentContainer, { backgroundColor: colors.errorContainer }]}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
          <View style={styles.incidentInfo}>
            <Text style={[styles.incidentLabel, { color: colors.error }]}>Incident Date</Text>
            <Text style={[styles.incidentText, { color: colors.text }]}>
              {grievance.datetime}
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.grievanceFooter}>
        <View style={styles.grievanceMeta}>
          <Text style={[styles.grievanceMetaText, { color: colors.textTertiary }]}>{formatCategoryDisplay(grievance.queryType, grievance.subType)}</Text>
        </View>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="alert-circle-outline" size={64} color={colors.textTertiary} />
      <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Grievances</Text>
      <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
        You haven't submitted any grievances yet. Tap the create button below to file your first grievance.
      </Text>
    </View>
  );

  const ErrorState = () => (
    <View style={styles.errorState}>
      <Ionicons name="warning-outline" size={64} color={colors.error} />
      <Text style={[styles.errorTitle, { color: colors.error }]}>Unable to Load Grievances</Text>
      <Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
      <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadGrievances}>
        <Text style={[styles.retryButtonText, { color: colors.onPrimary }]}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScreenWrapper>
      <View style={[styles.header, { backgroundColor: 'transparent', borderBottomColor: "transparent" }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, { backgroundColor: colors.primaryContainer || '#EEF0FF', width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Grievances</Text>
        <TouchableOpacity
          onPress={onRefresh}
          style={styles.refreshButton}
          disabled={refreshing}
        >
          <Ionicons 
            name="refresh" 
            size={24} 
            color={refreshing ? colors.textTertiary : colors.primary} 
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading grievances...</Text>
        </View>
      ) : error ? (
        <ErrorState />
      ) : (
        <ScrollView 
          style={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >

          
          {grievances.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={styles.grievancesContainer}>
              {grievances.map((grievance) => (
                <GrievanceCard key={grievance.id} grievance={grievance} />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Create Button */}
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: colors.primary }]}
        onPress={handleCreateGrievance}
      >
        <Ionicons name="add" size={28} color={colors.onPrimary} />
        <Text style={[styles.createButtonText, { color: colors.onPrimary }]}>Create Grievance</Text>
      </TouchableOpacity>

      {/* Create Form Modal */}
      <Modal
        visible={showCreateForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleFormClose}
      >
        <GrievanceFormScreen 
          navigation={{
            ...navigation,
            goBack: handleFormClose, // Override goBack to close modal
          }}
        />
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  grievancesContainer: {
    padding: 16,
    paddingBottom: 100, // Space for create button
  },
  grievanceCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
  },
  grievanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  grievanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grievanceId: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  grievanceDate: {
    fontSize: 12,
    marginLeft: 4,
  },
  grievanceMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
    marginTop: 8,
  },
  grievanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 14,
    color: 'colors.primary',
    fontWeight: '600',
    marginRight: 4,
  },
  incidentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  incidentInfo: {
    flex: 1,
  },
  incidentLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  incidentText: {
    fontSize: 13,
    marginTop: 2,
  },
  grievanceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  grievanceMetaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  createButton: {
    position: 'absolute',
    bottom: 32,
    right: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    shadowColor: 'colors.primary',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default GrievanceScreen;
