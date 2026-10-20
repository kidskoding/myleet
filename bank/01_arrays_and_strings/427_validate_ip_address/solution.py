def valid_ip_address(query_ip: str) -> str:
    # Time: O(n).
    # Space: O(n) for the split parts.
    def ipv4(parts: list[str]) -> bool:
        if len(parts) != 4:
            return False
        for p in parts:
            if not p or len(p) > 3 or not all(ch in "0123456789" for ch in p):
                return False
            if (p[0] == "0" and len(p) > 1) or int(p) > 255:
                return False
        return True

    def ipv6(parts: list[str]) -> bool:
        if len(parts) != 8:
            return False
        hexdigits = set("0123456789abcdefABCDEF")
        return all(1 <= len(p) <= 4 and all(ch in hexdigits for ch in p) for p in parts)

    if "." in query_ip and ipv4(query_ip.split(".")):
        return "IPv4"
    if ":" in query_ip and ipv6(query_ip.split(":")):
        return "IPv6"
    return "Neither"
