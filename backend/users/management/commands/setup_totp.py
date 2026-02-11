import qrcode
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django_otp.plugins.otp_totp.models import TOTPDevice

User = get_user_model()


class Command(BaseCommand):
    help = ('Set up a TOTP device for an admin user. Prints a QR code to scan with Google Authenticator. '
            'Each user can only have one device — running this again replaces the existing device.')

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username of the staff/admin user')

    def handle(self, *args, **options):
        username = options['username']

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f'User "{username}" does not exist.')

        if not user.is_staff:
            raise CommandError(f'User "{username}" is not a staff member. Only staff users need TOTP.')

        # Remove any existing devices for this user
        existing = TOTPDevice.objects.filter(user=user)
        if existing.exists():
            count = existing.count()
            existing.delete()
            self.stdout.write(f'Removed {count} existing TOTP device(s) for {username}.')

        # Create a new confirmed device
        device = TOTPDevice.objects.create(
            user=user,
            name=f'Google Authenticator ({user.email})',
            confirmed=True,
        )

        config_url = device.config_url
        self.stdout.write('')
        self.stdout.write(f'TOTP device created for: {username} ({user.email})')
        self.stdout.write(f'URI: {config_url}')
        self.stdout.write('')
        self.stdout.write('Scan this QR code with Google Authenticator:')
        self.stdout.write('')

        # Print QR code to terminal
        qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_L)
        qr.add_data(config_url)
        qr.make(fit=True)
        qr.print_ascii(out=self.stdout, invert=True)

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done. {username} can now log into /admin/ using their password + authenticator code.'
        ))
