import { useEventEmitter } from "ahooks";
import React, { createContext, useContext } from "react";

export enum EventDataType {
  OperationTable = "OperationTable",
}

// 定义事件数据类型（
export type EventData = {
  type: string;
  message: string;
};

type EventBusType = ReturnType<typeof useEventEmitter<EventData>>;

const EventBusContext = createContext<EventBusType | null>(null);

export const EventBusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const eventBus = useEventEmitter<EventData>();
  return (
    <EventBusContext.Provider value={eventBus}>
      {children}
    </EventBusContext.Provider>
  );
};

// 自定义 Hook 用于在任意组件中获取事件总线
export const useEventBus = () => {
  const context = useContext(EventBusContext);
  if (!context) {
    throw new Error("useEventBus must be used within EventBusProvider");
  }
  return context;
};
