import React from "react";
import { SafeAreaView, StatusBar, Text } from "react-native";

export default function NotificationsPlaceholder() {
	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
			<StatusBar barStyle="light-content" />
			<Text style={{ color: "#fff" }}>Notifications (placeholder)</Text>
		</SafeAreaView>
	);
}
