import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Linking,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';

// You can replace this with your actual logo
const logoPlaceholder = require('../assets/logooo.png');
// Simple Phone Icon Component
const PhoneIcon = () => (
  <View style={styles.phoneIconContainer}>
    <View style={styles.phoneIcon}>
      <View style={styles.phoneInner} />
    </View>
  </View>
);

const LoginScreen = () => {
  const navigation = useNavigation();

  const handleReportIncident = () => {
    // @ts-ignore - We'll define this screen later
    navigation.navigate('ReportIncident');
  };

  const handleResponderLogin = () => {
    // @ts-ignore - We'll define this screen later
    navigation.navigate('ResponderLogin');
  };

  const handleEmergencyCall = () => {
    // Replace with your actual emergency number
    const emergencyNumber = '911';

    // Open phone dialer with emergency number
    Linking.openURL(`tel:${emergencyNumber}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0A1929" />
      <View style={styles.container}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image source={logoPlaceholder} style={styles.logo} />
          <Text style={styles.appName}>SafetySense</Text>

          <Text style={styles.tagline}>Community Safety & Response System</Text>
        </View>

        {/* Buttons Section */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.reportButton]}
            onPress={handleReportIncident}>
            <Text style={styles.buttonText}>Report an Incident</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.loginButton]}
            onPress={handleResponderLogin}>
            <Text style={styles.buttonText}>Login as Responder</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2025 SafetySense • All Rights Reserved
          </Text>
        </View>

        {/* Floating Emergency Call Button */}
        <TouchableOpacity
          style={styles.emergencyButton}
          onPress={handleEmergencyCall}
          activeOpacity={0.8}>
          <PhoneIcon />
          <Text style={styles.emergencyButtonText}>Emergency</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A1929', // Dark modern blue background
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text for dark background
    marginTop: 16,
  },
  tagline: {
    fontSize: 16,
    color: '#B8C7D9', // Light blue-gray for better readability on dark background
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 40,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reportButton: {
    backgroundColor: '#1E88E5', // Bright blue for primary action
  },
  loginButton: {
    backgroundColor: '#3949AB', // Indigo for secondary action
  },
  emergencyButton: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    backgroundColor: '#E53935', // Red for emergency
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  emergencyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  phoneIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneIcon: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 2,
    transform: [{rotate: '135deg'}],
    position: 'relative',
  },
  phoneInner: {
    width: 8,
    height: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    position: 'absolute',
    top: 4,
    left: 4,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    color: '#8D9CB8', // Muted blue-gray for footer text
    fontSize: 12,
  },
});

export default LoginScreen;
