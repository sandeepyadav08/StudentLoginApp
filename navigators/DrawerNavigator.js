import { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  useDrawerStatus,
} from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import BottomTabNavigator from "./BottomTabNavigator";

const Drawer = createDrawerNavigator();

const CustomDrawerContent = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [utilityOpen, setUtilityOpen] = useState(false);
  const drawerStatus = useDrawerStatus();

  useEffect(() => {
    if (drawerStatus === "closed") setUtilityOpen(false);
  }, [drawerStatus]);

  const mainItems = [
    { title: "Helpdesk", icon: "help-circle-outline", screen: "Helpdesk" },
    { title: "Grievance", icon: "alert-circle-outline", screen: "Grievance" },
  ];

  const utilityItems = [
    { title: "Subscribe Membership", icon: "card-outline", screen: "SubscribeMembership" },
    { title: "Course & Placement", icon: "school-outline", screen: "CoursePlacement" },
    { title: "Hostel & ID Fee", icon: "business-outline", screen: "HostelIdFee" },
  ];

  const navigate = (screen) => {
    setUtilityOpen(false);
    navigation.closeDrawer();
    navigation.navigate(screen);
  };

  return (
    <View style={[styles.drawerContainer, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { borderBottomColor: isDark ? "#374151" : "#F0F0F0" }]}>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Menu</Text>
      </View>

      <DrawerContentScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.menuSection}>

          {mainItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={() => navigate(item.screen)}>
              <View style={styles.iconContainer}>
                <Ionicons name={item.icon} size={24} color={colors.primary} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>{item.title}</Text>
            </TouchableOpacity>
          ))}

          {/* Utility with submenu */}
          <TouchableOpacity style={styles.menuItem} onPress={() => setUtilityOpen(!utilityOpen)}>
            <View style={styles.iconContainer}>
              <Ionicons name="construct-outline" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.menuText, { color: colors.text, flex: 1 }]}>Utility</Text>
            <Ionicons
              name={utilityOpen ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {utilityOpen && (
            <View style={[styles.submenuContainer, { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }]}>
              {utilityItems.map((item, index) => (
                <TouchableOpacity key={index} style={styles.submenuItem} onPress={() => navigate(item.screen)}>
                  <View style={styles.iconContainer}>
                    <Ionicons name={item.icon} size={20} color={colors.textSecondary} />
                  </View>
                  <Text style={[styles.submenuText, { color: colors.textSecondary }]}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.menuItem} onPress={() => navigate("Settings")}>
            <View style={styles.iconContainer}>
              <Ionicons name="settings-outline" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.menuText, { color: colors.text }]}>Settings</Text>
          </TouchableOpacity>

        </View>
      </DrawerContentScrollView>
    </View>
  );
};

const DrawerNavigator = () => {
  const { colors } = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: colors.surface,
          width: 300,
        },
        drawerType: "front",
        swipeEdgeWidth: 50,
      }}
    >
      <Drawer.Screen name="MainTabs" component={BottomTabNavigator} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  scrollContent: {
    paddingTop: 10,
  },
  menuSection: {
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  iconContainer: {
    width: 40,
    alignItems: "center",
  },
  menuText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "500",
  },
  submenuContainer: {
    marginHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  submenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  submenuText: {
    fontSize: 14,
    marginLeft: 12,
    fontWeight: "500",
  },
});

export default DrawerNavigator;
