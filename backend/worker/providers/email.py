# worker/providers/email.py
import resend  # or sendgrid / boto3 for SES

class EmailProvider(Provider):
    def send(self, to, subject, body):
        result = resend.Emails.send({
            "from": "hello@yourdomain.com",
            "to": to,
            "subject": subject,
            "html": body,
        })
        return result["id"]