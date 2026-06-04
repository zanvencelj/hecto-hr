import { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Modal, Animated } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { DatePicker, TimePicker } from '@/components/DatePicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@hecto/ui-native';
import { Badge } from '@hecto/ui-native';
import { Spinner } from '@hecto/ui-native';
import { Button } from '@hecto/ui-native';
import { FormField } from '@hecto/ui-native';
import type { WorkEventPublic, WorkEventType, EventChangeRequestPublic, ChangeRequestType } from '@hecto/shared-types';
import { useAuthStore } from '@/stores/auth.store';
import { getMyEvents } from '@/services/events.service';
import { getMyShifts } from '@/services/shifts.service';
import { createChangeRequest, getMyChangeRequests } from '@/services/history.service';

const EVENT_LABELS: Record<WorkEventType, string> = {
  arrival: 'Arrival',
  departure: 'Departure',
  break_start: 'Break Start',
  break_end: 'Break End',
  remote_arrival: 'Remote Work',
  business_trip_start: 'Trip Start',
  business_trip_end: 'Trip End',
};

const EVENT_TYPE_OPTIONS: WorkEventType[] = [
  'arrival', 'departure', 'break_start', 'break_end', 'remote_arrival',
  'business_trip_start', 'business_trip_end',
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? '-' : '';
  if (h === 0) return `${sign}${m}m`;
  return `${sign}${h}h${m > 0 ? ` ${m}m` : ''}`;
}

function formatDisplayDate(date: Date | null): string {
  if (!date) return 'Select date';
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

function formatDisplayTime(date: Date | null): string {
  if (!date) return 'Select time';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const from = new Date(year, month, 1).toISOString();
  const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
  return { from, to };
}

function localDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayStr(): string {
  const n = new Date();
  return localDateStr(n.getFullYear(), n.getMonth(), n.getDate());
}

function weekdayFromStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString([], { weekday: 'short' });
}

function groupEventsByDay(events: WorkEventPublic[]): Record<string, WorkEventPublic[]> {
  const groups: Record<string, WorkEventPublic[]> = {};
  for (const e of events) {
    const day = e.occurredAt.split('T')[0]!;
    if (!groups[day]) groups[day] = [];
    groups[day]!.push(e);
  }
  return groups;
}

function calculateWorkedMinutes(events: WorkEventPublic[]): number {
  const sorted = [...events].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
  let workedMs = 0;
  let breakMs = 0;
  let workStart: Date | null = null;
  let breakStart: Date | null = null;
  for (const e of sorted) {
    const t = new Date(e.occurredAt);
    if (e.type === 'arrival' || e.type === 'remote_arrival' || e.type === 'business_trip_start') {
      workStart = t;
    } else if (e.type === 'departure' || e.type === 'business_trip_end') {
      if (workStart) { workedMs += t.getTime() - workStart.getTime(); workStart = null; }
    } else if (e.type === 'break_start') {
      breakStart = t;
    } else if (e.type === 'break_end') {
      if (breakStart) { breakMs += t.getTime() - breakStart.getTime(); breakStart = null; }
    }
  }
  return Math.round(workedMs / 60000 - Math.max(0, breakMs / 60000 - 60));
}

interface ChangeRequestFormProps {
  targetDate: string;
  targetEvent: WorkEventPublic | null;
  initialType: ChangeRequestType;
  onClose: () => void;
  onSubmit: (payload: {
    requestType: ChangeRequestType;
    eventId?: string;
    requestedType?: WorkEventType;
    requestedOccurredAt?: string;
    reason?: string;
  }) => void;
  isPending: boolean;
}

