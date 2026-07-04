import React from "react";
import { Platform, View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import DateTimePicker from "@react-native-community/datetimepicker";

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  show: boolean;
  onClose: () => void;
}

export default function DatePicker({ value, onChange, show, onClose }: Props) {
  const { t } = useTranslation();
  if (!show) return null;

  if (Platform.OS === "web") {
    const dateStr = value.toISOString().split("T")[0];
    return (
      <View style={styles.webContainer}>
        <input
          type="date"
          value={dateStr}
          placeholder="Select date"
          onChange={(e) => {
            const d = new Date(e.target.value + "T12:00:00");
            if (!isNaN(d.getTime())) onChange(d);
            onClose();
          }}
          style={{
            padding: "16px",
            fontSize: "16px",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            backgroundColor: "#f8fafc",
            width: "100%",
            boxSizing: "border-box",
          }}
        />
        <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
          <Text style={styles.doneText}>{t("common.done")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <DateTimePicker
      value={value}
      mode="date"
      display={Platform.OS === "ios" ? "spinner" : "default"}
      onChange={(_e, d) => {
        if (d) onChange(d);
        onClose();
      }}
    />
  );
}

const styles = StyleSheet.create({
  webContainer: { marginBottom: 12 },
  doneBtn: { alignItems: "center", paddingVertical: 10, marginTop: 4 },
  doneText: { color: "#2563eb", fontWeight: "700", fontSize: 16 },
});
