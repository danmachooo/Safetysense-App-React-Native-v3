"use client"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from "react-native"
import { useNavigation } from "@react-navigation/native"
import type { StackNavigationProp } from "@react-navigation/stack"
import { SafeAreaView } from "react-native-safe-area-context"
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons"
import type { ResponderStackParamList, Incident } from "../../navigation/ResponderNavigator"
import type { JSX } from "react/jsx-runtime"

// Define navigation prop type
type ReportsScreenNavigationProp = StackNavigationProp<ResponderStackParamList, "ReportsMain">

// Define incident types with additional fields
interface AcceptedIncident extends Incident {
  status: string
}

interface ResolvedIncident extends Incident {
  status: string
  resolvedAt: string
}

// Mock data for accepted incidents
const MOCK_ACCEPTED_INCIDENTS: AcceptedIncident[] = [
  {
    id: "4",
    title: "Building Fire",
    description: "Small fire reported in apartment building",
    location: { latitude: 37.7833, longitude: -122.4167, address: "123 Pine St" },
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    image: "https://via.placeholder.com/150",
    status: "In Progress",
  },
  {
    id: "5",
    title: "Medical Emergency",
    description: "Elderly person needs assistance",
    location: { latitude: 37.7749, longitude: -122.4194, address: "456 Oak St" },
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    image: "https://via.placeholder.com/150",
    status: "In Progress",
  },
]

// Mock data for resolved incidents
const MOCK_RESOLVED_INCIDENTS: ResolvedIncident[] = [
  {
    id: "6",
    title: "Traffic Accident",
    description: "Minor collision between two vehicles",
    location: { latitude: 37.7749, longitude: -122.4194, address: "789 Market St" },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(),
    image: "https://via.placeholder.com/150",
    status: "Resolved",
  },
  {
    id: "7",
    title: "Fallen Tree",
    description: "Tree blocking road after storm",
    location: { latitude: 37.7749, longitude: -122.4194, address: "101 Valencia St" },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 47).toISOString(),
    image: "https://via.placeholder.com/150",
    status: "Resolved",
  },
]

// Tab types
const TABS = {
  ACCEPTED: "accepted",
  RESOLVED: "resolved",
} as const

type TabType = (typeof TABS)[keyof typeof TABS]

const ReportsScreen = () => {
  const navigation = useNavigation<ReportsScreenNavigationProp>()
  const [activeTab, setActiveTab] = useState<TabType>(TABS.ACCEPTED)

  // Function to format timestamp
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp)
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Navigate to incident details
  const handleIncidentPress = (incident: Incident): void => {
    navigation.navigate("IncidentDetails", { incident })
  }

  // Render incident card
  const renderIncidentCard = ({ item }: { item: AcceptedIncident | ResolvedIncident }): JSX.Element => (
    <TouchableOpacity style={styles.card} onPress={() => handleIncidentPress(item)} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === "Resolved" ? "#4CAF50" : "#2C74B3" }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
        <View style={styles.cardDetails}>
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={styles.cardLocation}>
            <MaterialCommunityIcons name="map-marker" size={14} color="#2C74B3" /> {item.location.address}
          </Text>
          <Text style={styles.cardTime}>
            <MaterialCommunityIcons name="clock-outline" size={14} color="#2C74B3" /> {formatTime(item.timestamp)}
          </Text>
          {"resolvedAt" in item && (
            <Text style={styles.cardTime}>
              <MaterialCommunityIcons name="check-circle-outline" size={14} color="#4CAF50" /> Resolved:{" "}
              {item.resolvedAt && formatTime(item.resolvedAt)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Reports</Text>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === TABS.ACCEPTED && styles.activeTab]}
            onPress={() => setActiveTab(TABS.ACCEPTED)}
          >
            <Text style={[styles.tabText, activeTab === TABS.ACCEPTED && styles.activeTabText]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === TABS.RESOLVED && styles.activeTab]}
            onPress={() => setActiveTab(TABS.RESOLVED)}
          >
            <Text style={[styles.tabText, activeTab === TABS.RESOLVED && styles.activeTabText]}>Resolved</Text>
          </TouchableOpacity>
        </View>

        {/* Incident List */}
        <FlatList
          data={activeTab === TABS.ACCEPTED ? MOCK_ACCEPTED_INCIDENTS : MOCK_RESOLVED_INCIDENTS}
          renderItem={renderIncidentCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={48} color="#144272" />
              <Text style={styles.emptyText}>No incidents found</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0A1929",
  },
  container: {
    flex: 1,
    backgroundColor: "#0A1929",
  },
  header: {
    padding: 16,
    backgroundColor: "#0A2647",
    borderBottomWidth: 1,
    borderBottomColor: "#144272",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#0A2647",
    borderBottomWidth: 1,
    borderBottomColor: "#144272",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#2C74B3",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8BABC7",
  },
  activeTabText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#0A2647",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#144272",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  cardContent: {
    flexDirection: "row",
    padding: 16,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#144272",
  },
  cardDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  cardDescription: {
    fontSize: 14,
    color: "#E0E0E0",
    marginBottom: 8,
    lineHeight: 20,
  },
  cardLocation: {
    fontSize: 12,
    color: "#8BABC7",
    marginBottom: 4,
  },
  cardTime: {
    fontSize: 12,
    color: "#8BABC7",
    marginBottom: 2,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#8BABC7",
    marginTop: 16,
  },
})

export default ReportsScreen
