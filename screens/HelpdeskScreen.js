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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getHelpdeskTicketsAPI, getCategoriesAPI } from '../services/api';
import HelpdeskFormScreen from './HelpdeskFormScreen';

const HelpdeskScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState({});

  useEffect(() => {
    loadTickets();
    loadCategories();
  }, []);

  const loadTickets = async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert(
          'Error',
          'Authentication token not found. Please login again.'
        );
        navigation.goBack();
        return;
      }

      const response = await getHelpdeskTicketsAPI(token);
      if (response.success) {
        setTickets(response.tickets);
      }
    } catch (error) {
      console.error('Failed to load tickets:', error);
      setError(error.message || 'Failed to load tickets');
      // Don't show alert for initial load, just set error state
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await getCategoriesAPI(token);
      if (response.success && response.categories) {
        const apiData = response.categories;
        const helpdeskCategories = apiData.helpdesk?.category || {};
        const helpdeskSubCategories = apiData.helpdesk?.sub_category || {};

        // Parse main categories
        const mainCats = Object.entries(helpdeskCategories).map(([id, name]) => ({
          id: parseInt(id),
          name: name,
        }));

        setCategories(mainCats);

        // Parse subcategories
        const subCats = {};
        Object.entries(helpdeskSubCategories).forEach(([categoryId, subCategoryData]) => {
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
      console.error('Failed to load categories:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTickets();
    setRefreshing(false);
  };

  const handleCreateTicket = () => {
    setShowCreateForm(true);
  };

  const handleFormClose = () => {
    setShowCreateForm(false);
    // Reload tickets when form is closed to show any new tickets
    loadTickets();
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
        return '#d97706';
      case '2':
      case 'closed':
      case 'resolved':
        return '#dc2626';
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
        return 'In Progress';
      case '2':
      case 'closed':
      case 'resolved':
        return 'Closed';
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


  const TicketCard = ({ ticket }) => (
    <View style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <View style={styles.ticketInfo}>
          <Text style={styles.ticketId}>{ticket.ticketId}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(ticket.status)}</Text>
          </View>
        </View>
        <View style={styles.dateContainer}>
          <Ionicons name="time-outline" size={14} color="#6b7280" />
          <Text style={styles.ticketDate}>
            {new Date(ticket.createdAt || Date.now()).toLocaleDateString()}
          </Text>
        </View>
      </View>
      
      <Text style={styles.ticketDescription} numberOfLines={3}>
        {ticket.description}
      </Text>
      
      {ticket.startDatetime && (
        <View style={styles.scheduleContainer}>
          <Ionicons name="calendar-outline" size={16} color="#8b5cf6" />
          <View style={styles.scheduleInfo}>
            <Text style={styles.scheduleLabel}>Scheduled</Text>
            <Text style={styles.scheduleText}>
              {new Date(ticket.startDatetime).toLocaleString()}
              {ticket.endDatetime && ` - ${new Date(ticket.endDatetime).toLocaleTimeString()}`}
            </Text>
          </View>
        </View>
      )}
      
      {ticket.docFile && (
        <View style={styles.attachmentContainer}>
          <Ionicons name="attach" size={16} color="#059669" />
          <Text style={styles.attachmentText}>Document attached</Text>
        </View>
      )}
      
      <View style={styles.ticketFooter}>
        <View style={styles.ticketMeta}>
          <Text style={styles.ticketMetaText}>ID: {ticket.id}</Text>
          <Text style={styles.ticketMetaText}>•</Text>
          <Text style={styles.ticketMetaText}>{formatCategoryDisplay(ticket.category, ticket.subCategory)}</Text>
        </View>
      </View>
    </View>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="ticket-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyStateTitle}>No Helpdesk Tickets</Text>
      <Text style={styles.emptyStateText}>
        You haven't created any helpdesk tickets yet. Tap the create button below to submit your first ticket.
      </Text>
    </View>
  );

  const ErrorState = () => (
    <View style={styles.errorState}>
      <Ionicons name="alert-circle-outline" size={64} color="#dc2626" />
      <Text style={styles.errorTitle}>Unable to Load Tickets</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={loadTickets}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#8b5cf6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Helpdesk Tickets</Text>
        <TouchableOpacity
          onPress={onRefresh}
          style={styles.refreshButton}
          disabled={refreshing}
        >
          <Ionicons 
            name="refresh" 
            size={24} 
            color={refreshing ? "#d1d5db" : "#8b5cf6"} 
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading tickets...</Text>
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
          {tickets.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={styles.ticketsContainer}>
              {tickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Create Button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={handleCreateTicket}
      >
        <Ionicons name="add" size={28} color="#fff" />
        <Text style={styles.createButtonText}>Create Ticket</Text>
      </TouchableOpacity>

      {/* Create Form Modal */}
      <Modal
        visible={showCreateForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleFormClose}
      >
        <HelpdeskFormScreen 
          navigation={{
            ...navigation,
            goBack: handleFormClose, // Override goBack to close modal
          }}
        />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3e8ff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8b5cf6',
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
    color: '#6b7280',
  },
  scrollContainer: {
    flex: 1,
  },
  ticketsContainer: {
    padding: 10,
    paddingBottom: 100, // Space for create button
  },
  ticketCard: {
    backgroundColor: '#ffffff',
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
    borderColor: '#f1f5f9',
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ticketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketId: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8b5cf6',
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
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  ticketDate: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  ticketDescription: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 16,
    marginTop: 8,
  },
  ticketFooter: {
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
    color: '#8b5cf6',
    fontWeight: '600',
    marginRight: 4,
  },
  scheduleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b5cf6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scheduleText: {
    fontSize: 13,
    color: '#374151',
    marginTop: 2,
  },
  attachmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
    gap: 6,
  },
  attachmentText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketMetaText: {
    fontSize: 11,
    color: '#9ca3af',
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
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
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
    color: '#dc2626',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
  },
  createButton: {
    position: 'absolute',
    bottom: 32,
    right: 16,
    left: 16,
    backgroundColor: '#8b5cf6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
    shadowColor: '#8b5cf6',
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
    color: '#ffffff',
    marginLeft: 8,
  },
});

export default HelpdeskScreen;
