"use client";

import { useActionState, useEffect, useState } from "react";
import {
  deleteEducationAction,
  saveEducationAction,
} from "@/lib/actions/candidate";
import { idleState } from "@/lib/form";
import { EDUCATION_LEVELS, RESULT_TYPES, labelFor } from "@/lib/constants";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  FormGrid,
  Input,
  Select,
} from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionButton } from "@/components/action-button";

type Education = {
  id: string;
  level: string;
  degreeTitle: string;
  majorSubjects: string | null;
  institution: string;
  boardOrUniversity: string | null;
  startYear: number | null;
  passingYear: number;
  resultType: string;
  obtainedMarks: number | null;
  totalMarks: number | null;
  cgpa: number | null;
  maxCgpa: number | null;
  grade: string | null;
};

export function EducationManager({ educations }: { educations: Education[] }) {
  const [editing, setEditing] = useState<Education | null>(null);
  const [showForm, setShowForm] = useState(educations.length === 0);

  return (
    <div className="flex flex-col gap-6">
      {educations.length === 0 && !showForm ? (
        <EmptyState
          title="No education records yet"
          description="Add at least your highest qualification so recruiters can assess your eligibility."
          action={<Button onClick={() => setShowForm(true)}>Add qualification</Button>}
        />
      ) : null}

      {educations.length > 0 ? (
        <div className="flex flex-col gap-3">
          {educations.map((education) => (
            <Card key={education.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {education.degreeTitle}
                    </h3>
                    <Badge tone="info">
                      {labelFor(EDUCATION_LEVELS, education.level)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {education.institution}
                    {education.boardOrUniversity
                      ? ` · ${education.boardOrUniversity}`
                      : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {education.startYear ? `${education.startYear} – ` : ""}
                    {education.passingYear}
                    {education.majorSubjects ? ` · ${education.majorSubjects}` : ""}
                    {" · "}
                    {formatResult(education)}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditing(education);
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </Button>
                  <ActionButton
                    action={deleteEducationAction}
                    fields={{ educationId: education.id }}
                    variant="ghost"
                    size="sm"
                    confirm="Remove this education record?"
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
        <EducationForm
          key={editing?.id ?? "new"}
          education={editing}
          onDone={() => {
            setEditing(null);
            setShowForm(false);
          }}
        />
      ) : (
        <div>
          <Button
            variant="secondary"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            Add another qualification
          </Button>
        </div>
      )}
    </div>
  );
}

function formatResult(education: Education): string {
  if (education.resultType === "CGPA" && education.cgpa != null) {
    return `CGPA ${education.cgpa}${education.maxCgpa ? ` / ${education.maxCgpa}` : ""}`;
  }
  if (
    education.resultType === "MARKS" &&
    education.obtainedMarks != null &&
    education.totalMarks != null
  ) {
    const percentage = Math.round(
      (education.obtainedMarks / education.totalMarks) * 100,
    );
    return `${education.obtainedMarks} / ${education.totalMarks} (${percentage}%)`;
  }
  return education.grade ? `Grade ${education.grade}` : "Result not provided";
}

function EducationForm({
  education,
  onDone,
}: {
  education: Education | null;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(saveEducationAction, idleState);
  const [resultType, setResultType] = useState(education?.resultType ?? "MARKS");
  const errors = state.errors ?? {};

  // Collapse the form once the server confirms the record was saved.
  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state.status, onDone]);

  return (
    <Card>
      <CardHeader
        title={education ? "Edit qualification" : "Add a qualification"}
        description="Degrees, diplomas and professional certifications all belong here."
      />
      <CardBody>
        <form action={formAction} className="flex flex-col gap-5">
          {education ? (
            <input type="hidden" name="educationId" value={education.id} />
          ) : null}

          {state.status === "error" && state.message ? (
            <Alert tone="danger">{state.message}</Alert>
          ) : null}

          <FormGrid>
            <Field label="Level" name="level" error={errors.level} required>
              <Select
                name="level"
                defaultValue={education?.level ?? ""}
                options={EDUCATION_LEVELS}
                placeholder="Select level"
                required
                error={errors.level}
              />
            </Field>

            <Field
              label="Degree / certificate title"
              name="degreeTitle"
              error={errors.degreeTitle}
              hint="e.g. BS Computer Science"
              required
            >
              <Input
                name="degreeTitle"
                defaultValue={education?.degreeTitle ?? ""}
                required
                error={errors.degreeTitle}
              />
            </Field>

            <Field
              label="Institution"
              name="institution"
              error={errors.institution}
              required
            >
              <Input
                name="institution"
                defaultValue={education?.institution ?? ""}
                required
                error={errors.institution}
              />
            </Field>

            <Field
              label="Board / university"
              name="boardOrUniversity"
              error={errors.boardOrUniversity}
            >
              <Input
                name="boardOrUniversity"
                defaultValue={education?.boardOrUniversity ?? ""}
                error={errors.boardOrUniversity}
              />
            </Field>

            <Field
              label="Major subjects"
              name="majorSubjects"
              error={errors.majorSubjects}
              hint="Comma separated"
            >
              <Input
                name="majorSubjects"
                defaultValue={education?.majorSubjects ?? ""}
                error={errors.majorSubjects}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Start year" name="startYear" error={errors.startYear}>
                <Input
                  name="startYear"
                  inputMode="numeric"
                  placeholder="2018"
                  defaultValue={education?.startYear ?? ""}
                  error={errors.startYear}
                />
              </Field>

              <Field
                label="Passing year"
                name="passingYear"
                error={errors.passingYear}
                required
              >
                <Input
                  name="passingYear"
                  inputMode="numeric"
                  placeholder="2022"
                  defaultValue={education?.passingYear ?? ""}
                  required
                  error={errors.passingYear}
                />
              </Field>
            </div>
          </FormGrid>

          <div className="border-t border-slate-200 pt-5">
            <FormGrid columns={3}>
              <Field label="Result recorded as" name="resultType">
                <Select
                  name="resultType"
                  value={resultType}
                  onChange={(e) => setResultType(e.target.value)}
                  options={RESULT_TYPES}
                />
              </Field>

              {resultType === "MARKS" ? (
                <>
                  <Field
                    label="Obtained marks"
                    name="obtainedMarks"
                    error={errors.obtainedMarks}
                    required
                  >
                    <Input
                      name="obtainedMarks"
                      inputMode="decimal"
                      defaultValue={education?.obtainedMarks ?? ""}
                      error={errors.obtainedMarks}
                    />
                  </Field>
                  <Field
                    label="Total marks"
                    name="totalMarks"
                    error={errors.totalMarks}
                    required
                  >
                    <Input
                      name="totalMarks"
                      inputMode="decimal"
                      defaultValue={education?.totalMarks ?? ""}
                      error={errors.totalMarks}
                    />
                  </Field>
                </>
              ) : null}

              {resultType === "CGPA" ? (
                <>
                  <Field label="CGPA" name="cgpa" error={errors.cgpa} required>
                    <Input
                      name="cgpa"
                      inputMode="decimal"
                      placeholder="3.45"
                      defaultValue={education?.cgpa ?? ""}
                      error={errors.cgpa}
                    />
                  </Field>
                  <Field label="Out of" name="maxCgpa" error={errors.maxCgpa}>
                    <Input
                      name="maxCgpa"
                      inputMode="decimal"
                      placeholder="4.00"
                      defaultValue={education?.maxCgpa ?? "4"}
                      error={errors.maxCgpa}
                    />
                  </Field>
                </>
              ) : null}

              {resultType === "GRADE" ? (
                <Field
                  label="Grade / division"
                  name="grade"
                  error={errors.grade}
                  hint="e.g. A+ or First Division"
                >
                  <Input
                    name="grade"
                    defaultValue={education?.grade ?? ""}
                    error={errors.grade}
                  />
                </Field>
              ) : null}
            </FormGrid>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onDone}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Saving…">
              {education ? "Save changes" : "Add qualification"}
            </SubmitButton>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
