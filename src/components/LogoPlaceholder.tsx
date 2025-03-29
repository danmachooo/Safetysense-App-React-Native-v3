import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const LogoPlaceholder = ({ size = 120 }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Text style={styles.text}>SS</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E88E5', // Bright blue that stands out on dark background
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'bold',
  },
});

export default LogoPlaceholder;