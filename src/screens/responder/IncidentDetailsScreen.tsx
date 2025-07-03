/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import {useState, useEffect, useCallback} from 'react';
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
  Modal,
  TextInput,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  useIsFocused,
  type RouteProp,
} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import type {ResponderStackParamList} from '../../navigation/ResponderNavigator';
import {useAppSelector} from '../../store/hooks';
import incidentService from '../../services/api/incidentService';

// Define navigation and route prop types
type IncidentDetailsScreenNavigationProp = StackNavigationProp<
  ResponderStackParamList,
  'IncidentDetails'
>;
type IncidentDetailsScreenRouteProp = RouteProp<
  ResponderStackParamList,
  'IncidentDetails'
>;

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
  const [currentIncident, setCurrentIncident] = useState(incident);
  const [resolvedTimestamp, setResolvedTimestamp] = useState<string | null>(
    incident.resolvedAt || null,
  );
  const [dismissModalVisible, setDismissModalVisible] =
    useState<boolean>(false);
  const [dismissReason, setDismissReason] = useState<string>('');
  const {user} = useAppSelector(state => state.auth);
  const isFocused = useIsFocused();

  // Helper function to check if incident is dismissed by current user
  const isIncidentDismissedByUser = useCallback(() => {
    if (!user?.id || !currentIncident.dismissers) return false;
    return currentIncident.dismissers.some(
      dismisser => dismisser.id === user.id,
    );
  }, [user?.id, currentIncident.dismissers]);

  // Helper function to check if incident is dismissed (status or by user)
  const isIncidentDismissed = useCallback(() => {
    return (
      currentIncident.status === 'dismissed' || isIncidentDismissedByUser()
    );
  }, [currentIncident.status, isIncidentDismissedByUser]);

  // Memoize the refreshIncidentData function to prevent unnecessary re-renders
  const refreshIncidentData = useCallback(async () => {
    try {
      const result = await incidentService.getIncidentById(incident.id);
      if (result.success && result.data) {
        // Update the local incident data with the latest from the server
        setCurrentIncident(prevIncident => ({
          ...prevIncident,
          status: result.data.status,
          accepters: result.data.accepters || prevIncident.accepters,
          resolvedAt: result.data.resolvedAt || null,
          // Make sure we preserve these fields if they exist in the current incident
          reportedBy: result.data.reportedBy || prevIncident.reportedBy,
          contact: result.data.contact || prevIncident.contact,
        }));

        if (result.data.resolvedAt) {
          setResolvedTimestamp(result.data.resolvedAt);
        }
      }
    } catch (error) {
      console.error('Failed to refresh incident data:', error);
    }
  }, [incident.id]);

  // Fetch the latest incident data when screen is focused
  useEffect(() => {
    let isMounted = true;

    if (isFocused && isMounted) {
      refreshIncidentData();
    }

    return () => {
      isMounted = false;
    };
  }, [isFocused, refreshIncidentData]);

  // Update the incident status logic
  const getIncidentStatus = useCallback(() => {
    if (currentIncident.status === 'dismissed' || isIncidentDismissedByUser()) {
      return 'DISMISSED';
    } else if (currentIncident.status === 'resolved' || resolvedTimestamp) {
      return INCIDENT_STATUS.RESOLVED;
    } else if (
      currentIncident.status === 'accepted' ||
      currentIncident.status === 'in-progress'
    ) {
      return INCIDENT_STATUS.ONGOING;
    } else {
      return INCIDENT_STATUS.PENDING;
    }
  }, [currentIncident.status, resolvedTimestamp, isIncidentDismissedByUser]);

  const incidentStatus = getIncidentStatus();
  const isPending = incidentStatus === INCIDENT_STATUS.PENDING;
  const isOngoing = incidentStatus === INCIDENT_STATUS.ONGOING;
  const isResolved = incidentStatus === INCIDENT_STATUS.RESOLVED;
  const isDismissed = incidentStatus === 'DISMISSED';

  // Format timestamp to readable date and time
  const formatDateTime = (timestamp: string): string => {
    if (!timestamp) {
      return 'N/A';
    }

    try {
      const date = new Date(timestamp);
      return date.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Handle accept incident
  const handleAccept = async (): Promise<void> => {
    setLoading(true);

    if (!user?.id) {
      setLoading(false);
      Alert.alert('Error', 'User ID is missing or invalid');
      return;
    }

    try {
      const result = await incidentService.acceptIncident(
        currentIncident.id,
        user.id,
      );
      if (result.success) {
        // Update local state to reflect the change immediately
        setCurrentIncident(prevIncident => ({
          ...prevIncident,
          status: 'accepted',
          accepters: [
            ...(prevIncident.accepters || []),
            {
              id: user.id,
              firstname: user.firstname || '',
              lastname: user.lastname || '',
              email: user.email || '',
              contact: user.contact || '',
              acceptedAt: new Date().toISOString(),
            },
          ],
        }));

        setLoading(false);
        Alert.alert(
          'Incident Accepted',
          'You have been assigned to this incident. Please proceed to the location.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.goBack();
              },
            },
          ],
        );
      } else {
        setLoading(false);
        Alert.alert('Error', 'Failed to accept incident. Please try again.');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      console.error('Error accepting incident:', error);
    }
  };

  // Handle dismiss incident
  const handleDismiss = async (): Promise<void> => {
    if (!user?.id) {
      Alert.alert('Error', 'User ID is missing or invalid');
      return;
    }

    // Show modal to input dismissal reason
    setDismissModalVisible(true);
  };

  // Handle confirm dismiss with reason
  const confirmDismiss = async (): Promise<void> => {
    if (!user?.id || !dismissReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for dismissal');
      return;
    }

    setLoading(true);
    try {
      let result;

      if (user?.role === 'admin') {
        result = await incidentService.globalDismissIncident(
          currentIncident.id,
          user.id,
          dismissReason.trim(),
        );
      } else {
        result = await incidentService.dismissIncident(
          currentIncident.id,
          user.id,
          dismissReason.trim(),
        );
      }
      if (result.success) {
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to dismiss incident. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred.');
      console.error('Error dismissing incident:', error);
    } finally {
      setLoading(false);
      setDismissModalVisible(false);
    }
  };

  // Handle resolve incident
  const handleResolve = (): void => {
    if (!user?.id) {
      Alert.alert('Error', 'User ID is missing or invalid');
      return;
    }

    Alert.alert(
      'Resolve Incident',
      'Are you sure you want to mark this incident as resolved?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Resolve',
          style: 'default',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await incidentService.resolveIncident(
                currentIncident.id,
              );

              if (result.success) {
                const now = new Date().toISOString();
                setResolvedTimestamp(now);
                setCurrentIncident(prevIncident => ({
                  ...prevIncident,
                  status: 'resolved',
                  resolvedAt: now,
                }));
                setLoading(false);
                Alert.alert(
                  'Incident Resolved',
                  'This incident has been marked as resolved.',
                  [{text: 'OK', onPress: () => navigation.goBack()}],
                );
              } else {
                setLoading(false);
                Alert.alert(
                  'Error',
                  'Failed to resolve incident. Please try again.',
                );
              }
            } catch (error) {
              setLoading(false);
              Alert.alert('Error', 'An unexpected error occurred.');
              console.error('Error resolving incident:', error);
            }
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
      case 'DISMISSED':
        return {
          style: styles.dismissedBadge,
          icon: 'close-circle',
          text: 'Dismissed',
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

  // Safely access nested properties
  const getLocationAddress = () => {
    try {
      return currentIncident.location?.address || 'Location not available';
    } catch (error) {
      return 'Location not available';
    }
  };

  const getLocationCoordinates = () => {
    try {
      return {
        latitude: currentIncident.location?.latitude || 0,
        longitude: currentIncident.location?.longitude || 0,
      };
    } catch (error) {
      return {latitude: 0, longitude: 0};
    }
  };

  const locationCoordinates = getLocationCoordinates();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Incident Image */}
        <View style={styles.imageContainer}>
          {currentIncident.image ? (
            <Image
              source={{uri: currentIncident.image}}
              style={[styles.image, isDismissed && styles.imageDisabled]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.image,
                styles.noImage,
                isDismissed && styles.imageDisabled,
              ]}>
              <MaterialCommunityIcons
                name="image-off"
                size={50}
                color={isDismissed ? '#5A5A5A' : '#8BABC7'}
              />
              <Text
                style={[
                  styles.noImageText,
                  isDismissed && styles.noImageTextDisabled,
                ]}>
                No image available
              </Text>
            </View>
          )}
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

        {/* Show dismissal message if dismissed */}
        {isDismissed && (
          <View style={styles.dismissedMessageContainer}>
            <MaterialCommunityIcons
              name="information-outline"
              size={20}
              color="#FF5252"
            />
            <Text style={styles.dismissedMessageText}>
              This incident has been dismissed and cannot be accepted.
            </Text>
          </View>
        )}

        {/* Incident Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {currentIncident.title || 'Untitled Incident'}
            </Text>
            <View style={styles.timeContainer}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={16}
                color="#8BABC7"
              />
              <Text style={styles.time}>
                {formatDateTime(currentIncident.timestamp)}
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
                      (currentIncident.resolvedAt as string) ||
                      new Date().toISOString(),
                  )}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>
              {currentIncident.description || 'No description provided'}
            </Text>
          </View>

          {/* Reporter Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reporter Information</Text>
            <View style={styles.reporterInfoRow}>
              <MaterialCommunityIcons
                name="account"
                size={20}
                color="#2C74B3"
                style={styles.infoIcon}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Reported by:</Text>
                <Text style={styles.infoValue}>
                  {currentIncident.reportedBy || 'Anonymous'}
                </Text>
              </View>
            </View>
            <View style={styles.reporterInfoRow}>
              <MaterialCommunityIcons
                name="phone"
                size={20}
                color="#2C74B3"
                style={styles.infoIcon}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Contact:</Text>
                <Text style={styles.infoValue}>
                  {currentIncident.contact || 'No contact information'}
                </Text>
              </View>
            </View>
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
              <Text style={styles.locationText}>{getLocationAddress()}</Text>
            </View>

            {/* Map View */}
            <View style={styles.mapContainer}>
              {locationCoordinates.latitude !== 0 &&
              locationCoordinates.longitude !== 0 ? (
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  customMapStyle={mapDarkStyle}
                  initialRegion={{
                    latitude: locationCoordinates.latitude,
                    longitude: locationCoordinates.longitude,
                    latitudeDelta: LATITUDE_DELTA,
                    longitudeDelta: LONGITUDE_DELTA,
                  }}>
                  <Marker
                    coordinate={{
                      latitude: locationCoordinates.latitude,
                      longitude: locationCoordinates.longitude,
                    }}
                    title={currentIncident.title || 'Incident Location'}
                    description={
                      currentIncident.description || 'No description'
                    }>
                    <View style={styles.markerContainer}>
                      <MaterialCommunityIcons
                        name={isResolved ? 'check-circle' : 'alert-circle'}
                        size={30}
                        color={isResolved ? '#4CAF50' : '#E53935'}
                      />
                    </View>
                  </Marker>
                </MapView>
              ) : (
                <View style={[styles.map, styles.noMapContainer]}>
                  <MaterialCommunityIcons
                    name="map-marker-off"
                    size={40}
                    color="#8BABC7"
                  />
                  <Text style={styles.noMapText}>
                    Location coordinates not available
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons - Only show for pending incidents that aren't dismissed */}
        {isPending && !isDismissed && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.dismissButton]}
              onPress={handleDismiss}
              disabled={loading}
              activeOpacity={0.8}>
              <MaterialCommunityIcons name="close" size={20} color="#8BABC7" />
              <Text style={styles.dismissButtonText}>Dismiss</Text>
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
        {isOngoing && !isDismissed && (
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

        {/* Dismissed Confirmation - Show when incident is dismissed */}
        {isDismissed && (
          <View style={styles.dismissedStatusContainer}>
            <MaterialCommunityIcons
              name="close-circle"
              size={24}
              color="#FF5252"
            />
            <Text style={styles.dismissedStatusText}>Incident Dismissed</Text>
          </View>
        )}

        {/* Extra padding at the bottom for better scrolling */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Dismiss Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={dismissModalVisible}
        onRequestClose={() => {
          setDismissModalVisible(false);
        }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Dismiss Incident</Text>
            <Text style={styles.modalDescription}>
              Please provide a reason for dismissing this incident:
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter reason for dismissal"
              placeholderTextColor="#8BABC7"
              multiline={true}
              numberOfLines={3}
              value={dismissReason}
              onChangeText={setDismissReason}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setDismissModalVisible(false);
                  setDismissReason('');
                }}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={confirmDismiss}
                disabled={!dismissReason.trim() || loading}>
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  noImage: {
    backgroundColor: '#0A2647',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#8BABC7',
    marginTop: 8,
    fontSize: 16,
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
  dismissedBadge: {
    backgroundColor: '#FF5252', // Red for dismissed
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  imageDisabled: {
    opacity: 0.5,
  },
  noImageTextDisabled: {
    color: '#5A5A5A',
  },
  dismissedMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1A1A',
    borderLeftWidth: 4,
    borderLeftColor: '#FF5252',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  dismissedMessageText: {
    color: '#FF5252',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
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
  // Reporter information styles
  reporterInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8BABC7',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#E0E0E0',
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
  noMapContainer: {
    backgroundColor: '#0A2647',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMapText: {
    color: '#8BABC7',
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
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
  dismissButton: {
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
  dismissButtonText: {
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
  dismissedStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#0A2647',
    borderTopWidth: 1,
    borderTopColor: '#144272',
    marginTop: 4,
  },
  dismissedStatusText: {
    color: '#FF5252',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bottomPadding: {
    height: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0A2647',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#144272',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: '#E0E0E0',
    marginBottom: 16,
  },
  reasonInput: {
    backgroundColor: '#0D2137',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#144272',
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#0D2137',
    marginRight: 8,
    alignItems: 'center',
  },
  modalConfirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#E53935',
    marginLeft: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#8BABC7',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

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

export default IncidentDetailsScreen;
