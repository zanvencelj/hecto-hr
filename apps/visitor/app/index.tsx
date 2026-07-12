import { View, Text, TouchableOpacity } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Spinner } from '@hecto/ui-native';
import { useDeviceStore } from '@/stores/device.store';

export default function HomeScreen() {
  const router = useRouter();
  const { hydrated, deviceToken, deviceName, organizationName } = useDeviceStore();

  if (!hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <Spinner size="lg" />
      </View>
    );
  }

  if (!deviceToken) {
    return <Redirect href="/pair" />;
  }

  return (
    <View className="flex-1 bg-white px-12 py-10">
      <View className="items-center">
        <Text className="text-4xl font-bold text-gray-900">
          Welcome to {organizationName ?? 'HectoHR'}
        </Text>
        <Text className="mt-2 text-lg text-gray-500">Please sign in or out below</Text>
      </View>

      <View className="flex-1 flex-row items-center justify-center gap-8 py-10">
        <TouchableOpacity
          className="h-64 flex-1 items-center justify-center bg-blue-600 active:bg-blue-700"
          onPress={() => router.push('/sign-in')}
          accessibilityRole="button"
        >
          <Text className="text-4xl font-bold text-white">Sign in</Text>
          <Text className="mt-2 text-lg text-blue-100">I'm arriving</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="h-64 flex-1 items-center justify-center border-2 border-blue-600 bg-white active:bg-blue-50"
          onPress={() => router.push('/sign-out')}
          accessibilityRole="button"
        >
          <Text className="text-4xl font-bold text-blue-600">Sign out</Text>
          <Text className="mt-2 text-lg text-blue-400">I'm leaving</Text>
        </TouchableOpacity>
      </View>

      {deviceName && (
        <Text className="text-center text-sm text-gray-400">{deviceName}</Text>
      )}
    </View>
  );
}
