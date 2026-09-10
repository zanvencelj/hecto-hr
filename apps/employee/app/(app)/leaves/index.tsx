import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert as RNAlert } from 'react-native';
import { DatePicker } from '@/components/DatePicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@hecto/ui-native';
import { Badge } from '@hecto/ui-native';
import { Button } from '@hecto/ui-native';
import { Spinner } from '@hecto/ui-native';
import { FormField } from '@hecto/ui-native';
import { Input } from '@hecto/ui-native';
import type { LeaveRequestStatus, LeaveTypePublic } from '@hecto/shared-types';
import { useAuthStore } from '@/stores/auth.store';
import {
  getLeaveTypes,
  getMyLeaveBalance,
  getMyLeaveRequests,
  createLeaveRequest,
  cancelLeaveRequest,
} from '@/services/leave.service';

type Tab = 'balance' | 'requests' | 'request';

const STATUS_VARIANTS: Record<LeaveRequestStatus, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  cancelled: 'default',
};

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

function formatDisplay(date: Date | null): string {
  if (!date) return 'Select date';
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

export default function LeavesScreen() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('balance');
  const [selectedType, setSelectedType] = useState<LeaveTypePublic | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const typesQuery = useQuery({ queryKey: ['leave-types'], queryFn: getLeaveTypes });

  const balanceQuery = useQuery({
    queryKey: ['leave-balance', user?.id],
    queryFn: () => getMyLeaveBalance(user!.id),
    enabled: !!user && tab === 'balance',
  });

  const requestsQuery = useQuery({
    queryKey: ['leave-requests', user?.id],
    queryFn: () => getMyLeaveRequests(user!.id),
    enabled: !!user && tab === 'requests',
  });

  const createMutation = useMutation({
    mutationFn: createLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
      setTab('requests');
      setSelectedType(null);
      setStartDate(null);
      setEndDate(null);
      setNotes('');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balance'] });
    },
  });

  const handleSubmit = () => {
    if (!user || !selectedType || !startDate || !endDate) return;
    createMutation.mutate({
      userId: user.id,
      leaveTypeId: selectedType.id,
      startDate: toISODate(startDate),
      endDate: toISODate(endDate),
      notes: notes || undefined,
    });
  };

  const handleCancel = (id: string) => {
    RNAlert.alert('Cancel Request', 'Cancel this leave request?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: () => cancelMutation.mutate(id) },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <View className="px-4 pt-2 pb-2">
        <View className="flex-row border border-gray-200">
          {(['balance', 'requests', 'request'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              className={`flex-1 py-2.5 items-center border-r border-gray-200 last:border-r-0 ${tab === t ? 'bg-blue-600' : 'bg-white'}`}
            >
              <Text className={`text-xs font-medium capitalize ${tab === t ? 'text-white' : 'text-gray-500'}`}>
                {t === 'request' ? 'New' : t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-3"
        contentContainerClassName="gap-3 pb-6"
        refreshControl={
          <RefreshControl
            refreshing={balanceQuery.isRefetching || requestsQuery.isRefetching}
            onRefresh={() => {
              if (tab === 'balance') balanceQuery.refetch();
              if (tab === 'requests') requestsQuery.refetch();
            }}
          />
        }
      >
        {tab === 'balance' && (
          <>
            {balanceQuery.isLoading ? <Spinner /> :
              (balanceQuery.data ?? []).length === 0 ? (
                <Text className="text-sm text-gray-400">No leave balances found.</Text>
              ) : (
                (balanceQuery.data ?? []).map((balance) => (
                  <Card key={balance.id}>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View className="h-3 w-3" style={{ backgroundColor: balance.leaveTypeColor }} />
                        <Text className="font-semibold text-gray-800">{balance.leaveTypeName}</Text>
                      </View>
                      <Text className="text-sm text-gray-500">
                        {balance.usedDays} / {balance.totalDays ?? '∞'} days
                      </Text>
                    </View>
                    <View className="mt-2 h-1.5 bg-gray-100">
                      <View
                        className="h-1.5 bg-blue-600"
                        style={{
                          width: balance.totalDays
                            ? `${Math.min(100, (Number(balance.usedDays) / Number(balance.totalDays)) * 100)}%`
                            : '0%',
                        }}
                      />
                    </View>
                    {Number(balance.pendingDays) > 0 && (
                      <Text className="mt-1 text-xs text-amber-600">{balance.pendingDays} days pending</Text>
                    )}
                  </Card>
                ))
              )
            }
          </>
        )}

        {tab === 'requests' && (
          <>
            {requestsQuery.isLoading ? <Spinner /> :
              (requestsQuery.data ?? []).length === 0 ? (
                <Text className="text-sm text-gray-400">No leave requests.</Text>
              ) : (
                (requestsQuery.data ?? []).map((req) => (
                  <Card key={req.id}>
                    <View className="flex-row items-center justify-between">
                      <Text className="font-semibold text-gray-800">{req.leaveTypeName}</Text>
                      <Badge variant={STATUS_VARIANTS[req.status]} label={req.status} />
                    </View>
                    <Text className="mt-1 text-xs text-gray-500">
                      {req.startDate.split('-').reverse().join('. ')} – {req.endDate.split('-').reverse().join('. ')} · {req.totalDays} days
                    </Text>
                    {req.notes && <Text className="mt-1 text-xs text-gray-400">{req.notes}</Text>}
                    {req.status === 'pending' && (
                      <TouchableOpacity onPress={() => handleCancel(req.id)} className="mt-2 self-end">
                        <Text className="text-xs text-red-500 font-medium">Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </Card>
                ))
              )
            }
          </>
        )}

        {tab === 'request' && (
          <View className="gap-4 pb-8">
            <FormField label="Leave Type" required>
              <View className="flex-row flex-wrap gap-2">
                {typesQuery.isLoading ? <Spinner /> : (
                  (typesQuery.data ?? []).map((type) => (
                    <TouchableOpacity
                      key={type.id}
                      onPress={() => setSelectedType(type)}
                      className={`border px-3 py-2 ${selectedType?.id === type.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}
                    >
                      <Text className={`text-sm font-medium ${selectedType?.id === type.id ? 'text-blue-700' : 'text-gray-700'}`}>
                        {type.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </FormField>

            <FormField label="Start Date" required>
              <DatePicker value={startDate} onChange={setStartDate}>
                <View className="h-11 w-full border border-gray-300 bg-white px-3 justify-center">
                  <Text className={startDate ? 'text-sm text-gray-900' : 'text-sm text-gray-400'}>
                    {formatDisplay(startDate)}
                  </Text>
                </View>
              </DatePicker>
            </FormField>

            <FormField label="End Date" required>
              <DatePicker value={endDate} onChange={setEndDate} minimumDate={startDate ?? undefined}>
                <View className="h-11 w-full border border-gray-300 bg-white px-3 justify-center">
                  <Text className={endDate ? 'text-sm text-gray-900' : 'text-sm text-gray-400'}>
                    {formatDisplay(endDate)}
                  </Text>
                </View>
              </DatePicker>
            </FormField>

            <FormField label="Notes (optional)">
              <Input
                value={notes}
                onChangeText={setNotes}
                placeholder="Add a note..."
                multiline
                className="min-h-20"
                style={{ textAlignVertical: 'top' }}
              />
            </FormField>

            <Button
              label="Submit Request"
              onPress={handleSubmit}
              loading={createMutation.isPending}
              disabled={!selectedType || !startDate || !endDate}
            />

            {createMutation.isError && (
              <Text className="text-center text-xs text-red-500">
                Failed to submit. Please try again.
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
