import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { KioskOpenVisit } from '@hecto/shared-types';
import { Alert, Button, Spinner } from '@hecto/ui-native';
import { getApiError } from '@hecto/api-client';
import { getOpenVisits, signOutVisitor } from '@/services/kiosk.service';

const OPEN_VISITS_POLL_MS = 10_000;
const DONE_REDIRECT_MS = 4_000;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function SignOutScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<KioskOpenVisit | null>(null);
  const [done, setDone] = useState<KioskOpenVisit | null>(null);

  const { data: visits = [], isLoading, error } = useQuery({
    queryKey: ['kiosk', 'open-visits'],
    queryFn: getOpenVisits,
    refetchInterval: OPEN_VISITS_POLL_MS,
  });

  const signOutMutation = useMutation({
    mutationFn: (visit: KioskOpenVisit) => signOutVisitor(visit.id),
    onSuccess: (_, visit) => {
      qc.invalidateQueries({ queryKey: ['kiosk', 'open-visits'] });
      setSelected(null);
      setDone(visit);
    },
  });

  useEffect(() => {
    if (!done) return;
    const timeout = setTimeout(() => router.replace('/'), DONE_REDIRECT_MS);
    return () => clearTimeout(timeout);
  }, [done, router]);

  if (done) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-5xl font-bold text-gray-900">Goodbye, {done.name}!</Text>
        <Text className="mt-4 text-xl text-gray-500">You are signed out. Safe travels.</Text>
        <Button label="Done" onPress={() => router.replace('/')} className="mt-8" />
      </View>
    );
  }

  if (selected) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-3xl font-bold text-gray-900">
          Sign out {selected.name}?
        </Text>
        <Text className="mt-2 text-base text-gray-500">
          Signed in at {formatTime(selected.signedInAt)}
        </Text>

        {signOutMutation.isError && (
          <Alert
            variant="destructive"
            message={getApiError(signOutMutation.error) ?? 'Sign-out failed. Please try again.'}
            className="mt-4"
          />
        )}

        <View className="mt-8 flex-row gap-4">
          <Button
            variant="outline"
            label="Cancel"
            onPress={() => {
              signOutMutation.reset();
              setSelected(null);
            }}
          />
          <Button
            label="Yes, sign me out"
            loading={signOutMutation.isPending}
            onPress={() => signOutMutation.mutate(selected)}
          />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white px-12 py-8">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-3xl font-bold text-gray-900">Sign out</Text>
          <Text className="mt-1 text-base text-gray-500">Tap your name in the list</Text>
        </View>
        <Button variant="outline" label="Back" onPress={() => router.replace('/')} />
      </View>

      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <Spinner size="lg" />
        </View>
      )}

      {!!error && (
        <Alert
          variant="destructive"
          message={getApiError(error) ?? 'Could not load visitors.'}
          className="mt-6"
        />
      )}

      {!isLoading && !error && visits.length === 0 && (
        <View className="flex-1 items-center justify-center">
          <Text className="text-xl text-gray-500">Nobody is currently signed in.</Text>
        </View>
      )}

      {visits.length > 0 && (
        <FlatList
          className="mt-6"
          data={visits}
          keyExtractor={(v) => v.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 16 }}
          contentContainerStyle={{ gap: 16, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              className="flex-1 border border-gray-200 bg-white p-5 active:bg-blue-50"
              onPress={() => setSelected(item)}
              accessibilityRole="button"
            >
              <Text className="text-xl font-semibold text-gray-900">{item.name}</Text>
              <Text className="mt-1 text-sm text-gray-500">
                In since {formatTime(item.signedInAt)}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
