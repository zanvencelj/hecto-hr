import { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import type { AvailabilityPreference } from '@hecto/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@hecto/ui-native';
import { Badge } from '@hecto/ui-native';
import { Spinner } from '@hecto/ui-native';
import { Button } from '@hecto/ui-native';
import { useAuthStore } from '@/stores/auth.store';
import {
  getMyShifts,
  getOpenShifts,
  claimShift,
  getMyAvailability,
  setAvailability,
} from '@/services/shifts.service';

type Tab = 'schedule' | 'open' | 'availability';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function weekRange(reference: Date): { from: string; to: string } {
  const day = reference.getDay();
  const mon = new Date(reference);
  mon.setDate(reference.getDate() - day + 1);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    from: mon.toISOString().split('T')[0]!,
    to: sun.toISOString().split('T')[0]!,
  };
}

function formatRange(from: string, to: string): string {
  return `${formatDate(from)} – ${formatDate(to)}`;
}

function formatShiftTime(time: string): string {
  const [h, m] = time.split(':');
  const date = new Date();
  date.setHours(Number(h), Number(m));
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

function todayDateString(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function shiftsOverlap(
  a: { date: string; startTime: string; endTime: string },
  b: { date: string; startTime: string; endTime: string },
): boolean {
  return a.date === b.date && a.startTime < b.endTime && b.startTime < a.endTime;
}

export default function ShiftsScreen() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('schedule');
  const [weekStart, setWeekStart] = useState(() => new Date());
  const queryClient = useQueryClient();
  const { from, to } = useMemo(() => weekRange(weekStart), [weekStart]);

  function prevWeek() {
    setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  }
  function nextWeek() {
    setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  }

  const myShiftsQuery = useQuery({
    queryKey: ['shifts', 'mine', from, to],
    queryFn: () => getMyShifts(user!.id, from, to),
    enabled: !!user && (tab === 'schedule' || tab === 'open'),
  });

  const openShiftsQuery = useQuery({
    queryKey: ['shifts', 'open', from, to],
    queryFn: () => getOpenShifts(from, to),
    enabled: tab === 'open',
  });

  const { available: availableOpenShifts, overlapping: overlappingOpenShifts } = useMemo(() => {
    const myShifts = myShiftsQuery.data ?? [];
    const available: typeof myShifts = [];
    const overlapping: typeof myShifts = [];
    for (const shift of openShiftsQuery.data ?? []) {
      if (myShifts.some((s) => shiftsOverlap(s, shift))) overlapping.push(shift);
      else available.push(shift);
    }
    return { available, overlapping };
  }, [openShiftsQuery.data, myShiftsQuery.data]);

  const availabilityQuery = useQuery({
    queryKey: ['availability'],
    queryFn: getMyAvailability,
    enabled: tab === 'availability',
  });

  const claimMutation = useMutation({
    mutationFn: claimShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });

  const availabilityMutation = useMutation({
    mutationFn: setAvailability,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['availability'] }),
  });

  const availabilityMap = Object.fromEntries(
    (availabilityQuery.data ?? []).map((a) => [a.dayOfWeek, a]),
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <View className="px-4 pb-2">
        <View className="flex-row border border-gray-200">
          {(['schedule', 'open', 'availability'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              className={`flex-1 py-2.5 items-center border-r border-gray-200 last:border-r-0 ${tab === t ? 'bg-blue-600' : 'bg-white'}`}
            >
              <Text className={`text-xs font-medium capitalize ${tab === t ? 'text-white' : 'text-gray-500'}`}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {(tab === 'schedule' || tab === 'open') && (
        <View className="flex-row items-center justify-between gap-2 px-4 pb-2">
          <Button label="← Prev" size="sm" variant="secondary" onPress={prevWeek} />
          <TouchableOpacity onPress={() => setWeekStart(new Date())}>
            <Text className="text-xs font-medium text-gray-500">{formatRange(from, to)}</Text>
          </TouchableOpacity>
          <Button label="Next →" size="sm" variant="secondary" onPress={nextWeek} />
        </View>
      )}

      <ScrollView
        className="flex-1 px-4 pt-4"
        contentContainerClassName="gap-3 pb-6"
        refreshControl={
          <RefreshControl
            refreshing={
              myShiftsQuery.isRefetching ||
              openShiftsQuery.isRefetching ||
              availabilityQuery.isRefetching
            }
            onRefresh={() => {
              if (tab === 'schedule' || tab === 'open') myShiftsQuery.refetch();
              if (tab === 'open') openShiftsQuery.refetch();
              if (tab === 'availability') availabilityQuery.refetch();
            }}
          />
        }
      >
        {tab === 'schedule' && (
          <>
            {myShiftsQuery.isLoading ? (
              <Spinner />
            ) : (myShiftsQuery.data ?? []).length === 0 ? (
              <Text className="text-sm text-gray-400">No shifts this week.</Text>
            ) : (
              (myShiftsQuery.data ?? []).map((shift) => {
                const isToday = shift.date === todayDateString();
                return (
                  <Card key={shift.id} className={isToday ? 'border-blue-500' : ''}>
                    <View className="flex-row items-center justify-between">
                      <Text className={`font-semibold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
                        {formatDate(shift.date)}
                      </Text>
                      <Badge variant="secondary" label={`${formatShiftTime(shift.startTime)} – ${formatShiftTime(shift.endTime)}`} />
                    </View>
                    {shift.notes && (
                      <Text className="mt-1 text-xs text-gray-500">{shift.notes}</Text>
                    )}
                  </Card>
                );
              })
            )}
          </>
        )}

        {tab === 'open' && (
          <>
            {openShiftsQuery.isLoading ? (
              <Spinner />
            ) : (openShiftsQuery.data ?? []).length === 0 ? (
              <Text className="text-sm text-gray-400">No open shifts available.</Text>
            ) : (
              <>
                {availableOpenShifts.map((shift) => (
                  <Card key={shift.id}>
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="font-semibold text-gray-800">{formatDate(shift.date)}</Text>
                        <Text className="text-xs text-gray-500">
                          {formatShiftTime(shift.startTime)} – {formatShiftTime(shift.endTime)}
                        </Text>
                      </View>
                      <Button
                        label="Claim"
                        size="sm"
                        onPress={() => claimMutation.mutate(shift.id)}
                        loading={claimMutation.isPending && claimMutation.variables === shift.id}
                      />
                    </View>
                  </Card>
                ))}

                {overlappingOpenShifts.length > 0 && (
                  <>
                    <Text className="mt-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                      Overlaps your schedule
                    </Text>
                    {overlappingOpenShifts.map((shift) => (
                      <Card key={shift.id} className="opacity-50">
                        <View className="flex-row items-center justify-between">
                          <View>
                            <Text className="font-semibold text-gray-800">{formatDate(shift.date)}</Text>
                            <Text className="text-xs text-gray-500">
                              {formatShiftTime(shift.startTime)} – {formatShiftTime(shift.endTime)}
                            </Text>
                          </View>
                          <Button label="Claim" size="sm" variant="secondary" disabled />
                        </View>
                        <Text className="mt-1 text-xs text-amber-600">
                          Conflicts with a shift you already have that day
                        </Text>
                      </Card>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}

        {tab === 'availability' && (
          <>
            {availabilityQuery.isLoading ? (
              <Spinner />
            ) : (
              DAYS.map((day, idx) => {
                const entry = availabilityMap[idx];
                const preference: AvailabilityPreference = entry?.preference ?? 'available';
                return (
                  <Card key={idx} className="gap-2">
                    <Text className="font-medium text-gray-800">{day}</Text>
                    <View className="flex-row border border-gray-200 rounded overflow-hidden">
                      {(
                        [
                          ['preferred', 'Prefer', 'bg-green-600'],
                          ['available', 'Available', 'bg-blue-600'],
                          ['unavailable', 'Off', 'bg-gray-500'],
                        ] as [AvailabilityPreference, string, string][]
                      ).map(([value, label, activeBg]) => (
                        <TouchableOpacity
                          key={value}
                          onPress={() =>
                            availabilityMutation.mutate({ dayOfWeek: idx, preference: value })
                          }
                          className={`flex-1 py-2 items-center ${preference === value ? activeBg : 'bg-white'}`}
                        >
                          <Text
                            className={`text-xs font-medium ${preference === value ? 'text-white' : 'text-gray-500'}`}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </Card>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
