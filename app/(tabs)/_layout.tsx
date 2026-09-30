import { useEffect, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Link, Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/use-color-scheme';
import { useClientOnlyValue } from '@/components/use-client-only-value';

function TabBarBackground({ colorScheme }: { colorScheme: 'light' | 'dark' }) {
  const [reduceTransparencyEnabled, setReduceTransparencyEnabled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparencyEnabled);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduceTransparencyEnabled
    );
    return () => subscription.remove();
  }, []);

  if (reduceTransparencyEnabled) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors[colorScheme].background }]} />;
  }

  if (Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable()) {
    return <GlassView style={StyleSheet.absoluteFill} />;
  }

  return <BlurView intensity={80} tint="systemMaterial" style={StyleSheet.absoluteFill} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        // Disable the static render of the header on web
        // to prevent a hydration error in React Navigation v6.
        headerShown: useClientOnlyValue(false, true),
        tabBarStyle: { position: 'absolute' },
        tabBarBackground: () => <TabBarBackground colorScheme={colorScheme} />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tab One',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'chevron.left.forwardslash.chevron.right',
                android: 'code',
                web: 'code',
              }}
              tintColor={color}
              size={28}
            />
          ),
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable style={{ marginRight: 15 }}>
                {({ pressed }) => (
                  <SymbolView
                    name={{ ios: 'info.circle', android: 'info', web: 'info' }}
                    size={25}
                    tintColor={Colors[colorScheme].text}
                    style={{ opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Tab Two',
          tabBarIcon: ({ color }) => (
            <SymbolView
              name={{
                ios: 'chevron.left.forwardslash.chevron.right',
                android: 'code',
                web: 'code',
              }}
              tintColor={color}
              size={28}
            />
          ),
        }}
      />
    </Tabs>
  );
}
