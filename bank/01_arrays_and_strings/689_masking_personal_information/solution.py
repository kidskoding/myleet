def mask_pii(s: str) -> str:
    if "@" in s:
        name, domain = s.lower().split("@")
        return f"{name[0]}*****{name[-1]}@{domain}"
    digits = [c for c in s if c.isdigit()]
    local = "***-***-" + "".join(digits[-4:])
    country = len(digits) - 10
    return local if country == 0 else "+" + "*" * country + "-" + local
