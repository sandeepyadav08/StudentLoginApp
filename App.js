import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './screens/LoginScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import OtpVerificationScreen from './screens/OtpVerificationScreen';
import DashboardScreen from './screens/DashboardScreen';
import DataTabNavigator from './screens/DataTabNavigator';
import HelpdeskFormScreen from './screens/HelpdeskFormScreen';
import GrievanceFormScreen from './screens/GrievanceFormScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{
            headerShown: false, // Hide header for all screens
          }}
        >
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
          />
          <Stack.Screen 
            name="ForgotPassword" 
            component={ForgotPasswordScreen}
          />
          <Stack.Screen 
            name="OtpVerification" 
            component={OtpVerificationScreen}
          />
          <Stack.Screen 
            name="Dashboard" 
            component={DashboardScreen}
          />
          <Stack.Screen 
            name="DataTabs" 
            component={DataTabNavigator}
          />
          <Stack.Screen 
            name="HelpdeskForm" 
            component={HelpdeskFormScreen}
          />
          <Stack.Screen 
            name="GrievanceForm" 
            component={GrievanceFormScreen}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
