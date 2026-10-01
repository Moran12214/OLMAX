"""Set an admin password in .env without printing or storing the plaintext password."""
import getpass
import hashlib
import os
from pathlib import Path
import secrets
root = Path(__file__).resolve().parents[1]
password = getpass.getpass('Новий пароль адміністратора (мінімум 12 символів): ')
if len(password) < 12:
    raise SystemExit('Потрібно щонайменше 12 символів.')
if password != getpass.getpass('Повторіть пароль: '):
    raise SystemExit('Паролі не збігаються.')
salt = secrets.token_hex(16)
encoded = 'pbkdf2_sha256$600000$'+salt+'$'+hashlib.pbkdf2_hmac('sha256',password.encode(),bytes.fromhex(salt),600000).hex()
p = root/'.env'
lines = p.read_text().splitlines() if p.exists() else []
lines = [line for line in lines if not line.startswith('ADMIN_PASSWORD_HASH=')]
lines.append("ADMIN_PASSWORD_HASH='"+encoded+"'")
fd = os.open(p, os.O_WRONLY|os.O_CREAT|os.O_TRUNC, 0o600)
with os.fdopen(fd,'w') as f:
    f.write('\n'.join(lines)+'\n')
os.chmod(p, 0o600)
print('Пароль налаштовано. Логін: admin. Перезапустіть сервер.')
