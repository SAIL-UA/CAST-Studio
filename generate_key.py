import secrets
import string

# Define the characters to use (letters and digits)
characters = string.ascii_letters + string.digits

# Generate a random alphanumeric secret key of desired length (e.g., 24 characters)
secret_key = ''.join(secrets.choice(characters) for i in range(24))
print(secret_key)
