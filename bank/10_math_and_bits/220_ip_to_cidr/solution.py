def _to_ip(value: int) -> str:
    return ".".join(str((value >> shift) & 255) for shift in (24, 16, 8, 0))


def ip_to_cidr(ip: str, n: int) -> list[str]:
    address = 0
    for part in ip.split("."):
        address = address * 256 + int(part)
    blocks = []
    while n > 0:
        size = address & -address if address else 1 << 32
        while size > n:
            size //= 2
        blocks.append(f"{_to_ip(address)}/{32 - (size.bit_length() - 1)}")
        address += size
        n -= size
    return blocks
