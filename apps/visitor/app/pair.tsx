import { useState } from 'react';
import { View, Text } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { kioskPairSchema, type KioskPairInput } from '@hecto/schemas';
import { Alert, Button, FormField, Input } from '@hecto/ui-native';
import { getApiError } from '@hecto/api-client';
import { useDeviceStore } from '@/stores/device.store';
import { pairDevice } from '@/services/kiosk.service';

export default function PairScreen() {
  const router = useRouter();
  const { hydrated, deviceToken, setDevice } = useDeviceStore();
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<KioskPairInput>({
    resolver: zodResolver(kioskPairSchema),
    defaultValues: { code: '' },
  });

  if (hydrated && deviceToken) {
    return <Redirect href="/" />;
  }

  const onSubmit = async (data: KioskPairInput) => {
    try {
      setError(null);
      const res = await pairDevice(data.code);
      await setDevice(res.deviceToken, res.device.name, res.device.organizationName);
      router.replace('/');
    } catch (err) {
      setError(getApiError(err) ?? 'Pairing failed. Check the code and try again.');
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <View className="w-full max-w-md gap-4">
        <View className="mb-4 items-center">
          <Text className="text-3xl font-bold text-gray-900">Pair this device</Text>
          <Text className="mt-2 text-center text-base text-gray-500">
            Ask an administrator to generate a pairing code under Kiosk Devices in the manager
            app, then enter it here.
          </Text>
        </View>

        {error && <Alert variant="destructive" message={error} />}

        <Controller
          control={control}
          name="code"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormField label="Pairing code" error={errors.code?.message} required>
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                error={!!errors.code}
                className="text-center text-2xl tracking-widest"
              />
            </FormField>
          )}
        />

        <Button label="Pair device" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
      </View>
    </View>
  );
}
