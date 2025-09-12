import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Modal,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDashboardData } from '../services/dashboardApi';
import { logoutAPI } from '../services/api';

const { width } = Dimensions.get('window');

// Responsive utility functions
const getResponsiveSize = (baseSize, screenWidth) => {
  const scale = screenWidth / 375; // 375 is iPhone 6/7/8 width as base
  return Math.round(baseSize * Math.max(scale, 0.8)); // Minimum scale of 0.8
};

const getResponsivePadding = (basePadding, screenWidth) => {
  if (screenWidth < 350) return basePadding * 0.8;
  if (screenWidth > 414) return basePadding * 1.2;
  return basePadding;
};

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  const [dashboardData, setDashboardData] = useState({
    grievance: 0,
    ticket: 0,
    utility: 0,
    subscriptions: {}
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerAnimation] = useState(new Animated.Value(-width * 0.8));
  const [isDrawerAnimating, setIsDrawerAnimating] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    loadDashboardData();
    
    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);
      const data = await getDashboardData();
      setDashboardData(data);
      if (!data.success) {
        setError(data.message || 'Failed to load some data');
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
      setError(error.message || 'Failed to load dashboard data');
      Alert.alert('Error', 'Failed to load dashboard data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const toggleDrawer = () => {
    // Prevent multiple rapid calls during animation
    if (isDrawerAnimating) return;
    
    setIsDrawerAnimating(true);
    
    if (drawerVisible) {
      // Close drawer
      Animated.timing(drawerAnimation, {
        toValue: -width * 0.8,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        if (isMounted.current) {
          setDrawerVisible(false);
          setIsDrawerAnimating(false);
        }
      });
    } else {
      // Open drawer
      setDrawerVisible(true);
      Animated.timing(drawerAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        if (isMounted.current) {
          setIsDrawerAnimating(false);
        }
      });
    }
  };

  const handleDrawerItemPress = (item) => {
    // Prevent multiple rapid calls
    if (isDrawerAnimating) return;
    
    // Close drawer first, then navigate after animation completes
    if (drawerVisible) {
      setIsDrawerAnimating(true);
      Animated.timing(drawerAnimation, {
        toValue: -width * 0.8,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        if (isMounted.current) {
          setDrawerVisible(false);
          setIsDrawerAnimating(false);
          
          // Navigate after drawer is closed
          setTimeout(() => {
            if (isMounted.current) {
              if (item === 'Helpdesk') {
                navigation.navigate('HelpdeskForm');
              } else {
                Alert.alert('Navigation', `Navigate to ${item}`);
              }
            }
          }, 100); // Small delay to ensure state updates are complete
        }
      });
    }
  };

  const handleLogout = async () => {
    if (isNavigating) return;
    
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: async () => {
            setIsNavigating(true);
            try {
              const token = await AsyncStorage.getItem('userToken');
              if (token) {
                await logoutAPI(token);
              }
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userEmail');
              navigation.replace('Login');
            } catch (error) {
              console.error('Logout error:', error);
              // Even if API fails, clear local storage and navigate to login
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userEmail');
              navigation.replace('Login');
            }
          }
        }
      ]
    );
  };

  const handleDataNavigation = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    
    navigation.navigate('DataTabs');
    
    // Reset navigation flag after a brief delay
    setTimeout(() => {
      if (isMounted.current) {
        setIsNavigating(false);
      }
    }, 1000);
  };

  const StatCard = ({ title, count, color, icon }) => (
    <View style={[styles.statCard, { 
      backgroundColor: color.bg,
      padding: getResponsivePadding(16, screenWidth) 
    }]}>
      <View style={styles.statIcon}>
        <Ionicons name={icon} size={screenWidth < 350 ? 20 : 24} color={color.icon} />
      </View>
      <Text style={[styles.statCount, { fontSize: getResponsiveSize(28, screenWidth) }]}>{count}</Text>
      <Text style={[styles.statTitle, { fontSize: getResponsiveSize(12, screenWidth) }]}>{title}</Text>
    </View>
  );

  const SubscriptionItem = ({ subscription }) => {
    const isActive = subscription.status === 'active';
    const isExpired = subscription.isExpired;
    const isExpiringSoon = subscription.isExpiringSoon;
    
    let indicatorColor = '#16a34a'; // Green for active
    if (isExpired) {
      indicatorColor = '#dc2626'; // Red for expired
    } else if (isExpiringSoon) {
      indicatorColor = '#f59e0b'; // Yellow for expiring soon
    }

    return (
      <View style={styles.subscriptionItem}>
        <View style={styles.subscriptionLeft}>
          <View style={[styles.subscriptionIndicator, { backgroundColor: indicatorColor }]} />
          <View>
            <Text style={[styles.subscriptionTitle, { fontSize: getResponsiveSize(16, screenWidth) }]}>
              {subscription.name || 'Unknown Utility'}
            </Text>
            {subscription.amount && (
              <Text style={[styles.subscriptionAmount, { fontSize: getResponsiveSize(12, screenWidth) }]}>
                ₹{subscription.amount}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.subscriptionRight}>
          <Text style={[styles.subscriptionEndDate, { fontSize: getResponsiveSize(14, screenWidth) }]}>
            End: {subscription.endDate}
          </Text>
          {subscription.daysRemaining !== undefined && (
            <Text style={[
              styles.subscriptionDays, 
              { 
                fontSize: getResponsiveSize(12, screenWidth),
                color: isExpired ? '#dc2626' : isExpiringSoon ? '#f59e0b' : '#16a34a'
              }
            ]}>
              {isExpired ? 'Expired' : `${subscription.daysRemaining} days left`}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
      
      {/* Header */}
      <View style={[styles.header, { 
        paddingHorizontal: getResponsivePadding(16, screenWidth),
        paddingVertical: getResponsivePadding(15, screenWidth)
      }]}>
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={toggleDrawer}
          disabled={isDrawerAnimating}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={24} color="#7c3aed" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: getResponsiveSize(18, screenWidth) }]}>Student Portal</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#7c3aed" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Section */}
        <View style={[styles.welcomeSection, {
          margin: getResponsivePadding(16, screenWidth),
          padding: getResponsivePadding(20, screenWidth)
        }]}>
          <Text style={[styles.welcomeTitle, { fontSize: getResponsiveSize(24, screenWidth) }]}>Welcome, Student!</Text>
          <Text style={[styles.welcomeSubtitle, { fontSize: getResponsiveSize(14, screenWidth) }]}>Manage your college activities efficiently</Text>
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="warning-outline" size={16} color="#dc2626" />
              <Text style={[styles.errorText, { fontSize: getResponsiveSize(12, screenWidth) }]}>{error}</Text>
            </View>
          )}
        </View>

        {/* Stats Cards */}
        <View style={[styles.statsContainer, {
          paddingHorizontal: getResponsivePadding(16, screenWidth),
          marginBottom: getResponsivePadding(24, screenWidth)
        }]}>
          <StatCard
            title="Grievance"
            count={dashboardData.grievance}
            color={{
              bg: '#dcfce7',
              icon: '#16a34a'
            }}
            icon="alert-circle-outline"
          />
          <StatCard
            title="Ticket"
            count={dashboardData.ticket}
            color={{
              bg: '#dbeafe',
              icon: '#2563eb'
            }}
            icon="ticket-outline"
          />
          <StatCard
            title="Utility"
            count={dashboardData.utility}
            color={{
              bg: '#fef3c7',
              icon: '#d97706'
            }}
            icon="construct-outline"
          />
        </View>

        {/* Subscription Utilities */}
        <View style={[styles.subscriptionSection, {
          marginHorizontal: getResponsivePadding(16, screenWidth),
          padding: getResponsivePadding(20, screenWidth)
        }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { fontSize: getResponsiveSize(18, screenWidth) }]}>Subscription Utilities</Text>
            <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
              <Text style={[styles.refreshButton, { 
                fontSize: getResponsiveSize(14, screenWidth),
                opacity: refreshing ? 0.5 : 1
              }]}>
                {refreshing ? 'Refreshing...' : 'Refresh All'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { fontSize: getResponsiveSize(14, screenWidth) }]}>
                Loading subscriptions...
              </Text>
            </View>
          ) : (
            <View style={styles.subscriptionContainer}>
              {Object.keys(dashboardData.subscriptions).length > 0 ? (
                Object.entries(dashboardData.subscriptions).map(([key, subscription]) => (
                  <SubscriptionItem
                    key={key}
                    subscription={subscription}
                  />
                ))
              ) : (
                <View style={styles.noSubscriptions}>
                  <Text style={[styles.noSubscriptionsText, { fontSize: getResponsiveSize(14, screenWidth) }]}>
                    {error ? 'Unable to load subscriptions' : 'No active subscriptions found'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNavigation, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={screenWidth < 350 ? 20 : 24} color="#7c3aed" />
          <Text style={[styles.navText, { fontSize: screenWidth < 350 ? 9 : 10 }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={handleDataNavigation}
          disabled={isNavigating || isDrawerAnimating}
          activeOpacity={0.7}
        >
          <Ionicons name="bar-chart-outline" size={screenWidth < 350 ? 20 : 24} color="#9ca3af" />
          <Text style={[styles.navText, { color: '#9ca3af', fontSize: screenWidth < 350 ? 9 : 10 }]}>Data</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={handleLogout}
          disabled={isNavigating || isDrawerAnimating}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={screenWidth < 350 ? 20 : 24} color="#9ca3af" />
          <Text style={[styles.navText, { color: '#9ca3af', fontSize: screenWidth < 350 ? 9 : 10 }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Drawer Modal */}
      <Modal
        visible={drawerVisible}
        transparent
        animationType="none"
        onRequestClose={toggleDrawer}
      >
        <TouchableOpacity
          style={styles.drawerOverlay}
          activeOpacity={1}
          onPress={toggleDrawer}
          disabled={isDrawerAnimating}
        >
          <Animated.View
            style={[
              styles.drawer,
              {
                transform: [{ translateX: drawerAnimation }]
              }
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>Menu</Text>
                <TouchableOpacity 
                  onPress={toggleDrawer}
                  disabled={isDrawerAnimating}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={24} color="#7c3aed" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.drawerContent}>
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => handleDrawerItemPress('Helpdesk')}
                  disabled={isDrawerAnimating}
                  activeOpacity={0.7}
                >
                  <Ionicons name="help-circle-outline" size={24} color="#7c3aed" />
                  <Text style={styles.drawerItemText}>Helpdesk</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => handleDrawerItemPress('Grievance')}
                  disabled={isDrawerAnimating}
                  activeOpacity={0.7}
                >
                  <Ionicons name="alert-circle-outline" size={24} color="#7c3aed" />
                  <Text style={styles.drawerItemText}>Grievance</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.drawerItem}
                  onPress={() => handleDrawerItemPress('Utility')}
                  disabled={isDrawerAnimating}
                  activeOpacity={0.7}
                >
                  <Ionicons name="construct-outline" size={24} color="#7c3aed" />
                  <Text style={styles.drawerItemText}>Utility</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3e8ff',
  },
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
    marginTop: Platform.OS === 'android' ? 0 : 0, // Additional margin if needed
  },
  menuButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7c3aed',
  },
  notificationButton: {
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f3e8ff',
  },
  welcomeSection: {
    backgroundColor: '#7c3aed',
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#e0e7ff',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    width: '31%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 8,
  },
  statCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  subscriptionSection: {
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7c3aed',
  },
  refreshButton: {
    fontSize: 14,
    color: '#7c3aed',
    fontWeight: '500',
  },
  subscriptionContainer: {
    gap: 16,
  },
  subscriptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  subscriptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionIndicator: {
    width: 12,
    height: 12,
    backgroundColor: '#16a34a',
    borderRadius: 6,
    marginRight: 12,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  subscriptionRight: {
    alignItems: 'flex-end',
  },
  subscriptionEndDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  subscriptionAmount: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
    marginTop: 2,
  },
  subscriptionDays: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  noSubscriptions: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noSubscriptionsText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderRadius: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginLeft: 6,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: Platform.OS === 'android' ? 12 : 12,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navText: {
    fontSize: 10,
    marginTop: 4,
    color: '#7c3aed',
    fontWeight: '500',
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    width: width * 0.8,
    height: '100%',
    backgroundColor: '#ffffff',
    paddingTop: 20, // Increased padding to avoid notification bar
  
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#7c3aed',
  },
  drawerContent: {
    paddingTop: 20,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  drawerItemText: {
    fontSize: 16,
    marginLeft: 16,
    color: '#1f2937',
  },
});
