import { useEffect, useRef } from "react";
import { Animated, Easing, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import storage from "./lib/storage";
import { FORCE_ONBOARDING_EVERY_TIME } from "../lib/config";

export default function Splash() {
  const router = useRouter();
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hasCompletedRef = useRef<boolean>(false);

  useEffect(() => {
    // Read onboarding completion flag
    (async () => {
      try {
        const v = await storage.getItem("onboardingCompleted");
        hasCompletedRef.current = v === "1";
      } catch {}
    })();

    // Pawn animation: fade in, move up one step, then back down
    opacity.setValue(0);
    translateY.setValue(0);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY, {
        toValue: -24,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 450,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      const path = FORCE_ONBOARDING_EVERY_TIME
        ? "/onboarding"
        : hasCompletedRef.current
        ? "/(tabs)/puzzles"
        : "/onboarding";
      router.replace(path as any);
    });
  }, [opacity, translateY, router]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.center}>
        <Text style={styles.title}>Delayed Distraction - Chess Puzzles</Text>
        <Animated.Text style={[styles.piece, { opacity, transform: [{ translateY }] }]}>♟</Animated.Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { color: "#ebecd0", fontSize: 20, fontWeight: "700", textAlign: "center", paddingHorizontal: 24 },
  piece: { marginTop: 16, fontSize: 48, color: "#ebecd0" },
});
