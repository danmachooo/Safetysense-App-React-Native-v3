/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import type {ResponderStackParamList} from '../../navigation/ResponderNavigator';

// Define navigation and route prop types
type IncidentDetailsScreenNavigationProp = StackNavigationProp<
  ResponderStackParamList,
  'IncidentDetails'
>;
type IncidentDetailsScreenRouteProp = RouteProp<
  ResponderStackParamList,
  'IncidentDetails'
>;

// Google Maps Dark Mode Style
const mapDarkStyle = [
  {
    elementType: 'geometry',
    stylers: [
      {
        color: '#212121',
      },
    ],
  },
  {
    elementType: 'labels.icon',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#757575',
      },
    ],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [
      {
        color: '#212121',
      },
    ],
  },
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [
      {
        color: '#757575',
      },
    ],
  },
  {
    featureType: 'administrative.country',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#9e9e9e',
      },
    ],
  },
  {
    featureType: 'administrative.land_parcel',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#bdbdbd',
      },
    ],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#757575',
      },
    ],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [
      {
        color: '#181818',
      },
    ],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#616161',
      },
    ],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.stroke',
    stylers: [
      {
        color: '#1b1b1b',
      },
    ],
  },
  {
    featureType: 'road',
    elementType: 'geometry.fill',
    stylers: [
      {
        color: '#2c2c2c',
      },
    ],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#8a8a8a',
      },
    ],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [
      {
        color: '#373737',
      },
    ],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [
      {
        color: '#3c3c3c',
      },
    ],
  },
  {
    featureType: 'road.highway.controlled_access',
    elementType: 'geometry',
    stylers: [
      {
        color: '#4e4e4e',
      },
    ],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#616161',
      },
    ],
  },
  {
    featureType: 'transit',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#757575',
      },
    ],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [
      {
        color: '#000000',
      },
    ],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [
      {
        color: '#3d3d3d',
      },
    ],
  },
];

const {width, height} = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.01;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Incident status types
const INCIDENT_STATUS = {
  PENDING: 'Pending',
  ONGOING: 'In Progress',
  RESOLVED: 'Resolved',
};

