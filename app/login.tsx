import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';
import axios from 'axios';

// API base URL
const API_URL = 'https://restro-hub-0fmy.onrender.com/api'; 

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Direct integration with backend API
      const response = await axios.post(`${API_URL}/auth/login`, formData);
      const data = response.data;

      dispatch(setCredentials({
        user: {
          _id: data.data._id,
          firstName: data.data.firstName,
          lastName: data.data.lastName,
          email: data.data.email,
          role: data.data.role,
          profilePhoto: data.data.profilePhoto,
          businessId: data.data.businessId,
          outletId: data.data.outletId,
          phone: data.data.phone,
          businessData: data.data.businessData
        },
        token: data.data.token
      }));

      // Role-based routing
      if (data.data.role === 'CUSTOMER') {
        router.replace('/customer'); // We will build this next
      } else if (data.data.role === 'SUPER_ADMIN') {
        Alert.alert('Notice', 'Super Admin portal is recommended on Web');
      } else {
        router.replace('/admin');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Theme Split */}
      <View style={styles.topBackground} />
      <View style={styles.bottomBackground} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <View style={styles.logoBox}>
              <Text style={styles.logoIcon}>🍽️</Text>
            </View>
            <Text style={styles.title}>Restro<Text style={styles.titleAccent}>Hub</Text></Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.subtitleText}>Log in to your account to continue.</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.formGroup}>
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
              />
            </View>

            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]} 
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#6366F1" />
              ) : (
                <Text style={styles.buttonText}>SECURE LOGIN</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/register')} style={styles.registerLink}>
              <Text style={styles.registerLinkText}>Don't have an account? Register here</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: '#111111',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#D4AF37',
  },
  bottomBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  logoBox: {
    width: 56,
    height: 56,
    backgroundColor: '#D4AF37', 
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  logoIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  titleAccent: {
    color: '#D4AF37',
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 8,
    borderColor: '#333333',
    borderWidth: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  subtitleText: {
    fontSize: 14,
    color: '#A3A3A3',
    marginTop: 4,
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: '#450a0a',
    borderColor: '#7f1d1d',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  button: {
    backgroundColor: '#D4AF37',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  registerLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerLinkText: {
    color: '#D4AF37',
    fontWeight: '700',
    fontSize: 14,
  },
});
