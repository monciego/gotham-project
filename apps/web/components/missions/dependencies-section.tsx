"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { NativeSelect } from "@/components/forms/native-select";
import { SectionCard } from "@/components/section-card";
import { useAddDependency, useMissionOptions, useRemoveDependency } from "@/lib/mission-queries";
import type { MissionDetail, MissionSummary } from "@/lib/types";
import { StatusBadge } from "./status-badge";

function MissionLink({ mission, onRemove }: { mission: MissionSummary; onRemove?: () => void }) {
  return (
    <li className="flex items-center gap-2 py-1.5">
      <Link href={`/missions/${mission.id}`} className="min-w-0 flex-1 truncate text-sm hover:text-primary">
        {mission.title}
      </Link>
      <StatusBadge status={mission.status} />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Stop waiting on ${mission.title}`}
          className="rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </li>
  );
}

export function DependenciesSection({ mission }: { mission: MissionDetail }) {
  const { data: options } = useMissionOptions();
  const add = useAddDependency(mission.id);
  const remove = useRemoveDependency(mission.id);
  const [choice, setChoice] = useState("");

  const blocking = mission.dependencies.filter((dependency) => dependency.status !== "completed");
  const taken = new Set([mission.id, ...mission.dependencies.map((dependency) => dependency.id)]);
  const available = options?.filter((option) => !taken.has(option.id)) ?? [];

  return (
    <SectionCard
      title="DEPENDENCIES"
      action={
        blocking.length > 0 && <span className="text-xs text-amber-400">{blocking.length} blocking</span>
      }
    >
      <h3 className="text-xs text-muted-foreground">Blocked by</h3>
      {mission.dependencies.length ? (
        <ul>
          {mission.dependencies.map((dependency) => (
            <MissionLink key={dependency.id} mission={dependency} onRemove={() => remove.mutate(dependency.id)} />
          ))}
        </ul>
      ) : (
        <p className="py-1.5 text-sm text-muted-foreground">Nothing. You&apos;re clear to proceed.</p>
      )}

      <form
        className="mt-2 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (choice) add.mutate(Number(choice), { onSuccess: () => setChoice("") });
        }}
      >
        <NativeSelect
          value={choice}
          onChange={(event) => setChoice(event.target.value)}
          aria-label="Mission this one waits on"
          className="min-w-0 flex-1"
        >
          <option value="">Waits on…</option>
          {available.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline" disabled={!choice || add.isPending}>
          Add
        </Button>
      </form>
      {add.isError && <p className="mt-1 text-xs text-destructive">{add.error.message}</p>}

      {mission.dependents.length > 0 && (
        <>
          <h3 className="mt-4 text-xs text-muted-foreground">Waiting on this</h3>
          <ul>
            {mission.dependents.map((dependent) => (
              <MissionLink key={dependent.id} mission={dependent} />
            ))}
          </ul>
        </>
      )}
    </SectionCard>
  );
}
