"""
One-time migration: push every existing RiskAssessment to Google Sheets
(CAMP_AssessedReports + CAMP_Assessments). Run once after enabling backup and
sharing the spreadsheet with the service account — running twice duplicates rows.
"""

from django.core.management.base import BaseCommand

from reports.models import RiskAssessment
from reports.sheets_backup import (
    append_assessed_report_row,
    append_assessment_row,
    _backup_enabled,
    _spreadsheet_client,
)


class Command(BaseCommand):
    help = (
        'Append all existing risk assessments to Google Sheets (assessed-report tabs). '
        'Intended as a one-time backfill; running again duplicates rows.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print how many rows would be sent without calling Google.',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            metavar='N',
            help='Only process the first N assessments (by primary key).',
        )

    def handle(self, *args, **options):
        full_count = RiskAssessment.objects.count()
        limit = options['limit']
        if limit is not None:
            n_target = min(full_count, max(0, limit))
        else:
            n_target = full_count

        if options['dry_run']:
            self.stdout.write(self.style.WARNING(f'DRY RUN: would append {n_target} assessment(s).'))
            return

        if not _backup_enabled():
            self.stderr.write(
                self.style.ERROR(
                    'Backup is not enabled. Set GOOGLE_SHEETS_BACKUP_ENABLED=1, '
                    'GOOGLE_SHEETS_SPREADSHEET_ID, and service account credentials '
                    '(GOOGLE_SERVICE_ACCOUNT_JSON_B64 or GOOGLE_SERVICE_ACCOUNT_FILE).'
                )
            )
            return

        if _spreadsheet_client() is None:
            self.stderr.write(
                self.style.ERROR(
                    'Could not open the spreadsheet (check credentials and that the '
                    'sheet is shared with the service account email as Editor).'
                )
            )
            return

        qs = RiskAssessment.objects.select_related('report').order_by('pk')
        if limit is not None:
            qs = qs[: max(0, limit)]

        n = 0
        for ra in qs.iterator():
            append_assessed_report_row(ra)
            append_assessment_row(ra)
            n += 1

        self.stdout.write(self.style.SUCCESS(f'Appended {n} assessed report row(s) to Google Sheets.'))
