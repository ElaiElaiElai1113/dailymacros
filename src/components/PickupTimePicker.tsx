import { useState } from "react";
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
    <div className="flex gap-2 items-center">
      <input
        type="datetime-local"
        value={v}
        min={min}
        onChange={(e) => {
          setV(e.target.value);
          onChange(e.target.value);
        }}
        className="border px-2 py-1 rounded"
      />
      <span className="text-xs text-gray-500">
        Store hours enforced at backend
      </span>
    </div>
  );
}
