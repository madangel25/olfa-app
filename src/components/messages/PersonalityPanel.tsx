"use client";

import { X } from "lucide-react";

export type PersonalityData = {
  moodLabel: string;
  energyLevel: number;
  positivityLevel: number;
  communicationStyle: string;
  avgReplyTime: string;
  mostActivePeriod: string;
  messageLengthStyle: string;
  initiatesFrequency: string;
  compatibilityScore: number;
  compatibilityLabel: string;
};

type PersonalityPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  data: PersonalityData | null;
};

export function PersonalityPanel({ isOpen, onClose, data }: PersonalityPanelProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] transition-opacity duration-220"
      aria-hidden
    >
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />
      <div
        className="absolute right-0 top-0 h-full w-[340px] overflow-y-auto border-l border-stone-200 bg-white shadow-xl transition-transform duration-[220ms] ease-out"
        style={{ transform: "translateX(0)" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white px-4 py-3">
          <h2 className="text-base font-semibold text-stone-900">Personality insight</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-500 hover:bg-stone-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-6 p-4">
          {!data ? (
            <p className="text-sm text-stone-400">No insight data yet.</p>
          ) : (
            <>
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Mood / tone</h3>
                <p className="text-sm font-medium text-stone-900">{data.moodLabel}</p>
                <div className="mt-2 space-y-1.5">
                  <div>
                    <p className="text-[10px] text-stone-500">Energy level</p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${data.energyLevel}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-stone-500">Positivity</p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
                      <div
                        className="h-full rounded-full bg-emerald-400"
                        style={{ width: `${data.positivityLevel}%` }}
                      />
                    </div>
                  </div>
                </div>
              </section>
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Communication style</h3>
                <p className="text-sm text-stone-700">{data.communicationStyle}</p>
              </section>
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Response patterns</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Avg reply time</dt>
                    <dd className="font-medium text-stone-900">{data.avgReplyTime}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Most active</dt>
                    <dd className="font-medium text-stone-900">{data.mostActivePeriod}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Message length</dt>
                    <dd className="font-medium text-stone-900">{data.messageLengthStyle}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Initiates chat</dt>
                    <dd className="font-medium text-stone-900">{data.initiatesFrequency}</dd>
                  </div>
                </dl>
              </section>
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Compatibility score</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-stone-900">{data.compatibilityScore}</span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                    {data.compatibilityLabel}
                  </span>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
