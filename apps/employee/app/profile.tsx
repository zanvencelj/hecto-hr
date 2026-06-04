import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@hecto/ui-native';
import { Avatar } from '@hecto/ui-native';
import { Card } from '@hecto/ui-native';
import { useAuthStore } from '@/stores/auth.store';
import { logout } from '@/services/auth.service';

export default function ProfileModal() {
  const router = useRouter();
  const { user, clearAuth, getRefreshToken } = useAuthStore();

  const handleLogout = async () => {
    try {
      const token = await getRefreshToken();
      if (token) await logout(token);
    } catch {
      // best-effort
    } finally {
      await clearAuth();
      router.replace('/(auth)/login');
    }
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Employee';

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2 border-b border-gray-200">
        <Text className="text-lg font-semibold text-gray-900">Profile</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-4 pt-6 gap-6">
        <Card className="items-center gap-3 py-6">
          <Avatar name={fullName} size="lg" />
          <View className="items-center">
            <Text className="text-lg font-semibold text-gray-900">{fullName}</Text>
            <Text className="text-sm text-gray-500">{user?.email}</Text>
          </View>
          <View className="bg-blue-50 px-3 py-1">
            <Text className="text-xs font-medium capitalize text-blue-700">{user?.role}</Text>
          </View>
        </Card>

        <View className="flex-1" />

        <Button
          label="Sign Out"
          variant="destructive"
          onPress={handleLogout}
          className="mb-4"
        />
      </View>
    </SafeAreaView>
  );
}
