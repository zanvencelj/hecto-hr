import { useEffect, useRef, useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { visitSignInSchema, type VisitSignInInput } from '@hecto/schemas';
import { Alert, Button, FormField, Input } from '@hecto/ui-native';
import { getApiError } from '@hecto/api-client';
import { SignaturePad, type SignaturePadHandle } from '@/components/SignaturePad';
import { signInVisitor } from '@/services/kiosk.service';

const DONE_REDIRECT_MS = 5_000;

type Step = 'details' | 'signature' | 'done';

export default function SignInScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [details, setDetails] = useState<VisitSignInInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const padRef = useRef<SignaturePadHandle>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<VisitSignInInput>({
    resolver: zodResolver(visitSignInSchema),
    defaultValues: { name: '', purpose: '' },
  });

  useEffect(() => {
    if (step !== 'done') return;
    const timeout = setTimeout(() => router.replace('/'), DONE_REDIRECT_MS);
    return () => clearTimeout(timeout);
  }, [step, router]);

  const onDetailsNext = (data: VisitSignInInput) => {
    setDetails(data);
    setError(null);
    setStep('signature');
  };

  const submitWithSignature = async (pngDataUrl: string) => {
    if (!details) return;
    try {
      setSubmitting(true);
      setError(null);
      await signInVisitor({ ...details, signature: pngDataUrl });
      setStep('done');
    } catch (err) {
      setError(getApiError(err) ?? 'Sign-in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'done') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-5xl font-bold text-gray-900">Welcome, {details?.name}!</Text>
        <Text className="mt-4 text-xl text-gray-500">You are signed in. Enjoy your visit.</Text>
        <Button label="Done" onPress={() => router.replace('/')} className="mt-8" />
      </View>
    );
  }

  if (step === 'signature') {
    return (
      <View className="flex-1 bg-white px-12 py-8">
        <Text className="text-2xl font-bold text-gray-900">Please sign below</Text>
        <Text className="mt-1 text-base text-gray-500">
          {details?.name} — {details?.purpose}
        </Text>

        {error && <Alert variant="destructive" message={error} className="mt-3" />}

        <View className="mt-4 flex-1">
          <SignaturePad
            ref={padRef}
            onSignature={submitWithSignature}
            onEmpty={() => setError('Please add your signature before continuing.')}
          />
        </View>

        <View className="mt-4 flex-row justify-between">
          <View className="flex-row gap-3">
            <Button variant="outline" label="Back" onPress={() => setStep('details')} />
            <Button variant="outline" label="Clear" onPress={() => padRef.current?.clear()} />
          </View>
          <Button
            label="Complete sign-in"
            loading={submitting}
            onPress={() => padRef.current?.read()}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="flex-grow justify-center px-12 py-8"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mx-auto w-full max-w-xl gap-4">
          <Text className="text-3xl font-bold text-gray-900">Sign in</Text>

          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField label="Your name" error={errors.name?.message} required>
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Jane Doe"
                  autoCapitalize="words"
                  autoFocus
                  error={!!errors.name}
                />
              </FormField>
            )}
          />

          <Controller
            control={control}
            name="purpose"
            render={({ field: { onChange, onBlur, value } }) => (
              <FormField label="Purpose of visit" error={errors.purpose?.message} required>
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g. Meeting with HR"
                  error={!!errors.purpose}
                />
              </FormField>
            )}
          />

          <View className="mt-2 flex-row justify-between">
            <Button variant="outline" label="Cancel" onPress={() => router.replace('/')} />
            <Button label="Next: signature" onPress={handleSubmit(onDetailsNext)} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
