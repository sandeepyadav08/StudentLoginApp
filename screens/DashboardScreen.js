import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDashboardData, readUserAPI } from "../services/api";
import { useTheme } from "../contexts/ThemeContext";
import ScreenWrapper from '../components/ScreenWrapper';

const { width } = Dimensions.get("window");

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
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const { colors, isDark, resetThemeToLight } = useTheme();

  const [dashboardData, setDashboardData] = useState({
    grievance: 0,
    ticket: 0,
    utility: 0,
    subscriptions: {},
  });
  const [userName, setUserName] = useState("Student");
  const [userEmail, setUserEmail] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [utilitySubmenuOpen, setUtilitySubmenuOpen] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    loadDashboardData();
    loadUserData();

    // Cleanup function
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const storedEmail = await AsyncStorage.getItem("userEmail");
      if (storedEmail) setUserEmail(storedEmail);
      if (token) {
        const userData = await readUserAPI(token);
        if (userData.success && userData.user?.name) {
          setUserName(userData.user.name);
        }
        if (userData.success && userData.user?.email) {
          setUserEmail(userData.user.email);
        }
      }
    } catch (error) {
      console.error("User data load error:", error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setError(null);
      const data = await getDashboardData();
      setDashboardData(data);
      if (!data.success) {
        setError(data.message || "Failed to load some data");
      }
    } catch (error) {
      console.error("Dashboard load error:", error);
      setError(error.message || "Failed to load dashboard data");
      Alert.alert(
        "Error",
        "Failed to load dashboard data. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboardData(), loadUserData()]);
    setRefreshing(false);
  };

  const toggleDrawer = () => {
    navigation.openDrawer();
  };

  const handleDrawerItemPress = (item) => {
    if (item === "Utility") {
      setUtilitySubmenuOpen(!utilitySubmenuOpen);
      return;
    }
  };

  const StatCard = ({ title, count, color, icon }) => {
    const pad = getResponsivePadding(16, screenWidth);

    if (Platform.OS === "ios") {
      return (
        <BlurView
          intensity={55}
          tint={isDark ? "dark" : "light"}
          style={[styles.statCardWrapper, { padding: pad, borderColor: 'rgba(255,255,255,0.75)', borderWidth: 1.5 }]}
        >
          <View style={[styles.statCardOverlay, { backgroundColor: isDark ? `${color.icon}25` : `${color.bg}BB` }]} />
          <View style={[styles.statIconWrapper, { backgroundColor: `${color.icon}30` }]}>
            <Ionicons name={icon} size={screenWidth < 350 ? 20 : 24} color={color.icon} />
          </View>
          <Text style={[styles.statCount, { color: colors.text, fontSize: getResponsiveSize(28, screenWidth) }]}>{count}</Text>
          <Text style={[styles.statTitle, { color: colors.textSecondary, fontSize: getResponsiveSize(12, screenWidth) }]}>{title}</Text>
        </BlurView>
      );
    }

    return (
      <View
        style={[
          styles.statCardWrapper,
          {
            padding: pad,
            backgroundColor: isDark ? `${color.icon}18` : color.bg,
            elevation: isDark ? 0 : 4,
            borderWidth: isDark ? 1 : 0,
            borderColor: isDark ? `${color.icon}50` : 'transparent',
          },
        ]}
      >
        <View style={[styles.statIconWrapper, { backgroundColor: `${color.icon}25` }]}>
          <Ionicons name={icon} size={screenWidth < 350 ? 20 : 24} color={color.icon} />
        </View>
        <Text style={[styles.statCount, { color: colors.text, fontSize: getResponsiveSize(28, screenWidth) }]}>{count}</Text>
        <Text style={[styles.statTitle, { color: colors.textSecondary, fontSize: getResponsiveSize(12, screenWidth) }]}>{title}</Text>
      </View>
    );
  };

  const SubscriptionItem = ({ subscription }) => {
    const isActive = subscription.status === "active";
    const isExpired = subscription.isExpired;
    const isExpiringSoon = subscription.isExpiringSoon;

    let indicatorColor = "#16a34a"; // Green for active
    if (isExpired) {
      indicatorColor = "#dc2626"; // Red for expired
    } else if (isExpiringSoon) {
      indicatorColor = "#f59e0b"; // Yellow for expiring soon
    }

    return (
      <View style={[styles.subscriptionItem, { borderBottomColor: colors.borderLight }]}>
        <View style={styles.subscriptionLeft}>
          <View
            style={[
              styles.subscriptionIndicator,
              { backgroundColor: indicatorColor },
            ]}
          />
          <View>
            <Text
              style={[
                styles.subscriptionTitle,
                { 
                  color: colors.text,
                  fontSize: getResponsiveSize(16, screenWidth) 
                },
              ]}
            >
              {subscription.name || "Unknown Utility"}
            </Text>
            {subscription.amount && (
              <Text
                style={[
                  styles.subscriptionAmount,
                  { 
                    color: colors.success,
                    fontSize: getResponsiveSize(12, screenWidth) 
                  },
                ]}
              >
                ₹{subscription.amount}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.subscriptionRight}>
          <Text
            style={[
              styles.subscriptionEndDate,
              { 
                color: colors.textSecondary,
                fontSize: getResponsiveSize(14, screenWidth) 
              },
            ]}
          >
            End: {subscription.endDate}
          </Text>
          {subscription.daysRemaining !== undefined && (
            <Text
              style={[
                styles.subscriptionDays,
                {
                  fontSize: getResponsiveSize(12, screenWidth),
                  color: isExpired
                    ? "#dc2626"
                    : isExpiringSoon
                    ? "#f59e0b"
                    : "#16a34a",
                },
              ]}
            >
              {isExpired
                ? "Expired"
                : `${subscription.daysRemaining} days left`}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <View style={[styles.container, { backgroundColor: 'transparent', zIndex: 1 }]}>
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
            style={[styles.menuButton, { backgroundColor: colors.primaryContainer }]}
            onPress={toggleDrawer}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              { 
                color: '#6C63FF',
                fontSize: getResponsiveSize(18, screenWidth) 
              },
            ]}
          >
            Student Portal
          </Text>
          <TouchableOpacity style={[styles.notificationButton, { backgroundColor: colors.primaryContainer }]}>
            <Ionicons name="notifications-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Welcome Section */}
          <View
            style={[
              styles.welcomeSection,
              {
                backgroundColor: '#6C63FF',
                margin: getResponsivePadding(16, screenWidth),
                padding: getResponsivePadding(20, screenWidth),
                elevation: isDark ? 0 : 8,
              },
            ]}
          >
            <Text
              style={[
                styles.welcomeTitle,
                {
                  color: colors.onPrimary,
                  fontSize: getResponsiveSize(18, screenWidth)
                },
              ]}
            >
              Welcome, {userName}
            </Text>
            <Text
              style={[
                styles.welcomeSubtitle,
                {
                  color: colors.primaryContainer,
                  fontSize: getResponsiveSize(14, screenWidth)
                },
              ]}
            >
              Manage your college activities efficiently
            </Text>
            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="warning-outline" size={16} color="#dc2626" />
                <Text
                  style={[
                    styles.errorText,
                    {
                      color: colors.error,
                      fontSize: getResponsiveSize(12, screenWidth)
                    },
                  ]}
                >
                  {error}
                </Text>
              </View>
            )}
          </View>

          {/* Stats Cards */}
          <View
            style={[
              styles.statsContainer,
              {
                paddingHorizontal: getResponsivePadding(16, screenWidth),
                marginBottom: getResponsivePadding(12, screenWidth),
              },
            ]}
          >
            <StatCard
              title="Grievance"
              count={dashboardData.grievance}
              color={{ bg: "#dcfce7", icon: "#16a34a" }}
              icon="alert-circle-outline"
            />
            <StatCard
              title="Ticket"
              count={dashboardData.ticket}
              color={{ bg: "#dbeafe", icon: "#2563eb" }}
              icon="ticket-outline"
            />
            <StatCard
              title="Utility"
              count={dashboardData.utility}
              color={{ bg: "#fef3c7", icon: "#d97706" }}
              icon="construct-outline"
            />
          </View>

          {/* Subscription Utilities */}
          <View
            style={[
              styles.subscriptionSection,
              {
                backgroundColor: colors.surface,
                marginHorizontal: getResponsivePadding(16, screenWidth),
                padding: getResponsivePadding(16, screenWidth),
                maxHeight: screenHeight * 0.3,
                elevation: isDark ? 0 : 5,
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text
                  style={[
                    styles.sectionTitle,
                    { 
                      color: '#6C63FF',
                      fontSize: getResponsiveSize(18, screenWidth) 
                    },
                  ]}
              >
                Subscription Utilities
              </Text>
              <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
                <Text
                    style={[
                      styles.refreshButton,
                      {
                        color: '#6C63FF',
                        fontSize: getResponsiveSize(14, screenWidth),
                        opacity: refreshing ? 0.5 : 1,
                      },
                    ]}
                >
                  {refreshing ? "Refreshing..." : "Refresh All"}
                </Text>
              </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
              <View style={styles.loadingContainer}>
                <Text
                  style={[
                    styles.loadingText,
                    { 
                      color: colors.textSecondary,
                      fontSize: getResponsiveSize(14, screenWidth) 
                    },
                  ]}
                >
                  Loading subscriptions...
                </Text>
              </View>
            ) : (
              <ScrollView 
                style={styles.subscriptionContainer}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {Object.keys(dashboardData.subscriptions).length > 0 ? (
                  Object.entries(dashboardData.subscriptions).map(
                    ([key, subscription]) => (
                      <SubscriptionItem key={key} subscription={subscription} />
                    )
                  )
                ) : (
                  <View style={styles.noSubscriptions}>
                    <Text
                      style={[
                        styles.noSubscriptionsText,
                        { 
                          color: colors.textSecondary,
                          fontSize: getResponsiveSize(14, screenWidth) 
                        },
                      ]}
                    >
                      {error
                        ? "Unable to load subscriptions"
                        : "No active subscriptions found"}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    marginTop: Platform.OS === "android" ? 0 : 0,
  },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 0,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  notificationButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: 0,
  },
  scrollContainer: {
    flex: 1,
  },
  welcomeSection: {
    margin: 16,
    padding: 20,
    borderRadius: 22,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  welcomeSubtitle: {
    fontSize: 13,
    opacity: 0.85,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statCardWrapper: {
    width: "31%",
    borderRadius: 20,
    alignItems: "center",
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  statCardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  statIcon: {
    marginBottom: 8,
  },
  statIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCount: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  subscriptionSection: {
    marginHorizontal: 16,
    borderRadius: 22,
    marginBottom: 16,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  refreshButton: {
    fontSize: 14,
    fontWeight: "500",
  },
  subscriptionContainer: {
    gap: 16,
  },
  subscriptionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  subscriptionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  subscriptionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  subscriptionRight: {
    alignItems: "flex-end",
  },
  subscriptionEndDate: {
    fontSize: 14,
  },
  subscriptionAmount: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  subscriptionDays: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  noSubscriptions: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noSubscriptionsText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(220, 38, 38, 0.1)",
    borderRadius: 6,
  },
  errorText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    fontStyle: "italic",
  },
  drawerOverlay: {},
  drawer: {},
  drawerHeader: {},
  drawerTitle: {},
  drawerContent: {},
  drawerItem: {},
  drawerItemText: {},
  submenuIcon: {},
  submenuContainer: {},
  submenuItem: {},
  submenuItemText: {},
});
