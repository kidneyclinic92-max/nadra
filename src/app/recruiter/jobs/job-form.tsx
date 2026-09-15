"use client";

import { useActionState } from "react";
import { saveJobAction } from "@/lib/actions/jobs";
import { idleState } from "@/lib/form";
import {
  EDUCATION_LEVELS,
  EMPLOYMENT_TYPES,
  GENDER_REQUIREMENTS,
  JOB_STATUSES,
  PROVINCES,
} from "@/lib/constants";
import {
  Alert,
  Card,
  CardBody,
  Field,
  FormGrid,
  Input,
  LinkButton,
  SectionTitle,
  Select,
  Textarea,
} from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export type JobFormDefaults = {
  id?: string;
  code: string;
  title: string;
  department: string;
  description: string;
  responsibilities: string;
  city: string;
  province: string;
  employmentType: string;
  positions: string;
  payScale: string;
  minEducationLevel: string;
  requiredDegreeTitle: string;
  minExperienceYears: string;
  minAge: string;
  maxAge: string;
  genderRequirement: string;
  domicileRestriction: string;
  requiredSkills: string;
  status: string;
  closingDate: string;
};

const DOMICILE_OPTIONS = [
  { value: "ANY", label: "All provinces" },
  ...PROVINCES,
];

export function JobForm({ defaults }: { defaults: JobFormDefaults }) {
  const [state, formAction] = useActionState(saveJobAction, idleState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {defaults.id ? (
        <input type="hidden" name="jobId" value={defaults.id} />
      ) : null}

      {state.status === "error" && state.message ? (
        <Alert tone="danger">{state.message}</Alert>
      ) : null}
      {state.status === "success" && state.message ? (
        <Alert tone="success">{state.message}</Alert>
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-5">
          <SectionTitle>Position details</SectionTitle>

          <FormGrid>
            <Field
              label="Job code"
              name="code"
              error={errors.code}
              hint="Shown on the advertisement, e.g. HR/2026/014"
              required
            >
              <Input
                name="code"
                defaultValue={defaults.code}
                required
                error={errors.code}
              />
            </Field>

            <Field label="Job title" name="title" error={errors.title} required>
              <Input
                name="title"
                defaultValue={defaults.title}
                required
                error={errors.title}
              />
            </Field>

            <Field label="Department" name="department" error={errors.department}>
              <Input
                name="department"
                defaultValue={defaults.department}
                error={errors.department}
              />
            </Field>

            <Field label="Pay scale" name="payScale" error={errors.payScale}>
              <Input
                name="payScale"
                placeholder="e.g. BPS-17"
                defaultValue={defaults.payScale}
                error={errors.payScale}
              />
            </Field>

            <Field label="City" name="city" error={errors.city}>
              <Input name="city" defaultValue={defaults.city} error={errors.city} />
            </Field>

            <Field label="Province" name="province" error={errors.province}>
              <Select
                name="province"
                defaultValue={defaults.province}
                options={PROVINCES}
                placeholder="Select province"
                error={errors.province}
              />
            </Field>

            <Field
              label="Employment type"
              name="employmentType"
              error={errors.employmentType}
            >
              <Select
                name="employmentType"
                defaultValue={defaults.employmentType}
                options={EMPLOYMENT_TYPES}
                error={errors.employmentType}
              />
            </Field>

            <Field
              label="Number of positions"
              name="positions"
              error={errors.positions}
              required
            >
              <Input
                name="positions"
                inputMode="numeric"
                defaultValue={defaults.positions}
                required
                error={errors.positions}
              />
            </Field>
          </FormGrid>

          <Field
            label="Description"
            name="description"
            error={errors.description}
            required
          >
            <Textarea
              name="description"
              rows={5}
              defaultValue={defaults.description}
              required
              error={errors.description}
            />
          </Field>

          <Field
            label="Key responsibilities"
            name="responsibilities"
            error={errors.responsibilities}
            hint="One per line works well."
          >
            <Textarea
              name="responsibilities"
              rows={4}
              defaultValue={defaults.responsibilities}
              error={errors.responsibilities}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-5">
          <SectionTitle>Eligibility criteria</SectionTitle>
          <p className="-mt-2 text-sm text-slate-500">
            Applicants are scored against these criteria automatically. Leave a
            field blank to skip that check.
          </p>

          <FormGrid>
            <Field
              label="Minimum qualification"
              name="minEducationLevel"
              error={errors.minEducationLevel}
            >
              <Select
                name="minEducationLevel"
                defaultValue={defaults.minEducationLevel}
                options={EDUCATION_LEVELS}
                placeholder="No minimum"
                error={errors.minEducationLevel}
              />
            </Field>

            <Field
              label="Required field of study"
              name="requiredDegreeTitle"
              error={errors.requiredDegreeTitle}
              hint="Matched against degree titles and majors"
            >
              <Input
                name="requiredDegreeTitle"
                placeholder="e.g. Computer Science"
                defaultValue={defaults.requiredDegreeTitle}
                error={errors.requiredDegreeTitle}
              />
            </Field>

            <Field
              label="Minimum experience (years)"
              name="minExperienceYears"
              error={errors.minExperienceYears}
            >
              <Input
                name="minExperienceYears"
                inputMode="numeric"
                defaultValue={defaults.minExperienceYears}
                error={errors.minExperienceYears}
              />
            </Field>

            <Field
              label="Required skills"
              name="requiredSkills"
              error={errors.requiredSkills}
              hint="Comma separated keywords"
            >
              <Input
                name="requiredSkills"
                placeholder="e.g. SQL, project management"
                defaultValue={defaults.requiredSkills}
                error={errors.requiredSkills}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Minimum age" name="minAge" error={errors.minAge}>
                <Input
                  name="minAge"
                  inputMode="numeric"
                  defaultValue={defaults.minAge}
                  error={errors.minAge}
                />
              </Field>
              <Field label="Maximum age" name="maxAge" error={errors.maxAge}>
                <Input
                  name="maxAge"
                  inputMode="numeric"
                  defaultValue={defaults.maxAge}
                  error={errors.maxAge}
                />
              </Field>
            </div>

            <Field
              label="Gender requirement"
              name="genderRequirement"
              error={errors.genderRequirement}
            >
              <Select
                name="genderRequirement"
                defaultValue={defaults.genderRequirement}
                options={GENDER_REQUIREMENTS}
                error={errors.genderRequirement}
              />
            </Field>

            <Field
              label="Domicile restriction"
              name="domicileRestriction"
              error={errors.domicileRestriction}
            >
              <Select
                name="domicileRestriction"
                defaultValue={defaults.domicileRestriction}
                options={DOMICILE_OPTIONS}
                error={errors.domicileRestriction}
              />
            </Field>
          </FormGrid>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-5">
          <SectionTitle>Publishing</SectionTitle>

          <FormGrid>
            <Field
              label="Status"
              name="status"
              error={errors.status}
              hint="Only open positions are visible to candidates."
            >
              <Select
                name="status"
                defaultValue={defaults.status}
                options={JOB_STATUSES}
                error={errors.status}
              />
            </Field>

            <Field
              label="Closing date"
              name="closingDate"
              error={errors.closingDate}
              hint="Leave blank to keep applications open indefinitely."
            >
              <Input
                name="closingDate"
                type="date"
                defaultValue={defaults.closingDate}
                error={errors.closingDate}
              />
            </Field>
          </FormGrid>
        </CardBody>
      </Card>

      <div className="flex justify-end gap-2">
        <LinkButton href="/recruiter/jobs" variant="secondary">
          Cancel
        </LinkButton>
        <SubmitButton pendingLabel="Saving…">
          {defaults.id ? "Save changes" : "Create position"}
        </SubmitButton>
      </div>
    </form>
  );
}

export const EMPTY_JOB_DEFAULTS: JobFormDefaults = {
  code: "",
  title: "",
  department: "",
  description: "",
  responsibilities: "",
  city: "",
  province: "",
  employmentType: "FULL_TIME",
  positions: "1",
  payScale: "",
  minEducationLevel: "",
  requiredDegreeTitle: "",
  minExperienceYears: "0",
  minAge: "",
  maxAge: "",
  genderRequirement: "ANY",
  domicileRestriction: "ANY",
  requiredSkills: "",
  status: "DRAFT",
  closingDate: "",
};
