/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-native/no-inline-styles */
'use client';

import {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Animated,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type {
  ResponderStackParamList,
  Incident,
} from '../../navigation/ResponderNavigator';
import type {JSX} from 'react/jsx-runtime';

// Define navigation prop type
type ReportsScreenNavigationProp = StackNavigationProp<
  ResponderStackParamList,
  'ReportsMain'
>;

// Define incident types with additional fields
interface AcceptedIncident extends Incident {
  status: string;
}

interface ResolvedIncident extends Incident {
  status: string;
  resolvedAt: string;
}

// Incident types with corresponding icons
const INCIDENT_TYPES = {
  FIRE: {name: 'Fire', icon: 'fire', color: '#FF5252'},
  MEDICAL: {name: 'Medical', icon: 'medical-bag', color: '#2196F3'},
  ACCIDENT: {name: 'Accident', icon: 'car-emergency', color: '#FFC107'},
  FLOOD: {name: 'Flood', icon: 'water', color: '#4CAF50'},
  CRIME: {name: 'Crime', icon: 'alert-octagon', color: '#9C27B0'},
  OTHER: {name: 'Other', icon: 'dots-horizontal', color: '#607D8B'},
};

// Mock data for accepted incidents - Updated to Socorro, Oriental Mindoro
const MOCK_ACCEPTED_INCIDENTS: AcceptedIncident[] = [
  {
    id: '4',
    title: 'Building Fire',
    description:
      'Small fire reported in residential building at Barangay Catiningan',
    location: {
      latitude: 13.0584 + 0.008,
      longitude: 121.4066 + 0.003,
      address: 'Barangay Catiningan, Socorro, Oriental Mindoro',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    image: 'https://picsum.photos/id/1004/200/300',
    status: 'In Progress',
    type: INCIDENT_TYPES.FIRE,
  },
  {
    id: '5',
    title: 'Medical Emergency',
    description:
      'Elderly person needs immediate medical assistance in Barangay Pasi',
    location: {
      latitude: 13.0584 - 0.005,
      longitude: 121.4066 + 0.008,
      address: 'Barangay Pasi, Socorro, Oriental Mindoro',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    image: 'https://picsum.photos/id/1003/200/300',
    status: 'In Progress',
    type: INCIDENT_TYPES.MEDICAL,
  },
  {
    id: '8',
    title: 'Power Outage',
    description:
      'Electrical post damaged, causing power outage in several barangays',
    location: {
      latitude: 13.0584 - 0.008,
      longitude: 121.4066 + 0.012,
      address: 'Barangay Mabini, Socorro, Oriental Mindoro',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    image: 'https://picsum.photos/id/1006/200/300',
    status: 'In Progress',
    type: INCIDENT_TYPES.OTHER,
  },
];

// Mock data for resolved incidents - Updated to Socorro, Oriental Mindoro
const MOCK_RESOLVED_INCIDENTS: ResolvedIncident[] = [
  {
    id: '6',
    title: 'Traffic Accident',
    description: 'Minor collision between two vehicles on National Highway',
    location: {
      latitude: 13.0584 + 0.01,
      longitude: 121.4066 - 0.005,
      address: 'National Highway, Socorro, Oriental Mindoro',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(),
    image: 'https://picsum.photos/id/1002/200/300',
    status: 'Resolved',
    type: INCIDENT_TYPES.ACCIDENT,
  },
  {
    id: '7',
    title: 'Flooding',
    description:
      'Rising water levels affecting residential area after heavy rainfall',
    location: {
      latitude: 13.0584 - 0.012,
      longitude: 121.4066 - 0.007,
      address: 'Barangay Batong Dalig, Socorro, Oriental Mindoro',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 47).toISOString(),
    image: 'https://picsum.photos/id/1015/200/300',
    status: 'Resolved',
    type: INCIDENT_TYPES.FLOOD,
  },
  {
    id: '9',
    title: 'Suspicious Activity',
    description: 'Suspicious individuals reported near the community center',
    location: {
      latitude: 13.0584 + 0.005,
      longitude: 121.4066 - 0.01,
      address: 'Community Center, Socorro, Oriental Mindoro',
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 70).toISOString(),
    image: 'https://picsum.photos/id/1005/200/300',
    status: 'Resolved',
    type: INCIDENT_TYPES.CRIME,
  },
];

// Tab types
const TABS = {
  ACCEPTED: 'accepted',
  RESOLVED: 'resolved',
} as const;

type TabType = (typeof TABS)[keyof typeof TABS];

const ReportsScreen = () => {
  const navigation = useNavigation<ReportsScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState<TabType>(TABS.ACCEPTED);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [tabAnimation] = useState(new Animated.Value(0));

  // Log component mount
  useEffect(() => {
    console.log('ReportsScreen: Component mounted');
    return () => {
      console.log('ReportsScreen: Component unmounted');
    };
  }, []);

  // Function to format timestamp
  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate time elapsed
  const getTimeElapsed = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    }
    if (diffHours > 0) {
      return `${diffHours}h ago`;
    }
    if (diffMins > 0) {
      return `${diffMins}m ago`;
    }
    return 'Just now';
  };

  // Navigate to incident details
  const handleIncidentPress = (incident: Incident): void => {
    console.log(
      `ReportsScreen: Navigating to incident details - ID: ${incident.id}, Title: ${incident.title}`,
    );
    // Pass the source parameter to indicate this is from the reports screen
    navigation.navigate('IncidentDetails', {
      incident,
      source: 'reports',
    });
  };

  // Handle tab change with animation
  const handleTabChange = (tab: TabType) => {
    console.log(`ReportsScreen: Tab changed to ${tab}`);
    setActiveTab(tab);

    Animated.timing(tabAnimation, {
      toValue: tab === TABS.ACCEPTED ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  // Handle refresh
  const onRefresh = useCallback(() => {
    console.log('ReportsScreen: Refreshing data');
    setRefreshing(true);

    // Simulate API call
    setTimeout(() => {
      console.log('ReportsScreen: Refresh completed');
      setRefreshing(false);
    }, 1500);
  }, []);

  // Render incident card
  const renderIncidentCard = ({
    item,
  }: {
    item: AcceptedIncident | ResolvedIncident;
  }): JSX.Element => {
    console.log(
      `ReportsScreen: Rendering incident card - ID: ${item.id}, Title: ${item.title}`,
    );

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleIncidentPress(item)}
        activeOpacity={0.7}
        testID={`incident-card-${item.id}`}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            {item.type && (
              <View
                style={[
                  styles.incidentTypeIndicator,
                  {backgroundColor: item.type.color},
                ]}
              />
            )}
            <Text style={styles.cardTitle}>{item.title}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  item.status === 'Resolved' ? '#4CAF50' : '#2C74B3',
              },
            ]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.imageContainer}>
            <Image
              source={{uri: item.image}}
              style={styles.cardImage}
              resizeMode="cover"
            />
            {item.type && (
              <View
                style={[
                  styles.incidentTypeIcon,
                  {backgroundColor: item.type.color},
                ]}>
                <MaterialCommunityIcons
                  name={item.type.icon}
                  size={16}
                  color="#FFFFFF"
                />
              </View>
            )}
          </View>

          <View style={styles.cardDetails}>
            <Text style={styles.cardDescription} numberOfLines={2}>
              {item.description}
            </Text>

            <View style={styles.cardMetadata}>
              <View style={styles.metadataItem}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={14}
                  color="#2C74B3"
                />
                <Text style={styles.metadataText} numberOfLines={1}>
                  {item.location.address}
                </Text>
              </View>

              <View style={styles.metadataItem}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={14}
                  color="#2C74B3"
                />
                <Text style={styles.metadataText}>
                  {getTimeElapsed(item.timestamp)}
                </Text>
              </View>

              {'resolvedAt' in item && (
                <View style={styles.metadataItem}>
                  <MaterialCommunityIcons
                    name="check-circle-outline"
                    size={14}
                    color="#4CAF50"
                  />
                  <Text style={[styles.metadataText, {color: '#4CAF50'}]}>
                    Resolved: {item.resolvedAt && formatTime(item.resolvedAt)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => handleIncidentPress(item)}
          testID={`view-details-${item.id}`}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={16}
            color="#2C74B3"
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Animated indicator position
  const indicatorPosition = tabAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '50%'],
  });

  // Get current data based on active tab
  const getCurrentData = () => {
    console.log(`ReportsScreen: Getting data for tab: ${activeTab}`);
    return activeTab === TABS.ACCEPTED
      ? MOCK_ACCEPTED_INCIDENTS
      : MOCK_RESOLVED_INCIDENTS;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1929" />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTitleContainer}>
            <MaterialCommunityIcons
              name="clipboard-list"
              size={22}
              color="#2C74B3"
              style={styles.headerIcon}
            />
            <Text style={styles.headerTitle}>My Reports</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabChange(TABS.ACCEPTED)}
            testID="tab-active">
            <View style={styles.tabContent}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={18}
                color={activeTab === TABS.ACCEPTED ? '#2C74B3' : '#8BABC7'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === TABS.ACCEPTED && styles.activeTabText,
                ]}>
                Active
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabChange(TABS.RESOLVED)}
            testID="tab-resolved">
            <View style={styles.tabContent}>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={18}
                color={activeTab === TABS.RESOLVED ? '#2C74B3' : '#8BABC7'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === TABS.RESOLVED && styles.activeTabText,
                ]}>
                Resolved
              </Text>
            </View>
          </TouchableOpacity>

          {/* Animated Tab Indicator */}
          <Animated.View
            style={[
              styles.tabIndicator,
              {
                left: indicatorPosition,
                backgroundColor:
                  activeTab === TABS.ACCEPTED ? '#2C74B3' : '#4CAF50',
              },
            ]}
          />
        </View>

        {/* Stats Summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {activeTab === TABS.ACCEPTED
                ? MOCK_ACCEPTED_INCIDENTS.length
                : MOCK_RESOLVED_INCIDENTS.length}
            </Text>
            <Text style={styles.statLabel}>
              {activeTab === TABS.ACCEPTED
                ? 'Active Reports'
                : 'Resolved Reports'}
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {activeTab === TABS.ACCEPTED
                ? Math.floor(Math.random() * 60) + 30
                : Math.floor(Math.random() * 120) + 60}
              m
            </Text>
            <Text style={styles.statLabel}>Avg. Response</Text>
          </View>
        </View>

        {/* Incident List */}
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#2C74B3"
            style={styles.loader}
          />
        ) : (
          <FlatList
            data={getCurrentData()}
            renderItem={renderIncidentCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#2C74B3']}
                tintColor="#2C74B3"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons
                  name="clipboard-text-outline"
                  size={48}
                  color="#144272"
                />
                <Text style={styles.emptyText}>No incidents found</Text>
                <TouchableOpacity
                  style={styles.emptyRefreshButton}
                  onPress={onRefresh}>
                  <Text style={styles.emptyRefreshText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A1929',
  },
  container: {
    flex: 1,
    backgroundColor: '#0A1929',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0A2647',
    borderBottomWidth: 1,
    borderBottomColor: '#144272',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#144272',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0A2647',
    borderBottomWidth: 1,
    borderBottomColor: '#144272',
    position: 'relative',
    height: 50,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '50%',
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8BABC7',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#0A2647',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#144272',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#8BABC7',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#144272',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#0A2647',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#144272',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#144272',
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  incidentTypeIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  cardImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#144272',
  },
  incidentTypeIcon: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0A2647',
  },
  cardDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardDescription: {
    fontSize: 14,
    color: '#E0E0E0',
    marginBottom: 12,
    lineHeight: 20,
  },
  cardMetadata: {
    justifyContent: 'space-between',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metadataText: {
    fontSize: 12,
    color: '#8BABC7',
    marginLeft: 4,
    flex: 1,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#144272',
    backgroundColor: '#0D2137',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C74B3',
    marginRight: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#8BABC7',
    marginTop: 16,
    marginBottom: 16,
  },
  emptyRefreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#144272',
    borderRadius: 8,
  },
  emptyRefreshText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReportsScreen;
