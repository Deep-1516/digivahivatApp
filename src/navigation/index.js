/**
 * src/navigation/index.js
 *
 * Root navigator. Switches between:
 *   - AuthStack   : Login / Register (unauthenticated)
 *   - AdminStack  : Admin tabs & screens
 *   - ResidentTabs: Bottom tab navigator for Residents
 *
 * Uses the `loading` flag from AuthContext to show a splash
 * while AsyncStorage is being rehydrated.
 */
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// ─── Auth Screens ─────────────────────────────────────────────────────────
import LoginScreen    from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// ─── Resident Screens ────────────────────────────────────────────────────
import ResidentDashboardScreen from '../screens/resident/DashboardScreen';
import MyContributionScreen    from '../screens/resident/MyContributionScreen';
import ExpensesFeedScreen      from '../screens/resident/ExpensesFeedScreen';

// ─── Admin Screens ───────────────────────────────────────────────────────
import AdminDashboardScreen    from '../screens/admin/DashboardScreen';
import CollectFaloScreen       from '../screens/admin/CollectFaloScreen';
import LogExpenseScreen        from '../screens/admin/LogExpenseScreen';
import ResidentsScreen         from '../screens/admin/ResidentsScreen';
import AddResidentScreen       from '../screens/admin/AddResidentScreen';
import EventsScreen            from '../screens/admin/EventsScreen';

// ─── SuperAdmin Screens ──────────────────────────────────────────────────
import SuperAdminDashboardScreen from '../screens/superadmin/DashboardScreen';
import SocietiesScreen          from '../screens/superadmin/SocietiesScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const SuperAdminStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SuperAdminTabs" component={SuperAdminTabs} />
  </Stack.Navigator>
);

const SuperAdminTabs = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown:             false,
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor:       colors.surface,
          borderTopColor:        colors.border,
          borderTopWidth:        1,
          height:                64,
          paddingBottom:         10,
          paddingTop:            8,
          elevation:             8,
          shadowColor:           colors.cardShadow,
          shadowOffset:          { width: 0, height: -4 },
          shadowOpacity:         0.05,
          shadowRadius:          10,
        },
        tabBarLabelStyle:        { fontSize: 11, fontWeight: '700' },
      }}>
      <Tab.Screen
        name="Home"
        component={SuperAdminDashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => renderTabIcon('🏠', focused, colors.primary),
        }}
      />
      <Tab.Screen
        name="Society"
        component={SocietiesScreen}
        options={{
          tabBarLabel: 'Society',
          tabBarIcon: ({ focused }) => renderTabIcon('🏘', focused, colors.primary),
        }}
      />
    </Tab.Navigator>
  );
};

// ─── Auth Stack ──────────────────────────────────────────────────────────────
const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login"    component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// ─── Tab Icon Component ───────────────────────────────────────────────────────
const renderTabIcon = (emoji, focused, primaryColor) => (
  <View
    style={{
      alignItems: 'center',
      justifyContent: 'center',
      width: 30,
      height: 28,
      borderRadius: 14,
      backgroundColor: focused ? primaryColor + '22' : 'transparent',
    }}>
    <Text style={{ fontSize: 17, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>
  </View>
);

// ─── Resident Bottom Tabs ─────────────────────────────────────────────────────
const ResidentTabs = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown:             false,
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor:       colors.surface,
          borderTopColor:        colors.border,
          borderTopWidth:        1,
          height:                64,
          paddingBottom:         10,
          paddingTop:            8,
          elevation:             8,
          shadowColor:           colors.cardShadow,
          shadowOffset:          { width: 0, height: -4 },
          shadowOpacity:         0.05,
          shadowRadius:          10,
        },
        tabBarLabelStyle:        { fontSize: 11, fontWeight: '700' },
      }}>
      <Tab.Screen
        name="Home"
        component={ResidentDashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => renderTabIcon('🏠', focused, colors.primary),
        }}
      />
      <Tab.Screen
        name="MyPayment"
        component={MyContributionScreen}
        options={{
          tabBarLabel: 'My Payment',
          tabBarIcon: ({ focused }) => renderTabIcon('💳', focused, colors.primary),
        }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpensesFeedScreen}
        options={{
          tabBarLabel: 'Expenses',
          tabBarIcon: ({ focused }) => renderTabIcon('🧾', focused, colors.primary),
        }}
      />
    </Tab.Navigator>
  );
};

// ─── Admin Stack (tab + stack for nested screens) ─────────────────────────────
const AdminStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle:         { backgroundColor: colors.surface },
        headerTintColor:     colors.text,
        headerTitleStyle:    { fontWeight: '800', fontSize: 18 },
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="AdminTabs"   component={AdminTabs}          options={{ headerShown: false }} />
      <Stack.Screen name="CollectFalo" component={CollectFaloScreen}  options={{ title: 'Collect Falo (Payment)' }} />
      <Stack.Screen name="LogExpense"  component={LogExpenseScreen}   options={{ title: 'Log Expense' }} />
      <Stack.Screen name="AddResident" component={AddResidentScreen}  options={{ title: 'Add Resident' }} />
      <Stack.Screen name="Events"      component={EventsScreen}       options={{ title: 'Manage Events' }} />
    </Stack.Navigator>
  );
};

const AdminTabs = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown:             false,
        tabBarActiveTintColor:   colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor:       colors.surface,
          borderTopColor:        colors.border,
          borderTopWidth:        1,
          height:                64,
          paddingBottom:         10,
          paddingTop:            8,
          elevation:             8,
          shadowColor:           colors.cardShadow,
          shadowOffset:          { width: 0, height: -4 },
          shadowOpacity:         0.05,
          shadowRadius:          10,
        },
        tabBarLabelStyle:        { fontSize: 11, fontWeight: '700' },
      }}>
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused }) => renderTabIcon('📊', focused, colors.primary),
        }}
      />
      <Tab.Screen
        name="Residents"
        component={ResidentsScreen}
        options={{
          tabBarLabel: 'Residents',
          tabBarIcon: ({ focused }) => renderTabIcon('👥', focused, colors.primary),
        }}
      />
      <Tab.Screen
        name="ExpensesFeedAdmin"
        component={ExpensesFeedScreen}
        options={{
          tabBarLabel: 'Expenses',
          tabBarIcon: ({ focused }) => renderTabIcon('🧾', focused, colors.primary),
        }}
      />
    </Tab.Navigator>
  );
};

// ─── Resident Stack (tabs + stack for nested screens like LogExpense) ─────────────
const ResidentStack = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle:         { backgroundColor: colors.surface },
        headerTintColor:     colors.text,
        headerTitleStyle:    { fontWeight: '800', fontSize: 18 },
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="ResidentTabs" component={ResidentTabs}    options={{ headerShown: false }} />
      <Stack.Screen name="LogExpense"   component={LogExpenseScreen} options={{ title: 'Log Expense' }} />
    </Stack.Navigator>
  );
};

// ─── Root Navigator ───────────────────────────────────────────────────────────
const RootNavigator = () => {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user
        ? <AuthStack />
        : isSuperAdmin
          ? <SuperAdminStack />
          : isAdmin
            ? <AdminStack />
            : <ResidentStack />
      }
    </NavigationContainer>
  );
};

export default RootNavigator;
