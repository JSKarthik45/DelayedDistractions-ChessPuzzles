import React, { useMemo, useRef, useState } from "react";
import { Dimensions, FlatList, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import storage from "../../lib/storage";

const { width } = Dimensions.get("window");

const PAGES = [
  { key: "situation", title: "Hooked on endless scrolling, skipping chess practice?" },
  {
    key: "how",
    title: "We help you focus by limiting distractions.",
    small: "Blocks social media until daily puzzles are solved.",
    showHowItWorks: true,
  },
  { key: "pay", title: "Try 30 days free trial.", subtitle: "$2 per month after trial.", pay: true },
];

export default function Onboarding() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const dots = useMemo(() => PAGES.map((_, i) => i), []);

  const goNext = () => {
    if (index < PAGES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      completeAndEnter();
    }
  };

  const openVideo = async () => {
    await WebBrowser.openBrowserAsync(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ" // placeholder video link
    );
  };

  const completeAndEnter = async () => {
    try {
      await storage.setItem("onboardingCompleted", "1");
    } catch {}
    router.replace("/(tabs)/puzzles" as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlatList
        ref={listRef}
        data={PAGES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(i);
        }}
        renderItem={({ item }) => (
          <View style={{ width, padding: 24, justifyContent: "center", flex: 1 }}>
            {item.key === "situation" && (
              <Text style={styles.hero}>Hooked on endless scrolling, skipping chess practice?</Text>
            )}

            {item.key === "how" && (
              <View>
                <Text style={styles.hero}>We help you focus by limiting distractions.</Text>
                <Text style={[styles.subtitle]}>
                  Blocks social media until daily puzzles are solved.
                </Text>
                <Pressable style={styles.cta} onPress={openVideo}>
                  <Text style={styles.ctaText}>How it works</Text>
                </Pressable>
              </View>
            )}

            {item.key === "pay" && (
              <View>
                <Text style={styles.hero}>Try 30 days free trial.</Text>
                <Text style={[styles.subtitle]}>$2 per month after trial.</Text>
                <Pressable style={[styles.cta, { marginTop: 24 }]} onPress={completeAndEnter}>
                  <Text style={styles.ctaText}>Start Free Trial</Text>
                </Pressable>
              </View>
            )}

            {item.key === "setup" && (
              <Text style={styles.hero}>Pick apps to block and your daily puzzle count.</Text>
            )}

            {item.key === "streaks" && (
              <Text style={styles.hero}>Stay consistent with streaks and gentle reminders.</Text>
            )}

            <Pressable onPress={goNext} style={styles.nextBtn}>
              <Ionicons name="arrow-forward-circle" size={56} color="#ebecd0" />
            </Pressable>

            <View style={styles.dotsRow}>
              {dots.map((d) => (
                <View
                  key={d}
                  style={[
                    styles.dot,
                    { opacity: d === index ? 1 : 0.4 },
                    { backgroundColor: "#739552" },
                  ]}
                />
              ))}
            </View>
          </View>
        )}
      />

      {/* Video is opened in a browser with a close/done control */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  hero: {
    color: "#ebecd0",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  title: { color: "#ebecd0", fontSize: 22, fontWeight: "700", textAlign: "center" },
  line: { color: "#ebecd0", marginTop: 8, textAlign: "center", fontSize: 16 },
  subtitle: { color: "#ebecd0", marginTop: 8, textAlign: "center", fontSize: 16 },
  small: { color: "#cdd4b1", textAlign: "center", marginTop: 6 },
  cta: {
    alignSelf: "center",
    backgroundColor: "#739552",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  ctaText: { color: "#000", fontWeight: "700" },
  nextBtn: { position: "absolute", right: 24, bottom: 50 },
  dotsRow: { position: "absolute", bottom: 40, alignSelf: "center", flexDirection: "row", gap: 16 },
  dot: { width: 25, height: 16, backgroundColor: "#fff", borderRadius: 3 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 24 },
  modalCard: { height: 280, backgroundColor: "#000", borderRadius: 16, padding: 12 },
  modalClose: { position: "absolute", right: 12, top: 12, zIndex: 1 },
});
