'use client';

import {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {StackNavigationProp} from '@react-navigation/stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSelector, useDispatch} from 'react-redux';
import {RootState} from '../../store';
import {logoutUser} from '../../store/slices/authSlice';

// Define navigation type
type ProfileScreenNavigationProp = StackNavigationProp<any, 'ResponderLogin'>;

// Define user interface to match your Redux state
interface User {
  id: number;
  firstname: string;
  lastname: string;
  contact: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: string; // Changed from Date to string since it comes as string from API
  avatar?: string; // Optional avatar property
}

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const dispatch = useDispatch();

  // Get user data from Redux store with proper typing
  const {user, loading} = useSelector(
    (state: RootState) =>
      state.auth as {
        user: User | null;
        loading: boolean;
      },
  );

  const [notificationsEnabled, setNotificationsEnabled] =
    useState<boolean>(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState<boolean>(false);
  const [language, setLanguage] = useState<string>('English');

  // Handle logout using Redux action
  const handleLogout = (): void => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          // Dispatch logout action with proper typing
          dispatch(logoutUser() as any)
            .unwrap()
            .then(() => {
              // Navigate to login screen on successful logout
              navigation.reset({
                index: 0,
                routes: [{name: 'Login'}],
              });
            })
            .catch((error: any) => {
              Alert.alert(
                'Logout Failed',
                error?.toString() || 'Failed to logout. Please try again.',
              );
            });
        },
      },
    ]);
  };

  // Handle language selection
  const handleLanguageSelect = (): void => {
    Alert.alert('Select Language', 'Choose your preferred language', [
      {text: 'English', onPress: () => setLanguage('English')},
      {text: 'Spanish', onPress: () => setLanguage('Spanish')},
      {text: 'French', onPress: () => setLanguage('French')},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  // If no user is authenticated, redirect to login
  useEffect(() => {
    if (!user) {
      navigation.reset({
        index: 0,
        routes: [{name: 'Login'}],
      });
    }
  }, [user, navigation]);

  // Show loading or no data state
  if (loading || !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.centerContent]}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Safely access user properties with optional chaining
  const userAvatar = user?.avatar || 'https://picsum.photos/200/300';
  const firstName = user?.firstname || '';
  const lastName = user?.lastname || '';
  const userRole = user?.role || '';
  const userId = user?.id?.toString() || '';
  const userEmail = user?.email || '';
  const userContact = user?.contact || '';
  const userVerified = user?.isVerified || false;
  const userCreatedAt = user?.createdAt ? new Date(user.createdAt) : new Date();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {/* Use a default avatar if none is provided */}
            <Image source={{uri: userAvatar}} style={styles.avatar} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {firstName} {lastName}
            </Text>
            <Text style={styles.userRole}>{userRole}</Text>
          </View>
        </View>

        {/* Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credentials</Text>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons
              name="badge-account-horizontal"
              size={20}
              color="#2C74B3"
            />
            <Text style={styles.infoLabel}>ID:</Text>
            <Text style={styles.infoValue}>{userId}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons
              name="email-outline"
              size={20}
              color="#2C74B3"
            />
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{userEmail}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons
              name="phone-outline"
              size={20}
              color="#2C74B3"
            />
            <Text style={styles.infoLabel}>Phone number:</Text>
            <Text style={styles.infoValue}>{userContact}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons
              name="account-check-outline"
              size={20}
              color="#2C74B3"
            />
            <Text style={styles.infoLabel}>Verified:</Text>
            <Text style={styles.infoValue}>{userVerified ? 'Yes' : 'No'}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialCommunityIcons
              name="calendar-outline"
              size={20}
              color="#2C74B3"
            />
            <Text style={styles.infoLabel}>Joined:</Text>
            <Text style={styles.infoValue}>
              {userCreatedAt.toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons
                name="bell-outline"
                size={20}
                color="#2C74B3"
              />
              <Text style={styles.settingLabel}>Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{false: '#144272', true: '#205295'}}
              thumbColor={notificationsEnabled ? '#2C74B3' : '#8BABC7'}
              ios_backgroundColor="#144272"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons
                name="theme-light-dark"
                size={20}
                color="#2C74B3"
              />
              <Text style={styles.settingLabel}>Dark Mode</Text>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              trackColor={{false: '#144272', true: '#205295'}}
              thumbColor={darkModeEnabled ? '#2C74B3' : '#8BABC7'}
              ios_backgroundColor="#144272"
            />
          </View>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleLanguageSelect}>
            <View style={styles.settingInfo}>
              <MaterialCommunityIcons
                name="translate"
                size={20}
                color="#2C74B3"
              />
              <Text style={styles.settingLabel}>Language</Text>
            </View>
            <View style={styles.languageSelector}>
              <Text style={styles.languageText}>{language}</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#8BABC7"
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}>
          <MaterialCommunityIcons name="logout" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#0A2647',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#144272',
  },
  avatarContainer: {
    padding: 3,
    borderRadius: 50,
    backgroundColor: '#2C74B3',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#0A1929',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 16,
    color: '#8BABC7',
    marginBottom: 2,
  },
  section: {
    backgroundColor: '#0A2647',
    padding: 16,
    marginTop: 16,
    borderRadius: 12,
    marginHorizontal: 16,
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
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#8BABC7',
    marginLeft: 12,
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#144272',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageText: {
    fontSize: 16,
    color: '#2C74B3',
    marginRight: 8,
  },
  logoutButton: {
    backgroundColor: '#E53935',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default ProfileScreen;
