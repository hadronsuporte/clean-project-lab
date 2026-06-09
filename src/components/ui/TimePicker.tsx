import * as React from "react";
import { Clock, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface TimePickerProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  label?: string;
  minutesStep?: number;
}

export function TimePicker({ value, onChange, label, minutesStep = 15 }: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempHour, setTempHour] = React.useState("09");
  const [tempMinute, setTempMinute] = React.useState("00");

  React.useEffect(() => {
    if (value && value.includes(":")) {
      const [h, m] = value.split(":");
      setTempHour(h);
      setTempMinute(m);
    }
  }, [value, isOpen]);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 / minutesStep }, (_, i) => (i * minutesStep).toString().padStart(2, "0"));

  const handleConfirm = () => {
    onChange(`${tempHour}:${tempMinute}`);
    setIsOpen(false);
  };

  return (
    <>
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">
            {label}
          </label>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="w-full justify-start text-left font-normal bg-[#141b2a] border-[#2a3347] h-11 text-[#c8d4e8] hover:bg-[#1c2333] hover:border-[#f0c040]/50"
        >
          <Clock className="mr-2 h-4 w-4 text-[#f0c040]" />
          <span className="font-oswald text-sm tracking-widest">{value || "--:--"}</span>
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-[#1c2333] border-[#2a3347] text-[#c8d4e8] p-0 overflow-hidden w-[calc(100vw-24px)] max-w-[340px] rounded-lg">
          <DialogHeader className="p-4 border-b border-[#2a3347] flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="font-oswald uppercase tracking-widest text-[#f0c040] text-sm">
              SELECIONAR HORÁRIO
            </DialogTitle>
            <button onClick={() => setIsOpen(false)} className="text-[#8a9ab5] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </DialogHeader>

          <div className="p-4 flex gap-4 justify-center items-center h-[260px]">
            {/* Hours Column */}
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[9px] font-bold text-[#8a9ab5] uppercase tracking-widest mb-2">HORA</span>
              <div className="w-full overflow-y-auto h-[200px] scrollbar-hide flex flex-col gap-1 pr-1">
                {hours.map((h) => (
                  <button
                    key={h}
                    onClick={() => setTempHour(h)}
                    className={cn(
                      "py-2 px-4 text-center rounded text-lg font-oswald transition-all",
                      tempHour === h 
                        ? "bg-[#f0c040] text-[#1c2333] font-bold scale-105" 
                        : "text-[#c8d4e8] hover:bg-[#141b2a]"
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-2xl font-oswald text-[#f0c040] mb-[-20px]">:</span>

            {/* Minutes Column */}
            <div className="flex-1 flex flex-col items-center">
              <span className="text-[9px] font-bold text-[#8a9ab5] uppercase tracking-widest mb-2">MIN</span>
              <div className="w-full overflow-y-auto h-[200px] scrollbar-hide flex flex-col gap-1 pl-1">
                {minutes.map((m) => (
                  <button
                    key={m}
                    onClick={() => setTempMinute(m)}
                    className={cn(
                      "py-2 px-4 text-center rounded text-lg font-oswald transition-all",
                      tempMinute === m 
                        ? "bg-[#f0c040] text-[#1c2333] font-bold scale-105" 
                        : "text-[#c8d4e8] hover:bg-[#141b2a]"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-[#141b2a] border-t border-[#2a3347] flex flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              className="flex-1 bg-transparent border-[#2a3347] text-[#8a9ab5] hover:text-white hover:bg-[#1c2333] h-11 text-xs font-bold uppercase tracking-widest"
            >
              CANCELAR
            </Button>
            <Button 
              onClick={handleConfirm}
              className="flex-1 bg-[#f0c040] text-[#1c2333] hover:bg-[#d4a935] h-11 text-xs font-bold uppercase tracking-widest"
            >
              <Check className="w-4 h-4 mr-1" /> CONFIRMAR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
