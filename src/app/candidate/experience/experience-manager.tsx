"use client";

import { useActionState, useEffect, useState } from "react";
import {
  deleteExperienceAction,
  saveExperienceAction,
} from "@/lib/actions/candidate";
import { idleState } from "@/lib/form";
import { EMPLOYMENT_TYPES, labelFor } from "@/lib/constants";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  EmptyState,
  Field,
  FormGrid,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionButton } from "@/components/action-button";

type Experience = {
  id: string;
  organization: string;
  designation: string;
  department: string | null;
  employmentType: string | null;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  responsibilities: string | null;
};

export function ExperienceManager({
  experiences,
}: {
  experiences: Experience[];
}) {
  const [editing, setEditing] = useState<Experience | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {experiences.length === 0 && !showForm ? (
        <EmptyState
          title="No experience recorded"
          description="If you are a fresh candidate you can skip this section entirely."
          action={<Button onClick={() => setShowForm(true)}>Add experience</Button>}
        />
      ) : null}

      {experiences.length > 0 ? (
        <div className="flex flex-col gap-3">
          {experiences.map((experience) => (
            <Card key={experience.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {experience.designation}
                    </h3>
                    {experience.isCurrent ? (
                      <Badge tone="success">Current</Badge>
                    ) : null}
                    {experience.employmentType ? (
                      <Badge tone="info">
                        {labelFor(EMPLOYMENT_TYPES, experience.employmentType)}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {experience.organization}
                    {experience.department ? ` · ${experience.department}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {experience.startDate} —{" "}
                    {experience.isCurrent ? "Present" : experience.endDate}
                  </p>
                  {experience.responsibilities ? (
                    <p className="mt-2 text-sm whitespace-pre-line text-slate-600">
                      {experience.responsibilities}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditing(experience);
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </Button>
                  <ActionButton
                    action={deleteExperienceAction}
                    fields={{ experienceId: experience.id }}
                    variant="ghost"
                    size="sm"
                    confirm="Remove this experience record?"
                    pendingLabel="Removing…"
                  >
                    Remove
                  </ActionButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {showForm ? (
        <ExperienceForm
          key={editing?.id ?? "new"}
          experience={editing}
          onDone={() => {
            setEditing(null);
            setShowForm(false);
          }}
        />
      ) : experiences.length > 0 ? (
        <div>
          <Button
            variant="secondary"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            Add another role
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ExperienceForm({
  experience,
  onDone,
}: {
  experience: Experience | null;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(saveExperienceAction, idleState);
  const [isCurrent, setIsCurrent] = useState(experience?.isCurrent ?? false);
  const errors = state.errors ?? {};

  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state.status, onDone]);

  return (
    <Card>
      <CardHeader title={experience ? "Edit role" : "Add a role"} />
      <CardBody>
        <form action={formAction} className="flex flex-col gap-5">
          {experience ? (
            <input type="hidden" name="experienceId" value={experience.id} />
          ) : null}

          {state.status === "error" && state.message ? (
            <Alert tone="danger">{state.message}</Alert>
          ) : null}

          <FormGrid>
            <Field
              label="Organization"
              name="organization"
              error={errors.organization}
              required
            >
              <Input
                name="organization"
                defaultValue={experience?.organization ?? ""}
                required
                error={errors.organization}
              />
            </Field>

            <Field
              label="Designation"
              name="designation"
              error={errors.designation}
              required
            >
              <Input
                name="designation"
                defaultValue={experience?.designation ?? ""}
                required
                error={errors.designation}
              />
            </Field>

            <Field label="Department" name="department" error={errors.department}>
              <Input
                name="department"
                defaultValue={experience?.department ?? ""}
                error={errors.department}
              />
            </Field>

            <Field
              label="Employment type"
              name="employmentType"
              error={errors.employmentType}
            >
              <Select
                name="employmentType"
                defaultValue={experience?.employmentType ?? ""}
                options={EMPLOYMENT_TYPES}
                placeholder="Select type"
                error={errors.employmentType}
              />
            </Field>

            <Field
              label="Start date"
              name="startDate"
              error={errors.startDate}
              required
            >
              <Input
                name="startDate"
                type="date"
                defaultValue={experience?.startDate ?? ""}
                required
                error={errors.startDate}
              />
            </Field>

            <Field label="End date" name="endDate" error={errors.endDate}>
              <Input
                name="endDate"
                type="date"
                defaultValue={experience?.endDate ?? ""}
                disabled={isCurrent}
                error={errors.endDate}
              />
            </Field>
          </FormGrid>

          <Checkbox
            name="isCurrent"
            label="I currently work here"
            checked={isCurrent}
            onChange={(e) => setIsCurrent(e.target.checked)}
          />

          <Field
            label="Responsibilities"
            name="responsibilities"
            error={errors.responsibilities}
            hint="Recruiters search this text when matching required skills."
          >
            <Textarea
              name="responsibilities"
              rows={4}
              defaultValue={experience?.responsibilities ?? ""}
              error={errors.responsibilities}
            />
          </Field>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onDone}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Saving…">
              {experience ? "Save changes" : "Add role"}
            </SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
