import { useState } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@hecto/ui-native';
import { Input } from '@hecto/ui-native';
import { FormField } from '@hecto/ui-native';
import { Alert } from '@hecto/ui-native';
import { useAuthStore } from '@/stores/auth.store';
import { login } from '@/services/auth.service';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      const res = await login(data);
      if (!res.refreshToken) {
        setError('Login failed. Please try again.');
        return;
      }
      await setAuth(res.user, res.accessToken, res.refreshToken);
      router.replace('/(app)/events');
    } catch {
      setError('Invalid email or password.');
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-10">
          <Text className="text-3xl font-bold text-gray-900">HectoHR</Text>
          <Text className="mt-1 text-base text-gray-500">Sign in to your account</Text>
        </View>

        <View className="gap-4">
          {error && <Alert variant="destructive" message={error} />}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField label="Email" error={errors.email?.message} required>
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="you@company.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  error={!!errors.email}
                />
              </FormField>
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField label="Password" error={errors.password?.message} required>
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="••••••••"
                  secureTextEntry
                  autoComplete="password"
                  error={!!errors.password}
                />
              </FormField>
            )}
          />

          <Button
            label="Sign in"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            className="mt-2"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