const IncidentDetailsScreen = () => {
  const navigation = useNavigation<IncidentDetailsScreenNavigationProp>();
  const route = useRoute<IncidentDetailsScreenRouteProp>();
  const {incident, source} = route.params;
  const [loading, setLoading] = useState<boolean>(false);
  const [localResolved, setLocalResolved] = useState<boolean>(false);
  const [resolvedTimestamp, setResolvedTimestamp] = useState<string | null>(
    null,
  );

  // Determine incident status based on incident.status or local state
  const getIncidentStatus = () => {
    if (incident.status === INCIDENT_STATUS.RESOLVED || localResolved) {
      return INCIDENT_STATUS.RESOLVED;
    } else if (
      incident.status === INCIDENT_STATUS.ONGOING ||
      source === 'reports'
    ) {
      return INCIDENT_STATUS.ONGOING;
    } else {
      return INCIDENT_STATUS.PENDING;
    }
  };

  const incidentStatus = getIncidentStatus();
  const isPending = incidentStatus === INCIDENT_STATUS.PENDING;
  const isOngoing = incidentStatus === INCIDENT_STATUS.ONGOING;
  const isResolved = incidentStatus === INCIDENT_STATUS.RESOLVED;

  // Format timestamp to readable date and time
  const formatDateTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle accept incident
  const handleAccept = (): void => {
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Incident Accepted',
        'You have been assigned to this incident. Please proceed to the location.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to reports screen or refresh current screen
              navigation.goBack();
            },
          },
        ],
      );
    }, 1000);
  };

  // Handle decline incident
  const handleDecline = (): void => {
    Alert.alert(
      'Decline Incident',
      'Are you sure you want to decline this incident?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            setLoading(true);
            // Simulate API call
            setTimeout(() => {
              setLoading(false);
              navigation.goBack();
            }, 1000);
          },
        },
      ],
    );
  };

  // Handle resolve incident
  const handleResolve = (): void => {
    Alert.alert(
      'Resolve Incident',
      'Are you sure you want to mark this incident as resolved?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Resolve',
          style: 'default',
          onPress: () => {
            setLoading(true);
            // Simulate API call
            setTimeout(() => {
              const now = new Date().toISOString();
              setResolvedTimestamp(now);
              setLocalResolved(true);
              setLoading(false);
              Alert.alert(
                'Incident Resolved',
                'This incident has been marked as resolved.',
                [{text: 'OK', onPress: () => navigation.goBack()}],
              );
            }, 1000);
          },
        },
      ],
    );
  };

  // Get status badge style and text
  const getStatusBadgeInfo = () => {
    switch (incidentStatus) {
      case INCIDENT_STATUS.PENDING:
        return {
          style: styles.pendingBadge,
          icon: 'alert-circle',
          text: 'Pending',
        };
      case INCIDENT_STATUS.ONGOING:
        return {
          style: styles.ongoingBadge,
          icon: 'clock-outline',
          text: 'Ongoing',
        };
      case INCIDENT_STATUS.RESOLVED:
        return {
          style: styles.resolvedBadge,
          icon: 'check-circle',
          text: 'Resolved',
        };
      default:
        return {
          style: styles.pendingBadge,
          icon: 'alert-circle',
          text: 'Pending',
        };
    }
  };

  const statusBadgeInfo = getStatusBadgeInfo();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Incident Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{uri: incident.image}}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <View style={[styles.statusBadge, statusBadgeInfo.style]}>
              <MaterialCommunityIcons
                name={statusBadgeInfo.icon}
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.statusText}>{statusBadgeInfo.text}</Text>
            </View>
          </View>
        </View>

        {/* Incident Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{incident.title}</Text>
            <View style={styles.timeContainer}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={16}
                color="#8BABC7"
              />
              <Text style={styles.time}>
                {formatDateTime(incident.timestamp)}
              </Text>
            </View>
            {isResolved && (
              <View style={styles.timeContainer}>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={16}
                  color="#4CAF50"
                />
                <Text style={styles.resolvedTime}>
                  Resolved:{' '}
                  {formatDateTime(
                    resolvedTimestamp ||
                      (incident.resolvedAt as string) ||
                      new Date().toISOString(),
                  )}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{incident.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.locationRow}>
              <MaterialCommunityIcons
                name="map-marker"
                size={20}
                color="#2C74B3"
                style={styles.locationIcon}
              />
              <Text style={styles.locationText}>
                {incident.location.address}
              </Text>
            </View>

            {/* Map View */}
            <View style={styles.mapContainer}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                customMapStyle={mapDarkStyle}
                initialRegion={{
                  latitude: incident.location.latitude,
                  longitude: incident.location.longitude,
                  latitudeDelta: LATITUDE_DELTA,
                  longitudeDelta: LONGITUDE_DELTA,
                }}>
                <Marker
                  coordinate={{
                    latitude: incident.location.latitude,
                    longitude: incident.location.longitude,
                  }}
                  title={incident.title}
                  description={incident.description}>
                  <View style={styles.markerContainer}>
                    <MaterialCommunityIcons
                      name={isResolved ? 'check-circle' : 'alert-circle'}
                      size={30}
                      color={isResolved ? '#4CAF50' : '#E53935'}
                    />
                  </View>
                </Marker>
              </MapView>
            </View>
          </View>
        </View>

        {/* Action Buttons - Different buttons based on status */}
        {isPending && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={handleDecline}
              disabled={loading}
              activeOpacity={0.8}>
              <MaterialCommunityIcons name="close" size={20} color="#8BABC7" />
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
              disabled={loading}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="check"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Mark as Resolved Button - Only show for ongoing incidents */}
        {isOngoing && (
          <View style={styles.resolveContainer}>
            <TouchableOpacity
              style={styles.resolveButton}
              onPress={handleResolve}
              disabled={loading}
              activeOpacity={0.8}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.resolveButtonText}>Mark as Resolved</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Resolved Confirmation - Show when incident is resolved */}
        {isResolved && (
          <View style={styles.resolvedStatusContainer}>
            <MaterialCommunityIcons
              name="check-circle"
              size={24}
              color="#4CAF50"
            />
            <Text style={styles.resolvedStatusText}>Incident Resolved</Text>
          </View>
        )}

        {/* Extra padding at the bottom for better scrolling */}
        <View style={styles.bottomPadding} />
      </ScrollView>
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
  imageContainer: {
    position: 'relative',
    height: 220,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(10, 38, 71, 0.7)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  pendingBadge: {
    backgroundColor: '#E53935', // Red for pending
  },
  ongoingBadge: {
    backgroundColor: '#2C74B3', // Blue for ongoing
  },
  resolvedBadge: {
    backgroundColor: '#4CAF50', // Green for resolved
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  detailsContainer: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  time: {
    fontSize: 14,
    color: '#8BABC7',
    marginLeft: 4,
  },
  resolvedTime: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 4,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#0A2647',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#E0E0E0',
    lineHeight: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  locationText: {
    fontSize: 16,
    color: '#E0E0E0',
    flex: 1,
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#0A2647',
    borderTopWidth: 1,
    borderTopColor: '#144272',
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  acceptButton: {
    backgroundColor: '#2C74B3',
    marginLeft: 8,
  },
  declineButton: {
    backgroundColor: '#0A1929',
    borderWidth: 1,
    borderColor: '#144272',
    marginRight: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  declineButtonText: {
    color: '#8BABC7',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  resolveContainer: {
    padding: 16,
    backgroundColor: '#0A2647',
    borderTopWidth: 1,
    borderTopColor: '#144272',
    marginTop: 4,
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#4CAF50', // Green color for resolve button
  },
  resolveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  resolvedStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#0A2647',
    borderTopWidth: 1,
    borderTopColor: '#144272',
    marginTop: 4,
  },
  resolvedStatusText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 20,
  },
});

export default IncidentDetailsScreen;
