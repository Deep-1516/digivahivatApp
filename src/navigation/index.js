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
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { setupNotificationListeners } from '../services/notification.service';

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
import MaintenanceScreen       from '../screens/admin/MaintenanceScreen';
// ─── Shared & Helpdesk Screens ──────────────────────────────────────────
import NoticeBoardScreen       from '../screens/shared/NoticeBoardScreen';
import SosEmergencyScreen     from '../screens/shared/SosEmergencyScreen';
import MemberComplaintsScreen  from '../screens/resident/MemberComplaintsScreen';
import AdminComplaintsScreen   from '../screens/admin/AdminComplaintsScreen';
// ─── Visitor Management Screens ──────────────────────────────────────────
import MyVisitorsScreen        from '../screens/resident/MyVisitorsScreen';
import GateVisitorsScreen      from '../screens/admin/GateVisitorsScreen';

// ─── SuperAdmin Screens ──────────────────────────────────────────────────
import SuperAdminDashboardScreen from '../screens/superadmin/DashboardScreen';
import SocietiesScreen          from '../screens/superadmin/SocietiesScreen';

import Icon from '../components/Icon';

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
          height:                66,
          paddingBottom:         10,
          paddingTop:            8,
          elevation:             8,
          shadowColor:           '#4F46E5',
          shadowOffset:          { width: 0, height: -4 },
          shadowOpacity:         0.07,
          shadowRadius:          12,
        },
        tabBarLabelStyle:        { fontSize: 11, fontWeight: '700' },
      }}>
      <Tab.Screen
        name="Home"
        component={SuperAdminDashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => renderTabIcon('home', focused, colors.primary),
        }}
      />
      <Tab.Screen
        name="Society"
        component={SocietiesScreen}
        options={{
          tabBarLabel: 'Society',
          tabBarIcon: ({ focused }) => renderTabIcon('domain', focused, colors.primary),
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
const renderTabIcon = (iconName, focused, primaryColor, family = 'MaterialCommunityIcons') => (
  <View
    style={{
      alignItems: 'center',
      justifyContent: 'center',
      width: 42,
      height: 30,
      borderRadius: 15,
      backgroundColor: focused ? primaryColor + '18' : 'transparent',
    }}>
    <Icon
      name={iconName}
      size={21}
      color={focused ? primaryColor : '#94A3B8'}
      family={family}
    />
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
          height:                66,
          paddingBottom:         10,
          paddingTop:            8,
          elevation:             8,
          shadowColor:           '#4F46E5',
          shadowOffset:          { width: 0, height: -4 },
          shadowOpacity:         0.07,
          shadowRadius:          12,
        },
        tabBarLabelStyle:        { fontSize: 11, fontWeight: '700' },
      }}>
      <Tab.Screen
        name="Home"
        component={ResidentDashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => renderTabIcon('home', focused, colors.primary),
        }}
      />
      <Tab.Screen
        name="NoticeBoard"
        component={NoticeBoardScreen}
        options={{
          tabBarLabel: 'Notices',
          tabBarIcon: ({ focused }) => renderTabIcon('bullhorn', focused, colors.primary),
        }}
      />
      <Tab.Screen
        name="Helpdesk"
        component={MemberComplaintsScreen}
        options={{
          tabBarLabel: 'Complain',
          tabBarIcon: ({ focused }) => renderTabIcon('message-alert-outline', focused, colors.primary),
        }}
      />
      <Tab.Screen
        name="MyPayment"
        component={MyContributionScreen}
        options={{
          tabBarLabel: 'My Payment',
          tabBarIcon: ({ focused }) => renderTabIcon('credit-card-outline', focused, colors.primary),
        }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpensesFeedScreen}
        options={{
          tabBarLabel: 'Expenses',
          tabBarIcon: ({ focused }) => renderTabIcon('receipt', focused, colors.primary),
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
      <Stack.Screen name="AdminTabs"       component={AdminTabs}              options={{ headerShown: false }} />
      <Stack.Screen name="CollectFalo"     component={CollectFaloScreen}      options={{ title: 'Collect Falo (Payment)' }} />
      <Stack.Screen name="LogExpense"      component={LogExpenseScreen}       options={{ title: 'Log Expense' }} />
      <Stack.Screen name="AddResident"     component={AddResidentScreen}      options={{ title: 'Add Resident' }} />
      <Stack.Screen name="Events"          component={EventsScreen}           options={{ title: 'Manage Events' }} />
      <Stack.Screen name="NoticeBoard"     component={NoticeBoardScreen}      options={{ headerShown: false }} />
      <Stack.Screen name="Helpdesk"        component={AdminComplaintsScreen}  options={{ headerShown: false }} />
      <Stack.Screen name="AdminComplaints" component={AdminComplaintsScreen}  options={{ headerShown: false }} />
      <Stack.Screen name="GateVisitors"    component={GateVisitorsScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="Maintenance"     component={MaintenanceScreen}      options={{ headerShown: false }} />
      <Stack.Screen name="SosEmergency"    component={SosEmergencyScreen}     options={{ headerShown: false }} />
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
          height:                66,
          paddingBottom:         10,
          paddingTop:            8,
          elevation:             8,
          shadowColor:           '#4F46E5',
          shadowOffset:          { width: 0, height: -4 },
          shadowOpacity:         0.07,
          shadowRadius:          12,
        },
        tabBarLabelStyle:        { fontSize: 10.5, fontWeight: '700' },
      }}>
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused }) => renderTabIcon('view-dashboard', focused, colors.primary),
        }}
      />
      <Tab.Screen
        name="NoticeBoard"
        component={NoticeBoardScreen}
        options={{
          tabBarLabel: 'Notices',
          tabBarIcon: ({ focused }) => renderTabIcon('bullhorn', focused, colors.primary),
        }}
      />
      <Tab.Screen
        name="Helpdesk"
        component={AdminComplaintsScreen}
        options={{
          tabBarLabel: 'Complain',
          tabBarIcon: ({ focused }) => renderTabIcon('message-alert-outline', focused, colors.primary),
        }}
      />
      <Tab.Screen
        name="Residents"
        component={ResidentsScreen}
        options={{
          tabBarLabel: 'Residents',
          tabBarIcon: ({ focused }) => renderTabIcon('account-group', focused, colors.primary),
        }}
      />
      <Tab.Screen
        name="ExpensesFeedAdmin"
        component={ExpensesFeedScreen}
        options={{
          tabBarLabel: 'Expenses',
          tabBarIcon: ({ focused }) => renderTabIcon('receipt', focused, colors.primary),
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
      <Stack.Screen name="ResidentTabs" component={ResidentTabs}           options={{ headerShown: false }} />
      <Stack.Screen name="LogExpense"   component={LogExpenseScreen}        options={{ title: 'Log Expense' }} />
      <Stack.Screen name="NoticeBoard"  component={NoticeBoardScreen}       options={{ headerShown: false }} />
      <Stack.Screen name="Helpdesk"     component={MemberComplaintsScreen}  options={{ headerShown: false }} />
      <Stack.Screen name="Complaints"   component={MemberComplaintsScreen}  options={{ headerShown: false }} />
      <Stack.Screen name="MyVisitors"   component={MyVisitorsScreen}        options={{ headerShown: false }} />
      <Stack.Screen name="Maintenance"  component={MaintenanceScreen}       options={{ headerShown: false }} />
      <Stack.Screen name="SosEmergency" component={SosEmergencyScreen}      options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

// ─── Root Navigator ───────────────────────────────────────────────────────────
const RootNavigator = () => {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();
  const { colors } = useTheme();
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    const unsubscribe = setupNotificationListeners(navigationRef);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [navigationRef]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
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
