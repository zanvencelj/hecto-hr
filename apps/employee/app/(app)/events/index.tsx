import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { WorkEventType, WorkEventPublic } from "@hecto/shared-types";
import { Spinner } from "@hecto/ui-native";
import { Card } from "@hecto/ui-native";
import { useAuthStore } from "@/stores/auth.store";
import { usePreferencesStore, DEFAULT_ORDER } from "@/stores/preferences.store";
import { createEvent, getMyEvents } from "@/services/events.service";
import { getMyShifts } from "@/services/shifts.service";

const EVENT_META: Record<WorkEventType, { label: string; color: string }> = {
  arrival: { label: "Arrival", color: "#16a34a" },
  departure: { label: "Departure", color: "#374151" },
  break_start: { label: "Break", color: "#d97706" },
  break_end: { label: "Break End", color: "#d97706" },
  remote_arrival: { label: "Remote", color: "#2563eb" },
  business_trip_start: { label: "Trip Start", color: "#7c3aed" },
  business_trip_end: { label: "Trip End", color: "#7c3aed" },
};

const STATUS_MAP: Record<
  WorkEventType | "none",
  { label: string; color: string; bg: string; border: string }
> = {
  none: {
    label: "Not Clocked In",
    color: "#6b7280",
    bg: "#f9fafb",
    border: "#e5e7eb",
  },
  arrival: {
    label: "Working",
    color: "#15803d",
    bg: "#f0fdf4",
    border: "#86efac",
  },
  remote_arrival: {
    label: "Working Remote",
    color: "#1d4ed8",
    bg: "#eff6ff",
    border: "#93c5fd",
  },
  break_start: {
    label: "On Break",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fcd34d",
  },
  break_end: {
    label: "Working",
    color: "#15803d",
    bg: "#f0fdf4",
    border: "#86efac",
  },
  departure: {
    label: "Left for Day",
    color: "#6b7280",
    bg: "#f9fafb",
    border: "#e5e7eb",
  },
  business_trip_start: {
    label: "Business Trip",
    color: "#6d28d9",
    bg: "#f5f3ff",
    border: "#c4b5fd",
  },
  business_trip_end: {
    label: "Working",
    color: "#15803d",
    bg: "#f0fdf4",
    border: "#86efac",
  },
};

const AVAILABLE_ACTIONS: Record<WorkEventType | "none", WorkEventType[]> = {
  none: ["arrival", "remote_arrival", "business_trip_start"],
  arrival: ["departure", "break_start"],
  remote_arrival: ["departure", "break_start"],
  break_start: ["break_end", "departure"],
  break_end: ["departure", "break_start"],
  departure: ["arrival", "remote_arrival", "business_trip_start"],
  business_trip_start: ["business_trip_end", "departure"],
  business_trip_end: ["departure", "break_start"],
};

const EVENT_LABELS: Record<WorkEventType, string> = {
  arrival: "Arrival",
  departure: "Departure",
  break_start: "Break Start",
  break_end: "Break End",
  remote_arrival: "Remote Work",
  business_trip_start: "Trip Start",
  business_trip_end: "Trip End",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? "-" : "";
  if (h === 0) return `${sign}${m}m`;
  return `${sign}${h}h ${m > 0 ? `${m}m` : ""}`.trim();
}

function todayRange(): { from: string; to: string } {
  const today = new Date();
  const from = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).toISOString();
  const to = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  ).toISOString();
  return { from, to };
}

function todayDateString(): string {
  return new Date().toISOString().split("T")[0]!;
}

function calculateWorkedMinutes(events: WorkEventPublic[]): number {
  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
  let workedMs = 0;
  let breakMs = 0;
  let workStart: Date | null = null;
  let breakStart: Date | null = null;
  for (const e of sorted) {
    const t = new Date(e.occurredAt);
    if (
      e.type === "arrival" ||
      e.type === "remote_arrival" ||
      e.type === "business_trip_start"
    ) {
      workStart = t;
    } else if (e.type === "departure" || e.type === "business_trip_end") {
      if (workStart) {
        workedMs += t.getTime() - workStart.getTime();
        workStart = null;
      }
    } else if (e.type === "break_start") {
      breakStart = t;
    } else if (e.type === "break_end") {
      if (breakStart) {
        breakMs += t.getTime() - breakStart.getTime();
        breakStart = null;
      }
    }
  }
  return Math.round(workedMs / 60000 - Math.max(0, breakMs / 60000 - 60));
}

