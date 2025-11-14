import React, { useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet, Switch, Text, View } from "react-native";

export default function Settings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundsEnabled, setSoundsEnabled] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Notifications</Text>
          <Text style={styles.sublabel}>Get updates about new puzzles</Text>
        </View>
        <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
      </View>

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Sound Effects</Text>
          <Text style={styles.sublabel}>Play sounds on moves</Text>
        </View>
        <Switch value={soundsEnabled} onValueChange={setSoundsEnabled} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>About</Text>
        <Text style={styles.sublabel}>Delayed Distraction - Chess Puzzles</Text>
        <Text style={styles.sublabel}>Version 1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16, gap: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  col: { flexShrink: 1, paddingRight: 12 },
  label: { fontSize: 16, fontWeight: "600", color: "#fff" },
  sublabel: { fontSize: 13, marginTop: 2, color: "#cdd4b1" },
  card: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222",
    backgroundColor: "#111",
  },
});
