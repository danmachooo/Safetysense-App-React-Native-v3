/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable curly */
/* eslint-disable no-catch-shadow */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable react-native/no-inline-styles */
'use client';

import {useState, useEffect, useCallback, useRef} from 'react';
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
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type {ResponderStackParamList} from '../../navigation/ResponderNavigator';
import type {JSX} from 'react/jsx-runtime';
import incidentService from '../../services/api/incidentService';
import {GOOGLE_API_KEY} from '@env';
import Geocoding from 'react-native-geocoding';
import {useAppSelector} from '../../store/hooks';
import {ApiIncident} from './DashboardScreen';
// Define navigation prop type
type ReportsScreenNavigationProp = StackNavigationProp<
  ResponderStackParamList,
  'ReportsMain'
>;

// Define incident types with additional fields
interface Incident {
  id: number; // Changed from string to number
  title: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  timestamp: string;
  image: string;
  type: {
    name: string;
    icon: string;
    color: string;
  };
  status: string;
  reportedBy: string;
  contact: string;
  accepters: Array<{
    id: number; // Ensure this is a number too
    firstname: string;
    lastname: string;
    email: string;
    contact: string;
    acceptedAt: string;
  }>;
  resolvedAt?: string;
}
interface Accepter {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  contact: string;
  acceptedAt: string;
}

// Incident types with corresponding icons
const INCIDENT_TYPES = {
  Fire: {name: 'Fire', icon: 'fire', color: '#FF5252'},
  Medical: {name: 'Medical', icon: 'medical-bag', color: '#2196F3'},
  Accident: {name: 'Accident', icon: 'car-emergency', color: '#FFC107'},
  Flood: {name: 'Flood', icon: 'water', color: '#4CAF50'},
  Crime: {name: 'Crime', icon: 'alert-octagon', color: '#9C27B0'},
  Other: {name: 'Other', icon: 'dots-horizontal', color: '#607D8B'},
};

// Tab types
const TABS = {
  ACCEPTED: 'accepted',
  RESOLVED: 'resolved',
} as const;

type TabType = (typeof TABS)[keyof typeof TABS];

// Address cache to avoid redundant API calls
interface AddressCache {
  [key: string]: string;
}

