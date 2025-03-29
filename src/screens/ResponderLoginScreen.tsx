import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const ResponderLoginScreen = () => {
  const navigation = useNavigation();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Responder Login</Text>
      <Text style={styles.subtitle}>This screen will be implemented soon</Text>
      
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.buttonText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0A1929', // Dark blue background
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#B8C7D9', // Light blue-gray
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#1E88E5', // Bright blue
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ResponderLoginScreen;