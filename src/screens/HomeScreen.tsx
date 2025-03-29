import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Button from '../components/Button';

const HomeScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Screens</Text>
      <Button title="Primary Button" onPress={() => console.log('Pressed')} />
      <View style={styles.spacing} />
      <Button
        title="Secondary Button"
        variant="secondary"
        onPress={() => console.log('Pressed')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  spacing: {
    height: 16,
  },
});

export default HomeScreen;