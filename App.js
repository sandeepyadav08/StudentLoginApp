import { useEffect } from "react";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar, Platform } from "react-native";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import LoginScreen from "./screens/LoginScreen";
import ForgotPasswordScreen from "./screens/ForgotPasswordScreen";
import OtpVerificationScreen from "./screens/OtpVerificationScreen";
import BottomTabNavigator from "./navigators/BottomTabNavigator";
import DataTabNavigator from "./screens/DataTabNavigator";
import HelpdeskScreen from "./screens/HelpdeskScreen";
import HelpdeskFormScreen from "./screens/HelpdeskFormScreen";
import GrievanceScreen from "./screens/GrievanceScreen";
import GrievanceFormScreen from "./screens/GrievanceFormScreen";
import SubscribeMembershipScreen from "./screens/SubscribeMembershipScreen";
import CoursePlacementScreen from "./screens/CoursePlacementScreen";
import HostelIdFeeScreen from "./screens/HostelIdFeeScreen";
import PaymentGatewayScreen from "./screens/PaymentGatewayScreen";
import SettingsScreen from "./screens/SettingsScreen";
import WebViewScreen from "./screens/WebViewScreen";

const Stack = createStackNavigator();

// Navigation component that uses theme
function AppNavigator() {
  const { isDark, colors } = useTheme();



  // Create custom navigation theme
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };

  return (
    <>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={Platform.OS === 'android' ? colors.background : undefined}
        translucent={false}
      />
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false, // Hide header for all screens
          cardStyle: { backgroundColor: colors.background }, // Prevent white flash
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              backgroundColor: colors.background,
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          }),
          transitionSpec: {
            open: {
              animation: "timing",
              config: {
                duration: 250,
              },
            },
            close: {
              animation: "timing",
              config: {
                duration: 250,
              },
            },
          },
          animationEnabled: true,
          gestureEnabled: true,
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ cardStyle: { backgroundColor: colors.background } }}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{ cardStyle: { backgroundColor: colors.background } }}
        />
        <Stack.Screen
          name="OtpVerification"
          component={OtpVerificationScreen}
          options={{ cardStyle: { backgroundColor: colors.background } }}
        />
        <Stack.Screen
          name="Dashboard"
          component={BottomTabNavigator}
          options={{ cardStyle: { backgroundColor: colors.background } }}
        />
        <Stack.Screen
          name="DataTabs"
          component={DataTabNavigator}
          options={{ cardStyle: { backgroundColor: colors.background } }}
        />
        <Stack.Screen
          name="Helpdesk"
          component={HelpdeskScreen}
          options={{ cardStyle: { backgroundColor: colors.background } }}
        />
        <Stack.Screen
          name="HelpdeskForm"
          component={HelpdeskFormScreen}
          options={{ cardStyle: { backgroundColor: colors.background } }}
        />
        <Stack.Screen
          name="Grievance"
          component={GrievanceScreen}
          options={{ cardStyle: { backgroundColor: colors.background } }}
        />
        <Stack.Screen
          name="GrievanceForm"
          component={GrievanceFormScreen}
          options={{ cardStyle: { backgroundColor: colors.background } }}
        />
        <Stack.Screen
          name="SubscribeMembership"
          component={SubscribeMembershipScreen}
          options={{ cardStyle: { backgroundColor: colors.background } }}
        />
        <Stack.Screen
          name="CoursePlacement"
          component={CoursePlacementScreen}
          options={{ cardStyle: { backgroundColor: colors.background } }}
        />
        <Stack.Screen
          name="HostelIdFee"
          component={HostelIdFeeScreen}
          options={{ cardStyle: { backgroundColor: colors.background } }}
        />
        <Stack.Screen
          name="PaymentGateway"
          component={PaymentGatewayScreen}
          options={{ cardStyle: { backgroundColor: colors.background } }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ cardStyle: { backgroundColor: colors.background } }}
        />
        <Stack.Screen
          name="WebView"
          component={WebViewScreen}
          options={{ cardStyle: { backgroundColor: colors.background } }}
        />
      </Stack.Navigator>
    </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider style={{ backgroundColor: "#1a1a1a" }}>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
