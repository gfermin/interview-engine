import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { t, type Locale } from "@/lib/i18n";
import { RowActionButton } from "./template-actions";

interface MandatoryRequirementRow {
  id: string;
  label: string;
  description: string | null;
}

/** The Mandatory Requirements Card (plan Phase 34/AUDIT-021) — extracted
 * out of `app/templates/[id]/page.tsx`. Move/delete actions are passed
 * unbound (each row binds its own requirementId at render time, matching
 * the original page's inline `.bind()` calls). */
export function TemplateMandatoryRequirementsSection({
  templateId,
  editable,
  mandatoryRequirements,
  moveMandatoryRequirementAction,
  deleteMandatoryRequirementAction,
  locale,
}: {
  templateId: string;
  editable: boolean;
  mandatoryRequirements: MandatoryRequirementRow[];
  moveMandatoryRequirementAction: (
    templateId: string,
    requirementId: string,
    direction: "up" | "down"
  ) => Promise<void>;
  deleteMandatoryRequirementAction: (templateId: string, requirementId: string) => Promise<void>;
  locale: Locale;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-[13.5px]">{t(locale, "templates.mandatoryRequirementsHeading")}</CardTitle>
        {editable ? (
          <ButtonLink size="sm" variant="outline" href={`/templates/${templateId}/requirements/new`}>
            <Plus /> {t(locale, "templates.addRequirementButton")}
          </ButtonLink>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {mandatoryRequirements.length === 0 ? (
          <p className="px-6 pb-4 text-sm text-muted-foreground">{t(locale, "templates.noRequirementsMessage")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t(locale, "templates.tableRequirement")}</TableHead>
                <TableHead>{t(locale, "templates.descriptionLabel")}</TableHead>
                {editable ? <TableHead className="text-right">{t(locale, "templates.tableActions")}</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {mandatoryRequirements.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell className="max-w-[320px] truncate text-muted-foreground">
                    {r.description ?? "—"}
                  </TableCell>
                  {editable ? (
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <RowActionButton
                          action={moveMandatoryRequirementAction.bind(null, templateId, r.id, "up")}
                          icon={<ChevronUp />}
                          label={t(locale, "templates.moveUpLabel")}
                        />
                        <RowActionButton
                          action={moveMandatoryRequirementAction.bind(null, templateId, r.id, "down")}
                          icon={<ChevronDown />}
                          label={t(locale, "templates.moveDownLabel")}
                        />
                        <ButtonLink
                          variant="ghost"
                          size="icon-sm"
                          href={`/templates/${templateId}/requirements/${r.id}/edit`}
                          aria-label={t(locale, "templates.editLabel")}
                        >
                          <Pencil />
                        </ButtonLink>
                        <RowActionButton
                          action={deleteMandatoryRequirementAction.bind(null, templateId, r.id)}
                          icon={<Trash2 />}
                          label={t(locale, "templates.deleteLabel")}
                          variant="destructive"
                          confirmMessage={`${t(locale, "templates.deleteRequirementConfirmPrefix")}${r.label}${t(locale, "templates.deleteRequirementConfirmSuffix")}`}
                        />
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
