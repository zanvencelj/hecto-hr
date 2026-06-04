import { TouchableOpacity, Pressable } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth.store";
import { Redirect } from "expo-router";
import { Avatar } from "@hecto/ui-native";

function HeaderAvatar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "";
  return (
    <TouchableOpacity
      onPress={() => router.push("/profile")}
      style={{ marginRight: 16 }}
    >
      <Avatar name={fullName} size="sm" />
    </TouchableOpacity>
  );
}

export default function AppLayout() {
  const accessToken = useAuthStore((s) => s.accessToken);

  if (!accessToken) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        animation: "none",
        headerShown: true,
        headerRight: () => <HeaderAvatar />,
        headerStyle: { backgroundColor: "#ffffff" },
        headerShadowVisible: false,
        headerTitleStyle: { fontSize: 17, fontWeight: "600", color: "#111827" },
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          backgroundColor: "#ffffff",
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" },
        tabBarButton: ({ children, style, onPress, onLongPress }) => (
          <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            android_ripple={null}
            style={[style, { flex: 1 }]}
          >
            {children}
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="events"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="today-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shifts"
        options={{
          title: "Shifts",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaves"
        options={{
          title: "Leaves",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
