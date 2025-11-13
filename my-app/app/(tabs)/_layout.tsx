import React from "react";
import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#000",
          borderTopColor: "#111",
          height: 64,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="puzzles"
        options={{
          title: "Puzzles",
          tabBarIcon: ({ focused, color, size }) => (
            <MaterialCommunityIcons name={"chess-knight" as any} color={focused ? "#ffffff" : "#94a3b8"} size={26} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused, color, size }) => (
            <MaterialCommunityIcons name={(focused ? "cog" : "cog-outline") as any} color={focused ? "#ffffff" : "#94a3b8"} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