function ChangeRequestForm({ targetDate, targetEvent, initialType, onClose, onSubmit, isPending }: ChangeRequestFormProps) {
  const [requestType, setRequestType] = useState<ChangeRequestType>(initialType);
  const [selectedEventType, setSelectedEventType] = useState<WorkEventType>(
    targetEvent?.type ?? 'arrival',
  );
  const [occurredAt, setOccurredAt] = useState<Date>(
    targetEvent ? new Date(targetEvent.occurredAt) : new Date(targetDate),
  );
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (requestType === 'delete') {
      onSubmit({ requestType, eventId: targetEvent!.id, reason });
    } else if (requestType === 'edit') {
      onSubmit({
        requestType,
        eventId: targetEvent!.id,
        requestedType: selectedEventType,
        requestedOccurredAt: occurredAt.toISOString(),
        reason,
      });
    } else {
      onSubmit({
        requestType,
        requestedType: selectedEventType,
        requestedOccurredAt: occurredAt.toISOString(),
        reason,
      });
    }
  };

  return (
    <View className="bg-white p-4 gap-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-base font-semibold text-gray-900">Request Change</Text>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      {targetEvent && (
        <View className="flex-row gap-2">
          {(['edit', 'delete'] as ChangeRequestType[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setRequestType(t)}
              className={`flex-1 py-2 items-center border ${requestType === t ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}
            >
              <Text className={`text-sm font-medium capitalize ${requestType === t ? 'text-blue-700' : 'text-gray-600'}`}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {requestType !== 'delete' && (
        <>
          <FormField label="Event Type" required>
            <View className="flex-row flex-wrap gap-2">
              {EVENT_TYPE_OPTIONS.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setSelectedEventType(t)}
                  className={`border px-3 py-1.5 ${selectedEventType === t ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}
                >
                  <Text className={`text-xs font-medium ${selectedEventType === t ? 'text-blue-700' : 'text-gray-600'}`}>
                    {EVENT_LABELS[t]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </FormField>

          <View className="flex-row gap-2">
            <View className="flex-1">
              <FormField label="Date" required>
                <DatePicker value={occurredAt} onChange={(d) => {
                  const updated = new Date(occurredAt);
                  updated.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                  setOccurredAt(updated);
                }}>
                  <View className="h-11 border border-gray-300 bg-white px-3 justify-center">
                    <Text className="text-sm text-gray-900">{formatDisplayDate(occurredAt)}</Text>
                  </View>
                </DatePicker>
              </FormField>
            </View>
            <View className="flex-1">
              <FormField label="Time" required>
                <TimePicker value={occurredAt} onChange={setOccurredAt}>
                  <View className="h-11 border border-gray-300 bg-white px-3 justify-center">
                    <Text className="text-sm text-gray-900">{formatDisplayTime(occurredAt)}</Text>
                  </View>
                </TimePicker>
              </FormField>
            </View>
          </View>
        </>
      )}

      <FormField label="Reason">
        <TouchableOpacity
          onPress={() => {}}
          className="h-20 border border-gray-300 bg-white px-3 py-2"
        >
          <Text className="text-sm text-gray-400">Optional reason...</Text>
        </TouchableOpacity>
      </FormField>

      <Button
        label={requestType === 'delete' ? 'Request Deletion' : 'Submit Request'}
        variant={requestType === 'delete' ? 'destructive' : 'primary'}
        onPress={handleSubmit}
        loading={isPending}
      />
    </View>
  );
}

const COLLAPSED_ROW_HEIGHT = 62;

export default function HistoryScreen() {
  const user = useAuthStore((s) => s.user);
  const now = new Date();
  const today = todayStr();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const scrollRef = useRef<ScrollView>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [changeRequestModal, setChangeRequestModal] = useState<{
    date: string;
    event: WorkEventPublic | null;
    type: ChangeRequestType;
  } | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const swipeRefs = useRef<Record<string, Swipeable | null>>({});
  const queryClient = useQueryClient();

  const { from, to } = getMonthRange(selectedYear, selectedMonth);

  const eventsQuery = useQuery({
    queryKey: ['events', 'history', selectedYear, selectedMonth],
    queryFn: () => getMyEvents(from, to),
  });

  const shiftsQuery = useQuery({
    queryKey: ['shifts', 'history', from, to],
    queryFn: () => getMyShifts(user!.id, from.split('T')[0]!, to.split('T')[0]!),
    enabled: !!user,
  });

  const changeRequestsQuery = useQuery({
    queryKey: ['change-requests'],
    queryFn: getMyChangeRequests,
  });

  const submitMutation = useMutation({
    mutationFn: createChangeRequest,
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['change-requests'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setChangeRequestModal(null);
      const msg = vars.requestType === 'delete'
        ? 'Deletion request submitted'
        : vars.requestType === 'edit'
          ? 'Edit request submitted'
          : 'Add request submitted';
      setSuccessBanner(msg);
      setTimeout(() => setSuccessBanner(null), 3000);
    },
    onError: () => {
      setSuccessBanner('Failed to submit — try again');
      setTimeout(() => setSuccessBanner(null), 3000);
    },
  });

  const events = eventsQuery.data ?? [];
  const shifts = shiftsQuery.data ?? [];
  const groupedEvents = groupEventsByDay(events);
  const pendingEventIds = new Set(
    (changeRequestsQuery.data ?? [])
      .filter((r) => r.status === 'pending' && r.eventId)
      .map((r) => r.eventId!),
  );

  const shiftByDate = Object.fromEntries(shifts.map((s) => [s.date, s]));

  const monthLabel = new Date(selectedYear, selectedMonth).toLocaleDateString([], {
    month: 'long', year: 'numeric',
  });

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const daysList = Array.from({ length: daysInMonth }, (_, i) =>
    localDateStr(selectedYear, selectedMonth, i + 1),
  ).filter((d) => d <= today);

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
  const todayIndex = isCurrentMonth ? daysList.indexOf(today) : -1;

  useEffect(() => {
    if (todayIndex >= 0 && !eventsQuery.isLoading) {
      const offset = todayIndex * COLLAPSED_ROW_HEIGHT;
      setTimeout(() => scrollRef.current?.scrollTo({ y: offset, animated: false }), 150);
    }
  }, [eventsQuery.isLoading, todayIndex]);

  const totalWorked = daysList.reduce((acc, day) => {
    return acc + calculateWorkedMinutes(groupedEvents[day] ?? []);
  }, 0);

  const goToPrevMonth = () => {
    if (selectedMonth === 0) { setSelectedYear(y => y - 1); setSelectedMonth(11); }
    else setSelectedMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    const nextDate = new Date(selectedYear, selectedMonth + 1);
    if (nextDate <= now) {
      if (selectedMonth === 11) { setSelectedYear(y => y + 1); setSelectedMonth(0); }
      else setSelectedMonth(m => m + 1);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      {successBanner && (
        <View
          style={{
            backgroundColor: submitMutation.isError ? '#fef2f2' : '#f0fdf4',
            borderBottomWidth: 1,
            borderBottomColor: submitMutation.isError ? '#fca5a5' : '#86efac',
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: submitMutation.isError ? '#dc2626' : '#15803d' }}>
            {successBanner}
          </Text>
        </View>
      )}
      {/* Month navigation */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <TouchableOpacity onPress={goToPrevMonth} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#374151" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-base font-semibold text-gray-900">{monthLabel}</Text>
          <Text className="text-xs text-gray-500">Total: {formatMinutes(totalWorked)}</Text>
        </View>
        <TouchableOpacity onPress={goToNextMonth} hitSlop={8} style={{ opacity: isCurrentMonth ? 0.3 : 1 }}>
          <Ionicons name="chevron-forward" size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerClassName="px-4 py-3 gap-2 pb-6"
        refreshControl={
          <RefreshControl
            refreshing={eventsQuery.isRefetching || changeRequestsQuery.isRefetching}
            onRefresh={() => { eventsQuery.refetch(); changeRequestsQuery.refetch(); }}
          />
        }
      >
        {eventsQuery.isLoading ? (
          <Spinner />
        ) : daysList.length === 0 ? (
          <Text className="text-sm text-gray-400">No data for this month.</Text>
        ) : (
          daysList.map((day) => {
            const dayEvents = (groupedEvents[day] ?? []).sort(
              (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
            );
            const worked = calculateWorkedMinutes(dayEvents);
            const shift = shiftByDate[day];
            const [year, month, dayNum] = day.split('-');
            const dayLabel = `${dayNum}.${month}.${year}`;
            const weekday = weekdayFromStr(day);
            const isExpanded = expandedDay === day;
            const isToday = day === today;

            return (
              <View key={day} className={`border ${isToday ? 'border-blue-500' : 'border-gray-200'}`}>
                <TouchableOpacity
                  onPress={() => setExpandedDay(isExpanded ? null : day)}
                  className="flex-row items-center justify-between px-4 py-3"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center gap-3">
                    <View>
                      <Text className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>{weekday} {dayLabel}</Text>
                      <Text className="text-xs text-gray-500">
                        {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                        {shift ? ` · shift ${shift.startTime.slice(0, 5)}–${shift.endTime.slice(0, 5)}` : ''}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Text className={`text-sm font-semibold ${worked > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                      {worked > 0 ? formatMinutes(worked) : '—'}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color="#6b7280"
                    />
                  </View>
                </TouchableOpacity>

                {isExpanded && (
                  <View className="border-t border-gray-100 bg-gray-50 pb-3 pt-1 gap-1">
                    {dayEvents.length === 0 ? (
                      <Text className="text-xs text-gray-400 py-2 px-4">No events recorded.</Text>
                    ) : (
                      dayEvents.map((event) => {
                        const hasPending = pendingEventIds.has(event.id);
                        const refKey = event.id;
                        return (
                          <Swipeable
                            key={event.id}
                            ref={(ref) => { swipeRefs.current[refKey] = ref; }}
                            overshootLeft={false}
                            overshootRight={false}
                            renderLeftActions={() => (
                              <View style={{ backgroundColor: '#2563eb', justifyContent: 'center', paddingHorizontal: 20, minWidth: 72 }}>
                                <Ionicons name="pencil" size={18} color="#fff" />
                              </View>
                            )}
                            renderRightActions={() => (
                              <View style={{ backgroundColor: '#dc2626', justifyContent: 'center', paddingHorizontal: 20, minWidth: 72, alignItems: 'center' }}>
                                <Ionicons name="trash" size={18} color="#fff" />
                              </View>
                            )}
                            onSwipeableOpen={(direction) => {
                              swipeRefs.current[refKey]?.close();
                              if (direction === 'left') {
                                setChangeRequestModal({ date: day, event, type: 'edit' });
                              } else {
                                setChangeRequestModal({ date: day, event, type: 'delete' });
                              }
                            }}
                          >
                            <View
                              style={{ backgroundColor: hasPending ? '#fffbeb' : '#f9fafb', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                            >
                              <View>
                                <Text style={{ fontSize: 13, color: '#1f2937' }}>{EVENT_LABELS[event.type]}</Text>
                                <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{formatTime(event.occurredAt)}</Text>
                              </View>
                              {hasPending && (
                                <View style={{ backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fcd34d', paddingHorizontal: 6, paddingVertical: 2 }}>
                                  <Text style={{ fontSize: 10, color: '#92400e', fontWeight: '600' }}>Pending</Text>
                                </View>
                              )}
                            </View>
                          </Swipeable>
                        );
                      })
                    )}
                    <TouchableOpacity
                      onPress={() => setChangeRequestModal({ date: day, event: null, type: 'add' })}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingTop: 6 }}
                    >
                      <Ionicons name="add-circle-outline" size={16} color="#2563eb" />
                      <Text style={{ fontSize: 12, fontWeight: '500', color: '#2563eb' }}>Add missing event</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Change request modal */}
      <Modal
        visible={!!changeRequestModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setChangeRequestModal(null)}
      >
        <SafeAreaView className="flex-1 bg-white">
          {changeRequestModal && (
            <ChangeRequestForm
              targetDate={changeRequestModal.date}
              targetEvent={changeRequestModal.event}
              initialType={changeRequestModal.type}
              onClose={() => setChangeRequestModal(null)}
              onSubmit={(payload) => submitMutation.mutate(payload)}
              isPending={submitMutation.isPending}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