function calculateExpectedMinutes(
  shifts: { startTime: string; endTime: string }[],
): number {
  return shifts.reduce((acc, s) => {
    const [sh, sm] = s.startTime.split(":").map(Number);
    const [eh, em] = s.endTime.split(":").map(Number);
    return acc + (eh! * 60 + em!) - (sh! * 60 + sm!);
  }, 0);
}

function getCurrentState(events: WorkEventPublic[]): WorkEventType | "none" {
  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
  return (sorted[sorted.length - 1]?.type ?? "none") as WorkEventType | "none";
}

function EditModal({
  visible,
  onClose,
  order,
  hidden,
  onOrderChange,
  onHiddenChange,
}: {
  visible: boolean;
  onClose: () => void;
  order: WorkEventType[];
  hidden: WorkEventType[];
  onOrderChange: (o: WorkEventType[]) => void;
  onHiddenChange: (h: WorkEventType[]) => void;
}) {
  const [localOrder, setLocalOrder] = useState<WorkEventType[]>(order);
  const [localHidden, setLocalHidden] = useState<WorkEventType[]>(hidden);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...localOrder];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    setLocalOrder(next);
  };

  const toggleHidden = (type: WorkEventType) => {
    setLocalHidden((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const save = () => {
    onOrderChange(localOrder);
    onHiddenChange(localHidden);
    onClose();
  };

  const reset = () => {
    setLocalOrder([...DEFAULT_ORDER]);
    setLocalHidden([]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: "#e5e7eb",
          }}
        >
          <TouchableOpacity onPress={reset}>
            <Text style={{ fontSize: 14, color: "#6b7280" }}>Reset</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}>
            Customise Actions
          </Text>
          <TouchableOpacity onPress={save}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#2563eb" }}>
              Done
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={{
            fontSize: 12,
            color: "#6b7280",
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 6,
          }}
        >
          Toggle visibility and reorder buttons.
        </Text>

        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {localOrder.map((type, idx) => {
            const meta = EVENT_META[type];
            const isHidden = localHidden.includes(type);
            return (
              <View
                key={type}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: "#f3f4f6",
                  backgroundColor: isHidden ? "#f9fafb" : "#fff",
                  gap: 12,
                }}
              >
                <View
                  style={{ width: 4, height: 28, backgroundColor: meta.color }}
                />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    color: isHidden ? "#9ca3af" : "#111827",
                    textDecorationLine: isHidden ? "line-through" : "none",
                  }}
                >
                  {EVENT_LABELS[type]}
                </Text>
                <TouchableOpacity
                  onPress={() => toggleHidden(type)}
                  style={{ padding: 4 }}
                >
                  <Ionicons
                    name={isHidden ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={isHidden ? "#9ca3af" : "#374151"}
                  />
                </TouchableOpacity>
                <View style={{ flexDirection: "row", gap: 2 }}>
                  <TouchableOpacity
                    onPress={() => move(idx, -1)}
                    style={{ padding: 4, opacity: idx === 0 ? 0.3 : 1 }}
                    disabled={idx === 0}
                  >
                    <Ionicons name="chevron-up" size={18} color="#374151" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => move(idx, 1)}
                    style={{
                      padding: 4,
                      opacity: idx === localOrder.length - 1 ? 0.3 : 1,
                    }}
                    disabled={idx === localOrder.length - 1}
                  >
                    <Ionicons name="chevron-down" size={18} color="#374151" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function EventsScreen() {
  const user = useAuthStore((s) => s.user);
  const { buttonOrder, hiddenButtons, setButtonOrder, setHiddenButtons } =
    usePreferencesStore();
  const queryClient = useQueryClient();
  const { from, to } = todayRange();
  const today = todayDateString();
  const [editModalVisible, setEditModalVisible] = useState(false);

  const {
    data: events = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["events", "today"],
    queryFn: () => getMyEvents(from, to),
  });

  const { data: todayShifts = [] } = useQuery({
    queryKey: ["shifts", "mine", today, today],
    queryFn: () => getMyShifts(user!.id, today, today),
    enabled: !!user,
  });

  const {
    mutate: logEvent,
    isPending,
    variables,
  } = useMutation({
    mutationFn: (type: WorkEventType) => createEvent({ type }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });

  const workedMinutes = calculateWorkedMinutes(events);
  const expectedMinutes = calculateExpectedMinutes(todayShifts);
  const hasShift = todayShifts.length > 0;
  const currentState = getCurrentState(events);
  const currentStatus = STATUS_MAP[currentState];
  const availableTypes = new Set(AVAILABLE_ACTIONS[currentState]);

  const visibleButtons = buttonOrder
    .filter((t) => availableTypes.has(t) && !hiddenButtons.includes(t))
    .map((t) => ({ type: t, ...EVENT_META[t] }));

  const sortedEvents = [...events].sort(
    (a, b) =>
      new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );

  const dateLabel = new Date().toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-4 gap-4"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <View>
          <Text className="text-sm text-gray-500">{dateLabel}</Text>
        </View>

        {/* Status banner */}
        <View
          style={{
            backgroundColor: currentStatus.bg,
            borderWidth: 1,
            borderColor: currentStatus.border,
            borderLeftWidth: 4,
            borderLeftColor: currentStatus.color,
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: currentStatus.color,
            }}
          />
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: currentStatus.color,
            }}
          >
            {currentStatus.label}
          </Text>
        </View>

        {/* Hour balance */}
        <View className="flex-row gap-3">
          <Card className="flex-1 items-center py-4 gap-1">
            <Text className="text-xs text-gray-500 uppercase tracking-wide">
              Today
            </Text>
            <Text className="text-xl font-bold text-gray-900">
              {formatMinutes(workedMinutes)}
            </Text>
            {hasShift && (
              <Text
                className={`text-xs font-medium ${workedMinutes >= expectedMinutes ? "text-green-600" : "text-amber-600"}`}
              >
                {workedMinutes >= expectedMinutes ? "+" : ""}
                {formatMinutes(workedMinutes - expectedMinutes)}
              </Text>
            )}
          </Card>
          <Card className="flex-1 items-center py-4 gap-1">
            <Text className="text-xs text-gray-500 uppercase tracking-wide">
              Expected
            </Text>
            <Text className="text-xl font-bold text-gray-900">
              {hasShift ? formatMinutes(expectedMinutes) : "—"}
            </Text>
            {hasShift && (
              <Text className="text-xs text-gray-400">from shift</Text>
            )}
          </Card>
        </View>

        {/* Timeline */}
        <View>
          <Text className="mb-2 text-base font-semibold text-gray-700">
            Today's Timeline
          </Text>
          {isLoading ? (
            <Spinner />
          ) : sortedEvents.length === 0 ? (
            <Text className="text-sm text-gray-400">
              No events logged today.
            </Text>
          ) : (
            <View className="gap-2">
              {sortedEvents.map((event) => (
                <Card
                  key={event.id}
                  className="flex-row items-center justify-between"
                >
                  <Text className="text-sm font-medium text-gray-800">
                    {EVENT_LABELS[event.type]}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {formatTime(event.occurredAt)}
                  </Text>
                </Card>
              ))}
            </View>
          )}
        </View>

        <View
          style={{
            height:
              visibleButtons.length > 0
                ? Math.ceil(visibleButtons.length / 2) * 72 + 48
                : 16,
          }}
        />
      </ScrollView>

      {/* Pinned action grid */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          backgroundColor: "#fff",
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              color: "#9ca3af",
              fontWeight: "500",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Log Event
          </Text>
          <TouchableOpacity
            onPress={() => setEditModalVisible(true)}
            style={{ padding: 4 }}
          >
            <Text
              style={{
                fontSize: 11,
                color: "#2563eb",
                fontWeight: "500",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Edit
            </Text>
          </TouchableOpacity>
        </View>

        {visibleButtons.length === 0 ? (
          <Text
            style={{
              fontSize: 12,
              color: "#9ca3af",
              textAlign: "center",
              paddingVertical: 8,
            }}
          >
            No actions available
          </Text>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {visibleButtons.map((btn) => (
              <TouchableOpacity
                key={btn.type}
                onPress={() => logEvent(btn.type)}
                disabled={isPending}
                style={{
                  width: visibleButtons.length === 1 ? "100%" : "48%",
                  flexGrow: 1,
                  borderLeftWidth: 4,
                  borderLeftColor: btn.color,
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                  backgroundColor: "#fff",
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  opacity: isPending && variables === btn.type ? 0.5 : 1,
                  minHeight: 60,
                }}
                activeOpacity={0.7}
              >
                {isPending && variables === btn.type ? (
                  <Spinner size="sm" />
                ) : null}
                <Text
                  style={{ color: btn.color, fontSize: 14, fontWeight: "600" }}
                >
                  {btn.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <EditModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        order={buttonOrder}
        hidden={hiddenButtons}
        onOrderChange={setButtonOrder}
        onHiddenChange={setHiddenButtons}
      />
    </SafeAreaView>
  );
}