const ReportsScreen = () => {
  const navigation = useNavigation<ReportsScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState<TabType>(TABS.ACCEPTED);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [tabAnimation] = useState(new Animated.Value(0));
  const [acceptedIncidents, setAcceptedIncidents] = useState<Incident[]>([]);
  const [resolvedIncidents, setResolvedIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState<string | null>(null);
  const {user} = useAppSelector(state => state.auth);

  // Address cache to minimize API calls
  const addressCache = useRef<AddressCache>({});
  // Ref to prevent multiple simultaneous fetches
  const isRefreshingRef = useRef<boolean>(false);

  // Reverse geocoding function to get address from coordinates
  // Wrap the function in useCallback with proper dependencies
  const getAddressFromCoordinates = useCallback(
    async (latitude: number, longitude: number): Promise<string> => {
      try {
        const cacheKey = `${latitude},${longitude}`;
        if (addressCache.current[cacheKey]) {
          return addressCache.current[cacheKey];
        }

        if (!GOOGLE_API_KEY) {
          return 'Location information unavailable';
        }

        const response = await Geocoding.from(latitude, longitude);
        let address = 'Location information unavailable';

        if (response.results?.length > 0) {
          address = response.results[0].formatted_address;
          addressCache.current[cacheKey] = address;
        }

        return address;
      } catch (error) {
        console.error('Error in reverse geocoding:', error);
        return 'Error retrieving location';
      }
    },
    [], // Empty dependency array since GOOGLE_API_KEY is from env and addressCache is a ref
  );
  // Function to transform API incident to app incident format
  const transformIncident = useCallback(
    async (apiIncident: ApiIncident): Promise<Incident> => {
      // Get incident type info or use default
      const typeInfo =
        INCIDENT_TYPES[apiIncident.type as keyof typeof INCIDENT_TYPES] ||
        INCIDENT_TYPES.Other;

      // Fix image URL if needed
      let imageUrl = apiIncident.snapshotSignedUrl;

      // Transform accepters
      const transformedAccepters = apiIncident.accepters.map(
        (accepter: any) => ({
          id: accepter.id,
          firstname: accepter.firstname,
          lastname: accepter.lastname,
          email: accepter.email,
          contact: accepter.contact,
          acceptedAt: accepter.IncidentAcceptance.acceptedAt,
        }),
      );

      // Parse coordinates
      const latitude = Number.parseFloat(apiIncident.latitude);
      const longitude = Number.parseFloat(apiIncident.longitude);

      // Get address from coordinates
      let address = 'Fetching location...';
      try {
        address = await getAddressFromCoordinates(latitude, longitude);
      } catch (error) {
        console.error('Error getting address:', error);
        address = 'Location unavailable';
      }

      return {
        id: apiIncident.id,
        title: `${apiIncident.type} Incident`, // Create a title from the type
        description: apiIncident.description,
        location: {
          latitude,
          longitude,
          address,
        },
        timestamp: apiIncident.createdAt,
        image: imageUrl,
        type: typeInfo,
        status: apiIncident.status,
        reportedBy: apiIncident.reportedBy,
        contact: apiIncident.contact,
        accepters: transformedAccepters,
        // resolvedAt: apiIncident.resolvedAt || undefined,
      };
    },
    [getAddressFromCoordinates],
  );

  // Fetch incidents from API
  const fetchIncidents = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (isRefreshingRef.current) {
      console.log('Already refreshing, skipping duplicate fetch');
      return;
    }

    if (!user || !user.id) {
      console.error('User not authenticated');
      setError('Authentication required');
      setLoading(false);
      return;
    }

    try {
      isRefreshingRef.current = true;
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching incidents from API...');
      // Fetch all incidents
      const response = await incidentService.getIncidents();

      if (response.success) {
        console.log(
          `✅ Successfully fetched ${response.data.length} incidents`,
        );
        // Transform all incidents
        const transformPromises = response.data.map(transformIncident);
        const allIncidents = await Promise.all(transformPromises);

        // Filter incidents where the current user is an accepter
        const userAcceptedIncidents = allIncidents.filter(incident =>
          incident.accepters.some(
            (accepter: Accepter) => accepter.id === user.id,
          ),
        );

        // Split into accepted and resolved
        const accepted = userAcceptedIncidents.filter(
          incident =>
            incident.status === 'accepted' || incident.status === 'in-progress',
        );

        const resolved = userAcceptedIncidents.filter(
          incident => incident.status === 'resolved',
        );

        setAcceptedIncidents(accepted);
        setResolvedIncidents(resolved);
      } else {
        console.error('❌ API Error:', response.message);
        setError('Failed to fetch incidents: ' + response.message);
      }
    } catch (err) {
      console.error('❌ Error fetching incidents:', err);
      setError('Failed to fetch incidents. Please try again.');
    } finally {
      setLoading(false);
      isRefreshingRef.current = false;
    }
  }, [user, transformIncident]);

  // Initial data fetch
  useEffect(() => {
    console.log('ReportsScreen: Component mounted');
    Geocoding.init(GOOGLE_API_KEY);
    fetchIncidents();
    return () => {
      console.log('ReportsScreen: Component unmounted');
    };
  }, [fetchIncidents]);

  // Auto refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Reports screen focused - scheduling auto refresh');

      // Add a small delay to ensure the screen is fully focused before refreshing
      const refreshTimer = setTimeout(() => {
        console.log('🔄 Executing delayed auto refresh');
        fetchIncidents();
      }, 300);

      return () => {
        // Cleanup function when screen loses focus
        clearTimeout(refreshTimer);
        console.log('Reports screen unfocused - cleared refresh timer');
      };
    }, [fetchIncidents]),
  );

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

  // Calculate average response time in minutes
  const calculateAverageResponseTime = (): string => {
    const incidents =
      activeTab === TABS.ACCEPTED ? acceptedIncidents : resolvedIncidents;

    if (incidents.length === 0) return '0m';

    let totalResponseTime = 0;
    let countWithResponseTime = 0;

    incidents.forEach(incident => {
      if (incident.accepters && incident.accepters.length > 0) {
        const acceptedAt = new Date(incident.accepters[0].acceptedAt);
        const reportedAt = new Date(incident.timestamp);
        const responseTime =
          (acceptedAt.getTime() - reportedAt.getTime()) / (1000 * 60); // in minutes

        if (responseTime > 0) {
          totalResponseTime += responseTime;
          countWithResponseTime++;
        }
      }
    });

    if (countWithResponseTime === 0) return '0m';

    const avgResponseTime = Math.round(
      totalResponseTime / countWithResponseTime,
    );
    return `${avgResponseTime}m`;
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
  const onRefresh = useCallback(async () => {
    console.log('Manual refresh triggered by pull-to-refresh');

    // If already refreshing, don't trigger another refresh
    if (refreshing || isRefreshingRef.current) {
      console.log('Already refreshing, skipping duplicate refresh');
      return;
    }

    setRefreshing(true);
    try {
      await fetchIncidents();
      console.log('✅ Manual refresh completed successfully');
    } catch (err) {
      console.error('❌ Error during manual refresh:', err);
      setError('Failed to refresh incidents. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [fetchIncidents]);

  // Render incident card
  const renderIncidentCard = ({item}: {item: Incident}): JSX.Element => {
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
                  item.status === 'resolved' ? '#4CAF50' : '#2C74B3',
              },
            ]}>
            <Text style={styles.statusText}>
              {item.status === 'resolved' ? 'Resolved' : 'Active'}
            </Text>
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

              {item.resolvedAt && (
                <View style={styles.metadataItem}>
                  <MaterialCommunityIcons
                    name="check-circle-outline"
                    size={14}
                    color="#4CAF50"
                  />
                  <Text style={[styles.metadataText, {color: '#4CAF50'}]}>
                    Resolved: {formatTime(item.resolvedAt)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.reporterContainer}>
          <Text style={styles.reporterLabel}>Reported by:</Text>
          <Text style={styles.reporterName}>{item.reportedBy}</Text>
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
    return activeTab === TABS.ACCEPTED ? acceptedIncidents : resolvedIncidents;
  };

  // Render error message
  const renderError = () => {
    if (!error) return null;

    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={24} color="#FF5252" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchIncidents}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render refresh indicator overlay
  const renderRefreshIndicator = () => {
    if (!refreshing) return null;

    return (
      <View style={styles.refreshOverlay}>
        <View style={styles.refreshIndicatorContainer}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.refreshText}>Refreshing...</Text>
        </View>
      </View>
    );
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
                ? acceptedIncidents.length
                : resolvedIncidents.length}
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
              {calculateAverageResponseTime()}
            </Text>
            <Text style={styles.statLabel}>Avg. Response</Text>
          </View>
        </View>

        {/* Incident List */}
        {loading && !refreshing ? (
          <ActivityIndicator
            size="large"
            color="#2C74B3"
            style={styles.loader}
          />
        ) : error ? (
          renderError()
        ) : (
          <FlatList
            data={getCurrentData()}
            renderItem={renderIncidentCard}
            keyExtractor={item => item.id.toString()}
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

        {/* Render refresh indicator overlay */}
        {renderRefreshIndicator()}
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
  reporterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#144272',
    backgroundColor: '#0D2137',
  },
  reporterLabel: {
    fontSize: 12,
    color: '#8BABC7',
    marginRight: 6,
  },
  reporterName: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 16,
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2C74B3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  refreshOverlay: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  refreshIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(44, 116, 179, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  refreshText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default ReportsScreen;
