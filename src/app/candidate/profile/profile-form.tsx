"use client";

import { useActionState, useState } from "react";
import { saveProfileAction } from "@/lib/actions/candidate";
import { idleState } from "@/lib/form";
import {
  GENDERS,
  GUARDIAN_RELATIONS,
  MARITAL_STATUSES,
  PROVINCES,
  QUOTA_CATEGORIES,
} from "@/lib/constants";
import {
  Alert,
  Card,
  CardBody,
  Checkbox,
  Field,
  FormGrid,
  Input,
  SectionTitle,
  Select,
  Textarea,
} from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

type Defaults = {
  fullName: string;
  guardianName: string;
  guardianRelation: string;
  cnic: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  religion: string;
  nationality: string;
  mobile: string;
  alternateMobile: string;
  contactEmail: string;
  linkedinUrl: string;
  portfolioUrl: string;
  currentAddress: string;
  permanentAddress: string;
  city: string;
  province: string;
  postalCode: string;
  domicileDistrict: string;
  domicileProvince: string;
  quotaCategory: string;
  hasDisability: boolean;
  disabilityDetails: string;
};

export function ProfileForm({ defaults }: { defaults: Defaults }) {
  const [state, formAction] = useActionState(saveProfileAction, idleState);
  const [hasDisability, setHasDisability] = useState(defaults.hasDisability);
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [currentAddress, setCurrentAddress] = useState(defaults.currentAddress);
  const [permanentAddress, setPermanentAddress] = useState(
    defaults.permanentAddress,
  );

  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.status === "error" && state.message ? (
        <Alert tone="danger">{state.message}</Alert>
      ) : null}
      {state.status === "success" && state.message ? (
        <Alert tone="success">{state.message}</Alert>
      ) : null}

      <Card>
        <CardBody className="flex flex-col gap-5">
          <SectionTitle>Identity</SectionTitle>

          <FormGrid>
            <Field
              label="Full name"
              name="fullName"
              error={errors.fullName}
              hint="Exactly as printed on your CNIC"
              required
            >
              <Input
                name="fullName"
                defaultValue={defaults.fullName}
                required
                error={errors.fullName}
              />
            </Field>

            <Field
              label="Father's / Husband's name"
              name="guardianName"
              error={errors.guardianName}
              required
            >
              <Input
                name="guardianName"
                defaultValue={defaults.guardianName}
                required
                error={errors.guardianName}
              />
            </Field>

            <Field
              label="Relation"
              name="guardianRelation"
              error={errors.guardianRelation}
              required
            >
              <Select
                name="guardianRelation"
                defaultValue={defaults.guardianRelation}
                options={GUARDIAN_RELATIONS}
                error={errors.guardianRelation}
              />
            </Field>

            <Field
              label="CNIC"
              name="cnic"
              error={errors.cnic}
              hint="13 digits, e.g. 35202-1234567-1"
              required
            >
              <Input
                name="cnic"
                inputMode="numeric"
                defaultValue={defaults.cnic}
                required
                error={errors.cnic}
              />
            </Field>

            <Field
              label="Date of birth"
              name="dateOfBirth"
              error={errors.dateOfBirth}
              hint="Used to check age limits on positions"
              required
            >
              <Input
                name="dateOfBirth"
                type="date"
                defaultValue={defaults.dateOfBirth}
                error={errors.dateOfBirth}
              />
            </Field>

            <Field label="Gender" name="gender" error={errors.gender} required>
              <Select
                name="gender"
                defaultValue={defaults.gender}
                options={GENDERS}
                placeholder="Select gender"
                error={errors.gender}
              />
            </Field>

            <Field
              label="Marital status"
              name="maritalStatus"
              error={errors.maritalStatus}
            >
              <Select
                name="maritalStatus"
                defaultValue={defaults.maritalStatus}
                options={MARITAL_STATUSES}
                placeholder="Select status"
                error={errors.maritalStatus}
              />
            </Field>

            <Field label="Religion" name="religion" error={errors.religion}>
              <Input
                name="religion"
                defaultValue={defaults.religion}
                error={errors.religion}
              />
            </Field>

            <Field label="Nationality" name="nationality" error={errors.nationality}>
              <Input
                name="nationality"
                defaultValue={defaults.nationality}
                error={errors.nationality}
              />
            </Field>
          </FormGrid>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-5">
          <SectionTitle>Contact</SectionTitle>

          <FormGrid>
            <Field
              label="Mobile number"
              name="mobile"
              error={errors.mobile}
              hint="e.g. 0300-1234567"
              required
            >
              <Input
                name="mobile"
                inputMode="tel"
                defaultValue={defaults.mobile}
                required
                error={errors.mobile}
              />
            </Field>

            <Field
              label="Alternate number"
              name="alternateMobile"
              error={errors.alternateMobile}
            >
              <Input
                name="alternateMobile"
                inputMode="tel"
                defaultValue={defaults.alternateMobile}
                error={errors.alternateMobile}
              />
            </Field>

            <Field
              label="Contact email"
              name="contactEmail"
              error={errors.contactEmail}
            >
              <Input
                name="contactEmail"
                type="email"
                defaultValue={defaults.contactEmail}
                error={errors.contactEmail}
              />
            </Field>

            <Field
              label="LinkedIn profile"
              name="linkedinUrl"
              error={errors.linkedinUrl}
              hint="Full URL including https://"
            >
              <Input
                name="linkedinUrl"
                type="url"
                placeholder="https://linkedin.com/in/username"
                defaultValue={defaults.linkedinUrl}
                error={errors.linkedinUrl}
              />
            </Field>

            <Field
              label="Portfolio / website"
              name="portfolioUrl"
              error={errors.portfolioUrl}
            >
              <Input
                name="portfolioUrl"
                type="url"
                placeholder="https://"
                defaultValue={defaults.portfolioUrl}
                error={errors.portfolioUrl}
              />
            </Field>
          </FormGrid>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-5">
          <SectionTitle>Address</SectionTitle>

          <Field
            label="Current address"
            name="currentAddress"
            error={errors.currentAddress}
            required
          >
            <Textarea
              name="currentAddress"
              rows={2}
              value={currentAddress}
              onChange={(e) => {
                setCurrentAddress(e.target.value);
                if (sameAsCurrent) setPermanentAddress(e.target.value);
              }}
              error={errors.currentAddress}
            />
          </Field>

          <Checkbox
            label="Permanent address is the same as my current address"
            checked={sameAsCurrent}
            onChange={(e) => {
              setSameAsCurrent(e.target.checked);
              if (e.target.checked) setPermanentAddress(currentAddress);
            }}
          />

          <Field
            label="Permanent address"
            name="permanentAddress"
            error={errors.permanentAddress}
          >
            <Textarea
              name="permanentAddress"
              rows={2}
              value={permanentAddress}
              onChange={(e) => setPermanentAddress(e.target.value)}
              readOnly={sameAsCurrent}
              error={errors.permanentAddress}
            />
          </Field>

          <FormGrid columns={3}>
            <Field label="City" name="city" error={errors.city} required>
              <Input name="city" defaultValue={defaults.city} error={errors.city} />
            </Field>

            <Field label="Province" name="province" error={errors.province} required>
              <Select
                name="province"
                defaultValue={defaults.province}
                options={PROVINCES}
                placeholder="Select province"
                error={errors.province}
              />
            </Field>

            <Field label="Postal code" name="postalCode" error={errors.postalCode}>
              <Input
                name="postalCode"
                inputMode="numeric"
                defaultValue={defaults.postalCode}
                error={errors.postalCode}
              />
            </Field>
          </FormGrid>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-col gap-5">
          <SectionTitle>Domicile &amp; quota</SectionTitle>
          <p className="-mt-2 text-sm text-slate-500">
            Provincial quotas are allocated on the basis of your domicile
            certificate, not your current address.
          </p>

          <FormGrid>
            <Field
              label="Domicile district"
              name="domicileDistrict"
              error={errors.domicileDistrict}
            >
              <Input
                name="domicileDistrict"
                defaultValue={defaults.domicileDistrict}
                error={errors.domicileDistrict}
              />
            </Field>

            <Field
              label="Domicile province"
              name="domicileProvince"
              error={errors.domicileProvince}
              required
            >
              <Select
                name="domicileProvince"
                defaultValue={defaults.domicileProvince}
                options={PROVINCES}
                placeholder="Select province"
                error={errors.domicileProvince}
              />
            </Field>

            <Field
              label="Quota category"
              name="quotaCategory"
              error={errors.quotaCategory}
            >
              <Select
                name="quotaCategory"
                defaultValue={defaults.quotaCategory}
                options={QUOTA_CATEGORIES}
                error={errors.quotaCategory}
              />
            </Field>
          </FormGrid>

          <Checkbox
            name="hasDisability"
            label="I am a person with a disability"
            description="Tick this if you hold a disability certificate."
            checked={hasDisability}
            onChange={(e) => setHasDisability(e.target.checked)}
          />

          {hasDisability ? (
            <Field
              label="Nature of disability"
              name="disabilityDetails"
              error={errors.disabilityDetails}
            >
              <Textarea
                name="disabilityDetails"
                rows={2}
                defaultValue={defaults.disabilityDetails}
                error={errors.disabilityDetails}
              />
            </Field>
          ) : null}
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">Save personal details</SubmitButton>
      </div>
    </form>
  );
}
