import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function PickupTimePicker({
  value,
  min,
  onChange,
}: {
  value: string;
  min?: string;
  onChange: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  return (
    <div className="flex w-full items-center gap-2">
      <Input
        type="datetime-local"
        value={v}
        min={min}
        onChange={(e) => {
          setV(e.target.value);
          onChange(e.target.value);
        }}
        className="w-full"
      />
    </div>
  );
}
