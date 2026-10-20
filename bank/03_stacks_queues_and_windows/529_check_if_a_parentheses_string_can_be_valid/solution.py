def can_be_valid(s: str, locked: str) -> bool:
    if len(s) % 2:
        return False
    balance = 0
    for ch, lock in zip(s, locked):
        balance += -1 if lock == "1" and ch == ")" else 1
        if balance < 0:
            return False
    balance = 0
    for ch, lock in zip(reversed(s), reversed(locked)):
        balance += -1 if lock == "1" and ch == "(" else 1
        if balance < 0:
            return False
    return True
