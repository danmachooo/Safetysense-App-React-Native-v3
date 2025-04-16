import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native"
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs"
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const { width } = Dimensions.get("window")

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Main tab bar */}
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]
          const label = options.title || route.name
          const isFocused = state.index === index
          const isMiddleTab = index === 1

          // Get icon name based on route and focus state
          let iconName = "alert-circle"
          if (route.name === "Dashboard") {
            iconName = isFocused ? "view-dashboard" : "view-dashboard-outline"
          } else if (route.name === "Reports") {
            iconName = isFocused ? "clipboard-list" : "clipboard-list-outline"
          } else if (route.name === "Profile") {
            iconName = isFocused ? "account" : "account-outline"
          }

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            })

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name)
            }
          }

          if (isMiddleTab) {
            // Middle tab with special styling
            return (
              <View key={route.key} style={styles.middleTabContainer}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarButtonTestID}
                  onPress={onPress}
                  style={[styles.middleTabButton, isFocused && styles.middleTabButtonActive]}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons 
                    name={iconName} 
                    size={28} 
                    color={isFocused ? "#FFFFFF" : "#8BABC7"} 
                  />
                </TouchableOpacity>
                <Text style={[
                  styles.middleTabLabel,
                  isFocused && styles.middleTabLabelActive
                ]}>
                  {label}
                </Text>
              </View>
            )
          }

          // Regular tab
          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons 
                name={iconName} 
                size={24} 
                color={isFocused ? "#2C74B3" : "#8BABC7"} 
              />
              <Text style={[
                styles.tabLabel,
                isFocused && styles.tabLabelActive
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "transparent",
  },
  tabBar: {
    flexDirection: "row",
    height: 60,
    backgroundColor: "#0A2647",
    borderTopWidth: 1,
    borderTopColor: "#144272",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: "relative",
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    color: "#8BABC7",
    fontWeight: "500",
  },
  tabLabelActive: {
    color: "#2C74B3",
    fontWeight: "600",
  },
  middleTabContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    zIndex: 10,
  },
  middleTabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#144272",
    justifyContent: "center",
    alignItems: "center",
    marginTop: -15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 3,
    borderColor: "#0A2647",
  },
  middleTabButtonActive: {
    backgroundColor: "#2C74B3",
  },
  middleTabLabel: {
    color: "#8BABC7",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  middleTabLabelActive: {
    color: "#2C74B3",
    fontWeight: "600",
  },
})

export default CustomTabBar
