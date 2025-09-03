// Mock dashboard data API service
const API_BASE_URL = 'https://api.example.com'; // Replace with actual API URL

// Simulate API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock data that simulates real-time counts
let mockData = {
  grievance: Math.floor(Math.random() * 50) + 10, // Random between 10-59
  ticket: Math.floor(Math.random() * 30) + 5,     // Random between 5-34
  utility: Math.floor(Math.random() * 20) + 8,    // Random between 8-27
  subscriptions: {
    gym: { 
      endDate: '2025-12-31',
      status: 'active'
    },
    swimming: { 
      endDate: '2025-11-15',
      status: 'active'
    }
  },
  lastUpdated: new Date().toISOString()
};

// Simulate data changes over time (like real API would provide)
const updateMockData = () => {
  const change = Math.random() > 0.5 ? 1 : -1;
  
  mockData.grievance = Math.max(0, mockData.grievance + change);
  mockData.ticket = Math.max(0, mockData.ticket + (Math.random() > 0.7 ? change : 0));
  mockData.utility = Math.max(0, mockData.utility + (Math.random() > 0.8 ? change : 0));
  mockData.lastUpdated = new Date().toISOString();
};

// Update mock data every 30 seconds to simulate real-time changes
setInterval(updateMockData, 30000);

/**
 * Fetch dashboard statistics data
 * @returns {Promise<Object>} Dashboard data including counts and subscription info
 */
export const getDashboardData = async () => {
  try {
    // Simulate network delay
    await delay(500 + Math.random() * 1000);
    
    // Simulate occasional API failure (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('Network error: Unable to fetch dashboard data');
    }
    
    // In a real app, this would be an actual API call:
    // const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
    //   method: 'GET',
    //   headers: {
    //     'Authorization': `Bearer ${userToken}`,
    //     'Content-Type': 'application/json',
    //   },
    // });
    // 
    // if (!response.ok) {
    //   throw new Error(`HTTP error! status: ${response.status}`);
    // }
    // 
    // const data = await response.json();
    // return data;
    
    // For now, return mock data
    return {
      ...mockData,
      success: true,
      message: 'Dashboard data loaded successfully'
    };
    
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw new Error(error.message || 'Failed to load dashboard data');
  }
};

/**
 * Refresh specific metric data
 * @param {string} metric - The metric to refresh ('grievance', 'ticket', 'utility', 'all')
 * @returns {Promise<Object>} Updated data for the specified metric
 */
export const refreshMetricData = async (metric = 'all') => {
  try {
    await delay(300);
    
    if (metric === 'all') {
      updateMockData();
      return getDashboardData();
    }
    
    // Refresh specific metric
    const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
    if (mockData[metric] !== undefined) {
      mockData[metric] = Math.max(0, mockData[metric] + change);
      mockData.lastUpdated = new Date().toISOString();
    }
    
    return {
      [metric]: mockData[metric],
      lastUpdated: mockData.lastUpdated,
      success: true,
      message: `${metric} data refreshed successfully`
    };
    
  } catch (error) {
    console.error(`Error refreshing ${metric} data:`, error);
    throw new Error(`Failed to refresh ${metric} data`);
  }
};

/**
 * Get subscription utilities information
 * @returns {Promise<Object>} Subscription data with end dates and status
 */
export const getSubscriptionData = async () => {
  try {
    await delay(200);
    
    // In a real app, this would fetch from actual API
    const currentDate = new Date();
    const subscriptions = { ...mockData.subscriptions };
    
    // Add calculated fields like days remaining
    Object.keys(subscriptions).forEach(key => {
      const endDate = new Date(subscriptions[key].endDate);
      const daysRemaining = Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24));
      subscriptions[key].daysRemaining = daysRemaining;
      subscriptions[key].isExpiringSoon = daysRemaining <= 30;
    });
    
    return {
      subscriptions,
      success: true,
      message: 'Subscription data loaded successfully'
    };
    
  } catch (error) {
    console.error('Error fetching subscription data:', error);
    throw new Error('Failed to load subscription data');
  }
};

/**
 * Submit a new grievance, ticket, or utility request
 * @param {string} type - The type of request ('grievance', 'ticket', 'utility')
 * @param {Object} requestData - The request details
 * @returns {Promise<Object>} Response with success status
 */
export const submitRequest = async (type, requestData) => {
  try {
    await delay(800);
    
    // Simulate processing
    if (Math.random() < 0.1) {
      throw new Error('Server temporarily unavailable');
    }
    
    // Increment the count for the submitted type
    if (mockData[type] !== undefined) {
      mockData[type] += 1;
    }
    
    return {
      success: true,
      message: `${type} submitted successfully`,
      requestId: `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      submittedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`Error submitting ${type}:`, error);
    throw new Error(`Failed to submit ${type}`);
  }
};

/**
 * Get real-time updates for dashboard metrics
 * This would typically use WebSocket or Server-Sent Events in a real app
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} Cleanup function to stop listening for updates
 */
export const subscribeToUpdates = (callback) => {
  const interval = setInterval(() => {
    // Simulate occasional updates
    if (Math.random() < 0.3) {
      updateMockData();
      callback(mockData);
    }
  }, 5000); // Check for updates every 5 seconds
  
  // Return cleanup function
  return () => clearInterval(interval);
};

// Export mock data for testing purposes
export const getMockData = () => ({ ...mockData });

// Reset mock data to initial state
export const resetMockData = () => {
  mockData = {
    grievance: Math.floor(Math.random() * 50) + 10,
    ticket: Math.floor(Math.random() * 30) + 5,
    utility: Math.floor(Math.random() * 20) + 8,
    subscriptions: {
      gym: { 
        endDate: '2025-12-31',
        status: 'active'
      },
      swimming: { 
        endDate: '2025-11-15',
        status: 'active'
      }
    },
    lastUpdated: new Date().toISOString()
  };
};
