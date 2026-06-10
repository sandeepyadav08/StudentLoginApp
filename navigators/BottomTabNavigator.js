import { useNavigation } from "@react-navigation/native";
import { useRef } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import DashboardScreen from "../screens/DashboardScreen";
import PaymentHistoryScreen from "../screens/PaymentHistoryScreen";
import { logoutAPI } from "../services/api";

const Tab = createBottomTabNavigator();

const LogoutComponent = () => null;

const BottomTabNavigator = () => {
  const lastPressRef = useRef(0);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem("userToken");
            if (token) await logoutAPI(token);
          } catch (error) {
            console.log("Logout API error:", error);
          }
          await AsyncStorage.removeItem("userToken");
          await AsyncStorage.removeItem("userEmail");
          navigation.replace("Login");
        },
      },
    ]);
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Payment") {
            iconName = focused ? "receipt" : "receipt-outline";
          } else if (route.name === "Logout") {
            iconName = focused ? "log-out" : "log-out-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          height: Platform.OS === "ios" ? 85 : 60 + insets.bottom,
          paddingBottom: Platform.OS === "ios" ? 28 : Math.max(insets.bottom, 10),
          paddingTop: 10,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 0,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        listeners={({ navigation: tabNav }) => ({
          tabPress: (e) => {
            e.preventDefault();
            const now = Date.now();
            if (now - lastPressRef.current < 500) return;
            lastPressRef.current = now;
            tabNav.navigate("Home");
          },
        })}
      />
      <Tab.Screen name="Payment" component={PaymentHistoryScreen} />
      <Tab.Screen
        name="Logout"
        component={LogoutComponent}
        listeners={() => ({
          tabPress: (e) => {
            e.preventDefault();
            handleLogout();
          },
        })}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
