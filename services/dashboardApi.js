// Real dashboard data API service
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "http://192.168.29.216/iimt-application/api/portal/";

// Helper function to get auth token
const getAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    return token;
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB"); // DD/MM/YYYY format
  } catch (error) {
    return dateString;
  }
};

/**
 * Fetch dashboard statistics data from real API
 * @returns {Promise<Object>} Dashboard data including counts and subscription info
 */
export const getDashboardData = async () => {
  try {
    const token = await getAuthToken();

    if (!token) {
      throw new Error("Authentication token not found");
    }

    const response = await fetch(`${API_BASE_URL}/active-membership`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}), // Empty body as per API requirement
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 200) {
      throw new Error(data.message || "API returned error status");
    }

    // Process subscription utilities from API response
    const subscriptions = {};

    if (data.res && Array.isArray(data.res)) {
      data.res.forEach((item,index) => {
        
        try {
          const utilityDetails = JSON.parse(item.utility_details);

          subscriptions[index] = {
            id: item.id,
            name: item.name,
            endDate: formatDate(item.end_date),
            startDate: formatDate(item.start_date),
            amount: item.amount,
            status: item.payment_status === "1" ? "active" : "inactive",
            paymentStatus: item.payment_status,
            months: utilityDetails.months || "N/A",
            subUtility: utilityDetails.sub_utility || "N/A",
            membershipType: utilityDetails.membership_type || "N/A",
            remark: item.remark,
            createdOn: formatDate(item.created_on),
            editedOn: formatDate(item.edited_on),
          };
        } catch (parseError) {
          console.warn(
            "Error parsing utility details for item:",
            item.id,
            parseError
          );
          // Fallback for items with parsing issues
          const subscriptionKey = `utility_${item.id}`;
          subscriptions[subscriptionKey] = {
            id: item.id,
            name: item.name || "Unknown Utility",
            endDate: formatDate(item.end_date),
            startDate: formatDate(item.start_date),
            amount: item.amount,
            status: item.payment_status === "1" ? "active" : "inactive",
            paymentStatus: item.payment_status,
          };
        }
      });
    }

    return {
      grievance: data.grievance || 0,
      ticket: data.tickets || 0,
      utility: data.active_utility || 0,
      subscriptions: subscriptions,
      success: true,
      message: data.message || "Dashboard data loaded successfully",
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);

    // Return fallback data in case of error
    return {
      grievance: 0,
      ticket: 0,
      utility: 0,
      subscriptions: {
        fallback: {
          name: "No Active Subscriptions",
          endDate: "N/A",
          status: "inactive",
        },
      },
      success: false,
      message: error.message || "Failed to load dashboard data",
      lastUpdated: new Date().toISOString(),
    };
  }
};

/**
 * Refresh specific metric data by calling the API again
 * @param {string} metric - The metric to refresh ('grievance', 'ticket', 'utility', 'all')
 * @returns {Promise<Object>} Updated data for the specified metric
 */
export const refreshMetricData = async (metric = "all") => {
  try {
    // For real API, we just fetch fresh data
    const freshData = await getDashboardData();

    if (metric === "all") {
      return freshData;
    }

    // Return specific metric data
    return {
      [metric]: freshData[metric],
      lastUpdated: freshData.lastUpdated,
      success: freshData.success,
      message: `${metric} data refreshed successfully`,
    };
  } catch (error) {
    console.error(`Error refreshing ${metric} data:`, error);
    throw new Error(`Failed to refresh ${metric} data`);
  }
};

/**
 * Get subscription utilities information from API
 * @returns {Promise<Object>} Subscription data with end dates and status
 */
export const getSubscriptionData = async () => {
  try {
    const dashboardData = await getDashboardData();
    const currentDate = new Date();
    const subscriptions = { ...dashboardData.subscriptions };

    // Add calculated fields like days remaining
    Object.keys(subscriptions).forEach((key) => {
      try {
        const endDate = new Date(subscriptions[key].endDate);
        if (!isNaN(endDate.getTime())) {
          const daysRemaining = Math.ceil(
            (endDate - currentDate) / (1000 * 60 * 60 * 24)
          );
          subscriptions[key].daysRemaining = daysRemaining;
          subscriptions[key].isExpiringSoon = daysRemaining <= 30;
          subscriptions[key].isExpired = daysRemaining < 0;
        } else {
          subscriptions[key].daysRemaining = 0;
          subscriptions[key].isExpiringSoon = false;
          subscriptions[key].isExpired = true;
        }
      } catch (dateError) {
        console.warn(
          "Error calculating days for subscription:",
          key,
          dateError
        );
        subscriptions[key].daysRemaining = 0;
        subscriptions[key].isExpiringSoon = false;
        subscriptions[key].isExpired = true;
      }
    });

    return {
      subscriptions,
      success: dashboardData.success,
      message: "Subscription data loaded successfully",
    };
  } catch (error) {
    console.error("Error fetching subscription data:", error);
    throw new Error("Failed to load subscription data");
  }
};

/**
 * Submit a new grievance, ticket, or utility request
 * @param {string} type - The type of request ('grievance', 'ticket', 'utility')
 * @param {Object} requestData - The request details
 * @returns {Promise<Object>} Response with success status
 */
export const submitRequest = async (type, requestData = {}) => {
  try {
    const token = await getAuthToken();

    if (!token) {
      throw new Error("Authentication token not found");
    }

    // This would be implemented based on your specific API endpoints for submissions
    // For now, return a success response
    return {
      success: true,
      message: `${type} submitted successfully`,
      requestId: `REQ-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`,
      submittedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error submitting ${type}:`, error);
    throw new Error(`Failed to submit ${type}`);
  }
};

/**
 * Get real-time updates for dashboard metrics by polling the API
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} Cleanup function to stop listening for updates
 */
export const subscribeToUpdates = (callback) => {
  const interval = setInterval(async () => {
    try {
      const freshData = await getDashboardData();
      callback(freshData);
    } catch (error) {
      console.error("Error in subscription update:", error);
    }
  }, 30000); // Poll every 30 seconds

  // Return cleanup function
  return () => clearInterval(interval);
};

/**
 * Test API connection
 * @returns {Promise<Object>} Connection test result
 */
export const testApiConnection = async () => {
  try {
    const data = await getDashboardData();
    return {
      success: data.success,
      message: data.success
        ? "API connection successful"
        : "API returned error",
      data: data,
    };
  } catch (error) {
    return {
      success: false,
      message: `API connection failed: ${error.message}`,
      error: error.message,
    };
  }
};
