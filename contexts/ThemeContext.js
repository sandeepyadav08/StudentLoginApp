import { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "../constants/colors";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState(null); // Start with null to indicate loading
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark'); // Initialize with system theme
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    // Update theme when system color scheme or theme mode changes
    if (themeMode === "automatic") {
      setIsDark(systemColorScheme === "dark");
    }
  }, [systemColorScheme, themeMode]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("themeMode");
      const currentTheme = savedTheme || "automatic";

      // Set theme mode first
      setThemeMode(currentTheme);

      // Then set dark mode based on theme
      if (currentTheme === "automatic") {
        setIsDark(systemColorScheme === "dark");
      } else {
        setIsDark(currentTheme === "dark");
      }

      // Mark loading as complete
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading theme preference:", error);
      // Default to automatic if error
      setThemeMode("automatic");
      setIsDark(systemColorScheme === "dark");
      setIsLoading(false);
    }
  };

  const changeTheme = async (newThemeMode) => {
    try {
      await AsyncStorage.setItem("themeMode", newThemeMode);
      setThemeMode(newThemeMode);

      if (newThemeMode === "automatic") {
        setIsDark(systemColorScheme === "dark");
      } else {
        setIsDark(newThemeMode === "dark");
      }
    } catch (error) {
      console.error("Error saving theme preference:", error);
    }
  };

  const resetThemeToLight = async () => {
    try {
      await AsyncStorage.setItem("themeMode", "light");
      setThemeMode("light");
      setIsDark(false);
    } catch (error) {
      console.error("Error resetting theme to light:", error);
    }
  };

  const colors = isDark ? Colors.dark : Colors.light;

  // Don't render children until theme is loaded to prevent flickering
  if (isLoading) {
    return null; // or a loading spinner if you prefer
  }

  const theme = {
    colors,
    isDark,
    themeMode,
    changeTheme,
    resetThemeToLight,
  };

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
};
